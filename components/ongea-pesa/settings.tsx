"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Bell, ChevronRight, Fingerprint, Globe2, HelpCircle, Languages, LogOut, Mic2, MoonStar, ShieldCheck, SunMedium, UsersRound } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"
import { FluidNav, mobileNavItems } from "@/components/foundation"

const rows = [
  { label: "Security center", detail: "PIN, passkeys and account protection", href: "/security-setup", icon: ShieldCheck },
  { label: "Permissions", detail: "Microphone, camera and notifications", href: "/permissions", icon: Mic2 },
  { label: "Family & friends", detail: "People you support", href: "/?screen=dependants", icon: UsersRound },
  { label: "Help & support", detail: "Answers and ways to reach us", href: "/support", icon: HelpCircle },
]

export default function Settings() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <main id="main-content" className="orbital-page">
      <section className="orbital-screen mx-auto max-w-3xl">
        <header><span className="orbital-label flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[hsl(var(--mint))]" />Account</span><h1 className="orbital-display mt-5 text-5xl">Profile & settings</h1><p className="mt-3 text-sm opacity-55">{user?.email}</p></header>

        <div className="mt-10">
          <p className="orbital-label mb-3 opacity-50">Appearance</p>
          <div className="orbital-panel grid grid-cols-3 gap-1 p-1.5">
            {(["system", "light", "dark"] as const).map((value) => {
              const Icon = value === "system" ? Globe2 : value === "light" ? SunMedium : MoonStar
              return <button key={value} onClick={() => setTheme(value)} className={`flex min-h-14 items-center justify-center gap-2 rounded-xl text-sm capitalize ${mounted && theme === value ? "bg-[hsl(var(--ink))] text-white dark:bg-[hsl(var(--mint))] dark:text-[hsl(var(--ink))]" : ""}`}><Icon className="h-4 w-4" />{value}</button>
            })}
          </div>
        </div>

        <div className="mt-8">
          <p className="orbital-label mb-3 opacity-50">Preferences & trust</p>
          <div className="divide-y divide-black/8 dark:divide-white/8">{rows.map((row) => <button key={row.label} onClick={() => router.push(row.href)} className="flex min-h-[4.8rem] w-full items-center gap-4 text-left"><row.icon className="h-5 w-5 text-[hsl(var(--teal))]" strokeWidth={1.5} /><span className="flex-1"><strong className="block text-sm font-medium">{row.label}</strong><small className="mt-1 block text-xs opacity-50">{row.detail}</small></span><ChevronRight className="h-4 w-4 opacity-35" /></button>)}</div>
        </div>

        <button onClick={signOut} className="mt-8 flex min-h-12 items-center gap-3 text-sm text-red-600"><LogOut className="h-5 w-5" />Sign out</button>
      </section>
      <FluidNav items={mobileNavItems} />
    </main>
  )
}
