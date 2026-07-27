"use client"

import { useEffect, useMemo, useState } from "react"
import { Fingerprint, Smartphone, WalletCards } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { FluidNav, mobileNavItems } from "@/components/foundation"

export default function PaymentMethods() {
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const [profile, setProfile] = useState<{ mpesa_number?: string; phone_number?: string; wallet_balance?: number } | null>(null)
  const [passkeys, setPasskeys] = useState(0)
  useEffect(() => { if (!user?.id) return; Promise.all([supabase.from("profiles").select("mpesa_number,phone_number,wallet_balance").eq("id", user.id).maybeSingle(), supabase.from("webauthn_credentials").select("id", { count: "exact", head: true }).eq("user_id", user.id)]).then(([p, k]) => { setProfile(p.data); setPasskeys(k.count || 0) }) }, [supabase, user?.id])
  const phone = profile?.mpesa_number || profile?.phone_number
  const masked = phone ? `${phone.slice(0, 4)} ••• ${phone.slice(-3)}` : "Not connected"
  return <main id="main-content" className="orbital-page"><section className="orbital-screen mx-auto max-w-3xl"><header><span className="orbital-label flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[hsl(var(--mint))]" />Payments</span><h1 className="orbital-display mt-5 text-5xl">Payment methods</h1><p className="mt-3 text-sm opacity-55">Only methods connected to your account appear here.</p></header><div className="mt-10 divide-y divide-black/10 dark:divide-white/10"><article className="flex min-h-24 items-center gap-4"><span className="grid h-12 w-12 place-items-center rounded-full bg-[hsl(var(--mint)/.14)]"><WalletCards className="h-5 w-5 text-[hsl(var(--teal))]" /></span><div className="flex-1"><h2 className="font-semibold">Ongea wallet</h2><p className="mt-1 text-xs opacity-55">Available balance</p></div><p className="orbital-display text-2xl">KSh {Math.round(profile?.wallet_balance || 0).toLocaleString("en-KE")}</p></article><article className="flex min-h-24 items-center gap-4"><span className="grid h-12 w-12 place-items-center rounded-full bg-[hsl(var(--mint)/.14)]"><Smartphone className="h-5 w-5 text-[hsl(var(--teal))]" /></span><div className="flex-1"><h2 className="font-semibold">M-Pesa</h2><p className="orbital-data mt-1 text-xs opacity-55">{masked}</p></div><span className={`h-2 w-2 rounded-full ${phone ? "bg-[hsl(var(--mint))]" : "bg-black/20"}`} /></article><article className="flex min-h-24 items-center gap-4"><span className="grid h-12 w-12 place-items-center rounded-full bg-[hsl(var(--mint)/.14)]"><Fingerprint className="h-5 w-5 text-[hsl(var(--teal))]" /></span><div className="flex-1"><h2 className="font-semibold">Passkey protection</h2><p className="mt-1 text-xs opacity-55">{passkeys ? `${passkeys} device${passkeys === 1 ? "" : "s"} enrolled` : "No passkey enrolled"}</p></div><span className={`h-2 w-2 rounded-full ${passkeys ? "bg-[hsl(var(--mint))]" : "bg-black/20"}`} /></article></div></section><FluidNav items={mobileNavItems} /></main>
}
