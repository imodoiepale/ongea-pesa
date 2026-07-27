"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera, Eye, EyeOff, Plus, Send, Settings2 } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { OngeaWordmark, VoiceGlyph } from "@/components/foundation"
import BalanceSheet from "./balance-sheet"
import PWAInstallPrompt from "./pwa-install-prompt"

type Screen = "dashboard" | "voice" | "send" | "recurring" | "analytics" | "test" | "permissions" | "scanner" | "batch"

interface MainDashboardProps {
  onNavigate?: (screen: Screen) => void
  onVoiceActivate?: () => void
  onOpenScanner?: () => void
}

export default function MainDashboard({ onNavigate, onOpenScanner }: MainDashboardProps) {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [balance, setBalance] = useState<number | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [hidden, setHidden] = useState(false)

  const firstName = String(user?.user_metadata?.full_name || user?.email?.split("@")[0] || "there").split(" ")[0]

  useEffect(() => {
    setHidden(localStorage.getItem("hide-balance") === "true")
  }, [])

  useEffect(() => {
    if (!user?.id) return
    let active = true
    fetch("/api/balance").then(async (response) => {
      if (!active) return
      const body = response.ok ? await response.json() : null
      setBalance(Number(body?.balance ?? 0))
    }).catch(() => active && setBalance(0))

    const channel = supabase.channel("orbital-home-balance").on("postgres_changes", {
      event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}`,
    }, (payload) => setBalance(Number(payload.new?.wallet_balance ?? 0))).subscribe()
    return () => { active = false; void supabase.removeChannel(channel) }
  }, [supabase, user?.id])

  const go = (screen: Screen, route?: string) => onNavigate ? onNavigate(screen) : router.push(route || `/${screen}`)

  return (
    <main id="main-content" className="orbital-page">
      <section className="orbital-screen max-w-[31rem] flex min-h-[100dvh] flex-col">
        <header className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[hsl(var(--mint))]" /><span className="orbital-label">Home</span></div>
          <button onClick={() => router.push("/settings")} className="grid h-11 w-11 place-items-center rounded-full" aria-label="Open settings"><Settings2 className="h-5 w-5" strokeWidth={1.5} /></button>
        </header>

        <div className="mt-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm opacity-70">Good morning,</p>
            <h1 className="font-[family-name:var(--font-label)] text-xl font-medium text-[hsl(var(--mint))]">{firstName}</h1>
          </div>
          <OngeaWordmark compact className="scale-90 origin-right opacity-80" />
        </div>

        <div className="relative z-10 mt-5">
          <div className="flex items-center justify-between">
            <span className="orbital-label opacity-65">Balance</span>
            <button
              className="grid h-11 w-11 place-items-center rounded-full opacity-65"
              aria-label={hidden ? "Show balance" : "Hide balance"}
              onClick={() => setHidden((value) => { localStorage.setItem("hide-balance", String(!value)); return !value })}
            >{hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
          </div>
          <button onClick={() => setSheetOpen(true)} className="block text-left" aria-label="Open wallet balance">
            <span className="orbital-display block text-[2rem]">KSh</span>
            <span className="orbital-display block text-[clamp(3.6rem,17vw,5.35rem)] tabular-nums">
              {balance === null ? "—" : hidden ? "•••••" : Math.round(balance).toLocaleString("en-KE")}
            </span>
            <span className="mt-2 flex items-center gap-2 text-xs opacity-65">Available <i className="h-2 w-2 rounded-full bg-[hsl(var(--mint))] not-italic" /></span>
          </button>
        </div>

        <div className="relative -mx-4 -mt-5 flex min-h-[17rem] flex-1 items-center justify-center" aria-hidden="true">
          <span className="h-20 w-20 rounded-full border border-[hsl(var(--mint)/.35)] shadow-[0_0_60px_hsl(var(--cyan)/.2)]" />
        </div>

        <button onClick={() => go("voice", "/voice")} className="mb-5 text-center font-[family-name:var(--font-display)] text-xl text-[hsl(var(--mint))]">
          Say what you need
        </button>

        <div className="orbital-panel mx-auto grid w-full max-w-sm grid-cols-3 overflow-hidden rounded-[1.7rem] py-2">
          <button onClick={() => go("send")} className="flex min-h-14 flex-col items-center justify-center gap-1 border-r border-current/10 text-xs"><Send className="h-5 w-5" strokeWidth={1.5} />Send</button>
          <button onClick={() => setSheetOpen(true)} className="flex min-h-14 flex-col items-center justify-center gap-1 border-r border-current/10 text-xs"><Plus className="h-5 w-5" strokeWidth={1.5} />Add</button>
          <button onClick={() => onOpenScanner ? onOpenScanner() : go("scanner", "/scanner")} className="flex min-h-14 flex-col items-center justify-center gap-1 text-xs"><Camera className="h-5 w-5" strokeWidth={1.5} />Scan</button>
        </div>

        <button onClick={() => go("voice", "/voice")} className="sr-only">Open voice assistant <VoiceGlyph /></button>
      </section>

      <BalanceSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} currentBalance={balance ?? 0} onBalanceUpdate={setBalance} />
      <PWAInstallPrompt />
    </main>
  )
}
