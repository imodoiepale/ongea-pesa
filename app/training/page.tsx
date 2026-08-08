"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FluidNav, PageHeader, ScreenShell, mobileNavItems } from "@/components/foundation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAudioRecorder } from "@/hooks/use-audio-recorder"
import { cn } from "@/lib/utils"
import { Check, Loader2, Mic, RotateCcw, Shield, Square, Trash2 } from "lucide-react"

/**
 * Sheng / Swahili voice training contribution page.
 *
 * Commercial STT does not understand Sheng code-switching, so the only route to
 * an agent that does is a labelled in-domain corpus. This is where it comes from.
 *
 * Consent is an explicit, blocking first step rather than a checkbox buried in
 * terms: these are voice recordings in a regulated financial app, and the
 * contributor can delete any submission afterwards.
 */

interface Prompt {
  id: string
  text: string
  variety: "sheng" | "swahili" | "mixed" | "english"
  category: string
}

interface Contribution {
  id: string
  transcript: string
  variety: string
  status: "pending" | "approved" | "rejected"
  created_at: string
}

const VARIETY_LABEL: Record<string, string> = {
  sheng: "Sheng",
  swahili: "Kiswahili",
  mixed: "Mixed",
  english: "English",
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = String(reader.result || "")
      // Strip the `data:audio/webm;base64,` prefix — the API expects raw base64,
      // matching the receipts upload convention.
      resolve(result.slice(result.indexOf(",") + 1))
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export default function TrainingPage() {
  const [consented, setConsented] = useState(false)
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [index, setIndex] = useState(0)
  const [transcript, setTranscript] = useState("")
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { isRecording, audioBlob, startRecording, stopRecording, clearRecording } = useAudioRecorder()

  const startedAtRef = useRef<number | null>(null)
  const durationRef = useRef<number | null>(null)

  const prompt = prompts[index] ?? null

  const audioUrl = useMemo(() => (audioBlob ? URL.createObjectURL(audioBlob) : null), [audioBlob])
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl) }, [audioUrl])

  const loadPrompts = useCallback(async () => {
    try {
      const res = await fetch("/api/training/prompts")
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Could not load prompts")
      setPrompts(json.prompts ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load prompts")
    }
  }, [])

  const loadContributions = useCallback(async () => {
    try {
      const res = await fetch("/api/training/contributions")
      const json = await res.json()
      if (res.ok) setContributions(json.contributions ?? [])
    } catch {
      // Non-fatal: the history list is supplementary to recording.
    }
  }, [])

  useEffect(() => {
    if (!consented) return
    loadPrompts()
    loadContributions()
  }, [consented, loadPrompts, loadContributions])

  // Seed the editable transcript from the prompt so the common case is one tap.
  useEffect(() => {
    if (prompt) setTranscript(prompt.text)
  }, [prompt])

  const handleStart = async () => {
    setError(null)
    setMessage(null)
    startedAtRef.current = Date.now()
    await startRecording()
  }

  const handleStop = () => {
    if (startedAtRef.current) durationRef.current = Date.now() - startedAtRef.current
    stopRecording()
  }

  const handleDiscard = () => {
    clearRecording()
    durationRef.current = null
  }

  const handleSubmit = async () => {
    if (!audioBlob || !transcript.trim()) return
    setSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      const audioData = await blobToBase64(audioBlob)
      const uploadRes = await fetch("/api/training/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioData,
          contentType: "audio/webm",
          filename: `${Date.now()}.webm`,
        }),
      })
      const uploadJson = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadJson.error || "Upload failed")

      const createRes = await fetch("/api/training/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt_id: prompt?.id,
          audio_path: uploadJson.path,
          transcript: transcript.trim(),
          variety: prompt?.variety ?? "sheng",
          duration_ms: durationRef.current ?? undefined,
          consent: true,
        }),
      })
      const createJson = await createRes.json()
      if (!createRes.ok) throw new Error(createJson.error || "Could not save contribution")

      setMessage("Asante! Recording submitted for review.")
      handleDiscard()
      setIndex((i) => (prompts.length ? (i + 1) % prompts.length : 0))
      loadContributions()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/training/contributions?id=${id}`, { method: "DELETE" })
      if (res.status === 204) {
        setContributions((prev) => prev.filter((c) => c.id !== id))
      }
    } catch {
      setError("Could not delete that recording")
    }
  }

  // ── Consent gate ───────────────────────────────────────────────────────────
  if (!consented) {
    return (
      <main className="orbital-page min-h-[100dvh] pb-nav">
        <ScreenShell className="pt-safe">
          <PageHeader title="Teach Ongea Sheng" subtitle="Help the assistant understand how you actually speak" />

          <div className="mt-4 rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-5 w-5 text-brand" />
              <h2 className="text-base font-semibold text-foreground">Before you record</h2>
            </div>

            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">What we collect.</strong> Short voice recordings of
                you reading payment phrases, plus the text of what you said.
              </li>
              <li>
                <strong className="text-foreground">What we use it for.</strong> Training a speech model
                so Ongea Pesa understands Sheng and Kiswahili. Nothing else.
              </li>
              <li>
                <strong className="text-foreground">Who hears it.</strong> A small group of invited
                reviewers who check the text matches the audio.
              </li>
              <li>
                <strong className="text-foreground">Your control.</strong> You can delete any recording
                at any time, and it is removed from storage with it.
              </li>
              <li>
                <strong className="text-foreground">Not a voice ID.</strong> These recordings are never
                used to identify you or to approve a payment.
              </li>
            </ul>

            <p className="mt-4 text-xs text-muted-foreground">
              Please do not say real PINs, passwords, or account numbers.
            </p>

            <Button className="mt-5 w-full" onClick={() => setConsented(true)}>
              I understand — let&apos;s record
            </Button>
          </div>
        </ScreenShell>
        <FluidNav items={mobileNavItems} />
      </main>
    )
  }

  // ── Recording ──────────────────────────────────────────────────────────────
  return (
    <main className="orbital-page min-h-[100dvh] pb-nav">
      <ScreenShell className="pt-safe">
        <PageHeader title="Teach Ongea Sheng" subtitle={`${contributions.length} recordings contributed`} />

        {error && (
          <div className="mt-3 rounded-xl border border-red-500/40 bg-red-500/5 p-3 text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        {message && (
          <div className="mt-3 rounded-xl border border-brand/40 bg-brand/5 p-3 text-xs text-brand">
            {message}
          </div>
        )}

        {/* Prompt */}
        <div className="mt-4 rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
          {prompt ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-brand/10 text-brand">
                  {VARIETY_LABEL[prompt.variety] ?? prompt.variety}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {index + 1} / {prompts.length}
                </span>
              </div>
              <p className="text-xl font-semibold leading-snug text-foreground">{prompt.text}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Say this in your own words if it sounds more natural — then edit the text below to match
                exactly what you said.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Loading prompts…</p>
          )}
        </div>

        {/* Recorder */}
        <div className="mt-4 rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
          <div className="flex flex-col items-center gap-4">
            {!audioBlob ? (
              <button
                onClick={isRecording ? handleStop : handleStart}
                className={cn(
                  "flex h-20 w-20 items-center justify-center rounded-full transition-colors",
                  isRecording
                    ? "bg-red-500 text-white"
                    : "bg-brand text-white hover:bg-brand/90",
                )}
                aria-label={isRecording ? "Stop recording" : "Start recording"}
              >
                {isRecording ? <Square className="h-7 w-7" /> : <Mic className="h-8 w-8" />}
              </button>
            ) : (
              <audio controls src={audioUrl ?? undefined} className="w-full" />
            )}

            <p className="text-xs text-muted-foreground">
              {isRecording ? "Listening… tap to stop" : audioBlob ? "Happy with it?" : "Tap to record"}
            </p>
          </div>

          {audioBlob && (
            <>
              <label className="mt-4 block text-xs font-medium text-muted-foreground">
                What you actually said
              </label>
              <Textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={3}
                className="mt-1"
                placeholder="Type exactly what you said"
              />

              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleDiscard} disabled={submitting}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Redo
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={submitting || !transcript.trim()}
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Submit
                </Button>
              </div>
            </>
          )}

          {!audioBlob && prompts.length > 1 && (
            <Button
              variant="ghost"
              className="mt-4 w-full text-xs"
              onClick={() => setIndex((i) => (i + 1) % prompts.length)}
              disabled={isRecording}
            >
              Skip this phrase
            </Button>
          )}
        </div>

        {/* History */}
        {contributions.length > 0 && (
          <div className="mt-4 rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Your recordings</h2>
            <ul className="divide-y divide-border/40">
              {contributions.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs text-foreground">{c.transcript}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {VARIETY_LABEL[c.variety] ?? c.variety} · {c.status}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted"
                    aria-label="Delete recording"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </ScreenShell>
      <FluidNav items={mobileNavItems} />
    </main>
  )
}
