"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Mic, CreditCard, Wallet, TrendingUp, Users, DollarSign, ArrowUpRight, ArrowRight, Activity, Clock, RefreshCw, Calendar } from "lucide-react"
import Link from "next/link"
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
} from "recharts"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Platform fee rate: 0.05% (deposits have 0% fee)
const PLATFORM_FEE_RATE = 0.0005

// Date range options
type DateRange = "today" | "yesterday" | "7days" | "30days" | "this_month" | "last_month" | "all"

const getDateRange = (range: DateRange): { start: Date; end: Date } => {
  const now = new Date()
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  
  let start = new Date(now)
  start.setHours(0, 0, 0, 0)
  
  switch (range) {
    case "today":
      break
    case "yesterday":
      start.setDate(start.getDate() - 1)
      end.setDate(end.getDate() - 1)
      break
    case "7days":
      start.setDate(start.getDate() - 6)
      break
    case "30days":
      start.setDate(start.getDate() - 29)
      break
    case "this_month":
      start.setDate(1)
      break
    case "last_month":
      start.setMonth(start.getMonth() - 1)
      start.setDate(1)
      end.setDate(0) // Last day of previous month
      break
    case "all":
      start = new Date(2020, 0, 1) // Far back date
      break
  }
  
  return { start, end }
}

const getDateRangeLabel = (range: DateRange): string => {
  switch (range) {
    case "today": return "Today"
    case "yesterday": return "Yesterday"
    case "7days": return "Last 7 Days"
    case "30days": return "Last 30 Days"
    case "this_month": return "This Month"
    case "last_month": return "Last Month"
    case "all": return "All Time"
    default: return "Custom"
  }
}

interface Stats {
  totalUsers: number
  totalTransactions: number
  totalVolume: number
  totalFees: number
  activeVoiceSessions: number
  completedTransactions: number
  pendingTransactions: number
  todayTransactions: number
  todayVolume: number
  todayFees: number
}

interface DailyData {
  date: string
  revenue: number
  transactions: number
  volume: number
}

interface TypeBreakdown {
  type: string
  count: number
  volume: number
  fees: number
}

export default function Content() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalTransactions: 0,
    totalVolume: 0,
    totalFees: 0,
    activeVoiceSessions: 0,
    completedTransactions: 0,
    pendingTransactions: 0,
    todayTransactions: 0,
    todayVolume: 0,
    todayFees: 0,
  })
  const [dailyData, setDailyData] = useState<DailyData[]>([])
  const [typeBreakdown, setTypeBreakdown] = useState<TypeBreakdown[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>("30days")
  const supabase = createClient()

  const fetchStats = useCallback(async () => {
    setLoading(true)
    const { start, end } = getDateRange(dateRange)
    try {
      // Fetch users count
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })

      // Fetch transactions within date range
      const { data: transactions } = await supabase
        .from("transactions")
        .select("type, amount, status, created_at")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: false })

      // Fetch active voice sessions
      const { count: voiceCount } = await supabase
        .from("voice_sessions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")

      // Calculate fees client-side (deposits have 0% fee)
      const txWithFees = (transactions || []).map(tx => {
        const isDeposit = tx.type?.toLowerCase() === "deposit"
        return {
          ...tx,
          calculated_fee: isDeposit ? 0 : (tx.amount || 0) * PLATFORM_FEE_RATE
        }
      })

      const completedTx = txWithFees.filter(tx => tx.status === "completed")
      const pendingTx = txWithFees.filter(tx => tx.status === "pending")
      
      const totalVolume = completedTx.reduce((sum, tx) => sum + (tx.amount || 0), 0)
      const totalFees = completedTx.reduce((sum, tx) => sum + tx.calculated_fee, 0)

      // Today's stats (always show today regardless of filter)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayTx = completedTx.filter(tx => new Date(tx.created_at) >= today)
      const todayVolume = todayTx.reduce((sum, tx) => sum + (tx.amount || 0), 0)
      const todayFees = todayTx.reduce((sum, tx) => sum + tx.calculated_fee, 0)

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

      for (const tx of completedTx) {
        const dateStr = new Date(tx.created_at).toISOString().split("T")[0]
        const existing = dailyMap.get(dateStr)
        if (existing) {
          existing.revenue += tx.calculated_fee
          existing.transactions++
          existing.volume += tx.amount || 0
        }
      }

      // Calculate breakdown by type
      const typeMap = new Map<string, TypeBreakdown>()
      for (const tx of completedTx) {
        const existing = typeMap.get(tx.type) || { type: tx.type, count: 0, volume: 0, fees: 0 }
        existing.count++
        existing.volume += tx.amount || 0
        existing.fees += tx.calculated_fee
        typeMap.set(tx.type, existing)
      }

      setStats({
        totalUsers: usersCount || 0,
        totalTransactions: transactions?.length || 0,
        totalVolume,
        totalFees,
        activeVoiceSessions: voiceCount || 0,
        completedTransactions: completedTx.length,
        pendingTransactions: pendingTx.length,
        todayTransactions: todayTx.length,
        todayVolume,
        todayFees,
      })

      setDailyData(Array.from(dailyMap.values()))
      setTypeBreakdown(Array.from(typeMap.values()).sort((a, b) => b.fees - a.fees))
      setLastUpdated(new Date())
    } catch (err) {
      console.error("Failed to fetch stats:", err)
    } finally {
      setLoading(false)
    }
  }, [dateRange, supabase])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-4">
      {/* Header with Date Filter and Refresh */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Admin Dashboard</h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">Platform overview and analytics</p>
        </div>
        {/* Live Status Bar */}
        <div className={cn(
          "flex items-center gap-4 px-4 py-2 rounded-xl",
          "bg-emerald-50 dark:bg-emerald-900/20",
          "border border-emerald-200 dark:border-emerald-800"
        )}>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Live Data</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">• {getDateRangeLabel(dateRange)}</span>
          </div>
          {lastUpdated && (
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
              <Clock className="w-3 h-3" />
              {lastUpdated.toLocaleTimeString("en-KE")}
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
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={fetchStats}
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

      {/* Total Revenue Card - TOP */}
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
            <h3 className="text-sm font-semibold text-white">Platform Revenue ({getDateRangeLabel(dateRange)})</h3>
            <p className="text-xs text-emerald-100">Fees earned (0.05% on transactions, deposits free)</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">
              {loading ? "..." : formatCurrency(stats.totalFees)}
            </p>
            <div className="flex items-center gap-1 text-emerald-100 text-xs justify-end">
              <ArrowUpRight className="w-3 h-3" />
              <span>{stats.completedTransactions} completed transactions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - 6 cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Users", value: loading ? "..." : stats.totalUsers, icon: Users, color: "text-blue-600 dark:text-blue-400", href: "/admin-analytics/users" },
          { label: "All Transactions", value: loading ? "..." : stats.totalTransactions, icon: CreditCard, color: "text-purple-600 dark:text-purple-400", href: "/admin-analytics/transactions" },
          { label: "Completed", value: loading ? "..." : stats.completedTransactions, icon: CreditCard, color: "text-emerald-600 dark:text-emerald-400", href: "/admin-analytics/transactions" },
          { label: "Pending", value: loading ? "..." : stats.pendingTransactions, icon: Clock, color: "text-amber-600 dark:text-amber-400", href: "/admin-analytics/transactions" },
          { label: "Voice Sessions", value: loading ? "..." : stats.activeVoiceSessions, icon: Mic, color: "text-orange-600 dark:text-orange-400", href: "/admin-analytics/voice-sessions" },
          { label: "Today Volume", value: loading ? "..." : formatCurrency(stats.todayVolume), icon: TrendingUp, color: "text-cyan-600 dark:text-cyan-400", href: "/admin-analytics/revenue" },
        ].map((stat, i) => (
          <Link key={i} href={stat.href}>
            <div
              className={cn(
                "p-3 rounded-xl",
                "bg-white dark:bg-zinc-900/70",
                "border border-zinc-100 dark:border-zinc-800",
                "shadow-sm backdrop-blur-xl",
                "hover:border-zinc-300 dark:hover:border-zinc-600",
                "transition-all duration-200 cursor-pointer"
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn("p-1.5 rounded-lg", "bg-zinc-100 dark:bg-zinc-800")}>
                  <stat.icon className={cn("w-3.5 h-3.5", stat.color)} />
                </div>
                <div>
                  <p className={cn("text-sm font-semibold", stat.color)}>{stat.value}</p>
                  <p className="text-[10px] text-zinc-600 dark:text-zinc-400">{stat.label}</p>
                </div>
              </div>
            </div>
          </Link>
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
                  tickFormatter={(value) => new Date(value).toLocaleDateString("en-KE", { day: "numeric" })}
                />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => `${(value).toFixed(0)}`} />
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
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Transaction Count ({getDateRangeLabel(dateRange)})</h2>
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
                  formatter={(value: number) => [value, "Transactions"]}
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
        {/* Platform Performance */}
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
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Platform Performance</h2>
            </div>
          </div>
          <div className="p-3 space-y-2">
            {[
              { label: "Total Volume (All Time)", value: formatCurrency(stats.totalVolume), color: "text-zinc-900 dark:text-zinc-100" },
              { label: "Platform Fees Earned", value: formatCurrency(stats.totalFees), color: "text-emerald-600 dark:text-emerald-400" },
              { label: "Avg Transaction Size", value: formatCurrency(stats.totalVolume / (stats.completedTransactions || 1)), color: "text-zinc-900 dark:text-zinc-100" },
              { label: "Fee Rate", value: "0.05% (deposits free)", color: "text-blue-600 dark:text-blue-400" },
              { label: "Today's Volume", value: formatCurrency(stats.todayVolume), color: "text-cyan-600 dark:text-cyan-400" },
              { label: "Today's Fees", value: formatCurrency(stats.todayFees), color: "text-emerald-600 dark:text-emerald-400" },
            ].map((item, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg",
                  "bg-zinc-50 dark:bg-zinc-800/50"
                )}
              >
                <span className="text-[11px] text-zinc-600 dark:text-zinc-400">{item.label}</span>
                <span className={cn("text-xs font-medium", item.color)}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction Type Breakdown */}
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
                <Wallet className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Transaction Breakdown</h2>
            </div>
          </div>
          <div className="p-3 max-h-[200px] overflow-y-auto space-y-2">
            {typeBreakdown.length === 0 ? (
              <div className="text-center text-xs text-zinc-500 py-4">No transaction data</div>
            ) : (
              typeBreakdown.map((item, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg",
                    "bg-zinc-50 dark:bg-zinc-800/50"
                  )}
                >
                  <div>
                    <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 capitalize">{item.type || "unknown"}</span>
                    <span className="text-[10px] text-zinc-500 ml-2">({item.count} tx)</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(item.fees)}</p>
                    <p className="text-[10px] text-zinc-500">{formatCurrency(item.volume)} vol</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
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
              <ArrowUpRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Quick Actions</h2>
          </div>
        </div>
        <div className="p-3 grid grid-cols-1 md:grid-cols-4 gap-2">
          <Link href="/admin-analytics/revenue">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors duration-200">
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Revenue Dashboard</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">View detailed revenue analytics</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </Link>
          <Link href="/admin-analytics/transactions">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200">
              <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <CreditCard className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-300">View All Transactions</p>
                <p className="text-[10px] text-blue-600 dark:text-blue-400">Browse and filter transactions</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
            </div>
          </Link>
          <Link href="/admin-analytics/users">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors duration-200">
              <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-purple-700 dark:text-purple-300">Manage Users</p>
                <p className="text-[10px] text-purple-600 dark:text-purple-400">View user profiles and balances</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
            </div>
          </Link>
          <button
            onClick={async () => {
              try {
                const res = await fetch('/api/gate/poll-pending', { method: 'POST' })
                const data = await res.json()
                alert(`Polled ${data.processed || 0} pending transactions.\nCompleted: ${data.completed || 0}\nFailed: ${data.failed || 0}\nStill Pending: ${data.still_pending || 0}`)
                fetchStats()
              } catch (err) {
                alert('Failed to poll pending transactions')
              }
            }}
            className="flex items-center gap-3 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors duration-200"
          >
            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <RefreshCw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Poll Pending</p>
              <p className="text-[10px] text-amber-600 dark:text-amber-400">Check pending transaction status</p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
          </button>
        </div>
      </div>
    </div>
  )
}
