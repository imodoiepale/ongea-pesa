"use client"

import type { ReactNode } from "react"
import Sidebar from "./dashboard-sidebar"
import TopNav from "./dashboard-top-nav"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import WaveAnimation from "./wave-animation"

interface LayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: LayoutProps) {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className={`flex h-screen ${theme === "dark" ? "dark" : ""} relative overflow-hidden`}>
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-5 dark:opacity-10">
        <WaveAnimation />
      </div>

      <Sidebar />
      <div className="w-full flex flex-1 flex-col relative z-10">
        <header className="h-16 border-b border-gray-200 dark:border-gray-700/50 bg-white/80 dark:bg-[#0A1A2A]/90 backdrop-blur-sm">
          <TopNav />
        </header>
        <main className="flex-1 overflow-auto p-6 pb-24 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-[#0A1A2A] dark:via-[#0F2027] dark:to-[#203A43]">
          {children}
        </main>
      </div>
    </div>
  )
}
