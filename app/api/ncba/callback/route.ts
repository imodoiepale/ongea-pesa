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

    // NCBA does not consistently surface per-transaction charges in the callback payload.
    // Check common field names; default to 0 if not present.
    const transactionCost =
      parseFloat(String(data?.charges || data?.fee || data?.transaction_charge || data?.transactionCharge || 0)) || 0;

    if (!ref) {
      return NextResponse.json({ statusCode: 200, message: 'Accepted (no ref)' });
    }

    const admin = createServiceClient();

    const { data: tx } = await admin
      .from('transactions')
      .select('id, status')
      .eq('provider_ref', ref)
      .single();

    if (!tx) {
      return NextResponse.json({ statusCode: 200, message: 'Accepted (unknown ref)' });
    }
    if (tx.status === 'completed' || tx.status === 'failed') {
      return NextResponse.json({ statusCode: 200, message: 'Already processed' });
    }

    await admin
      .from('transactions')
      .update({
        status: succeeded ? 'completed' : 'failed',
        completed_at: succeeded ? new Date().toISOString() : null,
        external_ref: token || undefined,
        transaction_cost: transactionCost,
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
