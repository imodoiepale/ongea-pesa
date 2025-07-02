"use client"

import { useState, useEffect } from "react"
import { ThemeProvider } from "next-themes"
import MainDashboard from "./main-dashboard"
import VoiceInterface from "./voice-interface"
import SendMoney from "./send-money"
import CameraCapture from "./camera-capture"
import RecurringPayments from "./recurring-payments"
import Analytics from "./analytics"
import VoiceTest from "./voice-test"
import PermissionManager from "./permission-manager"
import PaymentScanner from "./payment-scanner"

type Screen = "dashboard" | "voice" | "send" | "camera" | "recurring" | "analytics" | "test" | "permissions" | "scanner"

export default function OngeaPesaApp() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("dashboard")
  const [isListening, setIsListening] = useState(false)
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
        return <MainDashboard onNavigate={setCurrentScreen} onVoiceActivate={() => setIsListening(true)} />
      case "voice":
        return (
          <VoiceInterface onNavigate={setCurrentScreen} isListening={isListening} setIsListening={setIsListening} />
        )
      case "send":
        return <SendMoney onNavigate={setCurrentScreen} />
      case "camera":
        return <CameraCapture onNavigate={setCurrentScreen} />
      case "recurring":
        return <RecurringPayments onNavigate={setCurrentScreen} />
      case "analytics":
        return <Analytics onNavigate={setCurrentScreen} />
      case "test":
        return <VoiceTest onNavigate={setCurrentScreen} />
      case "permissions":
        return <PermissionManager onNavigate={setCurrentScreen} />
      case "scanner":
        return <PaymentScanner onNavigate={setCurrentScreen} />
      default:
        return <MainDashboard onNavigate={setCurrentScreen} onVoiceActivate={() => setIsListening(true)} />
    }
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-[#0A1A2A] dark:via-[#0F2027] dark:to-[#203A43] transition-all duration-500">
        {renderScreen()}
      </div>
    </ThemeProvider>
  )
}
