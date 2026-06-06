"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Mic, Send, User, UserPlus, Loader2, Search, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useContacts, formatPhoneNumber, getContactDisplayName } from "@/hooks/use-contacts"
import { ScreenShell } from "@/components/foundation"
import { cn } from "@/lib/utils"

type Screen = "dashboard" | "voice" | "send" | "camera" | "recurring" | "analytics" | "test" | "permissions" | "scanner";

interface Contact {
  id: string | null;
  name: string;
  email: string | null;
  phone: string;
  gate_name: string;
  gate_id: string;
  balance: number;
  source: 'local' | 'indexpay';
  has_account: boolean;
  avatar: string;
  is_me?: boolean;
  is_admin?: boolean;
  indexpay_gate_balance?: number;
  indexpay_pocket_balance?: number;
}

interface SendMoneyProps {
  onNavigate: (screen: Screen) => void;
}

export default function SendMoney({ onNavigate }: SendMoneyProps) {
  const [amount, setAmount] = useState("")
  const [recipient, setRecipient] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [voiceCommand, setVoiceCommand] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  // Contacts state
  const [contacts, setContacts] = useState<Contact[]>([])
  const [currentUser, setCurrentUser] = useState<Contact | null>(null)
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [contactsError, setContactsError] = useState<string | null>(null)

  // Transfer state
  const [isSending, setIsSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null)

  const { isSupported, isLoading, selectSingleContact } = useContacts()

  // Fetch contacts on mount
  useEffect(() => {
    fetchContacts()
  }, [])

  const fetchContacts = async () => {
    setLoadingContacts(true)
    setContactsError(null)
    try {
      const response = await fetch('/api/contacts')
      const data = await response.json()
      console.log('📱 Contacts API response:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch contacts')
      }

      setContacts(data.contacts || [])
      setCurrentUser(data.current_user || null)
      console.log('✅ Loaded contacts:', data.contacts?.length || 0)
      console.log('👤 Current user:', data.current_user?.name)
      if (data.debug) {
        console.log('📊 Debug info:', data.debug)
      }
    } catch (error: any) {
      console.error('❌ Error fetching contacts:', error)
      setContactsError(error.message)
    } finally {
      setLoadingContacts(false)
    }
  }

  const handleVoiceSend = () => {
    setIsVoiceMode(true)
    // Simulate voice recognition
    setTimeout(() => {
      setVoiceCommand("Tuma 500 kwa John Doe")
      setAmount("500")
      setRecipient("John Doe")
      setIsVoiceMode(false)
    }, 2000)
  }

  const handlePickContact = async () => {
    const contact = await selectSingleContact()
    if (contact) {
      setRecipient(getContactDisplayName(contact))
      if (contact.tel && contact.tel.length > 0) {
        setPhoneNumber(formatPhoneNumber(contact.tel))
      }
    }
  }

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact)
    setRecipient(contact.name)
    setPhoneNumber(contact.phone || '')
    setSearchQuery('')
  }

  const handleSendMoney = async () => {
    if (!selectedContact?.gate_name || !amount) {
      setSendResult({ success: false, message: 'Please select a recipient and enter an amount' })
      return
    }

    setIsSending(true)
    setSendResult(null)

    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_gate_name: selectedContact.gate_name,
          amount: parseFloat(amount),
          description: `Send to ${selectedContact.name}`,
        }),
      })

      const data = await response.json()
      console.log('💸 Transfer response:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Transfer failed')
      }

      setSendResult({
        success: true,
        message: data.message || `Successfully sent KES ${amount} to ${selectedContact.name}`
      })

      // Update current user's balance immediately
      if (data.new_balance !== undefined && currentUser) {
        setCurrentUser({
          ...currentUser,
          balance: data.new_balance
        })
      }

      // Refresh contacts to get updated balances
      await fetchContacts()

      // Reset form after success
      setTimeout(() => {
        setAmount('')
        setRecipient('')
        setPhoneNumber('')
        setSelectedContact(null)
        setSendResult(null)
      }, 3000)

    } catch (error: any) {
      console.error('❌ Transfer error:', error)
      setSendResult({ success: false, message: error.message })
    } finally {
      setIsSending(false)
    }
  }

  // Filter contacts based on search
  const filteredContacts = contacts.filter(contact => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      contact.name.toLowerCase().includes(query) ||
      contact.phone?.toLowerCase().includes(query) ||
      contact.gate_name?.toLowerCase().includes(query) ||
      contact.email?.toLowerCase().includes(query)
    )
  })

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
                style={{ fontVariantNumeric: 'tabular-nums' }}
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
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block px-1">
            Send To
          </label>

          {/* Contact picker button */}
          {isSupported && (
            <Button
              onClick={handlePickContact}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="w-full mb-3 border-brand/30 text-brand hover:bg-brand/5"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {isLoading ? "Opening Contacts…" : "Pick from Phone Contacts"}
            </Button>
          )}

          {/* Selected contact display */}
          {selectedContact && (
            <div className="rounded-2xl border border-brand/30 bg-brand/5 px-4 py-3 mb-3 flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm shrink-0",
                selectedContact.has_account ? "bg-brand" : "bg-amber-500"
              )}>
                {selectedContact.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{selectedContact.name}</p>
                <p className="text-xs text-muted-foreground truncate">{selectedContact.phone || selectedContact.gate_name}</p>
                {!selectedContact.has_account && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">Gate will be auto-created</p>
                )}
              </div>
              <button
                onClick={() => setSelectedContact(null)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted"
              >
                Change
              </button>
            </div>
          )}

          {/* Manual entry fields */}
          <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40 mb-3">
            <div className="px-4 py-3 flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                placeholder="Contact name"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="flex-1 text-sm text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
                aria-label="Recipient name"
              />
            </div>
            <div className="px-4 py-3 flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground shrink-0">0</span>
              <input
                placeholder="Phone number e.g. 712345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="flex-1 text-sm text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
                inputMode="tel"
                aria-label="Phone number"
              />
            </div>
          </div>

          {/* Contacts list */}
          <div className="rounded-2xl border border-border/60 bg-card">
            {/* Search */}
            <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                placeholder="Search contacts…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 text-sm text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
                aria-label="Search contacts"
              />
              <span className="text-xs text-muted-foreground">{contacts.length}</span>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-border/30">
              {/* Loading */}
              {loadingContacts && (
                <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading contacts…</span>
                </div>
              )}

              {/* Error */}
              {contactsError && !loadingContacts && (
                <div className="flex flex-col items-center gap-2 py-6">
                  <p className="text-sm text-destructive">{contactsError}</p>
                  <Button variant="outline" size="sm" onClick={fetchContacts}>Retry</Button>
                </div>
              )}

              {/* Current user (me) */}
              {currentUser && !loadingContacts && (
                <div className="flex items-center gap-3 px-4 py-3 opacity-60 cursor-not-allowed">
                  <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                    {currentUser.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-foreground truncate">{currentUser.name}</p>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">You</span>
                    </div>
                    <p className="text-xs text-muted-foreground">KSh {currentUser.balance.toLocaleString('en-KE')}</p>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!loadingContacts && !contactsError && filteredContacts.length === 0 && !currentUser && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {searchQuery ? 'No contacts found' : 'No contacts available'}
                </p>
              )}

              {/* Contact list */}
              {!loadingContacts && !contactsError && filteredContacts.map((contact, index) => (
                <button
                  key={contact.gate_name || index}
                  onClick={() => handleSelectContact(contact)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150 active:scale-[0.99]",
                    selectedContact?.gate_name === contact.gate_name
                      ? "bg-brand/[0.08] border-l-2 border-brand"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center text-white font-semibold text-sm shrink-0",
                    contact.has_account ? "bg-brand" : "bg-amber-500"
                  )}>
                    {contact.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-foreground truncate">{contact.name}</p>
                      {contact.has_account ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand/10 text-brand">Verified</span>
                      ) : (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Unclaimed</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{contact.phone || contact.gate_name}</p>
                  </div>
                  {contact.has_account && contact.balance > 0 && (
                    <span className="text-xs font-medium text-brand shrink-0">
                      KSh {contact.balance.toLocaleString('en-KE', { maximumFractionDigits: 0 })}
                    </span>
                  )}
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

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-6 pt-3 bg-gradient-to-t from-background via-background to-transparent">
        <Button
          className="w-full h-12 rounded-2xl text-sm font-semibold"
          disabled={!amount || !selectedContact || isSending}
          onClick={handleSendMoney}
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
              {amount && selectedContact
                ? `Send KSh ${Number(amount).toLocaleString('en-KE')} to ${selectedContact.name}`
                : "Send Money"
              }
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
