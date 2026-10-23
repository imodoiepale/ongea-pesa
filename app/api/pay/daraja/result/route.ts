import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// ResultURL/QueueTimeOutURL for async Daraja org-API calls (balance, status, pull).
// Stores every result in daraja_results; a failed insert returns 500 so Safaricom retries.
export async function POST(request: NextRequest) {
  const secret = process.env.C2B_CALLBACK_SECRET;
  if (!secret || request.nextUrl.searchParams.get('s') !== secret) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Rejected' }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const r = body?.Result ?? body ?? {};
  const params: Record<string, unknown> = {};
  for (const p of r?.ResultParameters?.ResultParameter ?? []) params[p.Key] = p.Value;

  const { error } = await createServiceClient()
    .from('daraja_results')
    .insert({
      kind: request.nextUrl.searchParams.get('kind') ?? 'unknown',
      conversation_id: r.ConversationID ?? null,
      originator_conversation_id: r.OriginatorConversationID ?? null,
      result_code: r.ResultCode !== undefined ? String(r.ResultCode) : null,
      result_desc: r.ResultDesc ?? null,
      params,
      raw: body,
    });
  if (error) {
    console.error('[daraja/result] insert failed', error);
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Retry' }, { status: 500 });
  }
  return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
}
