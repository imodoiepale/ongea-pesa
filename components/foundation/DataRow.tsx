/**
 * DataRow — clean label/value pair with hairline divider.
 *
 * Used in: transaction detail, send-money confirmation, chama ledger,
 * escrow milestone list, admin tables.
 *
 * Usage:
 *   <DataRow label="To" value="John Kamau" />
 *   <DataRow label="Amount" value="KSh 500" valueClassName="font-semibold text-foreground" />
 *   <DataRow label="Status" value={<Badge>Completed</Badge>} />
 *   <DataRows>
 *     <DataRow label="To" value="John" />
 *     <DataRow label="Amount" value="500" />
 *   </DataRows>
 */

import { cn } from "@/lib/utils"

interface DataRowProps {
  label: string
  value: React.ReactNode
  labelClassName?: string
  valueClassName?: string
  className?: string
  /** Hide the bottom hairline divider on the last row */
  noDivider?: boolean
}

export function DataRow({
  label,
  value,
  labelClassName,
  valueClassName,
  className,
  noDivider = false,
}: DataRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-3",
        !noDivider && "border-b border-border/50 last:border-b-0",
        className
      )}
    >
      <span
        className={cn("text-sm text-muted-foreground", labelClassName)}
      >
        {label}
      </span>
      <span
        className={cn(
          "text-sm text-foreground text-right max-w-[60%] truncate",
          valueClassName
        )}
      >
        {value}
      </span>
    </div>
  )
}

/**
 * DataRows — container that groups DataRow items with a shared card style.
 */
interface DataRowsProps {
  children: React.ReactNode
  className?: string
  title?: string
}

export function DataRows({ children, className, title }: DataRowsProps) {
  return (
    <div className={cn("space-y-0", className)}>
      {title && (
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
          {title}
        </p>
      )}
      <div className="rounded-2xl border border-border/60 bg-card px-4 divide-y divide-border/40">
        {children}
      </div>
    </div>
  )
}
