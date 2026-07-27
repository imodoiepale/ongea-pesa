"use client"

import Image from "next/image"
import { AudioLines } from "lucide-react"
import { cn } from "@/lib/utils"

export function OrbitalMark({ className }: { className?: string }) {
  return (
    <span className={cn("orbital-mark h-10 w-10", className)} aria-hidden="true">
      <Image
        src="/brand/logos/orb-emblem.png"
        alt=""
        fill
        sizes="48px"
        className="object-contain"
      />
    </span>
  )
}

export function OngeaWordmark({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("ongea-wordmark", compact ? "is-compact" : undefined, className)}>
      <Image
        src="/brand/logos/ongea-pesa-logo.webp"
        alt="Ongea Pesa by NSAIT"
        width={1920}
        height={819}
        sizes={compact ? "150px" : "220px"}
        priority={!compact}
      />
    </div>
  )
}

export function VoiceCore({ className, priority = false }: { className?: string; priority?: boolean }) {
  return (
    <div className={cn("voice-core", className)}>
      <Image src="/brand/orbital/voice-core-dark.webp" alt="Luminous Ongea Pesa voice orb" fill sizes="(max-width: 768px) 82vw, 420px" priority={priority} className="object-contain" />
    </div>
  )
}

export function VoiceGlyph({ active = false }: { active?: boolean }) {
  return <span className={cn("voice-glyph", active && "is-active")} aria-hidden="true"><AudioLines className="h-5 w-5" strokeWidth={1.6} /></span>
}
