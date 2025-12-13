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

// Platform fee rate: 0.05%
const PLATFORM_FEE_RATE = 0.0005

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
    bankPartnerships: 3,
    licensingRevenue: 50000,
    avgFeePerTransaction: 0,
  })
  const [breakdown, setBreakdown] = useState<RevenueBreakdown[]>([])
  const [dailyData, setDailyData] = useState<DailyData[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>("thisMonth")
  const supabase = createClient()

  const fetchRevenue = useCallback(async () => {
    setLoading(true)
    try {
      // Get date range for filtering
      const { start, end } = getDateRange(dateRange)

      // Fetch all transactions with created_at for daily breakdown (without platform_fee - calculate client-side)
      const { data: transactions, error: txError } = await supabase
        .from("transactions")
        .select("type, amount, status, created_at")
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
      
      // Calculate fees client-side at 0.05% rate (deposits have 0% fee)
      const txWithFees = completedTx.map(tx => {
        const isDeposit = tx.type?.toLowerCase() === "deposit"
        return {
          ...tx,
          calculated_fee: isDeposit ? 0 : (tx.amount || 0) * PLATFORM_FEE_RATE
        }
      })
      
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
        bankPartnerships: 3,
        licensingRevenue: 50000,
        avgFeePerTransaction: completedTx.length > 0 ? totalFees / completedTx.length : 0,
      })

      setBreakdown(breakdownArray)
      setDailyData(dailyArray)
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

  // Simulated partnership data
  const partnerships = [
    { name: "Equity Bank", type: "Banking Partner", status: "active", monthlyFee: 25000, since: "2024-01" },
    { name: "KCB Bank", type: "Banking Partner", status: "active", monthlyFee: 20000, since: "2024-03" },
    { name: "Safaricom M-Pesa", type: "Mobile Money", status: "active", monthlyFee: 15000, since: "2023-11" },
    { name: "Airtel Money", type: "Mobile Money", status: "pending", monthlyFee: 10000, since: "2024-06" },
  ]

  // Simulated premium tiers
  const premiumTiers = [
    { tier: "Basic", users: 45, monthlyFee: 99, features: "5 free transfers/month" },
    { tier: "Pro", users: 23, monthlyFee: 299, features: "Unlimited transfers, lower fees" },
    { tier: "Business", users: 8, monthlyFee: 999, features: "API access, bulk payments" },
    { tier: "Enterprise", users: 2, monthlyFee: 4999, features: "Custom integration, dedicated support" },
  ]

  const totalPremiumRevenue = premiumTiers.reduce((sum, tier) => sum + (tier.users * tier.monthlyFee), 0)
  const totalPartnershipRevenue = partnerships.filter(p => p.status === "active").reduce((sum, p) => sum + p.monthlyFee, 0)

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header with Date Filter */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Revenue & Partnerships</h1>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">Platform earnings, partnerships, and licensing</p>
          </div>
          {/* Live Status Bar */}
        <div className={cn(
          "flex items-center justify-between px-4 py-2 rounded-xl",
          "bg-emerald-50 dark:bg-emerald-900/20",
          "border border-emerald-200 dark:border-emerald-800"
        )}>
          <div className="flex items-center gap-2 p-2">
            <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Live Data</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">• {getDateRangeLabel(dateRange)}</span>
          </div>
          {lastUpdated && (
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
              <Clock className="w-3 h-3" />
              Last updated: {lastUpdated.toLocaleTimeString("en-KE")}
            </div>
          )}
        </div>
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger className="w-[160px] bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                <Calendar className="w-3.5 h-3.5 mr-2 text-zinc-500" />
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
                "bg-zinc-100 dark:bg-zinc-800",
                "hover:bg-zinc-200 dark:hover:bg-zinc-700",
                "transition-colors duration-200"
              )}
            >
              <RefreshCw className={cn("w-4 h-4 text-zinc-600 dark:text-zinc-400", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Total Platform Revenue - TOP CARD */}
        <div
          className={cn(
            "p-4 rounded-xl",
            "bg-gradient-to-r from-emerald-500 to-emerald-600",
            "border border-emerald-400/20",
            "shadow-lg"
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Total Platform Revenue ({getDateRangeLabel(dateRange)})</h3>
              <p className="text-xs text-emerald-100">Transaction fees + Premium subscriptions + Partnership fees</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">
                {formatCurrency(stats.totalPlatformFees + totalPremiumRevenue + totalPartnershipRevenue)}
              </p>
              <div className="flex items-center gap-1 text-emerald-100 text-xs justify-end">
                <ArrowUpRight className="w-3 h-3" />
                <span>{stats.totalTransactions} transactions</span>
              </div>
            </div>
          </div>
        </div>

        

        {/* Revenue Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Platform Fees", value: formatCurrency(stats.totalPlatformFees), icon: DollarSign, color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Premium Revenue", value: formatCurrency(totalPremiumRevenue), icon: Crown, color: "text-amber-600 dark:text-amber-400" },
            { label: "Partnership Fees", value: formatCurrency(totalPartnershipRevenue), icon: Building2, color: "text-blue-600 dark:text-blue-400" },
            { label: "Total Monthly", value: formatCurrency(stats.totalPlatformFees + totalPremiumRevenue + totalPartnershipRevenue), icon: TrendingUp, color: "text-purple-600 dark:text-purple-400" },
          ].map((stat, i) => (
            <div
              key={i}
              className={cn(
                "p-4 rounded-xl",
                "bg-white dark:bg-zinc-900/70",
                "border border-zinc-100 dark:border-zinc-800",
                "shadow-sm backdrop-blur-xl"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", "bg-zinc-100 dark:bg-zinc-800")}>
                  <stat.icon className={cn("w-4 h-4", stat.color)} />
                </div>
                <div>
                  <p className={cn("text-lg font-semibold", stat.color)}>{stat.value}</p>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400">{stat.label}</p>
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
              "bg-white dark:bg-zinc-900/70",
              "border border-zinc-100 dark:border-zinc-800",
              "shadow-sm backdrop-blur-xl"
            )}
          >
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className={cn("p-2 rounded-lg", "bg-zinc-100 dark:bg-zinc-800")}>
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Daily Revenue ({getDateRangeLabel(dateRange)})</h2>
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
              "bg-white dark:bg-zinc-900/70",
              "border border-zinc-100 dark:border-zinc-800",
              "shadow-sm backdrop-blur-xl"
            )}
          >
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className={cn("p-2 rounded-lg", "bg-zinc-100 dark:bg-zinc-800")}>
                  <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Transaction Volume ({getDateRangeLabel(dateRange)})</h2>
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
              "bg-white dark:bg-zinc-900/70",
              "border border-zinc-100 dark:border-zinc-800",
              "shadow-sm backdrop-blur-xl"
            )}
          >
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className={cn("p-2 rounded-lg", "bg-zinc-100 dark:bg-zinc-800")}>
                  <Percent className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Fee Breakdown by Type</h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400">#</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400">Type</th>
                    <th className="px-3 py-2 text-right font-semibold text-zinc-600 dark:text-zinc-400">Count</th>
                    <th className="px-3 py-2 text-right font-semibold text-zinc-600 dark:text-zinc-400">Volume</th>
                    <th className="px-3 py-2 text-right font-semibold text-zinc-600 dark:text-zinc-400">Fees Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center">
                        <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1 text-zinc-400" />
                        <p className="text-zinc-500">Loading...</p>
                      </td>
                    </tr>
                  ) : breakdown.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">No data</td>
                    </tr>
                  ) : (
                    breakdown.map((item, index) => (
                      <tr key={item.type} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="px-3 py-2 text-zinc-500 font-mono">{index + 1}</td>
                        <td className="px-3 py-2">
                          <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px]">
                            {item.type}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-zinc-700 dark:text-zinc-300">{item.count}</td>
                        <td className="px-3 py-2 text-right font-mono text-zinc-700 dark:text-zinc-300">{formatCurrency(item.volume)}</td>
                        <td className="px-3 py-2 text-right font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                          {formatCurrency(item.fees)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bank Partnerships */}
          <div
            className={cn(
              "rounded-xl overflow-hidden",
              "bg-white dark:bg-zinc-900/70",
              "border border-zinc-100 dark:border-zinc-800",
              "shadow-sm backdrop-blur-xl"
            )}
          >
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className={cn("p-2 rounded-lg", "bg-zinc-100 dark:bg-zinc-800")}>
                  <Landmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Bank & Mobile Money Partnerships</h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400">#</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400">Partner</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400">Type</th>
                    <th className="px-3 py-2 text-center font-semibold text-zinc-600 dark:text-zinc-400">Status</th>
                    <th className="px-3 py-2 text-right font-semibold text-zinc-600 dark:text-zinc-400">Monthly Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {partnerships.map((partner, index) => (
                    <tr key={partner.name} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="px-3 py-2 text-zinc-500 font-mono">{index + 1}</td>
                      <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">{partner.name}</td>
                      <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{partner.type}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-medium",
                          partner.status === "active"
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
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
            "bg-white dark:bg-zinc-900/70",
            "border border-zinc-100 dark:border-zinc-800",
            "shadow-sm backdrop-blur-xl"
          )}
        >
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className={cn("p-2 rounded-lg", "bg-zinc-100 dark:bg-zinc-800")}>
                <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Premium Subscriptions & Licensing</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400">#</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400">Tier</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400">Features</th>
                  <th className="px-3 py-2 text-right font-semibold text-zinc-600 dark:text-zinc-400">Users</th>
                  <th className="px-3 py-2 text-right font-semibold text-zinc-600 dark:text-zinc-400">Monthly Fee</th>
                  <th className="px-3 py-2 text-right font-semibold text-zinc-600 dark:text-zinc-400">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {premiumTiers.map((tier, index) => (
                  <tr key={tier.tier} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-3 py-2 text-zinc-500 font-mono">{index + 1}</td>
                    <td className="px-3 py-2">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-medium",
                        tier.tier === "Enterprise" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" :
                        tier.tier === "Business" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" :
                        tier.tier === "Pro" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" :
                        "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                      )}>
                        {tier.tier}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{tier.features}</td>
                    <td className="px-3 py-2 text-right font-mono text-zinc-700 dark:text-zinc-300">{tier.users}</td>
                    <td className="px-3 py-2 text-right font-mono text-zinc-700 dark:text-zinc-300">{formatCurrency(tier.monthlyFee)}</td>
                    <td className="px-3 py-2 text-right font-mono text-amber-600 dark:text-amber-400 font-medium">
                      {formatCurrency(tier.users * tier.monthlyFee)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-zinc-50 dark:bg-zinc-800/50 font-semibold">
                  <td colSpan={3} className="px-3 py-2 text-zinc-900 dark:text-zinc-100">Total Premium Revenue</td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-700 dark:text-zinc-300">
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
            "bg-gradient-to-r from-emerald-500 to-emerald-600",
            "border border-emerald-400/20",
            "shadow-sm"
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Total Platform Revenue (Monthly)</h3>
              <p className="text-xs text-emerald-100">Transaction fees + Premium subscriptions + Partnership fees</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">
                {formatCurrency(stats.totalPlatformFees + totalPremiumRevenue + totalPartnershipRevenue)}
              </p>
              <div className="flex items-center gap-1 text-emerald-100 text-xs">
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
