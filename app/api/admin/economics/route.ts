import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';

// Admin-only platform economics endpoint — the single answer to "what are we earning".
//
// Everything comes from the RPCs over v_transaction_economics (migration
// 20260806120000_revenue_truth_layer), so this agrees by construction with
// /api/admin/transaction-costs and /api/admin/overview. Nothing is recomputed here.
//
// Guarded by the shared admin allowlist; uses the service role client to bypass RLS.

const PERIOD_DAYS: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };

/**
 * Provider costs are currently never persisted: transaction_cost is 0 on every
 * completed row, because the rows are written by n8n and the app-side rail
 * implementation that would set providerFee (WalletService.resolveRailAndSend)
 * is dead code. Reported margin is therefore gross of NCBA/Safaricom charges.
 * Surfaced in the response so the dashboard can say so rather than implying 100%.
 */
function costCaptureWarning(totals: { total_cost?: number; total_transactions?: number }) {
  const cost = Number(totals?.total_cost ?? 0);
  const count = Number(totals?.total_transactions ?? 0);
  if (count > 0 && cost === 0) {
    return 'No provider cost is recorded on any transaction in this period, so net margin is gross of NCBA/Safaricom charges. Rows written by n8n do not set transaction_cost.';
  }
  return null;
}

/**
 * No cost_events at all means the margin figures above are revenue, not profit.
 * Say so rather than letting an empty table read as "we spend nothing".
 */
function infraCostWarning(costs: unknown[] | null) {
  if (!costs || costs.length === 0) {
    return 'No infrastructure cost has been recorded for this period, so margin here is gross of Fish Audio, LiveKit and GPU spend. The voice worker reports cost via POST /api/costs/record.';
  }
  return null;
}

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
  // Defaults to live. Test data is opt-in to look at, never the default view.
  const environment = url.searchParams.get('environment') === 'test' ? 'test' : 'live';
  const now = new Date();
  const days = PERIOD_DAYS[period] ?? PERIOD_DAYS['30d'];

  let start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const startParam = url.searchParams.get('start');
  const endParam = url.searchParams.get('end');
  if (startParam) start = new Date(startParam);
  const end = endParam ? new Date(endParam) : now;

  // 4. Fetch via service client (bypasses RLS)
  const admin = createServiceClient();
  const p_start = start.toISOString();
  const p_end = end.toISOString();

  const [totalsResult, summaryResult, usersResult, snapshotResult, costResult, voiceUnitResult] = await Promise.all([
    admin.rpc('get_revenue_totals', { p_start, p_end, p_environment: environment }),
    admin.rpc('get_revenue_summary', { p_start, p_end, p_environment: environment }),
    admin.rpc('get_user_economics', { p_start, p_end, p_environment: environment }),
    // Latest pocket snapshot per user, if the sweeper has run. Absent snapshots
    // are not an error — the table is populated on a schedule.
    admin
      .from('pocket_balance_snapshots')
      .select('user_id,gate_name,gate_balance,pocket_balance,captured_at')
      .order('captured_at', { ascending: false })
      .limit(2000),
    admin.rpc('get_cost_totals', { p_start, p_end, p_environment: environment }),
    admin.rpc('get_voice_unit_economics', { p_start, p_end, p_environment: environment }),
  ]);

  for (const [label, result] of [
    ['get_revenue_totals', totalsResult],
    ['get_revenue_summary', summaryResult],
    ['get_user_economics', usersResult],
    ['get_cost_totals', costResult],
    ['get_voice_unit_economics', voiceUnitResult],
  ] as const) {
    if (result.error) {
      console.error(`❌ ${label} error:`, result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
  }

  const totals = totalsResult.data?.[0] ?? {
    total_volume: 0,
    total_payment_volume: 0,
    total_revenue: 0,
    total_cost: 0,
    total_customer_borne_cost: 0,
    total_net_margin: 0,
    total_transactions: 0,
    fee_revenue: 0,
    voice_revenue: 0,
    subscription_revenue: 0,
  };

  // Collapse snapshots to the most recent row per user (already ordered desc).
  const latestPocket = new Map<string, { gate_balance: number; pocket_balance: number; captured_at: string }>();
  for (const row of snapshotResult.data ?? []) {
    if (!latestPocket.has(row.user_id)) {
      latestPocket.set(row.user_id, {
        gate_balance: Number(row.gate_balance ?? 0),
        pocket_balance: Number(row.pocket_balance ?? 0),
        captured_at: row.captured_at,
      });
    }
  }

  const users = (usersResult.data ?? []).map((u: Record<string, unknown>) => ({
    ...u,
    pocket: latestPocket.get(u.user_id as string) ?? null,
  }));

  // 5. Return structured response
  return NextResponse.json({
    period,
    environment,
    date_range: { start: p_start, end: p_end },
    totals,
    by_day: summaryResult.data ?? [],
    users,
    infra_costs: costResult.data ?? [],
    voice_unit: voiceUnitResult.data?.[0] ?? null,
    warnings: [costCaptureWarning(totals), infraCostWarning(costResult.data)].filter(Boolean),
  });
}
