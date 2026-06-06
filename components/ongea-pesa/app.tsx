"use client"

import { useState, useEffect } from "react"
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
import { Home, Mic, Users, ShieldCheck, Wallet } from "lucide-react"
import { FluidNav } from "@/components/foundation"
import type { FluidNavItem } from "@/components/foundation"

type Screen = "dashboard" | "voice" | "send" | "camera" | "recurring" | "analytics" | "test" | "permissions" | "scanner"

const mobileNavItems: FluidNavItem[] = [
  { key: "dashboard", href: "/", icon: Home, label: "Home", isInternal: true },
  { key: "voice", href: "/dashboard", icon: Mic, label: "Voice", isInternal: true },
  { key: "chama", href: "/chama", icon: Users, label: "Chama" },
  { key: "escrow", href: "/escrow", icon: ShieldCheck, label: "Escrow" },
  { key: "transactions", href: "/transactions", icon: Wallet, label: "Wallet" },
]

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

  const navigate = (screen: Screen) => setCurrentScreen(screen)

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
        <div className="min-h-[100dvh] pb-20 lg:pb-0 bg-background">
          {renderScreen()}
          {/* Hide global widget when on voice interface to prevent overlap */}
          {currentScreen !== "voice" && <GlobalVoiceWidget />}
          <Toaster />

          {/* Global M-Pesa Settings Dialog — auto-shown when mpesa_number is not set */}
          <MpesaSettingsDialog
            isOpen={isMpesaDialogOpen}
            onClose={() => setIsMpesaDialogOpen(false)}
            onSave={() => {
              setIsMpesaDialogOpen(false)
              checkMpesaNumber()
            }}
            required={true}
          />

          {/* Canonical bottom nav — replaces the former inline nav */}
          <FluidNav
            items={mobileNavItems}
            activeKey={currentScreen}
            onNavigate={(key) => {
              // Only internal screens get state-switched; route screens fall through to Link
              if (key === "dashboard" || key === "voice") {
                navigate(key as Screen)
              }
            }}
          />
        </div>
      </ElevenLabsProvider>
    </UserProvider>
  )
}
