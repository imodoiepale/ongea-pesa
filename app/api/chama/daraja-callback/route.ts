import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { logSecurityEvent } from '@/lib/services/auditService';

// Safaricom Daraja B2C result + timeout callback.
// Point the n8n Daraja ResultURL/QueueTimeOutURL (or Safaricom directly) here.
// Reconciles chama_payouts (and any linked transaction) by ConversationID.
// Idempotent: a payout already in a terminal state is not re-processed.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = body?.Result || body?.result || body;

    const conversationId =
      result?.ConversationID || result?.conversationId || body?.conversation_id || null;
    const resultCode = result?.ResultCode ?? body?.resultCode;
    const isTimeout = body?.timeout === true || /timeout/i.test(String(result?.ResultDesc || ''));

    if (!conversationId) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted (no conversationId)' });
    }

    const admin = createServiceClient();

    const { data: payout } = await admin
      .from('chama_payouts')
      .select('id, status')
      .eq('conversation_id', conversationId)
      .single();

    if (!payout) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted (unknown conversationId)' });
    }

    // Idempotency: ignore if already terminal
    if (payout.status === 'completed' || payout.status === 'failed') {
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Already processed' });
    }

    const success = Number(resultCode) === 0 && !isTimeout;
    const newStatus = success ? 'completed' : isTimeout ? 'timeout' : 'failed';

    const update: Record<string, any> = { status: newStatus };
    if (success) {
      update.mpesa_transaction_id = result?.TransactionID || result?.transactionReceipt || null;
      update.completed_at = new Date().toISOString();
    }

    await admin.from('chama_payouts').update(update).eq('id', payout.id);

    // Mirror onto any linked transaction row
    await admin
      .from('transactions')
      .update({ status: success ? 'completed' : 'failed' })
      .eq('provider_ref', conversationId);

    await logSecurityEvent({
      userId: null,
      eventType: 'money_send_result',
      severity: success ? 'info' : 'warning',
      metadata: { rail: 'safaricom_b2c', conversationId, resultCode, newStatus },
    }, admin);

    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err: any) {
    console.error('❌ Daraja callback error:', err);
    // Always 200 so Safaricom does not retry-storm; we log for investigation.
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
}
