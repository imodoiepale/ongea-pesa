"use client"

import { useState } from "react"
import { Fingerprint, Grid3X3, Loader2, ShieldCheck, X } from "lucide-react"
import { verifyPasskeyForStepUp, verifyPinForStepUp } from "@/lib/security-client"

export function StepUpSheet({ open, title, description, onClose, onVerified }: { open: boolean; title: string; description?: string; onClose: () => void; onVerified: (token: string) => Promise<void> | void }) {
  const [pin, setPin] = useState("")
  const [busy, setBusy] = useState<"passkey" | "pin" | "action" | null>(null)
  const [error, setError] = useState("")
  if (!open) return null

  const finish = async (method: "passkey" | "pin") => {
    setBusy(method); setError("")
    try {
      const token = method === "passkey" ? await verifyPasskeyForStepUp() : await verifyPinForStepUp(pin)
      setBusy("action"); await onVerified(token); setPin("")
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Verification failed.") }
    finally { setBusy(null) }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[hsl(var(--abyss)/.58)] backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="step-up-title">
      <section className="orbital-page w-full max-w-lg rounded-t-[2rem] px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5 shadow-2xl">
        <header className="flex items-start justify-between"><div><p className="orbital-label text-[hsl(var(--teal))]">Protected action</p><h2 id="step-up-title" className="orbital-display mt-2 text-4xl">{title}</h2>{description && <p className="mt-2 text-sm opacity-60">{description}</p>}</div><button onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full" aria-label="Close verification"><X className="h-5 w-5" /></button></header>
        <button onClick={() => finish("passkey")} disabled={busy !== null} className="mt-7 flex min-h-16 w-full items-center gap-4 rounded-xl border border-black/12 px-4 text-left dark:border-white/12"><Fingerprint className="h-6 w-6 text-[hsl(var(--teal))]" /><span className="flex-1"><strong className="block text-sm">Use a passkey</strong><small className="opacity-55">Face, fingerprint, or device unlock</small></span>{busy === "passkey" && <Loader2 className="h-4 w-4 animate-spin" />}</button>
        <div className="my-5 orbital-divider" />
        <label className="block"><span className="mb-2 flex items-center gap-2 text-xs"><Grid3X3 className="h-4 w-4 text-[hsl(var(--teal))]" />Wallet PIN</span><input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" type="password" className="orbital-field text-center text-xl tracking-[.5em]" placeholder="••••••" /></label>
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        <button onClick={() => finish("pin")} disabled={pin.length !== 6 || busy !== null} className="orbital-button mt-5 w-full">{busy === "pin" || busy === "action" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}{busy === "action" ? "Processing…" : "Verify and continue"}</button>
      </section>
    </div>
  )
}
