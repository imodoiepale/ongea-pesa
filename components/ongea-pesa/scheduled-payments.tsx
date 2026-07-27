"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays, ChevronRight, Clock3, Loader2, Pause, Play, Plus, Repeat2, Trash2 } from "lucide-react"
import { FluidNav, mobileNavItems } from "@/components/foundation"

type Schedule = { id: string; recipient_label: string; destination: { type: string; value: string; account?: string }; amount: number; frequency: "once" | "weekly" | "monthly"; next_run_at: string; reminder_enabled: boolean; status: "active" | "paused" | "completed" | "cancelled" }

export default function ScheduledPayments() {
  const router = useRouter()
  const [items, setItems] = useState<Schedule[]>([])
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ recipient_label: "", destination: "", amount: "", frequency: "monthly", next_run_at: "", reminder_enabled: true })

  const load = async () => {
    setLoading(true)
    const response = await fetch("/api/schedules")
    const body = await response.json().catch(() => ({}))
    if (response.ok) setItems(body.schedules || []); else setError(body.error || "We couldn't load schedules.")
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  const create = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError("")
    const response = await fetch("/api/schedules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, amount: Number(form.amount), destination: { type: "phone", value: form.destination }, next_run_at: new Date(form.next_run_at).toISOString() }) })
    const body = await response.json().catch(() => ({})); setSaving(false)
    if (!response.ok) { setError(body.error || "We couldn't create the schedule."); return }
    setItems((current) => [...current, body.schedule].sort((a, b) => a.next_run_at.localeCompare(b.next_run_at))); setCreating(false)
  }

  const update = async (id: string, changes: Partial<Schedule>) => {
    const response = await fetch("/api/schedules", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...changes }) })
    const body = await response.json().catch(() => ({}))
    if (response.ok) setItems((current) => current.map((item) => item.id === id ? body.schedule : item)); else setError(body.error || "We couldn't update the schedule.")
  }

  const remove = async (id: string) => {
    const response = await fetch(`/api/schedules?id=${encodeURIComponent(id)}`, { method: "DELETE" })
    if (response.ok) setItems((current) => current.filter((item) => item.id !== id)); else setError("We couldn't remove the schedule.")
  }

  if (creating) return (
    <main id="main-content" className="orbital-page">
      <form onSubmit={create} className="orbital-screen mx-auto flex max-w-[31rem] flex-col">
        <header className="flex items-center justify-between"><button type="button" onClick={() => setCreating(false)} className="min-h-11 px-2 text-xl">←</button><span className="orbital-label">New schedule</span><span className="w-11" /></header>
        <h1 className="orbital-display mt-8 text-5xl">Set it once.</h1><p className="mt-3 text-sm opacity-60">We’ll remind you when it is time to review and approve.</p>
        <div className="mt-10 space-y-5">
          <label className="block"><span className="mb-2 block text-xs">Recipient</span><input required className="orbital-field" placeholder="Mum, KPLC, landlord…" value={form.recipient_label} onChange={(e) => setForm({ ...form, recipient_label: e.target.value })} /></label>
          <label className="block"><span className="mb-2 block text-xs">Phone number</span><input required className="orbital-field orbital-data" inputMode="tel" placeholder="0712 345 678" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></label>
          <label className="block"><span className="mb-2 block text-xs">Amount (KSh)</span><input required min="1" max="1000000" className="orbital-field orbital-display text-4xl" inputMode="decimal" placeholder="2,000" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^\d.]/g, "") })} /></label>
          <div className="grid grid-cols-2 gap-3"><label><span className="mb-2 block text-xs">Frequency</span><select className="orbital-field" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}><option value="once">Once</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label><label><span className="mb-2 block text-xs">First reminder</span><input required className="orbital-field" type="datetime-local" value={form.next_run_at} onChange={(e) => setForm({ ...form, next_run_at: e.target.value })} /></label></div>
        </div>
        {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
        <button disabled={saving} className="orbital-button mt-auto w-full">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}{saving ? "Saving…" : "Create reminder"}</button>
      </form>
    </main>
  )

  return (
    <main id="main-content" className="orbital-page">
      <section className="orbital-screen mx-auto max-w-3xl">
        <header className="flex items-center justify-between"><div><span className="orbital-label flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[hsl(var(--mint))]" />Recurring</span><h1 className="orbital-display mt-5 text-5xl">Coming up</h1></div><button onClick={() => setCreating(true)} className="grid h-12 w-12 place-items-center rounded-full bg-[hsl(var(--ink))] text-white"><Plus className="h-5 w-5" /></button></header>
        <div className="mt-10 space-y-3">
          {loading ? <div className="space-y-3" aria-label="Loading schedules">{[1,2,3].map((n) => <div key={n} className="h-24 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />)}</div> : items.length === 0 ? <div className="py-24 text-center"><Repeat2 className="mx-auto h-10 w-10 text-[hsl(var(--teal))]" /><h2 className="orbital-display mt-5 text-3xl">Nothing scheduled</h2><p className="mx-auto mt-3 max-w-xs text-sm opacity-60">Create a reminder for rent, bills, or anyone you pay regularly.</p><button onClick={() => setCreating(true)} className="orbital-button mt-7">New schedule</button></div> : items.map((item) => <article key={item.id} className="orbital-panel flex items-center gap-4 p-4"><span className="grid h-12 w-12 place-items-center rounded-full bg-[hsl(var(--mint)/.13)] text-[hsl(var(--teal))]"><Clock3 className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h2 className="truncate font-semibold">{item.recipient_label}</h2><p className="orbital-display mt-1 text-2xl">KSh {Number(item.amount).toLocaleString("en-KE")}</p><p className="mt-1 text-xs opacity-55">{item.frequency} · {new Date(item.next_run_at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}</p></div><div className="flex flex-col"><button className="grid h-11 w-11 place-items-center" onClick={() => update(item.id, { status: item.status === "active" ? "paused" : "active" })} aria-label={item.status === "active" ? "Pause schedule" : "Resume schedule"}>{item.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button><button className="grid h-11 w-11 place-items-center text-red-500" onClick={() => remove(item.id)} aria-label="Delete schedule"><Trash2 className="h-4 w-4" /></button></div></article>)}
        </div>
        {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
      </section>
      <FluidNav items={mobileNavItems} />
    </main>
  )
}
