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
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [time, setTime] = useState(0)

  useEffect(() => {
    const currentIndex = navItems.findIndex((item) => currentScreen === item.screen)
    if (currentIndex !== -1) {
      setActiveIndex(currentIndex)
    }
  }, [currentScreen])

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      setIsVisible(currentScrollY <= lastScrollY || currentScrollY < 100)
      setLastScrollY(currentScrollY)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [lastScrollY])

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
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "transition-all duration-700 ease-out",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0",
      )}
    >
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

        {/* Navigation items grid */}
        <div className="relative grid grid-cols-6 gap-0">
          {navItems.map((item, index) => {
            const isActive = index === activeIndex
            const Icon = item.icon
            const elegantFloat = Math.sin(time * 2 + index * 0.5) * 1.5 // Subtle floating
            const iconPulse = isActive ? 1 + Math.sin(time * 4) * 0.05 : 1 // Gentle pulse

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item, index)}
                className={cn(
                  "relative flex flex-col items-center justify-center group",
                  "h-20 transition-all duration-500 ease-out",
                  "hover:bg-gray-50/50 dark:hover:bg-white/5",
                  "focus:outline-none focus:bg-gray-50/50 dark:focus:bg-white/5",
                  "active:scale-95",
                )}
                style={{
                  transform: `translateY(${elegantFloat}px)`,
                }}
              >
                {/* Elegant hover glow */}
                <div
                  className={cn(
                    "absolute inset-0 rounded-none bg-gradient-to-t from-gray-100/50 to-transparent dark:from-white/5 dark:to-transparent",
                    "opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                  )}
                />

                {/* Premium active state background */}
                {isActive && (
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-[#00FF88]/10 via-[#00D4AA]/5 to-transparent dark:from-[#00FF88]/20 dark:via-[#00D4AA]/10 dark:to-transparent"
                    style={{
                      opacity: 0.6 + Math.sin(time * 2) * 0.2,
                    }}
                  />
                )}

                {/* Sophisticated icon container */}
                <div
                  className={cn(
                    "relative z-10 transition-all duration-300 mb-1",
                    "p-2 rounded-xl",
                    isActive
                      ? "bg-gradient-to-br from-[#00FF88]/20 to-[#00D4AA]/20 dark:from-[#00FF88]/30 dark:to-[#00D4AA]/30"
                      : "bg-transparent group-hover:bg-gray-100/50 dark:group-hover:bg-white/10",
                  )}
                  style={{
                    transform: `scale(${iconPulse})`,
                  }}
                >
                  {/* Elegant rotating border for active item */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-xl">
                      <div
                        className="absolute inset-0 rounded-xl border border-[#00FF88]/30 dark:border-[#00FF88]/50"
                        style={{
                          transform: `rotate(${time * 30}deg)`,
                          opacity: 0.6 + Math.sin(time * 3) * 0.4,
                        }}
                      />
                    </div>
                  )}

                  <Icon
                    className={cn(
                      "w-6 h-6 transition-all duration-300",
                      isActive
                        ? "text-[#00FF88] dark:text-[#00FF88]"
                        : "text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200",
                    )}
                  />
                </div>

                {/* Refined typography */}
                <span
                  className={cn(
                    "text-xs font-medium transition-all duration-300 tracking-wide",
                    isActive
                      ? "text-[#00FF88] dark:text-[#00FF88] font-semibold"
                      : "text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200",
                  )}
                  style={{
                    transform: isActive ? `scale(${1 + Math.sin(time * 2) * 0.02})` : "scale(1)",
                  }}
                >
                  {item.label}
                </span>

                {/* Subtle ripple effect */}
                <div
                  className={cn(
                    "absolute inset-0 bg-[#00FF88]/10 dark:bg-[#00FF88]/20",
                    "scale-0 rounded-full transition-transform duration-500",
                    "active:scale-150 active:opacity-30",
                  )}
                />

                {/* Elegant particle system for active item */}
                {isActive && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(3)].map((_, i) => {
                      const angle = (time * 1.5 + i * 2) * 0.5
                      const radius = 15 + Math.sin(time * 2 + i) * 3
                      const x = Math.cos(angle) * radius
                      const y = Math.sin(angle) * radius

                      return (
                        <div
                          key={i}
                          className="absolute w-0.5 h-0.5 bg-[#00FF88] rounded-full opacity-60"
                          style={{
                            left: `calc(50% + ${x}px)`,
                            top: `calc(50% + ${y}px)`,
                            transform: `scale(${0.5 + Math.sin(time * 3 + i) * 0.3})`,
                          }}
                        />
                      )
                    })}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Sophisticated ambient particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(8)].map((_, i) => {
            const x = (i / 8) * 100
            const y = 50 + Math.sin(time * 1.2 + i * 0.8) * 20
            const opacity = 0.1 + Math.sin(time * 2 + i) * 0.05

            return (
              <div
                key={i}
                className="absolute w-px h-px bg-[#00FF88] rounded-full"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  opacity,
                  transform: `scale(${0.5 + Math.sin(time * 1.8 + i) * 0.3})`,
                }}
              />
            )
          })}
        </div>

        {/* Premium bottom edge accent */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00FF88]/30 to-transparent"
          style={{
            opacity: 0.5 + Math.sin(time * 1.5) * 0.3,
          }}
        />
      </div>

      {/* Elegant safe area for devices with home indicators */}
      <div className="h-safe-area-inset-bottom bg-white/95 dark:bg-black/90 backdrop-blur-3xl" />
    </div>
  )
}
