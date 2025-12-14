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
import { Home, Mic, Users, ShieldCheck, Wallet } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

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

  const mobileNavItems = [
    { href: "/", icon: Home, label: "Home", isInternal: true, screen: "dashboard" as Screen },
    { href: "/dashboard", icon: Mic, label: "Voice", isInternal: true, screen: "voice" as Screen },
    { href: "/chama", icon: Users, label: "Chama", isInternal: false },
    { href: "/escrow", icon: ShieldCheck, label: "Escrow", isInternal: false },
    { href: "/transactions", icon: Wallet, label: "Wallet", isInternal: false },
  ]

  return (
    <UserProvider>
      <ElevenLabsProvider>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <div className="min-h-screen pb-20 lg:pb-0 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-[#0A1A2A] dark:via-[#0F2027] dark:to-[#203A43] transition-all duration-500">
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

            {/* Mobile Bottom Navigation */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-around h-16 px-2 max-w-md mx-auto">
                {mobileNavItems.map((item) => {
                  const isActive = item.isInternal 
                    ? currentScreen === item.screen 
                    : false
                  
                  if (item.isInternal) {
                    return (
                      <button
                        key={item.label}
                        onClick={() => navigate(item.screen!)}
                        className={cn(
                          "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all",
                          isActive 
                            ? "text-emerald-600 dark:text-emerald-400" 
                            : "text-zinc-500 dark:text-zinc-400 active:scale-95"
                        )}
                      >
                        <item.icon className={cn("w-5 h-5", isActive && "scale-110")} />
                        <span className={cn("text-[10px] font-medium", isActive && "font-semibold")}>{item.label}</span>
                      </button>
                    )
                  }
                  
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all text-zinc-500 dark:text-zinc-400 active:scale-95"
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="text-[10px] font-medium">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </nav>
          </div>
        </ThemeProvider>
      </ElevenLabsProvider>
    </UserProvider>
  )
}
