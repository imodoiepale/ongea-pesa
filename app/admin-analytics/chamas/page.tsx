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
      active: "bg-emerald-100 text-emerald-700",
      paused: "bg-amber-100 text-amber-700",
      completed: "bg-blue-100 text-blue-700",
      cancelled: "bg-zinc-100 text-zinc-600",
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
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Chama Monitor</h1>
            <p className="text-xs text-zinc-500">Monitor all chama groups in the system</p>
          </div>
          <button onClick={fetchAllChamas} disabled={loading} className={cn("p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700")}>
            <RefreshCw className={cn("w-4 h-4 text-zinc-600", loading && "animate-spin")} />
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total", value: chamas.length, icon: Users, gradient: "from-slate-500 to-slate-600" },
            { label: "Active", value: activeCount, icon: Zap, gradient: "from-emerald-500 to-emerald-600" },
            { label: "Paused", value: pausedCount, icon: Clock, gradient: "from-amber-500 to-amber-600" },
            { label: "Completed", value: completedCount, icon: CheckCircle, gradient: "from-blue-500 to-blue-600" },
            { label: "Members", value: totalMembers, icon: User, gradient: "from-purple-500 to-purple-600" },
            { label: "Collected", value: formatCurrency(totalCollected), icon: Wallet, gradient: "from-teal-500 to-teal-600" },
          ].map((stat, i) => (
            <div key={i} className="relative overflow-hidden p-3 rounded-xl bg-white dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 shadow-sm">
              <div className={cn("absolute top-0 right-0 w-12 h-12 -mr-4 -mt-4 rounded-full opacity-20 bg-gradient-to-br", stat.gradient)} />
              <div className="flex items-center gap-2 relative">
                <div className={cn("p-1.5 rounded-lg bg-gradient-to-br shadow", stat.gradient)}>
                  <stat.icon className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{stat.value}</p>
                  <p className="text-[10px] text-zinc-500">{stat.label}</p>
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
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
            <p className="text-[10px] text-emerald-600 uppercase font-medium">Distributed</p>
            <p className="text-lg font-bold text-emerald-700">{formatCurrency(totalDistributed)}</p>
          </div>
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
            <p className="text-[10px] text-purple-600 uppercase font-medium">Pending</p>
            <p className="text-lg font-bold text-purple-700">{formatCurrency(totalCollected - totalDistributed)}</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9 text-sm bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-lg" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            <option value="all">All Types</option>
            <option value="savings">Savings</option>
            <option value="collection">Collection</option>
            <option value="fundraising">Fundraising</option>
          </select>
        </div>

        {/* Chamas Table */}
        <div className="rounded-xl overflow-hidden bg-white dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 shadow-sm">
          <div className="p-3 border-b border-zinc-100 dark:border-zinc-700/50">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              All Chamas <span className="text-xs font-normal text-zinc-500 ml-1">({filteredChamas.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16"><RefreshCw className="w-8 h-8 text-zinc-400 animate-spin" /></div>
          ) : filteredChamas.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Users className="w-8 h-8 text-zinc-400" /></div>
              <p className="text-zinc-500">No chamas found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-50 dark:bg-zinc-700/30">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-zinc-500 uppercase">Chama</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-zinc-500 uppercase">Creator</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-zinc-500 uppercase">Type</th>
                    <th className="px-5 py-4 text-center text-xs font-semibold text-zinc-500 uppercase">Members</th>
                    <th className="px-5 py-4 text-right text-xs font-semibold text-zinc-500 uppercase">Contribution</th>
                    <th className="px-5 py-4 text-right text-xs font-semibold text-zinc-500 uppercase">Collected</th>
                    <th className="px-5 py-4 text-center text-xs font-semibold text-zinc-500 uppercase">Cycle</th>
                    <th className="px-5 py-4 text-center text-xs font-semibold text-zinc-500 uppercase">Status</th>
                    <th className="px-5 py-4 text-center text-xs font-semibold text-zinc-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                  {filteredChamas.map((chama) => {
                    const TypeIcon = getChamaTypeIcon(chama.chama_type || "savings")
                    return (
                      <tr key={chama.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/20">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", chama.chama_type === "fundraising" ? "bg-purple-100" : chama.chama_type === "collection" ? "bg-blue-100" : "bg-emerald-100")}>
                              <TypeIcon className={cn("w-5 h-5", chama.chama_type === "fundraising" ? "text-purple-600" : chama.chama_type === "collection" ? "text-blue-600" : "text-emerald-600")} />
                            </div>
                            <div>
                              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{chama.name}</p>
                              <p className="text-xs text-zinc-500 truncate max-w-[120px]">{chama.id.slice(0, 8)}...</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div>
                            <p className="text-xs font-medium text-zinc-700 truncate max-w-[120px]">{chama.creator?.email || "Unknown"}</p>
                            <p className="text-[10px] text-zinc-400">{chama.creator?.phone_number || ""}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-100 text-zinc-600 capitalize">{chama.chama_type || "savings"}</span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="font-semibold text-zinc-900">{chama.members?.length || 0}</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="font-mono font-semibold text-zinc-900">{formatCurrency(chama.contribution_amount)}</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className={cn("font-mono font-semibold", chama.total_collected > 0 ? "text-emerald-600" : "text-zinc-400")}>{formatCurrency(chama.total_collected)}</span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="text-sm font-medium text-zinc-600">{chama.current_cycle}</span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={cn("px-2.5 py-1 text-xs font-semibold rounded-full", getStatusBadge(chama.status))}>{chama.status}</span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button onClick={() => { setSelectedChama(chama); setShowDetailModal(true) }} className="p-2 hover:bg-zinc-100 rounded-lg"><Eye className="w-5 h-5 text-zinc-500" /></button>
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
          <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 shadow-2xl">
            <div className={cn("flex items-center justify-between p-6 border-b", selectedChama.chama_type === "fundraising" ? "bg-gradient-to-r from-purple-600 to-purple-700" : selectedChama.chama_type === "collection" ? "bg-gradient-to-r from-blue-600 to-blue-700" : "bg-gradient-to-r from-emerald-600 to-emerald-700")}>
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
                  { label: "Contribution", value: formatCurrency(selectedChama.contribution_amount), bg: "bg-zinc-50" },
                  { label: "Members", value: selectedChama.members?.length || 0, bg: "bg-blue-50" },
                  { label: "Collected", value: formatCurrency(selectedChama.total_collected), bg: "bg-emerald-50" },
                  { label: "Distributed", value: formatCurrency(selectedChama.total_distributed), bg: "bg-purple-50" },
                ].map((s, i) => (
                  <div key={i} className={cn("p-4 rounded-xl text-center", s.bg)}>
                    <p className="text-xs text-zinc-600 mb-1">{s.label}</p>
                    <p className="text-xl font-bold text-zinc-900">{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-4 bg-zinc-50 rounded-xl">
                  <p className="text-zinc-500 mb-1">Chama ID</p>
                  <p className="font-mono text-zinc-900 text-xs">{selectedChama.id}</p>
                </div>
                <div className="p-4 bg-zinc-50 rounded-xl">
                  <p className="text-zinc-500 mb-1">Creator</p>
                  <p className="font-medium text-zinc-900">{selectedChama.creator?.email || "Unknown"}</p>
                </div>
                <div className="p-4 bg-zinc-50 rounded-xl">
                  <p className="text-zinc-500 mb-1">Frequency</p>
                  <p className="font-medium text-zinc-900 capitalize">{selectedChama.collection_frequency}</p>
                </div>
                <div className="p-4 bg-zinc-50 rounded-xl">
                  <p className="text-zinc-500 mb-1">Rotation</p>
                  <p className="font-medium text-zinc-900 capitalize">{selectedChama.rotation_type}</p>
                </div>
                <div className="p-4 bg-zinc-50 rounded-xl">
                  <p className="text-zinc-500 mb-1">Current Cycle</p>
                  <p className="font-medium text-zinc-900">{selectedChama.current_cycle}</p>
                </div>
                <div className="p-4 bg-zinc-50 rounded-xl">
                  <p className="text-zinc-500 mb-1">Next Collection</p>
                  <p className="font-medium text-zinc-900">{selectedChama.next_collection_date ? new Date(selectedChama.next_collection_date).toLocaleDateString() : "Not set"}</p>
                </div>
              </div>

              {selectedChama.description && (
                <div>
                  <h4 className="text-sm font-semibold text-zinc-500 mb-2">Description</h4>
                  <p className="text-sm text-zinc-700 bg-zinc-50 p-4 rounded-xl">{selectedChama.description}</p>
                </div>
              )}

              {selectedChama.members && selectedChama.members.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-zinc-500 mb-2">Members ({selectedChama.members.length})</h4>
                  <div className="rounded-xl overflow-hidden border border-zinc-200">
                    <table className="w-full">
                      <thead className="bg-zinc-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-500">#</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-500">Name</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-500">Phone</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-zinc-500">Contributed</th>
                          <th className="px-4 py-2 text-center text-xs font-semibold text-zinc-500">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {selectedChama.members.map((m: any) => (
                          <tr key={m.id}>
                            <td className="px-4 py-2 text-sm text-zinc-500">{m.rotation_position}</td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-zinc-900">{m.name}</span>
                                {m.role === "admin" && <span className="px-1.5 py-0.5 text-[9px] bg-purple-100 text-purple-600 rounded">Admin</span>}
                              </div>
                            </td>
                            <td className="px-4 py-2 text-sm text-zinc-500">{m.phone_number}</td>
                            <td className="px-4 py-2 text-right text-sm font-mono text-zinc-600">{formatCurrency(m.total_contributed || 0)}</td>
                            <td className="px-4 py-2 text-center">
                              <span className={cn("px-2 py-0.5 text-[10px] rounded-full font-medium", m.status === "active" ? "bg-emerald-100 text-emerald-700" : m.status === "exit_requested" ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-600")}>{m.status}</span>
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
                  <h4 className="text-sm font-semibold text-zinc-500 mb-2">Recent Cycles ({selectedChama.cycles.length})</h4>
                  <div className="space-y-2">
                    {selectedChama.cycles.slice(0, 5).map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold", c.status === "completed" ? "bg-emerald-500 text-white" : "bg-zinc-200 text-zinc-600")}>{c.cycle_number}</div>
                          <div>
                            <p className="text-sm font-medium text-zinc-900">Cycle {c.cycle_number}</p>
                            <p className="text-xs text-zinc-500">{new Date(c.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono text-zinc-600">{formatCurrency(c.collected_amount || 0)}</p>
                          <span className={cn("px-2 py-0.5 text-[10px] rounded-full", c.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>{c.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-zinc-50">
              <p className="text-xs text-zinc-500 text-center">Admin view only - No actions available</p>
            </div>
          </div>
        </div>
      )}
      </div>
    </Layout>
  )
}
