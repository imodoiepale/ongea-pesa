"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import Layout from "@/components/kokonutui/layout"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { VOICE_RATE_PER_MINUTE } from "@/lib/voice-funding"
import {
  AlertTriangle,
  ArrowDownToLine,
  Coins,
  Download,
  Mic,
  Percent,
  RefreshCw,
  Search,
  TrendingUp,
  Wallet,
} from "lucide-react"

/**
 * Platform economics — deposits, transaction costs, and what Ongea Pesa earns.
 *
 * Every figure comes from /api/admin/economics, which reads the RPCs over
 * v_transaction_economics. Nothing is recomputed in the browser: the old
 * `platform_fee > 0 ? persisted : amount * 0.005` pattern silently re-charged
 * genuinely free transactions in every report, so it is deliberately absent here.
 */

interface Totals {
  total_volume: number
  total_payment_volume: number
  total_revenue: number
  total_cost: number
  total_customer_borne_cost: number
  total_net_margin: number
  total_transactions: number
  fee_revenue: number
  voice_revenue: number
  subscription_revenue: number
}

interface DayRow {
  bucket_date: string
  transaction_type: string
  tx_count: number
  gross_volume: number
  payment_volume: number
  platform_revenue: number
  safaricom_cost: number
  customer_borne_cost: number
  net_margin: number
}

interface UserRow {
  user_id: string
  email: string | null
  full_name: string | null
  wallet_balance: number
  deposit_count: number
  deposits_total: number
  spend_total: number
  platform_revenue: number
  ongea_cost: number
  customer_borne_cost: number
  net_margin: number
  voice_revenue: number
  tx_count: number
  last_activity_at: string | null
  pocket: { gate_balance: number; pocket_balance: number; captured_at: string } | null
}

interface InfraCost {
  provider: string
  category: string
  events: number
  quantity: number
  unit: string
  amount_usd: number
  amount_kes: number
}

interface VoiceUnit {
  billed_minutes: number
  voice_revenue: number
  voice_cost_kes: number
  revenue_per_min: number | null
  cost_per_min: number | null
  margin_per_min: number | null
  sessions: number
}

const PERIODS = ["7d", "30d", "90d", "1y"] as const
type Period = (typeof PERIODS)[number]

const num = (v: unknown) => Number(v ?? 0)

type Environment = "live" | "test"

export default function EconomicsPage() {
  const [period, setPeriod] = useState<Period>("30d")
  // Live is the default view. Test figures are real-looking but meaningless,
  // so seeing them must always be a deliberate choice.
  const [environment, setEnvironment] = useState<Environment>("live")
  const [totals, setTotals] = useState<Totals | null>(null)
  const [byDay, setByDay] = useState<DayRow[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const [infraCosts, setInfraCosts] = useState<InfraCost[]>([])
  const [voiceUnit, setVoiceUnit] = useState<VoiceUnit | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const fetchEconomics = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/economics?period=${period}&environment=${environment}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to load economics")
      setTotals(json.totals)
      setByDay(json.by_day ?? [])
      setUsers(json.users ?? [])
      setInfraCosts(json.infra_costs ?? [])
      setVoiceUnit(json.voice_unit ?? null)
      setWarnings(json.warnings ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load economics")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEconomics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, environment])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 2 }).format(amount)

  // Collapse the per-type daily rows into one series per calendar day.
  const chartData = useMemo(() => {
    const byDate = new Map<string, { date: string; revenue: number; cost: number; margin: number; volume: number }>()
    for (const row of byDay) {
      const key = row.bucket_date
      const acc = byDate.get(key) ?? { date: key, revenue: 0, cost: 0, margin: 0, volume: 0 }
      acc.revenue += num(row.platform_revenue)
      acc.cost += num(row.safaricom_cost)
      acc.margin += num(row.net_margin)
      acc.volume += num(row.payment_volume)
      byDate.set(key, acc)
    }
    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [byDay])

  const revenueByType = useMemo(() => {
    const byType = new Map<string, number>()
    for (const row of byDay) {
      byType.set(row.transaction_type, (byType.get(row.transaction_type) ?? 0) + num(row.platform_revenue))
    }
    return Array.from(byType.entries())
      .map(([type, revenue]) => ({ type, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
  }, [byDay])

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users
    const q = searchTerm.toLowerCase()
    return users.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q) ||
        u.user_id.toLowerCase().includes(q),
    )
  }, [users, searchTerm])

  const exportCsv = () => {
    const header = [
      "email",
      "deposits_count",
      "deposits_total",
      "spend_total",
      "wallet_balance",
      "pocket_balance",
      "platform_revenue",
      "voice_revenue",
      "ongea_cost",
      "customer_borne_cost",
      "net_margin",
      "transactions",
    ]
    const rows = filteredUsers.map((u) => [
      u.email ?? u.user_id,
      u.deposit_count,
      num(u.deposits_total),
      num(u.spend_total),
      num(u.wallet_balance),
      u.pocket ? num(u.pocket.pocket_balance) : "",
      num(u.platform_revenue),
      num(u.voice_revenue),
      num(u.ongea_cost),
      num(u.customer_borne_cost),
      num(u.net_margin),
      u.tx_count,
    ])
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    const a = document.createElement("a")
    a.href = url
    a.download = `ongea-economics-${period}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const marginPct =
    totals && num(totals.total_revenue) > 0
      ? (num(totals.total_net_margin) / num(totals.total_revenue)) * 100
      : 0

  const cards = [
    {
      label: "Platform Revenue",
      value: formatCurrency(num(totals?.total_revenue)),
      icon: Coins,
      color: "text-brand",
    },
    {
      label: "Net Margin",
      value: formatCurrency(num(totals?.total_net_margin)),
      icon: TrendingUp,
      color: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Payment Volume",
      value: formatCurrency(num(totals?.total_payment_volume)),
      icon: Wallet,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Voice Revenue",
      value: formatCurrency(num(totals?.voice_revenue)),
      icon: Mic,
      color: "text-purple-600 dark:text-purple-400",
    },
    {
      label: "Ongea-Borne Cost",
      value: formatCurrency(num(totals?.total_cost)),
      icon: ArrowDownToLine,
      color: "text-orange-600 dark:text-orange-400",
    },
    {
      label: "Margin %",
      value: `${marginPct.toFixed(1)}%`,
      icon: Percent,
      color: "text-amber-600 dark:text-amber-400",
    },
  ]

  // The ported DepthMe glass surface: 145deg gradient, lit top edge via
  // inset 0 1px 0, and saturate() on the blur. See app/motion-system.css.
  const surface = "og-glass"

  return (
    <Layout>
      {/* og-screen-in gives the route change 4px of upward travel — pure opacity
          reads as a flicker. og-stagger then reveals each panel top-down. */}
      <div className="og-screen-in og-stagger space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Platform Economics</h1>
            <p className="text-xs text-muted-foreground">
              Deposits, transaction costs, and what Ongea Pesa earns
            </p>
          </div>
          <div className="flex gap-2">
            <div className="flex rounded-lg overflow-hidden border border-border/60">
              {(["live", "test"] as const).map((env) => (
                <button
                  key={env}
                  onClick={() => setEnvironment(env)}
                  className={cn(
                    "px-3 py-2 text-xs font-medium transition-colors duration-200",
                    environment === env
                      ? env === "test"
                        ? "bg-amber-500 text-white"
                        : "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:bg-muted/70",
                  )}
                >
                  {env === "live" ? "Live" : "Test"}
                </button>
              ))}
            </div>
            <div className="flex rounded-lg overflow-hidden border border-border/60">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "px-3 py-2 text-xs font-medium transition-colors duration-200",
                    period === p ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/70",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={fetchEconomics}
              disabled={loading}
              className={cn("p-2 rounded-lg", "bg-muted", "hover:bg-muted", "transition-colors duration-200")}
            >
              <RefreshCw className={cn("w-4 h-4 text-muted-foreground", loading && "animate-spin")} />
            </button>
            <button
              onClick={exportCsv}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg",
                "bg-foreground",
                "text-background",
                "text-xs font-medium",
                "hover:bg-foreground/90",
                "transition-colors duration-200",
              )}
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        </div>

        {/* An unmissable marker when test figures are on screen. Every number
            below is meaningless in this mode and must never be quoted as real. */}
        {environment === "test" && (
          <div className={cn("p-3 flex items-start gap-2", surface, "border-amber-500/60 bg-amber-500/10")}>
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
              Showing TEST data — pre-cutover and sandbox activity. These are not real earnings.
            </p>
          </div>
        )}

        {error && (
          <div className={cn("p-4", surface, "border-red-500/40")}>
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Data-quality warnings from the API — better to say the number is
            incomplete than to let a 100% margin read as real. */}
        {warnings.map((w) => (
          <div
            key={w}
            className={cn("p-3 flex items-start gap-2", surface, "border-amber-500/40 bg-amber-500/5")}
          >
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-xs text-amber-700 dark:text-amber-300">{w}</p>
          </div>
        ))}

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {cards.map((stat, i) => (
            <div key={i} className={cn("p-3", surface)}>
              <div className="flex items-center gap-2">
                <div className={cn("p-1.5 rounded-lg", "bg-muted")}>
                  <stat.icon className={cn("w-3.5 h-3.5", stat.color)} />
                </div>
                <div>
                  <p className={cn("text-sm font-semibold", stat.color)}>{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Revenue split by source */}
        <div className={cn("p-4", surface)}>
          <h2 className="text-sm font-semibold text-foreground mb-3">Revenue by source</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: "Transaction fees", value: num(totals?.fee_revenue) },
              { label: "Voice usage", value: num(totals?.voice_revenue) },
              { label: "Subscriptions", value: num(totals?.subscription_revenue) },
            ].map((s) => (
              <div key={s.label} className="p-3 rounded-lg bg-muted/30">
                <p className="text-sm font-semibold text-foreground">{formatCurrency(s.value)}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground">
            Customer-borne provider charges of {formatCurrency(num(totals?.total_customer_borne_cost))} are
            pass-through — the customer pays Safaricom directly, so they are neither revenue nor cost.
          </p>
        </div>

        {/* Voice unit economics — the question "is a voice minute profitable?" */}
        <div className={cn("p-4", surface)}>
          <h2 className="text-sm font-semibold text-foreground mb-1">Voice unit economics</h2>
          <p className="text-[10px] text-muted-foreground mb-3">
            Per billed minute. Excludes RunPod — GPU training is a fixed cost, not per-minute.
          </p>
          {!voiceUnit || num(voiceUnit.billed_minutes) === 0 ? (
            <p className="text-xs text-muted-foreground">
              No billed voice minutes in this period, so there is nothing to divide by yet.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Billed minutes", value: num(voiceUnit.billed_minutes).toFixed(1), tone: "text-foreground" },
                  {
                    label: "Revenue / min",
                    value: voiceUnit.revenue_per_min === null ? "—" : formatCurrency(num(voiceUnit.revenue_per_min)),
                    tone: "text-brand",
                  },
                  {
                    label: "Cost / min",
                    value: voiceUnit.cost_per_min === null ? "—" : formatCurrency(num(voiceUnit.cost_per_min)),
                    tone: "text-orange-600 dark:text-orange-400",
                  },
                  {
                    label: "Margin / min",
                    value: voiceUnit.margin_per_min === null ? "—" : formatCurrency(num(voiceUnit.margin_per_min)),
                    tone:
                      num(voiceUnit.margin_per_min) < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-emerald-600 dark:text-emerald-400",
                  },
                ].map((s) => (
                  <div key={s.label} className="p-3 rounded-lg bg-muted/30">
                    <p className={cn("text-sm font-semibold", s.tone)}>{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              {num(voiceUnit.margin_per_min) < 0 && (
                <p className="mt-3 text-[11px] font-medium text-red-600 dark:text-red-400">
                  Voice is losing money per minute at the current KSh {VOICE_RATE_PER_MINUTE}/min price.
                </p>
              )}
            </>
          )}
        </div>

        {/* Infrastructure spend by provider */}
        <div className={cn("overflow-hidden", surface)}>
          <div className="p-4 border-b border-border/40">
            <h2 className="text-sm font-semibold text-foreground">Infrastructure spend</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Reported by the voice worker and training pipeline via /api/costs/record
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/30 border-b border-border/60">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Provider</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Category</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Usage</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">USD</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">KES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {infraCosts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                      Nothing recorded yet
                    </td>
                  </tr>
                ) : (
                  infraCosts.map((c) => (
                    <tr key={`${c.provider}-${c.category}`} className="hover:bg-muted/50 transition-colors">
                      <td className="px-3 py-2 font-medium text-foreground">{c.provider}</td>
                      <td className="px-3 py-2 text-muted-foreground">{c.category}</td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                        {num(c.quantity).toLocaleString()} {c.unit}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">${num(c.amount_usd).toFixed(4)}</td>
                      <td className="px-3 py-2 text-right font-mono text-orange-600 dark:text-orange-400">
                        {formatCurrency(num(c.amount_kes))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trend */}
        <div className={cn("p-4", surface)}>
          <h2 className="text-sm font-semibold text-foreground mb-3">Revenue, cost & margin over time</h2>
          <div className="h-64">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                {loading ? "Loading…" : "No completed transactions in this period"}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(v: number) => formatCurrency(Number(v))}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="cost" name="Ongea cost" stroke="#f97316" fill="#f97316" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="margin" name="Net margin" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Revenue by transaction type */}
        <div className={cn("p-4", surface)}>
          <h2 className="text-sm font-semibold text-foreground mb-3">Revenue by transaction type</h2>
          <div className="h-56">
            {revenueByType.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                {loading ? "Loading…" : "Nothing to show"}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByType} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="type" tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(v: number) => formatCurrency(Number(v))}
                  />
                  <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Search */}
        <div className={cn("p-4", surface)}>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email or name…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-muted/30 border-border/60"
            />
          </div>
        </div>

        {/* Per-user economics */}
        <div className={cn("overflow-hidden", surface)}>
          <div className="p-4 border-b border-border/40">
            <h2 className="text-sm font-semibold text-foreground">
              Per-user deposits & earnings ({filteredUsers.length})
            </h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Pocket balance comes from the latest snapshot; blank until the sweeper has run.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/30 border-b border-border/60">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">User</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Deposits</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Deposited</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Spent</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Wallet</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Pocket</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Revenue</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Voice</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Cost</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Margin</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Txns</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-8 text-center">
                      <RefreshCw className="w-4 h-4 mx-auto animate-spin text-muted-foreground" />
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.user_id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-3 py-2">
                        <p className="font-medium text-foreground">{u.full_name || u.email || "—"}</p>
                        {u.full_name && u.email && (
                          <p className="text-[10px] text-muted-foreground">{u.email}</p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{u.deposit_count}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatCurrency(num(u.deposits_total))}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatCurrency(num(u.spend_total))}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatCurrency(num(u.wallet_balance))}</td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                        {u.pocket ? formatCurrency(num(u.pocket.pocket_balance)) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-brand">
                        {formatCurrency(num(u.platform_revenue))}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-purple-600 dark:text-purple-400">
                        {formatCurrency(num(u.voice_revenue))}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-orange-600 dark:text-orange-400">
                        {formatCurrency(num(u.ongea_cost))}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(num(u.net_margin))}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{u.tx_count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}
