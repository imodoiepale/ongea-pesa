"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronRight, Fingerprint, Grid3X3, Loader2, ShieldCheck } from "lucide-react"
import { enrollPasskey, getPinStatus, setPin } from "@/lib/security-client"
import { useAuth } from "@/components/providers/auth-provider"
import { OnboardingProgress } from "./onboarding-progress"

export function SecuritySetupScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [pin, setPinValue] = useState("")
  const [confirm, setConfirm] = useState("")
  const [currentPin, setCurrentPin] = useState("")
  const [showPinForm, setShowPinForm] = useState(false)
  const [pinDone, setPinDone] = useState(false)
  const [passkeyDone, setPasskeyDone] = useState(false)
  const [busy, setBusy] = useState<"pin" | "passkey" | "finish" | null>(null)
  const [error, setError] = useState("")

  // An account can already have a PIN (re-running onboarding, or set during an
  // earlier session). Changing it requires the current PIN, so we have to know
  // up front — otherwise the save fails with "Current PIN is incorrect".
  const [hasExistingPin, setHasExistingPin] = useState(false)

  useEffect(() => {
    let active = true
    getPinStatus()
      .then(({ hasPin }) => {
        if (!active) return
        setHasExistingPin(hasPin)
        // A PIN already on file satisfies the setup requirement — don't force a change.
        if (hasPin) setPinDone(true)
      })
      .catch(() => {
        /* Non-fatal: fall back to the first-time-setup form. */
      })
    return () => {
      active = false
    }
  }, [])

  const savePin = async () => {
    if (!/^\d{6}$/.test(pin)) {
      setError("Use a 6-digit wallet PIN.")
      return
    }
    if (pin !== confirm) {
      setError("The PINs do not match.")
      return
    }
    if (hasExistingPin && !/^\d{4,6}$/.test(currentPin)) {
      setError("Enter your current PIN to change it.")
      return
    }
    setBusy("pin")
    setError("")
    try {
      await setPin(pin, hasExistingPin ? currentPin : undefined)
      setPinDone(true)
      setShowPinForm(false)
      setPinValue("")
      setConfirm("")
      setCurrentPin("")
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't save your PIN.")
    } finally {
      setBusy(null)
    }
  }

  const addPasskey = async () => {
    setBusy("passkey")
    setError("")
    try {
      await enrollPasskey()
      setPasskeyDone(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Passkey enrollment was cancelled.")
    } finally {
      setBusy(null)
    }
  }

  const finish = async () => {
    if (!pinDone || !user?.id) {
      setError("Set your wallet PIN before finishing setup.")
      setShowPinForm(true)
      return
    }
    setBusy("finish")
    setError("")
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: "onboarding-complete" }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(typeof payload.error === "string" ? payload.error : "We couldn't finish setup. Please try again.")
      setBusy(null)
      return
    }
    router.replace("/")
    router.refresh()
  }

  return (
    <main id="main-content" className="onboarding-page onboarding-page--light onboarding-security">
      <section className="onboarding-frame">
        <OnboardingProgress step={3} />

        <div className="onboarding-security__intro">
          <h1 className="orbital-display">Protect your money</h1>
          <p>Choose how you want to<br />secure your account</p>
        </div>

        <div className="onboarding-security__visual">
          <Image
            src="/brand/orbital/security-shield-light.webp"
            alt="Protective digital shield"
            fill
            sizes="260px"
            className="object-contain"
            priority
          />
        </div>

        <div className="onboarding-security__choices">
          <button onClick={addPasskey} disabled={busy !== null || passkeyDone} className="onboarding-choice">
            <Fingerprint />
            <span><strong>Passkey</strong><small>Use biometrics or device<br />to sign in fast</small></span>
            {busy === "passkey" ? <Loader2 className="animate-spin" /> : passkeyDone ? <Check /> : <ChevronRight />}
          </button>

          <button
            onClick={() => setShowPinForm((value) => !value)}
            disabled={busy !== null}
            className="onboarding-choice"
            aria-expanded={showPinForm}
          >
            <Grid3X3 />
            <span>
              <strong>Wallet PIN</strong>
              <small>
                {hasExistingPin
                  ? <>Your PIN is set. Tap to<br />change it</>
                  : <>Use a 6-digit PIN to approve<br />transactions</>}
              </small>
            </span>
            {pinDone ? <Check /> : <ChevronRight />}
          </button>

          {showPinForm && (
            <div className="onboarding-pin-form">
              {hasExistingPin && (
                <input className="onboarding-pin-form__full" value={currentPin} onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" type="password" autoComplete="current-password" aria-label="Current wallet PIN" placeholder="Current PIN" />
              )}
              <input value={pin} onChange={(event) => setPinValue(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" type="password" autoComplete="new-password" aria-label="New wallet PIN" placeholder={hasExistingPin ? "New 6-digit PIN" : "6-digit PIN"} />
              <input value={confirm} onChange={(event) => setConfirm(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" type="password" autoComplete="new-password" aria-label="Confirm wallet PIN" placeholder="Confirm PIN" />
              <button onClick={savePin} disabled={busy !== null} className="onboarding-primary">
                {busy === "pin" ? <Loader2 className="animate-spin" /> : hasExistingPin ? "Change wallet PIN" : "Set wallet PIN"}
              </button>
              {hasExistingPin && (
                <p className="onboarding-hint">Forgot your current PIN? Reset it from Settings after signing in again.</p>
              )}
            </div>
          )}
        </div>

        <p className="onboarding-security__privacy"><ShieldCheck />Biometrics stay on this device</p>
        {error && <p role="alert" className="onboarding-error">{error}</p>}
        <button onClick={finish} disabled={busy !== null} className="onboarding-primary onboarding-security__finish">
          {busy === "finish" ? <Loader2 className="animate-spin" /> : "Finish setup"}
        </button>
      </section>
    </main>
  )
}
