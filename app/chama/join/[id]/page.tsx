"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Users, Gift, PiggyBank, HandCoins, Check, Wallet, Calendar,
  Phone, User, Mail, ArrowRight, RefreshCw, AlertCircle, CheckCircle,
  Shield, X, Loader2,
} from "lucide-react"
import Link from "next/link"

interface Chama {
  id: string
  name: string
  description: string
  chama_type: string
  contribution_amount: number
  currency: string
  collection_frequency: string
  status: string
  creator_id: string
  members?: { id: string; name: string }[]
  creator?: { email: string; gate_name: string }
}

export default function JoinChamaPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const chamaId = params.id as string

  const [user, setUser] = useState<any>(null)
  const [chama, setChama] = useState<Chama | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [funding, setFunding] = useState(false)
  const [step, setStep] = useState<"info" | "pledge" | "fund" | "success">("info")
  const [error, setError] = useState("")
  const [alreadyMember, setAlreadyMember] = useState(false)

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    pledge_amount: "",
  })

  useEffect(() => {
    checkAuthAndFetchChama()
  }, [chamaId])

  const checkAuthAndFetchChama = async () => {
    setLoading(true)
    try {
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      // Pre-fill form if user is logged in
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, phone_number, mpesa_number, gate_name")
          .eq("id", user.id)
          .single()

        if (profile) {
          setForm(f => ({
            ...f,
            name: profile.gate_name || profile.email?.split("@")[0] || "",
            phone: profile.phone_number || profile.mpesa_number || "",
            email: profile.email || "",
          }))
        }
      }

      // Fetch chama details
      const { data: chamaData, error: chamaError } = await supabase
        .from("chamas")
        .select(`
          *,
          members:chama_members(id, name, user_id, phone_number),
          creator:profiles!chamas_creator_id_fkey(email, gate_name)
        `)
        .eq("id", chamaId)
        .single()

      if (chamaError || !chamaData) {
        setError("Chama not found or link is invalid")
        setLoading(false)
        return
      }

      setChama(chamaData)

      // Check if user is already a member
      if (user) {
        const isMember = chamaData.members?.some((m: any) => m.user_id === user.id)
        setAlreadyMember(!!isMember)
      }
    } catch (err) {
      console.error("Error:", err)
      setError("Failed to load chama details")
    } finally {
      setLoading(false)
    }
  }

  const joinChama = async () => {
    if (!form.name || !form.phone) {
      setError("Name and phone are required")
      return
    }

    setJoining(true)
    setError("")

    try {
      const response = await fetch("/api/chama/add-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chama_id: chamaId,
          name: form.name,
          phone: form.phone,
          email: form.email,
          pledge_amount: form.pledge_amount ? Math.ceil(parseFloat(form.pledge_amount)) : undefined,
        }),
      })

      const result = await response.json()

      if (result.success) {
        if (chama?.chama_type === "fundraising" && form.pledge_amount) {
          setStep("fund")
        } else {
          setStep("success")
        }
      } else {
        setError(result.error || "Failed to join chama")
      }
    } catch (err) {
      console.error("Error joining:", err)
      setError("Something went wrong. Please try again.")
    } finally {
      setJoining(false)
    }
  }

  const fundPledge = async () => {
    if (!form.pledge_amount) return

    setFunding(true)
    setError("")

    try {
      // Trigger STK push for the pledge amount
      const response = await fetch("/api/mpesa/stk-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: form.phone,
          amount: Math.ceil(parseFloat(form.pledge_amount)),
          reference: `CHAMA-${chamaId.slice(0, 8)}`,
          description: `Pledge for ${chama?.name}`,
        }),
      })

      const result = await response.json()

      if (result.success || result.CheckoutRequestID) {
        setStep("success")
      } else {
        setError(result.error || "Payment initiation failed")
      }
    } catch (err) {
      console.error("Error funding:", err)
      setError("Payment failed. You can fund later from the app.")
      setStep("success")
    } finally {
      setFunding(false)
    }
  }

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(amount)

  const getChamaTypeIcon = (type: string) => {
    if (type === "fundraising") return Gift
    if (type === "collection") return HandCoins
    return PiggyBank
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (error && !chama) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">Invalid Invite Link</h1>
          <p className="text-zinc-500 mb-6">{error}</p>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold">
            Go to Home
          </Link>
        </div>
      </div>
    )
  }

  if (!chama) return null

  const TypeIcon = getChamaTypeIcon(chama.chama_type || "savings")

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-blue-950">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Join Chama</h1>
              <p className="text-[10px] text-zinc-500 -mt-0.5">Ongea Pesa</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8">
        {/* Chama Info Card */}
        <div className={cn(
          "p-6 rounded-3xl mb-6",
          "bg-white dark:bg-zinc-800/50",
          "border border-zinc-100 dark:border-zinc-700/50",
          "shadow-xl"
        )}>
          <div className="flex items-center gap-4 mb-6">
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg",
              chama.chama_type === "fundraising" ? "bg-gradient-to-br from-purple-500 to-purple-600" :
              chama.chama_type === "collection" ? "bg-gradient-to-br from-blue-500 to-blue-600" :
              "bg-gradient-to-br from-emerald-500 to-emerald-600"
            )}>
              <TypeIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{chama.name}</h2>
              <p className="text-sm text-zinc-500 capitalize">{chama.chama_type || "savings"} group</p>
            </div>
          </div>

          {chama.description && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 p-4 bg-zinc-50 dark:bg-zinc-700/30 rounded-xl">
              {chama.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-700/30 rounded-xl text-center">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                {chama.chama_type === "fundraising" ? "Pledge your amount" : "Contribution"}
              </p>
              <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {chama.chama_type === "fundraising" ? "Flexible" : formatCurrency(chama.contribution_amount)}
              </p>
            </div>
            <div className="p-4 bg-zinc-50 dark:bg-zinc-700/30 rounded-xl text-center">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Frequency</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 capitalize">{chama.collection_frequency}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Users className="w-4 h-4" />
            <span>{chama.members?.length || 0} members</span>
            <span className="mx-2">•</span>
            <span>Created by {chama.creator?.gate_name || chama.creator?.email || "Admin"}</span>
          </div>
        </div>

        {/* Already Member */}
        {alreadyMember && (
          <div className={cn(
            "p-6 rounded-2xl mb-6",
            "bg-emerald-50 dark:bg-emerald-900/20",
            "border border-emerald-200 dark:border-emerald-800"
          )}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center">
                <Check className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-emerald-800 dark:text-emerald-200">You're already a member!</h3>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">You can access this chama from your dashboard</p>
              </div>
            </div>
            <Link href="/chama" className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl font-semibold">
              Go to My Chamas <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        )}

        {/* Join Form */}
        {!alreadyMember && step === "info" && (
          <div className={cn(
            "p-6 rounded-2xl",
            "bg-white dark:bg-zinc-800/50",
            "border border-zinc-100 dark:border-zinc-700/50",
            "shadow-lg"
          )}>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-6">Join this Chama</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">Your Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <Input
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="John Doe"
                    className="pl-12 h-12"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">M-Pesa Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="0712345678"
                    className="pl-12 h-12"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">Email (optional)</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="john@example.com"
                    className="pl-12 h-12"
                  />
                </div>
              </div>

              {chama.chama_type === "fundraising" && (
                <div>
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">Your Pledge Amount (KES)</label>
                  <div className="relative">
                    <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <Input
                      type="number"
                      value={form.pledge_amount}
                      onChange={(e) => setForm(f => ({ ...f, pledge_amount: e.target.value }))}
                      placeholder="10000"
                      className="pl-12 h-12"
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">This is the amount you commit to contribute</p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <button
                onClick={joinChama}
                disabled={joining || !form.name || !form.phone}
                className={cn(
                  "w-full py-4 rounded-xl font-semibold text-lg",
                  "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700",
                  "text-white shadow-lg shadow-blue-500/30",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex items-center justify-center gap-2"
                )}
              >
                {joining ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Joining...</>
                ) : (
                  <>Join Chama <ArrowRight className="w-5 h-5" /></>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Fund Pledge */}
        {step === "fund" && (
          <div className={cn(
            "p-6 rounded-2xl",
            "bg-white dark:bg-zinc-800/50",
            "border border-zinc-100 dark:border-zinc-700/50",
            "shadow-lg"
          )}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 mb-2">You're In! 🎉</h3>
              <p className="text-zinc-500">Would you like to fund your pledge now?</p>
            </div>

            <div className="p-4 bg-purple-50 rounded-xl mb-6">
              <div className="text-center">
                <p className="text-sm text-purple-600 mb-1">Your Pledge</p>
                <p className="text-3xl font-bold text-purple-700">{formatCurrency(parseFloat(form.pledge_amount || "0"))}</p>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-600 mb-4">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={fundPledge}
                disabled={funding}
                className={cn(
                  "w-full py-4 rounded-xl font-semibold",
                  "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700",
                  "text-white shadow-lg shadow-emerald-500/30",
                  "disabled:opacity-50",
                  "flex items-center justify-center gap-2"
                )}
              >
                {funding ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                ) : (
                  <><Wallet className="w-5 h-5" /> Pay Now via M-Pesa</>
                )}
              </button>

              <button
                onClick={() => setStep("success")}
                className="w-full py-3 text-zinc-600 hover:bg-zinc-100 rounded-xl font-medium"
              >
                Fund Later
              </button>
            </div>
          </div>
        )}

        {/* Success */}
        {step === "success" && (
          <div className={cn(
            "p-8 rounded-2xl text-center",
            "bg-white dark:bg-zinc-800/50",
            "border border-zinc-100 dark:border-zinc-700/50",
            "shadow-lg"
          )}>
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Welcome to {chama.name}!</h3>
            <p className="text-zinc-500 mb-8">You've successfully joined the chama. You'll receive notifications for upcoming collections.</p>

            <div className="space-y-3">
              {user ? (
                <Link href="/chama" className="block w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold">
                  Go to My Chamas
                </Link>
              ) : (
                <>
                  <Link href="/login" className="block w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold">
                    Create Account to Manage
                  </Link>
                  <p className="text-xs text-zinc-500">Create an account to view and manage your chama membership</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Security Note */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-zinc-500">
          <Shield className="w-4 h-4" />
          <span>Secured by Ongea Pesa</span>
        </div>
      </main>
    </div>
  )
}
