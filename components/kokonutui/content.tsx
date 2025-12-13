"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Mic, CreditCard, Wallet, TrendingUp, Users, DollarSign, ArrowUpRight, ArrowRight } from "lucide-react"
import Link from "next/link"

interface Stats {
  totalUsers: number
  totalTransactions: number
  totalVolume: number
  totalFees: number
  activeVoiceSessions: number
}

export default function Content() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalTransactions: 0,
    totalVolume: 0,
    totalFees: 0,
    activeVoiceSessions: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch users count
        const { count: usersCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })

        // Fetch transactions
        const { data: transactions } = await supabase
          .from("transactions")
          .select("amount, platform_fee")

        // Fetch active voice sessions
        const { count: voiceCount } = await supabase
          .from("voice_sessions")
          .select("*", { count: "exact", head: true })
          .eq("status", "active")

        const totalVolume = transactions?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0
        const totalFees = transactions?.reduce((sum, tx) => sum + (tx.platform_fee || 0), 0) || 0

        setStats({
          totalUsers: usersCount || 0,
          totalTransactions: transactions?.length || 0,
          totalVolume,
          totalFees,
          activeVoiceSessions: voiceCount || 0,
        })
      } catch (err) {
        console.error("Failed to fetch stats:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-4">
      {/* Welcome Header */}
      <div
        className={cn(
          "p-4 rounded-xl",
          "bg-gradient-to-r from-emerald-500 to-emerald-600",
          "border border-emerald-400/20",
          "shadow-sm"
        )}
      >
        <h1 className="text-lg font-semibold text-white mb-1">Welcome to Ongea Pesa Admin</h1>
        <p className="text-xs text-emerald-100">Monitor your platform performance and manage users</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Users", value: loading ? "..." : stats.totalUsers, icon: Users, color: "text-blue-600 dark:text-blue-400", href: "/admin-analytics/users" },
          { label: "Transactions", value: loading ? "..." : stats.totalTransactions, icon: CreditCard, color: "text-purple-600 dark:text-purple-400", href: "/admin-analytics/transactions" },
          { label: "Platform Revenue", value: loading ? "..." : formatCurrency(stats.totalFees), icon: DollarSign, color: "text-emerald-600 dark:text-emerald-400", href: "/admin" },
          { label: "Voice Sessions", value: loading ? "..." : stats.activeVoiceSessions, icon: Mic, color: "text-orange-600 dark:text-orange-400", href: "/admin-analytics/voice-sessions" },
        ].map((stat, i) => (
          <Link key={i} href={stat.href}>
            <div
              className={cn(
                "p-4 rounded-xl",
                "bg-white dark:bg-zinc-900/70",
                "border border-zinc-100 dark:border-zinc-800",
                "shadow-sm backdrop-blur-xl",
                "hover:border-zinc-300 dark:hover:border-zinc-600",
                "transition-all duration-200 cursor-pointer"
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
          </Link>
        ))}
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
              { label: "Total Volume", value: formatCurrency(stats.totalVolume), color: "text-zinc-900 dark:text-zinc-100" },
              { label: "Platform Fees Earned", value: formatCurrency(stats.totalFees), color: "text-emerald-600 dark:text-emerald-400" },
              { label: "Avg Transaction", value: formatCurrency(stats.totalVolume / (stats.totalTransactions || 1)), color: "text-zinc-900 dark:text-zinc-100" },
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
          <div className="p-3 space-y-2">
            <Link href="/admin">
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
          </div>
        </div>
      </div>
    </div>
  )
}
