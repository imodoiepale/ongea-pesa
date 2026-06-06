/**
 * PageHeader — canonical title + optional actions header.
 *
 * Kills the duplicate-<h1> bug in main-dashboard.tsx (h1 appeared twice
 * because the VoiceTest card accidentally re-used the app title).
 *
 * Usage:
 *   <PageHeader title="Ongea Pesa" subtitle="Voice-First Financial Companion">
 *     <Button size="icon-sm" variant="ghost">…</Button>
 *   </PageHeader>
 */

import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  subtitle?: string
  /** Slot for action buttons (right side) */
  children?: React.ReactNode
  className?: string
  /** Pass true on the real app shell — renders as h1. Pass false for section headers. */
  asPageTitle?: boolean
}

export function PageHeader({
  title,
  subtitle,
  children,
  className,
  asPageTitle = true,
}: PageHeaderProps) {
  const TitleTag = asPageTitle ? "h1" : "h2"

  return (
    <header
      className={cn(
        "flex items-center justify-between gap-3 pt-4 pb-2",
        className
      )}
    >
      <div className="min-w-0">
        <TitleTag
          className={cn(
            "font-semibold tracking-tight text-foreground truncate",
            asPageTitle ? "text-xl md:text-2xl" : "text-lg"
          )}
        >
          {title}
        </TitleTag>
        {subtitle && (
          <p className="text-[13px] text-muted-foreground mt-0.5 truncate">
            {subtitle}
          </p>
        )}
      </div>

      {children && (
        <div className="flex items-center gap-1.5 shrink-0">{children}</div>
      )}
    </header>
  )
}
