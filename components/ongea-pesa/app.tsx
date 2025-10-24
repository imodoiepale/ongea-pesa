"use client"

import { useState, useEffect } from "react"
import { ThemeProvider } from "next-themes"
import { UserProvider } from "@/contexts/UserContext"
import { ElevenLabsProvider } from "@/contexts/ElevenLabsContext"
import { Toaster } from "@/components/ui/toaster"
import GlobalVoiceWidget from "./global-voice-widget"
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

  const navigate = (screen: Screen) => setCurrentScreen(screen);

  const renderScreen = () => {
    switch (currentScreen) {
      case "dashboard":
        return <MainDashboard onNavigate={navigate} onVoiceActivate={() => setIsListening(true)} />
      case "voice":
        return <VoiceInterface onNavigate={navigate} />
      case "send":
        return <SendMoney onNavigate={navigate} />
      case "camera":
        return <CameraCapture onNavigate={navigate} />
      case "recurring":
        return <RecurringPayments onNavigate={navigate} />
      case "analytics":
        return <Analytics onNavigate={navigate} />
      case "test":
        return <VoiceTest onNavigate={navigate} />
      case "permissions":
        return <PermissionManager onNavigate={navigate} />
      case "scanner":
        return <PaymentScanner onNavigate={navigate} />
      default:
        return <MainDashboard onNavigate={navigate} onVoiceActivate={() => setIsListening(true)} />
    }
  }

  return (
    <UserProvider>
      <ElevenLabsProvider>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-[#0A1A2A] dark:via-[#0F2027] dark:to-[#203A43] transition-all duration-500">
            {renderScreen()}
            {/* Hide global widget when on voice interface page to prevent overlap */}
            {currentScreen !== "voice" && <GlobalVoiceWidget />}
            <Toaster />
          </div>
        </ThemeProvider>
      </ElevenLabsProvider>
    </UserProvider>
  )
}
