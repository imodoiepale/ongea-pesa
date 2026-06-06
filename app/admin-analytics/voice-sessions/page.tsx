"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import Layout from "@/components/kokonutui/layout"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  RefreshCw,
  Mic,
  MicOff,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Users,
  Timer,
  TrendingUp,
} from "lucide-react"

interface VoiceSession {
  id: string
  user_id: string
  session_id: string
  status: string
  created_at: string
  expires_at?: string
  ended_at?: string
  duration_seconds?: number
  messages_count?: number
  profiles?: {
    email?: string
    phone_number?: string
  }
}

interface TopUser {
  user_id: string
  email?: string
  session_count: number
  total_duration: number
}

export default function VoiceSessionsPage() {
  const [sessions, setSessions] = useState<VoiceSession[]>([])
  const [topUsers, setTopUsers] = useState<TopUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const supabase = createClient()

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("voice_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200)

      if (error) {
        console.error("Error fetching voice sessions:", error)
        setSessions([])
      } else {
        // Fetch user profiles separately
        const userIds = [...new Set((data || []).map(s => s.user_id).filter(Boolean))]
        let profilesMap: Record<string, any> = {}
        
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, email, phone_number")
            .in("id", userIds)
          
          if (profiles) {
            profilesMap = Object.fromEntries(profiles.map(p => [p.id, p]))
          }
        }

        // Enrich sessions with profiles
        const enrichedSessions = (data || []).map(s => ({
          ...s,
          profiles: profilesMap[s.user_id] || null,
          duration_seconds: s.ended_at ? Math.floor((new Date(s.ended_at).getTime() - new Date(s.created_at).getTime()) / 1000) : null
        }))

        setSessions(enrichedSessions)

        // Calculate top users
        const userStats = new Map<string, { count: number; duration: number; email?: string }>()
        for (const session of enrichedSessions) {
          const existing = userStats.get(session.user_id) || { count: 0, duration: 0, email: session.profiles?.email }
          existing.count++
          existing.duration += session.duration_seconds || 0
          userStats.set(session.user_id, existing)
        }

        const topUsersArray = Array.from(userStats.entries())
          .map(([user_id, stats]) => ({
            user_id,
            email: stats.email,
            session_count: stats.count,
            total_duration: stats.duration
          }))
          .sort((a, b) => b.session_count - a.session_count)
          .slice(0, 5)

        setTopUsers(topUsersArray)
      }
    } catch (err) {
      console.error("Failed to fetch voice sessions:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-brand/10 text-brand",
      completed: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
      expired: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
      error: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
    }
    return colors[status] || "bg-muted text-muted-foreground"
  }

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return "—"
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const filteredSessions = sessions.filter((s) => {
    // Filter by selected user first
    if (selectedUserId && s.user_id !== selectedUserId) return false
    
    // Then apply search filter
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      s.session_id?.toLowerCase().includes(search) ||
      s.user_id?.toLowerCase().includes(search) ||
      s.profiles?.email?.toLowerCase().includes(search)
    )
  })

  const activeSessions = sessions.filter((s) => s.status === "active").length
  const completedSessions = sessions.filter((s) => s.status === "completed").length
  const errorSessions = sessions.filter((s) => s.status === "error").length
  const totalDuration = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0)

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Voice Sessions</h1>
            <p className="text-xs text-muted-foreground">Monitor ElevenLabs voice interaction sessions</p>
          </div>
          <button
            onClick={fetchSessions}
            disabled={loading}
            className={cn(
              "p-2 rounded-lg",
              "bg-muted",
              "hover:bg-muted",
              "transition-colors duration-200"
            )}
          >
            <RefreshCw className={cn("w-4 h-4 text-muted-foreground", loading && "animate-spin")} />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Sessions", value: sessions.length, icon: Mic, color: "text-blue-600 dark:text-blue-400" },
            { label: "Active Now", value: activeSessions, icon: Mic, color: "text-brand" },
            { label: "Completed", value: completedSessions, icon: CheckCircle, color: "text-blue-600 dark:text-blue-400" },
            { label: "Errors", value: errorSessions, icon: XCircle, color: "text-red-600 dark:text-red-400" },
            { label: "Total Duration", value: formatDuration(totalDuration), icon: Timer, color: "text-purple-600 dark:text-purple-400" },
            { label: "Unique Users", value: topUsers.length, icon: Users, color: "text-orange-600 dark:text-orange-400" },
          ].map((stat, i) => (
            <div
              key={i}
              className={cn(
                "p-3 rounded-xl",
                "bg-card",
                "border border-border/40",
                "shadow-sm backdrop-blur-xl"
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn("p-1.5 rounded-lg", "bg-muted")}>
                  <stat.icon className={cn("w-3.5 h-3.5", stat.color)} />
                </div>
                <div>
                  <p className={cn("text-sm font-semibold", stat.color)}>{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Top Users */}
          <div
            className={cn(
              "rounded-xl overflow-hidden",
              "bg-card",
              "border border-border/40",
              "shadow-sm backdrop-blur-xl"
            )}
          >
            <div className="p-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <div className={cn("p-2 rounded-lg", "bg-muted")}>
                  <TrendingUp className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">Top Voice Users</h2>
              </div>
            </div>
            <div className="divide-y divide-border/40">
              {topUsers.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">No user data</div>
              ) : (
                topUsers.map((user, index) => (
                  <div 
                    key={user.user_id} 
                    onClick={() => setSelectedUserId(selectedUserId === user.user_id ? null : user.user_id)}
                    className={cn(
                      "flex items-center gap-3 p-3 cursor-pointer transition-colors",
                      selectedUserId === user.user_id 
                        ? "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500" 
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                      index === 0 ? "bg-amber-100 text-amber-600" :
                      index === 1 ? "bg-muted text-muted-foreground" :
                      index === 2 ? "bg-orange-100 text-orange-600" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {user.email || user.user_id.slice(0, 12) + "..."}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{user.session_count} sessions</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono text-purple-600 dark:text-purple-400">
                        {formatDuration(user.total_duration)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sessions Table */}
          <div
            className={cn(
              "lg:col-span-2 rounded-xl overflow-hidden",
              "bg-card",
              "border border-border/40",
              "shadow-sm backdrop-blur-xl"
            )}
          >
            <div className="p-4 border-b border-border/40 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground">
                  Session History
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    ({filteredSessions.length} sessions)
                  </span>
                </h2>
                {selectedUserId && (
                  <button
                    onClick={() => setSelectedUserId(null)}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    <span>Filtered by user</span>
                    <span className="font-bold">×</span>
                  </button>
                )}
              </div>
              <div className="relative w-48">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-xs bg-muted/30 border-border/60"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/30 border-b border-border/60">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-10">#</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Session ID</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">User</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Started</th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Duration</th>
                    <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-muted-foreground" />
                        <p className="text-muted-foreground">Loading sessions...</p>
                      </td>
                    </tr>
                  ) : filteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                        No voice sessions found
                      </td>
                    </tr>
                  ) : (
                    filteredSessions.map((session, index) => (
                      <tr
                        key={session.id}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-3 py-2 text-muted-foreground font-mono">{index + 1}</td>
                        <td className="px-3 py-2">
                          <code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
                            {session.session_id?.slice(0, 16)}...
                          </code>
                        </td>
                        <td className="px-3 py-2 text-foreground">
                          {session.profiles?.email || session.user_id?.slice(0, 12) + "..."}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                          {new Date(session.created_at).toLocaleDateString("en-KE", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-purple-600 dark:text-purple-400">
                          {formatDuration(session.duration_seconds)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", getStatusColor(session.status))}>
                            {session.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
