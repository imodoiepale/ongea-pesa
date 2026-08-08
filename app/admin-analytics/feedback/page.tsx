"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Layout from "@/components/kokonutui/layout"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Bug, Heart, Lightbulb, Loader2, MessageSquare, RefreshCw } from "lucide-react"
import { fetchJson } from "@/lib/fetch-json"

/**
 * Feedback triage.
 *
 * Defaults to the OPEN queue, not everything — a list that leads with resolved
 * items buries the work that still needs doing.
 */

interface Submission {
  id: string
  user_id: string | null
  reporter: string | null
  category: "issue" | "idea" | "usage" | "praise" | "other"
  severity: "blocking" | "major" | "minor" | null
  message: string
  route: string | null
  user_agent: string | null
  amount: number | null
  status: "new" | "triaged" | "in_progress" | "resolved" | "wont_fix"
  admin_notes: string | null
  environment: string
  created_at: string
}

const CATEGORY_META: Record<string, { icon: typeof Bug; color: string; label: string }> = {
  issue: { icon: Bug, color: "#ef4444", label: "Issue" },
  usage: { icon: MessageSquare, color: "#3b82f6", label: "Usage" },
  idea: { icon: Lightbulb, color: "#f59e0b", label: "Idea" },
  praise: { icon: Heart, color: "#10b981", label: "Praise" },
  other: { icon: MessageSquare, color: "#6b7280", label: "Other" },
}

const SEVERITY_TONE: Record<string, string> = {
  blocking: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25",
  major: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
  minor: "bg-muted text-muted-foreground border-border/50",
}

const STATUSES = ["new", "triaged", "in_progress", "resolved", "wont_fix"] as const

export default function FeedbackTriagePage() {
  const [rows, setRows] = useState<Submission[]>([])
  const [openCount, setOpenCount] = useState(0)
  const [filter, setFilter] = useState<"open" | "all">("open")
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const json: any = await fetchJson(`/api/admin/feedback?status=${filter}`)
      setRows(json.submissions ?? [])
      setOpenCount(json.open_count ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load feedback")
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  const patch = async (id: string, changes: Partial<Pick<Submission, "status" | "admin_notes">>) => {
    setBusyId(id)
    setError(null)
    try {
      const json: any = await fetchJson("/api/admin/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...changes }),
      })
      setRows((prev) =>
        prev
          .map((r) => (r.id === id ? { ...r, ...json.submission } : r))
          // Drop it from the open queue once it reaches a terminal state.
          .filter((r) =>
            filter === "open" ? !["resolved", "wont_fix"].includes(r.status) : true,
          ),
      )
      if (changes.status && ["resolved", "wont_fix"].includes(changes.status)) {
        setOpenCount((n) => Math.max(0, n - 1))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update")
    } finally {
      setBusyId(null)
    }
  }

  const counts = useMemo(() => {
    const byCategory = new Map<string, number>()
    for (const r of rows) byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + 1)
    return byCategory
  }, [rows])

  return (
    <Layout>
      <div className="og-screen-in space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="og-screen-title text-foreground">Feedback</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {openCount} open · {[...counts].map(([c, n]) => `${n} ${c}`).join(" · ") || "nothing yet"}
            </p>
          </div>
          <div className="flex gap-2">
            <div className="flex overflow-hidden rounded-lg border border-border/60">
              {(["open", "all"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-3 py-2 text-xs font-medium transition-colors duration-200",
                    filter === f
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:bg-muted/70",
                  )}
                >
                  {f === "open" ? "Open" : "All"}
                </button>
              ))}
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="og-press rounded-lg bg-muted p-2"
              aria-label="Refresh"
            >
              <RefreshCw className={cn("h-4 w-4 text-muted-foreground", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {error && (
          <div className="og-glass border-red-500/40 p-4">
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="og-glass flex justify-center p-12">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="og-glass p-12 text-center">
            <p className="text-sm text-muted-foreground">
              {filter === "open" ? "Nothing open — queue is clear." : "No feedback yet."}
            </p>
          </div>
        ) : (
          <div className="og-stagger space-y-3">
            {rows.map((r) => {
              const meta = CATEGORY_META[r.category] ?? CATEGORY_META.other
              return (
                <div key={r.id} className="og-glass p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className="flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ background: `${meta.color}1f`, color: meta.color }}
                    >
                      <meta.icon size={11} />
                      {meta.label}
                    </span>
                    {r.severity && (
                      <span
                        className={cn(
                          "rounded border px-1.5 py-0.5 text-[10px] font-medium",
                          SEVERITY_TONE[r.severity],
                        )}
                      >
                        {r.severity}
                      </span>
                    )}
                    {r.environment === "test" && (
                      <span className="rounded border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                        test
                      </span>
                    )}
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("en-KE")}
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap text-sm text-foreground">{r.message}</p>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    {r.reporter && <span>{r.reporter}</span>}
                    {r.route && <span className="font-mono">{r.route}</span>}
                    {r.amount !== null && <span className="og-num">KSh {Number(r.amount).toLocaleString()}</span>}
                  </div>

                  <Textarea
                    value={notes[r.id] ?? r.admin_notes ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                    onBlur={(e) => {
                      const next = e.target.value.trim()
                      if (next !== (r.admin_notes ?? "")) patch(r.id, { admin_notes: next })
                    }}
                    rows={2}
                    placeholder="Triage notes…"
                    className="mt-3 resize-none border-border/60 bg-muted/30 text-xs"
                  />

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => patch(r.id, { status: s })}
                        disabled={busyId === r.id || r.status === s}
                        className={cn(
                          "og-press rounded-lg px-2.5 py-1.5 text-[11px] font-medium",
                          r.status === s
                            ? "bg-foreground text-background"
                            : "bg-muted text-muted-foreground hover:bg-muted/70",
                        )}
                      >
                        {busyId === r.id && r.status !== s ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          s.replace("_", " ")
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
