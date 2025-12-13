"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Mic, Send, User, DollarSign, UserPlus, Loader2, Search, Wallet, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useContacts, formatPhoneNumber, getContactDisplayName } from "@/hooks/use-contacts"
import { Badge } from "@/components/ui/badge"

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
    <div className="min-h-screen p-4 pb-20">
      {/* Header */}
      <div className="flex items-center mb-6 pt-8">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("dashboard")} className="mr-3">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Send Money</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Voice or manual entry</p>
        </div>
      </div>

      {/* Voice Command Card */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Voice Command</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Say: "Tuma [amount] kwa [name/number]"</p>
            </div>
            <Button
              onClick={handleVoiceSend}
              disabled={isVoiceMode}
              className={`rounded-full ${isVoiceMode ? "bg-red-500 animate-pulse" : "bg-green-500"}`}
            >
              <Mic className="h-4 w-4" />
            </Button>
          </div>
          {voiceCommand && (
            <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300">Heard: "{voiceCommand}"</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Amount Input */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-green-600" />
            Amount
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">KSh</span>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-12 text-lg h-12"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {["100", "500", "1000"].map((preset) => (
              <Button key={preset} variant="outline" size="sm" onClick={() => setAmount(preset)}>
                KSh {preset}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recipient Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <User className="h-5 w-5 mr-2 text-blue-600" />
            Send To
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Contact Picker Button */}
          {isSupported && (
            <Button
              onClick={handlePickContact}
              disabled={isLoading}
              variant="outline"
              className="w-full border-green-500/50 text-green-600 hover:bg-green-500/10"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {isLoading ? "Opening Contacts..." : "Pick from Contacts"}
            </Button>
          )}
          <div>
            <Label htmlFor="recipient">Contact Name</Label>
            <Input
              id="recipient"
              placeholder="Enter contact name"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="phone">Or Phone Number</Label>
            <Input
              id="phone"
              placeholder="0712345678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Transfer Result */}
      {sendResult && (
        <Card className={`mb-6 ${sendResult.success ? 'bg-green-50 dark:bg-green-900/20 border-green-500' : 'bg-red-50 dark:bg-red-900/20 border-red-500'}`}>
          <CardContent className="p-4 flex items-center gap-3">
            {sendResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <p className={`text-sm ${sendResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
              {sendResult.message}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Selected Contact Display */}
      {selectedContact && (
        <Card className="mb-6 border-green-500 bg-green-50/50 dark:bg-green-900/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${selectedContact.has_account ? 'bg-green-500' : 'bg-orange-500'}`}>
                  {selectedContact.avatar}
                </div>
                <div>
                  <p className="font-semibold">{selectedContact.name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{selectedContact.phone || selectedContact.gate_name}</p>
                  {!selectedContact.has_account && (
                    <p className="text-xs text-orange-600 dark:text-orange-400">Gate will be auto-created</p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedContact(null)}>
                Change
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ongea Pesa Contacts */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-green-600" />
              Ongea Pesa Contacts
            </span>
            <Badge variant="outline" className="text-xs">
              {contacts.length} contacts
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, phone, or gate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Loading State */}
          {loadingContacts && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-green-600" />
              <span className="ml-2 text-sm text-gray-600">Loading contacts...</span>
            </div>
          )}

          {/* Error State */}
          {contactsError && (
            <div className="text-center py-4">
              <p className="text-sm text-red-600 mb-2">{contactsError}</p>
              <Button variant="outline" size="sm" onClick={fetchContacts}>
                Retry
              </Button>
            </div>
          )}

          {/* Contacts List */}
          {!loadingContacts && !contactsError && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {/* Current User (Me) - Always shown at top */}
              {currentUser && (
                <div className="flex items-center p-3 rounded-lg border border-blue-300 bg-blue-50 dark:bg-blue-900/20 cursor-not-allowed opacity-75">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold mr-3 bg-blue-500">
                    {currentUser.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{currentUser.name}</p>
                      <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                        You
                      </Badge>
                      {currentUser.is_admin && (
                        <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
                          Admin
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {currentUser.gate_name || currentUser.email}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <div>
                      <p className="text-xs text-gray-500">Wallet Balance</p>
                      <p className="text-sm font-medium text-blue-600">
                        KSh {currentUser.balance.toLocaleString()}
                      </p>
                    </div>
                    {/* Show IndexPay balances for admin user */}
                    {currentUser.is_admin && currentUser.indexpay_gate_balance !== undefined && (
                      <div className="border-t pt-1">
                        <p className="text-xs text-purple-500">Gate Balance</p>
                        <p className="text-xs font-medium text-purple-600">
                          KSh {currentUser.indexpay_gate_balance.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {currentUser.is_admin && currentUser.indexpay_pocket_balance !== undefined && (
                      <div>
                        <p className="text-xs text-purple-500">Pocket Balance</p>
                        <p className="text-xs font-medium text-purple-600">
                          KSh {currentUser.indexpay_pocket_balance.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Separator */}
              {currentUser && filteredContacts.length > 0 && (
                <div className="border-t my-2 pt-2">
                  <p className="text-xs text-gray-500 mb-2">Send money to:</p>
                </div>
              )}

              {filteredContacts.length === 0 && !currentUser ? (
                <p className="text-center text-sm text-gray-500 py-4">
                  {searchQuery ? 'No contacts found' : 'No contacts available'}
                </p>
              ) : (
                filteredContacts.map((contact, index) => (
                  <div
                    key={contact.gate_name || index}
                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedContact?.gate_name === contact.gate_name
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => handleSelectContact(contact)}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold mr-3 ${
                      contact.has_account ? 'bg-green-500' : 'bg-orange-500'
                    }`}>
                      {contact.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{contact.name}</p>
                        {contact.has_account ? (
                          <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-300">
                            Unclaimed
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        {contact.phone || contact.gate_name}
                      </p>
                    </div>
                    {contact.has_account && contact.balance > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Balance</p>
                        <p className="text-sm font-medium text-green-600">
                          KSh {contact.balance.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send Button */}
      <div className="fixed bottom-6 left-4 right-4">
        <Button
          className="w-full h-12 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
          disabled={!amount || !selectedContact || isSending}
          onClick={handleSendMoney}
        >
          {isSending ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-5 w-5 mr-2" />
              Send KSh {amount || "0"} {selectedContact ? `to ${selectedContact.name}` : ''}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
