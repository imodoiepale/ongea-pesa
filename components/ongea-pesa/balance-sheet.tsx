"use client"

import { useState, useEffect } from "react"
import { X, Plus, TrendingUp, TrendingDown, Clock, Check, XCircle, RefreshCw, Loader2, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from '@/lib/supabase/client'
import { useAuth } from "@/components/providers/auth-provider"
import { cn } from "@/lib/utils"

interface BalanceSheetProps {
  isOpen: boolean
  onClose: () => void
  currentBalance: number
  onBalanceUpdate: (newBalance: number) => void
}

interface Transaction {
  id: string
  type: string
  amount: number
  phone?: string
  status: string
  created_at: string
  voice_command_text?: string
}

export default function BalanceSheet({ isOpen, onClose, currentBalance, onBalanceUpdate }: BalanceSheetProps) {
  const { user } = useAuth()
  const [addAmount, setAddAmount] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(true)
  const [mpesaNumber, setMpesaNumber] = useState<string | null>(null)
  const [depositError, setDepositError] = useState('')
  const [depositSuccess, setDepositSuccess] = useState('')
  const [depositStatus, setDepositStatus] = useState<'idle' | 'sending' | 'waiting' | 'verifying' | 'completed' | 'failed'>('idle')
  const [verificationProgress, setVerificationProgress] = useState(0)
  const [lastDepositAmount, setLastDepositAmount] = useState(0)
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all')
  const [indexPayGateBalance, setIndexPayGateBalance] = useState<number | null>(null)
  const [indexPayPocketBalance, setIndexPayPocketBalance] = useState<number | null>(null)
  const [isPollingPending, setIsPollingPending] = useState(false)
  const supabase = createClient()

  // Check if current user is admin (ijepale@gmail.com)
  const isAdminUser = user?.email === 'ijepale@gmail.com'

  // Filter transactions based on selected status
  const filteredTransactions = transactions.filter(tx => {
    if (statusFilter === 'all') return true
    return tx.status === statusFilter
  })

  // Fetch transactions and M-Pesa number, setup real-time subscriptions
  useEffect(() => {
    if (!isOpen || !user?.id) return

    fetchTransactions()
    fetchMpesaNumber()

    // Fetch IndexPay balances for admin user
    if (isAdminUser) {
      fetchIndexPayBalances()
    }

    // Real-time subscription to transactions
    const txChannel = supabase
      .channel('balance-sheet-transactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🔔 Transaction changed:', payload)
          fetchTransactions()
        }
      )
      .subscribe()

    // Real-time subscription to profile (for balance updates)
    const profileChannel = supabase
      .channel('balance-sheet-profile')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload: any) => {
          console.log('💰 Profile updated:', payload)
          if (payload.new?.wallet_balance !== undefined) {
            const newBalance = parseFloat(payload.new.wallet_balance) || 0
            console.log('💰 Balance updated in realtime:', newBalance)
            onBalanceUpdate(newBalance)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(txChannel)
      supabase.removeChannel(profileChannel)
    }
  }, [isOpen, user?.id, supabase, onBalanceUpdate])

  // Count pending deposits for auto-poll trigger
  const pendingDepositCount = transactions.filter(tx => tx.status === 'pending' && tx.type === 'deposit').length

  // Auto-poll pending transactions every 10 seconds when there are pending deposits (silent/background)
  // Skip auto-poll if we're actively verifying a deposit (to avoid double updates)
  useEffect(() => {
    if (!isOpen || !user?.id || pendingDepositCount === 0) return
    // Don't auto-poll while actively verifying a new deposit
    if (depositStatus === 'verifying' || depositStatus === 'waiting' || depositStatus === 'sending') return

    let isPolling = false

    // Poll function - runs silently in background
    const pollNow = async () => {
      if (isPolling) return

      isPolling = true
      try {
        const response = await fetch('/api/gate/poll-pending', { method: 'POST' })
        const data = await response.json()

        if (data.success && (data.completed > 0 || data.failed > 0)) {
          // Silently refresh transactions and balance
          fetchTransactions()

          const { data: profile } = await supabase
            .from('profiles')
            .select('wallet_balance')
            .eq('id', user?.id)
            .single()

          if (profile) {
            onBalanceUpdate(profile.wallet_balance || 0)
          }
        }
      } catch (err) {
        // Silent error - don't show to user
      } finally {
        isPolling = false
      }
    }

    // Poll immediately
    pollNow()

    // Then poll every 10 seconds (reduced frequency)
    const intervalId = setInterval(pollNow, 10000)

    return () => {
      clearInterval(intervalId)
    }
  }, [isOpen, user?.id, pendingDepositCount, depositStatus, supabase, onBalanceUpdate])

  const fetchTransactions = async () => {
    if (!user?.id) return

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, type, amount, phone, status, created_at, voice_command_text')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Error fetching transactions:', error)
      } else {
        setTransactions(data || [])

        // If balance is 0 but we have transactions, calculate from transactions
        if (currentBalance === 0 && data && data.length > 0) {
          // Fetch ALL transactions to calculate accurate balance
          const { data: allTx } = await supabase
            .from('transactions')
            .select('type, amount, status')
            .eq('user_id', user.id)
            .eq('status', 'completed')

          if (allTx && allTx.length > 0) {
            const calculatedBalance = allTx.reduce((total, tx) => {
              if (tx.type === 'deposit' || tx.type === 'receive') {
                return total + parseFloat(String(tx.amount))
              } else {
                return total - parseFloat(String(tx.amount))
              }
            }, 0)

            console.log('📊 Calculated balance from transactions:', calculatedBalance)
            onBalanceUpdate(calculatedBalance)
          }
        }
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoadingTransactions(false)
    }
  }

  const fetchMpesaNumber = async () => {
    if (!user?.id) return

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('mpesa_number')
        .eq('id', user.id)
        .single()

      setMpesaNumber(profile?.mpesa_number || null)
    } catch (err) {
      console.error('Error fetching M-Pesa number:', err)
    }
  }

  // Fetch IndexPay gate and pocket balances for admin user
  const fetchIndexPayBalances = async () => {
    if (!isAdminUser || !user?.id) return

    try {
      // Get user's gate_name from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('gate_name')
        .eq('id', user.id)
        .single()

      if (!profile?.gate_name) return

      // Fetch gates from IndexPay
      const gatesFormData = new FormData()
      gatesFormData.append('user_email', 'info@nsait.co.ke')

      const gatesResponse = await fetch('https://aps.co.ke/indexpay/api/get_gate_list.php', {
        method: 'POST',
        body: gatesFormData,
      })

      if (gatesResponse.ok) {
        const gatesData = await gatesResponse.json()
        const gates = Array.isArray(gatesData) ? gatesData : (gatesData?.response || [])
        const userGate = gates.find((g: any) => g.gate_name === profile.gate_name)
        if (userGate) {
          setIndexPayGateBalance(parseFloat(userGate.account_balance || 0))
        }
      }

      // Fetch pockets from IndexPay
      const pocketsFormData = new FormData()
      pocketsFormData.append('user_email', 'info@nsait.co.ke')

      const pocketsResponse = await fetch('https://aps.co.ke/indexpay/api/get_pocket_list.php', {
        method: 'POST',
        body: pocketsFormData,
      })

      if (pocketsResponse.ok) {
        const pocketsData = await pocketsResponse.json()
        const pockets = Array.isArray(pocketsData) ? pocketsData : (pocketsData?.response || [])
        const userPocket = pockets.find((p: any) => p.gate === profile.gate_name || p.pocket_name === 'ongeapesa_wallet')
        if (userPocket) {
          setIndexPayPocketBalance(parseFloat(userPocket.acct_balance || 0))
        }
      }
    } catch (err) {
      console.error('Error fetching IndexPay balances:', err)
    }
  }

  // Poll for transaction status
  const pollTransactionStatus = async (transactionId: string, transactionRef: string, gateName: string, depositAmount: number) => {
    const maxAttempts = 8 // 8 attempts × 2 seconds = 16 seconds
    let attempts = 0

    setDepositStatus('verifying')

    const poll = async (): Promise<boolean> => {
      attempts++
      setVerificationProgress(Math.round((attempts / maxAttempts) * 100))

      try {
        const response = await fetch('/api/gate/verify-transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transaction_reference: transactionRef,
            transaction_id: transactionId,
            gate_name: gateName
          })
        })

        const data = await response.json()
        console.log(`🔍 Poll attempt ${attempts}:`, data.status)

        if (data.status === 'completed') {
          setDepositStatus('completed')
          // Use updated_balance from API response if available
          if (data.updated_balance && data.updated_balance > 0) {
            console.log('💰 Using updated balance from API:', data.updated_balance)
            onBalanceUpdate(data.updated_balance)
          } else {
            // Fallback: fetch from database
            const { data: profile } = await supabase
              .from('profiles')
              .select('wallet_balance')
              .eq('id', user?.id)
              .single()
            if (profile) {
              onBalanceUpdate(profile.wallet_balance || 0)
            }
          }
          fetchTransactions()

          // Auto-hide success after 3 seconds and reset for new deposit
          setTimeout(() => {
            setDepositStatus('idle')
            setDepositSuccess('')
            setVerificationProgress(0)
          }, 3000)

          return true
        } else if (data.status === 'failed') {
          setDepositStatus('failed')
          setDepositError('Transaction failed. Money was not deducted from your M-Pesa.')

          // Auto-hide error after 5 seconds
          setTimeout(() => {
            setDepositStatus('idle')
            setDepositError('')
          }, 5000)

          return true
        } else if (data.status === 'cancelled') {
          setDepositStatus('failed')
          setDepositError('Transaction was cancelled. You can try again.')

          // Auto-hide after 5 seconds
          setTimeout(() => {
            setDepositStatus('idle')
            setDepositError('')
          }, 5000)

          return true
        }

        // Still pending, continue polling
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds
          return poll()
        }

        // Max attempts reached
        setDepositStatus('idle')
        setDepositSuccess(`⏳ Transaction pending. We'll update your balance automatically when confirmed.\n📱 Check your M-Pesa messages.`)
        return false
      } catch (error) {
        console.error('Poll error:', error)
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000))
          return poll()
        }
        return false
      }
    }

    return poll()
  }

  const handleAddBalance = async () => {
    const amount = parseFloat(addAmount)
    if (!amount || amount <= 0 || !user?.id) return

    setDepositError('')
    setDepositSuccess('')
    setDepositStatus('idle')
    setVerificationProgress(0)

    // Validate minimum amount
    if (amount < 10) {
      setDepositError('Minimum deposit amount is KSh 10')
      return
    }

    // Check if M-Pesa number is set
    if (!mpesaNumber) {
      setDepositError('Please set your M-Pesa number in Settings first')
      return
    }

    setIsAdding(true)
    setDepositStatus('sending')
    setLastDepositAmount(amount) // Store amount before clearing input

    try {
      // Call deposit API with M-Pesa integration
      const response = await fetch('/api/gate/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          phone: mpesaNumber,
        }),
      })

      const data = await response.json()
      console.log('📦 Deposit response:', data)

      if (response.ok && data.success && data.transaction_sent) {
        setDepositStatus('waiting')
        setAddAmount('')

        // Wait 3 seconds for user to enter PIN, then start polling
        await new Promise(resolve => setTimeout(resolve, 3000))

        // Start polling for transaction status
        await pollTransactionStatus(
          data.transaction_id,
          data.account_number || data.transaction_reference,
          data.gate_name,
          amount
        )

        fetchTransactions()
      } else {
        setDepositStatus('failed')
        setDepositError(data.error || 'Failed to initiate deposit')
      }
    } catch (error: any) {
      console.error('❌ Deposit error:', error)
      setDepositStatus('failed')
      setDepositError(error.message || 'An error occurred. Please try again.')
    } finally {
      setIsAdding(false)
    }
  }

  const quickAmounts = [100, 500, 1000, 5000, 10000]

  // Poll pending transactions for this user
  const pollPendingTransactions = async () => {
    if (isPollingPending) return

    setIsPollingPending(true)
    try {
      const response = await fetch('/api/gate/poll-pending', { method: 'POST' })
      const data = await response.json()

      if (data.success) {
        // Refresh transactions and balance
        fetchTransactions()

        // Fetch updated balance
        const { data: profile } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', user?.id)
          .single()

        if (profile) {
          onBalanceUpdate(profile.wallet_balance || 0)
        }

        // Show result
        if (data.completed > 0 || data.failed > 0) {
          setDepositSuccess(`✅ Updated ${data.completed} completed, ${data.failed} failed transactions`)
          setTimeout(() => setDepositSuccess(''), 5000)
        }
      }
    } catch (err) {
      console.error('Poll pending error:', err)
    } finally {
      setIsPollingPending(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getTransactionIcon = (type: string) => {
    if (type === 'deposit' || type.includes('receive') || type === 'transfer_in') {
      return <TrendingUp className="h-5 w-5 text-green-600" />
    }
    return <TrendingDown className="h-5 w-5 text-red-600" />
  }

  const isDebit = (type: string) => {
    // transfer_out, send, withdraw, payment are debits
    // deposit, receive, transfer_in are credits
    return !type.includes('deposit') && !type.includes('receive') && !type.includes('transfer_in')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="fixed inset-x-0 bottom-0 bg-background border-t border-border/60 rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Balance & Transactions</h2>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xs text-muted-foreground">Wallet</span>
              <span className="text-sm font-bold text-brand" style={{ fontVariantNumeric: 'tabular-nums' }}>
                KSh {currentBalance.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {isAdminUser && (indexPayGateBalance !== null || indexPayPocketBalance !== null) && (
              <div className="flex gap-4 mt-1">
                {indexPayGateBalance !== null && (
                  <span className="text-[10px] text-muted-foreground">Gate: <strong>KSh {indexPayGateBalance.toLocaleString()}</strong></span>
                )}
                {indexPayPocketBalance !== null && (
                  <span className="text-[10px] text-muted-foreground">Pocket: <strong>KSh {indexPayPocketBalance.toLocaleString()}</strong></span>
                )}
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Add Balance Section */}
          <div className="px-5 py-4 border-b border-border/60">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Add Balance via M-Pesa</p>

            {/* Quick amount presets */}
            <div className="grid grid-cols-5 gap-1.5 mb-3">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setAddAmount(amount.toString())}
                  className={cn(
                    "py-1.5 text-xs font-semibold rounded-xl transition-all duration-150 active:scale-[0.97]",
                    addAmount === amount.toString()
                      ? "bg-brand text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  )}
                >
                  {amount >= 1000 ? `${amount / 1000}K` : amount}
                </button>
              ))}
            </div>

            {/* Amount input + button row */}
            <div className="flex gap-2 mb-3">
              <div className="flex-1 rounded-xl border border-border/60 bg-card px-3 py-2 flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">KSh</span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  min="0"
                  disabled={depositStatus !== 'idle' && depositStatus !== 'failed'}
                  className="flex-1 text-sm font-semibold text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/40"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                  inputMode="decimal"
                  aria-label="Deposit amount"
                />
              </div>
              <Button
                onClick={handleAddBalance}
                disabled={!addAmount || parseFloat(addAmount) <= 0 || isAdding || (depositStatus !== 'idle' && depositStatus !== 'failed')}
                className="h-auto px-4 py-2 text-sm font-semibold rounded-xl"
              >
                {isAdding ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Sending…</>
                ) : (
                  <><Plus className="h-3.5 w-3.5 mr-1.5" /> Add</>
                )}
              </Button>
            </div>

            {/* Deposit status banners — semantic tokens, no gradients */}
            {depositStatus === 'sending' && (
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 px-3 py-2.5 flex items-center gap-2 mb-2">
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin shrink-0" />
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Sending STK Push…</span>
              </div>
            )}
            {depositStatus === 'waiting' && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2.5 flex items-center gap-2 mb-2">
                <Loader2 className="h-4 w-4 text-amber-500 animate-spin shrink-0" />
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Enter M-Pesa PIN on your phone</span>
              </div>
            )}
            {depositStatus === 'verifying' && (
              <div className="rounded-xl bg-brand/8 border border-brand/20 px-3 py-2.5 mb-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <Loader2 className="h-4 w-4 text-brand animate-spin shrink-0" />
                  <span className="text-sm font-medium text-brand">Verifying… {verificationProgress}%</span>
                </div>
                <div className="w-full bg-border/60 rounded-full h-1">
                  <div className="bg-brand h-1 rounded-full transition-all duration-500" style={{ width: `${verificationProgress}%` }} />
                </div>
              </div>
            )}
            {depositStatus === 'completed' && (
              <div className="rounded-xl bg-brand/8 border border-brand/20 px-3 py-2.5 flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-brand shrink-0" />
                <span className="text-sm font-medium text-brand">Deposit successful! KSh {lastDepositAmount.toLocaleString()} added.</span>
              </div>
            )}
            {depositStatus === 'failed' && (
              <div className="rounded-xl bg-destructive/8 border border-destructive/20 px-3 py-2.5 flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                  <span className="text-sm font-medium text-destructive">{depositError || 'Transaction failed'}</span>
                </div>
                <button
                  onClick={() => { setDepositStatus('idle'); setDepositError(''); setVerificationProgress(0) }}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted"
                >Retry</button>
              </div>
            )}
            {depositError && depositStatus === 'idle' && (
              <div className="rounded-xl bg-destructive/8 border border-destructive/20 px-3 py-2.5 flex items-center gap-2 mb-2">
                <XCircle className="h-4 w-4 text-destructive shrink-0" />
                <span className="text-sm text-destructive whitespace-pre-line">{depositError}</span>
              </div>
            )}
            {depositSuccess && depositStatus === 'idle' && (
              <div className="rounded-xl bg-brand/8 border border-brand/20 px-3 py-2.5 flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-brand shrink-0" />
                <span className="text-sm text-brand whitespace-pre-line">{depositSuccess}</span>
              </div>
            )}

            {/* M-Pesa number */}
            {mpesaNumber ? (
              <p className="text-xs text-muted-foreground mt-1">📱 Using M-Pesa: {mpesaNumber}</p>
            ) : (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">⚠️ Set your M-Pesa number in Settings to deposit</p>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-5 py-4">
              {/* Section header row */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Transactions</p>
                <div className="flex items-center gap-2">
                  {transactions.some(tx => tx.status === 'pending') && (
                    <button
                      onClick={pollPendingTransactions}
                      disabled={isPollingPending}
                      className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={cn("h-3 w-3", isPollingPending && "animate-spin")} />
                      {isPollingPending ? 'Checking…' : 'Check Pending'}
                    </button>
                  )}
                  <span className="text-xs text-muted-foreground">{filteredTransactions.length}/{transactions.length}</span>
                </div>
              </div>

              {/* Filter pills */}
              <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'completed', label: 'Done', count: transactions.filter(tx => tx.status === 'completed').length },
                  { value: 'pending', label: 'Pending', count: transactions.filter(tx => tx.status === 'pending').length },
                  { value: 'failed', label: 'Failed', count: transactions.filter(tx => tx.status === 'failed').length },
                ].map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setStatusFilter(f.value as typeof statusFilter)}
                    className={cn(
                      "shrink-0 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all duration-150 active:scale-[0.97]",
                      statusFilter === f.value
                        ? "bg-brand text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    )}
                  >
                    {f.label}{f.count !== undefined ? ` (${f.count})` : ''}
                  </button>
                ))}
              </div>

              {/* Transaction list */}
              {loadingTransactions ? (
                <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Loading…</span>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm text-muted-foreground">No transactions yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Your history will appear here</p>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm text-muted-foreground">No {statusFilter} transactions</p>
                  <button onClick={() => setStatusFilter('all')} className="text-xs text-brand hover:underline mt-1">Show all</button>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40">
                  {filteredTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                      {/* Icon */}
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                        isDebit(tx.type) ? "bg-destructive/10" : "bg-brand/10"
                      )}>
                        {/* keep getTransactionIcon call but restyle the icon colors in a wrapper */}
                        <span className={isDebit(tx.type) ? "[&_svg]:text-destructive" : "[&_svg]:text-brand"}>
                          {getTransactionIcon(tx.type)}
                        </span>
                      </div>
                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-foreground capitalize truncate">
                            {tx.type.replace(/_/g, ' ')}
                          </p>
                          {getStatusIcon(tx.status)}
                        </div>
                        {tx.phone && <p className="text-xs text-muted-foreground truncate">To: {tx.phone}</p>}
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          {new Date(tx.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {/* Amount */}
                      <div className="text-right shrink-0">
                        <p className={cn(
                          "text-sm font-bold",
                          isDebit(tx.type) ? "text-destructive" : "text-brand"
                        )} style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {isDebit(tx.type) ? '−' : '+'}KSh {tx.amount.toLocaleString('en-KE')}
                        </p>
                        {isDebit(tx.type) && tx.status === 'completed' && (
                          <p className="text-[10px] text-muted-foreground/70">Fee: KSh {(tx.amount * 0.0005).toFixed(2)}</p>
                        )}
                        <p className={cn(
                          "text-[10px] font-semibold capitalize",
                          tx.status === 'completed' ? "text-brand" :
                          tx.status === 'pending' ? "text-amber-500" :
                          "text-destructive"
                        )}>{tx.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
