import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * M-Pesa Callback Endpoint
 * Receives payment notifications from IndexPay after deposit completion
 * NO AUTHENTICATION REQUIRED - This is called by external service
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('');
    console.log('='.repeat(80));
    console.log('🔔 M-PESA CALLBACK RECEIVED');
    console.log('='.repeat(80));
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('📍 URL:', request.url);
    console.log('');

    // Log all headers
    console.log('📋 HEADERS:');
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
      console.log(`   ${key}: ${value}`);
    });
    console.log('');

    // Get content type to handle different formats
    const contentType = request.headers.get('content-type') || '';
    let callbackData: any = {};

    // Try to parse body based on content type
    if (contentType.includes('application/json')) {
      console.log('📦 Parsing as JSON...');
      callbackData = await request.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      console.log('📦 Parsing as Form URL Encoded...');
      const formData = await request.formData();
      callbackData = Object.fromEntries(formData);
    } else if (contentType.includes('multipart/form-data')) {
      console.log('📦 Parsing as Multipart Form Data...');
      const formData = await request.formData();
      callbackData = Object.fromEntries(formData);
    } else {
      console.log('📦 Unknown content type, attempting JSON parse...');
      try {
        callbackData = await request.json();
      } catch {
        const text = await request.text();
        console.log('📄 Raw text:', text);
        callbackData = { raw: text };
      }
    }

    console.log('');
    console.log('💰 CALLBACK PAYLOAD:');
    console.log(JSON.stringify(callbackData, null, 2));
    console.log('');

    // Extract common fields (adjust based on actual IndexPay callback structure)
    const {
      transaction_id,
      transaction_reference,
      external_reference,
      status,
      Status,
      amount,
      Amount,
      phone,
      Phone,
      mpesa_receipt,
      MpesaReceiptNumber,
      gate_name,
      gate_id,
      message,
      Message,
      ResultCode,
      result_code,
      ...otherFields
    } = callbackData;

    console.log('🔍 EXTRACTED FIELDS:');
    console.log('   Transaction ID:', transaction_id || external_reference || 'N/A');
    console.log('   Status:', status || Status || 'N/A');
    console.log('   Amount:', amount || Amount || 'N/A');
    console.log('   Phone:', phone || Phone || 'N/A');
    console.log('   M-Pesa Receipt:', mpesa_receipt || MpesaReceiptNumber || 'N/A');
    console.log('   Gate Name:', gate_name || 'N/A');
    console.log('   Gate ID:', gate_id || 'N/A');
    console.log('   Message:', message || Message || 'N/A');
    console.log('   Result Code:', ResultCode || result_code || 'N/A');
    console.log('');

    // Determine success/failure
    const isSuccess =
      status?.toLowerCase() === 'success' ||
      Status?.toLowerCase() === 'success' ||
      ResultCode === '0' ||
      result_code === '0';

    const isFailed =
      status?.toLowerCase() === 'failed' ||
      Status?.toLowerCase() === 'failed' ||
      (ResultCode && ResultCode !== '0') ||
      (result_code && result_code !== '0');

    console.log('✅ Success?', isSuccess);
    console.log('❌ Failed?', isFailed);
    console.log('');

    // Try to update transaction in database if we have transaction_id
    const txId = transaction_id || external_reference;

    if (txId) {
      console.log('🔄 Updating transaction in database...');
      console.log('   Transaction ID:', txId);

      const supabase = await createClient();

      // First, try to find the transaction
      const { data: existingTx, error: findError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', txId)
        .single();

      if (findError) {
        console.log('⚠️ Transaction not found in database:', findError.message);
        console.log('   This might be normal if transaction was created externally');
      } else {
        console.log('✅ Found transaction:', existingTx.id);
        console.log('   Current status:', existingTx.status);

        // Update based on callback result
        const updateData: any = {
          updated_at: new Date().toISOString(),
          metadata: {
            ...existingTx.metadata,
            callback_received_at: new Date().toISOString(),
            callback_data: callbackData,
          }
        };

        if (isSuccess) {
          updateData.status = 'completed';
          updateData.mpesa_transaction_id = mpesa_receipt || MpesaReceiptNumber;

          // Credit wallet
          const depositAmount = parseFloat(amount || Amount || existingTx.amount);
          const { data: profile } = await supabase
            .from('profiles')
            .select('wallet_balance')
            .eq('id', existingTx.user_id)
            .single();

          if (profile) {
            const currentBalance = parseFloat(String(profile.wallet_balance || 0));
            const newBalance = currentBalance + depositAmount;

            await supabase
              .from('profiles')
              .update({
                wallet_balance: newBalance,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingTx.user_id);

            console.log('💰 Wallet credited!');
            console.log('   Previous balance: KSh', currentBalance.toFixed(2));
            console.log('   Deposit amount: KSh', depositAmount.toFixed(2));
            console.log('   New balance: KSh', newBalance.toFixed(2));
          }
        } else if (isFailed) {
          updateData.status = 'failed';
          updateData.error_message = message || Message || 'Payment failed';
        }

        const { error: updateError } = await supabase
          .from('transactions')
          .update(updateData)
          .eq('id', txId);

        if (updateError) {
          console.error('❌ Failed to update transaction:', updateError);
        } else {
          console.log('✅ Transaction updated successfully');
        }
      }
    } else {
      console.log('⚠️ No transaction ID in callback, skipping database update');
    }

    const duration = Date.now() - startTime;
    console.log('');
    console.log('⏱️ Processing time:', duration, 'ms');
    console.log('='.repeat(80));
    console.log('');

    // Always return 200 OK to acknowledge receipt
    return NextResponse.json({
      success: true,
      message: 'Callback received and processed',
      received_at: new Date().toISOString(),
      duration_ms: duration,
      transaction_id: txId,
      status_updated: isSuccess ? 'completed' : isFailed ? 'failed' : 'pending',
    });

  } catch (error: any) {
    console.error('');
    console.error('❌ CALLBACK ERROR:', error);
    console.error('Stack:', error.stack);
    console.error('');

    // Still return 200 to avoid retry loops
    return NextResponse.json({
      success: false,
      error: 'callback_processing_error',
      message: error.message,
      received_at: new Date().toISOString(),
    }, { status: 200 }); // Return 200 to prevent retries
  }
}

// Also support GET for testing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  console.log('🧪 Test callback endpoint called');
  console.log('Query params:', Object.fromEntries(searchParams));

  return NextResponse.json({
    message: 'M-Pesa callback endpoint is active',
    endpoint: '/api/gate/mpesa-callback',
    method: 'POST',
    test_mode: true,
    timestamp: new Date().toISOString(),
    query_params: Object.fromEntries(searchParams),
  });
}
