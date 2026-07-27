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
import { platformFee } from "@/lib/transaction-fees"
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
        const persistedFee = tx.platform_fee ?? 0
        return {
          ...tx,
          platform_fee: persistedFee > 0 ? persistedFee : platformFee(tx.amount || 0, tx.type?.toLowerCase()), // Deposits have 0% fee
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
                return {
                  id: tx.trans_id || `ip_${Date.now()}_${Math.random()}`,
                  user_id: "",
                  type: tx.trans_type || "transfer",
                  amount: amount,
                  platform_fee: platformFee(amount, tx.trans_type?.toLowerCase()), // Deposits have 0% fee
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
      transfer_in: "bg-brand/10 text-brand",
      transfer_out: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
      wallet_transfer: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
      transfer: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
      gate_transfer: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    }
    return colors[type?.toLowerCase()] || "bg-muted text-muted-foreground"
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: "bg-brand/10 text-brand",
      success: "bg-brand/10 text-brand",
      pending: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
      failed: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
    }
    return colors[status?.toLowerCase()] || "bg-muted text-muted-foreground"
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
            <h1 className="text-lg font-semibold text-foreground">Wallet Transfers</h1>
            <p className="text-xs text-muted-foreground">Inter-wallet and gate-to-gate transfers</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchWalletTransfers}
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
            { label: "Incoming", value: incomingCount, icon: Users, color: "text-brand" },
            { label: "Outgoing", value: outgoingCount, icon: Building2, color: "text-orange-600 dark:text-orange-400" },
          ].map((stat, i) => (
            <div
              key={i}
              className={cn(
                "p-4 rounded-xl",
                "bg-card",
                "border border-border/40",
                "shadow-sm backdrop-blur-xl"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", "bg-muted")}>
                  <stat.icon className={cn("w-4 h-4", stat.color)} />
                </div>
                <div>
                  <p className={cn("text-lg font-semibold", stat.color)}>{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div
          className={cn(
            "p-4 rounded-xl",
            "bg-card",
            "border border-border/40",
            "shadow-sm backdrop-blur-xl"
          )}
        >
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by gate, user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-muted/30 border-border/60"
              />
            </div>
            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger className="w-[160px] bg-muted/30 border-border/60">
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
            "bg-card",
            "border border-border/40",
            "shadow-sm backdrop-blur-xl"
          )}
        >
          <div className="p-4 border-b border-border/40">
            <h2 className="text-sm font-semibold text-foreground">
              Transfer History
              <span className="text-xs font-normal text-muted-foreground ml-1">
                ({filteredTransfers.length} records)
              </span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/30 border-b border-border/60">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-10">#</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Date</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Type</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">From</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">To</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Amount</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Fee</th>
                  <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Status</th>
                  <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground">Loading transfers...</p>
                    </td>
                  </tr>
                ) : filteredTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                      No wallet transfers found
                    </td>
                  </tr>
                ) : (
                  filteredTransfers.map((tx, index) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-3 py-2 text-muted-foreground font-mono">{index + 1}</td>
                      <td className="px-3 py-2 text-foreground whitespace-nowrap">
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
                      <td className="px-3 py-2 text-foreground">
                        {tx.sender_gate || tx.profiles?.email || "—"}
                      </td>
                      <td className="px-3 py-2 text-foreground">
                        {tx.recipient_gate || tx.recipient_id || "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        <span className={cn(
                          "font-medium",
                          tx.type === "transfer_in" ? "text-brand" : "text-foreground"
                        )}>
                          {tx.type === "transfer_in" ? "+" : "-"}{formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-brand">
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
