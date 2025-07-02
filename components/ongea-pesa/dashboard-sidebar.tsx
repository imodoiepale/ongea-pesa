"use client"

import { useState } from "react"
import {
  Home,
  Send,
  Receipt,
  BarChart3,
  Users,
  Settings,
  Shield,
  Mic,
  X,
  ChevronRight,
  Wallet,
  CreditCard,
  Building2,
  Phone,
  History,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface DashboardSidebarProps {
  onClose?: () => void
}

export function DashboardSidebar({ onClose }: DashboardSidebarProps) {
  const [activeItem, setActiveItem] = useState("dashboard")

  const navigationItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: Home,
      badge: null,
    },
    {
      id: "send",
      label: "Send Money",
      icon: Send,
      badge: null,
    },
    {
      id: "scanner",
      label: "Payment Scanner",
      icon: Receipt,
      badge: "New",
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: BarChart3,
      badge: null,
    },
    {
      id: "contacts",
      label: "Contacts",
      icon: Users,
      badge: "12",
    },
    {
      id: "transactions",
      label: "Transactions",
      icon: History,
      badge: null,
    },
  ]

  const quickActions = [
    {
      id: "mpesa",
      label: "M-Pesa",
      icon: Phone,
      color: "bg-green-500",
    },
    {
      id: "bank",
      label: "Bank Transfer",
      icon: Building2,
      color: "bg-blue-500",
    },
    {
      id: "card",
      label: "Card Payment",
      icon: CreditCard,
      color: "bg-purple-500",
    },
    {
      id: "wallet",
      label: "Digital Wallet",
      icon: Wallet,
      color: "bg-orange-500",
    },
  ]

  const bottomItems = [
    {
      id: "security",
      label: "Security",
      icon: Shield,
      badge: null,
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      badge: null,
    },
  ]

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Mic className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Ongea Pesa</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Voice Payments</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Main Navigation */}
        <nav className="p-4 space-y-2">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Main Menu
          </div>
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveItem(item.id)}
              className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                activeItem === item.id
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }`}
            >
              <div className="flex items-center space-x-3">
                <item.icon className="h-5 w-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <div className="flex items-center space-x-2">
                {item.badge && (
                  <Badge variant={item.badge === "New" ? "default" : "secondary"} className="text-xs px-2 py-0">
                    {item.badge}
                  </Badge>
                )}
                <ChevronRight className="h-4 w-4 opacity-50" />
              </div>
            </button>
          ))}
        </nav>

        {/* Quick Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Quick Actions
          </div>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.id}
                className="flex flex-col items-center p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className={`w-8 h-8 ${action.color} rounded-lg flex items-center justify-center mb-2`}>
                  <action.icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Account Info */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-3">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">JD</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">John Doe</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">+254 712 345 678</p>
              </div>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Balance: <span className="font-semibold text-green-600 dark:text-green-400">KSh 15,420</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-2">
        {bottomItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveItem(item.id)}
            className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
              activeItem === item.id
                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            }`}
          >
            <div className="flex items-center space-x-3">
              <item.icon className="h-5 w-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            <ChevronRight className="h-4 w-4 opacity-50" />
          </button>
        ))}
      </div>
    </div>
  )
}
