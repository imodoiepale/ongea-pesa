"use client"

import { useState, useEffect } from "react"
import { Home, BarChart3, Mic, Camera, Send, Layout } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  id: string
  icon: any
  label: string
  screen: string
  gradient: string
}

interface FuturisticBottomNavProps {
  currentScreen?: string
  onNavigate?: (screen: string) => void
}

const navItems: NavItem[] = [
  {
    id: "dashboard",
    icon: Home,
    label: "Home",
    screen: "dashboard",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    id: "detailed",
    icon: Layout,
    label: "Dashboard",
    screen: "detailed",
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    id: "voice",
    icon: Mic,
    label: "Voice",
    screen: "voice",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    id: "send",
    icon: Send,
    label: "Send",
    screen: "send",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    id: "scanner",
    icon: Camera,
    label: "Scan",
    screen: "scanner",
    gradient: "from-orange-500 to-red-500",
  },
  {
    id: "analytics",
    icon: BarChart3,
    label: "Stats",
    screen: "analytics",
    gradient: "from-indigo-500 to-purple-500",
  },
]

export default function FuturisticBottomNav({ currentScreen = "dashboard", onNavigate }: FuturisticBottomNavProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [time, setTime] = useState(0)

  useEffect(() => {
    const currentIndex = navItems.findIndex((item) => currentScreen === item.screen)
    if (currentIndex !== -1) {
      setActiveIndex(currentIndex)
    }
  }, [currentScreen])

  // Animation timer for elegant sine wave effects
  useEffect(() => {
    const interval = setInterval(() => {
      setTime((prev) => prev + 0.05) // Slower, more elegant timing
    }, 50)
    return () => clearInterval(interval)
  }, [])

  const handleNavClick = (item: NavItem, index: number) => {
    setActiveIndex(index)
    if (onNavigate) {
      onNavigate(item.screen)
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 transition-all duration-700 ease-out">
      {/* Elegant top glow effect */}
      <div
        className="absolute -top-8 left-0 right-0 h-8 bg-gradient-to-t from-black/20 via-black/5 to-transparent dark:from-white/10 dark:via-white/2 dark:to-transparent"
        style={{
          opacity: 0.8 + Math.sin(time * 2) * 0.2,
        }}
      />

      {/* Premium glassmorphism container */}
      <div className="relative bg-white/95 dark:bg-black/90 backdrop-blur-3xl border-t border-gray-200/50 dark:border-white/10 shadow-2xl">
        {/* Subtle animated gradient overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 dark:from-blue-400/10 dark:via-purple-400/10 dark:to-pink-400/10"
          style={{
            background: `linear-gradient(${90 + time * 10}deg, rgba(59, 130, 246, 0.03), rgba(168, 85, 247, 0.03), rgba(236, 72, 153, 0.03))`,
            opacity: 0.7 + Math.sin(time * 1.5) * 0.3,
          }}
        />

        {/* Elegant active indicator */}
        <div
          className={cn(
            "absolute top-0 h-1 bg-gradient-to-r from-[#00FF88] via-[#00D4AA] to-[#00FF88]",
            "transition-all duration-500 ease-out shadow-lg",
            "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent",
          )}
          style={{
            left: `${(activeIndex / navItems.length) * 100}%`,
            width: `${100 / navItems.length}%`,
            transform: `scaleX(${0.8 + Math.sin(time * 3) * 0.1})`,
            boxShadow: `0 0 20px rgba(0, 255, 136, ${0.4 + Math.sin(time * 2) * 0.2})`,
          }}
        />

        {/* Navigation items */}
        <div className="grid grid-cols-6 relative">
          {navItems.map((item, index) => {
            const isActive = index === activeIndex
            const Icon = item.icon
            const distance = Math.abs(index - activeIndex)
            const sineOffset = Math.sin(time * 2 + index * 0.5) * (isActive ? 8 : 3)
            const rotationOffset = Math.sin(time * 1.5 + index * 0.3) * (isActive ? 15 : 5)

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item, index)}
                className={cn(
                  "relative flex flex-col items-center justify-center py-4 px-2 transition-all duration-500 ease-out",
                  "hover:scale-105 active:scale-95",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-transparent",
                )}
                style={{
                  transform: `translateY(${sineOffset}px) scale(${isActive ? 1.1 : 0.95 + distance * -0.05})`,
                }}
              >
                {/* Sophisticated icon container */}
                <div
                  className={cn(
                    "relative w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-500",
                    isActive
                      ? "bg-gradient-to-br from-[#00FF88]/20 to-[#00D4AA]/20 dark:from-[#00FF88]/30 dark:to-[#00D4AA]/30"
                      : "bg-gray-100/50 dark:bg-white/5 hover:bg-gray-200/70 dark:hover:bg-white/10",
                  )}
                  style={{
                    transform: `rotate(${rotationOffset}deg)`,
                    boxShadow: isActive
                      ? `0 8px 32px rgba(0, 255, 136, ${0.3 + Math.sin(time * 2) * 0.1})`
                      : "0 2px 8px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  {/* Premium icon with elegant animations */}
                  <Icon
                    className={cn(
                      "transition-all duration-500",
                      isActive
                        ? "text-[#00FF88] dark:text-[#00D4AA] w-5 h-5"
                        : "text-gray-600 dark:text-gray-400 w-4 h-4 hover:text-gray-800 dark:hover:text-gray-200",
                    )}
                    style={{
                      filter: isActive
                        ? `drop-shadow(0 0 8px rgba(0, 255, 136, ${0.6 + Math.sin(time * 3) * 0.2}))`
                        : "none",
                    }}
                  />

                  {/* Elegant pulse effect for active item */}
                  {isActive && (
                    <div
                      className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#00FF88]/20 to-[#00D4AA]/20"
                      style={{
                        opacity: 0.3 + Math.sin(time * 2) * 0.2,
                        transform: `scale(${1 + Math.sin(time * 3) * 0.1})`,
                      }}
                    />
                  )}
                </div>

                {/* Refined label with sophisticated typography */}
                <span
                  className={cn(
                    "text-xs font-medium mt-1 transition-all duration-500",
                    isActive ? "text-[#00FF88] dark:text-[#00D4AA] font-semibold" : "text-gray-600 dark:text-gray-400",
                  )}
                  style={{
                    opacity: isActive ? 1 : 0.7 + distance * -0.1,
                    transform: `scale(${isActive ? 1 : 0.9})`,
                    textShadow: isActive ? `0 0 8px rgba(0, 255, 136, ${0.4 + Math.sin(time * 2) * 0.2})` : "none",
                  }}
                >
                  {item.label}
                </span>

                {/* Sophisticated ripple effect on tap */}
                <div
                  className={cn(
                    "absolute inset-0 rounded-xl opacity-0 bg-gradient-to-br from-white/20 to-transparent",
                    "transition-opacity duration-300 pointer-events-none",
                  )}
                />
              </button>
            )
          })}
        </div>

        {/* Elegant bottom safe area */}
        <div className="h-safe-area-inset-bottom bg-gradient-to-t from-black/5 to-transparent dark:from-white/5" />
      </div>
    </div>
  )
}
