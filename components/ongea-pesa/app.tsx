"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
import type { ScanMode } from "./payment-scanner"
import BatchSend from "./batch-send"
import PhoneSetupDialog from "./phone-setup-dialog"
import { useAuth } from "@/components/providers/auth-provider"
import { createClient } from '@/lib/supabase/client'
import { FluidNav, mobileNavItems, OrbitalBackdrop } from "@/components/foundation"
import type { OrbitalBackdropScene } from "@/components/foundation"
import type { BatchItem, BatchResponse } from '@/lib/batch-payments'

type Screen = "dashboard" | "voice" | "send" | "recurring" | "analytics" | "test" | "permissions" | "scanner" | "batch"

// Inner component — must be a child of ElevenLabsProvider to call useElevenLabs
function AppShell({ initialScreen = "dashboard" }: { initialScreen?: Screen }) {
  const router = useRouter()
  const { user } = useAuth()
  const { registerToolHandlers, unregisterToolHandlers } = useElevenLabs()
  const [currentScreen, setCurrentScreen] = useState<Screen>(initialScreen)
  const [isListening, setIsListening] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isPhoneSetupOpen, setIsPhoneSetupOpen] = useState(false)
  const [checkingMpesa, setCheckingMpesa] = useState(true)
  // Batch: pre-populated payments + results from voice-triggered send_batch
  const [pendingBatch, setPendingBatch] = useState<{ payments?: BatchItem[]; results?: BatchResponse } | null>(null)
  // Voice-triggered scan overlay — null = hidden
  // { autoStart?: boolean, mode?: string | null }
  //   autoStart: true (default) → camera starts immediately (voice path)
  //   autoStart: false → show mode selection first (button path)
  const [scanOverlay, setScanOverlay] = useState<{ mode?: string | null; autoStart?: boolean } | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Global check for profile setup on mount or user change
  useEffect(() => {
    if (mounted && user?.id) {
      checkProfileSetup()
    }
  }, [mounted, user?.id])

  const navigate = (screen: Screen) => setCurrentScreen(screen)

  // Effect A — stable handlers that don't depend on scan overlay state
  useEffect(() => {
    registerToolHandlers({
      showBatch: (payments, batchResponse) => {
        setPendingBatch({ payments, results: batchResponse })
        navigate('batch')
      },
    });
    return () => unregisterToolHandlers(['showBatch']);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Effect B — re-registers scan handlers whenever overlay closes or screen changes.
  // When the overlay is open, PaymentScanner registers its own startScan which takes precedence.
  // When the overlay closes (scanOverlay → null), this effect re-fires and restores AppShell's handlers.
  useEffect(() => {
    if (scanOverlay === null) {
      registerToolHandlers({
        openScanner: () => {
          // Don't open overlay when already on the scanner screen — camera is already running
          if (currentScreen !== 'scanner') setScanOverlay({})
        },
        startScan: (mode) => {
          if (currentScreen !== 'scanner') setScanOverlay({ mode: mode ?? null })
        },
      });
    }
    return () => unregisterToolHandlers(['openScanner', 'startScan']);
  }, [scanOverlay, currentScreen]); // re-register when overlay closes or screen changes
  // Note: registerToolHandlers and setScanOverlay are stable refs/setters, no need to list

  const checkProfileSetup = async () => {
    if (!user?.id) return

    try {
      setCheckingMpesa(true)
      const supabase = createClient()
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      const metadata = user.user_metadata || {}
      const fullName = profile?.full_name || metadata.full_name || metadata.name
      const voiceCalibratedAt = profile?.voice_calibrated_at || metadata.voice_calibrated_at
      const onboardingCompletedAt = profile?.onboarding_completed_at || metadata.onboarding_completed_at
      const voiceFundingCompletedAt = profile?.voice_funding_completed_at || metadata.voice_funding_completed_at

      if (!onboardingCompletedAt) {
        if (!voiceFundingCompletedAt) router.replace('/voice-funding')
        else if (!fullName || !profile?.phone_number) router.replace('/profile-creation')
        else if (!voiceCalibratedAt) router.replace('/voice-calibration')
        else if (!profile?.pin_hash) router.replace('/security-setup')
        else router.replace('/security-setup')
        return
      }

      // Optional final step: send a little to your own M-Pesa. Nudged once, and
      // only until it is either done or explicitly dismissed. This sits AFTER
      // the onboarding_completed_at gate on purpose — it must never be able to
      // block access to the dashboard.
      const firstSendSettled =
        profile?.first_send_completed_at ||
        profile?.first_send_skipped_at ||
        metadata.first_send_completed_at ||
        metadata.first_send_skipped_at
      if (!firstSendSettled && Number(profile?.wallet_balance ?? 0) > 0) {
        router.replace('/first-send')
        return
      }

      // Show phone setup dialog if phone is not verified
      if (!profile?.phone_verified) {
        setIsPhoneSetupOpen(true)
      }
    } catch (err) {
      console.error('Error checking profile setup:', err)
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
        return (
          <MainDashboard
            onNavigate={navigate}
            onVoiceActivate={() => setIsListening(true)}
            onOpenScanner={() => setScanOverlay({ autoStart: false })}
          />
        )
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
        return (
          <MainDashboard
            onNavigate={navigate}
            onVoiceActivate={() => setIsListening(true)}
            onOpenScanner={() => setScanOverlay({ autoStart: false })}
          />
        )
    }
  }

  const backdropScene: Record<Screen, OrbitalBackdropScene> = {
    dashboard: "voice",
    voice: "voice",
    send: "transfer",
    recurring: "planning",
    analytics: "planning",
    test: "voice",
    permissions: "trust",
    scanner: "scanner",
    batch: "planning",
  }

  return (
    <div className="relative z-[1] min-h-[100dvh] bg-transparent">
      {/* Each screen owns its bottom-nav clearance; adding it here causes overscroll. */}
      <OrbitalBackdrop scene={scanOverlay !== null ? "scanner" : backdropScene[currentScreen]} />
      <div className="relative z-[1]">{renderScreen()}</div>

      {/* Scan overlay — opens on top of the current screen; closing returns here.
          autoStart=true (voice path): camera begins immediately.
          autoStart=false (button path): shows mode-selection first. */}
      {scanOverlay !== null && (
        <div className="fixed inset-0 z-[75] animate-in fade-in zoom-in-95 duration-300">
          <PaymentScanner
            variant="overlay"
            autoStart={scanOverlay.autoStart !== false}
            initialMode={scanOverlay.mode as ScanMode | null}
            onClose={() => setScanOverlay(null)}
            onNavigate={navigate}
          />
        </div>
      )}

      {/* GlobalVoiceWidget commented out — removed floating popup per UX review.
          ElevenLabsProvider stays active for the Voice page + client-tool integration. */}
      {/* {currentScreen !== "voice" && <GlobalVoiceWidget />} */}
      <Toaster />

      {/* Phone Setup Dialog — auto-shown when phone_verified is false */}
      <PhoneSetupDialog
        isOpen={isPhoneSetupOpen}
        onClose={() => setIsPhoneSetupOpen(false)}
        onComplete={() => {
          setIsPhoneSetupOpen(false)
          checkProfileSetup()
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

export default function OngeaPesaApp({ initialScreen = "dashboard" }: { initialScreen?: Screen }) {
  return (
    <UserProvider>
      <ElevenLabsProvider>
        <AppShell initialScreen={initialScreen} />
      </ElevenLabsProvider>
    </UserProvider>
  )
}
