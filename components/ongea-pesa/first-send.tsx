"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Check, Loader2, Send, ShieldCheck, Smartphone } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { getStepUpToken } from "@/lib/security-client"
import { calculateTransactionFees } from "@/lib/transaction-fees"
import { VOICE_RATE_PER_MINUTE } from "@/lib/voice-funding"
import { OnboardingProgress } from "./onboarding-progress"

/**
 * First send — the last onboarding step.
 *
 * The user sends a small amount from their KSh 200 starter balance to their own
 * M-Pesa number. Real rail, real SMS: it is the only way they learn that this
 * actually moves money, and it costs them nothing net beyond the fee.
 *
 * Two deliberate design choices:
 *
 *   * It comes AFTER security-setup, because moving money needs a step-up token
 *     from the PIN set there.
 *   * It is SKIPPABLE, and onboarding_completed_at is already stamped by
 *     security-setup before the user arrives here. Abandoning this screen can
 *     therefore never strand anyone in a redirect loop — which is precisely the
 *     failure that trapped a paying user on /security-setup.
 */

// NCBA's minimum for a mobile-money payout. Below this the rail rejects it.
const MIN_SEND = 50

function formatPhoneForDisplay(raw: string) {
  const digits = raw.replace(/\D/g, "")
  if (digits.startsWith("254") && digits.length === 12) {
    return `0${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`
  }
  if (digits.length === 10) return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  return raw
}

export function FirstSendScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [phone, setPhone] = useState("")
  const [balance, setBalance] = useState(0)
  const [amount, setAmount] = useState(String(MIN_SEND))
  const [pin, setPin] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [busy, setBusy] = useState<"send" | "skip" | null>(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  const numericAmount = Number(amount) || 0
  const fees = useMemo(
    () => calculateTransactionFees(numericAmount, "mobile_wallet", "send_phone"),
    [numericAmount],
  )
  const remaining = Math.max(0, balance - fees.totalDebit)
  const voiceMinutesLeft = Math.floor(remaining / VOICE_RATE_PER_MINUTE)

  useEffect(() => {
    if (!user?.id) return
    let active = true
    const supabase = createClient()
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("phone_number, mpesa_number, wallet_balance, first_send_completed_at, first_send_skipped_at")
        .eq("id", user.id)
        .maybeSingle()
      if (!active) return
      // Already handled this step — don't ask twice.
      if (data?.first_send_completed_at || data?.first_send_skipped_at) {
        router.replace("/dashboard")
        return
      }
      setPhone(data?.mpesa_number || data?.phone_number || "")
      setBalance(Number(data?.wallet_balance ?? 0))
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [router, user])

  const settle = async (stage: "first-send" | "first-send-skip", transactionId?: string) => {
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage, transaction_id: transactionId }),
    })
  }

  const skip = async () => {
    setBusy("skip")
    await settle("first-send-skip")
    router.replace("/dashboard")
    router.refresh()
  }

  const send = async () => {
    setError("")

    if (numericAmount < MIN_SEND) {
      setError(`The smallest M-Pesa send is KSh ${MIN_SEND}.`)
      return
    }
    if (fees.totalDebit > balance) {
      setError(`That would need KSh ${fees.totalDebit.toFixed(2)} but you have KSh ${balance.toFixed(2)}.`)
      return
    }
    if (!phone) {
      setError("We don't have your M-Pesa number yet. Add it in settings first.")
      return
    }
    if (!showPin) {
      // Money never moves without a fresh PIN proof.
      setShowPin(true)
      return
    }
    if (!/^\d{4,6}$/.test(pin)) {
      setError("Enter your wallet PIN to authorise the send.")
      return
    }

    setBusy("send")
    try {
      const stepupToken = await getStepUpToken({ pin })

      const response = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: phone,
          amount: numericAmount,
          stepup_token: stepupToken,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : "The send didn't go through.")
      }

      await settle("first-send", payload.transaction_id)
      setDone(true)
      window.setTimeout(() => {
        router.replace("/dashboard")
        router.refresh()
      }, 1600)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The send didn't go through.")
      setPin("")
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <main className="onboarding-page onboarding-page--light">
        <div className="flex min-h-[60dvh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </main>
    )
  }

  if (done) {
    return (
      <main className="onboarding-page onboarding-page--light">
        <section className="onboarding-frame">
          <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center px-6">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
              <Check className="h-8 w-8 text-brand" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">Sent!</h1>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              KSh {numericAmount.toLocaleString()} is on its way to {formatPhoneForDisplay(phone)}. Check
              your M-Pesa messages.
            </p>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main id="main-content" className="onboarding-page onboarding-page--light">
      <section className="onboarding-frame px-6 pb-10">
        <OnboardingProgress step={4} total={4} />

        <h1 className="mt-2 text-center text-3xl font-semibold leading-tight text-foreground">
          Try it for real
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-center text-sm text-muted-foreground">
          Send a little to your own M-Pesa, so you can see exactly how it feels.
        </p>

        {/* Destination */}
        <div className="mt-6 rounded-2xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10">
              <Smartphone className="h-5 w-5 text-brand" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Sending to you</p>
              <p className="truncate text-sm font-semibold text-foreground">
                {phone ? formatPhoneForDisplay(phone) : "No M-Pesa number on file"}
              </p>
            </div>
          </div>
        </div>

        {/* Amount */}
        <label className="mt-4 block text-xs font-medium text-muted-foreground">Amount</label>
        <div className="mt-1 flex items-center gap-2 rounded-2xl border border-border/50 bg-card px-4 py-3">
          <span className="text-sm text-muted-foreground">KSh</span>
          <input
            type="number"
            inputMode="numeric"
            min={MIN_SEND}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={busy !== null}
            className="w-full bg-transparent text-lg font-semibold text-foreground outline-none"
          />
        </div>

        {/* What it costs, stated plainly rather than discovered afterwards */}
        <div className="mt-3 rounded-2xl bg-muted/40 p-4 text-xs">
          <div className="flex justify-between py-0.5">
            <span className="text-muted-foreground">You send</span>
            <span className="font-medium text-foreground">KSh {numericAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-muted-foreground">Transaction cost</span>
            <span className="font-medium text-foreground">KSh {fees.totalTransactionCost.toFixed(2)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-border/50 pt-2">
            <span className="font-medium text-foreground">Left in wallet</span>
            <span className="font-semibold text-brand">KSh {remaining.toFixed(2)}</span>
          </div>
          {voiceMinutesLeft > 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              That still covers about {voiceMinutesLeft} minute{voiceMinutesLeft === 1 ? "" : "s"} of voice.
            </p>
          )}
        </div>

        {showPin && (
          <>
            <label className="mt-4 block text-xs font-medium text-muted-foreground">
              Wallet PIN to authorise
            </label>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              disabled={busy !== null}
              className="mt-1 w-full rounded-2xl border border-border/50 bg-card px-4 py-3 text-lg tracking-[0.5em] text-foreground outline-none"
              placeholder="••••••"
            />
          </>
        )}

        {error && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>}

        <button
          onClick={send}
          disabled={busy !== null || !phone}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-4 text-base font-semibold text-background disabled:opacity-50"
        >
          {busy === "send" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
          {showPin ? "Confirm send" : `Send KSh ${numericAmount.toFixed(0)} to myself`}
        </button>

        <button
          onClick={skip}
          disabled={busy !== null}
          className="mt-3 flex w-full items-center justify-center gap-1.5 py-3 text-sm font-medium text-muted-foreground disabled:opacity-50"
        >
          {busy === "skip" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          I&apos;ll do this later
          <ArrowRight className="h-4 w-4" />
        </button>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-brand" />
          Your PIN authorises this one send and nothing else.
        </p>
      </section>
    </main>
  )
}
