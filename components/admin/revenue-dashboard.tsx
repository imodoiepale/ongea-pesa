"use client"

/**
 * Admin Revenue & Operations dashboard.
 *
 * Data: /api/admin/overview (single request per range; server computes
 * current-vs-previous aggregates, zero-filled series, rail mix, failures).
 *
 * Viz rules (dataviz method): one hero figure per view; single-axis charts
 * only (revenue and activity are separate stacked panels, never dual-axis);
 * marks are thin (2px lines, ≤24px bars, 4px rounded data-ends); grid is
 * solid hairline; every chart has a table twin; status colors are reserved
 * for status. Palette validated with validate_palette.js on both surfaces.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts"
import {
  ArrowDownRight, ArrowUpRight, CheckCircle2, Download, ExternalLink,
  Mic, RefreshCw, ShieldAlert, SlashSquare, XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------- types

interface Summary {
  gross_volume: number; revenue: number; costs: number; net_revenue: number
  take_rate: number; tx_count: number; attempts: number; failed_count: number
  success_rate: number; active_users: number; avg_transaction: number
  arpu: number; voice_share: number
}
interface Overview {
  range: { key: string; granularity: "hour" | "day" | "week"; start: string; end: string; prev_start: string | null }
  summary: Summary
  deltas: Record<string, number | null> | null
  series: { bucket: string; revenue: number; volume: number; completed: number; failed: number }[]
  by_rail: { type: string; count: number; failed: number; volume: number; revenue: number; volume_share: number }[]
  failure_reasons: { reason: string; count: number }[]
  recent: { type: string; amount: number; status: string; created_at: string; phone: string | null; voice: boolean }[]
  users: { total: number; new_in_period: number }
  generated_at: string
}

// ------------------------------------------------------------- palette
// Categorical slot 1 (emerald, brand) + reserved status colors.
// Validated: light "#059669,#2a78d6,#eda100,#4a3aa7,#e87ba4" on #ffffff,
// dark "#0ea371,#3987e5,#c98500,#9085e9,#d55181" on #121212 — all checks pass.

const INK = (dark: boolean) => ({
  series1: dark ? "#0ea371" : "#059669",
  surface: dark ? "#121212" : "#ffffff",
  grid: dark ? "#2c2c2a" : "#e9e8e3",
  axis: dark ? "#898781" : "#898781",
  ink: dark ? "#ffffff" : "#0b0b0b",
  ink2: dark ? "#c3c2b7" : "#52514e",
  good: dark ? "#0ca30c" : "#006300",
  goodFill: "#0ca30c",
  warning: "#fab219",
  critical: "#d03b3b",
})

const RANGES = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "mtd", label: "MTD" },
  { key: "ytd", label: "YTD" },
  { key: "all", label: "All" },
] as const

const RAIL_LABELS: Record<string, string> = {
  deposit: "Deposits", withdraw: "Withdrawals", send_phone: "Send to phone",
  paybill: "PayBill", buy_goods_till: "Buy goods (Till)", buy_goods_pochi: "Pochi",
  bank_to_mpesa: "Bank to M-Pesa", qr: "QR payments", receive: "Received",
  chama_payout: "Chama payouts", internal: "In-app transfer",
}
const railLabel = (t: string) => RAIL_LABELS[t] ?? t.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())

// ------------------------------------------------------------- helpers

const nfFull = new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 })
const nfMoney = new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const nfCompact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 })

const kes = (n: number) => `KSh ${nfFull.format(n)}`
const kesExact = (n: number) => `KSh ${nfMoney.format(n)}`
const kesCompact = (n: number) => `KSh ${nfCompact.format(n)}`

function bucketLabel(bucket: string, granularity: "hour" | "day" | "week") {
  if (granularity === "hour") return bucket.slice(11, 16)
  const d = new Date(`${bucket}T00:00:00Z`)
  return d.toLocaleDateString("en-KE", { month: "short", day: "numeric", timeZone: "UTC" })
}

function useIsDark() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const el = document.documentElement
    const update = () => setDark(el.classList.contains("dark"))
    update()
    const observer = new MutationObserver(update)
    observer.observe(el, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])
  return dark
}

// --------------------------------------------------------- sub-blocks

function DeltaChip({ value, upIsGood = true, unit = "%", vs }: {
  value: number | null | undefined; upIsGood?: boolean; unit?: string; vs: string
}) {
  const dark = useIsDark()
  const c = INK(dark)
  if (value === null || value === undefined) {
    return <span className="text-xs text-muted-foreground">— vs {vs}</span>
  }
  const up = value >= 0
  const good = up === upIsGood
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: good ? c.good : c.critical }}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {up ? "+" : ""}{value.toLocaleString("en-KE", { maximumFractionDigits: 1 })}{unit}
      <span className="font-normal text-muted-foreground">vs {vs}</span>
    </span>
  )
}

function StatTile({ label, value, delta, upIsGood = true, unit, vs, hint }: {
  label: string; value: string; delta?: number | null; upIsGood?: boolean
  unit?: string; vs: string; hint?: string
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 flex flex-col gap-1.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold text-foreground leading-none">{value}</p>
      {delta !== undefined
        ? <DeltaChip value={delta} upIsGood={upIsGood} unit={unit} vs={vs} />
        : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

// Tooltip: values lead (strong), labels follow; series keyed by a short
// line of its color — never coloring the text itself.
function ChartTooltip({ active, payload, label, money }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-2 shadow-lg">
      <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="flex items-center gap-2 text-sm">
          <span className="inline-block h-0.5 w-3 rounded-full" style={{ background: entry.color }} aria-hidden />
          <span className="font-semibold text-foreground tabular-nums">
            {money ? kes(entry.value) : nfFull.format(entry.value)}
          </span>
          <span className="text-xs text-muted-foreground">{entry.name}</span>
        </p>
      ))}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const dark = useIsDark()
  const c = INK(dark)
  const spec =
    status === "completed" ? { icon: CheckCircle2, color: c.good, label: "Completed" } :
    status === "failed" ? { icon: XCircle, color: c.critical, label: "Failed" } :
    status === "cancelled" ? { icon: SlashSquare, color: c.warning, label: "Cancelled" } :
    { icon: RefreshCw, color: c.axis, label: status.charAt(0).toUpperCase() + status.slice(1) }
  const Icon = spec.icon
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
      <Icon className="h-3.5 w-3.5" style={{ color: spec.color }} aria-hidden />
      {spec.label}
    </span>
  )
}

// ------------------------------------------------------------ main

export default function RevenueDashboard() {
  const dark = useIsDark()
  const c = INK(dark)

  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ status: number; message: string } | null>(null)
  const [range, setRange] = useState<string>("30d")

  const fetchOverview = useCallback(async (r: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/overview?range=${r}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const message =
          res.status === 401 ? "Your session has expired — sign in again." :
          res.status === 403 ? `${body.email ?? "This account"} is not on the admin allowlist (lib/admin.ts).` :
          body.message || "The overview service returned an error."
        setError({ status: res.status, message })
        return
      }
      setData(await res.json())
    } catch {
      setError({ status: 0, message: "Network error — check your connection and try again." })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchOverview(range) }, [range, fetchOverview])

  const vs = useMemo(() => {
    switch (range) {
      case "today": return "yesterday"
      case "7d": return "prior 7d"
      case "90d": return "prior 90d"
      case "mtd": return "last month"
      case "ytd": return "last year"
      case "all": return "—"
      default: return "prior 30d"
    }
  }, [range])

  const chartData = useMemo(() =>
    (data?.series ?? []).map((p) => ({ ...p, label: bucketLabel(p.bucket, data!.range.granularity) })),
    [data]
  )

  const exportCsv = useCallback(() => {
    if (!data) return
    const lines = [
      `Ongea Pesa admin overview,range=${data.range.key},generated=${data.generated_at}`,
      "",
      "metric,value",
      ...Object.entries(data.summary).map(([k, v]) => `${k},${v}`),
      "",
      "bucket,revenue,volume,completed,failed",
      ...data.series.map((s) => `${s.bucket},${s.revenue},${s.volume},${s.completed},${s.failed}`),
      "",
      "rail,completed,failed,volume,revenue,volume_share_pct",
      ...data.by_rail.map((r) => `${r.type},${r.count},${r.failed},${r.volume},${r.revenue},${r.volume_share}`),
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ongea-pesa-overview-${data.range.key}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [data])

  // ---- first load / error frames ----
  if (loading && !data && !error) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <RefreshCw className="mx-auto h-7 w-7 animate-spin text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">Loading revenue &amp; operations…</p>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-5 w-5" style={{ color: c.critical }} aria-hidden />
            <h2 className="font-semibold text-foreground">
              {error.status === 403 ? "Access denied" : "Couldn't load the dashboard"}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <button
            onClick={() => fetchOverview(range)}
            className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null
  const { summary, deltas, by_rail, failure_reasons, recent, users } = data
  const maxRailVolume = Math.max(1, ...by_rail.map((r) => r.volume))
  const health =
    summary.success_rate >= 98 ? { color: c.goodFill, word: "Healthy" } :
    summary.success_rate >= 90 ? { color: c.warning, word: "Degraded" } :
    { color: c.critical, word: "Critical" }

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* ------------------------------------------------ header */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 md:px-8">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.series1 }} aria-hidden />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Ongea Pesa · Admin</p>
              <h1 className="font-[family-name:var(--font-sora)] text-lg font-semibold leading-tight text-foreground">
                Revenue &amp; Operations
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p className="hidden md:block text-xs text-muted-foreground tabular-nums">
              Updated {new Date(data.generated_at).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <button
              onClick={() => fetchOverview(range)}
              disabled={loading}
              aria-label="Refresh"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden />
            </button>
            <button
              onClick={exportCsv}
              className="hidden sm:flex h-9 items-center gap-1.5 rounded-full border border-border/60 bg-card px-3.5 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors"
            >
              <Download className="h-3.5 w-3.5" aria-hidden /> Export CSV
            </button>
            <a
              href="/admin-analytics"
              className="hidden lg:flex h-9 items-center gap-1.5 rounded-full border border-border/60 bg-card px-3.5 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors"
            >
              Deep analytics <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          </div>
        </div>
      </header>

      <main className={cn("mx-auto max-w-7xl px-4 pb-16 md:px-8 transition-opacity duration-200", loading && "opacity-60")}>
        {/* -------------------------------------------- filter row */}
        <div className="flex flex-wrap items-center gap-2 py-5" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              aria-pressed={range === r.key}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors border",
                range === r.key
                  ? "border-transparent bg-foreground text-background"
                  : "border-border/60 bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {r.label}
            </button>
          ))}
          <p className="ml-auto hidden md:block text-xs text-muted-foreground tabular-nums">
            {new Date(data.range.start).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
            {" — "}
            {new Date(data.range.end).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>

        {/* -------------------------------------------- hero + tiles */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3" aria-label="Key metrics">
          <div className="rounded-2xl border border-border/60 bg-card p-6 flex flex-col justify-between gap-5 lg:row-span-2">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Net revenue</p>
              <p className="mt-2 text-5xl font-semibold leading-none text-foreground">{kesCompact(summary.net_revenue)}</p>
              <p className="mt-2 text-sm text-muted-foreground tabular-nums">{kesExact(summary.net_revenue)}</p>
              <div className="mt-3"><DeltaChip value={deltas?.net_revenue} vs={vs} /></div>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/60 pt-4 text-sm">
              <div><dt className="text-xs text-muted-foreground">Platform fees</dt><dd className="font-medium text-foreground tabular-nums">{kes(summary.revenue)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Provider costs</dt><dd className="font-medium text-foreground tabular-nums">−{kes(summary.costs)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Take rate</dt><dd className="font-medium text-foreground tabular-nums">{summary.take_rate.toFixed(2)}%</dd></div>
              <div><dt className="text-xs text-muted-foreground">Rev / active user</dt><dd className="font-medium text-foreground tabular-nums">{kes(summary.arpu)}</dd></div>
            </dl>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:col-span-2 lg:grid-cols-3">
            <StatTile label="Gross volume" value={kesCompact(summary.gross_volume)} delta={deltas?.gross_volume} vs={vs} />
            <StatTile label="Transactions" value={nfFull.format(summary.tx_count)} delta={deltas?.tx_count} vs={vs} />
            <StatTile label="Success rate" value={`${summary.success_rate.toFixed(1)}%`} delta={deltas?.success_rate} unit="pp" vs={vs} />
            <StatTile label="Active users" value={nfFull.format(summary.active_users)} delta={deltas?.active_users} vs={vs} />
            <StatTile label="New signups" value={nfFull.format(users.new_in_period)} vs={vs} hint={`${nfFull.format(users.total)} total accounts`} />
            <StatTile label="Voice-verified" value={`${summary.voice_share.toFixed(0)}%`} delta={deltas?.voice_share} unit="pp" vs={vs} hint="share of completed" />
          </div>
        </section>

        {/* -------------------------------------------- performance */}
        <section className="mt-4 rounded-2xl border border-border/60 bg-card p-6" aria-label="Performance over time">
          <div className="mb-5 flex items-baseline justify-between gap-3">
            <div>
              <h2 className="font-[family-name:var(--font-sora)] text-sm font-semibold text-foreground">Performance over time</h2>
              <p className="text-xs text-muted-foreground">Platform fee revenue, then transaction outcomes — same timeline, separate scales</p>
            </div>
          </div>

          {/* Revenue — single series, no legend (title names it) */}
          <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Revenue (KSh)</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke={c.grid} strokeWidth={1} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: c.axis }} tickLine={false} axisLine={{ stroke: c.grid }} minTickGap={28} />
                <YAxis tick={{ fontSize: 11, fill: c.axis }} tickLine={false} axisLine={false} width={52}
                  tickFormatter={(v: number) => nfCompact.format(v)} />
                <Tooltip content={<ChartTooltip money />} cursor={{ stroke: c.axis, strokeWidth: 1 }} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke={c.series1} strokeWidth={2}
                  fill={c.series1} fillOpacity={0.1}
                  activeDot={{ r: 5, fill: c.series1, stroke: c.surface, strokeWidth: 2 }} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Outcomes — two series → legend present */}
          <div className="mt-6 mb-1 flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Transaction outcomes</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: c.series1 }} aria-hidden />Completed</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: c.critical }} aria-hidden />Failed</span>
            </div>
          </div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barCategoryGap="35%">
                <CartesianGrid vertical={false} stroke={c.grid} strokeWidth={1} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: c.axis }} tickLine={false} axisLine={{ stroke: c.grid }} minTickGap={28} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: c.axis }} tickLine={false} axisLine={false} width={52} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }} />
                <Bar dataKey="completed" name="Completed" stackId="outcome" fill={c.series1}
                  stroke={c.surface} strokeWidth={2} maxBarSize={24} />
                <Bar dataKey="failed" name="Failed" stackId="outcome" fill={c.critical}
                  stroke={c.surface} strokeWidth={2} maxBarSize={24} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table twin — every charted value reachable without hover */}
          <details className="mt-4 group">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
              View as table
            </summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs tabular-nums">
                <thead>
                  <tr className="border-b border-border/60 text-left text-muted-foreground">
                    <th className="py-1.5 pr-4 font-medium">Period</th>
                    <th className="py-1.5 pr-4 font-medium text-right">Revenue</th>
                    <th className="py-1.5 pr-4 font-medium text-right">Volume</th>
                    <th className="py-1.5 pr-4 font-medium text-right">Completed</th>
                    <th className="py-1.5 font-medium text-right">Failed</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row) => (
                    <tr key={row.bucket} className="border-b border-border/40 text-foreground">
                      <td className="py-1.5 pr-4">{row.label}</td>
                      <td className="py-1.5 pr-4 text-right">{kes(row.revenue)}</td>
                      <td className="py-1.5 pr-4 text-right">{kes(row.volume)}</td>
                      <td className="py-1.5 pr-4 text-right">{row.completed}</td>
                      <td className="py-1.5 text-right">{row.failed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>

        {/* -------------------------------------------- rails + health */}
        <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Rail mix — one measure over nominal categories → one color, direct labels */}
          <div className="rounded-2xl border border-border/60 bg-card p-6" aria-label="Volume by payment rail">
            <h2 className="font-[family-name:var(--font-sora)] text-sm font-semibold text-foreground">Volume by rail</h2>
            <p className="mb-5 text-xs text-muted-foreground">Completed volume per payment method, share of gross</p>
            {by_rail.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No completed transactions in this period.</p>
            ) : (
              <ul className="space-y-4">
                {by_rail.map((rail) => (
                  <li key={rail.type}>
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium text-foreground">{railLabel(rail.type)}</span>
                      <span className="text-foreground tabular-nums">
                        {kes(rail.volume)}
                        <span className="ml-2 text-xs text-muted-foreground">{rail.volume_share.toFixed(1)}% · {rail.count} tx</span>
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted/60" role="img"
                      aria-label={`${railLabel(rail.type)}: ${kes(rail.volume)}, ${rail.volume_share.toFixed(1)} percent of volume`}>
                      <div
                        className="h-2 rounded-l-full transition-[width] duration-500"
                        style={{
                          width: `${Math.max(1.5, (rail.volume / maxRailVolume) * 100)}%`,
                          background: INK(dark).series1,
                          borderTopRightRadius: 4, borderBottomRightRadius: 4,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Payment health — status colors, icon + label, never color alone */}
          <div className="rounded-2xl border border-border/60 bg-card p-6" aria-label="Payment health">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <h2 className="font-[family-name:var(--font-sora)] text-sm font-semibold text-foreground">Payment health</h2>
                <p className="text-xs text-muted-foreground">Completed vs failed attempts in this period</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                <span className="h-2 w-2 rounded-full" style={{ background: health.color }} aria-hidden />
                {health.word}
              </span>
            </div>

            <p className="mt-5 text-3xl font-semibold text-foreground leading-none">
              {summary.success_rate.toFixed(1)}%
              <span className="ml-2 text-sm font-normal text-muted-foreground">success</span>
            </p>
            {/* Meter — fill carries severity; the track is a lighter step of the same ramp */}
            <div className="mt-3 h-2 w-full rounded-full" style={{ background: `${health.color}26` }}>
              <div className="h-2 rounded-full transition-[width] duration-500"
                style={{ width: `${summary.success_rate}%`, background: health.color }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground tabular-nums">
              {nfFull.format(summary.tx_count)} completed · {nfFull.format(summary.failed_count)} failed or cancelled
            </p>

            <h3 className="mt-6 mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Top failure reasons</h3>
            {failure_reasons.length === 0 ? (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" style={{ color: c.goodFill }} aria-hidden /> No failures in this period.
              </p>
            ) : (
              <ul className="space-y-2">
                {failure_reasons.map((f) => (
                  <li key={f.reason} className="flex items-start justify-between gap-3 text-sm">
                    <span className="flex items-start gap-1.5 text-foreground">
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: c.critical }} aria-hidden />
                      <span className="line-clamp-2">{f.reason}</span>
                    </span>
                    <span className="shrink-0 text-muted-foreground tabular-nums">{f.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* -------------------------------------------- recent activity */}
        <section className="mt-4 rounded-2xl border border-border/60 bg-card p-6" aria-label="Recent activity">
          <h2 className="font-[family-name:var(--font-sora)] text-sm font-semibold text-foreground">Recent activity</h2>
          <p className="mb-4 text-xs text-muted-foreground">Latest transactions in this period (PII masked)</p>
          {recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nothing yet in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">When</th>
                    <th className="py-2 pr-4 font-medium">Rail</th>
                    <th className="py-2 pr-4 font-medium">Counterparty</th>
                    <th className="py-2 pr-4 font-medium text-right">Amount</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 font-medium">Channel</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((tx, i) => (
                    <tr key={`${tx.created_at}-${i}`} className="border-b border-border/40">
                      <td className="py-2.5 pr-4 text-muted-foreground tabular-nums whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleString("en-KE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-2.5 pr-4 text-foreground">{railLabel(tx.type)}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground tabular-nums">{tx.phone ?? "—"}</td>
                      <td className="py-2.5 pr-4 text-right font-medium text-foreground tabular-nums whitespace-nowrap">{kesExact(tx.amount)}</td>
                      <td className="py-2.5 pr-4"><StatusBadge status={tx.status} /></td>
                      <td className="py-2.5">
                        {tx.voice ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Mic className="h-3.5 w-3.5" style={{ color: c.series1 }} aria-hidden /> Voice
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">App</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Figures derive from the transactions ledger (completed rows only, fees from <code>platform_fee</code> with a 0.5% legacy fallback).
        </p>
      </main>
    </div>
  )
}
