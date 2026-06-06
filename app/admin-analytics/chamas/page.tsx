"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import Layout from "@/components/kokonutui/layout"
import {
  Users, Eye, RefreshCw, Search, Wallet, Clock, CheckCircle,
  AlertTriangle, ArrowLeft, TrendingUp, BarChart3, PieChart, X, User,
  DollarSign, FileText, Zap, Bell, Gift, PiggyBank, HandCoins,
  Calendar, Send, Activity,
} from "lucide-react"
import Link from "next/link"

interface Chama {
  id: string
  name: string
  description: string
  creator_id: string
  chama_type: string
  contribution_amount: number
  currency: string
  collection_frequency: string
  rotation_type: string
  current_cycle: number
  status: string
  total_collected: number
  total_distributed: number
  next_collection_date: string | null
  created_at: string
  members?: any[]
  cycles?: any[]
  creator?: { email: string; phone_number: string }
}

export default function AdminChamasPage() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [chamas, setChamas] = useState<Chama[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [selectedChama, setSelectedChama] = useState<Chama | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => { checkAuth() }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push("/login"); return }
    setUser(user)
    await fetchAllChamas()
  }

  const fetchAllChamas = async () => {
    setLoading(true)
    try {
      // Fetch chamas without FK join
      const { data: chamaData, error } = await supabase
        .from("chamas")
        .select(`*, members:chama_members(*), cycles:chama_cycles(*)`)
        .order("created_at", { ascending: false })

      if (error) throw error
      
      // Get creator profiles separately
      const creatorIds = [...new Set((chamaData || []).map(c => c.creator_id).filter(Boolean))]
      let creatorsMap: Record<string, any> = {}
      
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, phone_number, full_name")
          .in("id", creatorIds)
        if (profiles) {
          creatorsMap = Object.fromEntries(profiles.map(p => [p.id, p]))
        }
      }
      
      // Combine data
      const enrichedChamas = (chamaData || []).map(c => ({
        ...c,
        creator: creatorsMap[c.creator_id] || null
      }))
      
      setChamas(enrichedChamas)
    } catch (err) {
      console.error("Error fetching chamas:", err)
    } finally {
      setLoading(false)
    }
  }

  const filteredChamas = chamas.filter(c => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false
    if (typeFilter !== "all" && c.chama_type !== typeFilter) return false
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return c.name.toLowerCase().includes(search) || c.id.toLowerCase().includes(search)
    }
    return true
  })

  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(amount)

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-brand/10 text-brand",
      paused: "bg-amber-100 text-amber-700",
      completed: "bg-blue-100 text-blue-700",
      cancelled: "bg-muted text-muted-foreground",
    }
    return styles[status] || styles.active
  }

  const getChamaTypeIcon = (type: string) => {
    if (type === "fundraising") return Gift
    if (type === "collection") return HandCoins
    return PiggyBank
  }

  const totalMembers = chamas.reduce((sum, c) => sum + (c.members?.length || 0), 0)
  const totalCollected = chamas.reduce((sum, c) => sum + c.total_collected, 0)
  const totalDistributed = chamas.reduce((sum, c) => sum + c.total_distributed, 0)
  const activeCount = chamas.filter(c => c.status === "active").length
  const pausedCount = chamas.filter(c => c.status === "paused").length
  const completedCount = chamas.filter(c => c.status === "completed").length

  const typeCounts = {
    savings: chamas.filter(c => c.chama_type === "savings" || !c.chama_type).length,
    collection: chamas.filter(c => c.chama_type === "collection").length,
    fundraising: chamas.filter(c => c.chama_type === "fundraising").length,
  }

  const frequencyCounts = {
    daily: chamas.filter(c => c.collection_frequency === "daily").length,
    weekly: chamas.filter(c => c.collection_frequency === "weekly").length,
    biweekly: chamas.filter(c => c.collection_frequency === "biweekly").length,
    monthly: chamas.filter(c => c.collection_frequency === "monthly").length,
  }

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Chama Monitor</h1>
            <p className="text-xs text-muted-foreground">Monitor all chama groups in the system</p>
          </div>
          <button onClick={fetchAllChamas} disabled={loading} className={cn("p-2 rounded-lg bg-muted hover:bg-muted/50")}>
            <RefreshCw className={cn("w-4 h-4 text-muted-foreground", loading && "animate-spin")} />
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total", value: chamas.length, icon: Users, gradient: "from-slate-500 to-slate-600" },
            { label: "Active", value: activeCount, icon: Zap, gradient: "from-brand to-brand" },
            { label: "Paused", value: pausedCount, icon: Clock, gradient: "from-amber-500 to-amber-600" },
            { label: "Completed", value: completedCount, icon: CheckCircle, gradient: "from-blue-500 to-blue-600" },
            { label: "Members", value: totalMembers, icon: User, gradient: "from-purple-500 to-purple-600" },
            { label: "Collected", value: formatCurrency(totalCollected), icon: Wallet, gradient: "from-teal-500 to-teal-600" },
          ].map((stat, i) => (
            <div key={i} className="relative overflow-hidden p-3 rounded-xl bg-card border border-border/40 shadow-sm">
              <div className={cn("absolute top-0 right-0 w-12 h-12 -mr-4 -mt-4 rounded-full opacity-20 bg-gradient-to-br", stat.gradient)} />
              <div className="flex items-center gap-2 relative">
                <div className={cn("p-1.5 rounded-lg bg-gradient-to-br shadow", stat.gradient)}>
                  <stat.icon className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Financial Summary - Compact */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
            <p className="text-[10px] text-blue-600 uppercase font-medium">Collected</p>
            <p className="text-lg font-bold text-blue-700">{formatCurrency(totalCollected)}</p>
          </div>
          <div className="p-3 rounded-xl bg-brand/5 border border-brand/20">
            <p className="text-[10px] text-brand uppercase font-medium">Distributed</p>
            <p className="text-lg font-bold text-brand">{formatCurrency(totalDistributed)}</p>
          </div>
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
            <p className="text-[10px] text-purple-600 uppercase font-medium">Pending</p>
            <p className="text-lg font-bold text-purple-700">{formatCurrency(totalCollected - totalDistributed)}</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9 text-sm bg-card border-border/60 rounded-lg" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg text-xs font-medium bg-card border border-border/60">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-lg text-xs font-medium bg-card border border-border/60">
            <option value="all">All Types</option>
            <option value="savings">Savings</option>
            <option value="collection">Collection</option>
            <option value="fundraising">Fundraising</option>
          </select>
        </div>

        {/* Chamas Table */}
        <div className="rounded-xl overflow-hidden bg-card border border-border/40 shadow-sm">
          <div className="p-3 border-b border-border/40">
            <h2 className="text-sm font-semibold text-foreground">
              All Chamas <span className="text-xs font-normal text-muted-foreground ml-1">({filteredChamas.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16"><RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" /></div>
          ) : filteredChamas.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4"><Users className="w-8 h-8 text-muted-foreground" /></div>
              <p className="text-muted-foreground">No chamas found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Chama</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Creator</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Type</th>
                    <th className="px-5 py-4 text-center text-xs font-semibold text-muted-foreground uppercase">Members</th>
                    <th className="px-5 py-4 text-right text-xs font-semibold text-muted-foreground uppercase">Contribution</th>
                    <th className="px-5 py-4 text-right text-xs font-semibold text-muted-foreground uppercase">Collected</th>
                    <th className="px-5 py-4 text-center text-xs font-semibold text-muted-foreground uppercase">Cycle</th>
                    <th className="px-5 py-4 text-center text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="px-5 py-4 text-center text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredChamas.map((chama) => {
                    const TypeIcon = getChamaTypeIcon(chama.chama_type || "savings")
                    return (
                      <tr key={chama.id} className="hover:bg-muted/50/50">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", chama.chama_type === "fundraising" ? "bg-purple-100" : chama.chama_type === "collection" ? "bg-blue-100" : "bg-brand/10")}>
                              <TypeIcon className={cn("w-5 h-5", chama.chama_type === "fundraising" ? "text-purple-600" : chama.chama_type === "collection" ? "text-blue-600" : "text-brand")} />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{chama.name}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[120px]">{chama.id.slice(0, 8)}...</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div>
                            <p className="text-xs font-medium text-foreground truncate max-w-[120px]">{chama.creator?.email || "Unknown"}</p>
                            <p className="text-[10px] text-muted-foreground">{chama.creator?.phone_number || ""}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-muted text-muted-foreground capitalize">{chama.chama_type || "savings"}</span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="font-semibold text-foreground">{chama.members?.length || 0}</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="font-mono font-semibold text-foreground">{formatCurrency(chama.contribution_amount)}</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className={cn("font-mono font-semibold", chama.total_collected > 0 ? "text-brand" : "text-muted-foreground")}>{formatCurrency(chama.total_collected)}</span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="text-sm font-medium text-muted-foreground">{chama.current_cycle}</span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={cn("px-2.5 py-1 text-xs font-semibold rounded-full", getStatusBadge(chama.status))}>{chama.status}</span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button onClick={() => { setSelectedChama(chama); setShowDetailModal(true) }} className="p-2 hover:bg-muted/50 rounded-lg"><Eye className="w-5 h-5 text-muted-foreground" /></button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Modal */}
      {showDetailModal && selectedChama && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-3xl bg-card shadow-2xl">
            <div className={cn("flex items-center justify-between p-6 border-b", selectedChama.chama_type === "fundraising" ? "bg-gradient-to-r from-purple-600 to-purple-700" : selectedChama.chama_type === "collection" ? "bg-gradient-to-r from-blue-600 to-blue-700" : "bg-gradient-to-r from-brand to-brand")}>
              <div>
                <h2 className="text-xl font-bold text-white">{selectedChama.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 text-xs bg-white/20 text-white rounded-full">{selectedChama.status}</span>
                  <span className="text-xs text-white/70 capitalize">{selectedChama.chama_type || "savings"}</span>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-white/20 rounded-xl text-white"><X className="w-6 h-6" /></button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-5">
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Contribution", value: formatCurrency(selectedChama.contribution_amount), bg: "bg-muted/30" },
                  { label: "Members", value: selectedChama.members?.length || 0, bg: "bg-blue-50" },
                  { label: "Collected", value: formatCurrency(selectedChama.total_collected), bg: "bg-brand/5" },
                  { label: "Distributed", value: formatCurrency(selectedChama.total_distributed), bg: "bg-purple-50" },
                ].map((s, i) => (
                  <div key={i} className={cn("p-4 rounded-xl text-center", s.bg)}>
                    <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                    <p className="text-xl font-bold text-foreground">{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-4 bg-muted/30 rounded-xl">
                  <p className="text-muted-foreground mb-1">Chama ID</p>
                  <p className="font-mono text-foreground text-xs">{selectedChama.id}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-xl">
                  <p className="text-muted-foreground mb-1">Creator</p>
                  <p className="font-medium text-foreground">{selectedChama.creator?.email || "Unknown"}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-xl">
                  <p className="text-muted-foreground mb-1">Frequency</p>
                  <p className="font-medium text-foreground capitalize">{selectedChama.collection_frequency}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-xl">
                  <p className="text-muted-foreground mb-1">Rotation</p>
                  <p className="font-medium text-foreground capitalize">{selectedChama.rotation_type}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-xl">
                  <p className="text-muted-foreground mb-1">Current Cycle</p>
                  <p className="font-medium text-foreground">{selectedChama.current_cycle}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-xl">
                  <p className="text-muted-foreground mb-1">Next Collection</p>
                  <p className="font-medium text-foreground">{selectedChama.next_collection_date ? new Date(selectedChama.next_collection_date).toLocaleDateString() : "Not set"}</p>
                </div>
              </div>

              {selectedChama.description && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Description</h4>
                  <p className="text-sm text-foreground bg-muted/30 p-4 rounded-xl">{selectedChama.description}</p>
                </div>
              )}

              {selectedChama.members && selectedChama.members.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Members ({selectedChama.members.length})</h4>
                  <div className="rounded-xl overflow-hidden border border-border/60">
                    <table className="w-full">
                      <thead className="bg-muted/30">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">#</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Name</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Phone</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">Contributed</th>
                          <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {selectedChama.members.map((m: any) => (
                          <tr key={m.id}>
                            <td className="px-4 py-2 text-sm text-muted-foreground">{m.rotation_position}</td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground">{m.name}</span>
                                {m.role === "admin" && <span className="px-1.5 py-0.5 text-[9px] bg-purple-100 text-purple-600 rounded">Admin</span>}
                              </div>
                            </td>
                            <td className="px-4 py-2 text-sm text-muted-foreground">{m.phone_number}</td>
                            <td className="px-4 py-2 text-right text-sm font-mono text-muted-foreground">{formatCurrency(m.total_contributed || 0)}</td>
                            <td className="px-4 py-2 text-center">
                              <span className={cn("px-2 py-0.5 text-[10px] rounded-full font-medium", m.status === "active" ? "bg-brand/10 text-brand" : m.status === "exit_requested" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground")}>{m.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedChama.cycles && selectedChama.cycles.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Recent Cycles ({selectedChama.cycles.length})</h4>
                  <div className="space-y-2">
                    {selectedChama.cycles.slice(0, 5).map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold", c.status === "completed" ? "bg-brand/50 text-white" : "bg-muted text-muted-foreground")}>{c.cycle_number}</div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Cycle {c.cycle_number}</p>
                            <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono text-muted-foreground">{formatCurrency(c.collected_amount || 0)}</p>
                          <span className={cn("px-2 py-0.5 text-[10px] rounded-full", c.status === "completed" ? "bg-brand/10 text-brand" : "bg-amber-100 text-amber-700")}>{c.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-muted/30">
              <p className="text-xs text-muted-foreground text-center">Admin view only - No actions available</p>
            </div>
          </div>
        </div>
      )}
      </div>
    </Layout>
  )
}
