import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { logSecurityEvent } from '@/lib/services/auditService';

// NCBA Open Banking async callback (bill payments carry an optional callbackUrl).
// Set NCBA payment callbackUrl to this route (or have the n8n /webhook/ncba_bill_result
// receiver forward here). Reconciles the transaction by provider_ref (bankRef/channelRef).
// Idempotent: a transaction already terminal is not re-processed.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = body?.data || body;

    const ref = data?.bankRef || data?.channelRef || body?.provider_ref || null;
    const succeeded =
      body?.succeeded === true ||
      data?.message === 'SUCCESS' ||
      String(body?.resultCode || '').includes('200');
    const token = data?.token || data?.meterToken || data?.stdTokenRecieptNo || null;

    // NCBA does not consistently surface charges. Use an actual callback value
    // when present; otherwise retain the published-band estimate saved at send time.
    const rawTransactionCost = data?.charges ?? data?.fee ?? data?.transaction_charge ?? data?.transactionCharge;
    const callbackTransactionCost = rawTransactionCost == null
      ? null
      : parseFloat(String(rawTransactionCost));

    if (!ref) {
      return NextResponse.json({ statusCode: 200, message: 'Accepted (no ref)' });
    }

    const admin = createServiceClient();

    const { data: tx } = await admin
      .from('transactions')
      .select('id, status, transaction_cost, metadata')
      .eq('provider_ref', ref)
      .single();

    if (!tx) {
      return NextResponse.json({ statusCode: 200, message: 'Accepted (unknown ref)' });
    }
    if (tx.status === 'failed') {
      return NextResponse.json({ statusCode: 200, message: 'Already processed' });
    }

    const storedCost = Number(tx.transaction_cost || 0);
    const transactionCost = callbackTransactionCost != null && Number.isFinite(callbackTransactionCost)
      ? callbackTransactionCost
      : storedCost;
    const metadata = {
      ...((tx.metadata && typeof tx.metadata === 'object') ? tx.metadata : {}),
      transaction_cost_estimated: callbackTransactionCost == null,
      transaction_cost_source: callbackTransactionCost == null ? 'ncba_tariff_05_26' : 'ncba_callback',
    };

    // A synchronous rail response may have completed the row using the tariff
    // estimate first. Updating a completed row is safe: the fee-reconciliation
    // trigger applies only the difference to the wallet.
    if (tx.status === 'completed') {
      if (callbackTransactionCost == null || !Number.isFinite(callbackTransactionCost)) {
        return NextResponse.json({ statusCode: 200, message: 'Already processed' });
      }
      await admin
        .from('transactions')
        .update({ transaction_cost: transactionCost, metadata })
        .eq('id', tx.id);
      return NextResponse.json({ statusCode: 200, message: 'Charge reconciled' });
    }

    await admin
      .from('transactions')
      .update({
        status: succeeded ? 'completed' : 'failed',
        completed_at: succeeded ? new Date().toISOString() : null,
        external_ref: token || undefined,
        transaction_cost: transactionCost,
        metadata,
      })
      .eq('id', tx.id);

    await logSecurityEvent({
      userId: null,
      eventType: 'money_send_result',
      severity: succeeded ? 'info' : 'warning',
      metadata: { rail: 'ncba', ref, succeeded, token: token ? 'present' : null },
    }, admin);

    return NextResponse.json({ statusCode: 200, message: 'Accepted' });
  } catch (err: any) {
    console.error('❌ NCBA callback error:', err);
    return NextResponse.json({ statusCode: 200, message: 'Accepted' });
  }
}
