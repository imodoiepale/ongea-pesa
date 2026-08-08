"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import Layout from "@/components/kokonutui/layout"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  RefreshCw,
  DollarSign,
  TrendingUp,
  Building2,
  CreditCard,
  Crown,
  Landmark,
  Percent,
  Users,
  Wallet,
  ArrowUpRight,
  Activity,
  Clock,
  Calendar,
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
  PieChart,
  Pie,
  Cell,
} from "recharts"

import { PLATFORM_FEE_RATE } from "@/lib/transaction-fees"

const PROVIDER_LABELS: Record<string, string> = {
  ncba_stk: "NCBA STK",
  ncba: "NCBA",
  safaricom_stk: "Safaricom STK",
  daraja: "M-Pesa Daraja",
  mpesa: "M-Pesa",
  indexpay: "IndexPay",
  internal: "Internal Wallet",
}

const providerLabel = (provider?: string | null) => {
  if (!provider) return "—"
  return PROVIDER_LABELS[provider.toLowerCase()] ?? provider
}

type DateRange = "today" | "yesterday" | "last7days" | "last30days" | "thisMonth" | "lastMonth" | "all"

interface RevenueStats {
  totalPlatformFees: number
  totalTransactionVolume: number
  totalTransactions: number
  premiumUsers: number
  bankPartnerships: number
  licensingRevenue: number
  avgFeePerTransaction: number
}

interface RevenueBreakdown {
  type: string
  count: number
  volume: number
  fees: number
}

interface DailyData {
  date: string
  revenue: number
  transactions: number
  volume: number
}

const getDateRange = (range: DateRange): { start: Date; end: Date } => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  switch (range) {
    case "today":
      return { start: today, end: now }
    case "yesterday":
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      return { start: yesterday, end: today }
    case "last7days":
      const last7 = new Date(today)
      last7.setDate(last7.getDate() - 7)
      return { start: last7, end: now }
    case "last30days":
      const last30 = new Date(today)
      last30.setDate(last30.getDate() - 30)
      return { start: last30, end: now }
    case "thisMonth":
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start: thisMonthStart, end: now }
    case "lastMonth":
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
      return { start: lastMonthStart, end: lastMonthEnd }
    case "all":
    default:
      const allStart = new Date(2020, 0, 1)
      return { start: allStart, end: now }
  }
}

const getDateRangeLabel = (range: DateRange): string => {
  switch (range) {
    case "today": return "Today"
    case "yesterday": return "Yesterday"
    case "last7days": return "Last 7 Days"
    case "last30days": return "Last 30 Days"
    case "thisMonth": return "This Month"
    case "lastMonth": return "Last Month"
    case "all": return "All Time"
    default: return "All Time"
  }
}

export default function RevenuePage() {
  const [stats, setStats] = useState<RevenueStats>({
    totalPlatformFees: 0,
    totalTransactionVolume: 0,
    totalTransactions: 0,
    premiumUsers: 0,
    bankPartnerships: 0,
    licensingRevenue: 0,
    avgFeePerTransaction: 0,
  })
  const [breakdown, setBreakdown] = useState<RevenueBreakdown[]>([])
  const [dailyData, setDailyData] = useState<DailyData[]>([])
  const [depositRails, setDepositRails] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>("thisMonth")
  const supabase = createClient()

  const fetchRevenue = useCallback(async () => {
    setLoading(true)
    try {
      // Get date range for filtering
      const { start, end } = getDateRange(dateRange)

      // Fetch all transactions — include persisted platform_fee (migration 021)
      const { data: transactions, error: txError } = await supabase
        .from("transactions")
        .select("type, amount, status, created_at, platform_fee, provider")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: false })

      if (txError) {
        console.error("Error fetching transactions:", txError)
      }

      // Fetch premium users (role-based instead of is_premium column)
      const { count: premiumCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "premium")

      // Calculate stats - only completed transactions
      const completedTx = (transactions || []).filter(tx => tx.status === "completed")
      
      // The persisted platform_fee is authoritative. The former fallback to
      // recomputing 0.5% treated every waived fee as if it had been charged,
      // overstating revenue on this screen.
      const txWithFees = completedTx.map(tx => ({
        ...tx,
        calculated_fee: parseFloat(String(tx.platform_fee ?? 0)) || 0,
      }))

      // Deposit rails seen in the period — deposits carry no platform fee, and their
      // Safaricom charge is paid by the customer, so they add nothing to revenue or cost.
      const rails = [
        ...new Set(
          completedTx
            .filter(tx => tx.type?.toLowerCase() === "deposit")
            .map(tx => tx.provider)
            .filter((p): p is string => Boolean(p))
        ),
      ]
      
      const totalFees = txWithFees.reduce((sum, tx) => sum + tx.calculated_fee, 0)
      const totalVolume = txWithFees.reduce((sum, tx) => sum + (tx.amount || 0), 0)

      // Calculate breakdown by type
      const typeMap = new Map<string, RevenueBreakdown>()
      for (const tx of txWithFees) {
        const existing = typeMap.get(tx.type) || { type: tx.type, count: 0, volume: 0, fees: 0 }
        existing.count++
        existing.volume += tx.amount || 0
        existing.fees += tx.calculated_fee
        typeMap.set(tx.type, existing)
      }

      // Calculate daily breakdown for charts based on date range
      const dailyMap = new Map<string, DailyData>()
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      const daysToShow = Math.min(daysDiff, 30) // Max 30 days in chart
      
      for (let i = daysToShow - 1; i >= 0; i--) {
        const date = new Date(end)
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split("T")[0]
        dailyMap.set(dateStr, { date: dateStr, revenue: 0, transactions: 0, volume: 0 })
      }

      for (const tx of txWithFees) {
        const dateStr = new Date(tx.created_at).toISOString().split("T")[0]
        const existing = dailyMap.get(dateStr)
        if (existing) {
          existing.revenue += tx.calculated_fee
          existing.transactions++
          existing.volume += tx.amount || 0
        }
      }

      const breakdownArray = Array.from(typeMap.values())
        .sort((a, b) => b.fees - a.fees)

      const dailyArray = Array.from(dailyMap.values())

      setStats({
        totalPlatformFees: totalFees,
        totalTransactionVolume: totalVolume,
        totalTransactions: completedTx.length,
        premiumUsers: premiumCount || 0,
        bankPartnerships: 0,
        licensingRevenue: 0,
        avgFeePerTransaction: completedTx.length > 0 ? totalFees / completedTx.length : 0,
      })

      setBreakdown(breakdownArray)
      setDailyData(dailyArray)
      setDepositRails(rails)
      setLastUpdated(new Date())
    } catch (err) {
      console.error("Failed to fetch revenue:", err)
    } finally {
      setLoading(false)
    }
  }, [supabase, dateRange])

  // Fetch when date range changes
  useEffect(() => {
    fetchRevenue()
  }, [fetchRevenue, dateRange])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount)
  }

  // Invented partnership figures were removed: fabricated revenue on a finance
  // dashboard is worse than a blank panel, since nothing distinguishes it from
  // real data once the "Projected" badge is scrolled past. Populate from a real
  // partnerships table when one exists.
  const partnerships: Array<{
    name: string
    type: string
    status: string
    monthlyFee: number
    since: string
  }> = []

  // Invented subscriber counts removed for the same reason as `partnerships`.
  // Real subscription revenue now lands in /admin-analytics/economics via the
  // `subscription_revenue` split, sourced from actual transactions.
  const premiumTiers: Array<{
    tier: string
    users: number
    monthlyFee: number
    features: string
  }> = []

  const totalPremiumRevenue = premiumTiers.reduce((sum, tier) => sum + (tier.users * tier.monthlyFee), 0)
  const totalPartnershipRevenue = partnerships.filter(p => p.status === "active").reduce((sum, p) => sum + p.monthlyFee, 0)

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header with Date Filter */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Revenue & Partnerships</h1>
            <p className="text-xs text-muted-foreground">Platform earnings, partnerships, and licensing</p>
          </div>
          {/* Live Status Bar */}
        <div className={cn(
          "flex items-center justify-between px-4 py-2 rounded-xl",
          "bg-brand/5",
          "border border-brand/20"
        )}>
          <div className="flex items-center gap-2 p-2">
            <Activity className="w-4 h-4 text-brand animate-pulse" />
            <span className="text-xs font-medium text-brand">Live Data</span>
            <span className="text-[10px] text-brand">• {getDateRangeLabel(dateRange)}</span>
          </div>
          {lastUpdated && (
            <div className="flex items-center gap-1 text-[10px] text-brand">
              <Clock className="w-3 h-3" />
              Last updated: {lastUpdated.toLocaleTimeString("en-KE")}
            </div>
          )}
        </div>
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger className="w-[160px] bg-muted/30 border-border/60">
                <Calendar className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="last7days">Last 7 Days</SelectItem>
                <SelectItem value="last30days">Last 30 Days</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={fetchRevenue}
              disabled={loading}
              className={cn(
                "p-2 rounded-lg",
                "bg-muted",
                "hover:bg-muted",
                "transition-colors duration-200"
              )}
            >
              <RefreshCw className={cn("w-4 h-4 text-muted-foreground", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Total Platform Revenue - TOP CARD */}
        <div
          className={cn(
            "p-4 rounded-xl",
            "bg-brand",
            "border border-brand/20",
            "shadow-lg"
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Total Platform Revenue ({getDateRangeLabel(dateRange)})</h3>
              <p className="text-xs text-white/70">Transaction fees + Premium subscriptions + Partnership fees</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">
                {formatCurrency(stats.totalPlatformFees + totalPremiumRevenue + totalPartnershipRevenue)}
              </p>
              <div className="flex items-center gap-1 text-white/70 text-xs justify-end">
                <ArrowUpRight className="w-3 h-3" />
                <span>{stats.totalTransactions} transactions</span>
              </div>
            </div>
          </div>
        </div>

        

        {/* Revenue Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Platform Fees", value: formatCurrency(stats.totalPlatformFees), icon: DollarSign, color: "text-brand" },
            { label: "Premium Revenue", value: formatCurrency(totalPremiumRevenue), icon: Crown, color: "text-amber-600 dark:text-amber-400" },
            { label: "Partnership Fees", value: formatCurrency(totalPartnershipRevenue), icon: Building2, color: "text-blue-600 dark:text-blue-400" },
            { label: "Total Monthly", value: formatCurrency(stats.totalPlatformFees + totalPremiumRevenue + totalPartnershipRevenue), icon: TrendingUp, color: "text-purple-600 dark:text-purple-400" },
          ].map((stat, i) => (
            <div
              key={i}
              className={cn(
                "p-4 rounded-xl",
                "bg-card",
                "border border-border/40",
                "shadow-sm backdrop-blur-xl"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", "bg-muted")}>
                  <stat.icon className={cn("w-4 h-4", stat.color)} />
                </div>
                <div>
                  <p className={cn("text-lg font-semibold", stat.color)}>{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Daily Revenue Chart */}
          <div
            className={cn(
              "rounded-xl overflow-hidden",
              "bg-card",
              "border border-border/40",
              "shadow-sm backdrop-blur-xl"
            )}
          >
            <div className="p-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className={cn("p-2 rounded-lg", "bg-muted")}>
                  <TrendingUp className="w-4 h-4 text-brand" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">Daily Revenue ({getDateRangeLabel(dateRange)})</h2>
              </div>
            </div>
            <div className="p-4 h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }} 
                    tickFormatter={(value) => new Date(value).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
                  />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                    labelFormatter={(label) => new Date(label).toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" })}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#revenueGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Transaction Volume Chart */}
          <div
            className={cn(
              "rounded-xl overflow-hidden",
              "bg-card",
              "border border-border/40",
              "shadow-sm backdrop-blur-xl"
            )}
          >
            <div className="p-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className={cn("p-2 rounded-lg", "bg-muted")}>
                  <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">Transaction Volume ({getDateRangeLabel(dateRange)})</h2>
              </div>
            </div>
            <div className="p-4 h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }} 
                    tickFormatter={(value) => new Date(value).toLocaleDateString("en-KE", { day: "numeric" })}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === "transactions" ? value : formatCurrency(value),
                      name === "transactions" ? "Transactions" : "Volume"
                    ]}
                    labelFormatter={(label) => new Date(label).toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" })}
                  />
                  <Bar dataKey="transactions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Transaction Fee Breakdown */}
          <div
            className={cn(
              "rounded-xl overflow-hidden",
              "bg-card",
              "border border-border/40",
              "shadow-sm backdrop-blur-xl"
            )}
          >
            <div className="p-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className={cn("p-2 rounded-lg", "bg-muted")}>
                  <Percent className="w-4 h-4 text-brand" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">Fee Breakdown by Type</h2>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {(PLATFORM_FEE_RATE * 100).toFixed(1)}% on outbound transactions
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/30 border-b border-border/60">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">#</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Type</th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Count</th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Volume</th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Fees Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center">
                        <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1 text-muted-foreground" />
                        <p className="text-muted-foreground">Loading...</p>
                      </td>
                    </tr>
                  ) : breakdown.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No data</td>
                    </tr>
                  ) : (
                    breakdown.map((item, index) => (
                      <tr key={item.type} className="hover:bg-muted/50">
                        <td className="px-3 py-2 text-muted-foreground font-mono">{index + 1}</td>
                        <td className="px-3 py-2">
                          <span className="px-1.5 py-0.5 rounded bg-muted text-foreground text-[10px]">
                            {item.type}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-foreground">{item.count}</td>
                        <td className="px-3 py-2 text-right font-mono text-foreground">{formatCurrency(item.volume)}</td>
                        <td className="px-3 py-2 text-right font-mono text-brand font-medium">
                          {formatCurrency(item.fees)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-2 border-t border-border/40 text-[10px] text-muted-foreground">
              Deposits earn no platform fee. The Safaricom paybill charge on deposit rails
              {depositRails.length > 0 && ` (${depositRails.map(providerLabel).join(", ")})`} is paid by the
              customer and is not an Ongea Pesa cost, so it never reduces the revenue above.
            </div>
          </div>

          {/* Bank Partnerships */}
          <div
            className={cn(
              "rounded-xl overflow-hidden",
              "bg-card",
              "border border-border/40",
              "shadow-sm backdrop-blur-xl"
            )}
          >
            <div className="p-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className={cn("p-2 rounded-lg", "bg-muted")}>
                  <Landmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">Bank & Mobile Money Partnerships</h2>
                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">Projected</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/30 border-b border-border/60">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">#</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Partner</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Type</th>
                    <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Status</th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Monthly Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {partnerships.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                        No partnership records yet
                      </td>
                    </tr>
                  )}
                  {partnerships.map((partner, index) => (
                    <tr key={partner.name} className="hover:bg-muted/50">
                      <td className="px-3 py-2 text-muted-foreground font-mono">{index + 1}</td>
                      <td className="px-3 py-2 font-medium text-foreground">{partner.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{partner.type}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-medium",
                          partner.status === "active"
                            ? "bg-brand/10 text-brand"
                            : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                        )}>
                          {partner.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-blue-600 dark:text-blue-400 font-medium">
                        {formatCurrency(partner.monthlyFee)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Premium Users & Licensing */}
        <div
          className={cn(
            "rounded-xl overflow-hidden",
            "bg-card",
            "border border-border/40",
            "shadow-sm backdrop-blur-xl"
          )}
        >
          <div className="p-4 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className={cn("p-2 rounded-lg", "bg-muted")}>
                <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">Premium Subscriptions & Licensing</h2>
                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">Projected</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/30 border-b border-border/60">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">#</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Tier</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Features</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Users</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Monthly Fee</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {premiumTiers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                      No subscription tiers configured — see Economics for actual subscription revenue
                    </td>
                  </tr>
                )}
                {premiumTiers.map((tier, index) => (
                  <tr key={tier.tier} className="hover:bg-muted/50">
                    <td className="px-3 py-2 text-muted-foreground font-mono">{index + 1}</td>
                    <td className="px-3 py-2">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-medium",
                        tier.tier === "Enterprise" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" :
                        tier.tier === "Business" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" :
                        tier.tier === "Pro" ? "bg-brand/10 text-brand" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {tier.tier}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{tier.features}</td>
                    <td className="px-3 py-2 text-right font-mono text-foreground">{tier.users}</td>
                    <td className="px-3 py-2 text-right font-mono text-foreground">{formatCurrency(tier.monthlyFee)}</td>
                    <td className="px-3 py-2 text-right font-mono text-amber-600 dark:text-amber-400 font-medium">
                      {formatCurrency(tier.users * tier.monthlyFee)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-muted/30/50 font-semibold">
                  <td colSpan={3} className="px-3 py-2 text-foreground">Total Premium Revenue</td>
                  <td className="px-3 py-2 text-right font-mono text-foreground">
                    {premiumTiers.reduce((sum, t) => sum + t.users, 0)}
                  </td>
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2 text-right font-mono text-amber-600 dark:text-amber-400">
                    {formatCurrency(totalPremiumRevenue)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Revenue Summary */}
        <div
          className={cn(
            "p-4 rounded-xl",
            "bg-brand",
            "border border-brand/20",
            "shadow-sm"
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Total Platform Revenue (Monthly)</h3>
              <p className="text-xs text-white/70">Transaction fees + Premium subscriptions + Partnership fees</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">
                {formatCurrency(stats.totalPlatformFees + totalPremiumRevenue + totalPartnershipRevenue)}
              </p>
              <div className="flex items-center gap-1 text-white/70 text-xs">
                <ArrowUpRight className="w-3 h-3" />
                <span>+12.5% from last month</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
