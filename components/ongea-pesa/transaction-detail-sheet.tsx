"use client"

import { ReceiptText } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export interface TransactionRecord {
  id: string
  type: string
  amount: number
  status: string
  created_at: string
  completed_at?: string
  phone?: string
  recipient_phone?: string
  recipient_email?: string
  paybill_number?: string
  till_number?: string
  account_number?: string
  description?: string
  voice_command_text?: string
  platform_fee?: number
  transaction_cost?: number
  net_amount?: number
  provider_ref?: string
  external_ref?: string
  mpesa_transaction_id?: string
  metadata?: Record<string, unknown> | null
}

const debitTypes = new Set([
  "send_phone", "send", "buy_goods_till", "buy_goods_pochi", "paybill",
  "withdraw", "bank_to_mpesa", "mpesa_to_bank", "voice_usage", "adjustment",
])

export function isDebitTransaction(type: string) {
  return debitTypes.has(type)
}

function transactionLabel(type: string) {
  const labels: Record<string, string> = {
    deposit: "Wallet deposit",
    receive: "Money received",
    send_phone: "Sent to phone",
    send: "Money sent",
    buy_goods_till: "Buy goods",
    buy_goods_pochi: "Pochi payment",
    paybill: "PayBill payment",
    withdraw: "Withdrawal",
    bank_to_mpesa: "Bank to M-Pesa",
    voice_usage: "Ongea Pesa Voice usage",
    adjustment: "Wallet adjustment",
  }
  return labels[type] || type.replace(/_/g, " ")
}

function transactionDescription(tx: TransactionRecord) {
  if (tx.metadata?.purpose === "voice_service_funding") return "Voice starter wallet funding"
  if (tx.metadata?.purpose === "voice_usage") return "Voice usage charge"
  if (tx.recipient_phone || tx.phone) return `To ${tx.recipient_phone || tx.phone}`
  if (tx.recipient_email) return `To ${tx.recipient_email}`
  if (tx.paybill_number) return `Paybill ${tx.paybill_number}${tx.account_number ? ` · ${tx.account_number}` : ""}`
  if (tx.till_number) return `Till ${tx.till_number}`
  return tx.description || tx.voice_command_text || transactionLabel(tx.type)
}

function money(value: number) {
  return Number(value || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function TransactionDetailSheet({ transaction, onClose }: { transaction: TransactionRecord | null; onClose: () => void }) {
  return (
    <Sheet open={Boolean(transaction)} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto rounded-t-[1.75rem] border-t border-brand/15 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
        {transaction && (() => {
          const tx = transaction
          const debit = isDebitTransaction(tx.type)
          const ongeaFee = Number(tx.platform_fee || 0)
          const customerProviderCost = tx.metadata?.cost_bearer === "customer" ? Number(tx.transaction_cost || 0) : 0
          const total = Number(tx.amount) + ongeaFee + customerProviderCost
          const reference = tx.provider_ref || tx.external_ref || tx.mpesa_transaction_id || tx.id
          const durationSeconds = Number(tx.metadata?.duration_seconds || 0)
          const rate = Number(tx.metadata?.rate_per_minute || 0)
          const totalLabel = debit ? "Total wallet debit" : "Total paid from M-Pesa"

          return (
            <div className="mx-auto w-full max-w-md">
              <SheetHeader className="pr-8 text-left">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-brand/10 text-brand"><ReceiptText className="h-5 w-5" /></span>
                <SheetTitle className="orbital-display pt-3 text-3xl">Transaction details</SheetTitle>
                <SheetDescription>{transactionDescription(tx)}</SheetDescription>
              </SheetHeader>

              <div className="mt-7 text-center">
                <p className="text-xs text-muted-foreground">{debit ? "Amount charged" : "Amount credited"}</p>
                <p className="orbital-display mt-2 text-5xl">KSh {money(Number(tx.amount))}</p>
                <span className={cn(
                  "mt-3 inline-flex rounded-full px-3 py-1 text-[10px] font-semibold capitalize",
                  tx.status === "completed" ? "bg-brand/10 text-brand" : tx.status === "pending" || tx.status === "processing" ? "bg-amber-500/10 text-amber-600" : "bg-destructive/10 text-destructive",
                )}>{tx.status}</span>
              </div>

              <dl className="mt-7 divide-y divide-black/8 border-y border-black/8 text-sm dark:divide-white/8 dark:border-white/8">
                {durationSeconds > 0 && <div className="flex min-h-12 items-center justify-between gap-4"><dt className="text-muted-foreground">Voice time</dt><dd className="font-mono">{Math.floor(durationSeconds / 60)}m {durationSeconds % 60}s</dd></div>}
                {rate > 0 && <div className="flex min-h-12 items-center justify-between gap-4"><dt className="text-muted-foreground">Voice rate</dt><dd className="font-mono">KSh {money(rate)}/min</dd></div>}
                <div className="flex min-h-12 items-center justify-between gap-4"><dt className="text-muted-foreground">Transaction amount</dt><dd className="font-mono">KSh {money(Number(tx.amount))}</dd></div>
                <div className="flex min-h-12 items-center justify-between gap-4"><dt className="text-muted-foreground">Ongea Pesa fee · 0.5%</dt><dd className="font-mono">{ongeaFee ? `KSh ${money(ongeaFee)}` : "Free"}</dd></div>
                <div className="flex min-h-12 items-center justify-between gap-4"><dt className="text-muted-foreground">M-Pesa/provider charge</dt><dd className="font-mono">KSh {money(customerProviderCost)}</dd></div>
                <div className="flex min-h-14 items-center justify-between gap-4 font-semibold"><dt>{totalLabel}</dt><dd className="font-mono text-brand">KSh {money(total)}</dd></div>
              </dl>

              <dl className="mt-5 space-y-3 text-xs">
                <div className="flex justify-between gap-5"><dt className="text-muted-foreground">Date</dt><dd className="text-right">{new Date(tx.completed_at || tx.created_at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}</dd></div>
                <div className="flex justify-between gap-5"><dt className="text-muted-foreground">Type</dt><dd className="text-right capitalize">{transactionLabel(tx.type)}</dd></div>
                <div className="flex justify-between gap-5"><dt className="text-muted-foreground">Reference</dt><dd className="max-w-[65%] break-all text-right font-mono">{reference}</dd></div>
              </dl>

              <p className="mt-6 text-center text-[10px] leading-relaxed text-muted-foreground">
                This breakdown uses the fees saved with the transaction. Deposits are free from Ongea Pesa; customer-paid M-Pesa charges remain separate.
              </p>
            </div>
          )
        })()}
      </SheetContent>
    </Sheet>
  )
}
