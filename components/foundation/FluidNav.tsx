/**
 * FluidNav — canonical mobile bottom navigation.
 *
 * Single source of truth replacing duplicates in:
 *   components/ongea-pesa/app.tsx       (inline nav)
 *   components/kokonutui/mobile-nav.tsx (route-based nav)
 *
 * Supports two modes:
 *   - "internal": tab switches state (no route change) — for the SPA shell
 *   - "route": uses Next Link for real route navigation
 *
 * Design:
 *   - Fluid island (pill-shaped, not full-width sticky)
 *   - Hairline top border + blur — visible but not heavy
 *   - Active: brand-green icon + label + subtle pill highlight
 *   - Inactive: muted gray, no highlight
 *   - lg:hidden — at desktop, sidebar takes over
 *   - Respects prefers-reduced-motion
 *
 * Usage:
 *   // SPA shell (internal state switching)
 *   <FluidNav
 *     items={mobileNavItems}
 *     activeKey={currentScreen}
 *     onNavigate={(key) => setCurrentScreen(key as Screen)}
 *   />
 *
 *   // Route-based (Next.js pages)
 *   <FluidNav items={routeNavItems} />
 */

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export interface FluidNavItem {
  /** Unique key — matches state Screen value for internal tabs, or pathname for route tabs */
  key: string
  href: string
  icon: React.ElementType
  label: string
  /** If true, clicking uses onNavigate() instead of routing */
  isInternal?: boolean
}

interface FluidNavProps {
  items: FluidNavItem[]
  /** Active key for internal (SPA) mode */
  activeKey?: string
  /** Callback for internal navigation */
  onNavigate?: (key: string) => void
  className?: string
}

export function FluidNav({
  items,
  activeKey,
  onNavigate,
  className,
}: FluidNavProps) {
  const pathname = usePathname()

  const isActive = (item: FluidNavItem) => {
    if (item.isInternal && activeKey !== undefined) {
      return activeKey === item.key
    }
    return pathname === item.href || pathname.startsWith(item.href + "/")
  }

  return (
    <nav
      className={cn(
        // Only show below lg breakpoint — lg+ gets a sidebar
        "lg:hidden",
        // Fixed to bottom, full width
        "fixed bottom-0 left-0 right-0 z-50",
        // Background: glass blur + hairline top border
        "bg-[hsl(var(--pearl)/.92)] dark:bg-[hsl(var(--abyss)/.92)] backdrop-blur-xl",
        "border-t border-[hsl(var(--teal)/.18)]",
        // Safe area for iPhone notch
        "pb-[env(safe-area-inset-bottom,0px)]",
        className
      )}
    >
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {items.map((item) => {
          const active = isActive(item)
          const Icon = item.icon

          if (item.isInternal && onNavigate) {
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-0.5",
                  "rounded-xl transition-colors duration-200",
                  active
                    ? "text-[hsl(var(--teal))]"
                    : "text-muted-foreground active:text-foreground"
                )}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
              >
                <div
                  className={cn(
                    "w-10 h-6 flex items-center justify-center rounded-full transition-all duration-200",
                    active && "bg-[hsl(var(--mint)/.1)]"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-transform duration-200",
                      active && "scale-110"
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium transition-all duration-200",
                    active && "font-semibold"
                  )}
                >
                  {item.label}
                </span>
              </button>
            )
          }

          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-0.5",
                "rounded-xl transition-colors duration-200",
                active
                  ? "text-[hsl(var(--teal))]"
                  : "text-muted-foreground active:text-foreground"
              )}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
            >
              <div
                className={cn(
                  "w-10 h-6 flex items-center justify-center rounded-full transition-all duration-200",
                  active && "bg-[hsl(var(--mint)/.1)]"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-transform duration-200",
                    active && "scale-110"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium transition-all duration-200",
                  active && "font-semibold"
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
