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
import MpesaSettingsDialog from "./mpesa-settings-dialog"
import { useAuth } from "@/components/providers/auth-provider"
import { createClient } from '@/lib/supabase/client'

type Screen = "dashboard" | "voice" | "send" | "camera" | "recurring" | "analytics" | "test" | "permissions" | "scanner"

export default function OngeaPesaApp() {
  const { user } = useAuth()
  const [currentScreen, setCurrentScreen] = useState<Screen>("dashboard")
  const [isListening, setIsListening] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isMpesaDialogOpen, setIsMpesaDialogOpen] = useState(false)
  const [checkingMpesa, setCheckingMpesa] = useState(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Global check for M-Pesa number on mount or user change
  useEffect(() => {
    if (mounted && user?.id) {
      checkMpesaNumber()
    }
  }, [mounted, user?.id])

  const checkMpesaNumber = async () => {
    if (!user?.id) return
    
    try {
      setCheckingMpesa(true)
      const supabase = createClient()
      const { data: profile } = await supabase
        .from('profiles')
        .select('mpesa_number')
        .eq('id', user.id)
        .single()

      // Auto-show dialog if mpesa_number is null or empty
      if (!profile?.mpesa_number) {
        setIsMpesaDialogOpen(true)
      }
    } catch (err) {
      console.error('Error checking M-Pesa number:', err)
    } finally {
      setCheckingMpesa(false)
    }
  }

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
            
            {/* Global M-Pesa Settings Dialog - Shows when mpesa_number is not set */}
            <MpesaSettingsDialog
              isOpen={isMpesaDialogOpen}
              onClose={() => setIsMpesaDialogOpen(false)}
              onSave={() => {
                setIsMpesaDialogOpen(false)
                checkMpesaNumber()
              }}
              required={true}
            />
          </div>
        </ThemeProvider>
      </ElevenLabsProvider>
    </UserProvider>
  )
}
