"use client"

import { useState, useEffect } from "react"
import {
  X,
  Plus,
  Users,
  Loader2,
  Trash2,
  ChevronRight,
  CheckCircle,
  XCircle,
  ArrowLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Dependant {
  id: string
  user_id: string
  display_name: string
  phone: string
  normalized_phone: string
  relationship: string | null
  total_contributed: number
  created_at: string
}

interface DependantsSheetProps {
  isOpen: boolean
  onClose: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000]

const RELATIONSHIP_OPTIONS = [
  "Parent",
  "Sibling",
  "Spouse",
  "Child",
  "Friend",
  "Colleague",
  "Other",
]

type ViewState = "list" | "add" | "topup"

// ─── Component ────────────────────────────────────────────────────────────────

export default function DependantsSheet({ isOpen, onClose }: DependantsSheetProps) {
  const { user } = useAuth()
  const supabase = createClient()

  // Navigation
  const [view, setView] = useState<ViewState>("list")
  const [selectedDependant, setSelectedDependant] = useState<Dependant | null>(null)

  // List state
  const [dependants, setDependants] = useState<Dependant[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Add form state
  const [formName, setFormName] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [formRelationship, setFormRelationship] = useState("")
  const [formError, setFormError] = useState("")
  const [formSaving, setFormSaving] = useState(false)

  // Top-up state
  const [topupAmount, setTopupAmount] = useState("")
  const [topupStatus, setTopupStatus] = useState<
    "idle" | "sending" | "waiting" | "completed" | "failed"
  >("idle")
  const [topupMessage, setTopupMessage] = useState("")
  const [lastTopupAmount, setLastTopupAmount] = useState(0)

  // ── Data fetching ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchDependants()
    }
    // Reset to list when sheet opens
    if (isOpen) {
      setView("list")
      setSelectedDependant(null)
    }
  }, [isOpen, user?.id])

  const fetchDependants = async () => {
    setLoadingList(true)
    try {
      const res = await fetch("/api/dependants")
      const data = await res.json()
      if (data.success) {
        setDependants(data.dependants ?? [])
      }
    } catch {
      // silent
    } finally {
      setLoadingList(false)
    }
  }

  // ── Add dependant ──────────────────────────────────────────────────────────

  const resetAddForm = () => {
    setFormName("")
    setFormPhone("")
    setFormRelationship("")
    setFormError("")
  }

  const handleAddDependant = async () => {
    setFormError("")

    if (!formName.trim()) {
      setFormError("Name is required.")
      return
    }
    if (!formPhone.trim()) {
      setFormError("Phone number is required.")
      return
    }

    setFormSaving(true)
    try {
      const res = await fetch("/api/dependants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: formName.trim(),
          phone: formPhone.trim(),
          relationship: formRelationship.trim() || undefined,
        }),
      })
      const data = await res.json()

      if (res.status === 409) {
        setFormError(data.error || "This phone number is already saved.")
        return
      }
      if (!res.ok) {
        setFormError(data.error || "Failed to add dependant.")
        return
      }

      // Success
      await fetchDependants()
      resetAddForm()
      setView("list")
    } catch {
      setFormError("An unexpected error occurred.")
    } finally {
      setFormSaving(false)
    }
  }

  // ── Delete dependant ───────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch("/api/dependants", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setDependants((prev) => prev.filter((d) => d.id !== id))
      }
    } finally {
      setDeletingId(null)
    }
  }

  // ── Top-up ─────────────────────────────────────────────────────────────────

  const handleRequestTopup = async () => {
    if (!selectedDependant) return
    const amount = parseFloat(topupAmount)
    if (!amount || amount <= 0) return

    setLastTopupAmount(amount)
    setTopupStatus("sending")
    setTopupMessage("")

    try {
      const res = await fetch("/api/dependants/request-topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dependant_id: selectedDependant.id, amount }),
      })
      const data = await res.json()

      if (res.status === 503 && data.stub) {
        setTopupStatus("failed")
        setTopupMessage("Daraja STK rail not yet active. Please try again later.")
        return
      }

      if (!res.ok || !data.success) {
        setTopupStatus("failed")
        setTopupMessage(data.error || "Failed to initiate top-up.")
        return
      }

      setTopupStatus("waiting")
      setTopupMessage(data.message || `Ask ${selectedDependant.display_name} to enter their M-Pesa PIN.`)

      // After confirming via polling or user acknowledgement, record contribution
      // For now we record optimistically after "waiting" state since
      // the DB trigger will handle the actual balance credit.
      // A real implementation would poll the transaction and call PATCH on completion.
    } catch {
      setTopupStatus("failed")
      setTopupMessage("An unexpected error occurred.")
    }
  }

  const handleTopupDone = async () => {
    // If it reached "waiting" state, record the contribution optimistically
    if (topupStatus === "waiting" && selectedDependant && lastTopupAmount > 0) {
      try {
        await fetch("/api/dependants", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedDependant.id,
            increment_contribution: lastTopupAmount,
          }),
        })
        await fetchDependants()
      } catch {
        // silent — the DB trigger will have updated the balance anyway
      }
    }
    setTopupStatus("idle")
    setTopupAmount("")
    setTopupMessage("")
    setLastTopupAmount(0)
    setView("list")
    setSelectedDependant(null)
  }

  // ── Early return ───────────────────────────────────────────────────────────

  if (!isOpen) return null

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="fixed inset-x-0 bottom-0 bg-background border-t border-border/60 rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2">
            {view !== "list" && (
              <button
                onClick={() => {
                  if (view === "topup") {
                    setTopupStatus("idle")
                    setTopupAmount("")
                    setTopupMessage("")
                  } else {
                    resetAddForm()
                  }
                  setView("list")
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted active:scale-[0.97] transition-all"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {view === "list"
                  ? "Family & Friends Top-up"
                  : view === "add"
                  ? "Add Dependant"
                  : `Top-up via ${selectedDependant?.display_name}`}
              </h2>
              {view === "list" && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Request M-Pesa from a trusted contact
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {view === "list" && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  resetAddForm()
                  setView("add")
                }}
                aria-label="Add dependant"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ── Scrollable Body ────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* ─ LIST VIEW ─────────────────────────────────────────────────────── */}
          {view === "list" && (
            <div className="px-5 py-4 pb-10">
              {loadingList ? (
                <div className="flex items-center justify-center gap-2 py-14 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Loading…</span>
                </div>
              ) : dependants.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                    <Users className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No dependants yet</p>
                  <p className="text-xs text-muted-foreground max-w-[220px]">
                    Add a parent, sibling, or friend who can top up your wallet via M-Pesa.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1"
                    onClick={() => {
                      resetAddForm()
                      setView("add")
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add first dependant
                  </Button>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40">
                  {dependants.map((dep) => (
                    <div key={dep.id} className="flex items-center gap-3 px-4 py-3">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-brand">
                          {dep.display_name.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {dep.display_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {dep.phone}
                          {dep.relationship ? ` · ${dep.relationship}` : ""}
                        </p>
                        {dep.total_contributed > 0 && (
                          <p className="text-[10px] text-brand font-semibold mt-0.5">
                            Contributed KSh{" "}
                            {dep.total_contributed.toLocaleString("en-KE", {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          className="h-auto px-3 py-1.5 text-xs font-semibold rounded-xl"
                          onClick={() => {
                            setSelectedDependant(dep)
                            setTopupAmount("")
                            setTopupStatus("idle")
                            setTopupMessage("")
                            setView("topup")
                          }}
                        >
                          Send STK
                          <ChevronRight className="h-3 w-3 -mr-0.5" />
                        </Button>
                        <button
                          onClick={() => handleDelete(dep.id)}
                          disabled={deletingId === dep.id}
                          className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-[0.97] transition-all disabled:opacity-50"
                          aria-label={`Remove ${dep.display_name}`}
                        >
                          {deletingId === dep.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─ ADD FORM ──────────────────────────────────────────────────────── */}
          {view === "add" && (
            <div className="px-5 py-4 pb-10 space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Display Name
                </p>
                <div className="rounded-xl border border-border/60 bg-card px-3 py-2 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Mama, John Kamau"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="flex-1 text-sm font-semibold text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/40"
                    autoFocus
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  M-Pesa Phone Number
                </p>
                <div className="rounded-xl border border-border/60 bg-card px-3 py-2 flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">+254</span>
                  <input
                    type="tel"
                    placeholder="07XXXXXXXX or 254XXXXXXXXX"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    inputMode="tel"
                    className="flex-1 text-sm font-semibold text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/40"
                  />
                </div>
              </div>

              {/* Relationship */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Relationship <span className="normal-case font-normal">(optional)</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {RELATIONSHIP_OPTIONS.map((rel) => (
                    <button
                      key={rel}
                      onClick={() =>
                        setFormRelationship(formRelationship === rel ? "" : rel)
                      }
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 active:scale-[0.97]",
                        formRelationship === rel
                          ? "bg-brand text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/70"
                      )}
                    >
                      {rel}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {formError && (
                <div className="rounded-xl bg-destructive/8 border border-destructive/20 px-3 py-2.5 flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                  <span className="text-sm text-destructive">{formError}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    resetAddForm()
                    setView("list")
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAddDependant}
                  disabled={formSaving || !formName.trim() || !formPhone.trim()}
                >
                  {formSaving ? (
                    <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving…</>
                  ) : (
                    "Save Dependant"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ─ TOP-UP FLOW ───────────────────────────────────────────────────── */}
          {view === "topup" && selectedDependant && (
            <div className="px-5 py-4 pb-10 space-y-4">
              {/* Dependant info */}
              <div className="rounded-2xl border border-border/60 bg-card px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                  <span className="text-base font-bold text-brand">
                    {selectedDependant.display_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {selectedDependant.display_name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {selectedDependant.phone}
                    {selectedDependant.relationship
                      ? ` · ${selectedDependant.relationship}`
                      : ""}
                  </p>
                </div>
              </div>

              {/* Quick amounts */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Amount
                </p>
                <div className="grid grid-cols-5 gap-1.5">
                  {QUICK_AMOUNTS.map((a) => (
                    <button
                      key={a}
                      onClick={() => setTopupAmount(a.toString())}
                      disabled={topupStatus !== "idle"}
                      className={cn(
                        "py-1.5 text-xs font-semibold rounded-xl transition-all duration-150 active:scale-[0.97] disabled:opacity-50",
                        topupAmount === a.toString()
                          ? "bg-brand text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/70"
                      )}
                    >
                      {a >= 1000 ? `${a / 1000}K` : a}
                    </button>
                  ))}
                </div>
                <div className="rounded-xl border border-border/60 bg-card px-3 py-2 flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">KSh</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    disabled={topupStatus !== "idle"}
                    inputMode="decimal"
                    min="1"
                    className="flex-1 text-sm font-semibold text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/40 disabled:opacity-50"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  />
                </div>
              </div>

              {/* Status banners */}
              {topupStatus === "sending" && (
                <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 px-3 py-2.5 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-blue-500 animate-spin shrink-0" />
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    Sending STK push…
                  </span>
                </div>
              )}
              {topupStatus === "waiting" && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2.5 space-y-1">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 text-amber-500 animate-spin shrink-0" />
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      Waiting for PIN confirmation
                    </span>
                  </div>
                  {topupMessage && (
                    <p className="text-xs text-amber-600/80 dark:text-amber-400/80 pl-6">
                      {topupMessage}
                    </p>
                  )}
                </div>
              )}
              {topupStatus === "completed" && (
                <div className="rounded-xl bg-brand/8 border border-brand/20 px-3 py-2.5 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-brand shrink-0" />
                  <span className="text-sm font-medium text-brand">
                    KSh {lastTopupAmount.toLocaleString()} received! Balance updated.
                  </span>
                </div>
              )}
              {topupStatus === "failed" && (
                <div className="rounded-xl bg-destructive/8 border border-destructive/20 px-3 py-2.5 flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                  <span className="text-sm font-medium text-destructive">
                    {topupMessage || "Top-up failed. Please try again."}
                  </span>
                </div>
              )}

              {/* CTA */}
              {(topupStatus === "idle" || topupStatus === "failed") && (
                <Button
                  className="w-full"
                  onClick={handleRequestTopup}
                  disabled={!topupAmount || parseFloat(topupAmount) <= 0}
                >
                  Request KSh{" "}
                  {topupAmount && parseFloat(topupAmount) > 0
                    ? parseFloat(topupAmount).toLocaleString("en-KE")
                    : "…"}{" "}
                  from {selectedDependant.display_name}
                </Button>
              )}

              {(topupStatus === "waiting" || topupStatus === "completed") && (
                <Button variant="outline" className="w-full" onClick={handleTopupDone}>
                  {topupStatus === "completed" ? "Done" : "Close — I'll wait for confirmation"}
                </Button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
