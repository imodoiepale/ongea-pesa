// @ts-nocheck
"use client"

import { CreditCard, DollarSign, User, Hash } from "lucide-react"
import type { PaymentSlots } from "@/contexts/ElevenLabsContext"

const TYPE_LABELS: Record<string, string> = {
  send_phone:    "Send to Phone",
  buy_goods_till: "Buy Goods (Till)",
  paybill:       "Pay Bill",
  internal:      "Ongea Transfer",
  receipt:       "Pay Receipt",
  withdraw:      "Withdraw",
}

function deriveDisplay(slots: PaymentSlots) {
  const typeDisplay = slots.type ? (TYPE_LABELS[slots.type] ?? slots.type) : null

  const whoDisplay =
    slots.recipientName ||
    slots.phone ||
    (slots.paybill
      ? `Paybill ${slots.paybill}${slots.account ? " / " + slots.account : ""}`
      : null) ||
    (slots.till ? `Till ${slots.till}` : null) ||
    null

  const amountDisplay =
    slots.amount != null
      ? `KSh ${slots.amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`
      : null

  const accountDisplay =
    slots.paybill && slots.account ? `Acct: ${slots.account}` : null

  return { typeDisplay, whoDisplay, amountDisplay, accountDisplay }
}

/** A card that pops in when it mounts (only rendered when value is non-null). */
function SlotCard({
  icon,
  label,
  value,
  wide = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  wide?: boolean
}) {
  return (
    <div
      className={`animate-in fade-in zoom-in-95 duration-300 rounded-2xl bg-white/8 border border-white/15 px-4 py-3 flex items-center gap-3${wide ? " col-span-2" : ""}`}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-green-500/20 flex items-center justify-center">
        <span className="text-green-400">{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-white/40 uppercase tracking-wide leading-none mb-0.5">
          {label}
        </p>
        <p className="text-sm font-semibold text-white truncate">{value}</p>
      </div>
    </div>
  )
}

/** A row in the multi-payment table. */
function PaymentRow({
  index,
  slots,
  isNew,
}: {
  index: number
  slots: PaymentSlots
  isNew?: boolean
}) {
  const { typeDisplay, whoDisplay, amountDisplay } = deriveDisplay(slots)
  return (
    <tr
      className={`border-b border-white/8 transition-colors duration-300${isNew ? " animate-in fade-in slide-in-from-bottom-1 duration-300" : ""}`}
    >
      <td className="px-3 py-2.5 text-xs font-semibold text-white/50 w-6">{index + 1}</td>
      <td className="px-3 py-2.5 text-xs text-white/80 max-w-[6rem] truncate">
        {typeDisplay ?? <span className="text-white/25 italic">…</span>}
      </td>
      <td className="px-3 py-2.5 text-xs text-white/80 max-w-[7rem] truncate">
        {whoDisplay ?? <span className="text-white/25 italic">…</span>}
      </td>
      <td className="px-3 py-2.5 text-xs font-semibold text-white text-right whitespace-nowrap">
        {amountDisplay ?? <span className="text-white/25 italic">…</span>}
      </td>
    </tr>
  )
}

interface PaymentIdentificationPanelProps {
  payments: PaymentSlots[]
}

export default function PaymentIdentificationPanel({ payments }: PaymentIdentificationPanelProps) {
  // Only consider payments that have at least one identified field
  const active = payments.filter(
    (p) => p.amount != null || p.type || p.phone || p.till || p.paybill || p.recipientName
  )

  if (active.length === 0) return null

  // ── Single payment: two-column card grid ──────────────────────────────────
  if (active.length === 1) {
    const { typeDisplay, whoDisplay, amountDisplay, accountDisplay } = deriveDisplay(active[0])

    return (
      <div className="w-full max-w-sm grid grid-cols-2 gap-2">
        {/* Payment Type card first */}
        {typeDisplay && (
          <SlotCard icon={<CreditCard className="w-4 h-4" />} label="Payment Type" value={typeDisplay} />
        )}
        {amountDisplay && (
          <SlotCard icon={<DollarSign className="w-4 h-4" />} label="Amount" value={amountDisplay} />
        )}
        {whoDisplay && (
          <SlotCard icon={<User className="w-4 h-4" />} label="To" value={whoDisplay} wide={!accountDisplay} />
        )}
        {accountDisplay && (
          <SlotCard icon={<Hash className="w-4 h-4" />} label="Account" value={accountDisplay} />
        )}
      </div>
    )
  }

  // ── Multiple payments: animated table ────────────────────────────────────
  const totalAmount = active.reduce((sum, p) => sum + (p.amount ?? 0), 0)
  const totalDisplay =
    totalAmount > 0
      ? `KSh ${totalAmount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`
      : null

  return (
    <div className="w-full max-w-sm animate-in fade-in duration-200">
      <div className="rounded-2xl border border-white/12 bg-white/5 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-3 py-2 text-[10px] font-semibold text-white/40 uppercase tracking-wide w-6">#</th>
              <th className="px-3 py-2 text-[10px] font-semibold text-white/40 uppercase tracking-wide">Type</th>
              <th className="px-3 py-2 text-[10px] font-semibold text-white/40 uppercase tracking-wide">To</th>
              <th className="px-3 py-2 text-[10px] font-semibold text-white/40 uppercase tracking-wide text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {active.map((slots, i) => (
              <PaymentRow key={i} index={i} slots={slots} isNew={true} />
            ))}
          </tbody>
          {totalDisplay && (
            <tfoot>
              <tr className="border-t border-white/15 bg-white/5">
                <td colSpan={3} className="px-3 py-2.5 text-xs font-semibold text-white/60">
                  Total
                </td>
                <td className="px-3 py-2.5 text-sm font-bold text-white text-right whitespace-nowrap">
                  {totalDisplay}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
