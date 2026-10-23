"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Layout from "@/components/kokonutui/layout"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// Incoming PayBill/Till payments (Daraja C2B → /api/pay/c2b/confirm → c2b_payments).
// Live via Supabase Realtime; date range filters the initial load.

interface C2BPayment {
  id: string
  trans_id: string
  trans_type: string | null
  amount: number
  shortcode: string
  bill_ref: string | null
  msisdn: string | null
  first_name: string | null
  trans_time: string | null
  created_at: string
}

const today = () => new Date().toISOString().slice(0, 10)

export default function PaybillLivePage() {
  const [rows, setRows] = useState<C2BPayment[]>([])
  const [from, setFrom] = useState(today())
  const [to, setTo] = useState(today())
  const [error, setError] = useState<string | null>(null)
  const [fresh, setFresh] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("c2b_payments")
      .select("*")
      .gte("trans_time", `${from}T00:00:00+03:00`)
      .lte("trans_time", `${to}T23:59:59+03:00`)
      .order("trans_time", { ascending: false })
      .limit(1000)
      .then(({ data, error }) => {
        setError(error?.message ?? null)
        setRows((data as C2BPayment[]) ?? [])
      })

    const channel = supabase
      .channel("c2b-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "c2b_payments" }, (p) => {
        const row = p.new as C2BPayment
        setRows((r) => (r.some((x) => x.id === row.id) ? r : [row, ...r]))
        setFresh(row.id)
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [from, to])

  const total = rows.reduce((s, r) => s + Number(r.amount), 0)

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <h1 className="text-xl font-semibold">PayBill / Till — Live</h1>
            <p className="text-sm text-muted-foreground">
              {rows.length} payments · KES {total.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <label className="ml-auto text-xs">
            From <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="text-xs">
            To <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        {error && <p className="text-sm text-red-600">Failed to load: {error}</p>}
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-2">Time</th>
                <th className="p-2">Receipt</th>
                <th className="p-2">Type</th>
                <th className="p-2">Shortcode</th>
                <th className="p-2">Account</th>
                <th className="p-2">Payer</th>
                <th className="p-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={cn("border-t", r.id === fresh && "bg-emerald-500/10")}>
                  <td className="p-2 whitespace-nowrap">
                    {new Date(r.trans_time ?? r.created_at).toLocaleString("en-KE")}
                  </td>
                  <td className="p-2 font-mono">{r.trans_id}</td>
                  <td className="p-2">{r.trans_type === "Buy Goods" || r.trans_type === "CustomerBuyGoodsOnline" ? "Till" : r.trans_type ?? "—"}</td>
                  <td className="p-2">{r.shortcode}</td>
                  <td className="p-2">{r.bill_ref ?? "—"}</td>
                  <td className="p-2">{[r.first_name, r.msisdn].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="p-2 text-right font-medium">{Number(r.amount).toLocaleString("en-KE")}</td>
                </tr>
              ))}
              {!rows.length && !error && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    No payments in this range yet. New ones appear here automatically.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
