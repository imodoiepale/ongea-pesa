"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Users, Plus, RefreshCw, Eye, Trash2, UserPlus, Search,
  Upload, X, Wallet, User, Calendar, Zap, Send, Shuffle,
  Check, LogOut, Gift, PiggyBank, HandCoins, Home, Bell,
  LayoutGrid, List, Play, Pause, TrendingUp, AlertTriangle,
  ChevronDown, ChevronUp, Clock, ArrowUpRight, Hash, Phone,
  Activity, Target, Ban, RotateCcw, Receipt, CreditCard,
} from "lucide-react"
import Link from "next/link"

interface Chama {
  id: string
  name: string
  description: string
  creator_id: string
  chama_type: "savings" | "collection" | "fundraising"
  contribution_amount: number
  currency: string
  collection_frequency: string
  collection_day: number | null
  rotation_type: string
  total_cycles: number | null
  current_cycle: number
  current_rotation_index: number
  status: string
  total_collected: number
  total_distributed: number
  next_collection_date: string | null
  created_at: string
  members?: ChamaMember[]
  cycles?: any[]
}

interface ChamaMember {
  id: string
  chama_id: string
  user_id: string | null
  name: string
  phone_number: string
  email: string
  role: string
  rotation_position: number
  status: string
  total_contributed: number
  total_received: number
  has_received_payout: boolean
  pledge_amount?: number
}

interface UserProfile {
  id: string
  email?: string
  phone_number?: string
  mpesa_number?: string
}

const CHAMA_TYPES = [
  { id: "savings", label: "Savings", icon: PiggyBank, desc: "Fixed rotating savings" },
  { id: "collection", label: "Collection", icon: HandCoins, desc: "Fixed group collection" },
  { id: "fundraising", label: "Fundraising", icon: Gift, desc: "Pledge-based contributions" },
]

const FREQUENCIES = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "biweekly", label: "Bi-Weekly" },
  { id: "monthly", label: "Monthly" },
]

export default function ChamaPage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [user, setUser] = useState<any>(null)
  const [chamas, setChamas] = useState<Chama[]>([])
  const [myChamas, setMyChamas] = useState<Chama[]>([])
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [activeTab, setActiveTab] = useState<"created" | "member">("created")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [selectedChama, setSelectedChama] = useState<Chama | null>(null)
  const [createStep, setCreateStep] = useState(1)
  const [userSearchTerm, setUserSearchTerm] = useState("")
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [collecting, setCollecting] = useState(false)
  const [collectionStatus, setCollectionStatus] = useState<any>(null)
  const [stkRequests, setStkRequests] = useState<any[]>([])
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [expandedStkRow, setExpandedStkRow] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"card" | "table">("card")
  const [statusTab, setStatusTab] = useState<"all" | "active" | "inactive">("all")

  const [form, setForm] = useState({
    name: "",
    description: "",
    chama_type: "savings" as "savings" | "collection" | "fundraising",
    contribution_amount: "",
    currency: "KES",
    collection_frequency: "monthly",
    collection_day: 25,
    rotation_type: "sequential",
    total_cycles: "",
    members: [] as { name: string; phone: string; email: string; pledge_amount?: string }[],
  })

  const [newMember, setNewMember] = useState({ name: "", phone: "", email: "", pledge_amount: "" })
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)

  useEffect(() => { checkAuth() }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push("/login"); return }
    setUser(user)
    await Promise.all([fetchChamas(user.id), fetchAllUsers()])
  }

  const fetchChamas = async (userId: string) => {
    setLoading(true)
    try {
      const { data: created } = await supabase.from("chamas").select("*, members:chama_members(*), cycles:chama_cycles(*)").eq("creator_id", userId).order("created_at", { ascending: false })
      const { data: memberOf } = await supabase.from("chama_members").select("chama:chamas(*, members:chama_members(*), cycles:chama_cycles(*))").eq("user_id", userId)
      setChamas(created || [])
      setMyChamas(memberOf?.map((m: any) => m.chama).filter((c: any) => c && c.creator_id !== userId) || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const fetchAllUsers = async () => {
    const { data } = await supabase.from("profiles").select("id, email, phone_number, mpesa_number").order("created_at", { ascending: false })
    setAllUsers(data || [])
  }

  const createChama = async () => {
    if (!user) return
    const response = await fetch("/api/chama/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, contribution_amount: form.chama_type === "fundraising" ? 0 : parseFloat(form.contribution_amount), members: form.members.map(m => ({ ...m, pledge_amount: m.pledge_amount ? Math.ceil(parseFloat(m.pledge_amount)) : undefined })) }),
    })
    const result = await response.json()
    if (result.success) { setShowCreateModal(false); resetForm(); fetchChamas(user.id) }
    else alert(result.error)
  }

  const addMember = async () => {
    if (!selectedChama) return
    const data = selectedUser ? { name: selectedUser.email || "User", phone: selectedUser.phone_number || selectedUser.mpesa_number || "", email: selectedUser.email || "", pledge_amount: newMember.pledge_amount } : newMember
    if (!data.name || !data.phone) { alert("Name and phone required"); return }
    const response = await fetch("/api/chama/add-member", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chama_id: selectedChama.id, ...data, pledge_amount: data.pledge_amount ? Math.ceil(parseFloat(data.pledge_amount)) : undefined }) })
    const result = await response.json()
    if (result.success) { setShowAddMemberModal(false); setNewMember({ name: "", phone: "", email: "", pledge_amount: "" }); setSelectedUser(null); fetchChamas(user.id) }
    else alert(result.error)
  }

  const requestExit = async (chamaId: string) => {
    if (!confirm("Request to exit?")) return
    await supabase.from("chama_members").update({ status: "exit_requested" }).eq("chama_id", chamaId).eq("user_id", user.id)
    fetchChamas(user.id)
  }

  const approveExit = async (memberId: string) => {
    await supabase.from("chama_members").update({ status: "exited" }).eq("id", memberId)
    fetchChamas(user.id)
  }

  const startCollection = async () => {
    if (!selectedChama) return
    setCollecting(true)
    setShowCollectionModal(true)
    setStkRequests([])
    const response = await fetch("/api/chama/start-collection", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chama_id: selectedChama.id }) })
    const result = await response.json()
    if (result.success) {
      setCollectionStatus(result)
      setStkRequests(result.stk_requests || [])
      startPolling(result.cycle_id)
    } else { 
      alert(result.error)
      setCollecting(false)
      setShowCollectionModal(false)
    }
  }

  const startPolling = (cycleId: string) => {
    if (pollingInterval) clearInterval(pollingInterval)
    // Poll immediately, then every 5 seconds
    pollPendingStk()
    const interval = setInterval(() => pollPendingStk(), 5000)
    setPollingInterval(interval)
  }

  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }
  }

  // Poll pending STK requests - manual trigger from Check Pending button
  const pollPendingStk = async () => {
    if (!selectedChama) return
    setCollecting(true)
    
    try {
      console.log(`🔄 Manual poll for chama ${selectedChama.id}...`)
      
      // Poll and fetch updated data in parallel
      const [pollResponse, stkResult] = await Promise.all([
        fetch('/api/chama/poll-pending', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chama_id: selectedChama.id })
        }).then(r => r.json()),
        supabase
          .from("chama_stk_requests")
          .select("*")
          .eq("chama_id", selectedChama.id)
          .order("created_at", { ascending: false })
      ])
      
      console.log(`📊 Poll: ${pollResponse.completed} completed, ${pollResponse.failed} failed, ${pollResponse.still_pending} pending`)
      
      // Update STK requests with member info
      const stkData = stkResult.data || []
      if (stkData.length > 0) {
        const memberIds = [...new Set(stkData.map(s => s.member_id).filter(Boolean))]
        let membersMap: Record<string, any> = {}
        if (memberIds.length > 0) {
          const { data: members } = await supabase.from("chama_members").select("*").in("id", memberIds)
          if (members) membersMap = Object.fromEntries(members.map(m => [m.id, m]))
        }
        setStkRequests(stkData.map(stk => ({ ...stk, member: membersMap[stk.member_id] || null })))
      }
      
      // Refresh chama totals if any completed
      if (pollResponse.completed > 0 && user?.id) {
        fetchChamas(user.id)
      }
    } catch (err) {
      console.error("Poll pending error:", err)
    } finally {
      setCollecting(false)
    }
  }

  // Count pending STK requests
  const pendingStkCount = stkRequests.filter(r => ['pending', 'processing', 'sent'].includes(r.status)).length

  // Auto-poll when modal is open and there are pending STK requests
  // Initial poll is done in openChamaDetail, this just continues polling
  useEffect(() => {
    if (!showDetailModal || !selectedChama || pendingStkCount === 0) return
    
    let isPolling = false
    let isMounted = true
    
    const pollAndRefresh = async () => {
      if (isPolling || !isMounted) return
      isPolling = true
      
      try {
        const response = await fetch('/api/chama/poll-pending', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chama_id: selectedChama.id })
        })
        
        const result = await response.json()
        if (!isMounted) return
        
        console.log(`📊 Poll: ${result.completed} completed, ${result.failed} failed, ${result.still_pending} pending`)
        
        if (result.success && (result.completed > 0 || result.failed > 0)) {
          // Refresh STK history
          const { data: stkData } = await supabase
            .from("chama_stk_requests")
            .select("*")
            .eq("chama_id", selectedChama.id)
            .order("created_at", { ascending: false })
          
          if (stkData && isMounted) {
            const memberIds = [...new Set(stkData.map(s => s.member_id).filter(Boolean))]
            let membersMap: Record<string, any> = {}
            if (memberIds.length > 0) {
              const { data: members } = await supabase.from("chama_members").select("*").in("id", memberIds)
              if (members) membersMap = Object.fromEntries(members.map(m => [m.id, m]))
            }
            setStkRequests(stkData.map(stk => ({ ...stk, member: membersMap[stk.member_id] || null })))
          }
          
          // Refresh chama data
          if (user?.id && isMounted) fetchChamas(user.id)
        }
      } catch (err) {
        console.error("Auto-poll error:", err)
      } finally {
        isPolling = false
      }
    }
    
    // Poll every 5 seconds (initial poll done in openChamaDetail)
    const intervalId = setInterval(pollAndRefresh, 5000)
    
    return () => {
      isMounted = false
      clearInterval(intervalId)
    }
  }, [showDetailModal, selectedChama?.id, pendingStkCount])

  const retryStk = async (requestId: string) => {
    try {
      const response = await fetch("/api/chama/retry-stk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId })
      })
      const result = await response.json()
      if (result.success && selectedChama) {
        // Update local state immediately instead of refetching
        setStkRequests(prev => prev.map(r => 
          r.id === requestId 
            ? { ...r, status: 'sent', attempt_count: (r.attempt_count || 1) + 1, error_message: null }
            : r
        ))
      }
    } catch (err) {
      console.error("Retry error:", err)
    }
  }

  const retryAllFailed = async () => {
    const failedRequests = stkRequests.filter(r => r.status === "failed")
    for (const req of failedRequests) {
      await retryStk(req.id)
    }
  }

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const lines = (event.target?.result as string).split("\n").filter(l => l.trim())
      const members: any[] = []
      lines.forEach((line, i) => {
        if (i === 0 && line.toLowerCase().includes("name")) return
        const [name, phone, email, pledge] = line.split(",").map(s => s.trim())
        if (name && phone) members.push({ name, phone, email: email || "", pledge_amount: pledge })
      })
      setForm(f => ({ ...f, members: [...f.members, ...members] }))
    }
    reader.readAsText(file)
  }

  const resetForm = () => { setForm({ name: "", description: "", chama_type: "savings", contribution_amount: "", currency: "KES", collection_frequency: "monthly", collection_day: 25, rotation_type: "sequential", total_cycles: "", members: [] }); setCreateStep(1) }

  const filteredUsers = allUsers.filter(u => !userSearchTerm || u.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) || u.phone_number?.includes(userSearchTerm))
  const displayChamas = activeTab === "created" ? chamas : myChamas
  const statusFilteredChamas = displayChamas.filter(c => {
    if (statusTab === "active") return c.status === "active"
    if (statusTab === "inactive") return ["paused", "completed", "dissolved"].includes(c.status)
    return true
  })
  const filteredChamas = statusFilteredChamas.filter(c => (statusFilter === "all" || c.status === statusFilter) && (!searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase())))
  const activeCount = displayChamas.filter(c => c.status === "active").length
  const inactiveCount = displayChamas.filter(c => ["paused", "completed", "dissolved"].includes(c.status)).length

  const toggleChamaStatus = async (chamaId: string, newStatus: string) => {
    try {
      const { error } = await supabase.from("chamas").update({ status: newStatus }).eq("id", chamaId)
      if (error) throw error
      fetchChamas(user?.id)
    } catch (err) { console.error("Failed to update status:", err) }
  }

  const fetchStkHistory = async (chamaId: string) => {
    try {
      // First get STK requests
      const { data: stkData } = await supabase
        .from("chama_stk_requests")
        .select("*")
        .eq("chama_id", chamaId)
        .order("created_at", { ascending: false })
      
      if (!stkData || stkData.length === 0) {
        setStkRequests([])
        return
      }
      
      // Get member info separately to avoid FK issues
      const memberIds = [...new Set(stkData.map(s => s.member_id).filter(Boolean))]
      let membersMap: Record<string, any> = {}
      
      if (memberIds.length > 0) {
        const { data: members } = await supabase
          .from("chama_members")
          .select("*")
          .in("id", memberIds)
        if (members) {
          membersMap = Object.fromEntries(members.map(m => [m.id, m]))
        }
      }
      
      // Combine data
      const enrichedData = stkData.map(stk => ({
        ...stk,
        member: membersMap[stk.member_id] || null
      }))
      
      setStkRequests(enrichedData)
    } catch (err) { console.error("Failed to fetch STK history:", err) }
  }

  const openChamaDetail = async (chama: Chama) => {
    setSelectedChama(chama)
    setShowDetailModal(true)
    
    // Fetch STK history and poll pending in parallel on load
    try {
      const [stkResult, pollResult] = await Promise.all([
        // Fetch STK history
        supabase
          .from("chama_stk_requests")
          .select("*")
          .eq("chama_id", chama.id)
          .order("created_at", { ascending: false }),
        // Poll pending immediately
        fetch('/api/chama/poll-pending', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chama_id: chama.id })
        }).then(r => r.json()).catch(() => null)
      ])
      
      const stkData = stkResult.data || []
      
      // Get member info
      if (stkData.length > 0) {
        const memberIds = [...new Set(stkData.map(s => s.member_id).filter(Boolean))]
        let membersMap: Record<string, any> = {}
        if (memberIds.length > 0) {
          const { data: members } = await supabase.from("chama_members").select("*").in("id", memberIds)
          if (members) membersMap = Object.fromEntries(members.map(m => [m.id, m]))
        }
        setStkRequests(stkData.map(stk => ({ ...stk, member: membersMap[stk.member_id] || null })))
      } else {
        setStkRequests([])
      }
      
      if (pollResult?.success) {
        console.log(`📊 Initial poll: ${pollResult.completed} completed, ${pollResult.failed} failed, ${pollResult.still_pending} pending`)
      }
    } catch (err) {
      console.error("Failed to load chama detail:", err)
    }
  }
  const formatCurrency = (n: number) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(Math.ceil(n))
  const totalMembers = filteredChamas.reduce((s, c) => s + (c.members?.length || 0), 0)
  const totalCollected = filteredChamas.reduce((s, c) => s + c.total_collected, 0)
  const getStatusBadge = (s: string) => ({ active: "bg-emerald-100 text-emerald-700", paused: "bg-amber-100 text-amber-700", completed: "bg-blue-100 text-blue-700", exit_requested: "bg-orange-100 text-orange-700" }[s] || "bg-zinc-100 text-zinc-600")
  const getChamaIcon = (t: string) => t === "fundraising" ? Gift : t === "collection" ? HandCoins : PiggyBank

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-blue-950">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg"><Users className="w-5 h-5 text-white" /></div>
            <div><h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Chama Collect</h1><p className="text-[10px] text-zinc-500 -mt-0.5">by Ongea Pesa</p></div>
          </Link>
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg hover:bg-zinc-100"><Bell className="w-5 h-5 text-zinc-500" /></button>
            <Link href="/" className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg"><Home className="w-4 h-4" /> Home</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
          <div><h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Chama Collections</h2><p className="text-sm text-zinc-500">Manage group savings & contributions</p></div>
          <div className="flex gap-2">
            <button onClick={() => fetchChamas(user?.id)} className="p-2 rounded-lg bg-white shadow-sm border border-zinc-200 hover:bg-zinc-50"><RefreshCw className={cn("w-4 h-4 text-zinc-600", loading && "animate-spin")} /></button>
            <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium shadow-md hover:shadow-lg transition-all"><Plus className="w-4 h-4" />New Chama</button>
          </div>
        </div>

        {/* Compact Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-5">
          {[
            { label: "Total", value: displayChamas.length, icon: Users, gradient: "from-slate-500 to-slate-600" },
            { label: "Active", value: activeCount, icon: Zap, gradient: "from-emerald-500 to-emerald-600" },
            { label: "Inactive", value: inactiveCount, icon: Pause, gradient: "from-amber-500 to-amber-600" },
            { label: "Members", value: totalMembers, icon: UserPlus, gradient: "from-purple-500 to-purple-600" },
            { label: "Collected", value: formatCurrency(totalCollected), icon: Wallet, gradient: "from-blue-500 to-blue-600" },
            { label: "Distributed", value: formatCurrency(filteredChamas.reduce((s, c) => s + c.total_distributed, 0)), icon: TrendingUp, gradient: "from-teal-500 to-teal-600" },
          ].map((stat, i) => (
            <div key={i} className="relative overflow-hidden p-3 rounded-xl bg-white dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 shadow-sm">
              <div className={cn("absolute top-0 right-0 w-16 h-16 -mr-4 -mt-4 rounded-full opacity-20 bg-gradient-to-br", stat.gradient)} />
              <div className="relative flex items-center gap-2">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br shadow", stat.gradient)}><stat.icon className="w-4 h-4 text-white" /></div>
                <div><p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{stat.value}</p><p className="text-[10px] text-zinc-500">{stat.label}</p></div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            <button onClick={() => setActiveTab("created")} className={cn("px-3 py-1.5 rounded text-xs font-medium", activeTab === "created" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-600")}>My Chamas ({chamas.length})</button>
            <button onClick={() => setActiveTab("member")} className={cn("px-3 py-1.5 rounded text-xs font-medium", activeTab === "member" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-600")}>Member Of ({myChamas.length})</button>
          </div>
          <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            <button onClick={() => setStatusTab("all")} className={cn("px-3 py-1.5 rounded text-xs font-medium", statusTab === "all" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-600")}>All</button>
            <button onClick={() => setStatusTab("active")} className={cn("px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1", statusTab === "active" ? "bg-emerald-500 text-white shadow-sm" : "text-zinc-600")}><Play className="w-3 h-3" />Active ({activeCount})</button>
            <button onClick={() => setStatusTab("inactive")} className={cn("px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1", statusTab === "inactive" ? "bg-amber-500 text-white shadow-sm" : "text-zinc-600")}><Pause className="w-3 h-3" />Inactive ({inactiveCount})</button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" /><Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 h-8 w-40 text-sm bg-white border-zinc-200 rounded-lg" /></div>
            <div className="flex p-0.5 bg-zinc-100 rounded-lg">
              <button onClick={() => setViewMode("card")} className={cn("p-1.5 rounded", viewMode === "card" ? "bg-white shadow-sm" : "")}><LayoutGrid className="w-4 h-4 text-zinc-600" /></button>
              <button onClick={() => setViewMode("table")} className={cn("p-1.5 rounded", viewMode === "table" ? "bg-white shadow-sm" : "")}><List className="w-4 h-4 text-zinc-600" /></button>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? <div className="flex items-center justify-center py-16"><RefreshCw className="w-8 h-8 text-blue-500 animate-spin" /></div> : filteredChamas.length === 0 ? (
          <div className="text-center py-12 rounded-xl bg-white border border-zinc-100">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg"><Users className="w-7 h-7 text-white" /></div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-1">No chamas found</h3>
            <p className="text-sm text-zinc-500 mb-4">Create your first chama to start</p>
            {activeTab === "created" && <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-medium"><Plus className="w-4 h-4" /> Create Chama</button>}
          </div>
        ) : viewMode === "table" ? (
          <div className="rounded-xl overflow-hidden bg-white border border-zinc-200 shadow-sm">
            <table className="w-full">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-zinc-500 uppercase">#</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-zinc-500 uppercase">Name</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-zinc-500 uppercase">Type</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-zinc-500 uppercase">Contribution</th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold text-zinc-500 uppercase">Members</th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold text-zinc-500 uppercase">Cycle</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-zinc-500 uppercase">Collected</th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold text-zinc-500 uppercase">Freq</th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold text-zinc-500 uppercase">Status</th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold text-zinc-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredChamas.map((chama, idx) => {
                  const Icon = getChamaIcon(chama.chama_type || "savings")
                  return (
                    <tr key={chama.id} className="hover:bg-zinc-50 cursor-pointer" onClick={() => openChamaDetail(chama)}>
                      <td className="px-3 py-2 text-sm text-zinc-400 font-mono">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", chama.chama_type === "fundraising" ? "bg-purple-100" : chama.chama_type === "collection" ? "bg-blue-100" : "bg-emerald-100")}><Icon className={cn("w-3.5 h-3.5", chama.chama_type === "fundraising" ? "text-purple-600" : chama.chama_type === "collection" ? "text-blue-600" : "text-emerald-600")} /></div>
                          <div><p className="text-sm font-medium text-zinc-900">{chama.name}</p><p className="text-[10px] text-zinc-500 truncate max-w-[150px]">{chama.description || "No description"}</p></div>
                        </div>
                      </td>
                      <td className="px-3 py-2"><span className="px-2 py-0.5 text-[10px] font-medium rounded bg-zinc-100 text-zinc-600 capitalize">{chama.chama_type}</span></td>
                      <td className="px-3 py-2 text-right text-sm font-mono text-zinc-700">{formatCurrency(chama.contribution_amount)}</td>
                      <td className="px-3 py-2 text-center text-sm font-semibold text-zinc-900">{chama.members?.length || 0}</td>
                      <td className="px-3 py-2 text-center text-sm text-zinc-600">{chama.current_cycle}</td>
                      <td className="px-3 py-2 text-right text-sm font-mono text-emerald-600">{formatCurrency(chama.total_collected)}</td>
                      <td className="px-3 py-2 text-center"><span className="text-[10px] text-zinc-500 capitalize">{chama.collection_frequency}</span></td>
                      <td className="px-3 py-2 text-center"><span className={cn("px-2 py-0.5 text-[10px] rounded-full font-medium", getStatusBadge(chama.status))}>{chama.status}</span></td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => openChamaDetail(chama)} className="p-1.5 hover:bg-zinc-100 rounded" title="View"><Eye className="w-3.5 h-3.5 text-zinc-500" /></button>
                          {activeTab === "created" && (
                            chama.status === "active" 
                              ? <button onClick={() => toggleChamaStatus(chama.id, "paused")} className="p-1.5 hover:bg-amber-50 rounded" title="Pause"><Pause className="w-3.5 h-3.5 text-amber-600" /></button>
                              : <button onClick={() => toggleChamaStatus(chama.id, "active")} className="p-1.5 hover:bg-emerald-50 rounded" title="Activate"><Play className="w-3.5 h-3.5 text-emerald-600" /></button>
                          )}
                          {activeTab === "member" && <button onClick={() => requestExit(chama.id)} className="p-1.5 hover:bg-red-50 rounded" title="Exit"><LogOut className="w-3.5 h-3.5 text-red-500" /></button>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredChamas.map((chama) => {
              const Icon = getChamaIcon(chama.chama_type || "savings")
              return (
                <div key={chama.id} onClick={() => openChamaDetail(chama)} className="group p-4 rounded-xl cursor-pointer bg-white border border-zinc-100 hover:border-blue-300 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shadow", chama.chama_type === "fundraising" ? "bg-gradient-to-br from-purple-500 to-purple-600" : chama.chama_type === "collection" ? "bg-gradient-to-br from-blue-500 to-blue-600" : "bg-gradient-to-br from-emerald-500 to-emerald-600")}><Icon className="w-4 h-4 text-white" /></div>
                      <div><h3 className="text-sm font-semibold text-zinc-900 group-hover:text-blue-600">{chama.name}</h3><p className="text-[10px] text-zinc-500 capitalize">{chama.chama_type || "savings"}</p></div>
                    </div>
                    <span className={cn("px-2 py-0.5 text-[10px] rounded-full font-medium", getStatusBadge(chama.status))}>{chama.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="p-2 bg-zinc-50 rounded-lg"><p className="text-[9px] text-zinc-500 uppercase">Contribution</p><p className="text-sm font-bold text-zinc-900">{formatCurrency(chama.contribution_amount)}</p></div>
                    <div className="p-2 bg-zinc-50 rounded-lg"><p className="text-[9px] text-zinc-500 uppercase">Members</p><p className="text-sm font-bold text-zinc-900">{chama.members?.length || 0}</p></div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-2"><span className="capitalize">{chama.collection_frequency}</span><span>Cycle {chama.current_cycle}</span></div>
                  {chama.next_collection_date && <div className="flex items-center gap-1.5 text-[10px] text-blue-600 bg-blue-50 px-2 py-1.5 rounded-lg"><Calendar className="w-3 h-3" />Next: {new Date(chama.next_collection_date).toLocaleDateString()}</div>}
                  <div className="flex gap-1.5 mt-3 pt-3 border-t border-zinc-100" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { setSelectedChama(chama); setShowDetailModal(true) }} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] text-zinc-600 bg-zinc-50 rounded-lg hover:bg-zinc-100 font-medium"><Eye className="w-3 h-3" />View</button>
                    {activeTab === "created" && (
                      chama.status === "active"
                        ? <button onClick={() => toggleChamaStatus(chama.id, "paused")} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 font-medium"><Pause className="w-3 h-3" />Pause</button>
                        : <button onClick={() => toggleChamaStatus(chama.id, "active")} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 font-medium"><Play className="w-3 h-3" />Activate</button>
                    )}
                    {activeTab === "member" && <button onClick={() => requestExit(chama.id)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] text-red-600 bg-red-50 rounded-lg hover:bg-red-100 font-medium"><LogOut className="w-3 h-3" />Exit</button>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-indigo-600"><div><h2 className="text-xl font-bold text-white">Create Chama</h2><p className="text-sm text-blue-100">Step {createStep} of 3</p></div><button onClick={() => { setShowCreateModal(false); resetForm() }} className="p-2 hover:bg-white/20 rounded-xl text-white"><X className="w-6 h-6" /></button></div>
            <div className="px-6 pt-4"><div className="flex gap-2">{[1, 2, 3].map(s => <div key={s} className={cn("flex-1 h-1.5 rounded-full", s <= createStep ? "bg-blue-500" : "bg-zinc-200")} />)}</div></div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {createStep === 1 && (
                <div className="space-y-5">
                  <div><label className="text-sm font-medium text-zinc-700 mb-3 block">Chama Type</label><div className="grid grid-cols-3 gap-3">{CHAMA_TYPES.map(t => <div key={t.id} onClick={() => setForm(f => ({ ...f, chama_type: t.id as any }))} className={cn("p-4 rounded-xl cursor-pointer text-center border-2", form.chama_type === t.id ? "border-blue-500 bg-blue-50" : "border-zinc-200")}><t.icon className={cn("w-8 h-8 mx-auto mb-2", form.chama_type === t.id ? "text-blue-600" : "text-zinc-400")} /><p className="font-semibold text-zinc-900">{t.label}</p><p className="text-xs text-zinc-500">{t.desc}</p></div>)}</div></div>
                  <div><label className="text-sm font-medium text-zinc-700">Chama Name</label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Office Savings Group" className="mt-2 h-12" /></div>
                  <div><label className="text-sm font-medium text-zinc-700">Description</label><textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe your chama..." rows={2} className="w-full mt-2 px-4 py-3 rounded-xl text-sm border border-zinc-200 bg-white" /></div>
                  {form.chama_type !== "fundraising" && <div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium text-zinc-700">Contribution (KES)</label><Input type="number" value={form.contribution_amount} onChange={(e) => setForm(f => ({ ...f, contribution_amount: e.target.value }))} placeholder="5000" className="mt-2 h-12" /></div><div><label className="text-sm font-medium text-zinc-700">Frequency</label><select value={form.collection_frequency} onChange={(e) => setForm(f => ({ ...f, collection_frequency: e.target.value }))} className="w-full mt-2 h-12 px-4 rounded-xl border border-zinc-200 bg-white">{FREQUENCIES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}</select></div></div>}
                  {form.chama_type === "fundraising" && <div className="p-4 bg-purple-50 rounded-xl border border-purple-200"><p className="text-sm text-purple-700 flex items-center gap-2"><Gift className="w-5 h-5" />Fundraising: Each member pledges their own amount.</p></div>}
                </div>
              )}
              {createStep === 2 && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between"><div><h3 className="text-sm font-medium text-zinc-900">Add Members</h3><p className="text-xs text-zinc-500">Select from Ongea Pesa or upload CSV</p></div><div className="flex gap-2"><input type="file" ref={fileInputRef} onChange={handleCSVUpload} accept=".csv" className="hidden" /><button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-zinc-100 rounded-lg hover:bg-zinc-200 font-medium"><Upload className="w-3 h-3" /> Upload CSV</button></div></div>
                  <div className="relative"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" /><input type="text" placeholder="Search Ongea Pesa users..." value={userSearchTerm} onChange={(e) => { setUserSearchTerm(e.target.value); setShowUserDropdown(true) }} className="w-full pl-10 pr-3 py-3 rounded-xl text-sm border border-zinc-200 bg-white" /></div>{showUserDropdown && userSearchTerm && <div className="absolute z-50 w-full mt-2 rounded-xl overflow-hidden bg-white border border-zinc-200 shadow-xl max-h-48 overflow-y-auto">{filteredUsers.slice(0, 10).map(u => <div key={u.id} onClick={() => { const phone = u.phone_number || u.mpesa_number || ""; if (phone && !form.members.find(m => m.phone === phone)) setForm(f => ({ ...f, members: [...f.members, { name: u.email || "User", phone, email: u.email || "", pledge_amount: "" }] })); setUserSearchTerm(""); setShowUserDropdown(false) }} className="flex items-center gap-3 p-3 hover:bg-zinc-50 cursor-pointer"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-medium text-white">{(u.email?.[0] || "U").toUpperCase()}</div><div className="flex-1"><p className="text-sm font-medium text-zinc-900">{u.email || "No email"}</p><p className="text-xs text-zinc-500">{u.phone_number || u.mpesa_number}</p></div><Plus className="w-4 h-4 text-blue-600" /></div>)}</div>}</div>
                  <div className="flex gap-2"><Input placeholder="Name" value={newMember.name} onChange={(e) => setNewMember(m => ({ ...m, name: e.target.value }))} className="flex-1" /><Input placeholder="Phone" value={newMember.phone} onChange={(e) => setNewMember(m => ({ ...m, phone: e.target.value }))} className="w-32" />{form.chama_type === "fundraising" && <Input type="number" placeholder="Pledge" value={newMember.pledge_amount} onChange={(e) => setNewMember(m => ({ ...m, pledge_amount: e.target.value }))} className="w-24" />}<button onClick={() => { if (newMember.name && newMember.phone) { setForm(f => ({ ...f, members: [...f.members, { ...newMember }] })); setNewMember({ name: "", phone: "", email: "", pledge_amount: "" }) } }} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg"><Plus className="w-4 h-4" /></button></div>
                  <div className="rounded-xl overflow-hidden border border-zinc-200"><div className="p-3 bg-zinc-50 border-b border-zinc-200"><span className="text-xs font-medium text-zinc-600">{form.members.length} members added</span></div><div className="max-h-48 overflow-y-auto">{form.members.length === 0 ? <div className="p-4 text-center text-zinc-500 text-sm">No members added yet</div> : form.members.map((m, i) => <div key={i} className="flex items-center gap-3 p-3 border-b border-zinc-100 last:border-0"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">{i + 1}</div><div className="flex-1"><p className="text-sm font-medium text-zinc-900">{m.name}</p><p className="text-xs text-zinc-500">{m.phone}</p></div>{m.pledge_amount && <span className="text-sm font-mono text-purple-600">{formatCurrency(parseFloat(m.pledge_amount))}</span>}<button onClick={() => setForm(f => ({ ...f, members: f.members.filter((_, j) => j !== i) }))} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button></div>)}</div></div>
                </div>
              )}
              {createStep === 3 && (
                <div className="space-y-5">
                  <h3 className="text-sm font-medium text-zinc-900">Review & Create</h3>
                  <div className="p-5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><p className="text-zinc-500">Name</p><p className="font-semibold text-zinc-900">{form.name || "—"}</p></div>
                      <div><p className="text-zinc-500">Type</p><p className="font-semibold text-zinc-900 capitalize">{form.chama_type}</p></div>
                      {form.chama_type !== "fundraising" && <div><p className="text-zinc-500">Contribution</p><p className="font-semibold text-zinc-900">{form.contribution_amount ? formatCurrency(parseFloat(form.contribution_amount)) : "—"}</p></div>}
                      <div><p className="text-zinc-500">Frequency</p><p className="font-semibold text-zinc-900 capitalize">{form.collection_frequency}</p></div>
                      <div><p className="text-zinc-500">Members</p><p className="font-semibold text-zinc-900">{form.members.length}</p></div>
                      <div><p className="text-zinc-500">Expected per Cycle</p><p className="font-bold text-emerald-600 text-lg">{form.chama_type === "fundraising" ? formatCurrency(form.members.reduce((s, m) => s + (m.pledge_amount ? parseFloat(m.pledge_amount) : 0), 0)) : form.contribution_amount && form.members.length ? formatCurrency(parseFloat(form.contribution_amount) * (form.members.length + 1)) : "—"}</p></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between p-6 border-t bg-zinc-50"><button onClick={() => createStep > 1 ? setCreateStep(s => s - 1) : (setShowCreateModal(false), resetForm())} className="px-5 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-200 rounded-xl">{createStep > 1 ? "Back" : "Cancel"}</button><button onClick={() => createStep < 3 ? setCreateStep(s => s + 1) : createChama()} disabled={createStep === 1 && (!form.name || (form.chama_type !== "fundraising" && !form.contribution_amount))} className="px-8 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white disabled:opacity-50 shadow-lg">{createStep < 3 ? "Continue" : "Create Chama"}</button></div>
          </div>
        </div>
      )}

      {showDetailModal && selectedChama && (() => {
        const totalRequests = stkRequests.length
        const completedCount = stkRequests.filter(r => r.status === "completed").length
        const failedCount = stkRequests.filter(r => r.status === "failed").length
        const pendingCount = stkRequests.filter(r => ["pending", "processing", "sent"].includes(r.status)).length
        const totalStkAmount = stkRequests.reduce((s, r) => s + (r.amount || 0), 0)
        const collectedStkAmount = stkRequests.filter(r => r.status === "completed").reduce((s, r) => s + (r.amount || 0), 0)
        const totalAttempts = stkRequests.reduce((s, r) => s + (r.attempt_count || 1), 0)
        const avgAttempts = totalRequests > 0 ? (totalAttempts / totalRequests).toFixed(1) : "0"
        const successRate = totalRequests > 0 ? ((completedCount / totalRequests) * 100).toFixed(1) : "0"
        const forfeitCount = stkRequests.filter(r => r.status === "failed" && (r.attempt_count || 1) >= (r.max_attempts || 3)).length

        return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2">
          <div className="w-full max-w-6xl h-[95vh] overflow-hidden rounded-2xl bg-zinc-50 dark:bg-zinc-900 shadow-2xl flex flex-col">
            {/* Header */}
            <div className={cn("flex items-center justify-between px-6 py-4", selectedChama.chama_type === "fundraising" ? "bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700" : selectedChama.chama_type === "collection" ? "bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-700" : "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600")}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  {collecting ? <RefreshCw className="w-6 h-6 text-white animate-spin" /> : <Activity className="w-6 h-6 text-white" />}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedChama.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 text-xs bg-white/20 text-white rounded-full">{selectedChama.status}</span>
                    <span className="text-xs text-white/80 capitalize">{selectedChama.chama_type || "savings"}</span>
                    <span className="text-xs text-white/80">• Cycle {selectedChama.current_cycle}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {collecting && <span className="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-lg text-sm text-white"><RefreshCw className="w-4 h-4 animate-spin" />Live</span>}
                <button onClick={() => { setShowDetailModal(false); stopPolling(); setExpandedStkRow(null); setStkRequests([]) }} className="p-2 hover:bg-white/20 rounded-xl text-white"><X className="w-6 h-6" /></button>
              </div>
            </div>

            {/* Main Content - Scrollable */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {/* Top Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                {[
                  { label: "Contribution", value: formatCurrency(selectedChama.contribution_amount), icon: Wallet, color: "from-slate-500 to-slate-600", textColor: "text-slate-600" },
                  { label: "Members", value: selectedChama.members?.length || 0, icon: Users, color: "from-blue-500 to-blue-600", textColor: "text-blue-600" },
                  { label: "Collected", value: formatCurrency(selectedChama.total_collected), icon: TrendingUp, color: "from-emerald-500 to-emerald-600", textColor: "text-emerald-600" },
                  { label: "Distributed", value: formatCurrency(selectedChama.total_distributed), icon: Send, color: "from-purple-500 to-purple-600", textColor: "text-purple-600" },
                  { label: "STK Sent", value: totalRequests, icon: CreditCard, color: "from-cyan-500 to-cyan-600", textColor: "text-cyan-600" },
                  { label: "Paid", value: completedCount, icon: Check, color: "from-green-500 to-green-600", textColor: "text-green-600" },
                  { label: "Failed", value: failedCount, icon: AlertTriangle, color: "from-red-500 to-red-600", textColor: "text-red-600" },
                  { label: "Success Rate", value: `${successRate}%`, icon: Target, color: "from-amber-500 to-amber-600", textColor: "text-amber-600" },
                ].map((stat, i) => (
                  <div key={i} className="relative overflow-hidden p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                    <div className={cn("absolute top-0 right-0 w-12 h-12 -mr-3 -mt-3 rounded-full opacity-20 bg-gradient-to-br", stat.color)} />
                    <div className="relative">
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br mb-2", stat.color)}>
                        <stat.icon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <p className={cn("text-lg font-bold", stat.textColor)}>{stat.value}</p>
                      <p className="text-[9px] text-zinc-500 uppercase tracking-wide">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Charts & Members Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Pie Chart - Status Distribution */}
                <div className="p-4 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                  <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-3">STK Status Distribution</h4>
                  {totalRequests > 0 ? (
                    <div className="flex items-center gap-4">
                      <div className="relative w-20 h-20">
                        <svg viewBox="0 0 36 36" className="w-20 h-20 transform -rotate-90">
                          <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                          <circle cx="18" cy="18" r="16" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray={`${(completedCount / Math.max(totalRequests, 1)) * 100} 100`} strokeLinecap="round" />
                          <circle cx="18" cy="18" r="16" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray={`${(pendingCount / Math.max(totalRequests, 1)) * 100} 100`} strokeDashoffset={`-${(completedCount / Math.max(totalRequests, 1)) * 100}`} strokeLinecap="round" />
                          <circle cx="18" cy="18" r="16" fill="none" stroke="#ef4444" strokeWidth="3" strokeDasharray={`${(failedCount / Math.max(totalRequests, 1)) * 100} 100`} strokeDashoffset={`-${((completedCount + pendingCount) / Math.max(totalRequests, 1)) * 100}`} strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center"><span className="text-lg font-bold text-zinc-700">{totalRequests}</span></div>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center justify-between text-xs"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />Completed</span><span className="font-semibold">{completedCount}</span></div>
                        <div className="flex items-center justify-between text-xs"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />Pending</span><span className="font-semibold">{pendingCount}</span></div>
                        <div className="flex items-center justify-between text-xs"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />Failed</span><span className="font-semibold">{failedCount}</span></div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-zinc-400 text-sm">No STK requests yet</div>
                  )}
                </div>

                {/* Collection Progress */}
                <div className="p-4 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                  <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Collection Progress</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1"><span className="text-zinc-500">Expected</span><span className="font-semibold text-zinc-700">{formatCurrency(totalStkAmount || selectedChama.contribution_amount * (selectedChama.members?.length || 0))}</span></div>
                      <div className="h-2 bg-zinc-200 rounded-full overflow-hidden"><div className="h-full bg-zinc-400" style={{ width: "100%" }} /></div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1"><span className="text-zinc-500">Collected</span><span className="font-semibold text-emerald-600">{formatCurrency(collectedStkAmount || selectedChama.total_collected)}</span></div>
                      <div className="h-2 bg-zinc-200 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${(collectedStkAmount / Math.max(totalStkAmount || 1, 1)) * 100}%` }} /></div>
                    </div>
                    <div className="pt-2 border-t border-zinc-200 flex justify-between text-xs">
                      <span className="text-zinc-500">Avg Attempts</span><span className="font-semibold text-purple-600">{avgAttempts}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Forfeited</span><span className="font-semibold text-red-600">{forfeitCount} members</span>
                    </div>
                  </div>
                </div>

                {/* Members Quick View */}
                <div className="p-4 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Members ({selectedChama.members?.length || 0})</h4>
                    <button onClick={() => setShowAddMemberModal(true)} className="flex items-center gap-1 px-2 py-1 text-[10px] bg-blue-100 text-blue-700 rounded font-medium"><UserPlus className="w-3 h-3" />Add</button>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-auto">
                    {selectedChama.members?.slice(0, 5).map((m, i) => (
                      <div key={m.id} className="flex items-center gap-2 text-xs">
                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white", m.has_received_payout ? "bg-emerald-500" : "bg-blue-500")}>{m.has_received_payout ? <Check className="w-3 h-3" /> : i + 1}</div>
                        <span className="flex-1 truncate font-medium">{m.name}</span>
                        <span className="text-zinc-500">{formatCurrency(m.total_contributed || 0)}</span>
                      </div>
                    ))}
                    {(selectedChama.members?.length || 0) > 5 && <p className="text-[10px] text-zinc-400 text-center">+{(selectedChama.members?.length || 0) - 5} more</p>}
                  </div>
                </div>
              </div>

              {/* STK History Section */}
              <div className="rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
                  <div className="flex items-center gap-3">
                    <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">STK Push History</h4>
                    <span className="text-xs text-zinc-500">({stkRequests.length} requests)</span>
                    {pendingCount > 0 && <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded-full"><Clock className="w-3 h-3 animate-pulse" />{pendingCount} pending</span>}
                  </div>
                  <div className="flex gap-2">
                    {pendingCount > 0 && (
                      <button onClick={pollPendingStk} disabled={collecting} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50">
                        <RefreshCw className={cn("w-3 h-3", collecting && "animate-spin")} />
                        {collecting ? "Checking..." : "Check Pending"}
                      </button>
                    )}
                    {failedCount > 0 && <button onClick={retryAllFailed} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200"><RotateCcw className="w-3 h-3" />Retry Failed ({failedCount})</button>}
                    <button onClick={() => fetchStkHistory(selectedChama.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200"><RefreshCw className="w-3 h-3" />Refresh</button>
                  </div>
                </div>

                {/* STK Table */}
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-zinc-100 dark:bg-zinc-700 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-zinc-600">#</th>
                        <th className="px-3 py-2 text-left font-semibold text-zinc-600">Member</th>
                        <th className="px-3 py-2 text-left font-semibold text-zinc-600">Phone</th>
                        <th className="px-3 py-2 text-right font-semibold text-zinc-600">Amount</th>
                        <th className="px-3 py-2 text-center font-semibold text-zinc-600">Status</th>
                        <th className="px-3 py-2 text-center font-semibold text-zinc-600">Attempts</th>
                        <th className="px-3 py-2 text-left font-semibold text-zinc-600">Account #</th>
                        <th className="px-3 py-2 text-left font-semibold text-zinc-600">Receipt</th>
                        <th className="px-3 py-2 text-center font-semibold text-zinc-600">Action</th>
                        <th className="px-3 py-2 w-6"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {stkRequests.length === 0 ? (
                        <tr><td colSpan={10} className="px-4 py-8 text-center text-zinc-400">No STK requests. Start a collection to send STK pushes.</td></tr>
                      ) : stkRequests.map((req, idx) => (
                        <>
                          <tr key={req.id} onClick={() => setExpandedStkRow(expandedStkRow === req.id ? null : req.id)} className={cn(
                            "cursor-pointer transition-colors border-b border-zinc-100",
                            req.status === "completed" && "bg-emerald-50/50",
                            req.status === "failed" && "bg-red-50/50",
                            expandedStkRow === req.id && "bg-blue-50 border-blue-200",
                            "hover:bg-blue-50/50"
                          )}>
                            <td className="px-3 py-2 font-mono text-zinc-400">{idx + 1}</td>
                            <td className="px-3 py-2 font-medium">{req.member?.name || "Unknown"}</td>
                            <td className="px-3 py-2 font-mono text-zinc-600">{req.phone_number}</td>
                            <td className="px-3 py-2 text-right font-mono font-semibold">{formatCurrency(req.amount)}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={cn("px-2 py-0.5 text-[10px] font-semibold rounded-full",
                                req.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                                req.status === "failed" ? "bg-red-100 text-red-700" :
                                req.status === "sent" ? "bg-blue-100 text-blue-700" :
                                "bg-amber-100 text-amber-700"
                              )}>{req.status}</span>
                            </td>
                            <td className="px-3 py-2 text-center"><span className={cn((req.attempt_count || 1) >= 3 ? "text-red-600 font-semibold" : "text-zinc-600")}>{req.attempt_count || 1}/{req.max_attempts || 3}</span></td>
                            <td className="px-3 py-2 font-mono text-[10px] text-zinc-500">{req.account_number || "—"}</td>
                            <td className="px-3 py-2 font-mono text-[10px] text-emerald-600">{req.mpesa_receipt_number || "—"}</td>
                            <td className="px-3 py-2 text-center">
                              {(req.status === "failed") && <button onClick={(e) => { e.stopPropagation(); retryStk(req.id) }} className="p-1 hover:bg-blue-100 rounded text-blue-600"><RotateCcw className="w-3 h-3" /></button>}
                              {req.status === "completed" && <Check className="w-4 h-4 text-emerald-600 mx-auto" />}
                              {req.status === "pending" && <Clock className="w-3 h-3 text-amber-500 mx-auto" />}
                            </td>
                            <td className="px-3 py-2">{expandedStkRow === req.id ? <ChevronUp className="w-3 h-3 text-zinc-400" /> : <ChevronDown className="w-3 h-3 text-zinc-400" />}</td>
                          </tr>
                          {expandedStkRow === req.id && (
                            <tr className="bg-blue-50/70 border-b border-blue-200">
                              <td colSpan={10} className="px-4 py-3">
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
                                  <div><p className="text-zinc-500 mb-1">Request ID</p><p className="font-mono text-[9px] break-all">{req.id}</p></div>
                                  <div><p className="text-zinc-500 mb-1">Checkout ID</p><p className="font-mono text-[9px] break-all">{req.checkout_request_id || "—"}</p></div>
                                  <div><p className="text-zinc-500 mb-1">Account #</p><p className="font-mono">{req.account_number || "—"}</p></div>
                                  <div><p className="text-zinc-500 mb-1">Receipt</p><p className="font-mono text-emerald-600">{req.mpesa_receipt_number || "—"}</p></div>
                                  <div><p className="text-zinc-500 mb-1">Created</p><p>{req.created_at ? new Date(req.created_at).toLocaleString() : "—"}</p></div>
                                  <div><p className="text-zinc-500 mb-1">Last Attempt</p><p>{req.last_attempt_at ? new Date(req.last_attempt_at).toLocaleString() : "—"}</p></div>
                                  {req.error_message && <div className="col-span-2"><p className="text-zinc-500 mb-1">Error</p><p className="text-red-600">{req.error_message}</p></div>}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span>Total Collected: <strong className="text-emerald-600">{formatCurrency(selectedChama.total_collected)}</strong></span>
                <span>Distributed: <strong className="text-purple-600">{formatCurrency(selectedChama.total_distributed)}</strong></span>
              </div>
              <div className="flex gap-2">
                <button onClick={startCollection} disabled={collecting} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 text-white disabled:opacity-50 shadow-lg hover:shadow-xl transition-all">
                  {collecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {collecting ? "Collecting..." : "Start Collection"}
                </button>
                <button onClick={() => { setShowDetailModal(false); stopPolling(); setExpandedStkRow(null); setStkRequests([]) }} className="px-4 py-2 text-sm font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg">Close</button>
              </div>
            </div>
          </div>
        </div>
        )
      })()}

      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-blue-600 to-indigo-600"><h3 className="font-semibold text-white">Add Member</h3><button onClick={() => { setShowAddMemberModal(false); setSelectedUser(null); setNewMember({ name: "", phone: "", email: "", pledge_amount: "" }) }} className="p-1 hover:bg-white/20 rounded text-white"><X className="w-5 h-5" /></button></div>
            <div className="p-5 space-y-4">
              <div className="relative"><label className="text-xs font-medium text-zinc-700 mb-1 block">Search Ongea Pesa Users</label><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" /><input type="text" placeholder="Search by email or phone..." value={userSearchTerm} onChange={(e) => setUserSearchTerm(e.target.value)} className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm border border-zinc-200 bg-white" /></div>{userSearchTerm && <div className="absolute z-10 w-full mt-1 rounded-xl overflow-hidden bg-white border border-zinc-200 shadow-xl max-h-40 overflow-y-auto">{filteredUsers.slice(0, 5).map(u => <div key={u.id} onClick={() => { setSelectedUser(u); setUserSearchTerm("") }} className="flex items-center gap-3 p-3 hover:bg-zinc-50 cursor-pointer"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-medium text-white">{(u.email?.[0] || "U").toUpperCase()}</div><div className="flex-1"><p className="text-sm font-medium">{u.email || "No email"}</p><p className="text-xs text-zinc-500">{u.phone_number || u.mpesa_number}</p></div></div>)}</div>}</div>
              {selectedUser ? <div className="p-3 bg-blue-50 rounded-xl flex items-center gap-3 border border-blue-200"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center"><User className="w-5 h-5 text-white" /></div><div className="flex-1"><p className="font-medium text-zinc-900">{selectedUser.email}</p><p className="text-xs text-zinc-500">{selectedUser.phone_number || selectedUser.mpesa_number}</p></div><button onClick={() => setSelectedUser(null)} className="p-1 text-zinc-400 hover:text-zinc-600"><X className="w-4 h-4" /></button></div> : <><div className="text-center text-xs text-zinc-400 py-2">— or enter manually —</div><div className="space-y-3"><div><label className="text-xs font-medium text-zinc-700">Name</label><Input value={newMember.name} onChange={(e) => setNewMember(m => ({ ...m, name: e.target.value }))} placeholder="John Doe" className="mt-1" /></div><div><label className="text-xs font-medium text-zinc-700">Phone</label><Input value={newMember.phone} onChange={(e) => setNewMember(m => ({ ...m, phone: e.target.value }))} placeholder="0712345678" className="mt-1" /></div></div></>}
              {selectedChama?.chama_type === "fundraising" && <div><label className="text-xs font-medium text-zinc-700">Pledge Amount (KES)</label><Input type="number" value={newMember.pledge_amount} onChange={(e) => setNewMember(m => ({ ...m, pledge_amount: e.target.value }))} placeholder="10000" className="mt-1" /></div>}
            </div>
            <div className="flex gap-2 p-5 border-t"><button onClick={() => { setShowAddMemberModal(false); setSelectedUser(null) }} className="flex-1 py-2.5 text-sm text-zinc-600 hover:bg-zinc-100 rounded-xl">Cancel</button><button onClick={addMember} disabled={!selectedUser && (!newMember.name || !newMember.phone)} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white disabled:opacity-50">Add Member</button></div>
          </div>
        </div>
      )}

      {/* Collection Dashboard Modal - Full Screen */}
      {showCollectionModal && (() => {
        const totalRequests = stkRequests.length
        const completedCount = stkRequests.filter(r => r.status === "completed").length
        const failedCount = stkRequests.filter(r => r.status === "failed").length
        const pendingCount = stkRequests.filter(r => ["pending", "processing", "sent"].includes(r.status)).length
        const totalAmount = stkRequests.reduce((s, r) => s + (r.amount || 0), 0)
        const collectedAmount = stkRequests.filter(r => r.status === "completed").reduce((s, r) => s + (r.amount || 0), 0)
        const totalAttempts = stkRequests.reduce((s, r) => s + (r.attempt_count || 1), 0)
        const avgAttempts = totalRequests > 0 ? (totalAttempts / totalRequests).toFixed(1) : "0"
        const successRate = totalRequests > 0 ? ((completedCount / totalRequests) * 100).toFixed(1) : "0"
        const forfeitCount = stkRequests.filter(r => r.status === "failed" && (r.attempt_count || 1) >= (r.max_attempts || 3)).length

        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-2">
            <div className="w-full max-w-6xl h-[95vh] overflow-hidden rounded-2xl bg-zinc-50 dark:bg-zinc-900 shadow-2xl flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    {collecting ? <RefreshCw className="w-6 h-6 text-white animate-spin" /> : <Activity className="w-6 h-6 text-white" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Collection Dashboard</h2>
                    <p className="text-sm text-white/80">{selectedChama?.name} • Cycle {collectionStatus?.cycle_number || selectedChama?.current_cycle} • {new Date().toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {collecting && <span className="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-lg text-sm text-white"><RefreshCw className="w-4 h-4 animate-spin" />Live Polling</span>}
                  <button onClick={() => { setShowCollectionModal(false); stopPolling() }} className="p-2 hover:bg-white/20 rounded-xl text-white"><X className="w-6 h-6" /></button>
                </div>
              </div>

              {/* Analytics Section */}
              <div className="p-4 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                  {[
                    { label: "Total Members", value: totalRequests, icon: Users, color: "from-slate-500 to-slate-600", textColor: "text-slate-600" },
                    { label: "Completed", value: completedCount, icon: Check, color: "from-emerald-500 to-emerald-600", textColor: "text-emerald-600" },
                    { label: "Pending", value: pendingCount, icon: Clock, color: "from-amber-500 to-amber-600", textColor: "text-amber-600" },
                    { label: "Failed", value: failedCount, icon: AlertTriangle, color: "from-red-500 to-red-600", textColor: "text-red-600" },
                    { label: "Success Rate", value: `${successRate}%`, icon: Target, color: "from-blue-500 to-blue-600", textColor: "text-blue-600" },
                    { label: "Avg Attempts", value: avgAttempts, icon: RotateCcw, color: "from-purple-500 to-purple-600", textColor: "text-purple-600" },
                    { label: "Forfeited", value: forfeitCount, icon: Ban, color: "from-rose-500 to-rose-600", textColor: "text-rose-600" },
                    { label: "Collected", value: formatCurrency(collectedAmount), icon: Wallet, color: "from-teal-500 to-teal-600", textColor: "text-teal-600" },
                  ].map((stat, i) => (
                    <div key={i} className="relative overflow-hidden p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
                      <div className={cn("absolute top-0 right-0 w-12 h-12 -mr-3 -mt-3 rounded-full opacity-20 bg-gradient-to-br", stat.color)} />
                      <div className="relative">
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br mb-2", stat.color)}>
                          <stat.icon className="w-3.5 h-3.5 text-white" />
                        </div>
                        <p className={cn("text-lg font-bold", stat.textColor)}>{stat.value}</p>
                        <p className="text-[9px] text-zinc-500 uppercase tracking-wide">{stat.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-3 gap-4 mt-4">
                  {/* Pie Chart - Status Distribution */}
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
                    <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Status Distribution</h4>
                    <div className="flex items-center gap-4">
                      <div className="relative w-24 h-24">
                        <svg viewBox="0 0 36 36" className="w-24 h-24 transform -rotate-90">
                          <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                          <circle cx="18" cy="18" r="16" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray={`${(completedCount / Math.max(totalRequests, 1)) * 100} 100`} strokeLinecap="round" />
                          <circle cx="18" cy="18" r="16" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray={`${(pendingCount / Math.max(totalRequests, 1)) * 100} 100`} strokeDashoffset={`-${(completedCount / Math.max(totalRequests, 1)) * 100}`} strokeLinecap="round" />
                          <circle cx="18" cy="18" r="16" fill="none" stroke="#ef4444" strokeWidth="3" strokeDasharray={`${(failedCount / Math.max(totalRequests, 1)) * 100} 100`} strokeDashoffset={`-${((completedCount + pendingCount) / Math.max(totalRequests, 1)) * 100}`} strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold text-zinc-700">{totalRequests}</span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center justify-between text-xs"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />Completed</span><span className="font-semibold">{completedCount}</span></div>
                        <div className="flex items-center justify-between text-xs"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />Pending</span><span className="font-semibold">{pendingCount}</span></div>
                        <div className="flex items-center justify-between text-xs"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />Failed</span><span className="font-semibold">{failedCount}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Amount Progress */}
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
                    <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Collection Progress</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1"><span className="text-zinc-500">Expected</span><span className="font-semibold text-zinc-700">{formatCurrency(totalAmount)}</span></div>
                        <div className="h-2 bg-zinc-200 rounded-full overflow-hidden"><div className="h-full bg-zinc-400" style={{ width: "100%" }} /></div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1"><span className="text-zinc-500">Collected</span><span className="font-semibold text-emerald-600">{formatCurrency(collectedAmount)}</span></div>
                        <div className="h-2 bg-zinc-200 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${(collectedAmount / Math.max(totalAmount, 1)) * 100}%` }} /></div>
                      </div>
                      <div className="pt-2 border-t border-zinc-200">
                        <div className="flex justify-between text-xs"><span className="text-zinc-500">Outstanding</span><span className="font-semibold text-red-600">{formatCurrency(totalAmount - collectedAmount)}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Retry Analytics */}
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
                    <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Retry Analytics</h4>
                    <div className="space-y-2">
                      {[1, 2, 3].map(attempt => {
                        const count = stkRequests.filter(r => (r.attempt_count || 1) === attempt).length
                        return (
                          <div key={attempt} className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-500 w-16">Attempt {attempt}</span>
                            <div className="flex-1 h-4 bg-zinc-200 rounded overflow-hidden">
                              <div className={cn("h-full", attempt === 1 ? "bg-blue-500" : attempt === 2 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${(count / Math.max(totalRequests, 1)) * 100}%` }} />
                            </div>
                            <span className="text-xs font-semibold w-8 text-right">{count}</span>
                          </div>
                        )
                      })}
                      <div className="pt-2 border-t border-zinc-200 flex justify-between text-xs">
                        <span className="text-zinc-500">Max Retries Reached</span>
                        <span className="font-semibold text-rose-600">{forfeitCount} members</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Bar */}
              <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500">Showing {stkRequests.length} STK requests</span>
                  {!collecting && collectionStatus?.all_completed && <span className="flex items-center gap-1.5 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium"><Check className="w-3 h-3" />All Completed!</span>}
                </div>
                <div className="flex gap-2">
                  {failedCount > 0 && (
                    <button onClick={retryAllFailed} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
                      <RotateCcw className="w-3.5 h-3.5" />Retry All Failed ({failedCount})
                    </button>
                  )}
                  {!collecting && collectionStatus?.cycle_id && (
                    <button onClick={() => startPolling(collectionStatus.cycle_id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                      <RefreshCw className="w-3.5 h-3.5" />Refresh Status
                    </button>
                  )}
                </div>
              </div>

              {/* Detailed Table */}
              <div className="flex-1 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-100 dark:bg-zinc-800 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400">#</th>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400">Member</th>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400">Phone</th>
                      <th className="px-3 py-2 text-right font-semibold text-zinc-600 dark:text-zinc-400">Amount</th>
                      <th className="px-3 py-2 text-center font-semibold text-zinc-600 dark:text-zinc-400">Status</th>
                      <th className="px-3 py-2 text-center font-semibold text-zinc-600 dark:text-zinc-400">Attempts</th>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400">Account #</th>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400">Transaction ID</th>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400">Receipt</th>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400">Last Updated</th>
                      <th className="px-3 py-2 text-center font-semibold text-zinc-600 dark:text-zinc-400">Actions</th>
                      <th className="px-3 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {stkRequests.length === 0 ? (
                      <tr><td colSpan={12} className="px-4 py-12 text-center text-zinc-500">
                        {collecting ? <div className="flex flex-col items-center gap-2"><RefreshCw className="w-8 h-8 animate-spin text-blue-500" /><span>Sending STK pushes to members...</span></div> : "No STK requests yet. Start a collection to see data here."}
                      </td></tr>
                    ) : stkRequests.map((req, idx) => (
                      <>
                        <tr key={req.id} onClick={() => setExpandedStkRow(expandedStkRow === req.id ? null : req.id)} className={cn(
                          "cursor-pointer transition-colors border-b border-zinc-100 dark:border-zinc-800",
                          idx % 2 === 0 ? "bg-white dark:bg-zinc-900/50" : "bg-zinc-50/50 dark:bg-zinc-800/30",
                          req.status === "completed" && "bg-emerald-50/50 dark:bg-emerald-900/10",
                          req.status === "failed" && "bg-red-50/50 dark:bg-red-900/10",
                          expandedStkRow === req.id && "bg-blue-50 dark:bg-blue-900/20 border-blue-200",
                          "hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                        )}>
                          <td className="px-3 py-2 font-mono text-zinc-400">{idx + 1}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white",
                                req.status === "completed" ? "bg-emerald-500" : req.status === "failed" ? "bg-red-500" : "bg-blue-500"
                              )}>
                                {req.status === "completed" ? <Check className="w-3.5 h-3.5" /> : req.status === "failed" ? <X className="w-3.5 h-3.5" /> : (req.member?.name?.[0] || "?")}
                              </div>
                              <div>
                                <p className="font-medium text-zinc-900 dark:text-zinc-100">{req.member?.name || "Unknown"}</p>
                                {req.member?.role === "admin" && <span className="text-[9px] px-1 py-0.5 bg-purple-100 text-purple-600 rounded">Admin</span>}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 font-mono text-zinc-600">{req.phone_number}</td>
                          <td className="px-3 py-2 text-right font-mono font-semibold text-zinc-700">{formatCurrency(req.amount)}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={cn("px-2 py-0.5 text-[10px] font-semibold rounded-full",
                              req.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                              req.status === "failed" ? "bg-red-100 text-red-700" :
                              req.status === "sent" ? "bg-blue-100 text-blue-700" :
                              req.status === "processing" ? "bg-purple-100 text-purple-700" :
                              "bg-amber-100 text-amber-700"
                            )}>{req.status}</span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={cn("font-semibold", (req.attempt_count || 1) >= (req.max_attempts || 3) ? "text-red-600" : "text-zinc-600")}>
                              {req.attempt_count || 1}/{req.max_attempts || 3}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-[10px] text-zinc-500">{req.account_number || "—"}</td>
                          <td className="px-3 py-2 font-mono text-[10px] text-zinc-500 truncate max-w-[100px]" title={req.checkout_request_id}>{req.checkout_request_id || "—"}</td>
                          <td className="px-3 py-2 font-mono text-[10px] text-emerald-600">{req.mpesa_receipt_number || "—"}</td>
                          <td className="px-3 py-2 text-zinc-500 whitespace-nowrap">{req.updated_at ? new Date(req.updated_at).toLocaleTimeString() : "—"}</td>
                          <td className="px-3 py-2 text-center">
                            {(req.status === "failed" || req.status === "expired" || req.status === "cancelled") && (
                              <button onClick={(e) => { e.stopPropagation(); retryStk(req.id) }} className="p-1.5 hover:bg-blue-100 rounded text-blue-600" title="Retry STK">
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {req.status === "processing" && <RefreshCw className="w-3.5 h-3.5 text-purple-600 animate-spin mx-auto" />}
                            {req.status === "completed" && <Check className="w-4 h-4 text-emerald-600 mx-auto" />}
                            {req.status === "pending" && <Clock className="w-3.5 h-3.5 text-amber-500 mx-auto" />}
                          </td>
                          <td className="px-3 py-2">{expandedStkRow === req.id ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}</td>
                        </tr>
                        {expandedStkRow === req.id && (
                          <tr className="bg-blue-50/70 dark:bg-blue-900/20 border-b border-blue-200">
                            <td colSpan={12} className="px-4 py-3">
                              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-xs">
                                <div><p className="text-zinc-500 mb-1">Request ID</p><p className="font-mono text-[10px] text-zinc-900 break-all">{req.id}</p></div>
                                <div><p className="text-zinc-500 mb-1">Member ID</p><p className="font-mono text-[10px] text-zinc-900 break-all">{req.member_id || "—"}</p></div>
                                <div><p className="text-zinc-500 mb-1">Cycle ID</p><p className="font-mono text-[10px] text-zinc-900 break-all">{req.cycle_id || "—"}</p></div>
                                <div><p className="text-zinc-500 mb-1">Checkout Request ID</p><p className="font-mono text-[10px] text-zinc-900 break-all">{req.checkout_request_id || "—"}</p></div>
                                <div><p className="text-zinc-500 mb-1">Account Number</p><p className="font-mono text-zinc-900">{req.account_number || "—"}</p></div>
                                <div><p className="text-zinc-500 mb-1">M-Pesa Receipt</p><p className="font-mono text-emerald-600">{req.mpesa_receipt_number || "—"}</p></div>
                                <div><p className="text-zinc-500 mb-1">Created At</p><p className="text-zinc-900">{req.created_at ? new Date(req.created_at).toLocaleString() : "—"}</p></div>
                                <div><p className="text-zinc-500 mb-1">Last Attempt</p><p className="text-zinc-900">{req.last_attempt_at ? new Date(req.last_attempt_at).toLocaleString() : "—"}</p></div>
                                <div><p className="text-zinc-500 mb-1">Next Retry</p><p className="text-zinc-900">{req.next_retry_at ? new Date(req.next_retry_at).toLocaleString() : "—"}</p></div>
                                <div><p className="text-zinc-500 mb-1">Attempt Count</p><p className={cn("font-semibold", (req.attempt_count || 1) >= 3 ? "text-red-600" : "text-zinc-900")}>{req.attempt_count || 1} of {req.max_attempts || 3}</p></div>
                                <div className="col-span-2"><p className="text-zinc-500 mb-1">Error Message</p><p className="text-red-600">{req.error_message || "No errors"}</p></div>
                                {req.stk_history && (
                                  <div className="col-span-full"><p className="text-zinc-500 mb-1">STK History (JSON)</p><pre className="text-[10px] bg-zinc-100 p-2 rounded overflow-auto max-h-24">{JSON.stringify(req.stk_history, null, 2)}</pre></div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span>Expected: <strong className="text-zinc-700">{formatCurrency(totalAmount)}</strong></span>
                  <span>Collected: <strong className="text-emerald-600">{formatCurrency(collectedAmount)}</strong></span>
                  <span>Outstanding: <strong className="text-red-600">{formatCurrency(totalAmount - collectedAmount)}</strong></span>
                </div>
                <button onClick={() => { setShowCollectionModal(false); stopPolling(); setExpandedStkRow(null) }} className="px-4 py-2 text-sm font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg">
                  Close Dashboard
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
