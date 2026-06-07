import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { logSecurityEvent } from '@/lib/services/auditService';

// Safaricom STK Push callback — called by Safaricom (not by users).
// Reconciles transactions + mpesa_transactions by CheckoutRequestID.
// Idempotent: rows already in a terminal state are not re-processed.
// CRITICAL: every update is guarded with .neq('status','completed') to
// prevent the DB trigger (update_wallet_balance) from double-crediting.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    // Safaricom STK callback shape:
    // { Body: { stkCallback: { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata? } } }
    const stkCallback =
      body?.Body?.stkCallback ||
      body?.body?.stkCallback ||
      body?.stkCallback ||
      body;

    const checkoutRequestId: string | null =
      stkCallback?.CheckoutRequestID || body?.CheckoutRequestID || null;
    const merchantRequestId: string | null =
      stkCallback?.MerchantRequestID || body?.MerchantRequestID || null;
    const resultCode: number = Number(stkCallback?.ResultCode ?? body?.ResultCode ?? -1);
    const resultDesc: string = stkCallback?.ResultDesc || body?.ResultDesc || '';

    if (!checkoutRequestId) {
      console.warn('[stk-callback] No CheckoutRequestID — ignoring');
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted (no CheckoutRequestID)' });
    }

    const admin = createServiceClient();

    // Look up the transaction by provider_ref = CheckoutRequestID
    const { data: tx } = await admin
      .from('transactions')
      .select('id, user_id, status, amount')
      .eq('provider_ref', checkoutRequestId)
      .single();

    if (!tx) {
      console.warn(`[stk-callback] Unknown CheckoutRequestID: ${checkoutRequestId}`);
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted (unknown checkout id)' });
    }

    // Idempotency: skip if already in a terminal state
    if (tx.status === 'completed' || tx.status === 'failed') {
      console.log(`[stk-callback] Already processed tx=${tx.id} status=${tx.status}`);
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Already processed' });
    }

    const success = resultCode === 0;

    if (success) {
      // Extract metadata items from CallbackMetadata
      const items: Array<{ Name: string; Value: any }> =
        stkCallback?.CallbackMetadata?.Item || [];
      const get = (name: string) =>
        items.find((i) => i.Name === name)?.Value ?? null;

      const paidAmount = get('Amount');
      const mpesaReceiptNumber: string | null = get('MpesaReceiptNumber');
      const transactionDate = get('TransactionDate');
      const phoneNumber = get('PhoneNumber');

      const now = new Date().toISOString();

      // Update transactions — guarded with .neq('status','completed') (double-credit protection)
      await admin
        .from('transactions')
        .update({
          status: 'completed',
          mpesa_transaction_id: mpesaReceiptNumber,
          completed_at: now,
          updated_at: now,
          metadata: {
            mpesa_receipt: mpesaReceiptNumber,
            transaction_date: transactionDate,
            phone_number: phoneNumber,
            paid_amount: paidAmount,
          },
        })
        .eq('id', tx.id)
        .neq('status', 'completed'); // CRITICAL: double-credit guard

      // Update mpesa_transactions
      await admin
        .from('mpesa_transactions')
        .update({
          status: 'completed',
          mpesa_receipt_number: mpesaReceiptNumber,
          completed_at: now,
        })
        .eq('checkout_request_id', checkoutRequestId)
        .neq('status', 'completed'); // idempotency guard

      await logSecurityEvent(
        {
          userId: tx.user_id,
          eventType: 'deposit_completed',
          severity: 'info',
          metadata: {
            rail: 'safaricom_stk',
            checkoutRequestId,
            mpesaReceiptNumber,
            amount: paidAmount ?? tx.amount,
          },
        },
        admin
      );

      console.log(
        `✅ STK deposit completed — tx=${tx.id} receipt=${mpesaReceiptNumber} amount=${paidAmount}`
      );
    } else {
      const now = new Date().toISOString();

      // Update transactions — guard prevents re-processing a completed row
      await admin
        .from('transactions')
        .update({
          status: 'failed',
          error_message: resultDesc,
          updated_at: now,
        })
        .eq('id', tx.id)
        .neq('status', 'completed'); // CRITICAL: do not overwrite a completed row

      // Update mpesa_transactions
      await admin
        .from('mpesa_transactions')
        .update({
          status: 'failed',
          error_message: resultDesc,
        })
        .eq('checkout_request_id', checkoutRequestId)
        .neq('status', 'completed');

      await logSecurityEvent(
        {
          userId: tx.user_id,
          eventType: 'deposit_failed',
          severity: 'warning',
          metadata: {
            rail: 'safaricom_stk',
            checkoutRequestId,
            merchantRequestId,
            resultCode,
            resultDesc,
          },
        },
        admin
      );

      console.log(
        `❌ STK deposit failed — tx=${tx.id} code=${resultCode} desc=${resultDesc}`
      );
    }

    // Always 200 so Safaricom does not retry-storm
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err: any) {
    console.error('❌ STK callback error:', err);
    // Always 200 so Safaricom does not retry-storm; log for investigation
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
}
