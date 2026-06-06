"use client"

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Plus, Trash2, Send, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useElevenLabs } from '@/contexts/ElevenLabsContext'
import { ScreenShell } from '@/components/foundation'
import { cn } from '@/lib/utils'
import type { BatchItem, BatchResponse, BatchResult } from '@/lib/batch-payments'

type Screen = 'dashboard' | 'voice' | 'send' | 'camera' | 'recurring' | 'analytics' | 'test' | 'permissions' | 'scanner' | 'batch'

type DestKind = 'phone' | 'till' | 'paybill' | 'bill'

interface LineItem {
  id: number
  kind: DestKind
  phone: string
  till: string
  paybill: string
  account: string
  billType: string
  recipientName: string
  amount: string
  // post-send status
  status?: 'pending' | 'success' | 'fail'
  statusMsg?: string
  transaction_id?: string
  bank_ref?: string
}

interface BatchSendProps {
  onNavigate: (screen: Screen) => void
  /** Pre-populated payments from a voice-triggered send_batch call */
  initialPayments?: BatchItem[]
  /** Results from a voice-triggered send_batch call (already sent) */
  initialResults?: BatchResponse
}

let nextId = 1

function makeEmpty(kind: DestKind = 'phone'): LineItem {
  return { id: nextId++, kind, phone: '', till: '', paybill: '', account: '', billType: '', recipientName: '', amount: '' }
}

const BILL_TYPES = ['KPLC', 'NHIF', 'NSSF', 'KRA', 'NWSC', 'Nairobi Water', 'GOtv', 'DStv', 'Airtel Data', 'Safaricom Data'] as const

export default function BatchSend({ onNavigate, initialPayments, initialResults }: BatchSendProps) {
  const { registerToolHandlers, unregisterToolHandlers } = useElevenLabs()
  const { toast } = useToast()

  const [items, setItems] = useState<LineItem[]>(() => {
    if (initialPayments && initialPayments.length > 0) {
      return initialPayments.map(p => {
        const base = makeEmpty((p.destination.kind === 'internal' ? 'phone' : p.destination.kind) as DestKind)
        const d = p.destination as any
        return {
          ...base,
          phone: d.phone ?? '',
          till: d.till ?? '',
          paybill: d.paybill ?? '',
          account: d.account ?? '',
          billType: d.billType ?? '',
          recipientName: d.recipientName ?? p.label ?? '',
          amount: String(p.amount),
          kind: (p.destination.kind === 'internal' ? 'phone' : p.destination.kind) as DestKind,
        }
      })
    }
    return [makeEmpty()]
  })

  const [balance, setBalance] = useState(0)
  const [isSending, setIsSending] = useState(false)
  const [batchDone, setBatchDone] = useState(false)
  const [results, setResults] = useState<BatchResult[]>(initialResults?.results ?? [])

  // Fetch balance on mount
  useEffect(() => {
    fetch('/api/balance')
      .then(r => r.json())
      .then(d => setBalance(d.balance ?? 0))
      .catch(() => {})
  }, [])

  // Apply voice-triggered results if they arrived before this component mounted
  useEffect(() => {
    if (initialResults?.results?.length) {
      setResults(initialResults.results)
      setBatchDone(true)
      setItems(prev =>
        prev.map((item, i) => {
          const r = initialResults.results[i]
          if (!r) return item
          return {
            ...item,
            status: r.success ? 'success' : 'fail',
            statusMsg: r.error ?? (r.bank_ref ? `Ref: ${r.bank_ref}` : 'Sent'),
            transaction_id: r.transaction_id,
            bank_ref: r.bank_ref,
          }
        })
      )
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Register showBatch handler so voice agent can populate this screen
  useEffect(() => {
    registerToolHandlers({
      showBatch: (payments, batchResponse) => {
        if (payments?.length) {
          setItems(payments.map(p => {
            const base = makeEmpty((p.destination.kind === 'internal' ? 'phone' : p.destination.kind) as DestKind)
            const d = p.destination as any
            return {
              ...base,
              phone: d.phone ?? '',
              till: d.till ?? '',
              paybill: d.paybill ?? '',
              account: d.account ?? '',
              billType: d.billType ?? '',
              recipientName: d.recipientName ?? p.label ?? '',
              amount: String(p.amount),
              kind: (p.destination.kind === 'internal' ? 'phone' : p.destination.kind) as DestKind,
            }
          }))
        }
        if (batchResponse?.results?.length) {
          setResults(batchResponse.results)
          setBatchDone(true)
        }
      },
    })
    return () => unregisterToolHandlers(['showBatch'])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Computed totals
  const total = items.reduce((s, it) => {
    const a = parseFloat(it.amount.replace(/[^0-9.]/g, '')) || 0
    return s + a
  }, 0)
  const canAfford = balance >= total
  const allValid = items.every(it => {
    const a = parseFloat(it.amount.replace(/[^0-9.]/g, '')) || 0
    if (a <= 0) return false
    if (it.kind === 'phone' && !it.phone) return false
    if (it.kind === 'till' && !it.till) return false
    if (it.kind === 'paybill' && (!it.paybill || !it.account)) return false
    if (it.kind === 'bill' && !it.billType) return false
    return true
  })

  const updateItem = useCallback((id: number, patch: Partial<LineItem>) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it))
  }, [])

  const removeItem = useCallback((id: number) => {
    setItems(prev => prev.length > 1 ? prev.filter(it => it.id !== id) : prev)
  }, [])

  const addItem = () => setItems(prev => [...prev, makeEmpty()])

  const handleSendAll = async () => {
    if (!allValid || !canAfford || isSending) return

    const payments: BatchItem[] = items.map(it => {
      const amount = parseFloat(it.amount.replace(/[^0-9.]/g, '')) || 0
      let destination: BatchItem['destination']
      if (it.kind === 'phone') {
        destination = { kind: 'phone', phone: it.phone, recipientName: it.recipientName || undefined }
      } else if (it.kind === 'till') {
        destination = { kind: 'till', till: it.till, recipientName: it.recipientName || undefined }
      } else if (it.kind === 'paybill') {
        destination = { kind: 'paybill', paybill: it.paybill, account: it.account, recipientName: it.recipientName || undefined }
      } else {
        destination = { kind: 'bill', billType: it.billType, phone: it.phone || undefined }
      }
      return { amount, destination, label: it.recipientName || undefined }
    })

    setIsSending(true)
    setBatchDone(false)
    setResults([])
    // Mark all as pending
    setItems(prev => prev.map(it => ({ ...it, status: 'pending' as const })))

    try {
      const res = await fetch('/api/payments/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payments }),
      })
      const json: BatchResponse = await res.json()

      setResults(json.results ?? [])
      setBatchDone(true)

      // Update per-item statuses
      setItems(prev =>
        prev.map((it, i) => {
          const r = json.results?.[i]
          if (!r) return { ...it, status: 'fail' as const, statusMsg: 'No result' }
          return {
            ...it,
            status: r.success ? 'success' as const : 'fail' as const,
            statusMsg: r.error ?? (r.bank_ref ? `Ref: ${r.bank_ref}` : 'Sent'),
            transaction_id: r.transaction_id,
            bank_ref: r.bank_ref,
          }
        })
      )

      // Refresh balance
      fetch('/api/balance')
        .then(r => r.json())
        .then(d => setBalance(d.balance ?? 0))
        .catch(() => {})

      if (!json.success && json.error === 'Insufficient funds') {
        toast({ title: '❌ Insufficient funds', description: json.message, variant: 'destructive' })
        setItems(prev => prev.map(it => ({ ...it, status: undefined })))
      } else {
        const failed = (json.results ?? []).filter(r => !r.success)
        if (failed.length === 0) {
          toast({ title: '✅ All payments sent!', description: `${json.successCount} payment(s) completed.` })
        } else {
          toast({
            title: `⚠️ ${json.successCount} sent, ${json.failCount} failed`,
            description: failed.map(f => `${f.label ?? f.kind}: ${f.error}`).join(' | '),
            variant: 'destructive',
          })
        }
      }
    } catch (err: any) {
      toast({ title: '❌ Network error', description: err.message, variant: 'destructive' })
      setItems(prev => prev.map(it => ({ ...it, status: undefined })))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <ScreenShell>
      <div className="flex items-center gap-3 pt-4 pb-2 px-4">
        <Button variant="ghost" size="icon" onClick={() => onNavigate('dashboard')} className="-ml-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Multi-Send</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Send to multiple destinations at once</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Balance vs total banner */}
        <div
          className={cn(
            'rounded-xl border px-4 py-3 flex items-center justify-between',
            canAfford
              ? 'border-border/60 bg-muted/30'
              : 'border-destructive/40 bg-destructive/8'
          )}
        >
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Wallet Balance</p>
            <p className="text-lg font-bold text-foreground">KSh {balance.toLocaleString()}</p>
          </div>
          <div className="text-right space-y-0.5">
            <p className="text-xs text-muted-foreground">Batch Total</p>
            <p className={cn('text-lg font-bold', canAfford ? 'text-brand' : 'text-destructive')}>
              KSh {total.toLocaleString()}
            </p>
          </div>
        </div>

        {!canAfford && total > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Insufficient funds — you need KSh {(total - balance).toLocaleString()} more.</span>
          </div>
        )}

        {/* Line items */}
        <div className="space-y-3">
          {items.map((item, idx) => (
            <LineItemRow
              key={item.id}
              item={item}
              index={idx}
              onUpdate={updateItem}
              onRemove={removeItem}
              canRemove={items.length > 1}
              disabled={isSending}
            />
          ))}
        </div>

        {/* Add row */}
        {!batchDone && (
          <Button
            variant="outline"
            className="w-full border-dashed"
            onClick={addItem}
            disabled={isSending}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Payment
          </Button>
        )}

        {/* Send All */}
        {!batchDone && (
          <Button
            className="w-full"
            size="lg"
            onClick={handleSendAll}
            disabled={!allValid || !canAfford || isSending}
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending {items.length} payment{items.length !== 1 ? 's' : ''}…
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send All — KSh {total.toLocaleString()}
              </>
            )}
          </Button>
        )}

        {/* Results summary */}
        {batchDone && results.length > 0 && (
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
              <span className="font-semibold text-sm">Results</span>
              <span className="text-xs text-muted-foreground">
                {results.filter(r => r.success).length}/{results.length} sent
              </span>
            </div>
            <div className="divide-y divide-border/30">
              {results.map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  {r.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.label ?? r.kind}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.success ? (r.bank_ref ? `Ref: ${r.bank_ref}` : 'Completed') : r.error}
                    </p>
                  </div>
                  <span className="text-sm font-semibold shrink-0">KSh {r.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-border/40 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setBatchDone(false)
                  setResults([])
                  setItems([makeEmpty()])
                }}
              >
                New Batch
              </Button>
              <Button className="flex-1" onClick={() => onNavigate('dashboard')}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </ScreenShell>
  )
}

// ── LineItemRow ────────────────────────────────────────────────────────────────

interface LineItemRowProps {
  item: LineItem
  index: number
  onUpdate: (id: number, patch: Partial<LineItem>) => void
  onRemove: (id: number) => void
  canRemove: boolean
  disabled: boolean
}

function LineItemRow({ item, index, onUpdate, onRemove, canRemove, disabled }: LineItemRowProps) {
  const up = (patch: Partial<LineItem>) => onUpdate(item.id, patch)

  const statusIcon =
    item.status === 'success' ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> :
    item.status === 'fail'    ? <XCircle className="h-4 w-4 text-destructive shrink-0" /> :
    item.status === 'pending' ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" /> :
    null

  return (
    <div className="rounded-xl border border-border/60 bg-card p-3 space-y-2">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground w-5 text-center">{index + 1}</span>
        <Select
          value={item.kind}
          onValueChange={(v: DestKind) => up({ kind: v, phone: '', till: '', paybill: '', account: '', billType: '' })}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="phone">📱 Phone / Pochi</SelectItem>
            <SelectItem value="till">🏪 Till (Buy Goods)</SelectItem>
            <SelectItem value="paybill">📄 Paybill</SelectItem>
            <SelectItem value="bill">⚡ Utility Bill</SelectItem>
          </SelectContent>
        </Select>
        {statusIcon}
        {canRemove && !disabled && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(item.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Destination fields */}
      <div className="grid grid-cols-2 gap-2">
        {item.kind === 'phone' && (
          <Input
            placeholder="07XXXXXXXX"
            value={item.phone}
            onChange={e => up({ phone: e.target.value })}
            disabled={disabled}
            className="h-8 text-sm col-span-2"
          />
        )}
        {item.kind === 'till' && (
          <Input
            placeholder="Till number"
            value={item.till}
            onChange={e => up({ till: e.target.value })}
            disabled={disabled}
            className="h-8 text-sm col-span-2"
          />
        )}
        {item.kind === 'paybill' && (
          <>
            <Input
              placeholder="Paybill"
              value={item.paybill}
              onChange={e => up({ paybill: e.target.value })}
              disabled={disabled}
              className="h-8 text-sm"
            />
            <Input
              placeholder="Account"
              value={item.account}
              onChange={e => up({ account: e.target.value })}
              disabled={disabled}
              className="h-8 text-sm"
            />
          </>
        )}
        {item.kind === 'bill' && (
          <>
            <Select
              value={item.billType}
              onValueChange={(v) => up({ billType: v })}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Bill type" />
              </SelectTrigger>
              <SelectContent>
                {BILL_TYPES.map(bt => (
                  <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Account / Meter"
              value={item.account}
              onChange={e => up({ account: e.target.value })}
              disabled={disabled}
              className="h-8 text-sm"
            />
          </>
        )}

        {/* Name (optional) */}
        <Input
          placeholder="Name (optional)"
          value={item.recipientName}
          onChange={e => up({ recipientName: e.target.value })}
          disabled={disabled}
          className="h-8 text-sm"
        />

        {/* Amount */}
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground select-none">KSh</span>
          <Input
            placeholder="0"
            value={item.amount}
            onChange={e => up({ amount: e.target.value })}
            disabled={disabled}
            className="h-8 text-sm pl-9"
            inputMode="decimal"
          />
        </div>
      </div>

      {/* Per-item status message */}
      {item.status && item.statusMsg && (
        <p className={cn(
          'text-xs px-1',
          item.status === 'success' ? 'text-green-600' : 'text-destructive'
        )}>
          {item.statusMsg}
        </p>
      )}
    </div>
  )
}
