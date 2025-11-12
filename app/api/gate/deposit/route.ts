import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { amount, phone } = await request.json();

    if (!amount || !phone) {
      return NextResponse.json(
        { error: 'Amount and phone number are required' },
        { status: 400 }
      );
    }

    // Validate amount
    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be greater than 0' },
        { status: 400 }
      );
    }

    // Validate phone (Kenyan format)
    const phoneRegex = /^(07|01|\+2547|\+2541)[0-9]{8}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return NextResponse.json(
        { error: 'Invalid phone number. Use format: 0712345678 or +254712345678' },
        { status: 400 }
      );
    }

    // Get user's gate info
    const { data: userData, error: fetchError } = await supabase
      .from('profiles')
      .select('gate_id, gate_name, mpesa_number')
      .eq('id', user.id)
      .single();

    if (fetchError || !userData) {
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    if (!userData.gate_name) {
      return NextResponse.json(
        { error: 'No payment gate found. Please contact support.' },
        { status: 400 }
      );
    }

    console.log(`💰 Processing deposit: ${depositAmount} KES to gate ${userData.gate_name} from ${phone}`);

    // Prepare form data for gate deposit
    const formData = new FormData();
    formData.append('user_email', 'info@nsait.co.ke');
    formData.append('request', '1');
    formData.append('transaction_intent', 'Deposit');
    formData.append('phone', phone.replace(/\s/g, ''));
    formData.append('amount', depositAmount.toString());
    formData.append('currency', 'KES');
    formData.append('gate_name', userData.gate_name);
    formData.append('pocket_name', 'ongeapesa_wallet');
    formData.append('payment_mode', 'MPESA');

    // Call the external API for deposit
    const depositResponse = await fetch('https://aps.co.ke/indexpay/api/gate_deposit.php', {
      method: 'POST',
      body: formData,
    });

    if (!depositResponse.ok) {
      throw new Error('Failed to initiate deposit with external API');
    }

    const depositData = await depositResponse.json();

    // Check if deposit was successful
    if (!depositData.status) {
      return NextResponse.json(
        { 
          error: depositData.Message || depositData.message || 'Deposit initiation failed',
          details: depositData
        },
        { status: 400 }
      );
    }

    console.log(`✅ Deposit initiated successfully for ${userData.gate_name}`);

    // Update user's M-Pesa number if it's different (save as default)
    if (userData.mpesa_number !== phone) {
      await supabase
        .from('profiles')
        .update({
          mpesa_number: phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    }

    return NextResponse.json({
      success: true,
      message: 'Deposit initiated successfully. Check your phone for M-Pesa prompt.',
      transaction_data: {
        amount: depositAmount,
        phone: phone,
        gate_name: userData.gate_name,
        ...depositData
      }
    });

  } catch (error: any) {
    console.error('❌ Gate deposit error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
