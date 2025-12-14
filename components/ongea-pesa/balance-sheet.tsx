"use client"

import { useState, useEffect } from "react"
import { X, Plus, TrendingUp, TrendingDown, Clock, Check, XCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from '@/lib/supabase/client'
import { useAuth } from "@/components/providers/auth-provider"

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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Balance & Transactions</h2>
            <p className="text-sm text-gray-600 mt-1">
              Wallet Balance: <span className="font-semibold text-green-600">KSh {currentBalance.toLocaleString()}</span>
            </p>
            {/* Show IndexPay balances for admin user only */}
            {isAdminUser && (
              <div className="flex gap-4 mt-1">
                {indexPayGateBalance !== null && (
                  <p className="text-xs text-purple-600">
                    Gate: <span className="font-semibold">KSh {indexPayGateBalance.toLocaleString()}</span>
                  </p>
                )}
                {indexPayPocketBalance !== null && (
                  <p className="text-xs text-purple-600">
                    Pocket: <span className="font-semibold">KSh {indexPayPocketBalance.toLocaleString()}</span>
                  </p>
                )}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Add Balance Section */}
          <div className="p-6 border-b border-gray-100 bg-gradient-to-br from-green-50 to-blue-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-green-600" />
              Add Balance
            </h3>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {quickAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setAddAmount(amount.toString())}
                  className="text-xs hover:bg-green-100 hover:border-green-400"
                >
                  {amount >= 1000 ? `${amount / 1000}K` : amount}
                </Button>
              ))}
            </div>

            {/* Custom Amount Input */}
            <div className="flex gap-2 mb-4">
              <Input
                type="number"
                placeholder="Enter amount..."
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                className="flex-1 h-12 text-lg"
                min="0"
                disabled={depositStatus !== 'idle' && depositStatus !== 'failed'}
              />
              <Button
                onClick={handleAddBalance}
                disabled={!addAmount || parseFloat(addAmount) <= 0 || isAdding || (depositStatus !== 'idle' && depositStatus !== 'failed')}
                className="h-12 px-6 bg-green-600 hover:bg-green-700"
              >
                {isAdding ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </div>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add via M-Pesa
                  </>
                )}
              </Button>
            </div>

            {/* Deposit Status Progress - Compact */}
            {depositStatus === 'sending' && (
              <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-white text-sm font-medium">Sending STK Push...</p>
                </div>
              </div>
            )}

            {depositStatus === 'waiting' && (
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg p-3 mb-3 animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-white text-sm font-medium">Enter M-Pesa PIN on your phone</p>
                </div>
              </div>
            )}

            {depositStatus === 'verifying' && (
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-white text-sm font-medium">Verifying... {verificationProgress}%</p>
                </div>
                <div className="w-full bg-blue-300/50 rounded-full h-1.5">
                  <div
                    className="bg-white h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${verificationProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {depositStatus === 'completed' && (
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-white" />
                  <p className="text-white text-sm font-medium">Deposit successful! KSh {lastDepositAmount.toLocaleString()} added.</p>
                </div>
              </div>
            )}

            {depositStatus === 'failed' && (
              <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-white" />
                    <p className="text-white text-sm font-medium">{depositError || 'Transaction failed'}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-white/20 hover:bg-white/30 text-white text-xs px-2 py-1 h-7"
                    onClick={() => {
                      setDepositStatus('idle')
                      setDepositError('')
                      setVerificationProgress(0)
                    }}
                  >
                    Retry
                  </Button>
                </div>
              </div>
            )}

            {/* Error Message (for idle state errors) */}
            {depositError && depositStatus === 'idle' && (
              <div className="bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-500 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <p className="text-sm text-red-700 font-medium whitespace-pre-line">{depositError}</p>
                </div>
              </div>
            )}

            {/* Success Message (for idle state after timeout) */}
            {depositSuccess && depositStatus === 'idle' && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <p className="text-sm text-green-700 font-medium whitespace-pre-line">{depositSuccess}</p>
                </div>
              </div>
            )}

            {/* M-Pesa Number Info */}
            {mpesaNumber && (
              <div className="text-xs text-gray-600 mt-2">
                📱 Using M-Pesa: {mpesaNumber}
              </div>
            )}
            {!mpesaNumber && (
              <div className="text-xs text-orange-600 mt-2">
                ⚠️ Set your M-Pesa number in Settings to deposit
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
              <div className="flex items-center gap-2">
                {/* Poll Pending Button - shows when there are pending transactions */}
                {transactions.some(tx => tx.status === 'pending') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={pollPendingTransactions}
                    disabled={isPollingPending}
                    className="text-xs h-7 px-2 bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${isPollingPending ? 'animate-spin' : ''}`} />
                    {isPollingPending ? 'Checking...' : 'Check Pending'}
                  </Button>
                )}
                <span className="text-xs text-gray-500">{filteredTransactions.length} of {transactions.length}</span>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {[
                { value: 'all', label: 'All', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200', activeColor: 'bg-gray-800 text-white' },
                { value: 'completed', label: 'Completed', color: 'bg-green-50 text-green-700 hover:bg-green-100', activeColor: 'bg-green-600 text-white' },
                { value: 'pending', label: 'Pending', color: 'bg-orange-50 text-orange-700 hover:bg-orange-100', activeColor: 'bg-orange-500 text-white' },
                { value: 'failed', label: 'Failed', color: 'bg-red-50 text-red-700 hover:bg-red-100', activeColor: 'bg-red-600 text-white' },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value as typeof statusFilter)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${statusFilter === filter.value
                      ? filter.activeColor
                      : filter.color
                    }`}
                >
                  {filter.label}
                  {filter.value !== 'all' && (
                    <span className="ml-1 opacity-75">
                      ({transactions.filter(tx => tx.status === filter.value).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {loadingTransactions ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No transactions yet</p>
                <p className="text-sm mt-1">Your transaction history will appear here</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No {statusFilter} transactions</p>
                <button
                  onClick={() => setStatusFilter('all')}
                  className="text-sm text-green-600 hover:underline mt-1"
                >
                  Show all transactions
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTransactions.map((tx) => (
                  <Card key={tx.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {/* Icon */}
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            {getTransactionIcon(tx.type)}
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 capitalize">
                                {tx.type.replace(/_/g, ' ')}
                              </p>
                              {getStatusIcon(tx.status)}
                            </div>
                            {/*                             
                            {tx.voice_command_text && (
                              <p className="text-sm text-gray-600 truncate">
                                "{tx.voice_command_text}"
                              </p>
                            )} */}

                            {tx.phone && (
                              <p className="text-xs text-gray-500 mt-1">
                                To: {tx.phone}
                              </p>
                            )}

                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(tx.created_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="text-right ml-4">
                          <p className={`text-lg font-bold ${isDebit(tx.type) ? 'text-red-600' : 'text-green-600'
                            }`}>
                            {isDebit(tx.type) ? '-' : '+'}KSh {tx.amount.toLocaleString()}
                          </p>
                          {/* Transaction fee: 0.05% = amount * 0.0005 */}
                          {isDebit(tx.type) && tx.status === 'completed' && (
                            <p className="text-xs text-orange-500">
                              Fee: KSh {(tx.amount * 0.0005).toFixed(2)}
                            </p>
                          )}
                          <p className={`text-xs font-semibold capitalize ${tx.status === 'failed' ? 'text-red-600' :
                            tx.status === 'pending' ? 'text-orange-500' :
                              tx.status === 'completed' ? 'text-green-600' :
                                'text-gray-500'
                            }`}>
                            {tx.status}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
