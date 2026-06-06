"use client"

import { useState } from "react"
import { ArrowLeft, BarChart3, Mic, TrendingUp, TrendingDown, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScreenShell } from "@/components/foundation"
import { cn } from "@/lib/utils"

type Screen = "dashboard" | "voice" | "send" | "camera" | "recurring" | "analytics" | "test" | "permissions" | "scanner";

interface AnalyticsProps {
  onNavigate: (screen: Screen) => void;
}

export default function Analytics({ onNavigate }: AnalyticsProps) {
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [voiceQuery, setVoiceQuery] = useState("")

  const handleVoiceQuery = () => {
    setIsVoiceMode(true)
    setTimeout(() => {
      setVoiceQuery("Niambie matumizi ya mwezi huu")
      setIsVoiceMode(false)
    }, 2000)
  }

  const spendingCategories = [
    { name: "Food & Dining", amount: "KSh 8,500", percentage: 35, color: "bg-red-500" },
    { name: "Transportation", amount: "KSh 4,200", percentage: 18, color: "bg-blue-500" },
    { name: "Utilities", amount: "KSh 3,800", percentage: 16, color: "bg-brand" },
    { name: "Entertainment", amount: "KSh 2,100", percentage: 9, color: "bg-purple-500" },
    { name: "Shopping", amount: "KSh 5,200", percentage: 22, color: "bg-orange-500" },
  ]

  const monthlyStats = {
    totalSpent: "KSh 23,800",
    totalReceived: "KSh 45,000",
    netSavings: "KSh 21,200",
    transactions: 127,
  }

  return (
    <div className="min-h-[100dvh] bg-background surface-money pb-24">
      <ScreenShell className="pt-0">
        {/* back header */}
        <div className="flex items-center gap-3 pt-6 mb-6">
          <Button variant="ghost" size="icon-sm" onClick={() => onNavigate("dashboard")} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Analytics</h1>
            <p className="text-sm text-muted-foreground">Spending insights & reports</p>
          </div>
        </div>

        {/* Voice query — hairline card */}
        <div className="rounded-2xl border border-border/60 bg-card px-4 py-3 mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Voice Query</p>
            <p className="text-xs text-muted-foreground">Ask: "Niambie matumizi ya mwezi huu"</p>
            {voiceQuery && <p className="text-xs text-brand mt-1 font-medium">Query: "{voiceQuery}"</p>}
          </div>
          <button
            onClick={handleVoiceQuery}
            disabled={isVoiceMode}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 active:scale-[0.97]",
              isVoiceMode ? "bg-red-500/15 text-red-500 animate-pulse cursor-wait" : "bg-brand/10 text-brand hover:bg-brand/15"
            )}
            aria-label="Voice query"
          >
            <Mic className="h-4 w-4" />
          </button>
        </div>

        {/* Monthly stats — 2×2 grid */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">January 2024</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Spent', value: monthlyStats.totalSpent, icon: TrendingDown, color: 'text-destructive', bg: 'bg-destructive/8' },
              { label: 'Total Received', value: monthlyStats.totalReceived, icon: TrendingUp, color: 'text-brand', bg: 'bg-brand/8' },
              { label: 'Net Savings', value: monthlyStats.netSavings, icon: DollarSign, color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { label: 'Transactions', value: String(monthlyStats.transactions), icon: BarChart3, color: 'text-violet-500', bg: 'bg-violet-500/10' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-border/60 bg-card px-4 py-3">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-2", stat.bg)}>
                  <stat.icon className={cn("h-4 w-4", stat.color)} />
                </div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={cn("text-base font-bold mt-0.5", stat.color)} style={{ fontVariantNumeric: 'tabular-nums' }}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Spending categories */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">By Category</p>
          <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40">
            {spendingCategories.map((cat) => (
              <div key={cat.name} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-foreground">{cat.name}</span>
                  <span className="text-sm font-semibold text-foreground">{cat.amount}</span>
                </div>
                <div className="w-full bg-border/40 rounded-full h-1.5">
                  <div className={cn(cat.color, "h-1.5 rounded-full transition-all duration-500")} style={{ width: `${cat.percentage}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{cat.percentage}% of spending</p>
              </div>
            ))}
          </div>
        </div>

        {/* Voice summary */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Voice Summary</p>
          <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40">
            {[
              { label: 'Play in Swahili', onClick: () => alert('Playing: "Mwezi huu umetumia shilingi elfu ishirini na tatu mia nane..."') },
              { label: 'Play in English', onClick: () => alert('Playing: "This month you spent 23,800 shillings..."') },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors active:scale-[0.99]"
              >
                <Mic className="h-4 w-4 text-brand shrink-0" />
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* AI Insights */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">AI Insights</p>
          <div className="space-y-2">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/8 px-4 py-3">
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">💡 Spending Alert</p>
              <p className="text-xs text-muted-foreground mt-1">Your food spending increased by 15% this month. Consider setting a budget limit.</p>
            </div>
            <div className="rounded-2xl border border-brand/20 bg-brand/8 px-4 py-3">
              <p className="text-sm font-semibold text-brand">✅ Good Progress</p>
              <p className="text-xs text-muted-foreground mt-1">You saved 47% of your income this month. Great job!</p>
            </div>
          </div>
        </div>
      </ScreenShell>
    </div>
  )
}
