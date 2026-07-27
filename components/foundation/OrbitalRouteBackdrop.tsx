"use client"

import { usePathname } from "next/navigation"
import { OrbitalBackdrop } from "./OrbitalBackdrop"
import type { OrbitalBackdropScene } from "./orbital-backgrounds"

function sceneForPath(pathname: string): OrbitalBackdropScene | null {
  if (pathname.startsWith("/admin")) return null
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/auth") ||
    pathname.includes("profile-creation") ||
    pathname.includes("welcome")
  ) return "auth"
  if (pathname.startsWith("/voice") || pathname.includes("voice-calibration")) return "voice"
  if (pathname.startsWith("/scanner")) return "scanner"
  if (pathname.startsWith("/chama")) return "chama"
  if (pathname.startsWith("/escrow") || pathname.includes("security-setup")) return "escrow"
  if (
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/scheduler") ||
    pathname.startsWith("/batch")
  ) return "planning"
  if (
    pathname.startsWith("/settings") ||
    pathname.startsWith("/support") ||
    pathname.includes("permissions")
  ) return "trust"
  if (
    pathname.startsWith("/wallet") ||
    pathname.startsWith("/transactions") ||
    pathname.startsWith("/payments")
  ) return "wallet"
  return "voice"
}

export function OrbitalRouteBackdrop() {
  const pathname = usePathname()
  const scene = sceneForPath(pathname)
  return scene ? <OrbitalBackdrop scene={scene} priority /> : null
}
