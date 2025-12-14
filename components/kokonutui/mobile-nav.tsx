"use client"

import { Home, Mic, Users, ShieldCheck, Wallet, MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useState } from "react"

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/dashboard", icon: Mic, label: "Voice" },
  { href: "/chama", icon: Users, label: "Chama" },
  { href: "/escrow", icon: ShieldCheck, label: "Escrow" },
  { href: "/transactions", icon: Wallet, label: "Wallet" },
]

export default function MobileNav() {
  const pathname = usePathname()
  const [showMore, setShowMore] = useState(false)

  // Don't show on auth pages
  if (pathname?.startsWith("/login") || pathname?.startsWith("/signup") || pathname?.startsWith("/auth")) {
    return null
  }

  return (
    <>
      {/* Bottom Navigation Bar - Mobile Only */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/" && pathname?.startsWith(item.href))
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors",
                  isActive 
                    ? "text-emerald-600 dark:text-emerald-400" 
                    : "text-zinc-500 dark:text-zinc-400"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 transition-transform",
                  isActive && "scale-110"
                )} />
                <span className={cn(
                  "text-[10px] font-medium",
                  isActive && "font-semibold"
                )}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Spacer to prevent content from being hidden behind nav */}
      <div className="lg:hidden h-16" />
    </>
  )
}
