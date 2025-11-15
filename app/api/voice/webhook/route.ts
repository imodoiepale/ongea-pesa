import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('=== VOICE WEBHOOK CALLED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Request URL:', request.url);
    console.log('Request Headers:', Object.fromEntries(request.headers));
    
    // Parse request body and query params
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const userRequest = searchParams.get('request');
    const userEmail = searchParams.get('user_email');
    const userId = searchParams.get('user_id');
    const conversationId = searchParams.get('conversation_id');
    
    console.log('📦 Request Body from ElevenLabs:', JSON.stringify(body, null, 2));
    console.log('📝 Query Param - request:', userRequest);
    console.log('👤 Query Param - user_email:', userEmail);
    console.log('🆔 Query Param - user_id:', userId);
    console.log('💬 Conversation ID:', conversationId);
    console.log('');
    console.log('🔍 VERIFYING: Did ElevenLabs send user_email?', userEmail ? '✅ YES' : '❌ NO');
    console.log('🔍 VERIFYING: Did ElevenLabs send user_id?', userId ? '✅ YES' : '❌ NO');
    
    // Initialize Supabase client (use server client without auth check)
    const supabase = await createClient();
    
    // Try to get user from different sources
    let userContext: any = null;
    
    // 1. First try: user_id from query params
    if (userId) {
      console.log('🔍 Looking up user by user_id:', userId);
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, phone_number, wallet_balance')
        .eq('id', userId)
        .single();
      
      if (profile) {
        userContext = {
          user_id: profile.id,
          user_email: profile.email,
          user_phone: profile.phone_number || '254712345678',
          user_name: profile.email?.split('@')[0] || 'User',
          balance: profile.wallet_balance || 0
        };
        console.log('✅ Found user by user_id:', userContext);
      }
    }
    
    // 2. Second try: email from query params
    if (!userContext && userEmail) {
      console.log('🔍 Looking up user by email:', userEmail);
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, phone_number, wallet_balance')
        .eq('email', userEmail)
        .single();
      
      if (profile) {
        userContext = {
          user_id: profile.id,
          user_email: profile.email,
          user_phone: profile.phone_number || '254712345678',
          user_name: profile.email?.split('@')[0] || 'User',
          balance: profile.wallet_balance || 0
        };
        console.log('✅ Found user by email:', userContext);
      } else {
        console.log('⚠️ No user found in profiles table for email:', userEmail);
      }
    }
    
    // 3. Third try: find from voice_sessions table
    if (!userContext) {
      console.log('⚠️ No user context found, checking voice_sessions...');
      console.log('Looking for conversation_id:', conversationId);
      
      // Try to find active session by conversation_id
      let sessionQuery = supabase
        .from('voice_sessions')
        .select(`
          user_id,
          session_id,
          profiles!inner (
            id,
            email,
            phone,
            name,
            wallet_balance
          )
        `)
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString());
      
      if (conversationId) {
        sessionQuery = sessionQuery.eq('session_id', conversationId);
      }
      
      const { data: sessions, error: sessionError } = await sessionQuery
        .order('created_at', { ascending: false })
        .limit(1);
      
      console.log('Voice sessions query:');
      console.log('Error:', sessionError);
      console.log('Active sessions found:', sessions?.length || 0);
      
      if (sessions && sessions.length > 0 && sessions[0].profiles) {
        const profile = Array.isArray(sessions[0].profiles) ? sessions[0].profiles[0] : sessions[0].profiles;
        if (profile) {
          userContext = {
            user_id: profile.id,
            user_email: profile.email,
            user_phone: profile.phone || '254712345678',
            user_name: profile.name || profile.email?.split('@')[0] || 'User',
            balance: profile.wallet_balance || 0
          };
          console.log('✅ Found user from voice_sessions:', userContext);
        } else {
          console.error('❌ Profile data is empty');
        }
      } else {
        console.error('❌ No active voice sessions found');
      }
    }
    
    // If still no user context, use test mode
    if (!userContext) {
      console.error('❌ No voice sessions found in database');
      console.log('💡 TIP: Make sure you opened the voice interface at least once to create a session');
      
      userContext = {
        user_id: 'test-user-id',
        user_email: userEmail || 'test@example.com',
        user_phone: '254712345678',
        user_name: 'Test User',
        balance: 0
      };
      console.log('⚠️ Using test mode with zero balance');
    }
    
    console.log('📤 Final user data for n8n:');
    console.log('user_id:', userContext.user_id);
    console.log('user_email:', userContext.user_email);
    console.log('user_phone:', userContext.user_phone);
    console.log('user_name:', userContext.user_name);
    
    // Check if this is a free transaction (subscription-based)
    console.log('=== CHECKING FREE TRANSACTION ELIGIBILITY ===');
    
    const transactionType = body.type;
    const amount = parseFloat(body.amount || '0');
    let platformFee = 0;
    let isFreeTransaction = false;
    
    // Check if user has active subscription
    if (userContext.user_id !== 'test-user-id') {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status, free_transactions_remaining')
        .eq('user_id', userContext.user_id)
        .eq('status', 'active')
        .single();
      
      if (subscription && subscription.free_transactions_remaining > 0) {
        isFreeTransaction = true;
        console.log('🎉 FREE TRANSACTION (subscription)');
        console.log('Remaining free transactions:', subscription.free_transactions_remaining);
      }
    }
    
    if (!isFreeTransaction) {
      platformFee = Math.round(amount * 0.005); // 0.5% fee
      console.log('💰 REGULAR TRANSACTION (0.5% fee)');
      console.log('Platform fee:', platformFee);
      console.log('Reason: No active subscription');
    }
    
    // Validate balance for debit transactions
    console.log('=== BALANCE VALIDATION ===');
    const debitTypes = ['send_phone', 'buy_goods_pochi', 'buy_goods_till', 'paybill', 'withdraw', 'bank_to_mpesa', 'bank_to_bank'];
    const isDebit = debitTypes.includes(transactionType);
    
    if (isDebit) {
      console.log('💳 Debit transaction detected');
      console.log('Type:', transactionType);
      console.log('Amount:', amount);
      console.log('Platform Fee:', platformFee);
      
      const totalRequired = amount + platformFee;
      const currentBalance = userContext.balance;
      
      console.log('Total Required:', totalRequired);
      console.log('Current Balance:', currentBalance);
      
      if (currentBalance < totalRequired) {
        console.error('❌ INSUFFICIENT FUNDS');
        console.error('Balance:', currentBalance);
        console.error('Required:', totalRequired);
        console.error('Shortfall:', totalRequired - currentBalance);
        
        return NextResponse.json({
          success: false,
          error: 'insufficient_funds',
          message: `Insufficient balance. You need KSh ${totalRequired.toLocaleString()} but only have KSh ${currentBalance.toLocaleString()}. Please top up your wallet first.`,
          required: totalRequired,
          available: currentBalance,
          shortfall: totalRequired - currentBalance
        }, { status: 400 });
      }
      
      console.log('✅ Balance sufficient');
    }
    
    // Prepare n8n payload
    const n8nPayload = {
      // Transaction details from ElevenLabs
      ...body,
      
      // User context
      user_id: userContext.user_id,
      user_email: userContext.user_email,
      user_phone: userContext.user_phone,
      user_name: userContext.user_name,
      
      // Original request
      original_request: userRequest,
      
      // Conversation tracking
      conversation_id: conversationId,
      
      // Metadata
      timestamp: new Date().toISOString(),
      platform: 'ongea_pesa_voice',
      
      // Fees
      platform_fee: platformFee,
      is_free_transaction: isFreeTransaction,
      
      // Current balance
      current_balance: userContext.balance
    };
    
    console.log('=== FORWARDING TO N8N ===');
    console.log('📤 ENRICHED PAYLOAD (with user context added):');
    console.log('   ├─ Original from ElevenLabs:', JSON.stringify(body, null, 2));
    console.log('   ├─ Added user_id:', userContext.user_id);
    console.log('   ├─ Added user_email:', userContext.user_email);
    console.log('   ├─ Added user_phone:', userContext.user_phone);
    console.log('   ├─ Added user_name:', userContext.user_name);
    console.log('   └─ Added balance:', userContext.balance);
    console.log('');
    
    // Forward to n8n webhook
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'https://primary-production-579c.up.railway.app/webhook/44c0ce1d-defb-4003-b02c-a86974ca5446';
    console.log('🎯 n8n URL:', n8nWebhookUrl);
    console.log('📨 Complete Payload to n8n:', JSON.stringify(n8nPayload, null, 2));
    
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(n8nPayload),
    });
    
    const n8nData = await n8nResponse.json();
    console.log('n8n Response Status:', n8nResponse.status);
    console.log('n8n Response:', n8nData);
    
    // If free transaction, decrement counter
    if (isFreeTransaction && userContext.user_id !== 'test-user-id') {
      await supabase.rpc('decrement_free_transactions', {
        p_user_id: userContext.user_id
      });
      console.log('✅ Decremented free transaction counter');
    }
    
    const duration = Date.now() - startTime;
    console.log('=== WEBHOOK COMPLETED ===');
    console.log('Duration:', duration, 'ms');
    
    // Return success response to ElevenLabs
    return NextResponse.json({
      success: true,
      message: n8nData.message || 'Transaction processed successfully',
      transaction_id: n8nData.transaction_id,
      duration_ms: duration
    });
    
  } catch (error: any) {
    console.error('=== WEBHOOK ERROR ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    
    return NextResponse.json({
      success: false,
      error: 'internal_error',
      message: 'Failed to process transaction. Please try again.',
      details: error.message
    }, { status: 500 });
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
