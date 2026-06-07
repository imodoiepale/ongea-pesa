"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScreenShell } from "@/components/foundation"
import { useToast } from "@/components/ui/use-toast"

type Screen = "dashboard" | "voice" | "send" | "recurring" | "analytics" | "test" | "permissions" | "scanner";

interface RecurringPaymentsProps {
  onNavigate: (screen: Screen) => void;
}

interface SavedBill {
  id: string
  type: string
  amount: number
  phone: string
  till: string
  paybill: string
  account: string
  merchant: string
  receipt_path: string
  status: 'pending' | 'paid' | 'cancelled'
  confidence: number | null
  created_at: string
  paid_at: string | null
}

export default function RecurringPayments({ onNavigate }: RecurringPaymentsProps) {
  const { toast } = useToast()

  const [bills, setBills] = useState<SavedBill[]>([])
  const [loading, setLoading] = useState(true)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})

  const fetchBills = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/bills')
      if (!res.ok) throw new Error('Failed to load bills')
      const data = await res.json()
      setBills(data.bills || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load bills')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBills()
  }, [])

  useEffect(() => {
    bills.forEach(async (bill) => {
      if (bill.receipt_path && !signedUrls[bill.id]) {
        try {
          const res = await fetch(`/api/receipts/upload?path=${encodeURIComponent(bill.receipt_path)}`)
          if (res.ok) {
            const { url } = await res.json()
            setSignedUrls(prev => ({ ...prev, [bill.id]: url }))
          }
        } catch {
          // silently ignore thumbnail errors
        }
      }
    })
  }, [bills])

  const handlePay = async (bill: SavedBill) => {
    setPayingId(bill.id)
    try {
      const res = await fetch(`/api/bills/${bill.id}/pay`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Payment failed')
      setBills(prev => prev.filter(b => b.id !== bill.id))
      toast({
        title: 'Payment sent',
        description: `KSh ${Number(bill.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })} paid to ${bill.merchant || bill.type}`,
      })
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Payment failed'
      console.error('Pay bill error:', e)
      toast({
        title: 'Payment failed',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setPayingId(null)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-background surface-money pb-24">
      <ScreenShell className="pt-0">
        {/* Back header */}
        <div className="flex items-center gap-3 pt-6 mb-6">
          <Button variant="ghost" size="icon-sm" onClick={() => onNavigate("dashboard")} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Saved Bills</h1>
            <p className="text-sm text-muted-foreground">Pay later bills from scanned receipts</p>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-white/20 border-t-white rounded-full" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="mx-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {error}
            <button onClick={fetchBills} className="ml-2 underline">Retry</button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && bills.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-white/40">
            <Receipt className="w-10 h-10" />
            <p className="text-sm">No saved bills</p>
            <p className="text-xs text-white/20">Scan a receipt and choose &quot;Pay Later&quot; to save bills here.</p>
          </div>
        )}

        {/* Bill list */}
        {!loading && bills.map(bill => (
          <div key={bill.id} className="mx-4 mb-3 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
            {/* Receipt thumbnail if available */}
            {signedUrls[bill.id] && (
              <img src={signedUrls[bill.id]} alt="Receipt" className="w-full h-28 object-cover" />
            )}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-white text-sm">{bill.merchant || bill.type}</p>
                  <p className="text-xs text-white/50 mt-0.5">
                    {bill.till
                      ? `Till ${bill.till}`
                      : bill.paybill
                      ? `Paybill ${bill.paybill}${bill.account ? ' / ' + bill.account : ''}`
                      : bill.phone
                      ? `Phone ${bill.phone}`
                      : bill.type}
                  </p>
                  <p className="text-xs text-white/30 mt-1">
                    {new Date(bill.created_at).toLocaleDateString('en-KE')}
                  </p>
                </div>
                <p className="text-lg font-bold text-white whitespace-nowrap">
                  KSh {Number(bill.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <button
                onClick={() => handlePay(bill)}
                disabled={payingId === bill.id}
                className="mt-3 w-full py-2 rounded-lg bg-green-500 hover:bg-green-400 disabled:opacity-50 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2"
              >
                {payingId === bill.id
                  ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Paying...
                    </>
                  )
                  : 'Pay Now'
                }
              </button>
            </div>
          </div>
        ))}
      </ScreenShell>
    </div>
  )
}
