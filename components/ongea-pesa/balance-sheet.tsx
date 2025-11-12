"use client"

import { useState, useEffect } from "react"
import { X, Plus, TrendingUp, TrendingDown, Clock, Check, XCircle } from "lucide-react"
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
  const supabase = createClient()

  // Fetch transactions and M-Pesa number, setup real-time subscription
  useEffect(() => {
    if (!isOpen || !user?.id) return

    fetchTransactions()
    fetchMpesaNumber()

    // Real-time subscription to transactions
    const channel = supabase
      .channel('balance-sheet-transactions')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🔔 Transaction changed:', payload)
          // Refresh transactions list
          fetchTransactions()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isOpen, user?.id, supabase])

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

  const handleAddBalance = async () => {
    const amount = parseFloat(addAmount)
    if (!amount || amount <= 0 || !user?.id) return

    setDepositError('')
    setDepositSuccess('')

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

    try {
      // Set up 20-second timeout for deposit initiation
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000) // 20 seconds

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
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const data = await response.json()

      if (response.ok) {
        setDepositSuccess('Deposit initiated! Check your phone for M-Pesa prompt.')
        setAddAmount('')
        
        // Refresh transactions after successful deposit
        setTimeout(() => {
          fetchTransactions()
          setDepositSuccess('')
        }, 2000)
      } else {
        setDepositError(data.error || 'Failed to initiate deposit')
      }
    } catch (error: any) {
      console.error('❌ Deposit error:', error)
      if (error.name === 'AbortError') {
        setDepositError('Request timed out after 20 seconds. Please try again.')
      } else {
        setDepositError(error.message || 'An error occurred. Please try again.')
      }
    } finally {
      setIsAdding(false)
    }
  }

  const quickAmounts = [100, 500, 1000, 5000, 10000]

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
    if (type === 'deposit' || type.includes('receive')) {
      return <TrendingUp className="h-5 w-5 text-green-600" />
    }
    return <TrendingDown className="h-5 w-5 text-red-600" />
  }

  const isDebit = (type: string) => {
    return !type.includes('deposit') && !type.includes('receive')
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
            <p className="text-sm text-gray-600 mt-1">Current Balance: <span className="font-semibold text-green-600">KSh {currentBalance.toLocaleString()}</span></p>
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
              />
              <Button
                onClick={handleAddBalance}
                disabled={!addAmount || parseFloat(addAmount) <= 0 || isAdding}
                className="h-12 px-6 bg-green-600 hover:bg-green-700"
              >
                {isAdding ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Adding...
                  </div>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add via M-Pesa
                  </>
                )}
              </Button>
            </div>

            {/* Error Message */}
            {depositError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                <p className="text-sm text-red-700">{depositError}</p>
              </div>
            )}

            {/* Success Message */}
            {depositSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                <p className="text-sm text-green-700">{depositSuccess}</p>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>

            {loadingTransactions ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No transactions yet</p>
                <p className="text-sm mt-1">Your transaction history will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
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
                          <p className={`text-lg font-bold ${
                            isDebit(tx.type) ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {isDebit(tx.type) ? '-' : '+'}KSh {tx.amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">
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
