"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import Layout from "@/components/kokonutui/layout"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  RefreshCw,
  Search,
  ArrowRightLeft,
  Download,
  Wallet,
  DollarSign,
  Users,
  Building2,
} from "lucide-react"

interface WalletTransfer {
  id: string
  user_id: string
  type: string
  amount: number
  platform_fee: number
  status: string
  recipient_id?: string
  recipient_gate?: string
  sender_gate?: string
  description?: string
  created_at: string
  source?: string
  profiles?: {
    email?: string
    phone_number?: string
  }
}

export default function WalletTransfersPage() {
  const [transfers, setTransfers] = useState<WalletTransfer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [directionFilter, setDirectionFilter] = useState("all")
  const supabase = createClient()

  const fetchWalletTransfers = async () => {
    setLoading(true)
    try {
      // Fetch wallet transfer transactions from Supabase - get all transfer-related types
      const { data: supabaseData, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200)

      if (error) {
        console.error("Error fetching wallet transfers:", error)
      }

      // Fetch user profiles separately
      const userIds = [...new Set((supabaseData || []).map(tx => tx.user_id).filter(Boolean))]
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

      const supabaseTx = (supabaseData || []).map(tx => {
        const isDeposit = tx.type?.toLowerCase() === "deposit"
        return {
          ...tx,
          platform_fee: isDeposit ? 0 : (tx.amount || 0) * 0.0005, // Deposits have 0% fee
          source: "supabase",
          profiles: profilesMap[tx.user_id] || null
        }
      })

      // Fetch from IndexPay API (get ALL transactions - no filtering)
      let indexPayTx: WalletTransfer[] = []
      try {
        const formData = new FormData()
        formData.append("user_email", "info@nsait.co.ke")
        formData.append("request", "1")
        
        const response = await fetch("https://aps.co.ke/indexpay/api/get_transactions_2.php", {
          method: "POST",
          body: formData,
        })
        
        if (response.ok) {
          const text = await response.text()
          // Check if response is valid JSON before parsing
          if (text.startsWith("{") || text.startsWith("[")) {
            const data = JSON.parse(text)
            const txList = data?.transactions || data?.response || []
            
            // Get ALL IndexPay transactions (no filtering - show all as wallet transfers)
            indexPayTx = txList
              .map((tx: any) => {
                const amount = parseFloat(tx.trans_amount || "0")
                const isDeposit = tx.trans_type?.toLowerCase() === "deposit"
                return {
                  id: tx.trans_id || `ip_${Date.now()}_${Math.random()}`,
                  user_id: "",
                  type: tx.trans_type || "transfer",
                  amount: amount,
                  platform_fee: isDeposit ? 0 : amount * 0.0005, // Deposits have 0% fee
                  status: tx.trans_status || "completed",
                  sender_gate: tx.from_gate || tx.gate_name,
                  recipient_gate: tx.to_gate || tx.pocket_name,
                  description: tx.description,
                  created_at: tx.trans_date || new Date().toISOString(),
                  source: "indexpay",
                  profiles: { email: tx.gate_name }
                }
              })
          }
        }
      } catch (err) {
        // Silently ignore IndexPay errors - Supabase data is primary
        console.warn("IndexPay API unavailable, using Supabase data only")
      }

      // Combine and sort
      let allTransfers = [...supabaseTx, ...indexPayTx]
      allTransfers.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setTransfers(allTransfers)
    } catch (err) {
      console.error("Failed to fetch wallet transfers:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWalletTransfers()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount)
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      transfer_in: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
      transfer_out: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
      wallet_transfer: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
      transfer: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
      gate_transfer: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    }
    return colors[type?.toLowerCase()] || "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
      success: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
      pending: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
      failed: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
    }
    return colors[status?.toLowerCase()] || "bg-zinc-100 dark:bg-zinc-800 text-zinc-600"
  }

  const filteredTransfers = transfers.filter((tx) => {
    if (directionFilter === "in" && tx.type !== "transfer_in") return false
    if (directionFilter === "out" && tx.type !== "transfer_out") return false
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      tx.id.toLowerCase().includes(search) ||
      tx.profiles?.email?.toLowerCase().includes(search) ||
      tx.sender_gate?.toLowerCase().includes(search) ||
      tx.recipient_gate?.toLowerCase().includes(search)
    )
  })

  const totalVolume = filteredTransfers.reduce((sum, tx) => sum + tx.amount, 0)
  const totalFees = filteredTransfers.reduce((sum, tx) => sum + (tx.platform_fee || 0), 0)
  const incomingCount = filteredTransfers.filter(tx => tx.type === "transfer_in").length
  const outgoingCount = filteredTransfers.filter(tx => tx.type === "transfer_out").length

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Wallet Transfers</h1>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">Inter-wallet and gate-to-gate transfers</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchWalletTransfers}
              disabled={loading}
              className={cn(
                "p-2 rounded-lg",
                "bg-zinc-100 dark:bg-zinc-800",
                "hover:bg-zinc-200 dark:hover:bg-zinc-700",
                "transition-colors duration-200"
              )}
            >
              <RefreshCw className={cn("w-4 h-4 text-zinc-600 dark:text-zinc-400", loading && "animate-spin")} />
            </button>
            <button
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg",
                "bg-blue-600 hover:bg-blue-700",
                "text-white text-xs font-medium",
                "transition-colors duration-200"
              )}
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Transfers", value: filteredTransfers.length, icon: ArrowRightLeft, color: "text-blue-600 dark:text-blue-400" },
            { label: "Total Volume", value: formatCurrency(totalVolume), icon: Wallet, color: "text-purple-600 dark:text-purple-400" },
            { label: "Incoming", value: incomingCount, icon: Users, color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Outgoing", value: outgoingCount, icon: Building2, color: "text-orange-600 dark:text-orange-400" },
          ].map((stat, i) => (
            <div
              key={i}
              className={cn(
                "p-4 rounded-xl",
                "bg-white dark:bg-zinc-900/70",
                "border border-zinc-100 dark:border-zinc-800",
                "shadow-sm backdrop-blur-xl"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", "bg-zinc-100 dark:bg-zinc-800")}>
                  <stat.icon className={cn("w-4 h-4", stat.color)} />
                </div>
                <div>
                  <p className={cn("text-lg font-semibold", stat.color)}>{stat.value}</p>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div
          className={cn(
            "p-4 rounded-xl",
            "bg-white dark:bg-zinc-900/70",
            "border border-zinc-100 dark:border-zinc-800",
            "shadow-sm backdrop-blur-xl"
          )}
        >
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search by gate, user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
              />
            </div>
            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger className="w-[160px] bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Directions</SelectItem>
                <SelectItem value="in">Incoming</SelectItem>
                <SelectItem value="out">Outgoing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Transfers Table */}
        <div
          className={cn(
            "rounded-xl overflow-hidden",
            "bg-white dark:bg-zinc-900/70",
            "border border-zinc-100 dark:border-zinc-800",
            "shadow-sm backdrop-blur-xl"
          )}
        >
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Transfer History
              <span className="text-xs font-normal text-zinc-600 dark:text-zinc-400 ml-1">
                ({filteredTransfers.length} records)
              </span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400 w-10">#</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400">Date</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400">Type</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400">From</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400">To</th>
                  <th className="px-3 py-2 text-right font-semibold text-zinc-600 dark:text-zinc-400">Amount</th>
                  <th className="px-3 py-2 text-right font-semibold text-zinc-600 dark:text-zinc-400">Fee</th>
                  <th className="px-3 py-2 text-center font-semibold text-zinc-600 dark:text-zinc-400">Status</th>
                  <th className="px-3 py-2 text-center font-semibold text-zinc-600 dark:text-zinc-400">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-zinc-400" />
                      <p className="text-zinc-600 dark:text-zinc-400">Loading transfers...</p>
                    </td>
                  </tr>
                ) : filteredTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-zinc-500">
                      No wallet transfers found
                    </td>
                  </tr>
                ) : (
                  filteredTransfers.map((tx, index) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <td className="px-3 py-2 text-zinc-500 font-mono">{index + 1}</td>
                      <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleDateString("en-KE", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", getTypeColor(tx.type))}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
                        {tx.sender_gate || tx.profiles?.email || "—"}
                      </td>
                      <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
                        {tx.recipient_gate || tx.recipient_id || "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        <span className={cn(
                          "font-medium",
                          tx.type === "transfer_in" ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-900 dark:text-zinc-100"
                        )}>
                          {tx.type === "transfer_in" ? "+" : "-"}{formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(tx.platform_fee || 0)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", getStatusColor(tx.status))}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-medium",
                          tx.source === "supabase" 
                            ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                            : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                        )}>
                          {tx.source}
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
    </Layout>
  )
}
