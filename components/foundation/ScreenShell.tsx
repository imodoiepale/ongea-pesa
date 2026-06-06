/**
 * ScreenShell — responsive container for every screen.
 *
 * Mobile  : full-width, px-4
 * Tablet  : centered, max-w-2xl, px-6
 * Desktop : centered, max-w-5xl, px-8 (two-column grid optional via `wide` prop)
 *
 * Usage:
 *   <ScreenShell>…content…</ScreenShell>
 *   <ScreenShell surface="money">…</ScreenShell>
 *   <ScreenShell surface="voice">…</ScreenShell>
 */

import { cn } from "@/lib/utils"

interface ScreenShellProps {
  children: React.ReactNode
  className?: string
  /** Apply the .surface-money or .surface-voice composable class */
  surface?: "money" | "voice" | "none"
  /** If true, allows a wider desktop layout (max-w-6xl) */
  wide?: boolean
}

export function ScreenShell({
  children,
  className,
  surface = "none",
  wide = false,
}: ScreenShellProps) {
  return (
    <div
      className={cn(
        // Surface mode — rebinds CSS vars for the two aesthetic modes
        surface === "money" && "surface-money",
        surface === "voice" && "surface-voice",
        // Responsive container: phone column → tablet → desktop grid-ready
        "mx-auto w-full px-4 md:px-6 lg:px-8",
        wide ? "max-w-6xl" : "max-w-md md:max-w-2xl lg:max-w-5xl",
        className
      )}
    >
      {children}
    </div>
  )
}
