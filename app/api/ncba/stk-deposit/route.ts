import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { normalizePhone } from '@/lib/phone';
import { mpesaPaybillCharge, depositFeeBreakdown } from '@/lib/transaction-fees';
import { ONGEA_ENV } from '@/lib/environment'

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

    // Normalise phone to 254XXXXXXXXX for NCBA using shared util
    // (accepts 07xx, 01xx, 2547xx, +2547xx, 7xx — rejects anything unrecognised)
    const ncbaPhone = normalizePhone(phone);
    if (!ncbaPhone) {
      return NextResponse.json(
        { error: 'Invalid phone number. Use format: 0712345678 or +254712345678' },
        { status: 400 }
      );
    }
    const cleanPhone = phone.replace(/\s/g, '');

    // --- Insert transaction row (service-role to bypass RLS) ---
    // Stays 'processing' — the DB trigger credits wallet_balance only on 'completed'
    const admin = createServiceClient();
    const { data: txData, error: txError } = await admin
      .from('transactions')
      .insert({
        user_id: user.id,
        environment: ONGEA_ENV,
        type: 'deposit',
        status: 'processing',
        amount: depositAmount,
        phone: cleanPhone,
        provider: 'ncba_stk',
        platform_fee: 0, // Ongea Pesa takes no cut on deposits
        transaction_cost: mpesaPaybillCharge(depositAmount), // Safaricom paybill charge, borne by the customer
        net_amount: depositAmount, // full amount is credited
        metadata: {
          rail: 'ncba_stk',
          cost_bearer: 'customer',
          mpesa_charge_estimate: mpesaPaybillCharge(depositAmount),
        },
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (txError || !txData) {
      console.error('❌ Failed to create transaction row:', txError);
      // Surface the Postgres error — it names the failing column or constraint
      // and carries no user PII. Without it a schema drift looks identical to
      // an auth or network failure from the client side.
      return NextResponse.json(
        {
          error: 'Failed to create transaction record',
          details: txError?.message,
          code: txError?.code,
        },
        { status: 500 }
      );
    }

    const transactionId = txData.id;

    // Mark the row failed — .neq guard so we never un-credit a row the trigger already completed
    const failTransaction = async (reason: string) => {
      await admin
        .from('transactions')
        .update({ status: 'failed', error_message: reason })
        .eq('id', transactionId)
        .neq('status', 'completed');
    };

    // --- Trigger n8n NCBA Till STK Push ---
    // NCBA has no callback/IPN, so the n8n branch polls stk-push/query and reports the
    // outcome back to /api/ncba/stk-result. We hand it the URL + secret rather than
    // storing them in n8n, keeping one source of truth in the app env.
    const n8nBase = process.env.N8N_WEBHOOK_BASE_URL || 'https://n8n-lc5r.srv1631847.hstgr.cloud';
    const appBase = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('host')}`;
    const resultSecret = process.env.N8N_CALLBACK_SECRET;

    if (!resultSecret) {
      console.error('❌ N8N_CALLBACK_SECRET is not set — deposits cannot be confirmed');
      await failTransaction('Server not configured for STK confirmation');
      return NextResponse.json(
        { error: 'Deposits are temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    let n8nData: any = null;

    // n8n responds early (right after NCBA accepts the STK), so a short timeout is enough
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const n8nResp = await fetch(`${n8nBase}/webhook/ncba-stk-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: transactionId,
          user_id: user.id,
          phone: ncbaPhone,
          amount: depositAmount,
          narration: 'Ongea Pesa wallet top-up',
          result_url: `${appBase}/api/ncba/stk-result`,
          result_secret: resultSecret,
        }),
        signal: controller.signal,
      });

      if (!n8nResp.ok) {
        // Try to surface NCBA's own reason before falling back
        let detail: string | null = null;
        try {
          const errBody = await n8nResp.json();
          detail = errBody?.statusDescription || errBody?.error || null;
        } catch {
          // non-JSON body — ignore
        }
        console.error(`❌ n8n NCBA STK trigger responded ${n8nResp.status}:`, detail);
        await failTransaction(detail || `NCBA STK push rejected (HTTP ${n8nResp.status})`);
        return NextResponse.json(
          { error: detail || 'Failed to initiate NCBA STK push. Please try again.' },
          { status: 502 }
        );
      }

      n8nData = await n8nResp.json();
    } catch (n8nErr: any) {
      console.error('❌ n8n NCBA STK trigger failed:', n8nErr);
      await failTransaction('Failed to initiate STK push');
      return NextResponse.json(
        { error: 'Failed to initiate NCBA STK push. Please try again.' },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeout);
    }

    // n8n early response shape: { success, transaction_id, ncba_transaction_id, reference_id }
    // — may be nested depending on how the workflow responds
    const stkResult = n8nData?.stkPushResult || n8nData?.data || n8nData;

    if (stkResult?.success === false) {
      const reason: string =
        stkResult?.statusDescription || stkResult?.error || 'NCBA declined the STK push';
      console.error('❌ NCBA STK push declined:', JSON.stringify(n8nData));
      await failTransaction(reason);
      return NextResponse.json({ error: reason }, { status: 502 });
    }

    const ncbaTransactionId: string =
      stkResult?.ncba_transaction_id || stkResult?.transactionId || stkResult?.TransactionID || transactionId;

    // Store NCBA's TransactionID now so the row is traceable even if the n8n poll loop dies.
    // The completed/failed flip is owned by n8n calling /api/ncba/stk-result.
    if (ncbaTransactionId !== transactionId) {
      await admin
        .from('transactions')
        .update({ provider_ref: ncbaTransactionId })
        .eq('id', transactionId)
        .neq('status', 'completed');
    }

    console.log(
      `✅ NCBA STK push initiated — tx=${transactionId} ncba=${ncbaTransactionId} amount=${depositAmount} phone=${ncbaPhone}`
    );

    return NextResponse.json({
      success: true,
      transaction_id: transactionId,
      ncba_transaction_id: ncbaTransactionId,
      amount: depositAmount,
      phone: cleanPhone,
      fee_breakdown: depositFeeBreakdown(depositAmount),
    });
  } catch (err: any) {
    console.error('❌ NCBA STK deposit error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err?.message },
      { status: 500 }
    );
  }
}
