import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';

// Admin-only transaction cost & revenue breakdown endpoint.
// Calls get_revenue_summary() and get_revenue_totals() RPCs defined in migration 021.
// Guarded by the shared admin allowlist; uses the service role client to bypass RLS.
export async function GET(request: NextRequest) {
  // 1. Authenticate via browser session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 2. Admin gate — shared allowlist (lib/admin.ts)
  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 3. Parse query params
  const url = new URL(request.url);
  const period = url.searchParams.get('period') || '30d';

  const now = new Date();
  let start: Date;
  switch (period) {
    case '7d':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
    default:
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
  }

  // Allow explicit ISO overrides
  const startParam = url.searchParams.get('start');
  const endParam = url.searchParams.get('end');
  if (startParam) start = new Date(startParam);
  const end = endParam ? new Date(endParam) : now;

  // 4. Fetch via service client (bypasses RLS)
  const admin = createServiceClient();

  const [summaryResult, totalsResult] = await Promise.all([
    admin.rpc('get_revenue_summary', {
      p_start: start.toISOString(),
      p_end: end.toISOString(),
    }),
    admin.rpc('get_revenue_totals', {
      p_start: start.toISOString(),
      p_end: end.toISOString(),
    }),
  ]);

  if (summaryResult.error) {
    console.error('❌ get_revenue_summary error:', summaryResult.error);
    return NextResponse.json({ error: summaryResult.error.message }, { status: 500 });
  }
  if (totalsResult.error) {
    console.error('❌ get_revenue_totals error:', totalsResult.error);
    return NextResponse.json({ error: totalsResult.error.message }, { status: 500 });
  }

  // 5. Return structured response
  return NextResponse.json({
    period,
    date_range: { start: start.toISOString(), end: end.toISOString() },
    summary: summaryResult.data ?? [],
    totals: totalsResult.data?.[0] ?? {
      total_volume: 0,
      total_revenue: 0,
      total_cost: 0,
      total_net_margin: 0,
      total_transactions: 0,
    },
  });
}
