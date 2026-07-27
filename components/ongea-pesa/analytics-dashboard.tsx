"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowDownLeft, ArrowUpRight, BarChart3, Loader2, TrendingDown } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { FluidNav, mobileNavItems } from "@/components/foundation"

type Tx = { type: string; amount: number; description?: string; status: string; created_at: string }

export default function AnalyticsDashboard() {
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<Tx[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!user?.id) return
    supabase.from("transactions").select("type,amount,description,status,created_at").eq("user_id", user.id).eq("status", "completed").gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()).then(({ data }) => { setRows((data || []) as Tx[]); setLoading(false) })
  }, [supabase, user?.id])
  const debitTypes = new Set(["send", "send_phone", "paybill", "buy_goods_till", "buy_goods_pochi", "withdraw", "bank_to_mpesa"])
  const income = rows.filter((row) => !debitTypes.has(row.type)).reduce((sum, row) => sum + Number(row.amount), 0)
  const spent = rows.filter((row) => debitTypes.has(row.type)).reduce((sum, row) => sum + Number(row.amount), 0)
  const buckets = rows.filter((row) => debitTypes.has(row.type)).reduce<Record<string, number>>((acc, row) => { const label = row.type.includes("paybill") ? "Bills" : row.type.includes("buy_goods") ? "Shopping" : row.type.includes("withdraw") ? "Cash" : "Transfers"; acc[label] = (acc[label] || 0) + Number(row.amount); return acc }, {})
  const max = Math.max(...Object.values(buckets), 1)

  return <main id="main-content" className="orbital-page orbital-dark"><section className="orbital-screen mx-auto max-w-3xl"><header><span className="orbital-label flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[hsl(var(--mint))]" />Insights</span><h1 className="orbital-display mt-5 text-5xl">Your money,<br /><span className="text-[hsl(var(--mint))]">in motion.</span></h1><p className="mt-3 text-sm text-white/55">Last 30 days · completed transactions only</p></header>{loading ? <div className="grid min-h-80 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-[hsl(var(--mint))]" /></div> : <><div className="mt-10 grid grid-cols-2 gap-4"><article><ArrowDownLeft className="h-5 w-5 text-[hsl(var(--mint))]" /><p className="orbital-label mt-5 text-white/45">Money in</p><p className="orbital-display mt-2 text-4xl">KSh {Math.round(income).toLocaleString("en-KE")}</p></article><article><ArrowUpRight className="h-5 w-5 text-[hsl(var(--warm-gold))]" /><p className="orbital-label mt-5 text-white/45">Money out</p><p className="orbital-display mt-2 text-4xl">KSh {Math.round(spent).toLocaleString("en-KE")}</p></article></div><div className="orbital-divider my-10" /><section><div className="flex items-center justify-between"><h2 className="orbital-display text-3xl">Where it went</h2><BarChart3 className="h-5 w-5 text-[hsl(var(--mint))]" /></div>{Object.keys(buckets).length === 0 ? <div className="py-20 text-center text-sm text-white/50"><TrendingDown className="mx-auto mb-4 h-8 w-8" />No completed spending this month.</div> : <div className="mt-7 space-y-6">{Object.entries(buckets).sort((a,b) => b[1]-a[1]).map(([label, value]) => <div key={label}><div className="mb-2 flex justify-between text-sm"><span>{label}</span><span className="orbital-data">KSh {Math.round(value).toLocaleString("en-KE")}</span></div><div className="h-1 rounded-full bg-white/10"><div className="h-full rounded-full bg-[hsl(var(--mint))]" style={{ width: `${Math.max(4, value / max * 100)}%` }} /></div></div>)}</div>}</section></>}</section><FluidNav items={mobileNavItems} /></main>
}
