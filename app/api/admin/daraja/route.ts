import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import { accountBalance, transactionStatus, pullTransactions } from '@/lib/daraja/client';

// Admin-only trigger for Daraja org queries on DARAJA_SHORTCODE.
// POST {action:'balance'} | {action:'status', transactionId} | {action:'pull', start, end, offset?}
// GET  -> latest stored results (balance/status answers arrive async via /api/pay/daraja/result).
async function isAdmin() {
  const { data: { user } } = await (await createClient()).auth.getUser();
  return isAdminEmail(user?.email);
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { data, error } = await createServiceClient()
    .from('daraja_results')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ results: data });
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  try {
    if (body.action === 'balance') return NextResponse.json(await accountBalance());
    if (body.action === 'status' && body.transactionId)
      return NextResponse.json(await transactionStatus(String(body.transactionId)));
    if (body.action === 'pull' && body.start && body.end)
      return NextResponse.json(await pullTransactions(body.start, body.end, Number(body.offset) || 0));
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
