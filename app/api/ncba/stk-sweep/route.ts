import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';

// Stale NCBA STK deposit sweeper — backstop for the n8n poll loop.
// If n8n dies mid-poll, a deposit can be stranded in 'processing' forever and the
// client polls until it gives up. This flips anything older than STALE_AFTER_MINUTES
// to 'failed' so the row reaches a terminal state.
//
// Never credits: only 'processing' -> 'failed', guarded with .neq('status','completed').
// Called on a schedule (n8n Schedule Trigger or a platform cron), secret-gated.

const STALE_AFTER_MINUTES = 15;

function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function sweep() {
  const admin = createServiceClient();
  const cutoff = new Date(Date.now() - STALE_AFTER_MINUTES * 60_000).toISOString();

  const { data: stale, error: selectError } = await admin
    .from('transactions')
    .select('id, user_id, amount, created_at')
    .eq('status', 'processing')
    .eq('provider', 'ncba_stk')
    .eq('type', 'deposit')
    .lt('created_at', cutoff);

  if (selectError) {
    throw new Error(`Failed to query stale transactions: ${selectError.message}`);
  }

  if (!stale || stale.length === 0) {
    return { swept: 0, transaction_ids: [] as string[] };
  }

  const ids = stale.map((tx) => tx.id);

  const { error: updateError } = await admin
    .from('transactions')
    .update({
      status: 'failed',
      error_message: 'STK timeout (stale sweep)',
      updated_at: new Date().toISOString(),
    })
    .in('id', ids)
    .neq('status', 'completed'); // CRITICAL: never touch a credited row

  if (updateError) {
    throw new Error(`Failed to fail stale transactions: ${updateError.message}`);
  }

  console.log(`🧹 Swept ${ids.length} stale NCBA STK deposit(s): ${ids.join(', ')}`);

  return { swept: ids.length, transaction_ids: ids };
}

export async function POST(request: NextRequest) {
  try {
    const expectedSecret = process.env.N8N_CALLBACK_SECRET;
    if (!expectedSecret) {
      console.error('❌ [ncba/stk-sweep] N8N_CALLBACK_SECRET is not set — refusing request');
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    if (!secretMatches(request.headers.get('x-ongea-secret'), expectedSecret)) {
      console.warn('⚠️ [ncba/stk-sweep] Rejected request with bad or missing secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await sweep();
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('❌ [ncba/stk-sweep] error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err?.message },
      { status: 500 }
    );
  }
}
