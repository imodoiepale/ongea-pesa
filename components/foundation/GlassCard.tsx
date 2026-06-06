/**
 * GlassCard — Double-Bezel nested frosted card for .surface-voice screens.
 *
 * Implements the "Doppelrand / nested architecture" from high-end-visual-design:
 *   Outer shell: subtle bg tint + hairline ring + padding
 *   Inner core:  distinct bg + inset highlight + smaller concentric radius
 *
 * Only use on voice/hero/onboarding screens (.surface-voice wrapper).
 * On money screens, use the plain shadcn <Card> or .card-hairline instead.
 *
 * Usage:
 *   <GlassCard>…content…</GlassCard>
 *   <GlassCard glow>…voice orb…</GlassCard>
 *   <GlassCard size="lg" className="p-8">…</GlassCard>
 */

import { cn } from "@/lib/utils"

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  /** Enable the neon-green glow ring (voice active state) */
  glow?: boolean
  /** Outer radius scale */
  size?: "sm" | "md" | "lg"
}

const outerRadius = { sm: "rounded-2xl", md: "rounded-3xl", lg: "rounded-[2rem]" }
const innerRadius = {
  sm: "rounded-[calc(1rem-0.375rem)]",
  md: "rounded-[calc(1.5rem-0.375rem)]",
  lg: "rounded-[calc(2rem-0.375rem)]",
}

export function GlassCard({
  children,
  className,
  glow = false,
  size = "md",
}: GlassCardProps) {
  return (
    /* Outer shell */
    <div
      className={cn(
        "p-1.5",
        "bg-white/5 dark:bg-black/10",
        "border border-white/10 dark:border-white/6",
        outerRadius[size],
        glow &&
          "shadow-[0_0_30px_rgba(0,255,136,0.2),0_0_60px_rgba(0,255,136,0.08)]",
        "transition-all duration-500",
        className
      )}
    >
      {/* Inner core */}
      <div
        className={cn(
          "glass-card w-full h-full",
          innerRadius[size],
          // Inset highlight — simulates glass catching light from above
          "shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]"
        )}
      >
        {children}
      </div>
    </div>
  )
}
