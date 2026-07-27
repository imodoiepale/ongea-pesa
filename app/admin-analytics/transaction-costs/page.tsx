"use client"

import { useState, useEffect, useCallback } from "react"
import Layout from "@/components/kokonutui/layout"
import { cn } from "@/lib/utils"
import { PLATFORM_FEE_RATE } from "@/lib/transaction-fees"
import {
  RefreshCw,
  TrendingDown,
  DollarSign,
  Wallet,
  Activity,
  Clock,
  AlertCircle,
  Receipt,
} from "lucide-react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

type Period = "7d" | "30d" | "90d" | "1y"

interface SummaryRow {
  bucket_date: string
  transaction_type: string
  tx_count: number
  gross_volume: number
  platform_revenue: number
  safaricom_cost: number
  customer_borne_cost?: number | null
  net_margin: number
}

interface Totals {
  total_volume: number
  total_revenue: number
  total_cost: number
  total_customer_borne_cost?: number | null
  total_net_margin: number
  total_transactions: number
}

const PERIOD_LABELS: Record<Period, string> = {
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
  "1y": "Last Year",
}

const SERIES_LABELS: Record<string, string> = {
  revenue: "Platform Revenue",
  cost: "Provider Cost (Ongea pays)",
  customerCost: "Customer-Paid M-Pesa Charge",
  platform_revenue: "Platform Revenue",
  ongea_cost: "Provider Cost (Ongea pays)",
  customer_cost: "Customer-Paid M-Pesa Charge",
}

const seriesLabel = (key: unknown) => SERIES_LABELS[String(key)] ?? String(key)

// Deposit rails (NCBA STK, Safaricom STK) record the Safaricom paybill tariff on the row
// for transparency, but the customer pays it — it is never an Ongea Pesa expense.
const CUSTOMER_BORNE_TYPES = ["deposit"]

const isCustomerBorneType = (type: string) =>
  CUSTOMER_BORNE_TYPES.includes((type || "").toLowerCase())

// Migration 025 makes the RPC split these itself. Before it is applied, safaricom_cost
// still lumps both together, so classify by transaction type instead.
const splitRowCost = (row: SummaryRow) => {
  if (row.customer_borne_cost !== undefined && row.customer_borne_cost !== null) {
    return { ongea: row.safaricom_cost ?? 0, customer: row.customer_borne_cost }
  }
  const cost = row.safaricom_cost ?? 0
  return isCustomerBorneType(row.transaction_type)
    ? { ongea: 0, customer: cost }
    : { ongea: cost, customer: 0 }
}

export default function TransactionCostsPage() {
  const [period, setPeriod] = useState<Period>("30d")
  const [summary, setSummary] = useState<SummaryRow[]>([])
  const [totals, setTotals] = useState<Totals>({
    total_volume: 0,
    total_revenue: 0,
    total_cost: 0,
    total_net_margin: 0,
    total_transactions: 0,
  })
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/transaction-costs?period=${period}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setSummary(data.summary ?? [])
      setTotals(data.totals ?? { total_volume: 0, total_revenue: 0, total_cost: 0, total_net_margin: 0, total_transactions: 0 })
      setLastUpdated(new Date())
    } catch (err: any) {
      setError(err.message || "Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(amount ?? 0)

  // Build daily chart data: aggregate per bucket_date, keeping customer-borne charges separate
  const dailyMap = new Map<string, { date: string; revenue: number; cost: number; customerCost: number }>()
  for (const row of summary) {
    const existing = dailyMap.get(row.bucket_date) ?? { date: row.bucket_date, revenue: 0, cost: 0, customerCost: 0 }
    const { ongea, customer } = splitRowCost(row)
    existing.revenue += row.platform_revenue ?? 0
    existing.cost += ongea
    existing.customerCost += customer
    dailyMap.set(row.bucket_date, existing)
  }
  const dailyChartData = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))

  // Build type aggregation for bar chart and table
  const typeMap = new Map<string, {
    type: string
    tx_count: number
    gross_volume: number
    platform_revenue: number
    ongea_cost: number
    customer_cost: number
  }>()
  for (const row of summary) {
    const { ongea, customer } = splitRowCost(row)
    const existing = typeMap.get(row.transaction_type) ?? {
      type: row.transaction_type,
      tx_count: 0,
      gross_volume: 0,
      platform_revenue: 0,
      ongea_cost: 0,
      customer_cost: 0,
    }
    existing.tx_count += row.tx_count ?? 0
    existing.gross_volume += row.gross_volume ?? 0
    existing.platform_revenue += row.platform_revenue ?? 0
    existing.ongea_cost += ongea
    existing.customer_cost += customer
    typeMap.set(row.transaction_type, existing)
  }
  // net_margin is recomputed here instead of using the RPC column, which subtracts
  // customer-borne deposit charges from Ongea's margin.
  const typeBreakdown = Array.from(typeMap.values())
    .map((row) => ({ ...row, net_margin: row.platform_revenue - row.ongea_cost }))
    .sort((a, b) => b.platform_revenue - a.platform_revenue)

  // Migration 025 returns the split directly; before it is applied, total_cost still
  // includes customer-borne charges and has to be netted off.
  const rpcSplitsCost =
    totals.total_customer_borne_cost !== undefined && totals.total_customer_borne_cost !== null
  const customerBorneCost = rpcSplitsCost
    ? (totals.total_customer_borne_cost as number)
    : summary.reduce((sum, row) => sum + splitRowCost(row).customer, 0)
  const providerCost = rpcSplitsCost
    ? (totals.total_cost ?? 0)
    : Math.max((totals.total_cost ?? 0) - customerBorneCost, 0)
  const netMargin = (totals.total_revenue ?? 0) - providerCost

  const statCards = [
    {
      label: "Total Volume",
      value: formatCurrency(totals.total_volume),
      icon: Wallet,
      color: "text-blue-600 dark:text-blue-400",
      description: `${totals.total_transactions} transactions`,
    },
    {
      label: "Platform Revenue",
      value: formatCurrency(totals.total_revenue),
      icon: DollarSign,
      color: "text-brand",
      description: `${(PLATFORM_FEE_RATE * 100).toFixed(1)}% platform fee`,
    },
    {
      label: "Provider Costs",
      value: formatCurrency(providerCost),
      icon: TrendingDown,
      color: "text-red-600 dark:text-red-400",
      description: "B2C charges Ongea Pesa pays",
    },
    {
      label: "Customer-Paid Charges",
      value: formatCurrency(customerBorneCost),
      icon: Receipt,
      color: "text-amber-600 dark:text-amber-400",
      description: "Deposit tariff paid to Safaricom by customers",
    },
    {
      label: "Net Margin",
      value: formatCurrency(netMargin),
      icon: Activity,
      color: netMargin >= 0 ? "text-brand" : "text-red-600 dark:text-red-400",
      description: "Revenue minus provider costs",
    },
  ]

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Transaction Costs</h1>
            <p className="text-xs text-muted-foreground">
              Platform revenue vs provider charges Ongea Pesa pays — {PERIOD_LABELS[period]}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Period selector */}
            <div className="flex rounded-lg border border-border/60 overflow-hidden bg-muted/30 text-xs">
              {(["7d", "30d", "90d", "1y"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "px-3 py-1.5 transition-colors",
                    period === p
                      ? "bg-brand text-white font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className={cn(
                "p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              )}
            >
              <RefreshCw className={cn("w-4 h-4 text-muted-foreground", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Live status bar */}
        <div className={cn(
          "flex items-center justify-between px-4 py-2 rounded-xl",
          "bg-brand/5 border border-brand/20"
        )}>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand animate-pulse" />
            <span className="text-xs font-medium text-brand">Live Data</span>
            <span className="text-[10px] text-brand">• {PERIOD_LABELS[period]}</span>
          </div>
          {lastUpdated && (
            <div className="flex items-center gap-1 text-[10px] text-brand">
              <Clock className="w-3 h-3" />
              Last updated: {lastUpdated.toLocaleTimeString("en-KE")}
            </div>
          )}
        </div>

        {/* Error state */}
        {error && (
          <div className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-xl",
            "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400"
          )}>
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Note/callout */}
        <div className={cn(
          "flex items-start gap-2 px-4 py-3 rounded-xl text-xs",
          "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400"
        )}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Note:</strong> Only B2C payouts (withdrawals, bill pay &amp; chama disbursements) carry a <code>transaction_cost</code> Ongea Pesa actually bears. NCBA STK and Safaricom STK deposits record the Safaricom paybill tariff for transparency only — the customer pays it, so it is excluded from Provider Costs and Net Margin.
          </span>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {statCards.map((stat, i) => (
            <div
              key={i}
              className={cn(
                "p-4 rounded-xl bg-card border border-border/40 shadow-sm backdrop-blur-xl"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg bg-muted")}>
                  <stat.icon className={cn("w-4 h-4", stat.color)} />
                </div>
                <div>
                  <p className={cn("text-lg font-semibold", stat.color)}>
                    {loading ? <span className="inline-block w-16 h-5 bg-muted/60 rounded animate-pulse" /> : stat.value}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Daily revenue vs costs area chart */}
          <div className={cn("rounded-xl overflow-hidden bg-card border border-border/40 shadow-sm backdrop-blur-xl")}>
            <div className="p-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className={cn("p-2 rounded-lg bg-muted")}>
                  <Activity className="w-4 h-4 text-brand" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">Daily Revenue vs Provider Costs</h2>
              </div>
            </div>
            <div className="p-4 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyChartData}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="customerCostGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) =>
                      new Date(v).toLocaleDateString("en-KE", { day: "numeric", month: "short" })
                    }
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [formatCurrency(value), seriesLabel(name)]}
                    labelFormatter={(l) =>
                      new Date(l).toLocaleDateString("en-KE", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })
                    }
                  />
                  <Legend formatter={(v) => seriesLabel(v)} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    fill="url(#revenueGrad)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="cost"
                    stroke="#ef4444"
                    fill="url(#costGrad)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="customerCost"
                    stroke="#f59e0b"
                    fill="url(#customerCostGrad)"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue by transaction type bar chart */}
          <div className={cn("rounded-xl overflow-hidden bg-card border border-border/40 shadow-sm backdrop-blur-xl")}>
            <div className="p-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className={cn("p-2 rounded-lg bg-muted")}>
                  <DollarSign className="w-4 h-4 text-brand" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">Revenue by Transaction Type</h2>
              </div>
            </div>
            <div className="p-4 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="type" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    formatter={(value: number, name: string) => [formatCurrency(value), seriesLabel(name)]}
                  />
                  <Legend formatter={(v) => seriesLabel(v)} />
                  <Bar dataKey="platform_revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ongea_cost" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="customer_cost" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Breakdown table */}
        <div className={cn("rounded-xl overflow-hidden bg-card border border-border/40 shadow-sm backdrop-blur-xl")}>
          <div className="p-4 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className={cn("p-2 rounded-lg bg-muted")}>
                <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">Cost Breakdown by Transaction Type</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 border-b border-border/60">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">#</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Type</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Count</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Gross Volume</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Platform Revenue</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Provider Cost</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Customer-Paid</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Net Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center">
                      <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1 text-muted-foreground" />
                      <p className="text-muted-foreground">Loading...</p>
                    </td>
                  </tr>
                ) : typeBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                      No completed transactions in this period
                    </td>
                  </tr>
                ) : (
                  typeBreakdown.map((row, index) => (
                    <tr key={row.type} className="hover:bg-muted/50">
                      <td className="px-3 py-2 text-muted-foreground font-mono">{index + 1}</td>
                      <td className="px-3 py-2">
                        <span className="px-1.5 py-0.5 rounded bg-muted text-foreground text-[10px]">
                          {row.type}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-foreground">{row.tx_count}</td>
                      <td className="px-3 py-2 text-right font-mono text-blue-600 dark:text-blue-400">
                        {formatCurrency(row.gross_volume)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-brand font-medium">
                        {formatCurrency(row.platform_revenue)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-red-600 dark:text-red-400">
                        {formatCurrency(row.ongea_cost)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                        {row.customer_cost > 0 ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-medium">
                              customer-paid
                            </span>
                            {formatCurrency(row.customer_cost)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className={cn(
                        "px-3 py-2 text-right font-mono font-medium",
                        row.net_margin >= 0
                          ? "text-brand"
                          : "text-red-600 dark:text-red-400"
                      )}>
                        {formatCurrency(row.net_margin)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {typeBreakdown.length > 0 && !loading && (
                <tfoot className="bg-muted/30 border-t border-border/60 font-semibold">
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-foreground text-xs">Totals</td>
                    <td className="px-3 py-2 text-right font-mono text-foreground text-xs">{totals.total_transactions}</td>
                    <td className="px-3 py-2 text-right font-mono text-blue-600 dark:text-blue-400 text-xs">
                      {formatCurrency(totals.total_volume)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-brand text-xs">
                      {formatCurrency(totals.total_revenue)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-red-600 dark:text-red-400 text-xs">
                      {formatCurrency(providerCost)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-amber-600 dark:text-amber-400 text-xs">
                      {formatCurrency(customerBorneCost)}
                    </td>
                    <td className={cn(
                      "px-3 py-2 text-right font-mono text-xs",
                      netMargin >= 0
                        ? "text-brand"
                        : "text-red-600 dark:text-red-400"
                    )}>
                      {formatCurrency(netMargin)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}
