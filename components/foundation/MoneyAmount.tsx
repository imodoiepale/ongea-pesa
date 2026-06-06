/**
 * MoneyAmount — canonical big-number display for wallet balances and amounts.
 *
 * Features:
 * - Tabular-nums (no layout shift as digits change)
 * - KSh locale formatting (en-KE)
 * - Tight negative tracking for premium feel
 * - Optional delta badge (positive / negative change)
 * - Loading skeleton state
 *
 * Usage:
 *   <MoneyAmount value={12400} />
 *   <MoneyAmount value={12400} size="lg" label="Wallet Balance" delta={+230} />
 *   <MoneyAmount value={0} loading />
 */

import { cn } from "@/lib/utils"

interface MoneyAmountProps {
  value: number
  /** Display size variant */
  size?: "sm" | "md" | "lg" | "xl"
  /** Optional label above the amount */
  label?: string
  /** Optional delta amount (+/-) shown as a badge */
  delta?: number
  /** Show loading skeleton */
  loading?: boolean
  className?: string
  /** Currency prefix — default "KSh" */
  currency?: string
}

const sizeMap = {
  sm: "text-xl md:text-2xl",
  md: "text-2xl md:text-3xl",
  lg: "text-3xl md:text-4xl",
  xl: "text-4xl md:text-5xl",
}

export function MoneyAmount({
  value,
  size = "lg",
  label,
  delta,
  loading = false,
  className,
  currency = "KSh",
}: MoneyAmountProps) {
  const formatted = value.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  if (loading) {
    return (
      <div className={cn("space-y-1.5", className)}>
        {label && (
          <div className="h-3.5 w-24 rounded-full bg-muted animate-pulse" />
        )}
        <div className="h-10 w-40 rounded-xl bg-muted animate-pulse" />
      </div>
    )
  }

  return (
    <div className={cn("space-y-0.5", className)}>
      {label && (
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
      )}
      <div className="flex items-baseline gap-2.5">
        <span className="text-sm font-medium text-muted-foreground mr-0.5">
          {currency}
        </span>
        <span
          className={cn(
            "font-bold tracking-tighter text-foreground stat-num",
            sizeMap[size]
          )}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {formatted}
        </span>
        {delta !== undefined && (
          <span
            className={cn(
              "text-xs font-semibold px-1.5 py-0.5 rounded-full",
              delta >= 0
                ? "bg-brand-muted text-brand"
                : "bg-destructive/10 text-destructive"
            )}
          >
            {delta >= 0 ? "+" : ""}
            {delta.toLocaleString("en-KE", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </span>
        )}
      </div>
    </div>
  )
}
