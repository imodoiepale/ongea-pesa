/**
 * Canonical mobile bottom-nav item definitions.
 * Single source of truth used by both:
 *   - components/ongea-pesa/app.tsx   (SPA state-switch shell at /dashboard)
 *   - components/ongea-pesa/transaction-history.tsx  (standalone route)
 *   - any future standalone route pages that need the nav
 */
import { Home, Mic, Users, ShieldCheck, Wallet } from "lucide-react"
import type { FluidNavItem } from "./FluidNav"

export const mobileNavItems: FluidNavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: Home, label: "Home", isInternal: true },
  { key: "voice", href: "/voice", icon: Mic, label: "Voice", isInternal: true },
  { key: "chama", href: "/chama", icon: Users, label: "Chama" },
  { key: "escrow", href: "/escrow", icon: ShieldCheck, label: "Escrow" },
  { key: "transactions", href: "/wallet", icon: Wallet, label: "Wallet" },
]
