"use client"

import type React from "react"

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
  Mic,
  Camera,
  Calendar,
} from "lucide-react"

import { Home } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export default function DashboardSidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  function handleNavigation() {
    setIsMobileMenuOpen(false)
  }

  function NavItem({
    href,
    icon: Icon,
    children,
    isActive = false,
  }: {
    href: string
    icon: any
    children: React.ReactNode
    isActive?: boolean
  }) {
    return (
      <Link
        href={href}
        onClick={handleNavigation}
        className={`flex items-center px-3 py-2 text-sm rounded-md transition-all duration-200 ${
          isActive
            ? "bg-gradient-to-r from-green-500/20 to-blue-600/20 dark:from-[#00FF88]/20 dark:to-[#00D4AA]/20 text-green-600 dark:text-[#00FF88] border-l-2 border-green-500 dark:border-[#00FF88]"
            : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50"
        }`}
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
        className="lg:hidden fixed top-4 left-4 z-[70] p-2 rounded-lg bg-white/90 dark:bg-[#0A1A2A]/90 backdrop-blur-sm shadow-md"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      </button>
      <nav
        className={`
                fixed inset-y-0 left-0 z-[70] w-64 bg-white/90 dark:bg-[#0A1A2A]/90 backdrop-blur-sm transform transition-transform duration-200 ease-in-out
                lg:translate-x-0 lg:static lg:w-64 border-r border-gray-200 dark:border-gray-700/50
                ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
            `}
      >
        <div className="h-full flex flex-col">
          <Link href="/" className="h-16 px-6 flex items-center border-b border-gray-200 dark:border-gray-700/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 dark:from-[#00FF88] dark:to-[#00D4AA] rounded-lg flex items-center justify-center">
                <Mic className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-semibold hover:cursor-pointer text-gray-900 dark:text-white">
                Ongea Pesa
              </span>
            </div>
          </Link>

          <div className="flex-1 overflow-y-auto py-4 px-4">
            <div className="space-y-6">
              <div>
                <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Overview
                </div>
                <div className="space-y-1">
                  <NavItem href="/dashboard" icon={Home} isActive>
                    Dashboard
                  </NavItem>
                  <NavItem href="#" icon={BarChart2}>
                    Analytics
                  </NavItem>
                  <NavItem href="#" icon={Building2}>
                    Organization
                  </NavItem>
                  <NavItem href="#" icon={Folder}>
                    Projects
                  </NavItem>
                </div>
              </div>

              <div>
                <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Voice Finance
                </div>
                <div className="space-y-1">
                  <NavItem href="#" icon={Mic}>
                    Voice Commands
                  </NavItem>
                  <NavItem href="#" icon={Wallet}>
                    Transactions
                  </NavItem>
                  <NavItem href="#" icon={Receipt}>
                    Bills & Payments
                  </NavItem>
                  <NavItem href="#" icon={CreditCard}>
                    M-Pesa Integration
                  </NavItem>
                  <NavItem href="#" icon={Camera}>
                    Payment Scanner
                  </NavItem>
                  <NavItem href="#" icon={Calendar}>
                    Recurring Payments
                  </NavItem>
                </div>
              </div>

              <div>
                <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Team & Support
                </div>
                <div className="space-y-1">
                  <NavItem href="#" icon={Users2}>
                    Contacts
                  </NavItem>
                  <NavItem href="#" icon={Shield}>
                    Security
                  </NavItem>
                  <NavItem href="#" icon={MessagesSquare}>
                    Voice Chat
                  </NavItem>
                  <NavItem href="#" icon={Video}>
                    Video Support
                  </NavItem>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700/50">
            <div className="space-y-1">
              <NavItem href="#" icon={Settings}>
                Settings
              </NavItem>
              <NavItem href="#" icon={HelpCircle}>
                Help & Support
              </NavItem>
            </div>
          </div>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[65] lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}
