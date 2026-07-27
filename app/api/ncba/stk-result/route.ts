import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { logSecurityEvent } from '@/lib/services/auditService';

// NCBA STK Push result — called by the n8n `ncba-stk-push` poll loop, NOT by NCBA
// and NOT by users. NCBA exposes no callback/IPN, so n8n polls
// /payments/api/v1/stk-push/query and reports the terminal outcome here.
//
// This endpoint moves money (a 'completed' deposit fires the DB trigger that
// credits profiles.wallet_balance), so it is secret-gated and fails closed.
// Idempotent: rows already in a terminal state are not re-processed, and every
// update is guarded with .neq('status','completed') to prevent double-crediting.

function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  try {
    const expectedSecret = process.env.N8N_CALLBACK_SECRET;
    if (!expectedSecret) {
      console.error('❌ [ncba/stk-result] N8N_CALLBACK_SECRET is not set — refusing request');
      return NextResponse.json(
        { error: 'Server not configured for STK result callbacks' },
        { status: 500 }
      );
    }

    if (!secretMatches(request.headers.get('x-ongea-secret'), expectedSecret)) {
      console.warn('⚠️ [ncba/stk-result] Rejected request with bad or missing secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const transactionId: string | null = body?.transaction_id ?? null;
    const outcome: string = String(body?.outcome ?? '').toLowerCase();
    const ncbaTransactionId: string | null = body?.ncba_transaction_id ?? null;
    const description: string | null = body?.description ?? null;
    const attempts: number | null = Number.isFinite(body?.attempts) ? body.attempts : null;

    if (!transactionId) {
      return NextResponse.json({ error: 'transaction_id is required' }, { status: 400 });
    }
    if (!['success', 'failed', 'timeout'].includes(outcome)) {
      return NextResponse.json(
        { error: "outcome must be one of 'success', 'failed', 'timeout'" },
        { status: 400 }
      );
    }

    const admin = createServiceClient();

    const { data: tx, error: txError } = await admin
      .from('transactions')
      .select('id, user_id, status, amount, type, provider, metadata')
      .eq('id', transactionId)
      .single();

    if (txError || !tx) {
      console.warn(`⚠️ [ncba/stk-result] Unknown transaction: ${transactionId}`);
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Idempotency: never re-process a terminal row
    if (tx.status === 'completed' || tx.status === 'failed') {
      console.log(`[ncba/stk-result] Already processed tx=${tx.id} status=${tx.status}`);
      return NextResponse.json({ success: true, status: tx.status, already_processed: true });
    }

    const now = new Date().toISOString();

    // Merge, don't replace — the deposit route already stored the rail and the
    // M-Pesa charge estimate on this row.
    const existingMetadata =
      tx.metadata && typeof tx.metadata === 'object' && !Array.isArray(tx.metadata)
        ? (tx.metadata as Record<string, unknown>)
        : {};

    if (outcome === 'success') {
      const { error: updateError } = await admin
        .from('transactions')
        .update({
          status: 'completed',
          completed_at: now,
          updated_at: now,
          provider_ref: ncbaTransactionId ?? undefined,
          mpesa_transaction_id: ncbaTransactionId ?? undefined,
          metadata: {
            ...existingMetadata,
            rail: 'ncba_stk',
            cost_bearer: 'customer',
            ncba_transaction_id: ncbaTransactionId,
            confirmed_via: 'stk-push/query',
            attempts,
          },
        })
        .eq('id', tx.id)
        .neq('status', 'completed'); // CRITICAL: double-credit guard

      if (updateError) {
        console.error('❌ [ncba/stk-result] Failed to complete transaction:', updateError);
        return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
      }

      await logSecurityEvent(
        {
          userId: tx.user_id,
          eventType: 'deposit_completed',
          severity: 'info',
          metadata: {
            rail: 'ncba_stk',
            ncbaTransactionId,
            amount: tx.amount,
            attempts,
          },
        },
        admin
      );

      console.log(
        `✅ NCBA STK deposit completed — tx=${tx.id} ncbaRef=${ncbaTransactionId} amount=${tx.amount}`
      );

      return NextResponse.json({ success: true, status: 'completed' });
    }

    const errorMessage =
      outcome === 'timeout'
        ? 'STK timeout — no confirmation from NCBA'
        : `NCBA: ${description || 'payment failed'}`;

    const { error: updateError } = await admin
      .from('transactions')
      .update({
        status: 'failed',
        error_message: errorMessage,
        updated_at: now,
        provider_ref: ncbaTransactionId ?? undefined,
        metadata: { ...existingMetadata, outcome, attempts },
      })
      .eq('id', tx.id)
      .neq('status', 'completed'); // CRITICAL: never overwrite a credited row

    if (updateError) {
      console.error('❌ [ncba/stk-result] Failed to fail transaction:', updateError);
      return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
    }

    await logSecurityEvent(
      {
        userId: tx.user_id,
        eventType: 'deposit_failed',
        severity: 'warning',
        metadata: {
          rail: 'ncba_stk',
          ncbaTransactionId,
          outcome,
          description,
          attempts,
        },
      },
      admin
    );

    console.log(`❌ NCBA STK deposit ${outcome} — tx=${tx.id} desc=${description ?? 'n/a'}`);

    return NextResponse.json({ success: true, status: 'failed' });
  } catch (err: any) {
    console.error('❌ [ncba/stk-result] error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err?.message },
      { status: 500 }
    );
  }
}
