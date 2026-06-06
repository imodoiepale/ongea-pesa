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
            <h1 className="text-lg font-semibold text-foreground">All Users</h1>
            <p className="text-xs text-muted-foreground">Manage platform users, wallets, gates & pockets</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchUsers}
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
                "bg-foreground",
                "text-background",
                "text-xs font-medium",
                "hover:bg-foreground/90",
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
            { label: "Active Users", value: activeUsers, icon: UserCheck, color: "text-brand" },
            { label: "Supabase Balance", value: formatCurrency(totalBalance), icon: Wallet, color: "text-purple-600 dark:text-purple-400" },
            { label: "Gate Balance", value: formatCurrency(totalGateBalance), icon: Building2, color: "text-blue-600 dark:text-blue-400" },
            { label: "With Gates", value: usersWithGates, icon: Shield, color: "text-orange-600 dark:text-orange-400" },
            { label: "Premium", value: premiumUsers, icon: Crown, color: "text-amber-600 dark:text-amber-400" },
          ].map((stat, i) => (
            <div
              key={i}
              className={cn(
                "p-3 rounded-xl",
                "bg-card",
                "border border-border/40",
                "shadow-sm backdrop-blur-xl"
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn("p-1.5 rounded-lg", "bg-muted")}>
                  <stat.icon className={cn("w-3.5 h-3.5", stat.color)} />
                </div>
                <div>
                  <p className={cn("text-sm font-semibold", stat.color)}>{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div
          className={cn(
            "p-4 rounded-xl",
            "bg-card",
            "border border-border/40",
            "shadow-sm backdrop-blur-xl"
          )}
        >
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email, phone, gate name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-muted/30 border-border/60"
            />
          </div>
        </div>

        {/* Users Table */}
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
              User Accounts
              <span className="text-xs font-normal text-muted-foreground ml-1">
                ({filteredUsers.length} users)
              </span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/30 border-b border-border/60">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-10">#</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">User</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Phone</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Gate</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Supabase Bal</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Gate Bal</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Pocket Bal</th>
                  <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Role</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground">Loading users...</p>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => (
                    <tr
                      key={user.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-3 py-2 text-muted-foreground font-mono">{index + 1}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium",
                            "bg-muted text-muted-foreground"
                          )}>
                            {(user.email?.[0] || "U").toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-foreground truncate max-w-[150px]">
                              {user.email || "No email"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{user.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-foreground">
                        {user.phone_number || user.mpesa_number || "—"}
                      </td>
                      <td className="px-3 py-2">
                        {user.gate_name ? (
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px]">
                            {user.gate_name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        <span className={user.wallet_balance > 0 ? "text-brand" : "text-muted-foreground"}>
                          {formatCurrency(user.wallet_balance)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        <span className={user.gate_balance && user.gate_balance > 0 ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}>
                          {formatCurrency(user.gate_balance)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        <span className={user.pocket_balance && user.pocket_balance > 0 ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground"}>
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
                          <span className="text-muted-foreground">user</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
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
