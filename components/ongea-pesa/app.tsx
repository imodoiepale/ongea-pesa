"use client"

import { useState, useEffect } from "react"
import { ThemeProvider } from "next-themes"
import Dashboard from "./dashboard"
import VoiceInterface from "./voice-interface"
import SendMoney from "./send-money"
import PaymentScanner from "./payment-scanner"
import Analytics from "./analytics"
import SecurityManager from "./security-manager"
import FuturisticBottomNav from "./futuristic-bottom-nav"
import MainDashboard from "./main-dashboard"

type Screen = "dashboard" | "detailed" | "voice" | "send" | "scanner" | "analytics" | "security"

export default function OngeaPesaApp() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("dashboard")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case "dashboard":
        return <MainDashboard onNavigate={setCurrentScreen} onVoiceActivate={() => {}} />
      case "detailed":
        return <Dashboard />
      case "voice":
        return <VoiceInterface onNavigate={setCurrentScreen} isListening={false} setIsListening={() => {}} />
      case "send":
        return <SendMoney onNavigate={setCurrentScreen} />
      case "scanner":
        return <PaymentScanner onNavigate={setCurrentScreen} />
      case "analytics":
        return <Analytics onNavigate={setCurrentScreen} />
      case "security":
        return <SecurityManager onNavigate={setCurrentScreen} />
      default:
        return <MainDashboard onNavigate={setCurrentScreen} onVoiceActivate={() => {}} />
    }
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 relative overflow-hidden">
        {/* Main Content */}
        <main className="pb-24">{renderScreen()}</main>

        {/* Bottom Navigation */}
        <FuturisticBottomNav
          currentScreen={currentScreen}
          onNavigate={(screen) => setCurrentScreen(screen as Screen)}
        />
      </div>
    </ThemeProvider>
  )
}
