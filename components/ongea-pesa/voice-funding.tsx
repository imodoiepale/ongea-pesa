"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, Clock3, Loader2, Mic2, Phone, ShieldCheck, WalletCards } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { depositFeeBreakdown } from "@/lib/transaction-fees"
import { VOICE_FUNDING_PURPOSE, VOICE_RATE_PER_MINUTE, VOICE_STARTER_AMOUNT } from "@/lib/voice-funding"

type FundingState = "loading" | "idle" | "submitting" | "pending" | "completing" | "success" | "error"

function normalizePhone(value: string) {
  return value.replace(/\D/g, "").slice(0, value.replace(/\D/g, "").startsWith("254") ? 12 : 10)
}

export function VoiceFundingScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [phone, setPhone] = useState("")
  const [transactionId, setTransactionId] = useState("")
  const [state, setState] = useState<FundingState>("loading")
  const [error, setError] = useState("")
  const fees = useMemo(() => depositFeeBreakdown(VOICE_STARTER_AMOUNT), [])

  useEffect(() => {
    if (!user?.id) return
    let active = true
    const supabase = createClient()
    const loadProfile = async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle()
        if (!active) return
        const fundedAt = data?.voice_funding_completed_at || user.user_metadata?.voice_funding_completed_at
        if (fundedAt) {
          router.replace("/profile-creation")
          return
        }
        setPhone(normalizePhone(data?.mpesa_number || data?.phone_number || ""))
        setState("idle")
      } catch {
        if (active) setState("idle")
      }
    }
    void loadProfile()
    return () => { active = false }
  }, [router, user])

  const finishFunding = useCallback(async (txId: string) => {
    setState("completing")
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: "voice-funding", transaction_id: txId }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(typeof payload.error === "string" ? payload.error : "We couldn't confirm your wallet funding.")
      setState("error")
      return
    }
    setState("success")
    window.setTimeout(() => {
      router.replace("/profile-creation")
      router.refresh()
    }, 900)
  }, [router])

  useEffect(() => {
    if (!transactionId || state !== "pending") return
    let cancelled = false
    let attempts = 0
    let timer: ReturnType<typeof setTimeout> | null = null

    const poll = async () => {
      attempts += 1
      try {
        const response = await fetch("/api/daraja/stk-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transaction_id: transactionId }),
        })
        const result = await response.json().catch(() => ({}))
        if (cancelled) return
        if (result.status === "completed") return void finishFunding(transactionId)
        if (result.status === "failed") {
          setError(result.error_message || "M-Pesa did not complete the payment. Please retry.")
          setState("error")
          return
        }
      } catch {
        // A transient polling error must not create a second STK prompt.
      }

      if (attempts >= 40) {
        setError("The payment is still pending. Check your M-Pesa messages, then check again.")
        setState("error")
        return
      }
      timer = setTimeout(poll, 3000)
    }

    void poll()
    return () => { cancelled = true; if (timer) clearTimeout(timer) }
  }, [finishFunding, state, transactionId])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const normalized = normalizePhone(phone)
    if (!/^(?:0[17]\d{8}|254[17]\d{8})$/.test(normalized)) {
      setError("Enter a valid Kenyan M-Pesa number, for example 0712 345 678.")
      return
    }
    setError("")
    setState("submitting")
    const response = await fetch("/api/daraja/stk-deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: VOICE_STARTER_AMOUNT,
        phone: normalized,
        purpose: VOICE_FUNDING_PURPOSE,
      }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !payload.transaction_id) {
      setError(typeof payload.error === "string" ? payload.error : "We couldn't send the M-Pesa prompt. Please retry.")
      setState("error")
      return
    }
    setTransactionId(payload.transaction_id)
    setState("pending")
  }

  const busy = state === "loading" || state === "submitting" || state === "pending" || state === "completing"

  return (
    <main id="main-content" className="onboarding-page onboarding-page--light voice-funding-page">
      <section className="onboarding-frame voice-funding-frame">
        <header className="onboarding-step-header">
          <button type="button" onClick={() => router.replace("/")} aria-label="Back to welcome"><ArrowLeft /></button>
          <span>Wallet activation</span>
          <i aria-hidden="true" />
        </header>

        <div className="voice-funding-hero" aria-hidden="true">
          <span><Mic2 /></span>
          <i /><i /><i />
        </div>

        <div className="voice-funding-copy">
          <p className="orbital-label">Voice beta · transparent pricing</p>
          <h1 className="orbital-display">Load <span>KSh 200</span><br />to start speaking</h1>
          <p>Ongea Pesa Voice is still in beta and real-time AI audio is costly to run. Voice is charged at KSh {VOICE_RATE_PER_MINUTE} per minute, calculated to the second. Your remaining money stays visible and spendable in your wallet.</p>
        </div>

        <div className="voice-funding-breakdown">
          <div><span>Wallet funding</span><strong>KSh {fees.amount}</strong></div>
          <div><span>Ongea Pesa deposit fee</span><strong>Free</strong></div>
          <div><span>Estimated M-Pesa charge</span><strong>KSh {fees.mpesaCharge}</strong></div>
          <div className="voice-funding-breakdown__total"><span>Total from M-Pesa</span><strong>KSh {fees.totalFromMpesa}</strong></div>
          <div><span>Voice usage</span><strong>KSh {VOICE_RATE_PER_MINUTE}/minute</strong></div>
          <div><span>Ongea Pesa service fee</span><strong>0.5% per debit</strong></div>
        </div>

        <form onSubmit={submit} className="voice-funding-form">
          <label>
            <span>M-Pesa number</span>
            <span className="voice-funding-input">
              <Phone aria-hidden="true" />
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(normalizePhone(event.target.value))}
                placeholder="0712 345 678"
                disabled={busy}
                required
              />
            </span>
          </label>

          <p className="voice-funding-assurance"><ShieldCheck /> You approve the payment securely on your phone. We never see your M-Pesa PIN.</p>
          {error && <p role="alert" className="onboarding-error">{error}</p>}
          {state === "pending" && <p role="status" className="voice-funding-status"><Clock3 /> Check your phone and enter your M-Pesa PIN.</p>}
          {state === "success" && <p role="status" className="voice-funding-status is-success"><Check /> KSh 200 confirmed. Your wallet is ready.</p>}

          {state === "error" && transactionId ? (
            <button type="button" onClick={() => { setError(""); setState("pending") }} className="onboarding-primary">
              Check payment again
            </button>
          ) : (
            <button type="submit" disabled={busy || state === "success"} className="onboarding-primary onboarding-primary--mint">
              {busy ? <Loader2 className="animate-spin" /> : <WalletCards />}
              {state === "submitting" ? "Sending prompt" : state === "pending" ? "Waiting for M-Pesa" : state === "completing" ? "Confirming wallet" : "Add KSh 200"}
            </button>
          )}
        </form>
      </section>
    </main>
  )
}
