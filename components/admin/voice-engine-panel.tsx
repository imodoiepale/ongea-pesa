"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { AlertTriangle, Loader2, Mic, RefreshCw, Search } from "lucide-react"
import { fetchJson } from "@/lib/fetch-json"

/**
 * Admin control for which voice runtime each account uses.
 *
 * ElevenLabs is the default and stays the live payment path. LiveKit + Fish
 * Audio is opt-in per account so the two can be A/B compared without putting
 * real payments at the mercy of the experimental stack.
 *
 * The switch is admin-only twice over: this panel sits behind the admin layout,
 * and profiles.voice_engine is additionally protected by a DB trigger that
 * rejects any change not made by the service role.
 */

interface Row {
  id: string
  email: string | null
  full_name: string | null
  voice_engine: "elevenlabs" | "livekit"
}

export function VoiceEnginePanel() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const json: any = await fetchJson("/api/admin/voice-engine")
      setRows(json.users ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load users")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const setEngine = async (row: Row, engine: Row["voice_engine"]) => {
    setBusyId(row.id)
    setError(null)
    try {
      const json: any = await fetchJson("/api/admin/voice-engine", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: row.id, engine }),
      })
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, voice_engine: engine } : r)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the engine")
    } finally {
      setBusyId(null)
    }
  }

  const filtered = useMemo(() => {
    if (!q) return rows
    const needle = q.toLowerCase()
    return rows.filter(
      (r) => r.email?.toLowerCase().includes(needle) || r.full_name?.toLowerCase().includes(needle),
    )
  }, [rows, q])

  const onLiveKit = rows.filter((r) => r.voice_engine === "livekit").length

  const surface = cn("rounded-xl overflow-hidden", "bg-card", "border border-border/40", "shadow-sm backdrop-blur-xl")

  return (
    <div className={surface}>
      <div className="p-4 border-b border-border/40 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={cn("p-2 rounded-lg", "bg-muted")}>
            <Mic className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Voice Engine</h2>
            <p className="text-[11px] text-muted-foreground">
              {onLiveKit} of {rows.length} accounts on LiveKit + Fish Audio
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className={cn("p-2 rounded-lg", "bg-muted", "hover:bg-muted", "transition-colors duration-200")}
          aria-label="Refresh"
        >
          <RefreshCw className={cn("w-4 h-4 text-muted-foreground", loading && "animate-spin")} />
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-[11px] text-amber-700 dark:text-amber-300">
            LiveKit is the experimental runtime. It posts to the same payment webhook as ElevenLabs, but
            it has not been proven against live traffic — move accounts you can watch, not customers.
            The worker must be running on the VPS or voice will not connect at all.
          </p>
        </div>

        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email or name…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-10 bg-muted/30 border-border/60"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted/30 border-b border-border/60">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">User</th>
              <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Engine</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {loading ? (
              <tr>
                <td colSpan={2} className="px-3 py-8 text-center">
                  <RefreshCw className="w-4 h-4 mx-auto animate-spin text-muted-foreground" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-3 py-8 text-center text-muted-foreground">
                  No users found
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-3 py-2">
                    <p className="font-medium text-foreground">{r.full_name || r.email || r.id}</p>
                    {r.full_name && r.email && (
                      <p className="text-[10px] text-muted-foreground">{r.email}</p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-center">
                      <div className="flex rounded-lg overflow-hidden border border-border/60">
                        {(["elevenlabs", "livekit"] as const).map((engine) => (
                          <button
                            key={engine}
                            onClick={() => setEngine(r, engine)}
                            disabled={busyId === r.id || r.voice_engine === engine}
                            className={cn(
                              "px-2.5 py-1 text-[10px] font-medium transition-colors duration-200",
                              r.voice_engine === engine
                                ? "bg-foreground text-background"
                                : "bg-muted text-muted-foreground hover:bg-muted/70",
                            )}
                          >
                            {busyId === r.id && r.voice_engine !== engine ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : engine === "elevenlabs" ? (
                              "ElevenLabs"
                            ) : (
                              "LiveKit"
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
