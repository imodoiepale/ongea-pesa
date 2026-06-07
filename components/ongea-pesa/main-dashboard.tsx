"use client"

import {
  Mic,
  Send,
  Camera,
  Calendar,
  BarChart3,
  Settings,
  TestTube,
  Moon,
  Sun,
  LogOut,
  Wallet,
  Plus,
  Shield,
  Eye,
  EyeOff,
  SendHorizonal,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "next-themes"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useVoice } from "@/components/voice-provider"
import { useAuth } from "@/components/providers/auth-provider"
import { createClient } from "@/lib/supabase/client"
import BalanceSheet from "./balance-sheet"
import DependantsSheet from "./dependants-sheet"
import PWAInstallPrompt from "./pwa-install-prompt"
import { PageHeader, ScreenShell } from "@/components/foundation"
import { cn } from "@/lib/utils"

type Screen =
  | "dashboard"
  | "voice"
  | "send"
  | "recurring"
  | "analytics"
  | "test"
  | "permissions"
  | "scanner"
  | "batch"

interface MainDashboardProps {
  onNavigate?: (screen: Screen) => void
  onVoiceActivate?: () => void
  /** Called when the user taps "Pay Scanner" — opens the camera overlay in the parent */
  onOpenScanner?: () => void
}

// Admin emails list
const ADMIN_EMAILS = [
  "ijepale@gmail.com",
  "admin@ongeapesa.com",
  "ongeapesa.kenya@gmail.com",
]

const quickActions: {
  label: string
  desc: string
  screen: Screen
  icon: React.ElementType
  iconBg: string
}[] = [
  {
    label: "Send Money",
    desc: "Voice or manual",
    screen: "send",
    icon: Send,
    iconBg: "bg-brand",
  },
  {
    label: "Multi-Send",
    desc: "Pay multiple at once",
    screen: "batch",
    icon: SendHorizonal,
    iconBg: "bg-emerald-500",
  },
  {
    label: "Pay Scanner",
    desc: "Bills & QR codes",
    screen: "scanner",
    icon: Camera,
    iconBg: "bg-blue-500",
  },
  {
    label: "Recurring",
    desc: "Auto payments",
    screen: "recurring",
    icon: Calendar,
    iconBg: "bg-violet-500",
  },
  {
    label: "Analytics",
    desc: "Spending stats",
    screen: "analytics",
    icon: BarChart3,
    iconBg: "bg-amber-500",
  },
]

const voiceExamples = [
  {
    command: '"Ongea Pesa, tuma 500 kwa John"',
    desc: "Send money to contact",
  },
  {
    command: '"Tuma 200 kwa namba 0712345678"',
    desc: "Send to unsaved number",
  },
  {
    command: '"Angalia salio langu"',
    desc: "Check your balance",
  },
]

export default function MainDashboard({
  onNavigate,
  onVoiceActivate,
  onOpenScanner,
}: MainDashboardProps) {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [balance, setBalance] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [isBalanceSheetOpen, setIsBalanceSheetOpen] = useState(false)
  const [isDependantsSheetOpen, setIsDependantsSheetOpen] = useState(false)
  const [pocketDeposited, setPocketDeposited] = useState<number | null>(null)
  const [hideBalance, setHideBalance] = useState(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("hide-balance") === "true"
  })
  const supabase = createClient()

  // Check if user is admin
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Navigation helper that uses router when onNavigate is not provided
  const handleNavigate = (screen: Screen) => {
    if (onNavigate) {
      onNavigate(screen)
    } else {
      router.push(`/${screen}`)
    }
  }

  // Fetch user balance and setup real-time subscription
  useEffect(() => {
    if (!user?.id) return

    const fetchBalance = async () => {
      setLoading(false) // Remove loading immediately
      try {
        const response = await fetch("/api/balance")
        if (response.ok) {
          const data = await response.json()
          let finalBalance = data.balance || 0

          // If balance is 0, calculate from transactions as fallback
          if (finalBalance === 0) {
            const { data: transactions } = await supabase
              .from("transactions")
              .select("type, amount, status")
              .eq("user_id", user.id)
              .eq("status", "completed")

            if (transactions && transactions.length > 0) {
              finalBalance = transactions.reduce((total, tx) => {
                if (tx.type === "deposit" || tx.type === "receive") {
                  return total + parseFloat(String(tx.amount))
                } else {
                  return total - parseFloat(String(tx.amount))
                }
              }, 0)
              console.log("📊 Calculated from transactions:", finalBalance)
            }
          }

          setBalance(finalBalance)
          console.log("💰 Balance loaded:", finalBalance)
        }
      } catch (error) {
        console.error("Failed to fetch balance:", error)
        setBalance(0)
      }
    }

    fetchBalance()

    // Fetch pocket total_deposited (supplementary — non-blocking)
    const fetchPocket = async () => {
      try {
        const { data } = await supabase
          .from("user_pockets")
          .select("total_deposited")
          .eq("user_id", user.id)
          .single()
        if (data) {
          setPocketDeposited(parseFloat(String(data.total_deposited)) || 0)
        }
      } catch {
        // silent — pocket may not exist yet
      }
    }
    fetchPocket()

    // Set up real-time subscription for balance changes
    const channel = supabase
      .channel("dashboard-balance-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log("✅ Balance updated in real-time:", payload)
          if (payload.new && "wallet_balance" in payload.new) {
            setBalance(payload.new.wallet_balance || 0)
          }
        }
      )
      .subscribe()

    // Cleanup
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, supabase])

  const handleVoiceActivation = () => {
    handleNavigate("voice")
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-[100dvh] bg-background surface-money">
      <ScreenShell className="pt-0 pb-28">
        {/* Page Header */}
        <PageHeader title="Ongea Pesa" subtitle="Voice-first payments">
          {/* Admin Analytics Button — only visible for admins */}
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/admin-analytics")}
              className="rounded-full"
              title="Admin Analytics"
            >
              <Shield className="h-5 w-5 text-brand" />
            </Button>
          )}

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5 text-yellow-500" />
            ) : (
              <Moon className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>

          {/* Settings */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleNavigate("permissions")}
            className="rounded-full"
          >
            <Settings className="h-5 w-5 text-muted-foreground" />
          </Button>

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="User menu"
              >
                <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white font-semibold text-xs">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.email}</p>
                <p className="text-xs text-muted-foreground">
                  Voice-activated payments
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={signOut}
                className="text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </PageHeader>

        {/* Balance Card — centered, with eye toggle */}
        <div className="relative mb-6">
          <button
            onClick={() => setIsBalanceSheetOpen(true)}
            className="w-full rounded-3xl bg-brand p-6 text-center transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Open balance details"
          >
            <p className="text-sm font-medium text-white/80 mb-3">
              Wallet Balance
            </p>
            <p
              className="text-3xl md:text-4xl font-bold tracking-tighter text-white"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {hideBalance
                ? "KSh ••••••"
                : balance.toLocaleString("en-KE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
            </p>
            <p className="text-xs text-white/60 mt-3 flex items-center justify-center gap-1.5">
              <Wallet className="h-3 w-3" />
              {user?.email || "Ongea Pesa Wallet"} · tap to manage
            </p>
          </button>

          {/* Eye toggle — positioned top-right inside the card */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setHideBalance((prev) => {
                const next = !prev
                localStorage.setItem("hide-balance", String(next))
                return next
              })
            }}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 active:scale-90 transition-all text-white"
            aria-label={hideBalance ? "Show balance" : "Hide balance"}
          >
            {hideBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>

        {/* Pocket balance row + dependants shortcut */}
        {pocketDeposited !== null && (
          <div className="flex items-center justify-between px-4 py-3 mb-4 rounded-2xl border border-border/60 bg-card">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                Total Deposited
              </p>
              <p
                className="text-sm font-bold text-foreground mt-0.5"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {hideBalance
                  ? "KSh ••••••"
                  : `KSh ${pocketDeposited.toLocaleString("en-KE", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}`}
              </p>
            </div>
            <button
              onClick={() => setIsDependantsSheetOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted text-muted-foreground hover:bg-muted/70 active:scale-[0.97] transition-all text-xs font-semibold"
            >
              <Users className="h-3.5 w-3.5" />
              Family Top-up
            </button>
          </div>
        )}

        {/* Show family top-up even when pocket not yet loaded */}
        {pocketDeposited === null && (
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setIsDependantsSheetOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted text-muted-foreground hover:bg-muted/70 active:scale-[0.97] transition-all text-xs font-semibold"
            >
              <Users className="h-3.5 w-3.5" />
              Family Top-up
            </button>
          </div>
        )}

        {/* Voice Activation Button */}
        <div className="flex justify-center mb-8">
          {/* Outer shell */}
          <div className="p-1.5 bg-brand/8 border border-brand/20 rounded-full">
            {/* Inner button */}
            <button
              onClick={handleVoiceActivation}
              className="w-20 h-20 rounded-full bg-brand flex flex-col items-center justify-center gap-1 shadow-md active:scale-[0.97] transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Activate voice assistant"
            >
              <Mic className="h-7 w-7 text-white" />
              <span className="text-[10px] font-semibold text-white/90">
                Speak
              </span>
            </button>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() =>
                action.screen === "scanner" && onOpenScanner
                  ? onOpenScanner()
                  : handleNavigate(action.screen)
              }
              className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-card border border-border/60 hover:border-border hover:shadow-sm transition-all duration-200 active:scale-[0.97] text-left"
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  action.iconBg
                )}
              >
                <action.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {action.label}
                </p>
                <p className="text-xs text-muted-foreground">{action.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Voice Commands Section */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
            Voice Commands
          </h2>
          <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40">
            {voiceExamples.map((ex) => (
              <div
                key={ex.command}
                className="px-4 py-3 flex items-start gap-3"
              >
                <Mic className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {ex.command}
                  </p>
                  <p className="text-xs text-muted-foreground">{ex.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Voice Test Mode */}
        <button
          onClick={() => handleNavigate("test")}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/60 hover:border-border hover:shadow-sm transition-all duration-200 active:scale-[0.97] mb-6"
        >
          <div className="w-10 h-10 bg-violet-500 rounded-xl flex items-center justify-center shrink-0">
            <TestTube className="h-5 w-5 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">
              Voice Test Mode
            </p>
            <p className="text-xs text-muted-foreground">
              Test voice commands &amp; responses
            </p>
          </div>
        </button>
      </ScreenShell>

      {/* Floating Add Balance Button — outside ScreenShell */}
      <Button
        onClick={() => setIsBalanceSheetOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-brand hover:bg-brand/90 shadow-lg shadow-brand/20 hover:shadow-brand/30 transition-all duration-200 active:scale-[0.97] z-40"
        size="icon"
        aria-label="Add balance"
      >
        <Plus className="h-6 w-6 text-white" />
      </Button>

      {/* Balance Sheet — outside ScreenShell (modal/fixed) */}
      <BalanceSheet
        isOpen={isBalanceSheetOpen}
        onClose={() => setIsBalanceSheetOpen(false)}
        currentBalance={balance}
        onBalanceUpdate={(newBalance) => {
          setBalance(newBalance)
          console.log("✅ Balance updated to:", newBalance)
        }}
      />

      {/* Dependants Sheet — outside ScreenShell */}
      <DependantsSheet
        isOpen={isDependantsSheetOpen}
        onClose={() => setIsDependantsSheetOpen(false)}
      />

      {/* PWA Install Prompt — outside ScreenShell */}
      <PWAInstallPrompt />
    </div>
  )
}
