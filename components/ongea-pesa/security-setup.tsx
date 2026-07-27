"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronRight, Fingerprint, Grid3X3, Loader2, Mic2, Pause, Play, ShieldCheck } from "lucide-react"
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
  const [deviceBiometricsConsent, setDeviceBiometricsConsent] = useState(false)
  const [voiceEnrolled, setVoiceEnrolled] = useState(false)
  const [voicePlaybackUrl, setVoicePlaybackUrl] = useState<string | null>(null)
  const [playingVoice, setPlayingVoice] = useState(false)
  const [busy, setBusy] = useState<"pin" | "passkey" | "finish" | null>(null)
  const [error, setError] = useState("")
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null)

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

  useEffect(() => {
    let active = true
    fetch("/api/security/voice-biometric")
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!active || !response.ok) return
        setVoiceEnrolled(Boolean(payload.enrolled))
        setVoicePlaybackUrl(typeof payload.playbackUrl === "string" ? payload.playbackUrl : null)
      })
      .catch(() => {
        /* Playback is helpful but not required to finish security setup. */
      })
    return () => {
      active = false
      voiceAudioRef.current?.pause()
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
    if (!deviceBiometricsConsent) {
      setError("Allow device face or fingerprint verification before adding a passkey.")
      return
    }
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

  const playVoiceSample = async () => {
    if (!voicePlaybackUrl) {
      setError("Your voice sample is enrolled, but playback is temporarily unavailable.")
      return
    }
    setError("")
    if (!voiceAudioRef.current) {
      voiceAudioRef.current = new Audio(voicePlaybackUrl)
      voiceAudioRef.current.onended = () => setPlayingVoice(false)
      voiceAudioRef.current.onerror = () => {
        setPlayingVoice(false)
        setError("We couldn't play your voice sample. Please retry.")
      }
    }
    if (playingVoice) {
      voiceAudioRef.current.pause()
      setPlayingVoice(false)
      return
    }
    try {
      await voiceAudioRef.current.play()
      setPlayingVoice(true)
    } catch {
      setPlayingVoice(false)
      setError("Your browser blocked playback. Tap the voice sample again.")
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
      body: JSON.stringify({
        stage: "onboarding-complete",
        device_biometrics_consent: deviceBiometricsConsent,
      }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(typeof payload.error === "string" ? payload.error : "We couldn't finish setup. Please try again.")
      setBusy(null)
      return
    }
    router.replace("/dashboard")
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
          <button
            onClick={playVoiceSample}
            disabled={!voiceEnrolled}
            className="onboarding-choice"
          >
            <Mic2 />
            <span>
              <strong>Voice biometrics</strong>
              <small>{voiceEnrolled ? "Enrolled · tap to play your short sample" : "Complete voice enrollment in step 2"}</small>
            </span>
            {playingVoice ? <Pause /> : voiceEnrolled ? <Check /> : <Play />}
          </button>

          <label className="onboarding-device-consent">
            <input
              type="checkbox"
              checked={deviceBiometricsConsent}
              onChange={(event) => setDeviceBiometricsConsent(event.target.checked)}
            />
            <span>
              <strong>Allow face or fingerprint verification</strong>
              <small>Your phone performs the match. Ongea stores only the passkey public key.</small>
            </span>
          </label>

          <button onClick={addPasskey} disabled={busy !== null || passkeyDone} className="onboarding-choice">
            <Fingerprint />
            <span><strong>Passkey</strong><small>Use device face, fingerprint,<br />or screen lock to sign in</small></span>
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

        <p className="onboarding-security__privacy"><ShieldCheck />Face and fingerprint data stay on this device</p>
        {error && <p role="alert" className="onboarding-error">{error}</p>}
        <button onClick={finish} disabled={busy !== null} className="onboarding-primary onboarding-security__finish">
          {busy === "finish" ? <Loader2 className="animate-spin" /> : "Finish setup"}
        </button>
      </section>
    </main>
  )
}
