"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, AudioLines, Loader2, RotateCcw, Square } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"
import { VoiceCore } from "@/components/foundation"

const TARGET_MS = 5200

export function VoiceCalibrationScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const startedRef = useRef(0)
  const [recording, setRecording] = useState(false)
  const [saving, setSaving] = useState(false)
  const [level, setLevel] = useState(0)
  const [score, setScore] = useState(0)
  const [error, setError] = useState("")

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setRecording(false)
  }

  useEffect(() => stop, [])

  const listen = async () => {
    setError("")
    setScore(0)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      })
      streamRef.current = stream
      const context = new AudioContext()
      const analyser = context.createAnalyser()
      analyser.fftSize = 512
      context.createMediaStreamSource(stream).connect(analyser)
      const values = new Uint8Array(analyser.fftSize)
      let audibleFrames = 0
      let frames = 0
      startedRef.current = performance.now()
      setRecording(true)

      const sample = () => {
        analyser.getByteTimeDomainData(values)
        const rms = Math.sqrt(values.reduce((sum, value) => sum + Math.pow((value - 128) / 128, 2), 0) / values.length)
        const normalized = Math.min(100, Math.round(rms * 420))
        frames += 1
        if (normalized > 8) audibleFrames += 1
        setLevel(normalized)
        const elapsed = performance.now() - startedRef.current
        setScore(Math.min(96, Math.round((audibleFrames / Math.max(frames, 1)) * 74 + Math.min(22, elapsed / TARGET_MS * 22))))
        if (elapsed >= TARGET_MS) {
          void context.close()
          stop()
          return
        }
        rafRef.current = requestAnimationFrame(sample)
      }
      sample()
    } catch {
      setError("Microphone access is off. Allow it in your browser settings, then retry.")
    }
  }

  const continueSetup = async () => {
    if (!user?.id || score < 40) return
    setSaving(true)
    setError("")
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: "voice-calibration", score }),
    })
    const payload = await response.json().catch(() => ({}))
    setSaving(false)
    if (!response.ok) {
      setError(typeof payload.error === "string" ? payload.error : "We couldn't save your voice check. Please retry.")
      return
    }
    router.push("/security-setup")
    router.refresh()
  }

  return (
    <main id="main-content" className="onboarding-page onboarding-page--dark onboarding-calibration">
      <section className="onboarding-frame">
        <header className="onboarding-step-header">
          <button onClick={() => router.back()} aria-label="Go back"><ArrowLeft /></button>
          <span>2 of 3</span>
          <i aria-hidden="true" />
        </header>

        <div className="onboarding-calibration__intro">
          <h1 className="orbital-display">Teach Ongea<br /><span>your rhythm</span></h1>
          <p>Say the phrase below<br />clearly and naturally</p>
        </div>

        <div className="onboarding-calibration__visual">
          <VoiceCore className={recording ? "is-listening" : ""} />
          <span style={{ boxShadow: `0 0 ${10 + level / 2}px hsl(var(--mint))` }} />
        </div>

        <blockquote className="orbital-display">“Tuma elfu moja<br />kwa Mama”</blockquote>
        <p className="onboarding-calibration__status">{recording ? "Listening…" : score ? "Voice pattern ready" : "Tap listen and speak naturally"}</p>
        <output>{score}%</output>
        <p className="onboarding-calibration__hint">Speak naturally</p>

        {error && <p role="alert" className="onboarding-error">{error}</p>}

        <div className="onboarding-calibration__actions">
          <button onClick={recording ? stop : listen} className="onboarding-secondary">
            {recording ? <Square /> : <RotateCcw />}
            {recording ? "Stop" : "Retry"}
          </button>
          <button onClick={score >= 40 ? continueSetup : listen} disabled={saving} className="onboarding-primary onboarding-primary--mint">
            {saving ? <Loader2 className="animate-spin" /> : <AudioLines />}
            {score >= 40 ? "Continue" : "Start listening"}
          </button>
        </div>
      </section>
    </main>
  )
}
