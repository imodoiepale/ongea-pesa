"use client"

import { useState } from "react"
import { ArrowLeft, Calendar, Plus, Mic, Bell, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScreenShell } from "@/components/foundation"
import { cn } from "@/lib/utils"

type Screen = "dashboard" | "voice" | "send" | "camera" | "recurring" | "analytics" | "test" | "permissions" | "scanner";

interface RecurringPaymentsProps {
  onNavigate: (screen: Screen) => void;
}

interface RecurringPayment {
  id: string
  name: string
  amount: string
  frequency: string
  nextDate: string
  recipient: string
  status: "active" | "paused"
}

export default function RecurringPayments({ onNavigate }: RecurringPaymentsProps) {
  const [payments, setPayments] = useState<RecurringPayment[]>([
    {
      id: "1",
      name: "Rent Payment",
      amount: "KSh 25,000",
      frequency: "Monthly",
      nextDate: "2024-02-01",
      recipient: "Landlord",
      status: "active",
    },
    {
      id: "2",
      name: "Electricity Bill",
      amount: "KSh 3,500",
      frequency: "Monthly",
      nextDate: "2024-01-15",
      recipient: "KPLC",
      status: "active",
    },
  ])

  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [voiceCommand, setVoiceCommand] = useState("")

  const handleVoiceSetup = () => {
    setIsVoiceMode(true)
    setTimeout(() => {
      setVoiceCommand("Seti malipo ya kodi kila tarehe moja")
      setIsVoiceMode(false)
    }, 2000)
  }

  return (
    <div className="min-h-[100dvh] bg-background surface-money pb-24">
      <ScreenShell className="pt-0">
        {/* Back header */}
        <div className="flex items-center gap-3 pt-6 mb-6">
          <Button variant="ghost" size="icon-sm" onClick={() => onNavigate("dashboard")} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Recurring Payments</h1>
            <p className="text-sm text-muted-foreground">Automated bill payments</p>
          </div>
        </div>

        {/* Voice setup card */}
        <div className="rounded-2xl border border-border/60 bg-card px-4 py-3 mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Voice Setup</p>
            <p className="text-xs text-muted-foreground">Say: "Seti malipo ya [bill] kila [frequency]"</p>
            {voiceCommand && <p className="text-xs text-brand mt-1 font-medium">Heard: "{voiceCommand}"</p>}
          </div>
          <button
            onClick={handleVoiceSetup}
            disabled={isVoiceMode}
            aria-label="Voice setup"
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 active:scale-[0.97]",
              isVoiceMode ? "bg-red-500/15 text-red-500 animate-pulse cursor-wait" : "bg-brand/10 text-brand hover:bg-brand/15"
            )}
          >
            <Mic className="h-4 w-4" />
          </button>
        </div>

        {/* Active payments */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Payments</p>
            <Button size="sm" variant="outline" className="h-7 text-xs px-3">
              <Plus className="h-3 w-3 mr-1" />Add
            </Button>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40">
            {payments.map((payment) => (
              <div key={payment.id} className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-foreground">{payment.name}</p>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      payment.status === "active"
                        ? "bg-brand/10 text-brand"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {payment.status}
                    </span>
                    <button
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {[
                    { label: 'Amount', value: payment.amount },
                    { label: 'Frequency', value: payment.frequency },
                    { label: 'Next Date', value: payment.nextDate },
                    { label: 'Recipient', value: payment.recipient },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                      <p className="text-xs font-medium text-foreground">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming reminders */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Upcoming Reminders</p>
          <div className="space-y-2">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/8 px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Electricity Bill Due</p>
                <p className="text-xs text-muted-foreground">Tomorrow — KSh 3,500</p>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs shrink-0">Pay Now</Button>
            </div>
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/8 px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">Rent Payment Due</p>
                <p className="text-xs text-muted-foreground">In 3 days — KSh 25,000</p>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs shrink-0">Remind Me</Button>
            </div>
          </div>
        </div>

        {/* Voice reminders */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Voice Reminders</p>
          <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40">
            {[
              { title: 'Daily Reminder', subtitle: '"Ni siku ya malipo ya kiraia leo" — 9:00 AM' },
              { title: 'Payment Confirmation', subtitle: '"Malipo yamekamilika. Niliset prompt kila tarehe moja"' },
            ].map((item) => (
              <div key={item.title} className="px-4 py-3">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </ScreenShell>
    </div>
  )
}
