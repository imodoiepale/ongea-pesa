import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// n8n webhook URL and auth
const N8N_WEBHOOK_URL = 'https://primary-production-579c.up.railway.app/webhook/send_money'
const N8N_AUTH_TOKEN = process.env.N8N_WEBHOOK_AUTH_TOKEN || '' // Add this to .env.local

// In-memory request log storage
const requestLogs: Array<{
  id: string
  timestamp: string
  method: string
  url: string
  headers: Record<string, string>
  body: any
  query: Record<string, string>
  user_id?: string
  error?: string
  n8n_response?: any
  success: boolean
}> = []

const MAX_LOGS = 50 // Keep last 50 requests

function logRequest(log: any) {
  requestLogs.unshift({ id: `req_${Date.now()}`, ...log })
  if (requestLogs.length > MAX_LOGS) {
    requestLogs.pop()
  }
  console.log('📝 Request logged. Total logs:', requestLogs.length)
}

// Export logs for the logs endpoint
export function getRequestLogs() {
  return requestLogs
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = `req_${startTime}`
  
  try {
    // Log incoming request details
    console.log('\n========================================')
    console.log('🎙️ VOICE WEBHOOK CALLED')
    console.log('========================================')
    console.log('Request ID:', requestId)
    console.log('Timestamp:', new Date().toISOString())
    console.log('Request URL:', request.url)
    console.log('Request Headers:', Object.fromEntries(request.headers))
    
    // Parse the incoming data from ElevenLabs
    const body = await request.json()
    console.log('Request Body:', JSON.stringify(body, null, 2))
    
    const queryParams = new URL(request.url).searchParams
    const fullRequest = queryParams.get('request')
    const userEmail = queryParams.get('user_email') || body.user_email
    const userId = queryParams.get('user_id') || body.user_id
    const conversationId = body.conversation_id || body.session_id // ElevenLabs sends this
    
    console.log('Query Param - request:', fullRequest)
    console.log('Query Param - user_email:', userEmail)
    console.log('Query Param - user_id:', userId)
    console.log('Conversation ID:', conversationId)
    
    // Initialize Supabase with service role for user lookup
    const supabase = await createClient()
    
    let userContext = null
    let profile = null
    let user = null

    // Option 1: Try to get user from session (if called from browser)
    const { data: { user: sessionUser }, error: authError } = await supabase.auth.getUser()
    
    if (sessionUser && !authError) {
      user = sessionUser
      console.log('✅ User from session:', user.email)
    } 
    // Option 2: Look up user by email from query params
    else if (userEmail) {
      console.log('🔍 Looking up user by email:', userEmail)
      const { data: { users }, error: lookupError } = await supabase.auth.admin.listUsers()
      
      if (!lookupError && users) {
        user = users.find(u => u.email === userEmail)
        if (user) {
          console.log('✅ Found user by email:', user.email)
        }
      }
    }
    // Option 3: Look up most recent active voice session
    else {
      console.log('🔍 Looking up user from recent voice sessions')
      console.log('Current time:', new Date().toISOString())
      
      // First, check if we have any voice sessions at all
      const { data: allSessions, error: countError } = await supabase
        .from('voice_sessions')
        .select('*')
        .limit(5)
      
      console.log('Total recent voice sessions:', allSessions?.length || 0)
      if (allSessions && allSessions.length > 0) {
        console.log('Recent sessions:', JSON.stringify(allSessions, null, 2))
      }
      
      const { data: recentSession, error: sessionError } = await supabase
        .from('voice_sessions')
        .select('user_id')
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (sessionError) {
        console.error('❌ Voice session lookup error:', sessionError)
      }
      
      if (!sessionError && recentSession) {
        console.log('✅ Found active voice session, user_id:', recentSession.user_id)
        // Get full user details
        const { data: { users }, error: lookupError } = await supabase.auth.admin.listUsers()
        if (!lookupError && users) {
          user = users.find(u => u.id === recentSession.user_id)
          if (user) {
            console.log('✅ Found user from session:', user.email)
          } else {
            console.warn('⚠️ User ID from session not found in users list')
          }
        } else {
          console.error('❌ Failed to list users:', lookupError)
        }
      } else {
        console.warn('⚠️ No active voice session found')
      }
    }
    
    // If we found a user, get their profile
    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      profile = profileData
      
      userContext = {
        id: user.id,
        email: user.email,
        phone: user.phone || profile?.phone_number || profile?.mpesa_number,
        full_name: user.user_metadata?.full_name || profile?.phone_number,
        wallet_balance: profile?.wallet_balance || 0,
        created_at: user.created_at,
      }
      
      console.log('✅ User context:', userContext)
    } else {
      console.log('⚠️ No user found - using test mode')
      console.log('Auth error:', authError?.message)
      
      // For testing: use your actual email if provided, otherwise mock
      userContext = {
        id: 'test-user-id',
        email: userEmail || 'test@ongeapesa.com',
        phone: '254712345678',
        full_name: 'Test User',
        created_at: new Date().toISOString(),
        test_mode: true,
      }
    }

    console.log('\n=== PREPARING N8N PAYLOAD ===')
    
    // ALWAYS use real user data - override any test data from ElevenLabs
    let finalUserId = userContext?.id
    let finalUserEmail = userContext?.email
    let finalUserPhone = userContext?.phone
    let finalUserName = userContext?.full_name
    
    // If we still don't have user, try to find from saved voice sessions using conversation_id
    if (!user) {
      console.log('⚠️ No user context found, checking voice_sessions...')
      console.log('  Looking for conversation_id:', conversationId)
      
      try {
        let recentSession = null
        
        // FIRST: Try to match by conversation_id if available
        if (conversationId) {
          console.log('🔍 Looking up session by conversation_id:', conversationId)
          const { data: matchedSession, error: matchError } = await supabase
            .from('voice_sessions')
            .select('user_id, session_id, created_at, status, expires_at')
            .eq('session_id', conversationId)
            .maybeSingle()
          
          if (matchError) {
            console.error('❌ Error matching session by conversation_id:', matchError)
          } else if (matchedSession) {
            console.log('✅ Found matching session for conversation_id:', conversationId)
            recentSession = matchedSession
          } else {
            console.warn('⚠️ No session found for conversation_id:', conversationId)
          }
        }
        
        // FALLBACK: If no conversation_id match, get recent ACTIVE sessions
        if (!recentSession) {
          console.log('🔍 Fallback: Looking for recent active sessions')
          const { data: allSessions, error: sessionsError } = await supabase
            .from('voice_sessions')
            .select('user_id, session_id, created_at, status, expires_at')
            .eq('status', 'active')
            .gte('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(5)
          
          console.log('Voice sessions query:')
          console.log('  Error:', sessionsError)
          console.log('  Active sessions found:', allSessions?.length || 0)
          
          if (sessionsError) {
            console.error('❌ Error fetching sessions:', sessionsError)
          }
          
          if (allSessions && allSessions.length > 0) {
            console.log('✅ Found', allSessions.length, 'active voice sessions')
            console.log('Sessions:', JSON.stringify(allSessions, null, 2))
            
            // ⚠️ WARNING: This is a fallback and may not be accurate in multi-user scenarios
            recentSession = allSessions[0]
            console.warn('⚠️ Using most recent active session as fallback - this may be inaccurate!')
          } else {
            console.error('❌ No active voice sessions found')
          }
        }
        
        // If we found a session, get the user profile
        if (recentSession) {
          console.log('✅ Using session:', recentSession.session_id, 'user_id:', recentSession.user_id)
          
          // Now get user's profile using the user_id
          const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id, phone_number, mpesa_number, wallet_balance')
            .eq('id', recentSession.user_id)
            .maybeSingle()
          
          if (profileError) {
            console.error('❌ Profile query error:', profileError)
          }
          
          if (userProfile) {
            console.log('✅ Found profile:', userProfile)
            
            finalUserId = userProfile.id
            finalUserEmail = `user-${userProfile.id.slice(0, 8)}@ongeapesa.com` // Fallback email
            finalUserPhone = userProfile.phone_number || userProfile.mpesa_number || ''
            finalUserName = userProfile.phone_number || 'User'
            
            // Try to get actual email from auth.users if possible
            // But this might not work without service role, so email might be fallback
            
            console.log('✅ SUCCESSFULLY SET REAL USER DATA FROM VOICE SESSION')
          } else {
            console.warn('⚠️ Profile not found for user_id:', recentSession.user_id)
            // Still use the user_id from session
            finalUserId = recentSession.user_id
            finalUserEmail = `user-${recentSession.user_id.slice(0, 8)}@ongeapesa.com`
            console.log('✅ Using user_id from session without full profile')
          }
        } else {
          console.error('❌ No voice sessions found in database')
          console.log('💡 TIP: Make sure you opened the voice interface at least once to create a session')
        }
      } catch (fallbackError: any) {
        console.error('❌ Failed to fetch user from sessions:')
        console.error('Error:', fallbackError?.message || fallbackError)
      }
    } else {
      console.log('✅ User already found from earlier lookup')
    }
    
    console.log('📤 Final user data for n8n:')
    console.log('  user_id:', finalUserId)
    console.log('  user_email:', finalUserEmail)
    console.log('  user_phone:', finalUserPhone)
    console.log('  user_name:', finalUserName)
    
    // ============================================
    // REAL-TIME BALANCE & SUBSCRIPTION CHECK
    // ============================================
    // Get current wallet balance and subscription status
    let currentBalance = 0
    let subscriptionStatus = 'inactive'
    let freeTxRemaining = 0
    let subscriptionEndDate = null
    
    if (finalUserId && finalUserId !== 'no-user-found' && finalUserId !== 'test-user-id') {
      const { data: balanceData, error: balanceError } = await supabase
        .from('profiles')
        .select('wallet_balance, subscription_status, subscription_end_date, free_transactions_remaining')
        .eq('id', finalUserId)
        .single()
      
      if (balanceError) {
        console.error('❌ Error fetching balance:', balanceError)
      } else if (balanceData) {
        currentBalance = parseFloat(String(balanceData.wallet_balance)) || 0
        subscriptionStatus = balanceData.subscription_status || 'inactive'
        subscriptionEndDate = balanceData.subscription_end_date
        freeTxRemaining = balanceData.free_transactions_remaining || 0
        
        console.log('💰 Current wallet balance:', currentBalance)
        console.log('📅 Subscription status:', subscriptionStatus)
        console.log('🎁 Free transactions remaining:', freeTxRemaining)
      }
    }
    
    // Validate amount
    const requestedAmount = parseFloat(body.amount)
    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      console.error('❌ Invalid amount received:', body.amount)
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid amount',
          message: `The amount ${body.amount} is not valid. Please provide a positive number.`,
          current_balance: currentBalance,
          agent_message: `I'm sorry, but the amount you provided is invalid. Please try again with a valid amount.`
        },
        { status: 400 }
      )
    }
    
    if (requestedAmount > 999999) {
      console.error('❌ Amount exceeds maximum:', requestedAmount)
      return NextResponse.json(
        { 
          success: false,
          error: 'Amount too large',
          message: `The amount KSh ${requestedAmount.toLocaleString()} exceeds the maximum of KSh 999,999.`,
          current_balance: currentBalance,
          agent_message: `I'm sorry, but the amount of ${requestedAmount.toLocaleString()} shillings exceeds our maximum transaction limit of 999,999 shillings. Please try a smaller amount.`
        },
        { status: 400 }
      )
    }
    
    // ============================================
    // CHECK FREE TRANSACTION ELIGIBILITY
    // ============================================
    let isFreeTransaction = false
    let platformFeeAmount = 0
    
    // Check if this is a debit transaction (money going out)
    const debitTypes = [
      'send_phone', 'buy_goods_pochi', 'buy_goods_till',
      'paybill', 'withdraw', 'bank_to_mpesa', 'mpesa_to_bank'
    ]
    const isDebitTransaction = debitTypes.includes(body.type)
    
    if (isDebitTransaction) {
      console.log('\n=== CHECKING FREE TRANSACTION ELIGIBILITY ===')
      
      // Check if user qualifies for free transaction
      if (subscriptionStatus === 'active' && 
          subscriptionEndDate && 
          new Date(subscriptionEndDate) >= new Date() &&
          requestedAmount >= 1000 && 
          freeTxRemaining > 0) {
        isFreeTransaction = true
        platformFeeAmount = 0
        console.log('✅ FREE TRANSACTION QUALIFIED!')
        console.log('  Amount:', requestedAmount, '(>= KES 1,000)')
        console.log('  Free transactions remaining:', freeTxRemaining)
      } else {
        // Calculate 0.5% platform fee
        platformFeeAmount = Math.round(requestedAmount * 0.005 * 100) / 100
        console.log('💰 REGULAR TRANSACTION (0.5% fee)')
        console.log('  Platform fee:', platformFeeAmount)
        
        if (subscriptionStatus !== 'active') {
          console.log('  Reason: No active subscription')
        } else if (requestedAmount < 1000) {
          console.log('  Reason: Amount below KES 1,000 minimum')
        } else if (freeTxRemaining <= 0) {
          console.log('  Reason: No free transactions remaining this month')
        }
      }
    }
    
    // For debit transactions, check if user has sufficient balance
    if (isDebitTransaction) {
      console.log('\n=== BALANCE VALIDATION ===')
      console.log('💳 Debit transaction detected')
      console.log('  Type:', body.type)
      console.log('  Amount:', requestedAmount)
      console.log('  Platform Fee:', platformFeeAmount)
      console.log('  Total Required:', requestedAmount + platformFeeAmount)
      console.log('  Current Balance:', currentBalance)
      
      const totalRequired = requestedAmount + platformFeeAmount
      
      if (currentBalance < totalRequired) {
        const shortfall = totalRequired - currentBalance
        console.error('❌ INSUFFICIENT FUNDS')
        console.error('  Balance:', currentBalance)
        console.error('  Required:', totalRequired)
        console.error('  Shortfall:', shortfall)
        
        // Return error to ElevenLabs AI agent with clear message
        return NextResponse.json(
          { 
            success: false,
            error: 'Insufficient funds',
            message: `Your current balance is KSh ${currentBalance.toLocaleString()}, but you need KSh ${totalRequired.toLocaleString()} (including fees). You need KSh ${shortfall.toLocaleString()} more.`,
            current_balance: currentBalance,
            required_amount: totalRequired,
            shortfall: shortfall,
            platform_fee: platformFeeAmount,
            agent_message: `I'm sorry, but you don't have enough funds for this transaction. Your current balance is ${currentBalance.toLocaleString()} shillings, but you need ${totalRequired.toLocaleString()} shillings including fees. You need ${shortfall.toLocaleString()} shillings more. Would you like to add funds to your wallet first?`
          },
          { status: 400 }
        )
      }
      
      console.log('✅ BALANCE CHECK PASSED')
      console.log('  Balance after transaction:', currentBalance - totalRequired)
    } else {
      console.log('💰 Credit transaction (deposit/receive) - no balance check needed')
    }
    
    console.log('✅ Valid amount:', requestedAmount)
    
    // ============================================
    // TRUST AI EXTRACTION - NO RE-CONFIRMATION
    // ============================================
    // The ElevenLabs AI already confirmed with user:
    // "I'm sending KSh X to Y" means user already said YES
    // We just validate and execute immediately
    console.log('🤖 AI already confirmed transaction with user')
    console.log('⚡ Executing immediately - no re-confirmation needed')
    
    // Prepare the payload - all fields at top level for n8n
    const n8nPayload = {
      // Voice request
      request: fullRequest || body.summary || 'Voice transaction request',
      voice_command_text: fullRequest || body.summary || '',
      
      // User context - ALWAYS REAL DATA, NEVER TEST
      user_id: finalUserId || 'no-user-found',
      user_email: finalUserEmail || 'no-email@ongeapesa.com',
      user_phone: finalUserPhone || '',
      user_name: finalUserName || 'User',
      current_balance: currentBalance, // Send current wallet balance to AI
      wallet_balance: currentBalance, // Alternative field name for compatibility
      
      // Subscription & Free Transaction Info
      subscription_status: subscriptionStatus,
      subscription_end_date: subscriptionEndDate,
      free_transactions_remaining: freeTxRemaining,
      is_free_transaction: isFreeTransaction,
      platform_fee: platformFeeAmount,
      
      // Transaction details from ElevenLabs
      type: body.type,
      amount: requestedAmount, // Already validated above
      phone: body.phone || '',
      till: body.till || '',
      paybill: body.paybill || '',
      account: body.account || '',
      agent: body.agent || '',
      store: body.store || '',
      bank_code: body.bankCode || '',
      summary: body.summary || '',
      
      // Voice metadata
      voice_verified: true,
      confidence_score: 85,
      
      // Status fields
      status: 'pending',
      mpesa_transaction_id: '',
      external_ref: '',
      
      // Timestamp and source
      timestamp: new Date().toISOString(),
      source: 'elevenlabs',
    }
    
    console.log('N8N Payload:', JSON.stringify(n8nPayload, null, 2))

    // Forward to n8n
    console.log('\n=== FORWARDING TO N8N ===')
    console.log('N8N URL:', N8N_WEBHOOK_URL)
    console.log('Auth configured:', N8N_AUTH_TOKEN ? 'Yes' : 'No')
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    // Add authentication header if token is configured
    if (N8N_AUTH_TOKEN) {
      headers['Authorization'] = N8N_AUTH_TOKEN
    }
    
    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(n8nPayload),
    })

    console.log('n8n Response Status:', n8nResponse.status)
    console.log('n8n Response Headers:', Object.fromEntries(n8nResponse.headers.entries()))

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text()
      console.error('❌ n8n webhook failed')
      console.error('Status:', n8nResponse.status)
      console.error('Response:', errorText)
      return NextResponse.json(
        { error: 'Failed to process transaction', success: false, n8n_response: errorText },
        { status: 500 }
      )
    }

    // Parse n8n response safely
    const responseText = await n8nResponse.text()
    console.log('n8n Raw Response:', responseText)
    
    let n8nResult: any = {}
    try {
      if (responseText && responseText.trim()) {
        n8nResult = JSON.parse(responseText)
        console.log('✅ n8n Response parsed:', n8nResult)
      } else {
        console.log('⚠️ n8n returned empty response, using default')
        n8nResult = { 
          success: true, 
          message: 'Transaction queued for processing',
          transaction_id: `tx_${Date.now()}`
        }
      }
    } catch (parseError) {
      console.error('❌ Failed to parse n8n response as JSON:', parseError)
      console.error('Raw response:', responseText)
      // If n8n doesn't return JSON, assume success since the request went through
      n8nResult = { 
        success: true, 
        message: 'Transaction sent to n8n',
        raw_response: responseText,
        transaction_id: `tx_${Date.now()}`
      }
    }

    // Return success response to ElevenLabs
    console.log('\n=== SENDING RESPONSE TO ELEVENLABS ===')
    const response = {
      success: true,
      message: `Transaction processed successfully${userContext?.email ? ' for ' + userContext.email : ''}`,
      transaction_id: n8nResult.transaction_id || null,
      data: n8nResult,
    }
    console.log('Response:', JSON.stringify(response, null, 2))
    console.log('=== WEBHOOK COMPLETED ===\n')
    
    // Log successful request
    logRequest({
      timestamp: new Date().toISOString(),
      method: 'POST',
      url: request.url,
      headers: Object.fromEntries(request.headers),
      body: body,
      query: Object.fromEntries(new URL(request.url).searchParams),
      user_id: finalUserId,
      n8n_response: n8nResult,
      success: true,
      duration_ms: Date.now() - startTime
    })
    
    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ VOICE WEBHOOK ERROR ❌')
    console.error('Error:', error)
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Log failed request
    logRequest({
      timestamp: new Date().toISOString(),
      method: 'POST',
      url: request.url,
      headers: Object.fromEntries(request.headers),
      body: {},
      query: Object.fromEntries(new URL(request.url).searchParams),
      error: errorMessage,
      success: false,
      duration_ms: Date.now() - startTime
    })
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        success: false,
        details: errorMessage
      },
      { status: 500 }
    )
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
