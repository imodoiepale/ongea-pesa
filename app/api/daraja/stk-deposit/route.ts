import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { normalizePhone } from '@/lib/phone';

export async function POST(request: NextRequest) {
  try {
    // Authenticate caller (browser client — RLS-bound)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, phone } = body;

    // --- Validation ---
    if (!amount || !phone) {
      return NextResponse.json(
        { error: 'amount and phone are required' },
        { status: 400 }
      );
    }

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be greater than 0' },
        { status: 400 }
      );
    }
    if (depositAmount > 999999) {
      return NextResponse.json(
        { error: 'Amount exceeds the maximum allowed limit of KSh 999,999' },
        { status: 400 }
      );
    }

    // Normalise phone to 254XXXXXXXXX for Daraja using shared util
    // (accepts 07xx, 01xx, 2547xx, +2547xx, 7xx — rejects anything unrecognised)
    const darajaPhone = normalizePhone(phone);
    if (!darajaPhone) {
      return NextResponse.json(
        { error: 'Invalid phone number. Use format: 0712345678 or +254712345678' },
        { status: 400 }
      );
    }
    const cleanPhone = phone.replace(/\s/g, '');

    // --- Insert transaction row (service-role to bypass RLS) ---
    const admin = createServiceClient();
    const { data: txData, error: txError } = await admin
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'deposit',
        status: 'processing',
        amount: depositAmount,
        phone: cleanPhone,
        provider: 'safaricom_stk',
        external_ref: null,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (txError || !txData) {
      console.error('❌ Failed to create transaction row:', txError);
      return NextResponse.json(
        { error: 'Failed to create transaction record' },
        { status: 500 }
      );
    }

    const transactionId = txData.id;

    // --- Trigger n8n STK Push ---
    const n8nBase = process.env.N8N_WEBHOOK_BASE_URL || 'https://n8n-lc5r.srv1631847.hstgr.cloud';
    let n8nData: any = null;

    try {
      const n8nResp = await fetch(`${n8nBase}/webhook/daraja_stk_deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionType: 'stk_push',
          commandId: 'CustomerPayBillOnline',
          amount: depositAmount,
          phone: darajaPhone,
          accountRef: user.id,
          description: 'Wallet top-up',
        }),
      });

      if (!n8nResp.ok) {
        throw new Error(`n8n responded ${n8nResp.status}`);
      }

      n8nData = await n8nResp.json();
    } catch (n8nErr: any) {
      console.error('❌ n8n STK trigger failed:', n8nErr);
      // Mark transaction failed — no double-credit risk (was 'processing', never 'completed')
      await admin
        .from('transactions')
        .update({ status: 'failed', error_message: 'Failed to initiate STK push' })
        .eq('id', transactionId);
      return NextResponse.json(
        { error: 'Failed to initiate M-Pesa STK push. Please try again.' },
        { status: 502 }
      );
    }

    // Extract Safaricom IDs from n8n response
    // n8n forwards the raw Daraja response; shape may be nested or flat
    const stkResult = n8nData?.stkPushResult || n8nData?.data || n8nData;
    const checkoutRequestId: string = stkResult?.CheckoutRequestID || stkResult?.checkoutRequestID || null;
    const merchantRequestId: string = stkResult?.MerchantRequestID || stkResult?.merchantRequestID || null;

    if (!checkoutRequestId) {
      console.warn('⚠️ No CheckoutRequestID in n8n response:', JSON.stringify(n8nData));
      // Transaction stays 'processing' — callback will reconcile
    } else {
      // Attach Safaricom IDs to the transaction row
      await admin
        .from('transactions')
        .update({ provider_ref: checkoutRequestId })
        .eq('id', transactionId);

      // Track in mpesa_transactions for detailed reconciliation
      await admin.from('mpesa_transactions').upsert(
        {
          checkout_request_id: checkoutRequestId,
          merchant_request_id: merchantRequestId ?? null,
          status: 'pending',
          user_id: user.id,
          amount: depositAmount,
          phone_number: darajaPhone,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'checkout_request_id' }
      );
    }

    console.log(
      `✅ STK push initiated — tx=${transactionId} checkout=${checkoutRequestId} amount=${depositAmount} phone=${darajaPhone}`
    );

    return NextResponse.json({
      success: true,
      transaction_id: transactionId,
      checkout_request_id: checkoutRequestId,
      amount: depositAmount,
      phone: cleanPhone,
    });
  } catch (err: any) {
    console.error('❌ STK deposit error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err?.message },
      { status: 500 }
    );
  }
}
