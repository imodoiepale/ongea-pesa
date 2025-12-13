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
  ArrowUpRight,
  ArrowDownLeft,
  Download,
  CreditCard,
  Wallet,
  DollarSign,
  TrendingUp,
  Building2,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react"

// Platform fee rate: 0.05% (0.0005)
const PLATFORM_FEE_RATE = 0.0005

interface Transaction {
  id: string
  user_id: string
  type: string
  amount: number
  platform_fee: number
  fee_rate: number
  status: string
  recipient_phone?: string
  recipient_name?: string
  description?: string
  created_at: string
  source?: string
  profiles?: {
    email?: string
    phone_number?: string
  }
}

interface IndexPayTransaction {
  trans_id: string
  trans_type: string
  trans_amount: string
  trans_date: string
  trans_status: string
  gate_name?: string
  pocket_name?: string
  description?: string
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const supabase = createClient()

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      // Fetch Supabase transactions - simple query without join first
      let query = supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200)

      if (typeFilter !== "all") {
        query = query.eq("type", typeFilter)
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter)
      }

      const { data: supabaseData, error } = await query

      if (error) {
        console.error("Error fetching Supabase transactions:", error)
      }

      // Fetch user profiles separately to avoid join issues
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

      // Mark Supabase transactions and attach profiles with calculated fee rate
      const supabaseTx = (supabaseData || []).map(tx => {
        const amount = tx.amount || 0
        const calculatedFee = amount * PLATFORM_FEE_RATE
        const feeRate = PLATFORM_FEE_RATE * 100 // 0.05%
        return {
          ...tx,
          platform_fee: calculatedFee,
          fee_rate: feeRate,
          source: "supabase",
          profiles: profilesMap[tx.user_id] || null
        }
      })

      // Fetch IndexPay transactions (with proper error handling for non-JSON responses)
      let indexPayTx: Transaction[] = []
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
            
            indexPayTx = txList.map((tx: IndexPayTransaction) => {
              const amount = parseFloat(tx.trans_amount || "0")
              return {
                id: tx.trans_id || `ip_${Date.now()}_${Math.random()}`,
                user_id: "",
                type: tx.trans_type || "unknown",
                amount: amount,
                platform_fee: amount * PLATFORM_FEE_RATE,
                fee_rate: PLATFORM_FEE_RATE * 100,
                status: tx.trans_status || "completed",
                description: tx.description || tx.gate_name || tx.pocket_name,
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

      // Combine and sort by date
      let allTransactions = [...supabaseTx, ...indexPayTx]
      
      // Filter by source if needed
      if (sourceFilter !== "all") {
        allTransactions = allTransactions.filter(tx => tx.source === sourceFilter)
      }
      
      // Sort by date descending
      allTransactions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setTransactions(allTransactions)
    } catch (err) {
      console.error("Failed to fetch transactions:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [typeFilter, statusFilter, sourceFilter])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount)
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      deposit: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
      withdraw: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
      send_phone: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
      transfer_out: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
      transfer_in: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
      paybill: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
      buy_goods_till: "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400",
      credit: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
      debit: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
    }
    return colors[type] || "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
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

  const filteredTransactions = transactions.filter((tx) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      tx.id.toLowerCase().includes(search) ||
      tx.profiles?.email?.toLowerCase().includes(search) ||
      tx.profiles?.phone_number?.toLowerCase().includes(search) ||
      tx.recipient_phone?.toLowerCase().includes(search) ||
      tx.description?.toLowerCase().includes(search)
    )
  })

  const totalVolume = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0)
  const totalFees = filteredTransactions.reduce((sum, tx) => sum + (tx.platform_fee || 0), 0)
  const supabaseCount = filteredTransactions.filter(tx => tx.source === "supabase").length
  const indexPayCount = filteredTransactions.filter(tx => tx.source === "indexpay").length

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">All Transactions</h1>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">View and manage all platform transactions</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchTransactions}
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
                "bg-zinc-900 dark:bg-zinc-50",
                "text-zinc-50 dark:text-zinc-900",
                "text-xs font-medium",
                "hover:bg-zinc-800 dark:hover:bg-zinc-200",
                "transition-colors duration-200"
              )}
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Transactions", value: filteredTransactions.length, icon: CreditCard, color: "text-zinc-900 dark:text-zinc-100" },
            { label: "Total Volume", value: formatCurrency(totalVolume), icon: Wallet, color: "text-blue-600 dark:text-blue-400" },
            { label: "Platform Fees", value: formatCurrency(totalFees), icon: DollarSign, color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Avg Transaction", value: formatCurrency(totalVolume / (filteredTransactions.length || 1)), icon: TrendingUp, color: "text-purple-600 dark:text-purple-400" },
            { label: "Supabase", value: supabaseCount, icon: Wallet, color: "text-purple-600 dark:text-purple-400" },
            { label: "IndexPay", value: indexPayCount, icon: Building2, color: "text-blue-600 dark:text-blue-400" },
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
                placeholder="Search by ID, email, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px] bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="withdraw">Withdraw</SelectItem>
                <SelectItem value="send_phone">Send to Phone</SelectItem>
                <SelectItem value="transfer_out">Transfer Out</SelectItem>
                <SelectItem value="transfer_in">Transfer In</SelectItem>
                <SelectItem value="paybill">PayBill</SelectItem>
                <SelectItem value="buy_goods_till">Buy Goods</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[140px] bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="supabase">Supabase</SelectItem>
                <SelectItem value="indexpay">IndexPay</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Transactions Table */}
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
              Transaction History
              <span className="text-xs font-normal text-zinc-600 dark:text-zinc-400 ml-1">
                ({filteredTransactions.length} transactions)
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
                  <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400">User/Gate</th>
                  <th className="px-3 py-2 text-right font-semibold text-zinc-600 dark:text-zinc-400">Amount</th>
                  <th className="px-3 py-2 text-right font-semibold text-zinc-600 dark:text-zinc-400">Fee</th>
                  <th className="px-3 py-2 text-right font-semibold text-zinc-600 dark:text-zinc-400">Rate</th>
                  <th className="px-3 py-2 text-center font-semibold text-zinc-600 dark:text-zinc-400">Status</th>
                  <th className="px-3 py-2 text-center font-semibold text-zinc-600 dark:text-zinc-400">Source</th>
                  <th className="px-3 py-2 text-center font-semibold text-zinc-600 dark:text-zinc-400 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-zinc-400" />
                      <p className="text-zinc-600 dark:text-zinc-400">Loading transactions...</p>
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-zinc-500">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx, index) => (
                    <>
                      <tr
                        key={tx.id}
                        onClick={() => setExpandedRow(expandedRow === tx.id ? null : tx.id)}
                        className={cn(
                          "cursor-pointer transition-colors border-b border-zinc-100 dark:border-zinc-800",
                          index % 2 === 0 ? "bg-white dark:bg-zinc-900/50" : "bg-zinc-50/50 dark:bg-zinc-800/30",
                          expandedRow === tx.id && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
                          "hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                        )}
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
                        <td className="px-3 py-2">
                          <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[120px]">
                            {tx.profiles?.email || tx.profiles?.phone_number || "Unknown"}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          <span className={cn(
                            "font-semibold",
                            tx.type.includes("in") || tx.type === "deposit" || tx.type === "credit"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          )}>
                            {tx.type.includes("in") || tx.type === "deposit" || tx.type === "credit" ? "+" : "-"}
                            {formatCurrency(tx.amount)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(tx.platform_fee || 0)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-zinc-500 text-[10px]">
                          {tx.fee_rate ? `${tx.fee_rate.toFixed(3)}%` : "0.05%"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", getStatusColor(tx.status || "completed"))}>
                            {tx.status || "completed"}
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
                        <td className="px-3 py-2 text-center">
                          {expandedRow === tx.id ? (
                            <ChevronUp className="w-4 h-4 text-zinc-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-zinc-400" />
                          )}
                        </td>
                      </tr>
                      {expandedRow === tx.id && (
                        <tr key={`${tx.id}-details`} className="bg-blue-50/50 dark:bg-blue-900/10 border-b border-blue-200 dark:border-blue-800">
                          <td colSpan={10} className="px-4 py-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                              <div>
                                <p className="text-zinc-500 dark:text-zinc-400 mb-1">Transaction ID</p>
                                <p className="font-mono text-zinc-900 dark:text-zinc-100 text-[10px] break-all">{tx.id}</p>
                              </div>
                              <div>
                                <p className="text-zinc-500 dark:text-zinc-400 mb-1">User ID</p>
                                <p className="font-mono text-zinc-900 dark:text-zinc-100 text-[10px] break-all">{tx.user_id || "—"}</p>
                              </div>
                              <div>
                                <p className="text-zinc-500 dark:text-zinc-400 mb-1">User Email</p>
                                <p className="text-zinc-900 dark:text-zinc-100">{tx.profiles?.email || "—"}</p>
                              </div>
                              <div>
                                <p className="text-zinc-500 dark:text-zinc-400 mb-1">User Phone</p>
                                <p className="text-zinc-900 dark:text-zinc-100">{tx.profiles?.phone_number || "—"}</p>
                              </div>
                              <div>
                                <p className="text-zinc-500 dark:text-zinc-400 mb-1">Recipient</p>
                                <p className="text-zinc-900 dark:text-zinc-100">{tx.recipient_phone || tx.recipient_name || "—"}</p>
                              </div>
                              <div>
                                <p className="text-zinc-500 dark:text-zinc-400 mb-1">Description</p>
                                <p className="text-zinc-900 dark:text-zinc-100">{tx.description || "—"}</p>
                              </div>
                              <div>
                                <p className="text-zinc-500 dark:text-zinc-400 mb-1">Amount</p>
                                <p className={cn(
                                  "font-semibold",
                                  tx.type.includes("in") || tx.type === "deposit" ? "text-emerald-600" : "text-red-600"
                                )}>
                                  {formatCurrency(tx.amount)}
                                </p>
                              </div>
                              <div>
                                <p className="text-zinc-500 dark:text-zinc-400 mb-1">Platform Fee ({tx.fee_rate?.toFixed(3) || "0.05"}%)</p>
                                <p className="text-emerald-600 font-semibold">{formatCurrency(tx.platform_fee || 0)}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
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
