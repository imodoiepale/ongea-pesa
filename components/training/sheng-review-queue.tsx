"use client"

import { useCallback, useEffect, useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Check, Loader2, Pencil, RefreshCw, X } from "lucide-react"
import { fetchJson } from "@/lib/fetch-json"

/**
 * Sheng training review queue.
 *
 * Access is enforced server-side by /api/training/review against
 * sheng_reviewers, NOT the admin allowlist, so the queue can be handed to many
 * invited reviewers without granting them the money dashboards.
 *
 * Rendered by two routes: /review (standalone, for invited reviewers) and
 * /admin-analytics/sheng-review (inside the admin shell, for convenience).
 */

interface QueueItem {
  id: string
  transcript: string
  variety: string
  duration_ms: number | null
  review_count: number
  created_at: string
  prompt_text: string | null
  audio_url: string | null
}

export function ShengReviewQueue() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [requiredReviews, setRequiredReviews] = useState(2)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [corrections, setCorrections] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const [reviewed, setReviewed] = useState(0)

  const loadQueue = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const json: any = await fetchJson("/api/training/review?limit=25")
      setQueue(json.queue ?? [])
      setRequiredReviews(json.required_reviews ?? 2)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the queue")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadQueue()
  }, [loadQueue])

  const submit = async (item: QueueItem, verdict: "approve" | "correct" | "reject") => {
    setBusyId(item.id)
    setError(null)
    try {
      const json: any = await fetchJson("/api/training/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contribution_id: item.id,
          verdict,
          corrected_transcript: verdict === "correct" ? corrections[item.id]?.trim() : undefined,
        }),
      })
      setQueue((prev) => prev.filter((q) => q.id !== item.id))
      setReviewed((n) => n + 1)
      setEditing(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the review")
    } finally {
      setBusyId(null)
    }
  }

  const surface = "og-glass"

  return (
    <div className="og-screen-in space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Sheng Review Queue</h1>
          <p className="text-xs text-muted-foreground">
            {requiredReviews} independent verdicts settle a clip · {reviewed} reviewed this session
          </p>
        </div>
        <button
          onClick={loadQueue}
          disabled={loading}
          className={cn("p-2 rounded-lg", "bg-muted", "hover:bg-muted", "transition-colors duration-200")}
          aria-label="Refresh queue"
        >
          <RefreshCw className={cn("w-4 h-4 text-muted-foreground", loading && "animate-spin")} />
        </button>
      </div>

      {error && (
        <div className={cn("p-4", surface, "border-red-500/40")}>
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className={cn("p-12 flex justify-center", surface)}>
          <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : queue.length === 0 ? (
        <div className={cn("p-12 text-center", surface)}>
          <p className="text-sm text-muted-foreground">Queue is empty — nothing left to review.</p>
        </div>
      ) : (
        queue.map((item) => (
          <div key={item.id} className={cn("p-4", surface)}>
            <div className="flex items-center justify-between mb-2">
              <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-brand/10 text-brand">
                {item.variety}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {item.review_count}/{requiredReviews} reviews
                {item.duration_ms ? ` · ${(item.duration_ms / 1000).toFixed(1)}s` : ""}
              </span>
            </div>

            {item.prompt_text && (
              <p className="text-[11px] text-muted-foreground mb-1">
                Prompt: <span className="italic">{item.prompt_text}</span>
              </p>
            )}

            <p className="text-sm font-medium text-foreground mb-3">{item.transcript}</p>

            {item.audio_url ? (
              <audio controls src={item.audio_url} className="w-full mb-3" />
            ) : (
              <p className="text-xs text-red-600 dark:text-red-400 mb-3">Audio unavailable</p>
            )}

            {editing === item.id && (
              <Textarea
                value={corrections[item.id] ?? item.transcript}
                onChange={(e) => setCorrections((c) => ({ ...c, [item.id]: e.target.value }))}
                rows={2}
                className="mb-3"
                placeholder="Corrected transcript"
              />
            )}

            <div className="flex gap-2">
              <button
                onClick={() => submit(item, "approve")}
                disabled={busyId === item.id}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-medium text-white hover:bg-brand/90 disabled:opacity-50"
              >
                {busyId === item.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Matches
              </button>

              {editing === item.id ? (
                <button
                  onClick={() => submit(item, "correct")}
                  disabled={busyId === item.id || !(corrections[item.id] ?? "").trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save fix
                </button>
              ) : (
                <button
                  onClick={() => {
                    setEditing(item.id)
                    setCorrections((c) => ({ ...c, [item.id]: item.transcript }))
                  }}
                  disabled={busyId === item.id}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/70 disabled:opacity-50"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Fix text
                </button>
              )}

              <button
                onClick={() => submit(item, "reject")}
                disabled={busyId === item.id}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-muted/70 disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                Reject
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
