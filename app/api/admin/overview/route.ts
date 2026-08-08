import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';

// Admin overview — the single data source for the /admin dashboard.
// Returns current-vs-previous-period aggregates so the client renders
// deltas without issuing two requests. Guarded by the shared admin
// allowlist (lib/admin.ts); reads via the service role client.

// Revenue/cost classification must match public.v_transaction_economics exactly
// (migration 20260806120000_revenue_truth_layer), or this endpoint and
// /api/admin/economics report different margins for the same period — which is
// precisely what they used to do.
//
// Rows where the amount IS the product, rather than a transfer we take a cut of.
const PRODUCT_TYPES = new Set(['voice_usage', 'platform_fee', 'subscription']);

type RangeKey = 'today' | '7d' | '30d' | '90d' | 'mtd' | 'ytd' | 'all';

interface TxRow {
  user_id: string;
  type: string;
  amount: number | string;
  status: string;
  created_at: string;
  platform_fee: number | string | null;
  transaction_cost: number | string | null;
  voice_verified: boolean | null;
  error_message: string | null;
  phone: string | null;
  metadata: { cost_bearer?: string; fee_waived?: string } | null;
}

function resolveWindow(range: RangeKey, now: Date): { start: Date | null; prevStart: Date | null } {
  const day = 24 * 60 * 60 * 1000;
  switch (range) {
    case 'today': {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      return { start, prevStart: new Date(start.getTime() - day) };
    }
    case '7d': return { start: new Date(now.getTime() - 7 * day), prevStart: new Date(now.getTime() - 14 * day) };
    case '90d': return { start: new Date(now.getTime() - 90 * day), prevStart: new Date(now.getTime() - 180 * day) };
    case 'mtd': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, prevStart: new Date(now.getFullYear(), now.getMonth() - 1, 1) };
    }
    case 'ytd': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start, prevStart: new Date(now.getFullYear() - 1, 0, 1) };
    }
    case 'all': return { start: null, prevStart: null };
    case '30d':
    default: return { start: new Date(now.getTime() - 30 * day), prevStart: new Date(now.getTime() - 60 * day) };
  }
}

// Bucket granularity scales with span so the series stays readable.
function bucketKey(iso: string, granularity: 'hour' | 'day' | 'week'): string {
  const d = new Date(iso);
  if (granularity === 'hour') {
    return `${d.toISOString().slice(0, 13)}:00`;
  }
  if (granularity === 'week') {
    const monday = new Date(d);
    const dow = (monday.getUTCDay() + 6) % 7;
    monday.setUTCDate(monday.getUTCDate() - dow);
    return monday.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

// platform_fee is authoritative. The old `persisted > 0 ? persisted : amount * 0.005`
// fallback could not tell a deliberately waived fee from a missing one, so every
// free transaction was silently re-charged 0.5% in the report.
function platformRevenue(tx: TxRow, amount: number): number {
  const persisted = parseFloat(String(tx.platform_fee ?? 0)) || 0;
  return persisted + (PRODUCT_TYPES.has(tx.type) ? amount : 0);
}

// Only charges Ongea Pesa absorbs. Customer-borne provider fees are pass-through:
// the customer pays Safaricom directly and we never see the money.
function ongeaCost(tx: TxRow): number {
  if (tx.metadata?.cost_bearer === 'customer' || tx.type === 'deposit') return 0;
  return parseFloat(String(tx.transaction_cost ?? 0)) || 0;
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

function pctDelta(current: number, previous: number): number | null {
  if (!previous) return null;
  return round2(((current - previous) / previous) * 100);
}

function maskPhone(phone: string | null): string | null {
  if (!phone) return null;
  const p = phone.replace(/\s/g, '');
  if (p.length < 6) return '•••';
  return `${p.slice(0, 4)}•••${p.slice(-3)}`;
}

interface WindowStats {
  gross_volume: number;
  revenue: number;
  costs: number;
  net_revenue: number;
  take_rate: number;
  tx_count: number;
  attempts: number;
  failed_count: number;
  success_rate: number;
  active_users: number;
  avg_transaction: number;
  arpu: number;
  voice_share: number;
}

function aggregate(rows: TxRow[]): WindowStats {
  let volume = 0, revenue = 0, costs = 0, completed = 0, failed = 0, voice = 0;
  const users = new Set<string>();
  for (const tx of rows) {
    const amount = parseFloat(String(tx.amount)) || 0;
    if (tx.status === 'completed') {
      completed++;
      volume += amount;
      revenue += platformRevenue(tx, amount);
      costs += ongeaCost(tx);
      users.add(tx.user_id);
      if (tx.voice_verified) voice++;
    } else if (tx.status === 'failed' || tx.status === 'cancelled') {
      failed++;
    }
  }
  const attempts = completed + failed;
  return {
    gross_volume: round2(volume),
    revenue: round2(revenue),
    costs: round2(costs),
    net_revenue: round2(revenue - costs),
    take_rate: volume > 0 ? round2((revenue / volume) * 100) : 0,
    tx_count: completed,
    attempts,
    failed_count: failed,
    success_rate: attempts > 0 ? round2((completed / attempts) * 100) : 100,
    active_users: users.size,
    avg_transaction: completed > 0 ? round2(volume / completed) : 0,
    arpu: users.size > 0 ? round2(revenue / users.size) : 0,
    voice_share: completed > 0 ? round2((voice / completed) * 100) : 0,
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Forbidden', email: user.email }, { status: 403 });
    }

    const range = (request.nextUrl.searchParams.get('range') || '30d') as RangeKey;
    const now = new Date();
    const { start, prevStart } = resolveWindow(range, now);

    const admin = createServiceClient();

    // One fetch covers both windows (previous window feeds the deltas).
    let txQuery = admin
      .from('transactions')
      .select('user_id, type, amount, status, created_at, platform_fee, transaction_cost, voice_verified, error_message, phone, metadata')
      .order('created_at', { ascending: false })
      .limit(10000);
    if (prevStart) txQuery = txQuery.gte('created_at', prevStart.toISOString());
    const { data: txRows, error: txError } = await txQuery;
    if (txError) throw txError;

    const rows = (txRows ?? []) as TxRow[];
    const startMs = start?.getTime() ?? 0;
    const current = rows.filter((t) => new Date(t.created_at).getTime() >= startMs);
    const previous = start && prevStart
      ? rows.filter((t) => {
          const ms = new Date(t.created_at).getTime();
          return ms >= prevStart.getTime() && ms < startMs;
        })
      : [];

    const summary = aggregate(current);
    const prevSummary = previous.length ? aggregate(previous) : null;

    // ---- Time series (zero-filled buckets so the axis has no holes) ----
    const granularity: 'hour' | 'day' | 'week' =
      range === 'today' ? 'hour' : range === 'ytd' || range === 'all' ? 'week' : 'day';
    const stepMs = granularity === 'hour' ? 3600_000 : granularity === 'week' ? 7 * 86400_000 : 86400_000;
    const seriesStart = start ?? (current.length ? new Date(current[current.length - 1].created_at) : now);

    const buckets = new Map<string, { revenue: number; volume: number; completed: number; failed: number }>();
    for (let t = seriesStart.getTime(); t <= now.getTime(); t += stepMs) {
      buckets.set(bucketKey(new Date(t).toISOString(), granularity), { revenue: 0, volume: 0, completed: 0, failed: 0 });
    }
    for (const tx of current) {
      const key = bucketKey(tx.created_at, granularity);
      const b = buckets.get(key) ?? { revenue: 0, volume: 0, completed: 0, failed: 0 };
      const amount = parseFloat(String(tx.amount)) || 0;
      if (tx.status === 'completed') {
        b.revenue += platformRevenue(tx, amount);
        b.volume += amount;
        b.completed++;
      } else if (tx.status === 'failed' || tx.status === 'cancelled') {
        b.failed++;
      }
      buckets.set(key, b);
    }
    const series = [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([bucket, v]) => ({ bucket, revenue: round2(v.revenue), volume: round2(v.volume), completed: v.completed, failed: v.failed }));

    // ---- Rail mix ----
    const railMap = new Map<string, { count: number; volume: number; revenue: number; failed: number }>();
    for (const tx of current) {
      const r = railMap.get(tx.type) ?? { count: 0, volume: 0, revenue: 0, failed: 0 };
      const amount = parseFloat(String(tx.amount)) || 0;
      if (tx.status === 'completed') {
        r.count++;
        r.volume += amount;
        r.revenue += platformRevenue(tx, amount);
      } else if (tx.status === 'failed' || tx.status === 'cancelled') {
        r.failed++;
      }
      railMap.set(tx.type, r);
    }
    const by_rail = [...railMap.entries()]
      .map(([type, r]) => ({
        type,
        count: r.count,
        failed: r.failed,
        volume: round2(r.volume),
        revenue: round2(r.revenue),
        volume_share: summary.gross_volume > 0 ? round2((r.volume / summary.gross_volume) * 100) : 0,
      }))
      .sort((a, b) => b.volume - a.volume);

    // ---- Failure reasons ----
    const reasonMap = new Map<string, number>();
    for (const tx of current) {
      if (tx.status !== 'failed' && tx.status !== 'cancelled') continue;
      const reason = (tx.error_message || (tx.status === 'cancelled' ? 'Cancelled by user' : 'No error message recorded')).slice(0, 120);
      reasonMap.set(reason, (reasonMap.get(reason) ?? 0) + 1);
    }
    const failure_reasons = [...reasonMap.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // ---- Recent activity (masked PII) ----
    const recent = current.slice(0, 12).map((tx) => ({
      type: tx.type,
      amount: round2(parseFloat(String(tx.amount)) || 0),
      status: tx.status,
      created_at: tx.created_at,
      phone: maskPhone(tx.phone),
      voice: !!tx.voice_verified,
    }));

    // ---- User growth ----
    const { count: totalUsers } = await admin.from('profiles').select('id', { count: 'exact', head: true });
    let newUsers = 0;
    if (start) {
      const { count } = await admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', start.toISOString());
      newUsers = count ?? 0;
    } else {
      newUsers = totalUsers ?? 0;
    }

    return NextResponse.json({
      success: true,
      range: {
        key: range,
        granularity,
        start: (start ?? seriesStart).toISOString(),
        end: now.toISOString(),
        prev_start: prevStart?.toISOString() ?? null,
      },
      summary,
      deltas: prevSummary
        ? {
            gross_volume: pctDelta(summary.gross_volume, prevSummary.gross_volume),
            revenue: pctDelta(summary.revenue, prevSummary.revenue),
            net_revenue: pctDelta(summary.net_revenue, prevSummary.net_revenue),
            tx_count: pctDelta(summary.tx_count, prevSummary.tx_count),
            active_users: pctDelta(summary.active_users, prevSummary.active_users),
            avg_transaction: pctDelta(summary.avg_transaction, prevSummary.avg_transaction),
            arpu: pctDelta(summary.arpu, prevSummary.arpu),
            success_rate: prevSummary.attempts > 0 ? round2(summary.success_rate - prevSummary.success_rate) : null,
            voice_share: prevSummary.tx_count > 0 ? round2(summary.voice_share - prevSummary.voice_share) : null,
          }
        : null,
      series,
      by_rail,
      failure_reasons,
      recent,
      users: { total: totalUsers ?? 0, new_in_period: newUsers },
      generated_at: now.toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Admin overview error:', error);
    return NextResponse.json({ error: 'Failed to generate overview', message: error.message }, { status: 500 });
  }
}
