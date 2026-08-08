"use client"

import {
  BarChart2,
  Receipt,
  Building2,
  CreditCard,
  Folder,
  Wallet,
  Users2,
  Shield,
  MessagesSquare,
  Video,
  Settings,
  HelpCircle,
  Menu,
  ShieldCheck,
  UsersRound,
  TrendingDown,
  Coins,
  Languages,
} from "lucide-react"

import { Home } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export default function Sidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  function handleNavigation() {
    setIsMobileMenuOpen(false)
  }

  function NavItem({
    href,
    icon: Icon,
    children,
  }: {
    href: string
    icon: any
    children: React.ReactNode
  }) {
    const pathname = usePathname()
    const isActive = pathname === href || (href !== "/" && pathname?.startsWith(href))
    return (
      <Link
        href={href}
        onClick={handleNavigation}
        className={cn(
          "flex items-center px-3 py-2 text-sm rounded-md transition-colors",
          isActive
            ? "bg-brand/10 text-brand font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
      >
        <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
        {children}
      </Link>
    )
  }

  return (
    <>
      <button
        type="button"
        className="lg:hidden fixed top-4 left-4 z-[70] p-2 rounded-lg bg-card shadow-md"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu className="h-5 w-5 text-muted-foreground" />
      </button>
      <nav
        className={`
                fixed inset-y-0 left-0 z-[70] w-64 bg-card transform transition-transform duration-200 ease-in-out
                lg:translate-x-0 lg:static lg:w-64 border-r border-border
                ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
            `}
      >
        <div className="h-full flex flex-col">
          <Link
            href="/"
            className="h-16 px-6 flex items-center border-b border-border"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center">
                <span className="text-white font-bold text-sm">OP</span>
              </div>
              <span className="text-lg font-semibold hover:cursor-pointer text-foreground">
                Ongea Pesa
              </span>
            </div>
          </Link>

          <div className="flex-1 overflow-y-auto py-4 px-4">
            <div className="space-y-6">
              <div>
                <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Overview
                </div>
                <div className="space-y-1">
                  <NavItem href="/" icon={Home}>
                    Home
                  </NavItem>
                  <NavItem href="/admin-analytics" icon={BarChart2}>
                    Dashboard
                  </NavItem>
                  <NavItem href="/admin-analytics/economics" icon={Coins}>
                    Economics
                  </NavItem>
                  <NavItem href="/admin-analytics/revenue" icon={CreditCard}>
                    Revenue
                  </NavItem>
                  <NavItem href="/admin-analytics/transaction-costs" icon={TrendingDown}>
                    Transaction Costs
                  </NavItem>
                  <NavItem href="/admin-analytics/sheng-review" icon={Languages}>
                    Sheng Review
                  </NavItem>
                  <NavItem href="/admin-analytics/feedback" icon={MessagesSquare}>
                    Feedback
                  </NavItem>
                </div>
              </div>

              <div>
                <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Payments
                </div>
                <div className="space-y-1">
                  <NavItem href="/admin-analytics/transactions" icon={Wallet}>
                    Transactions
                  </NavItem>
                  <NavItem href="/admin-analytics/mpesa-history" icon={Receipt}>
                    M-Pesa History
                  </NavItem>
                  <NavItem href="/admin-analytics/wallet-transfers" icon={CreditCard}>
                    Wallet Transfers
                  </NavItem>
                </div>
              </div>

              <div>
                <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Groups
                </div>
                <div className="space-y-1">
                  <NavItem href="/admin-analytics/escrows" icon={ShieldCheck}>
                    Escrows
                  </NavItem>
                  <NavItem href="/admin-analytics/chamas" icon={UsersRound}>
                    Chamas
                  </NavItem>
                </div>
              </div>

              <div>
                <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Users
                </div>
                <div className="space-y-1">
                  <NavItem href="/admin-analytics/users" icon={Users2}>
                    All Users
                  </NavItem>
                  <NavItem href="/admin-analytics/settings" icon={Shield}>
                    Admin Settings
                  </NavItem>
                  <NavItem href="/admin-analytics/voice-sessions" icon={MessagesSquare}>
                    Voice Sessions
                  </NavItem>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 py-4 border-t border-border">
            <div className="space-y-1">
              <NavItem href="#" icon={Settings}>
                Settings
              </NavItem>
              <NavItem href="#" icon={HelpCircle}>
                Help
              </NavItem>
            </div>
          </div>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[65] lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}
