"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Bug, Check, Heart, Lightbulb, Loader2, MessageSquare, Send } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { fetchJson } from "@/lib/fetch-json"
import { cn } from "@/lib/utils"

/**
 * Feedback and issue reporting.
 *
 * Deliberately one form, not two. A separate "how are you using the app?" survey
 * never gets filled in, whereas people will always report a bug — so usage
 * context rides along with the same entry point.
 *
 * Route and user-agent are captured automatically. Asking a user which screen
 * they were on is asking them to do our debugging, and "it didn't work" with no
 * route attached is close to untriageable.
 */

const CATEGORIES = [
  { key: "issue", label: "Something broke", icon: Bug, color: "#ef4444" },
  { key: "usage", label: "How I use it", icon: MessageSquare, color: "#3b82f6" },
  { key: "idea", label: "An idea", icon: Lightbulb, color: "#f59e0b" },
  { key: "praise", label: "Something good", icon: Heart, color: "#10b981" },
] as const

type Category = (typeof CATEGORIES)[number]["key"]

const SEVERITIES = [
  { key: "blocking", label: "I can't use it" },
  { key: "major", label: "Big problem" },
  { key: "minor", label: "Small annoyance" },
] as const

const PLACEHOLDERS: Record<Category, string> = {
  issue: "What were you trying to do, and what happened instead?",
  usage: "What do you use Ongea Pesa for most? Anything you wish it did differently?",
  idea: "What would make this better for you?",
  praise: "What is working well?",
}

export function FeedbackForm({ onDone }: { onDone?: () => void }) {
  const pathname = usePathname()
  const [category, setCategory] = useState<Category>("issue")
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number]["key"]>("minor")
  const [message, setMessage] = useState("")
  const [amount, setAmount] = useState("")
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  // Reset the sent state if the user comes back to file another.
  useEffect(() => {
    if (!sent) return
    const t = window.setTimeout(() => {
      setSent(false)
      setMessage("")
      setAmount("")
      onDone?.()
    }, 2200)
    return () => window.clearTimeout(t)
  }, [sent, onDone])

  const submit = async () => {
    if (message.trim().length < 3) {
      setError("Tell us a little more so we can actually help.")
      return
    }
    setBusy(true)
    setError("")
    try {
      await fetchJson("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          severity: category === "issue" ? severity : undefined,
          message: message.trim(),
          route: pathname,
          amount: amount ? Number(amount) : undefined,
        }),
      })
      setSent(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't send that.")
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div className="og-glass flex flex-col items-center gap-3 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10">
          <Check className="h-7 w-7 text-brand" />
        </div>
        <p className="text-base font-semibold text-foreground">Asante — got it.</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          {category === "issue"
            ? "We can see which screen you were on, so we have what we need to look into it."
            : "This genuinely helps us decide what to build next."}
        </p>
      </div>
    )
  }

  return (
    <div className="og-glass p-5">
      <label className="og-list-caption !ml-0">What kind of thing is this?</label>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {CATEGORIES.map((c) => {
          const active = category === c.key
          return (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              disabled={busy}
              className={cn(
                "og-press og-tap flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-medium",
                active
                  ? "border-transparent text-foreground"
                  : "border-border/50 text-muted-foreground hover:border-border",
              )}
              style={active ? { background: `${c.color}1f`, borderColor: `${c.color}55` } : undefined}
            >
              <c.icon size={15} style={{ color: c.color }} />
              {c.label}
            </button>
          )
        })}
      </div>

      {/* Severity only appears for an issue — asking how bad a compliment is
          would be absurd, and storing it would make the triage queue lie. */}
      {category === "issue" && (
        <>
          <label className="og-list-caption !ml-0">How bad is it?</label>
          <div className="mb-4 flex gap-2">
            {SEVERITIES.map((s) => (
              <button
                key={s.key}
                onClick={() => setSeverity(s.key)}
                disabled={busy}
                className={cn(
                  "og-press flex-1 rounded-xl border px-2 py-2 text-[11px] font-medium",
                  severity === s.key
                    ? "border-transparent bg-foreground text-background"
                    : "border-border/50 text-muted-foreground hover:border-border",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}

      <label className="og-list-caption !ml-0">Tell us what happened</label>
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={PLACEHOLDERS[category]}
        rows={5}
        disabled={busy}
        className="mt-1 resize-none border-border/60 bg-muted/30"
      />

      {category === "issue" && (
        <>
          <label className="og-list-caption !ml-0 mt-4">
            Amount involved, if it was a payment (optional)
          </label>
          <div className="mt-1 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
            <span className="text-xs text-muted-foreground">KSh</span>
            <input
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={busy}
              placeholder="0"
              className="og-num w-full bg-transparent text-sm text-foreground outline-none"
            />
          </div>
        </>
      )}

      {error && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>}

      <button
        onClick={submit}
        disabled={busy || message.trim().length < 3}
        className="og-press mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3.5 text-sm font-semibold text-background disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Send
      </button>

      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        We attach the screen you were on automatically. Please don&apos;t include your PIN.
      </p>
    </div>
  )
}
