"use client"

import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Inset-grouped list primitives, ported from DepthMe.
 *
 * Two details are what make these read as iOS rather than Android, and both are
 * easy to lose in a refactor:
 *
 *   * The divider is inset to the text column (`.og-row-divider`, 3.25rem),
 *     not full-bleed. Full-bleed rules are the Material pattern.
 *   * The icon tile is tinted from ONE colour — a 12% fill and a 20% border
 *     derived from the same hex. Every row is coloured by a single prop.
 */

export function SettingsGroup({
  caption,
  children,
}: {
  caption: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h3 className="og-list-caption">{caption}</h3>
      <div className="og-list-group">{children}</div>
    </div>
  )
}

export function SettingsRow({
  icon: Icon,
  iconColor,
  label,
  description,
  control,
  divider = true,
}: {
  icon: LucideIcon
  iconColor: string
  label: string
  description?: string
  control?: React.ReactNode
  divider?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-3",
        divider && "og-row-divider",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-[0.5rem]"
          // 1f = 12% fill, 33 = 20% border. One colour prop, two derived values.
          style={{ background: `${iconColor}1f`, border: `1px solid ${iconColor}33` }}
        >
          <Icon size={16} style={{ color: iconColor }} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[0.95rem] text-foreground">{label}</p>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {control && <div className="flex-shrink-0">{control}</div>}
    </div>
  )
}
