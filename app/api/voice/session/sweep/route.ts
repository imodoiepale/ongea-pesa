import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { PLATFORM_FEE_RATE, platformFee } from '@/lib/transaction-fees';
import { getPlatformFeeRate } from '@/lib/services/platformSettings';
import { VOICE_RATE_PER_MINUTE, voiceUsageCharge } from '@/lib/voice-funding';
import { ONGEA_ENV } from '@/lib/environment'

// Stranded voice session sweeper — backstop for a killed tab.
//
// settleVoiceSession() in contexts/ElevenLabsContext.tsx fires on disconnect and
// on the wallet-budget timer, but a hard tab kill or a backgrounded mobile PWA
// never runs it. The session then sits 'active' past its expiry, unbilled, and
// the wallet is never debited. 27 such rows existed before this was written.
//
// Secret-gated and scheduled, same as app/api/ncba/stk-sweep/route.ts.
//
// The billing rule matters more than the sweeping does. A voice_sessions row can
// carry a timestamp we cannot trust — migration 028 backfilled started_at with
// now() across historical rows, which would have measured ~50 hours per session
// and charged KSh 59,854 each. So this route refuses to bill whenever the
// timestamps are not self-consistent, and expires the session at zero instead.
// A refusal costs us a few shillings of revenue; an overcharge costs a customer.

const MAX_SESSION_MINUTES = 15; // matches voice_sessions.expires_at (now() + 15 min)
const MAX_SESSION_SECONDS = MAX_SESSION_MINUTES * 60;

interface SessionRow {
  id: string;
  user_id: string;
  created_at: string;
  started_at: string | null;
  expires_at: string | null;
  usage_transaction_id: string | null;
}

function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * How long this session can be billed for, or null when the timestamps cannot
 * be trusted. Returning null is always safe; guessing is not.
 */
export function billableSeconds(row: SessionRow, now: Date): { seconds: number } | { refuse: string } {
  if (!row.started_at) return { refuse: 'no started_at' };

  const started = new Date(row.started_at).getTime();
  const created = new Date(row.created_at).getTime();
  const expires = row.expires_at ? new Date(row.expires_at).getTime() : null;

  if (!Number.isFinite(started) || !Number.isFinite(created)) {
    return { refuse: 'unparseable timestamps' };
  }
  // A session cannot start after it expires.
  if (expires !== null && started > expires) {
    return { refuse: 'started_at is after expires_at' };
  }
  // A session cannot start before the row that represents it existed. This is
  // the signature of a backfilled column.
  if (started < created - 1000) {
    return { refuse: 'started_at precedes created_at (backfill artifact)' };
  }

  const ceiling = Math.min(now.getTime(), expires ?? now.getTime());
  const seconds = Math.round((ceiling - started) / 1000);

  if (seconds <= 0) return { refuse: 'non-positive duration' };
  // Cannot exceed the window the session was ever allowed to run for.
  if (seconds > MAX_SESSION_SECONDS) {
    return { refuse: `duration ${seconds}s exceeds the ${MAX_SESSION_SECONDS}s ceiling` };
  }

  return { seconds };
}

async function sweep() {
  const admin = createServiceClient();
  const now = new Date();

  const { data: rows, error: selectError } = await admin
    .from('voice_sessions')
    .select('id, user_id, created_at, started_at, expires_at, usage_transaction_id')
    .eq('status', 'active')
    .lt('expires_at', now.toISOString())
    .limit(500);

  if (selectError) {
    throw new Error(`Failed to query stranded sessions: ${selectError.message}`);
  }
  if (!rows || rows.length === 0) {
    return { swept: 0, billed: 0, refused: 0, charged_total: 0 };
  }

  let billed = 0;
  let refused = 0;
  let chargedTotal = 0;

  for (const row of rows as SessionRow[]) {
    // Never touch a session that already produced a charge.
    if (row.usage_transaction_id) continue;

    const verdict = billableSeconds(row, now);

    if ('refuse' in verdict) {
      refused++;
      await admin
        .from('voice_sessions')
        .update({
          status: 'expired',
          ended_at: row.expires_at ?? now.toISOString(),
          duration_seconds: 0,
          billing_error: `Not billed (${verdict.refuse}). Expired at zero rather than charged.`,
        })
        .eq('id', row.id)
        .eq('status', 'active');
      continue;
    }

    // Cap the charge at what the wallet can cover, mirroring the settle
    // endpoint so the sweeper cannot drive a balance negative.
    const { data: profile } = await admin
      .from('profiles')
      .select('wallet_balance')
      .eq('id', row.user_id)
      .single();

    const available = Math.max(0, Number(profile?.wallet_balance ?? 0));
    const requested = voiceUsageCharge(verdict.seconds);
    const maximum = Math.floor((available / (1 + PLATFORM_FEE_RATE)) * 100) / 100;
    const usageAmount = Math.min(requested, maximum);

    // Compare-and-swap: only settle a session still 'active', so a concurrent
    // settle from the client cannot double-bill.
    const { data: reserved, error: reserveError } = await admin
      .from('voice_sessions')
      .update({
        status: 'completed',
        ended_at: row.expires_at ?? now.toISOString(),
        duration_seconds: verdict.seconds,
        billed_minutes: verdict.seconds / 60,
        rate_per_minute: VOICE_RATE_PER_MINUTE,
        billing_error:
          usageAmount < requested ? 'Sweeper charge limited by available wallet balance' : null,
      })
      .eq('id', row.id)
      .eq('status', 'active')
      .select('id')
      .maybeSingle();

    if (reserveError) {
      console.error(`❌ [voice/sweep] reservation failed for ${row.id}:`, reserveError);
      continue;
    }
    if (!reserved) continue; // someone else settled it first

    if (usageAmount <= 0) {
      billed++;
      continue;
    }

    const fee = platformFee(usageAmount, 'voice_usage', await getPlatformFeeRate());
    const { data: tx, error: txError } = await admin
      .from('transactions')
      .insert({
        user_id: row.user_id,
        environment: ONGEA_ENV,
        type: 'voice_usage',
        amount: usageAmount,
        platform_fee: fee,
        transaction_cost: 0,
        net_amount: usageAmount,
        status: 'completed',
        description: 'Ongea Pesa voice usage (swept)',
        voice_command_text: `Voice usage for ${verdict.seconds} seconds`,
        metadata: {
          purpose: 'voice_usage',
          voice_session_id: row.id,
          duration_seconds: verdict.seconds,
          billed_minutes: verdict.seconds / 60,
          rate_per_minute: VOICE_RATE_PER_MINUTE,
          billing_basis: 'per_second',
          settled_by: 'sweeper',
        },
        completed_at: now.toISOString(),
      })
      .select('id')
      .single();

    if (txError || !tx) {
      console.error(`❌ [voice/sweep] charge insert failed for ${row.id}:`, txError);
      await admin
        .from('voice_sessions')
        .update({ status: 'active', billing_error: txError?.message ?? 'Sweeper billing failed' })
        .eq('id', row.id);
      continue;
    }

    await admin.from('voice_sessions').update({ usage_transaction_id: tx.id }).eq('id', row.id);
    billed++;
    chargedTotal += usageAmount + fee;
  }

  console.log(
    `🧹 [voice/sweep] ${rows.length} stranded session(s): ${billed} billed, ${refused} refused, KSh ${chargedTotal.toFixed(2)} charged`,
  );

  return { swept: rows.length, billed, refused, charged_total: Math.round(chargedTotal * 100) / 100 };
}

export async function POST(request: NextRequest) {
  try {
    const expectedSecret = process.env.N8N_CALLBACK_SECRET;
    if (!expectedSecret) {
      console.error('❌ [voice/sweep] N8N_CALLBACK_SECRET is not set — refusing request');
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    if (!secretMatches(request.headers.get('x-ongea-secret'), expectedSecret)) {
      console.warn('⚠️ [voice/sweep] Rejected request with bad or missing secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await sweep();
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error('❌ [voice/sweep] error:', err);
    return NextResponse.json({ error: 'Internal server error', details: err?.message }, { status: 500 });
  }
}
