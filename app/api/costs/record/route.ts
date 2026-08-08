import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { ONGEA_ENV } from '@/lib/environment';

// Records infrastructure spend against a reference (a voice session, a model
// version). Called by the LiveKit worker and the RunPod training pipeline, both
// of which run outside this app — so it is secret-gated exactly like
// app/api/ncba/stk-sweep/route.ts rather than session-authenticated.
//
// Writes are idempotent: uq_cost_events_ref_category means the same
// (reference, provider, category) can only be recorded once, so a worker retry
// after a network blip cannot double-count a session's TTS spend.

// Only used when the caller sends amount_usd without amount_kes. Deliberately
// overridable per request: a stale hardcoded rate quietly distorts margin, so
// the worker should send the rate it actually paid at when it knows it.
const DEFAULT_USD_TO_KES = Number(process.env.USD_TO_KES_RATE ?? 129);

const recordCost = z.object({
  provider: z.enum(['fish_audio', 'elevenlabs', 'livekit', 'runpod', 'resend', 'openai', 'other']),
  category: z.string().trim().min(1).max(60),
  quantity: z.coerce.number().nonnegative().default(0),
  unit: z.string().trim().min(1).max(30),
  unit_cost_usd: z.coerce.number().nonnegative().optional(),
  amount_usd: z.coerce.number().nonnegative().optional(),
  amount_kes: z.coerce.number().nonnegative().optional(),
  usd_to_kes: z.coerce.number().positive().optional(),
  reference_type: z.string().trim().max(40).optional(),
  reference_id: z.string().trim().max(120).optional(),
  user_id: z.string().uuid().optional(),
  environment: z.enum(['test', 'live']).optional(),
  occurred_at: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.N8N_CALLBACK_SECRET;
  if (!expectedSecret) {
    console.error('❌ [costs/record] N8N_CALLBACK_SECRET is not set — refusing request');
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }
  if (!secretMatches(request.headers.get('x-ongea-secret'), expectedSecret)) {
    console.warn('⚠️ [costs/record] Rejected request with bad or missing secret');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = recordCost.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid cost event', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const body = parsed.data;

  // Derive whichever currency was not supplied. If neither was, fall back to
  // quantity * unit_cost_usd so a caller can just report usage.
  const rate = body.usd_to_kes ?? DEFAULT_USD_TO_KES;
  let amountUsd = body.amount_usd;
  if (amountUsd === undefined && body.unit_cost_usd !== undefined) {
    amountUsd = body.quantity * body.unit_cost_usd;
  }
  if (amountUsd === undefined && body.amount_kes !== undefined) {
    amountUsd = body.amount_kes / rate;
  }
  amountUsd = amountUsd ?? 0;
  const amountKes = body.amount_kes ?? amountUsd * rate;

  const admin = createServiceClient();
  const { data, error } = await admin
    .from('cost_events')
    .upsert(
      {
        provider: body.provider,
        category: body.category,
        quantity: body.quantity,
        unit: body.unit,
        unit_cost_usd: body.unit_cost_usd ?? null,
        amount_usd: Math.round(amountUsd * 1e6) / 1e6,
        amount_kes: Math.round(amountKes * 100) / 100,
        reference_type: body.reference_type ?? null,
        reference_id: body.reference_id ?? null,
        user_id: body.user_id ?? null,
        // The worker knows its own environment; fall back to this deployment's.
        environment: body.environment ?? ONGEA_ENV,
        metadata: { ...(body.metadata ?? {}), usd_to_kes: rate },
        occurred_at: body.occurred_at ?? new Date().toISOString(),
      },
      { onConflict: 'reference_type,reference_id,provider,category', ignoreDuplicates: true },
    )
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('❌ [costs/record] insert failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // maybeSingle() returns null when the unique index suppressed a duplicate —
  // that is a success, not a failure.
  return NextResponse.json({ ok: true, id: data?.id ?? null, duplicate: !data });
}
