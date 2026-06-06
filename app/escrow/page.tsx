"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { ScreenShell } from "@/components/foundation"
import {
  Shield, Plus, Clock, CheckCircle, AlertTriangle, Users, Lock, Unlock,
  FileText, DollarSign, RefreshCw, Eye, Trash2, UserPlus, Scale,
  Timer, Fingerprint, ShieldCheck, Search, Download, Upload, X,
  Wallet, Phone, User, Calendar, Target, Zap, LogOut, Check, Home, Bell, Settings,
} from "lucide-react"
import Link from "next/link"

interface Escrow {
  id: string
  title: string
  description: string
  escrow_type: "two_party" | "multi_party" | "milestone" | "time_locked"
  creator_id: string
  buyer_id: string | null
  seller_id: string | null
  arbitrator_id: string | null
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
}

interface UserProfile {
  id: string
  email?: string
  phone_number?: string
  mpesa_number?: string
  wallet_balance?: number
  gate_name?: string
}

const ESCROW_TYPES = [
  { id: "two_party", label: "Two-Party", icon: Users, desc: "Simple buyer-seller" },
  { id: "multi_party", label: "Multi-Party", icon: UserPlus, desc: "Multiple contributors" },
  { id: "milestone", label: "Milestone", icon: Target, desc: "Release in stages" },
  { id: "time_locked", label: "Time-Locked", icon: Timer, desc: "Locked until date" },
]

export default function EscrowPage() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [escrows, setEscrows] = useState<Escrow[]>([])
  const [myEscrows, setMyEscrows] = useState<Escrow[]>([])
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [activeTab, setActiveTab] = useState<"created" | "participating">("created")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedEscrow, setSelectedEscrow] = useState<Escrow | null>(null)
  const [createStep, setCreateStep] = useState(1)
  const [userSearchTerm, setUserSearchTerm] = useState("")
  const [showUserDropdown, setShowUserDropdown] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: "",
    description: "",
    escrow_type: "two_party",
    total_amount: "",
    currency: "KES",
    buyer: null as UserProfile | null,
    buyer_phone: "",
    seller: null as UserProfile | null,
    seller_phone: "",
    arbitrator: null as UserProfile | null,
    arbitrator_phone: "",
    requires_multi_sig: false,
    required_signatures: 2,
    lock_days: 0,
    auto_release_days: 7,
    milestones: [] as { title: string; amount: string; description: string }[],
    release_conditions: [] as string[],
  })

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push("/login")
      return
    }
    setUser(user)
    await Promise.all([fetchEscrows(user.id), fetchAllUsers()])
  }

  const fetchEscrows = async (userId: string) => {
    setLoading(true)
    try {
      // Escrows I created
      const { data: created } = await supabase
        .from("escrows")
        .select("*, participants:escrow_participants(*), milestones:escrow_milestones(*)")
        .eq("creator_id", userId)
        .order("created_at", { ascending: false })

      // Escrows I'm participating in (not creator)
      const { data: participating } = await supabase
        .from("escrow_participants")
        .select("escrow:escrows(*, participants:escrow_participants(*), milestones:escrow_milestones(*))")
        .eq("user_id", userId)

      setEscrows(created || [])
      const participatingEscrows = participating
        ?.map((p: any) => p.escrow)
        .filter((e: any) => e && e.creator_id !== userId) || []
      setMyEscrows(participatingEscrows)
    } catch (err) {
      console.error("Error fetching escrows:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllUsers = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, phone_number, mpesa_number, wallet_balance, gate_name")
        .order("created_at", { ascending: false })
      setAllUsers(data || [])
    } catch (err) {
      console.error("Error fetching users:", err)
    }
  }

  const createEscrow = async () => {
    if (!user) return
    try {
      const lockUntil = form.lock_days > 0
        ? new Date(Date.now() + form.lock_days * 24 * 60 * 60 * 1000).toISOString()
        : null
      const autoReleaseAt = form.auto_release_days > 0
        ? new Date(Date.now() + form.auto_release_days * 24 * 60 * 60 * 1000).toISOString()
        : null

      const response = await fetch("/api/escrow/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          escrow_type: form.escrow_type,
          total_amount: parseFloat(form.total_amount),
          currency: form.currency,
          buyer_phone: form.buyer?.phone_number || form.buyer?.mpesa_number || form.buyer_phone,
          seller_phone: form.seller?.phone_number || form.seller?.mpesa_number || form.seller_phone,
          arbitrator_phone: form.arbitrator?.phone_number || form.arbitrator?.mpesa_number || form.arbitrator_phone,
          requires_multi_sig: form.requires_multi_sig,
          required_signatures: form.required_signatures,
          lock_until: lockUntil,
          auto_release_at: autoReleaseAt,
          milestones: form.milestones.map(m => ({ ...m, amount: parseFloat(m.amount) })),
          release_conditions: form.release_conditions.filter(c => c.trim()),
        }),
      })
      const result = await response.json()
      if (result.success) {
        setShowCreateModal(false)
        resetForm()
        await fetchEscrows(user.id)
      } else {
        alert(result.error || "Failed to create escrow")
      }
    } catch (err) {
      console.error("Error creating escrow:", err)
    }
  }

  const requestExit = async (escrowId: string) => {
    if (!confirm("Request to exit this escrow? The admin will need to approve.")) return
    try {
      await supabase
        .from("escrow_participants")
        .update({ status: "exit_requested", exit_requested_at: new Date().toISOString() })
        .eq("escrow_id", escrowId)
        .eq("user_id", user.id)
      alert("Exit request sent to admin")
      await fetchEscrows(user.id)
    } catch (err) {
      console.error("Error requesting exit:", err)
    }
  }

  const approveExit = async (escrowId: string, participantId: string) => {
    try {
      await supabase
        .from("escrow_participants")
        .update({ status: "exited", exited_at: new Date().toISOString() })
        .eq("id", participantId)
      alert("Exit approved")
      await fetchEscrows(user.id)
    } catch (err) {
      console.error("Error approving exit:", err)
    }
  }

  const resetForm = () => {
    setForm({
      title: "", description: "", escrow_type: "two_party", total_amount: "", currency: "KES",
      buyer: null, buyer_phone: "", seller: null, seller_phone: "", arbitrator: null, arbitrator_phone: "",
      requires_multi_sig: false, required_signatures: 2, lock_days: 0, auto_release_days: 7,
      milestones: [], release_conditions: [],
    })
    setCreateStep(1)
  }

  const filteredUsers = allUsers.filter(u => {
    if (!userSearchTerm) return true
    const search = userSearchTerm.toLowerCase()
    return u.email?.toLowerCase().includes(search) ||
      u.phone_number?.toLowerCase().includes(search) ||
      u.mpesa_number?.toLowerCase().includes(search)
  })

  const displayEscrows = activeTab === "created" ? escrows : myEscrows
  const filteredEscrows = displayEscrows.filter(e => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false
    if (searchTerm && !e.title.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      pending_funding: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      funded: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      in_progress: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      pending_release: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      completed: "bg-brand/10 text-brand",
      disputed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      cancelled: "bg-muted text-muted-foreground",
    }
    return styles[status] || styles.draft
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(amount)
  }

  const totalValue = filteredEscrows.reduce((sum, e) => sum + e.total_amount, 0)
  const activeCount = filteredEscrows.filter(e => ["funded", "in_progress"].includes(e.status)).length
  const pendingCount = filteredEscrows.filter(e => e.status === "pending_funding").length

  const UserSelector = ({ role, selected, onSelect, manualPhone, onManualChange }: {
    role: string
    selected: UserProfile | null
    onSelect: (user: UserProfile | null) => void
    manualPhone: string
    onManualChange: (phone: string) => void
  }) => (
    <div className="space-y-2">
      <label className="text-xs font-medium text-foreground capitalize">{role}</label>
      <div className="relative">
        <div
          onClick={() => setShowUserDropdown(showUserDropdown === role ? null : role)}
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
            "border border-border/60",
            "hover:border-border",
            "bg-card/50"
          )}
        >
          {selected ? (
            <>
              <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center">
                <User className="w-4 h-4 text-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {selected.email || selected.phone_number || selected.mpesa_number}
                </p>
                <p className="text-xs text-muted-foreground">{selected.phone_number || selected.mpesa_number}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onSelect(null) }} className="p-1 hover:bg-muted rounded">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Select from Ongea Pesa users...</span>
            </>
          )}
        </div>

        {showUserDropdown === role && (
          <div className={cn(
            "absolute z-50 w-full mt-2 rounded-xl overflow-hidden",
            "bg-card border border-border/60",
            "shadow-xl max-h-64 overflow-y-auto"
          )}>
            <div className="p-2 border-b border-border/40">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-muted/30 rounded-lg border-0 focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredUsers.slice(0, 20).map(u => (
                <div
                  key={u.id}
                  onClick={() => { onSelect(u); setShowUserDropdown(null); setUserSearchTerm("") }}
                  className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    {(u.email?.[0] || "U").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{u.email || "No email"}</p>
                    <p className="text-xs text-muted-foreground">{u.phone_number || u.mpesa_number || "No phone"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">or enter phone:</span>
        <input
          type="tel"
          placeholder="0712345678"
          value={manualPhone}
          onChange={(e) => onManualChange(e.target.value)}
          disabled={!!selected}
          className={cn(
            "flex-1 px-3 py-1.5 text-sm rounded-lg",
            "border border-border/60",
            "bg-card",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        />
      </div>
    </div>
  )

  return (
    <ScreenShell>
    <div className="min-h-[100dvh] bg-background surface-money">
      {/* Branded Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-card/80 border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shadow-lg shadow-brand/30">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-brand">Escrow Shield</h1>
                  <p className="text-[10px] text-muted-foreground -mt-0.5">by Ongea Pesa</p>
                </div>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-lg hover:bg-muted"><Bell className="w-5 h-5 text-muted-foreground" /></button>
              <button className="p-2 rounded-lg hover:bg-muted"><Settings className="w-5 h-5 text-muted-foreground" /></button>
              <Link href="/" className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg">
                <Home className="w-4 h-4" /> Home
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-foreground">Escrow Protection</h2>
              <p className="text-muted-foreground mt-1">Secure transactions with crypto-grade safety features</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => fetchEscrows(user?.id)} disabled={loading} className={cn("p-3 rounded-xl", "bg-card shadow-sm border border-border/60", "hover:bg-muted/50")}>
                <RefreshCw className={cn("w-5 h-5 text-muted-foreground", loading && "animate-spin")} />
              </button>
              <button onClick={() => setShowCreateModal(true)} className={cn("flex items-center gap-2 px-6 py-3 rounded-xl", "bg-brand hover:bg-brand/90", "text-white font-semibold", "shadow-lg shadow-brand/30", "transition-all hover:scale-105")}>
                <Plus className="w-5 h-5" />
                New Escrow
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Escrows", value: filteredEscrows.length, icon: FileText, color: "blue", bg: "bg-blue-500" },
            { label: "Active", value: activeCount, icon: Zap, color: "emerald", bg: "bg-brand" },
            { label: "Pending Funding", value: pendingCount, icon: Clock, color: "amber", bg: "bg-amber-500" },
            { label: "Total Value", value: formatCurrency(totalValue), icon: Wallet, color: "purple", bg: "bg-purple-500" },
          ].map((stat, i) => (
            <div key={i} className={cn(
              "relative overflow-hidden p-5 rounded-2xl",
              "bg-card/50",
              "border border-border/40",
              "shadow-sm"
            )}>
              <div className={cn("absolute top-0 right-0 w-20 h-20 -mr-6 -mt-6 rounded-full opacity-10", stat.bg)} />
              <div className="relative">
                <div className={cn(`p-2 rounded-xl w-fit bg-${stat.color}-100 dark:bg-${stat.color}-900/30`)}>
                  <stat.icon className={cn(`w-5 h-5 text-${stat.color}-600 dark:text-${stat.color}-400`)} />
                </div>
                <p className="text-2xl font-bold text-foreground mt-3">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-muted rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("created")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === "created"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            My Escrows ({escrows.length})
          </button>
          <button
            onClick={() => setActiveTab("participating")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === "participating"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Participating ({myEscrows.length})
          </button>
        </div>

        {/* Search & Filter */}
        <div className={cn(
          "p-4 rounded-2xl",
          "bg-card/50",
          "border border-border/40"
        )}>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search escrows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-11 bg-muted/30 border-border/60 rounded-xl"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-sm font-medium",
                "bg-muted/30",
                "border border-border/60"
              )}
            >
              <option value="all">All Status</option>
              <option value="pending_funding">Pending Funding</option>
              <option value="funded">Funded</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="disputed">Disputed</option>
            </select>
          </div>
        </div>

        {/* Escrows Table */}
        <div className={cn(
          "rounded-2xl overflow-hidden",
          "bg-card/50",
          "border border-border/40",
          "shadow-sm"
        )}>
          <div className="p-5 border-b border-border/40">
            <h2 className="text-lg font-semibold text-foreground">
              {activeTab === "created" ? "Escrows You Created" : "Escrows You're Participating In"}
              <span className="text-sm font-normal text-muted-foreground ml-2">({filteredEscrows.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
            </div>
          ) : filteredEscrows.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">No escrows found</p>
              {activeTab === "created" && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-xl font-medium"
                >
                  <Plus className="w-5 h-5" /> Create Escrow
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Escrow</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                    <th className="px-5 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                    <th className="px-5 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Funded</th>
                    <th className="px-5 py-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-5 py-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Security</th>
                    <th className="px-5 py-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredEscrows.map((escrow) => (
                    <tr key={escrow.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-semibold text-foreground">{escrow.title}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{escrow.description}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-3 py-1.5 text-xs font-medium rounded-lg bg-muted text-muted-foreground capitalize">
                          {escrow.escrow_type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="font-mono font-semibold text-foreground">{formatCurrency(escrow.total_amount)}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className={cn("font-mono font-semibold", escrow.funded_amount > 0 ? "text-brand" : "text-muted-foreground")}>
                          {formatCurrency(escrow.funded_amount)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={cn("px-3 py-1.5 text-xs font-semibold rounded-full", getStatusBadge(escrow.status))}>
                          {escrow.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1">
                          {escrow.requires_multi_sig && (
                            <span title="Multi-signature" className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                              <Fingerprint className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            </span>
                          )}
                          {escrow.lock_until && new Date(escrow.lock_until) > new Date() && (
                            <span title="Time-locked" className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                              <Lock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                            </span>
                          )}
                          {escrow.milestones && escrow.milestones.length > 0 && (
                            <span title="Milestones" className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                              <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => { setSelectedEscrow(escrow); setShowDetailModal(true) }}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                          >
                            <Eye className="w-5 h-5 text-muted-foreground" />
                          </button>
                          {activeTab === "participating" && (
                            <button
                              onClick={() => requestExit(escrow.id)}
                              className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              title="Request to exit"
                            >
                              <LogOut className="w-5 h-5 text-red-500" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Security Features */}
        <div className={cn(
          "p-6 rounded-2xl",
          "bg-brand/5",
          "border border-brand/20"
        )}>
          <h3 className="text-lg font-semibold text-foreground mb-4">Security Features</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Lock, label: "Time-Lock", desc: "Funds locked until date" },
              { icon: Fingerprint, label: "Multi-Sig", desc: "Multiple approvals" },
              { icon: Target, label: "Milestones", desc: "Staged releases" },
              { icon: Scale, label: "Arbitration", desc: "Dispute resolution" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-4 bg-card/60 rounded-xl">
                <div className="p-2 bg-brand/10 rounded-lg">
                  <f.icon className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={cn(
            "w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl",
            "bg-card",
            "border border-border/60",
            "shadow-2xl"
          )}>
            <div className="flex items-center justify-between p-6 border-b border-border/60">
              <div>
                <h2 className="text-xl font-bold text-foreground">Create Escrow</h2>
                <p className="text-sm text-muted-foreground">Step {createStep} of 3</p>
              </div>
              <button onClick={() => { setShowCreateModal(false); resetForm() }} className="p-2 hover:bg-muted rounded-xl">
                <X className="w-6 h-6 text-muted-foreground" />
              </button>
            </div>

            <div className="px-6 pt-4">
              <div className="flex gap-2">
                {[1, 2, 3].map(s => (
                  <div key={s} className={cn(
                    "flex-1 h-1.5 rounded-full transition-all",
                    s <= createStep ? "bg-brand" : "bg-muted"
                  )} />
                ))}
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {createStep === 1 && (
                <div className="space-y-5">
                  <div>
                    <label className="text-sm font-medium text-foreground">Title</label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="e.g., Website Development Project"
                      className="mt-2 h-12"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Describe the agreement..."
                      rows={3}
                      className={cn(
                        "w-full mt-2 px-4 py-3 rounded-xl text-sm",
                        "border border-border/60",
                        "bg-card"
                      )}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-3 block">Escrow Type</label>
                    <div className="grid grid-cols-2 gap-3">
                      {ESCROW_TYPES.map(t => (
                        <div
                          key={t.id}
                          onClick={() => setForm(f => ({ ...f, escrow_type: t.id }))}
                          className={cn(
                            "p-4 rounded-xl cursor-pointer transition-all",
                            "border-2",
                            form.escrow_type === t.id
                              ? "border-brand bg-brand/5"
                              : "border-border/60 hover:border-border"
                          )}
                        >
                          <t.icon className={cn("w-6 h-6 mb-2", form.escrow_type === t.id ? "text-brand" : "text-muted-foreground")} />
                          <p className="font-semibold text-foreground">{t.label}</p>
                          <p className="text-xs text-muted-foreground">{t.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground">Amount (KES)</label>
                      <Input
                        type="number"
                        value={form.total_amount}
                        onChange={(e) => setForm(f => ({ ...f, total_amount: e.target.value }))}
                        placeholder="50000"
                        className="mt-2 h-12"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Auto-Release (Days)</label>
                      <Input
                        type="number"
                        value={form.auto_release_days}
                        onChange={(e) => setForm(f => ({ ...f, auto_release_days: parseInt(e.target.value) || 0 }))}
                        className="mt-2 h-12"
                      />
                    </div>
                  </div>
                </div>
              )}

              {createStep === 2 && (
                <div className="space-y-5">
                  <p className="text-sm text-muted-foreground">Select existing users or enter phone numbers manually</p>

                  <UserSelector
                    role="buyer"
                    selected={form.buyer}
                    onSelect={(u) => setForm(f => ({ ...f, buyer: u }))}
                    manualPhone={form.buyer_phone}
                    onManualChange={(p) => setForm(f => ({ ...f, buyer_phone: p }))}
                  />

                  <UserSelector
                    role="seller"
                    selected={form.seller}
                    onSelect={(u) => setForm(f => ({ ...f, seller: u }))}
                    manualPhone={form.seller_phone}
                    onManualChange={(p) => setForm(f => ({ ...f, seller_phone: p }))}
                  />

                  <UserSelector
                    role="arbitrator (optional)"
                    selected={form.arbitrator}
                    onSelect={(u) => setForm(f => ({ ...f, arbitrator: u }))}
                    manualPhone={form.arbitrator_phone}
                    onManualChange={(p) => setForm(f => ({ ...f, arbitrator_phone: p }))}
                  />
                </div>
              )}

              {createStep === 3 && (
                <div className="space-y-5">
                  <label className={cn(
                    "flex items-center gap-4 p-4 rounded-xl cursor-pointer",
                    "border-2 transition-all",
                    form.requires_multi_sig
                      ? "border-purple-500 bg-purple-50"
                      : "border-border/60"
                  )}>
                    <input
                      type="checkbox"
                      checked={form.requires_multi_sig}
                      onChange={(e) => setForm(f => ({ ...f, requires_multi_sig: e.target.checked }))}
                      className="w-5 h-5 text-purple-600 rounded"
                    />
                    <Fingerprint className="w-6 h-6 text-purple-600" />
                    <div>
                      <p className="font-semibold text-foreground">Multi-Signature</p>
                      <p className="text-xs text-muted-foreground">Require multiple approvals for release</p>
                    </div>
                  </label>

                  <div>
                    <label className="text-sm font-medium text-foreground">Lock Period (Days)</label>
                    <Input
                      type="number"
                      value={form.lock_days}
                      onChange={(e) => setForm(f => ({ ...f, lock_days: parseInt(e.target.value) || 0 }))}
                      placeholder="0"
                      className="mt-2 h-12"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Funds cannot be released during this period</p>
                  </div>

                  {form.escrow_type === "milestone" && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-foreground">Milestones</label>
                        <button
                          onClick={() => setForm(f => ({ ...f, milestones: [...f.milestones, { title: "", amount: "", description: "" }] }))}
                          className="text-sm text-brand flex items-center gap-1"
                        >
                          <Plus className="w-4 h-4" /> Add
                        </button>
                      </div>
                      {form.milestones.map((m, i) => (
                        <div key={i} className="flex gap-2 mb-2">
                          <Input
                            value={m.title}
                            onChange={(e) => setForm(f => ({ ...f, milestones: f.milestones.map((x, j) => j === i ? { ...x, title: e.target.value } : x) }))}
                            placeholder="Title"
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={m.amount}
                            onChange={(e) => setForm(f => ({ ...f, milestones: f.milestones.map((x, j) => j === i ? { ...x, amount: e.target.value } : x) }))}
                            placeholder="Amount"
                            className="w-28"
                          />
                          <button onClick={() => setForm(f => ({ ...f, milestones: f.milestones.filter((_, j) => j !== i) }))} className="p-2 text-red-500">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className={cn("p-5 rounded-xl", "bg-muted/30")}>
                    <h4 className="text-sm font-semibold text-foreground mb-3">Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Title:</span>
                        <span className="font-medium text-foreground">{form.title || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="font-medium text-foreground">{form.total_amount ? formatCurrency(parseFloat(form.total_amount)) : "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="font-medium text-foreground capitalize">{form.escrow_type.replace("_", " ")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-6 border-t border-border/60">
              <button
                onClick={() => createStep > 1 ? setCreateStep(s => s - 1) : (setShowCreateModal(false), resetForm())}
                className="px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted rounded-xl"
              >
                {createStep > 1 ? "Back" : "Cancel"}
              </button>
              <button
                onClick={() => createStep < 3 ? setCreateStep(s => s + 1) : createEscrow()}
                disabled={createStep === 1 && (!form.title || !form.total_amount)}
                className={cn(
                  "px-8 py-2.5 rounded-xl text-sm font-semibold",
                  "bg-brand hover:bg-brand/90 text-white",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "shadow-lg shadow-brand/20"
                )}
              >
                {createStep < 3 ? "Continue" : "Create Escrow"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedEscrow && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={cn(
            "w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl",
            "bg-card",
            "shadow-2xl"
          )}>
            <div className="flex items-center justify-between p-6 border-b border-border/60 bg-brand">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedEscrow.title}</h2>
                <span className="px-2 py-0.5 text-xs bg-card/20 text-white rounded-full">
                  {selectedEscrow.status.replace("_", " ")}
                </span>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-card/20 rounded-xl text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-muted/30 rounded-xl text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(selectedEscrow.total_amount)}</p>
                </div>
                <div className="p-4 bg-brand/5 rounded-xl text-center">
                  <p className="text-xs text-brand mb-1">Funded</p>
                  <p className="text-xl font-bold text-brand">{formatCurrency(selectedEscrow.funded_amount)}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl text-center">
                  <p className="text-xs text-blue-600 mb-1">Released</p>
                  <p className="text-xl font-bold text-blue-700">{formatCurrency(selectedEscrow.released_amount)}</p>
                </div>
              </div>

              {selectedEscrow.description && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Description</h4>
                  <p className="text-sm text-foreground">{selectedEscrow.description}</p>
                </div>
              )}

              {/* Participants with exit requests */}
              {selectedEscrow.participants && selectedEscrow.participants.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Participants</h4>
                  <div className="space-y-2">
                    {selectedEscrow.participants.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground capitalize">{p.role}</p>
                            <p className="text-xs text-muted-foreground">{p.phone_number}</p>
                          </div>
                        </div>
                        {p.status === "exit_requested" && selectedEscrow.creator_id === user?.id && (
                          <button
                            onClick={() => approveExit(selectedEscrow.id, p.id)}
                            className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-lg"
                          >
                            Approve Exit
                          </button>
                        )}
                        {p.status === "exit_requested" && (
                          <span className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded-lg">Exit Requested</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedEscrow.milestones && selectedEscrow.milestones.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Milestones</h4>
                  <div className="space-y-2">
                    {selectedEscrow.milestones.map((m: any, i: number) => (
                      <div key={m.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                          m.status === "released" ? "bg-brand text-white" : "bg-muted text-muted-foreground"
                        )}>{i + 1}</div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{m.title}</p>
                        </div>
                        <span className="text-sm font-mono text-muted-foreground">{formatCurrency(m.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-border/60">
              {selectedEscrow.status === "pending_funding" && (
                <button className="flex-1 py-3 bg-brand text-white rounded-xl font-semibold">
                  Fund Escrow
                </button>
              )}
              {selectedEscrow.status === "funded" && (
                <button className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold">
                  Release Funds
                </button>
              )}
              {["funded", "in_progress"].includes(selectedEscrow.status) && (
                <button className="px-6 py-3 bg-red-100 text-red-700 rounded-xl font-semibold">
                  Dispute
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </ScreenShell>
  )
}
