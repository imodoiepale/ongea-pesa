"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ScreenShell, PageHeader, FluidNav, mobileNavItems } from "@/components/foundation"
import {
  Shield, Plus, Clock, CheckCircle, AlertTriangle, Users, Lock, Unlock,
  FileText, DollarSign, RefreshCw, Eye, Trash2, UserPlus, Scale,
  Timer, Fingerprint, ShieldCheck, Search, Download, Upload, X,
  Wallet, Phone, User, Calendar, Target, Zap, LogOut, Check, Home, Bell, Settings,
} from "lucide-react"
import Link from "next/link"
import { StepUpSheet } from "@/components/security/step-up-sheet"

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
  const [showReleaseStepUp, setShowReleaseStepUp] = useState(false)
  const [actionError, setActionError] = useState("")
  const [actionBusy, setActionBusy] = useState(false)
  const [showDisputeSheet, setShowDisputeSheet] = useState(false)
  const [disputeReason, setDisputeReason] = useState("")

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
      const { data: created } = await supabase
        .from("escrows")
        .select("*, participants:escrow_participants(*), milestones:escrow_milestones(*)")
        .eq("creator_id", userId)
        .order("created_at", { ascending: false })

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

  const releaseEscrow = async (stepupToken: string) => {
    if (!selectedEscrow || !user) return
    setActionError("")
    const response = await fetch("/api/escrow/release", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ escrow_id: selectedEscrow.id, stepup_token: stepupToken }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) { setActionError(body.error || "We couldn't release the funds."); throw new Error(body.error || "Release failed") }
    setShowReleaseStepUp(false); setShowDetailModal(false); await fetchEscrows(user.id)
  }

  const fundEscrow = async () => {
    if (!selectedEscrow || !user) return
    setActionBusy(true); setActionError("")
    const amount = Math.max(0, selectedEscrow.total_amount - selectedEscrow.funded_amount)
    const response = await fetch("/api/escrow/fund", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ escrow_id: selectedEscrow.id, amount }) })
    const body = await response.json().catch(() => ({})); setActionBusy(false)
    if (!response.ok) { setActionError(body.error || "We couldn't start the M-Pesa request."); return }
    setShowDetailModal(false); await fetchEscrows(user.id)
  }

  const raiseDispute = async () => {
    if (!selectedEscrow || !user || disputeReason.trim().length < 8) { setActionError("Describe the problem in at least 8 characters."); return }
    setActionBusy(true); setActionError("")
    const response = await fetch("/api/escrow/dispute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ escrow_id: selectedEscrow.id, reason: disputeReason.trim(), description: disputeReason.trim() }) })
    const body = await response.json().catch(() => ({})); setActionBusy(false)
    if (!response.ok) { setActionError(body.error || "We couldn't open the dispute."); return }
    setShowDisputeSheet(false); setShowDetailModal(false); setDisputeReason(""); await fetchEscrows(user.id)
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
      pending_funding: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      funded: "bg-brand/10 text-brand",
      in_progress: "bg-brand/10 text-brand",
      pending_release: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      completed: "bg-brand/10 text-brand",
      disputed: "bg-destructive/10 text-destructive",
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
            "flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all",
            "border border-border/60 bg-card/50 hover:border-border"
          )}
        >
          {selected ? (
            <>
              <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {selected.email || selected.phone_number || selected.mpesa_number}
                </p>
                <p className="text-xs text-muted-foreground">{selected.phone_number || selected.mpesa_number}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onSelect(null) }} className="p-1 hover:bg-muted rounded shrink-0">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <UserPlus className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Select from Ongea Pesa users...</span>
            </>
          )}
        </div>

        {showUserDropdown === role && (
          <div className={cn(
            "absolute z-50 w-full mt-2 rounded-xl overflow-hidden",
            "bg-card border border-border/60 shadow-xl max-h-64 overflow-y-auto"
          )}>
            <div className="p-2 border-b border-border/40">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-muted/30 rounded-lg border-0 focus:ring-2 focus:ring-brand outline-none"
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
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
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
            "flex-1 px-3 py-1.5 text-sm rounded-lg border border-border/60 bg-card outline-none",
            "disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-brand"
          )}
        />
      </div>
    </div>
  )

  return (
    <main id="main-content" className="orbital-page min-h-[100dvh]">
      <ScreenShell className="pt-0 pb-nav">
        {/* Page Header */}
        <PageHeader title="Protected deals" subtitle="Hold funds safely until everyone agrees">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => fetchEscrows(user?.id)}
            disabled={loading}
            aria-label="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4 text-muted-foreground", loading && "animate-spin")} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            asChild
            aria-label="Home"
          >
            <Link href="/">
              <Home className="h-4 w-4 text-muted-foreground" />
            </Link>
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            size="sm"
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            New Escrow
          </Button>
        </PageHeader>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Escrows", value: filteredEscrows.length, icon: FileText, iconBg: "bg-muted" },
            { label: "Active", value: activeCount, icon: Zap, iconBg: "bg-brand" },
            { label: "Pending Funding", value: pendingCount, icon: Clock, iconBg: "bg-amber-500" },
            { label: "Total Value", value: formatCurrency(totalValue), icon: Wallet, iconBg: "bg-violet-500" },
          ].map((stat, i) => (
            <div key={i} className="p-3 rounded-xl bg-card/50 border border-border/40">
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-2", stat.iconBg)}>
                <stat.icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit mb-4">
          <button
            onClick={() => setActiveTab("created")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
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
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              activeTab === "participating"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Participating ({myEscrows.length})
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              placeholder="Search escrows..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-border/60 bg-card outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm font-medium bg-card border border-border/60 outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="all">All Status</option>
            <option value="pending_funding">Pending Funding</option>
            <option value="funded">Funded</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="disputed">Disputed</option>
          </select>
        </div>

        {/* Escrow List */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {activeTab === "created" ? "Escrows You Created" : "Escrows You're Participating In"}
            <span className="text-xs font-normal normal-case ml-1">({filteredEscrows.length})</span>
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
            </div>
          ) : filteredEscrows.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-border/60 bg-card">
              <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-3">No escrows found</p>
              {activeTab === "created" && (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  size="sm"
                  className="gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Create Escrow
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40">
              {filteredEscrows.map((escrow) => (
                <div key={escrow.id} className="flex items-center gap-3 px-4 py-3">
                  {/* Icon tile */}
                  <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-brand" />
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground truncate">{escrow.title}</p>
                      <span className={cn("px-2 py-0.5 text-[10px] font-semibold rounded-full shrink-0", getStatusBadge(escrow.status))}>
                        {escrow.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{escrow.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground capitalize">{escrow.escrow_type.replace("_", " ")}</span>
                      {escrow.requires_multi_sig && (
                        <span title="Multi-signature" className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <Fingerprint className="w-3 h-3" /> multi-sig
                        </span>
                      )}
                      {escrow.lock_until && new Date(escrow.lock_until) > new Date() && (
                        <span title="Time-locked" className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <Lock className="w-3 h-3" /> locked
                        </span>
                      )}
                      {escrow.milestones && escrow.milestones.length > 0 && (
                        <span title="Milestones" className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <Target className="w-3 h-3" /> {escrow.milestones.length} milestones
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amount + actions */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {formatCurrency(escrow.total_amount)}
                    </p>
                    {escrow.funded_amount > 0 && (
                      <p className="text-xs text-brand">{formatCurrency(escrow.funded_amount)} funded</p>
                    )}
                    <div className="flex items-center gap-1 mt-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => { setSelectedEscrow(escrow); setShowDetailModal(true) }}
                        aria-label="View escrow"
                      >
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      {activeTab === "participating" && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => requestExit(escrow.id)}
                          aria-label="Request exit"
                        >
                          <LogOut className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security Features */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Security Features
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Lock, label: "Time-Lock", desc: "Funds locked until date" },
              { icon: Fingerprint, label: "Multi-Sig", desc: "Multiple approvals" },
              { icon: Target, label: "Milestones", desc: "Staged releases" },
              { icon: Scale, label: "Arbitration", desc: "Dispute resolution" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/60">
                <div className="p-2 bg-brand/10 rounded-lg shrink-0">
                  <f.icon className="w-4 h-4 text-brand" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{f.label}</p>
                  <p className="text-[10px] text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScreenShell>

      {/* Create Modal — bottom sheet */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => { setShowCreateModal(false); resetForm() }}>
          <div
            className="fixed inset-x-0 bottom-0 bg-background border-t border-border/60 rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Create Escrow</h2>
                <p className="text-xs text-muted-foreground">Step {createStep} of 3</p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => { setShowCreateModal(false); resetForm() }} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Progress bar */}
            <div className="px-5 pt-3">
              <div className="flex gap-1.5">
                {[1, 2, 3].map(s => (
                  <div key={s} className={cn(
                    "flex-1 h-1 rounded-full transition-all",
                    s <= createStep ? "bg-brand" : "bg-muted"
                  )} />
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {createStep === 1 && (
                <>
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1.5">Title</label>
                    <div className="rounded-xl border border-border/60 bg-card px-3 py-2">
                      <input
                        value={form.title}
                        onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="e.g., Website Development Project"
                        className="w-full text-sm bg-transparent outline-none placeholder:text-muted-foreground/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1.5">Description</label>
                    <div className="rounded-xl border border-border/60 bg-card px-3 py-2">
                      <textarea
                        value={form.description}
                        onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Describe the agreement..."
                        rows={3}
                        className="w-full text-sm bg-transparent outline-none placeholder:text-muted-foreground/50 resize-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1.5">Escrow Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {ESCROW_TYPES.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, escrow_type: t.id }))}
                          className={cn(
                            "p-3 rounded-xl text-left transition-all border-2 active:scale-[0.97]",
                            form.escrow_type === t.id
                              ? "border-brand bg-brand/5"
                              : "border-border/60 hover:border-border"
                          )}
                        >
                          <t.icon className={cn("w-5 h-5 mb-1.5", form.escrow_type === t.id ? "text-brand" : "text-muted-foreground")} />
                          <p className="text-xs font-semibold text-foreground">{t.label}</p>
                          <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-foreground block mb-1.5">Amount (KES)</label>
                      <div className="rounded-xl border border-border/60 bg-card px-3 py-2">
                        <input
                          type="number"
                          value={form.total_amount}
                          onChange={(e) => setForm(f => ({ ...f, total_amount: e.target.value }))}
                          placeholder="50000"
                          className="w-full text-sm bg-transparent outline-none placeholder:text-muted-foreground/50"
                          inputMode="decimal"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground block mb-1.5">Auto-Release (Days)</label>
                      <div className="rounded-xl border border-border/60 bg-card px-3 py-2">
                        <input
                          type="number"
                          value={form.auto_release_days}
                          onChange={(e) => setForm(f => ({ ...f, auto_release_days: parseInt(e.target.value) || 0 }))}
                          className="w-full text-sm bg-transparent outline-none"
                          inputMode="numeric"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {createStep === 2 && (
                <>
                  <p className="text-xs text-muted-foreground">Select existing users or enter phone numbers manually</p>

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
                </>
              )}

              {createStep === 3 && (
                <>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, requires_multi_sig: !f.requires_multi_sig }))}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border-2 active:scale-[0.97]",
                      form.requires_multi_sig
                        ? "border-brand bg-brand/5"
                        : "border-border/60"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={form.requires_multi_sig}
                      onChange={(e) => setForm(f => ({ ...f, requires_multi_sig: e.target.checked }))}
                      className="w-4 h-4 rounded text-brand"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Fingerprint className={cn("w-5 h-5 shrink-0", form.requires_multi_sig ? "text-brand" : "text-muted-foreground")} />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Multi-Signature</p>
                      <p className="text-xs text-muted-foreground">Require multiple approvals for release</p>
                    </div>
                  </button>

                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1.5">Lock Period (Days)</label>
                    <div className="rounded-xl border border-border/60 bg-card px-3 py-2">
                      <input
                        type="number"
                        value={form.lock_days}
                        onChange={(e) => setForm(f => ({ ...f, lock_days: parseInt(e.target.value) || 0 }))}
                        placeholder="0"
                        className="w-full text-sm bg-transparent outline-none placeholder:text-muted-foreground/50"
                        inputMode="numeric"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Funds cannot be released during this period</p>
                  </div>

                  {form.escrow_type === "milestone" && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-foreground">Milestones</label>
                        <button
                          type="button"
                          onClick={() => setForm(f => ({ ...f, milestones: [...f.milestones, { title: "", amount: "", description: "" }] }))}
                          className="text-xs text-brand flex items-center gap-1 active:scale-[0.97]"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add
                        </button>
                      </div>
                      <div className="space-y-2">
                        {form.milestones.map((m, i) => (
                          <div key={i} className="flex gap-2">
                            <div className="flex-1 rounded-xl border border-border/60 bg-card px-3 py-2">
                              <input
                                value={m.title}
                                onChange={(e) => setForm(f => ({ ...f, milestones: f.milestones.map((x, j) => j === i ? { ...x, title: e.target.value } : x) }))}
                                placeholder="Title"
                                className="w-full text-sm bg-transparent outline-none placeholder:text-muted-foreground/50"
                              />
                            </div>
                            <div className="w-24 rounded-xl border border-border/60 bg-card px-3 py-2">
                              <input
                                type="number"
                                value={m.amount}
                                onChange={(e) => setForm(f => ({ ...f, milestones: f.milestones.map((x, j) => j === i ? { ...x, amount: e.target.value } : x) }))}
                                placeholder="KES"
                                className="w-full text-sm bg-transparent outline-none placeholder:text-muted-foreground/50"
                                inputMode="decimal"
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setForm(f => ({ ...f, milestones: f.milestones.filter((_, j) => j !== i) }))}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="p-3 rounded-xl bg-muted/30">
                    <h4 className="text-xs font-semibold text-foreground mb-2">Summary</h4>
                    <div className="space-y-1.5 text-xs">
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
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-border/60">
              <Button
                variant="ghost"
                onClick={() => createStep > 1 ? setCreateStep(s => s - 1) : (setShowCreateModal(false), resetForm())}
              >
                {createStep > 1 ? "Back" : "Cancel"}
              </Button>
              <Button
                onClick={() => createStep < 3 ? setCreateStep(s => s + 1) : createEscrow()}
                disabled={createStep === 1 && (!form.title || !form.total_amount)}
              >
                {createStep < 3 ? "Continue" : "Create Escrow"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal — bottom sheet */}
      {showDetailModal && selectedEscrow && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowDetailModal(false)}>
          <div
            className="fixed inset-x-0 bottom-0 bg-background border-t border-border/60 rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground truncate">{selectedEscrow.title}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn("px-2 py-0.5 text-[10px] font-semibold rounded-full", getStatusBadge(selectedEscrow.status))}>
                    {selectedEscrow.status.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">{selectedEscrow.escrow_type.replace("_", " ")}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setShowDetailModal(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Amount stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-xl bg-muted/30 text-center">
                  <p className="text-[10px] text-muted-foreground mb-1">Total</p>
                  <p className="text-sm font-bold text-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {formatCurrency(selectedEscrow.total_amount)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-brand/5 text-center">
                  <p className="text-[10px] text-brand mb-1">Funded</p>
                  <p className="text-sm font-bold text-brand" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {formatCurrency(selectedEscrow.funded_amount)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 text-center">
                  <p className="text-[10px] text-muted-foreground mb-1">Released</p>
                  <p className="text-sm font-bold text-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {formatCurrency(selectedEscrow.released_amount)}
                  </p>
                </div>
              </div>

              {selectedEscrow.description && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</h4>
                  <p className="text-sm text-foreground">{selectedEscrow.description}</p>
                </div>
              )}

              {/* Participants */}
              {selectedEscrow.participants && selectedEscrow.participants.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Participants</h4>
                  <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40">
                    {selectedEscrow.participants.map((p: any) => (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground capitalize">{p.role}</p>
                          <p className="text-xs text-muted-foreground">{p.phone_number}</p>
                        </div>
                        {p.status === "exit_requested" && selectedEscrow.creator_id === user?.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => approveExit(selectedEscrow.id, p.id)}
                            className="text-destructive border-destructive/30"
                          >
                            Approve Exit
                          </Button>
                        )}
                        {p.status === "exit_requested" && selectedEscrow.creator_id !== user?.id && (
                          <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-600 rounded-full">
                            Exit Requested
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Milestones */}
              {selectedEscrow.milestones && selectedEscrow.milestones.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Milestones</h4>
                  <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40">
                    {selectedEscrow.milestones.map((m: any, i: number) => (
                      <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold",
                          m.status === "released" ? "bg-brand text-white" : "bg-muted text-muted-foreground"
                        )}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{m.title}</p>
                        </div>
                        <span className="text-sm font-bold text-foreground shrink-0" style={{ fontVariantNumeric: "tabular-nums" }}>
                          {formatCurrency(m.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex gap-2 px-5 py-4 border-t border-border/60">
              {selectedEscrow.status === "pending_funding" && (
                <Button className="flex-1" onClick={fundEscrow} disabled={actionBusy}>
                  {actionBusy ? "Requesting…" : "Fund Escrow"}
                </Button>
              )}
              {selectedEscrow.status === "funded" && (
                <Button className="flex-1" onClick={() => setShowReleaseStepUp(true)}>
                  Release Funds
                </Button>
              )}
              {["funded", "in_progress"].includes(selectedEscrow.status) && (
                <Button variant="outline" onClick={() => setShowDisputeSheet(true)} className="border-destructive/30 text-destructive hover:bg-destructive/5">
                  Dispute
                </Button>
              )}
              <Button variant="ghost" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
      <StepUpSheet open={showReleaseStepUp} title="Release funds" description={selectedEscrow ? `Approve the release from ${selectedEscrow.title}.` : undefined} onClose={() => setShowReleaseStepUp(false)} onVerified={releaseEscrow} />
      {showDisputeSheet && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[hsl(var(--abyss)/.58)] backdrop-blur-sm"><section className="orbital-page w-full max-w-lg rounded-t-[2rem] p-6"><h2 className="orbital-display text-4xl">Raise a dispute</h2><p className="mt-2 text-sm opacity-60">Funds will remain held while the issue is reviewed.</p><textarea value={disputeReason} onChange={(event) => setDisputeReason(event.target.value)} className="orbital-field mt-6 min-h-32 resize-none" placeholder="Describe what went wrong" /><div className="mt-5 grid grid-cols-2 gap-3"><button onClick={() => setShowDisputeSheet(false)} className="orbital-button orbital-button--quiet">Cancel</button><button onClick={raiseDispute} disabled={actionBusy} className="orbital-button">{actionBusy ? "Submitting…" : "Hold funds"}</button></div></section></div>}
      {actionError && <p className="fixed bottom-24 left-1/2 z-[90] -translate-x-1/2 rounded-full bg-red-600 px-4 py-2 text-sm text-white" role="alert">{actionError}</p>}
      <FluidNav items={mobileNavItems} />
    </main>
  )
}
