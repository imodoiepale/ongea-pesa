"use client"

import { useState, useEffect } from "react"
import Layout from "@/components/kokonutui/layout"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { RefreshCw, ShieldAlert, ShieldCheck, AlertTriangle, Search } from "lucide-react"

interface SecurityEvent {
  id: string
  user_id: string | null
  event_type: string
  severity: "info" | "warning" | "critical"
  ip: string | null
  user_agent: string | null
  metadata: Record<string, any>
  created_at: string
}

const severityStyle: Record<string, string> = {
  info: "text-green-600 bg-green-50 dark:bg-green-950",
  warning: "text-amber-600 bg-amber-50 dark:bg-amber-950",
  critical: "text-red-600 bg-red-50 dark:bg-red-950",
}

export default function SecurityEventsPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const fetchEvents = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/security-events")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load")
      setEvents(data.events)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const filtered = events.filter(
    (e) =>
      e.event_type.toLowerCase().includes(search.toLowerCase()) ||
      (e.user_id || "").includes(search) ||
      (e.ip || "").includes(search)
  )

  const Icon = (s: string) =>
    s === "critical" ? <ShieldAlert className="h-4 w-4" /> : s === "warning" ? <AlertTriangle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-green-500" /> Security Events
            </h1>
            <p className="text-sm text-gray-500">Audit trail of authentication, lockouts, and money movement.</p>
          </div>
          <button onClick={fetchEvents} className="flex items-center gap-2 text-sm px-3 py-2 border rounded-lg">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input className="pl-9" placeholder="Search by event, user, or IP" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-left">
              <tr>
                <th className="p-3">Time</th>
                <th className="p-3">Event</th>
                <th className="p-3">Severity</th>
                <th className="p-3">User</th>
                <th className="p-3">IP</th>
                <th className="p-3">Detail</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-t dark:border-gray-800">
                  <td className="p-3 whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                  <td className="p-3 font-medium">{e.event_type}</td>
                  <td className="p-3">
                    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs", severityStyle[e.severity])}>
                      {Icon(e.severity)} {e.severity}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs">{e.user_id?.slice(0, 8) || "—"}</td>
                  <td className="p-3 font-mono text-xs">{e.ip || "—"}</td>
                  <td className="p-3 text-xs text-gray-500 max-w-xs truncate">{JSON.stringify(e.metadata)}</td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-gray-400">No events</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
