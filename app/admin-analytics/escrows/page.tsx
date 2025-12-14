"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import Layout from "@/components/kokonutui/layout"
import {
  Shield, Eye, RefreshCw, Search, Users, Wallet, Clock, CheckCircle,
  AlertTriangle, Lock, Unlock, Target, Fingerprint, Scale, ArrowLeft,
  TrendingUp, BarChart3, PieChart, Activity, X, User, Calendar,
  DollarSign, FileText, Zap, Timer, Home, Bell, Settings,
} from "lucide-react"
import Link from "next/link"

interface Escrow {
  id: string
  title: string
  description: string
  escrow_type: string
  creator_id: string
  total_amount: number
  currency: string
  funded_amount: number
  released_amount: number
  fee_percentage: number
  status: string
  requires_multi_sig: boolean
  required_signatures: number
  collected_signatures: number
  lock_until: string | null
  auto_release_at: string | null
  created_at: string
  participants?: any[]
  milestones?: any[]
  creator?: { email: string; phone_number: string }
}

export default function AdminEscrowsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [escrows, setEscrows] = useState<Escrow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [selectedEscrow, setSelectedEscrow] = useState<Escrow | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => { checkAuth() }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push("/login"); return }
    setUser(user)
    await fetchAllEscrows()
  }

  const fetchAllEscrows = async () => {
    setLoading(true)
    try {
      // Fetch escrows without FK join
      const { data: escrowData, error } = await supabase
        .from("escrows")
        .select(`*, participants:escrow_participants(*), milestones:escrow_milestones(*)`)
        .order("created_at", { ascending: false })

      if (error) throw error
      
      // Get creator profiles separately
      const creatorIds = [...new Set((escrowData || []).map(e => e.creator_id).filter(Boolean))]
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
      const enrichedEscrows = (escrowData || []).map(e => ({
        ...e,
        creator: creatorsMap[e.creator_id] || null
      }))
      
      setEscrows(enrichedEscrows)
    } catch (err) {
      console.error("Error fetching escrows:", err)
    } finally {
      setLoading(false)
    }
  }

  const filteredEscrows = escrows.filter(e => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false
    if (typeFilter !== "all" && e.escrow_type !== typeFilter) return false
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return e.title.toLowerCase().includes(search) || e.id.toLowerCase().includes(search)
    }
    return true
  })

  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(amount)

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-zinc-100 text-zinc-600",
      pending_funding: "bg-amber-100 text-amber-700",
      funded: "bg-blue-100 text-blue-700",
      in_progress: "bg-purple-100 text-purple-700",
      pending_release: "bg-orange-100 text-orange-700",
      completed: "bg-emerald-100 text-emerald-700",
      disputed: "bg-red-100 text-red-700",
      cancelled: "bg-zinc-100 text-zinc-600",
    }
    return styles[status] || styles.draft
  }

  const totalValue = escrows.reduce((sum, e) => sum + e.total_amount, 0)
  const fundedValue = escrows.reduce((sum, e) => sum + e.funded_amount, 0)
  const releasedValue = escrows.reduce((sum, e) => sum + e.released_amount, 0)
  const activeCount = escrows.filter(e => ["funded", "in_progress"].includes(e.status)).length
  const pendingCount = escrows.filter(e => e.status === "pending_funding").length
  const completedCount = escrows.filter(e => e.status === "completed").length
  const disputedCount = escrows.filter(e => e.status === "disputed").length

  const statusCounts = {
    draft: escrows.filter(e => e.status === "draft").length,
    pending_funding: pendingCount,
    funded: escrows.filter(e => e.status === "funded").length,
    in_progress: escrows.filter(e => e.status === "in_progress").length,
    completed: completedCount,
    disputed: disputedCount,
  }

  const typeCounts = {
    two_party: escrows.filter(e => e.escrow_type === "two_party").length,
    multi_party: escrows.filter(e => e.escrow_type === "multi_party").length,
    milestone: escrows.filter(e => e.escrow_type === "milestone").length,
    time_locked: escrows.filter(e => e.escrow_type === "time_locked").length,
  }

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Escrow Monitor</h1>
            <p className="text-xs text-zinc-500">Monitor all escrow transactions in the system</p>
          </div>
          <button onClick={fetchAllEscrows} disabled={loading} className={cn("p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700")}>
            <RefreshCw className={cn("w-4 h-4 text-zinc-600", loading && "animate-spin")} />
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total", value: escrows.length, icon: FileText, gradient: "from-slate-500 to-slate-600" },
            { label: "Active", value: activeCount, icon: Zap, gradient: "from-emerald-500 to-emerald-600" },
            { label: "Pending", value: pendingCount, icon: Clock, gradient: "from-amber-500 to-amber-600" },
            { label: "Completed", value: completedCount, icon: CheckCircle, gradient: "from-blue-500 to-blue-600" },
            { label: "Disputed", value: disputedCount, icon: AlertTriangle, gradient: "from-red-500 to-red-600" },
            { label: "Value", value: formatCurrency(totalValue), icon: Wallet, gradient: "from-purple-500 to-purple-600" },
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
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
            <p className="text-[10px] text-emerald-600 uppercase font-medium">Total Value</p>
            <p className="text-lg font-bold text-emerald-700">{formatCurrency(totalValue)}</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
            <p className="text-[10px] text-blue-600 uppercase font-medium">Funded</p>
            <p className="text-lg font-bold text-blue-700">{formatCurrency(fundedValue)}</p>
          </div>
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
            <p className="text-[10px] text-purple-600 uppercase font-medium">Released</p>
            <p className="text-lg font-bold text-purple-700">{formatCurrency(releasedValue)}</p>
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
            <option value="draft">Draft</option>
            <option value="pending_funding">Pending</option>
            <option value="funded">Funded</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="disputed">Disputed</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            <option value="all">All Types</option>
            <option value="two_party">Two Party</option>
            <option value="multi_party">Multi Party</option>
            <option value="milestone">Milestone</option>
            <option value="time_locked">Time Locked</option>
          </select>
        </div>

        {/* Escrows Table */}
        <div className="rounded-xl overflow-hidden bg-white dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 shadow-sm">
          <div className="p-3 border-b border-zinc-100 dark:border-zinc-700/50">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              All Escrows <span className="text-xs font-normal text-zinc-500 ml-1">({filteredEscrows.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16"><RefreshCw className="w-8 h-8 text-zinc-400 animate-spin" /></div>
          ) : filteredEscrows.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Shield className="w-8 h-8 text-zinc-400" /></div>
              <p className="text-zinc-500">No escrows found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-50 dark:bg-zinc-700/30">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-zinc-500 uppercase">Escrow</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-zinc-500 uppercase">Creator</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-zinc-500 uppercase">Type</th>
                    <th className="px-5 py-4 text-right text-xs font-semibold text-zinc-500 uppercase">Amount</th>
                    <th className="px-5 py-4 text-right text-xs font-semibold text-zinc-500 uppercase">Funded</th>
                    <th className="px-5 py-4 text-center text-xs font-semibold text-zinc-500 uppercase">Status</th>
                    <th className="px-5 py-4 text-center text-xs font-semibold text-zinc-500 uppercase">Security</th>
                    <th className="px-5 py-4 text-center text-xs font-semibold text-zinc-500 uppercase">Created</th>
                    <th className="px-5 py-4 text-center text-xs font-semibold text-zinc-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                  {filteredEscrows.map((escrow) => (
                    <tr key={escrow.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/20">
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{escrow.title}</p>
                          <p className="text-xs text-zinc-500 truncate max-w-[150px]">{escrow.id.slice(0, 8)}...</p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center"><User className="w-3.5 h-3.5 text-zinc-500" /></div>
                          <div>
                            <p className="text-xs font-medium text-zinc-700 truncate max-w-[120px]">{escrow.creator?.email || "Unknown"}</p>
                            <p className="text-[10px] text-zinc-400">{escrow.creator?.phone_number || ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-100 text-zinc-600 capitalize">{escrow.escrow_type.replace("_", " ")}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="font-mono font-semibold text-zinc-900">{formatCurrency(escrow.total_amount)}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className={cn("font-mono font-semibold", escrow.funded_amount > 0 ? "text-emerald-600" : "text-zinc-400")}>{formatCurrency(escrow.funded_amount)}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={cn("px-2.5 py-1 text-xs font-semibold rounded-full", getStatusBadge(escrow.status))}>{escrow.status.replace("_", " ")}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1">
                          {escrow.requires_multi_sig && <span title="Multi-sig" className="p-1 bg-purple-100 rounded"><Fingerprint className="w-3.5 h-3.5 text-purple-600" /></span>}
                          {escrow.lock_until && new Date(escrow.lock_until) > new Date() && <span title="Locked" className="p-1 bg-orange-100 rounded"><Lock className="w-3.5 h-3.5 text-orange-600" /></span>}
                          {escrow.milestones && escrow.milestones.length > 0 && <span title="Milestones" className="p-1 bg-blue-100 rounded"><Target className="w-3.5 h-3.5 text-blue-600" /></span>}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-xs text-zinc-500">{new Date(escrow.created_at).toLocaleDateString()}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button onClick={() => { setSelectedEscrow(escrow); setShowDetailModal(true) }} className="p-2 hover:bg-zinc-100 rounded-lg"><Eye className="w-5 h-5 text-zinc-500" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Modal */}
      {showDetailModal && selectedEscrow && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-slate-700 to-slate-900">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedEscrow.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 text-xs bg-white/20 text-white rounded-full">{selectedEscrow.status.replace("_", " ")}</span>
                  <span className="text-xs text-white/70 capitalize">{selectedEscrow.escrow_type.replace("_", " ")}</span>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-white/20 rounded-xl text-white"><X className="w-6 h-6" /></button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-5">
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Total", value: formatCurrency(selectedEscrow.total_amount), bg: "bg-zinc-50" },
                  { label: "Funded", value: formatCurrency(selectedEscrow.funded_amount), bg: "bg-emerald-50" },
                  { label: "Released", value: formatCurrency(selectedEscrow.released_amount), bg: "bg-blue-50" },
                  { label: "Participants", value: selectedEscrow.participants?.length || 0, bg: "bg-purple-50" },
                ].map((s, i) => (
                  <div key={i} className={cn("p-4 rounded-xl text-center", s.bg)}>
                    <p className="text-xs text-zinc-600 mb-1">{s.label}</p>
                    <p className="text-xl font-bold text-zinc-900">{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-4 bg-zinc-50 rounded-xl">
                  <p className="text-zinc-500 mb-1">Escrow ID</p>
                  <p className="font-mono text-zinc-900 text-xs">{selectedEscrow.id}</p>
                </div>
                <div className="p-4 bg-zinc-50 rounded-xl">
                  <p className="text-zinc-500 mb-1">Creator</p>
                  <p className="font-medium text-zinc-900">{selectedEscrow.creator?.email || "Unknown"}</p>
                </div>
                <div className="p-4 bg-zinc-50 rounded-xl">
                  <p className="text-zinc-500 mb-1">Created</p>
                  <p className="font-medium text-zinc-900">{new Date(selectedEscrow.created_at).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-zinc-50 rounded-xl">
                  <p className="text-zinc-500 mb-1">Fee</p>
                  <p className="font-medium text-zinc-900">{selectedEscrow.fee_percentage}%</p>
                </div>
              </div>

              {selectedEscrow.description && (
                <div>
                  <h4 className="text-sm font-semibold text-zinc-500 mb-2">Description</h4>
                  <p className="text-sm text-zinc-700 bg-zinc-50 p-4 rounded-xl">{selectedEscrow.description}</p>
                </div>
              )}

              {selectedEscrow.participants && selectedEscrow.participants.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-zinc-500 mb-2">Participants ({selectedEscrow.participants.length})</h4>
                  <div className="space-y-2">
                    {selectedEscrow.participants.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center"><User className="w-4 h-4 text-zinc-500" /></div>
                          <div>
                            <p className="text-sm font-medium text-zinc-900 capitalize">{p.role}</p>
                            <p className="text-xs text-zinc-500">{p.phone_number}</p>
                          </div>
                        </div>
                        <span className={cn("px-2 py-1 text-xs rounded-full font-medium", p.status === "accepted" ? "bg-emerald-100 text-emerald-700" : p.status === "exit_requested" ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-600")}>{p.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedEscrow.milestones && selectedEscrow.milestones.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-zinc-500 mb-2">Milestones ({selectedEscrow.milestones.length})</h4>
                  <div className="space-y-2">
                    {selectedEscrow.milestones.map((m: any, i: number) => (
                      <div key={m.id} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold", m.status === "released" ? "bg-emerald-500 text-white" : "bg-zinc-200 text-zinc-600")}>{i + 1}</div>
                        <div className="flex-1"><p className="text-sm font-medium text-zinc-900">{m.title}</p></div>
                        <span className="text-sm font-mono text-zinc-600">{formatCurrency(m.amount)}</span>
                        <span className={cn("px-2 py-1 text-xs rounded-full", m.status === "released" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600")}>{m.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Security Features */}
              <div>
                <h4 className="text-sm font-semibold text-zinc-500 mb-2">Security Features</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedEscrow.requires_multi_sig && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg">
                      <Fingerprint className="w-4 h-4 text-purple-600" />
                      <span className="text-sm text-purple-700">Multi-Sig ({selectedEscrow.collected_signatures}/{selectedEscrow.required_signatures})</span>
                    </div>
                  )}
                  {selectedEscrow.lock_until && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-lg">
                      <Lock className="w-4 h-4 text-orange-600" />
                      <span className="text-sm text-orange-700">Locked until {new Date(selectedEscrow.lock_until).toLocaleDateString()}</span>
                    </div>
                  )}
                  {selectedEscrow.auto_release_at && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                      <Timer className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-blue-700">Auto-release {new Date(selectedEscrow.auto_release_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
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
