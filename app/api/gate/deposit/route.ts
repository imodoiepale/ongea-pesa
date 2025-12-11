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

    // Add callback URL to receive payment notifications
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/gate/mpesa-callback`;
    formData.append('callbackURL', callbackUrl);

    console.log(`📞 Callback URL set: ${callbackUrl}`);

    // Set up 20-second timeout for external API call
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 seconds

    // Call the external API for deposit
    let depositResponse;
    try {
      depositResponse = await fetch('https://aps.co.ke/indexpay/api/gate_deposit.php', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Deposit request timed out after 20 seconds. Please try again.' },
          { status: 408 }
        );
      }
      throw fetchError;
    }

    if (!depositResponse.ok) {
      throw new Error('Failed to initiate deposit with external API');
    }

    const depositData = await depositResponse.json();
    console.log('📦 Raw deposit response:', JSON.stringify(depositData, null, 2));

    // Parse the mpesapayment response format:
    // { "mpesapayment": [{ "bool_code": "TRUE", "message": "...", "trx_id": "..." }, { "account_number": "..." }] }
    let mpesaResponse = null;
    let trxId = '';
    let accountNumber = ''; // This is the transaction code for verification
    let boolCode = '';
    let responseMessage = '';

    if (depositData.mpesapayment && Array.isArray(depositData.mpesapayment)) {
      // Extract from mpesapayment array
      for (const item of depositData.mpesapayment) {
        if (item.bool_code) boolCode = item.bool_code;
        if (item.message) responseMessage = item.message;
        if (item.trx_id) trxId = item.trx_id;
        if (item.account_number) accountNumber = item.account_number;
      }
      mpesaResponse = depositData.mpesapayment;
    }

    // Check if deposit was successful - more robust check
    // bool_code can be "TRUE", "true", or truthy value
    const isSuccess =
      boolCode.toUpperCase() === 'TRUE' ||
      boolCode === '1' ||
      depositData.status === true ||
      depositData.status === 'success' ||
      (mpesaResponse && accountNumber); // If we have account_number, STK push was sent

    console.log(`🔍 Success check: boolCode="${boolCode}", isSuccess=${isSuccess}, hasAccountNumber=${!!accountNumber}`);

    if (!isSuccess) {
      return NextResponse.json(
        {
          success: false,
          transaction_sent: false,
          error: responseMessage || depositData.Message || depositData.message || 'Deposit initiation failed',
          details: depositData
        },
        { status: 400 }
      );
    }

    console.log(`✅ Deposit initiated successfully for ${userData.gate_name}`);
    console.log(`📝 Transaction ID: ${trxId}`);
    console.log(`🔑 Account Number (for verification): ${accountNumber}`);

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

    // Use account_number as the primary transaction reference for status checks
    const transactionRef = accountNumber || trxId || depositData.transaction_id || depositData.TransactionID;

    // Create transaction record for the deposit
    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'deposit',
        amount: depositAmount,
        phone: phone,
        status: 'pending', // Will be updated via verification
        voice_command_text: `M-Pesa deposit of KSh ${depositAmount.toLocaleString()} from ${phone}`,
        external_ref: transactionRef,
        mpesa_transaction_id: trxId,
        metadata: {
          account_number: accountNumber,
          gate_name: userData.gate_name,
          payment_mode: 'MPESA',
          initiated_at: new Date().toISOString(),
          mpesa_response: mpesaResponse
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (txError) {
      console.error('⚠️ Failed to create transaction record:', txError);
      // Don't fail the request, just log the error
    }

    const transactionId = txData?.id;

    console.log(`📝 Transaction record created: ${transactionId}`);
    console.log(`🔄 Transaction will be polled for status updates`);

    // Return standardized JSON response
    return NextResponse.json({
      success: true,
      status: 'initiated',
      message: responseMessage || 'Deposit initiated successfully. Check your phone for M-Pesa prompt.',
      transaction_sent: true,
      transaction_id: transactionId,
      transaction_reference: transactionRef,
      mpesa_trx_id: trxId,
      account_number: accountNumber, // Use this for verification via get_settlements
      amount: depositAmount,
      phone: phone,
      gate_name: userData.gate_name,
      timestamp: new Date().toISOString(),
      next_step: 'Enter M-Pesa PIN on your phone to complete the transaction',
      verify_url: '/api/gate/verify-transaction',
      mpesa_response: mpesaResponse
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
