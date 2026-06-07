"use client"

import { useState, useEffect } from "react"
import { UserProvider } from "@/contexts/UserContext"
import { ElevenLabsProvider, useElevenLabs } from "@/contexts/ElevenLabsContext"
import { Toaster } from "@/components/ui/toaster"
import GlobalVoiceWidget from "./global-voice-widget"
import MainDashboard from "./main-dashboard"
import VoiceInterface from "./voice-interface"
import SendMoney from "./send-money"
import RecurringPayments from "./recurring-payments"
import Analytics from "./analytics"
import VoiceTest from "./voice-test"
import PermissionManager from "./permission-manager"
import PaymentScanner from "./payment-scanner"
import BatchSend from "./batch-send"
import MpesaSettingsDialog from "./mpesa-settings-dialog"
import { useAuth } from "@/components/providers/auth-provider"
import { createClient } from '@/lib/supabase/client'
import { FluidNav, mobileNavItems } from "@/components/foundation"
import type { BatchItem, BatchResponse } from '@/lib/batch-payments'

type Screen = "dashboard" | "voice" | "send" | "recurring" | "analytics" | "test" | "permissions" | "scanner" | "batch"

// Inner component — must be a child of ElevenLabsProvider to call useElevenLabs
function AppShell() {
  const { user } = useAuth()
  const { registerToolHandlers, unregisterToolHandlers } = useElevenLabs()
  const [currentScreen, setCurrentScreen] = useState<Screen>("dashboard")
  const [isListening, setIsListening] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isMpesaDialogOpen, setIsMpesaDialogOpen] = useState(false)
  const [checkingMpesa, setCheckingMpesa] = useState(true)
  // Batch: pre-populated payments + results from voice-triggered send_batch
  const [pendingBatch, setPendingBatch] = useState<{ payments?: BatchItem[]; results?: BatchResponse } | null>(null)
  // Voice-triggered scan overlay — null = hidden, {} = open (auto-detect mode), { mode } = specific mode
  const [scanOverlay, setScanOverlay] = useState<{ mode?: string | null } | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Global check for M-Pesa number on mount or user change
  useEffect(() => {
    if (mounted && user?.id) {
      checkMpesaNumber()
    }
  }, [mounted, user?.id])

  const navigate = (screen: Screen) => setCurrentScreen(screen)

  // Register navigation handlers so voice agent can open the scanner or the batch screen
  useEffect(() => {
    registerToolHandlers({
      // Voice "scan / open camera" — opens animated overlay immediately on the current screen
      openScanner: () => setScanOverlay({}),
      startScan: (mode) => setScanOverlay({ mode: mode ?? null }),
      showBatch: (payments, batchResponse) => {
        setPendingBatch({ payments, results: batchResponse })
        navigate('batch')
      },
    });
    return () => unregisterToolHandlers(['openScanner', 'startScan', 'showBatch']);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const renderScreen = () => {
    switch (currentScreen) {
      case "dashboard":
        return <MainDashboard onNavigate={navigate} onVoiceActivate={() => setIsListening(true)} />
      case "voice":
        return <VoiceInterface onNavigate={navigate} />
      case "send":
        return <SendMoney onNavigate={navigate} />
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
      case "batch":
        return (
          <BatchSend
            onNavigate={navigate}
            initialPayments={pendingBatch?.payments}
            initialResults={pendingBatch?.results}
          />
        )
      default:
        return <MainDashboard onNavigate={navigate} onVoiceActivate={() => setIsListening(true)} />
    }
  }

  return (
    <div className="min-h-[100dvh] pb-20 lg:pb-0 bg-background">
      {renderScreen()}

      {/* Voice-triggered scan overlay — animates camera open on the current screen */}
      {scanOverlay !== null && (
        <div className="fixed inset-0 z-[60] animate-in fade-in zoom-in-95 duration-300">
          <PaymentScanner
            variant="overlay"
            autoStart
            initialMode={scanOverlay.mode as any}
            onClose={() => setScanOverlay(null)}
            onNavigate={navigate}
          />
        </div>
      )}

      {/* GlobalVoiceWidget commented out — removed floating popup per UX review.
          ElevenLabsProvider stays active for the Voice page + client-tool integration. */}
      {/* {currentScreen !== "voice" && <GlobalVoiceWidget />} */}
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
  )
}

export default function OngeaPesaApp() {
  return (
    <UserProvider>
      <ElevenLabsProvider>
        <AppShell />
      </ElevenLabsProvider>
    </UserProvider>
  )
}
