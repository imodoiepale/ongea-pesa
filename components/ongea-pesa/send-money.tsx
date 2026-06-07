"use client"

import { useState, useRef, useEffect } from "react"
import { ArrowLeft, Mic, Send, User, Smartphone, Loader2, Search, CheckCircle, AlertCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScreenShell } from "@/components/foundation"
import { cn } from "@/lib/utils"
import { useContactSearch } from "@/hooks/use-contact-search"
import type { SearchableContact } from "@/hooks/use-contact-search"
import ContactImport from "@/components/ongea-pesa/contact-import"
import { StepUpModal } from "@/components/ongea-pesa/step-up-modal"
import { useStepUp } from "@/hooks/useStepUp"

type Screen = "dashboard" | "voice" | "send" | "recurring" | "analytics" | "test" | "permissions" | "scanner";

interface SendMoneyProps {
  onNavigate: (screen: Screen) => void;
}

export default function SendMoney({ onNavigate }: SendMoneyProps) {
  const [amount, setAmount] = useState("")
  const [selectedContact, setSelectedContact] = useState<SearchableContact | null>(null)
  const [phoneNumber, setPhoneNumber] = useState("")    // for manual entry (displayed WITHOUT leading 0)
  const [recipientName, setRecipientName] = useState("") // for manual / personal-contact entry
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [voiceCommand, setVoiceCommand] = useState("")

  const [isSending, setIsSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null)

  const [showImport, setShowImport] = useState(false)

  const { isOpen: stepUpOpen, openStepUp, closeStepUp, resolvedToken: stepUpToken, onTokenResolved, onError: onStepUpError } = useStepUp()

  const {
    results,
    query,
    setQuery,
    loading,
    currentUser,
    importing,
    importMsg,
    setImportMsg,
    importFromDevice,
    importFromFile,
    isPickerSupported,
  } = useContactSearch()

  // ── Voice (simulation — real voice is in ElevenLabs widget) ─────────────
  const handleVoiceSend = () => {
    setIsVoiceMode(true)
    setTimeout(() => {
      setVoiceCommand("Tuma 500 kwa John Doe")
      setAmount("500")
      setRecipientName("John Doe")
      setIsVoiceMode(false)
    }, 2000)
  }

  // ── Contact selection from fuzzy list ─────────────────────────────────────
  const handleSelectContact = (contact: SearchableContact) => {
    setSelectedContact(contact)
    setQuery("")

    if (contact.source === "personal") {
      // Phone-only contact — set phone for external M-Pesa send
      setPhoneNumber(contact.phone.replace(/^0/, "")) // strip leading 0 for field + prefix span
      setRecipientName(contact.display_name)
    } else {
      // App contact (has gate_name) — internal wallet transfer
      setPhoneNumber(contact.phone.replace(/^0/, ""))
      setRecipientName(contact.display_name)
    }
  }

  const handleClearContact = () => {
    setSelectedContact(null)
    setPhoneNumber("")
    setRecipientName("")
  }

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSendMoney = async (token?: string) => {
    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      setSendResult({ success: false, message: "Please enter a valid amount" })
      return
    }

    // Determine send path
    const useInternalTransfer = selectedContact?.source === "app" && selectedContact.has_account && selectedContact.gate_name

    if (!useInternalTransfer && !phoneNumber && !selectedContact) {
      setSendResult({ success: false, message: "Please select a recipient or enter a phone number" })
      return
    }

    // External sends require step-up; internal transfers (gate-to-gate) do not.
    if (!useInternalTransfer && !token) {
      openStepUp()
      return
    }

    setIsSending(true)
    setSendResult(null)

    try {
      if (useInternalTransfer) {
        // ── Internal gate-to-gate transfer ────────────────────────────────
        const response = await fetch("/api/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient_gate_name: selectedContact.gate_name,
            amount: parsedAmount,
            description: `Send to ${selectedContact.display_name}`,
          }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Transfer failed")
        setSendResult({ success: true, message: data.message || `Sent KSh ${parsedAmount} to ${selectedContact.display_name}` })

      } else {
        // ── External M-Pesa send (phone number) ───────────────────────────
        const fullPhone = phoneNumber.startsWith("0") ? phoneNumber : "0" + phoneNumber
        const name = recipientName || selectedContact?.display_name || fullPhone

        const response = await fetch("/api/wallet/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: parsedAmount,
            destination: {
              kind: "phone",
              phone: fullPhone,
              recipientName: name || undefined,
            },
            narration: `Send to ${name}`,
            stepup_token: token,
          }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || data.message || "Payment failed")
        setSendResult({ success: true, message: data.message || `Sent KSh ${parsedAmount} to ${fullPhone}` })
      }

      // Reset after success
      setTimeout(() => {
        setAmount("")
        setSelectedContact(null)
        setPhoneNumber("")
        setRecipientName("")
        setSendResult(null)
      }, 3000)

    } catch (error: any) {
      setSendResult({ success: false, message: error.message })
    } finally {
      setIsSending(false)
    }
  }

  // Re-trigger payment once step-up token is resolved
  useEffect(() => {
    if (stepUpToken) {
      handleSendMoney(stepUpToken)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepUpToken])

  const canSend = !!amount && parseFloat(amount) > 0 && (!!selectedContact || !!phoneNumber)

  return (
    <div className="min-h-[100dvh] bg-background surface-money pb-32">
      <ScreenShell className="pt-0">

        {/* Header */}
        <div className="flex items-center gap-3 pt-6 mb-6">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onNavigate("dashboard")}
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Send Money</h1>
            <p className="text-sm text-muted-foreground">Voice or manual entry</p>
          </div>
        </div>

        {/* Voice Command */}
        <div className="rounded-2xl border border-border/60 bg-card px-4 py-3 mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Voice Command</p>
            <p className="text-xs text-muted-foreground">Say: "Tuma [amount] kwa [name/number]"</p>
            {voiceCommand && (
              <p className="text-xs text-brand mt-1.5 font-medium">Heard: "{voiceCommand}"</p>
            )}
          </div>
          <button
            onClick={handleVoiceSend}
            disabled={isVoiceMode}
            aria-label="Activate voice send"
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 active:scale-[0.97]",
              isVoiceMode
                ? "bg-red-500/15 text-red-500 animate-pulse cursor-wait"
                : "bg-brand/10 text-brand hover:bg-brand/15"
            )}
          >
            <Mic className="h-4 w-4" />
          </button>
        </div>

        {/* Amount Input */}
        <div className="mb-5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block px-1">
            Amount
          </label>
          <div className="rounded-2xl border border-border/60 bg-card px-4 py-3">
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-base font-medium text-muted-foreground">KSh</span>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 text-3xl font-bold tracking-tighter text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/30"
                style={{ fontVariantNumeric: "tabular-nums" }}
                inputMode="decimal"
                aria-label="Amount in KSh"
              />
            </div>
            {/* Quick presets */}
            <div className="flex gap-2">
              {["100", "500", "1000", "2000"].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setAmount(preset)}
                  className={cn(
                    "flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all duration-150 active:scale-[0.97]",
                    amount === preset
                      ? "bg-brand text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recipient Section */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2 px-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Send To
            </label>
            <button
              onClick={() => setShowImport(v => !v)}
              className="text-xs text-brand hover:text-brand/80 transition-colors flex items-center gap-1"
            >
              <Smartphone className="h-3 w-3" />
              {showImport ? "Hide import" : "Import contacts"}
            </button>
          </div>

          {/* Contact import widget (collapsible) */}
          {showImport && (
            <ContactImport
              isPickerSupported={isPickerSupported}
              importing={importing}
              importMsg={importMsg}
              onImportFromDevice={importFromDevice}
              onImportFromFile={importFromFile}
              onDismissMsg={() => setImportMsg(null)}
              className="mb-3"
            />
          )}

          {/* Selected contact chip */}
          {selectedContact && (
            <div className="rounded-2xl border border-brand/30 bg-brand/5 px-4 py-3 mb-3 flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm shrink-0",
                selectedContact.has_account ? "bg-brand" : "bg-amber-500"
              )}>
                {selectedContact.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{selectedContact.display_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {selectedContact.phone || selectedContact.gate_name}
                </p>
                <p className="text-xs mt-0.5">
                  {selectedContact.source === "personal"
                    ? <span className="text-amber-600 dark:text-amber-400">M-Pesa send</span>
                    : selectedContact.has_account
                      ? <span className="text-brand">Ongea Pesa wallet</span>
                      : <span className="text-amber-600 dark:text-amber-400">Gate auto-created</span>
                  }
                </p>
              </div>
              <button
                onClick={handleClearContact}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                aria-label="Clear selection"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Manual entry fields */}
          <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40 mb-3">
            <div className="px-4 py-3 flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                placeholder="Contact name (optional)"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="flex-1 text-sm text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
                aria-label="Recipient name"
              />
            </div>
            <div className="px-4 py-3 flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground shrink-0">0</span>
              <input
                placeholder="Phone number e.g. 712345678"
                value={phoneNumber}
                onChange={(e) => { setPhoneNumber(e.target.value); setSelectedContact(null) }}
                className="flex-1 text-sm text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
                inputMode="tel"
                aria-label="Phone number"
              />
            </div>
          </div>

          {/* Unified fuzzy-search contacts list */}
          <div className="rounded-2xl border border-border/60 bg-card">
            {/* Search bar */}
            <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                placeholder="Search by name or number…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 text-sm text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
                aria-label="Search contacts"
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-border/30">
              {/* Loading */}
              {loading && (
                <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading contacts…</span>
                </div>
              )}

              {/* Current user (Me — not selectable) */}
              {currentUser && !loading && (
                <div className="flex items-center gap-3 px-4 py-3 opacity-60 cursor-not-allowed">
                  <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                    {currentUser.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-foreground truncate">{currentUser.name}</p>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">You</span>
                    </div>
                    <p className="text-xs text-muted-foreground">KSh {currentUser.balance.toLocaleString("en-KE")}</p>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!loading && results.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {query ? "No contacts found — try a different name or number" : "No contacts yet — import from your phone above"}
                </p>
              )}

              {/* Contact rows */}
              {!loading && results.map((contact, idx) => (
                <button
                  key={contact.id ?? `${contact.source}-${idx}`}
                  onClick={() => handleSelectContact(contact)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150 active:scale-[0.99]",
                    selectedContact?.normalized_phone === contact.normalized_phone && selectedContact?.source === contact.source
                      ? "bg-brand/[0.08] border-l-2 border-brand"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center text-white font-semibold text-sm shrink-0",
                    contact.source === "app" && contact.has_account ? "bg-brand" : "bg-amber-500"
                  )}>
                    {contact.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-foreground truncate">{contact.display_name}</p>
                      {contact.source === "app" && contact.has_account ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand/10 text-brand shrink-0">Verified</span>
                      ) : contact.source === "personal" ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">Phone</span>
                      ) : (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">Unclaimed</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{contact.phone || contact.gate_name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Send result notification */}
        {sendResult && (
          <div className={cn(
            "rounded-2xl px-4 py-3 mb-5 flex items-center gap-3",
            sendResult.success
              ? "bg-brand/[0.08] border border-brand/20"
              : "bg-destructive/[0.08] border border-destructive/20"
          )}>
            {sendResult.success
              ? <CheckCircle className="h-4 w-4 text-brand shrink-0" />
              : <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            }
            <p className={cn(
              "text-sm",
              sendResult.success ? "text-brand" : "text-destructive"
            )}>{sendResult.message}</p>
          </div>
        )}

      </ScreenShell>

      {/* Step-up identity modal */}
      <StepUpModal
        isOpen={stepUpOpen}
        onClose={closeStepUp}
        onResolved={onTokenResolved}
        title="Confirm Payment"
        description="Verify your identity to send money"
      />

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-6 pt-3 bg-gradient-to-t from-background via-background to-transparent">
        <Button
          className="w-full h-12 rounded-2xl text-sm font-semibold"
          disabled={!canSend || isSending}
          onClick={() => handleSendMoney()}
          aria-live="polite"
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              {canSend
                ? `Send KSh ${Number(amount).toLocaleString("en-KE")} to ${selectedContact?.display_name || recipientName || "0" + phoneNumber}`
                : "Send Money"
              }
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
