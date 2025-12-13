"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import Layout from "@/components/kokonutui/layout"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  RefreshCw,
  Search,
  Users,
  Wallet,
  UserCheck,
  Shield,
  Download,
  Crown,
  Building2,
} from "lucide-react"

interface UserProfile {
  id: string
  email?: string
  phone_number?: string
  mpesa_number?: string
  wallet_balance: number
  gate_name?: string
  gate_id?: string
  gate_balance?: number
  pocket_balance?: number
  role?: string
  is_premium?: boolean
  created_at: string
  updated_at?: string
}

interface IndexPayGate {
  gate_name: string
  gate_id: string
  account_balance: string
  gate_description?: string
}

interface IndexPayPocket {
  pocket_name: string
  gate: string
  acct_balance: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [indexPayGates, setIndexPayGates] = useState<IndexPayGate[]>([])
  const [indexPayPockets, setIndexPayPockets] = useState<IndexPayPocket[]>([])
  const supabase = createClient()

  const fetchUsers = async () => {
    setLoading(true)
    try {
      // Fetch Supabase profiles
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching users:", error)
      }

      // Fetch IndexPay gates
      let gates: IndexPayGate[] = []
      let pockets: IndexPayPocket[] = []
      
      try {
        const gateFormData = new FormData()
        gateFormData.append("user_email", "info@nsait.co.ke")
        
        const gatesResponse = await fetch("https://aps.co.ke/indexpay/api/get_gate_list.php", {
          method: "POST",
          body: gateFormData,
        })
        
        if (gatesResponse.ok) {
          const gatesData = await gatesResponse.json()
          if (Array.isArray(gatesData)) {
            gates = gatesData[0]?.response || gatesData
          } else if (gatesData?.response) {
            gates = gatesData.response
          }
        }
      } catch (err) {
        console.error("Error fetching IndexPay gates:", err)
      }

      try {
        const pocketFormData = new FormData()
        pocketFormData.append("user_email", "info@nsait.co.ke")
        
        const pocketsResponse = await fetch("https://aps.co.ke/indexpay/api/get_pocket_list.php", {
          method: "POST",
          body: pocketFormData,
        })
        
        if (pocketsResponse.ok) {
          const pocketsData = await pocketsResponse.json()
          if (Array.isArray(pocketsData)) {
            pockets = pocketsData[0]?.response || pocketsData
          } else if (pocketsData?.response) {
            pockets = pocketsData.response
          }
        }
      } catch (err) {
        console.error("Error fetching IndexPay pockets:", err)
      }

      setIndexPayGates(gates)
      setIndexPayPockets(pockets)

      // Merge gate/pocket balances into user profiles
      const enrichedUsers = (profiles || []).map((user) => {
        const gate = gates.find((g) => g.gate_name === user.gate_name)
        const pocket = pockets.find((p) => p.gate === user.gate_name)
        
        return {
          ...user,
          gate_balance: gate ? parseFloat(gate.account_balance || "0") : undefined,
          pocket_balance: pocket ? parseFloat(pocket.acct_balance || "0") : undefined,
        }
      })

      setUsers(enrichedUsers)
    } catch (err) {
      console.error("Failed to fetch users:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return "—"
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount)
  }

  const filteredUsers = users.filter((user) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      user.id.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.phone_number?.toLowerCase().includes(search) ||
      user.mpesa_number?.toLowerCase().includes(search) ||
      user.gate_name?.toLowerCase().includes(search)
    )
  })

  const totalBalance = filteredUsers.reduce((sum, user) => sum + (user.wallet_balance || 0), 0)
  const totalGateBalance = filteredUsers.reduce((sum, user) => sum + (user.gate_balance || 0), 0)
  const activeUsers = filteredUsers.filter((user) => user.wallet_balance > 0).length
  const premiumUsers = filteredUsers.filter((user) => user.is_premium).length
  const usersWithGates = filteredUsers.filter((user) => user.gate_name).length

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">All Users</h1>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">Manage platform users, wallets, gates & pockets</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchUsers}
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
            { label: "Total Users", value: filteredUsers.length, icon: Users, color: "text-blue-600 dark:text-blue-400" },
            { label: "Active Users", value: activeUsers, icon: UserCheck, color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Supabase Balance", value: formatCurrency(totalBalance), icon: Wallet, color: "text-purple-600 dark:text-purple-400" },
            { label: "Gate Balance", value: formatCurrency(totalGateBalance), icon: Building2, color: "text-blue-600 dark:text-blue-400" },
            { label: "With Gates", value: usersWithGates, icon: Shield, color: "text-orange-600 dark:text-orange-400" },
            { label: "Premium", value: premiumUsers, icon: Crown, color: "text-amber-600 dark:text-amber-400" },
          ].map((stat, i) => (
            <div
              key={i}
              className={cn(
                "p-3 rounded-xl",
                "bg-white dark:bg-zinc-900/70",
                "border border-zinc-100 dark:border-zinc-800",
                "shadow-sm backdrop-blur-xl"
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn("p-1.5 rounded-lg", "bg-zinc-100 dark:bg-zinc-800")}>
                  <stat.icon className={cn("w-3.5 h-3.5", stat.color)} />
                </div>
                <div>
                  <p className={cn("text-sm font-semibold", stat.color)}>{stat.value}</p>
                  <p className="text-[10px] text-zinc-600 dark:text-zinc-400">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div
          className={cn(
            "p-4 rounded-xl",
            "bg-white dark:bg-zinc-900/70",
            "border border-zinc-100 dark:border-zinc-800",
            "shadow-sm backdrop-blur-xl"
          )}
        >
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search by email, phone, gate name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
            />
          </div>
        </div>

        {/* Users Table */}
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
              User Accounts
              <span className="text-xs font-normal text-zinc-600 dark:text-zinc-400 ml-1">
                ({filteredUsers.length} users)
              </span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400 w-10">#</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400">User</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400">Phone</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400">Gate</th>
                  <th className="px-3 py-2 text-right font-semibold text-zinc-600 dark:text-zinc-400">Supabase Bal</th>
                  <th className="px-3 py-2 text-right font-semibold text-zinc-600 dark:text-zinc-400">Gate Bal</th>
                  <th className="px-3 py-2 text-right font-semibold text-zinc-600 dark:text-zinc-400">Pocket Bal</th>
                  <th className="px-3 py-2 text-center font-semibold text-zinc-600 dark:text-zinc-400">Role</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-zinc-400" />
                      <p className="text-zinc-600 dark:text-zinc-400">Loading users...</p>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-zinc-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => (
                    <tr
                      key={user.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <td className="px-3 py-2 text-zinc-500 font-mono">{index + 1}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium",
                            "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                          )}>
                            {(user.email?.[0] || "U").toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[150px]">
                              {user.email || "No email"}
                            </p>
                            <p className="text-[10px] text-zinc-500">{user.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
                        {user.phone_number || user.mpesa_number || "—"}
                      </td>
                      <td className="px-3 py-2">
                        {user.gate_name ? (
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px]">
                            {user.gate_name}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        <span className={user.wallet_balance > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500"}>
                          {formatCurrency(user.wallet_balance)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        <span className={user.gate_balance && user.gate_balance > 0 ? "text-blue-600 dark:text-blue-400" : "text-zinc-500"}>
                          {formatCurrency(user.gate_balance)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        <span className={user.pocket_balance && user.pocket_balance > 0 ? "text-purple-600 dark:text-purple-400" : "text-zinc-500"}>
                          {formatCurrency(user.pocket_balance)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {user.role === "admin" || user.role === "creator" ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                            {user.role}
                          </span>
                        ) : user.is_premium ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                            premium
                          </span>
                        ) : (
                          <span className="text-zinc-400">user</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        {new Date(user.created_at).toLocaleDateString("en-KE", {
                          month: "short",
                          day: "numeric",
                          year: "2-digit",
                        })}
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
