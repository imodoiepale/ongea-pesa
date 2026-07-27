"use client"

import { useState, useEffect } from "react"
import { Shield, Camera, ContactIcon as Contacts, Mic, MessageSquare, MapPin, Bell, Phone, KeyRound, Mail, Smartphone, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import MpesaSettingsDialog from "./mpesa-settings-dialog"
import DependantsSheet from "./dependants-sheet"
import PhoneSetupDialog from "./phone-setup-dialog"
import { createClient } from '@/lib/supabase/client'
import { useAuth } from "@/components/providers/auth-provider"
import { ScreenShell } from "@/components/foundation"
import { cn } from "@/lib/utils"
import { displayPhone } from "@/lib/phone"
import { setPin as apiSetPin, setEmailOtpEnabled as apiSetEmailOtpEnabled } from "@/lib/security-client"

type Screen = "dashboard" | "voice" | "send" | "recurring" | "analytics" | "test" | "permissions" | "scanner";

interface PermissionManagerProps {
  onNavigate?: (screen: Screen) => void;
}

interface Permission {
  id: string
  name: string
  description: string
  icon: any
  enabled: boolean
  required: boolean
  voicePrompt: string
}

export default function PermissionManager({ onNavigate }: PermissionManagerProps) {
  const { user } = useAuth()
  const [isMpesaDialogOpen, setIsMpesaDialogOpen] = useState(false)
  const [mpesaNumber, setMpesaNumber] = useState<string | null>(null)

  // Account & Security state
  const [emailOtpEnabled, setEmailOtpEnabledLocal] = useState(true)
  const [isPhoneSetupOpen, setIsPhoneSetupOpen] = useState(false)
  const [isDependantsOpen, setIsDependantsOpen] = useState(false)
  const [profilePhone, setProfilePhone] = useState<string | null>(null)
  const [isPinChangeOpen, setIsPinChangeOpen] = useState(false)
  const [pinCurrentVal, setPinCurrentVal] = useState("")
  const [pinNewVal, setPinNewVal] = useState("")
  const [pinConfirmVal, setPinConfirmVal] = useState("")
  const [pinError, setPinError] = useState<string | null>(null)
  const [pinSuccess, setPinSuccess] = useState(false)
  const [pinHasExisting, setPinHasExisting] = useState(false)
  const [pinSaving, setPinSaving] = useState(false)
  const [permissions, setPermissions] = useState<Permission[]>([
    {
      id: "microphone",
      name: "Microphone",
      description: "Required for voice commands and push-to-talk functionality",
      icon: Mic,
      enabled: true,
      required: true,
      voicePrompt: "Ongea Pesa, ruhusu kutumia kipaza sauti",
    },
    {
      id: "camera",
      name: "Camera",
      description: "Capture and share location photos",
      icon: Camera,
      enabled: true,
      required: false,
      voicePrompt: "Ongea Pesa, ruhusu kutumia kamera",
    },
    {
      id: "contacts",
      name: "Contacts",
      description: "Access contacts for easy money transfers",
      icon: Contacts,
      enabled: true,
      required: false,
      voicePrompt: "Ongea Pesa, ruhusu kutumia mawasiliano",
    },
    {
      id: "location",
      name: "Location",
      description: "GPS location for sharing current position",
      icon: MapPin,
      enabled: false,
      required: false,
      voicePrompt: "Ongea Pesa, ruhusu kutumia mahali",
    },
    {
      id: "sms",
      name: "SMS",
      description: "Send transaction confirmations via SMS",
      icon: MessageSquare,
      enabled: true,
      required: false,
      voicePrompt: "Ongea Pesa, ruhusu kutuma ujumbe",
    },
    {
      id: "notifications",
      name: "Notifications",
      description: "Voice reminders and payment alerts",
      icon: Bell,
      enabled: true,
      required: false,
      voicePrompt: "Ongea Pesa, ruhusu kutuma vikumbusho",
    },
  ])

  // Check for M-Pesa number on mount
  useEffect(() => {
    checkMpesaNumber()
  }, [user?.id])

  const checkMpesaNumber = async () => {
    if (!user?.id) return

    try {
      const supabase = createClient()
      const { data: profile } = await supabase
        .from('profiles')
        .select('mpesa_number, phone_number, email_otp_enabled, pin_hash')
        .eq('id', user.id)
        .single()

      setMpesaNumber(profile?.mpesa_number || null)
      setProfilePhone(profile?.phone_number || null)
      setEmailOtpEnabledLocal(profile?.email_otp_enabled ?? true)
      setPinHasExisting(!!profile?.pin_hash)
    } catch (err) {
      console.error('Error checking M-Pesa number:', err)
    }
  }

  const handlePinChange = async () => {
    setPinError(null)
    setPinSuccess(false)
    if (pinNewVal.length !== 6 || !/^\d{6}$/.test(pinNewVal)) {
      setPinError('PIN must be exactly 6 digits.')
      return
    }
    if (pinNewVal !== pinConfirmVal) {
      setPinError('New PIN and confirmation do not match.')
      return
    }
    if (pinHasExisting && pinCurrentVal.length !== 6) {
      setPinError('Please enter your current PIN.')
      return
    }
    setPinSaving(true)
    try {
      await apiSetPin(pinNewVal, pinHasExisting ? pinCurrentVal : undefined)
      setPinSuccess(true)
      setPinCurrentVal('')
      setPinNewVal('')
      setPinConfirmVal('')
      setPinHasExisting(true)
      setTimeout(() => { setIsPinChangeOpen(false); setPinSuccess(false) }, 1500)
    } catch (err: any) {
      setPinError(err?.message || 'Failed to update PIN. Please try again.')
    } finally {
      setPinSaving(false)
    }
  }

  const handleEmailOtpToggle = async (next: boolean) => {
    const prev = emailOtpEnabled
    setEmailOtpEnabledLocal(next)
    try {
      await apiSetEmailOtpEnabled(next)
    } catch (err: any) {
      // Revert on failure
      setEmailOtpEnabledLocal(prev)
      console.error('Failed to update email OTP setting:', err)
    }
  }

  const togglePermission = (id: string) => {
    setPermissions((prev) =>
      prev.map((permission) => (permission.id === id ? { ...permission, enabled: !permission.enabled } : permission)),
    )
  }

  const handleVoicePermission = (permission: Permission) => {
    togglePermission(permission.id)
  }

  return (
    <main id="main-content" className="orbital-page min-h-[100dvh] pb-nav">
      <ScreenShell>
        {/* Header */}
        <div className="pt-6 mb-6 text-center">
          <span className="orbital-label text-[hsl(var(--teal))]">Account &amp; trust</span>
          <h1 className="orbital-display mt-4 text-5xl">Permissions</h1>
          <p className="text-sm text-muted-foreground mt-1">Ongea Pesa needs access to some features to work correctly.</p>
        </div>

        {/* Account & Security */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Account &amp; Security</p>
          <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40">

            {/* PIN row */}
            <div>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                  <KeyRound className="h-4 w-4 text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Wallet PIN</p>
                  <p className="text-xs text-muted-foreground">Change your 6-digit wallet PIN</p>
                </div>
                <Button
                  size="sm"
                  variant={isPinChangeOpen ? "outline" : "default"}
                  className="h-7 text-xs px-3 shrink-0"
                  onClick={() => { setIsPinChangeOpen(!isPinChangeOpen); setPinError(null); setPinSuccess(false) }}
                >
                  {isPinChangeOpen ? 'Cancel' : 'Change'}
                </Button>
              </div>
              {isPinChangeOpen && (
                <div className="px-4 pb-4 pt-1 bg-muted/30 space-y-2">
                  {pinHasExisting && (
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Current PIN</label>
                      <input
                        type="password"
                        maxLength={6}
                        inputMode="numeric"
                        pattern="\d{6}"
                        placeholder="••••"
                        value={pinCurrentVal}
                        onChange={(e) => setPinCurrentVal(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full px-3 py-2 rounded-lg border border-border/60 bg-card text-foreground text-center tracking-widest text-base focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">New PIN (6 digits)</label>
                    <input
                      type="password"
                      maxLength={6}
                      inputMode="numeric"
                      pattern="\d{6}"
                      placeholder="••••"
                      value={pinNewVal}
                      onChange={(e) => setPinNewVal(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full px-3 py-2 rounded-lg border border-border/60 bg-card text-foreground text-center tracking-widest text-base focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Confirm new PIN</label>
                    <input
                      type="password"
                      maxLength={6}
                      inputMode="numeric"
                      pattern="\d{6}"
                      placeholder="••••"
                      value={pinConfirmVal}
                      onChange={(e) => setPinConfirmVal(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full px-3 py-2 rounded-lg border border-border/60 bg-card text-foreground text-center tracking-widest text-base focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                  {pinError && <p className="text-xs text-destructive">{pinError}</p>}
                  {pinSuccess && <p className="text-xs text-brand">PIN updated successfully!</p>}
                  <Button
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={handlePinChange}
                    disabled={pinSaving}
                  >
                    {pinSaving ? 'Saving…' : 'Save PIN'}
                  </Button>
                </div>
              )}
            </div>

            {/* Email OTP row */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                <Mail className="h-4 w-4 text-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Email OTP</p>
                <p className="text-xs text-muted-foreground">Require a verification code on phone login</p>
              </div>
              <Switch
                checked={emailOtpEnabled}
                onCheckedChange={handleEmailOtpToggle}
                className="shrink-0"
              />
            </div>

            {/* Phone / STK Number row */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                <Smartphone className="h-4 w-4 text-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Phone / STK Number</p>
                <p className="text-xs text-muted-foreground">
                  {profilePhone ? displayPhone(profilePhone) : 'Not set'}
                </p>
              </div>
              <Button
                size="sm"
                className="h-7 text-xs px-3 shrink-0"
                onClick={() => setIsPhoneSetupOpen(true)}
              >
                Change
              </Button>
            </div>

            {/* Family & Friends row */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 text-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Family &amp; Friends</p>
                <p className="text-xs text-muted-foreground">Manage numbers to send STK top-up to</p>
              </div>
              <Button
                size="sm"
                className="h-7 text-xs px-3 shrink-0"
                onClick={() => setIsDependantsOpen(true)}
              >
                Manage
              </Button>
            </div>

          </div>
        </div>

        {/* M-Pesa Number setup */}
        <div className="rounded-2xl border border-brand/20 bg-brand/5 px-4 py-3 mb-5 flex items-center gap-3">
          <Phone className="h-5 w-5 text-brand shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">M-Pesa Number</p>
            <p className="text-xs text-muted-foreground">{mpesaNumber ? mpesaNumber : 'Not set — tap to add'}</p>
          </div>
          <Button
            size="sm"
            onClick={() => setIsMpesaDialogOpen(true)}
            className="h-7 text-xs px-3 shrink-0"
          >
            {mpesaNumber ? 'Change' : 'Set Now'}
          </Button>
        </div>

        {/* Privacy & Security banner */}
        <div className="rounded-2xl border border-border/60 bg-card px-4 py-3 mb-5 flex items-center gap-3">
          <Shield className="h-5 w-5 text-brand shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">Privacy & Security</p>
            <p className="text-xs text-muted-foreground">All permissions can be managed through voice commands</p>
          </div>
        </div>

        {/* Permissions list */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Permissions</p>
          <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40">
            {permissions.map((permission) => {
              const Icon = permission.icon;
              return (
                <div key={permission.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                    permission.enabled ? "bg-brand/10" : "bg-muted"
                  )}>
                    <Icon className={cn("h-4 w-4", permission.enabled ? "text-brand" : "text-muted-foreground")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-foreground">{permission.name}</p>
                      {permission.required && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">Required</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{permission.description}</p>
                    <p className="text-[10px] text-brand/70 italic mt-0.5">Voice: "{permission.voicePrompt}"</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleVoicePermission(permission)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center border border-border/60 hover:bg-muted transition-colors"
                      aria-label="Voice command"
                    >
                      <Mic className="h-3 w-3 text-muted-foreground" />
                    </button>
                    <Switch
                      checked={permission.enabled}
                      onCheckedChange={() => togglePermission(permission.id)}
                      disabled={permission.required}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Voice commands help */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Voice Permission Commands</p>
          <div className="space-y-2">
            {[
              { label: 'Grant Permission', example: '"Ongea Pesa, ruhusu kutumia [permission]"', color: 'brand' },
              { label: 'Revoke Permission', example: '"Ongea Pesa, zuia kutumia [permission]"', color: 'destructive' },
              { label: 'Check Status', example: '"Ongea Pesa, onyesha ruhusa zote"', color: 'blue' },
            ].map((cmd) => (
              <div key={cmd.label} className={cn(
                "rounded-2xl border px-4 py-3",
                cmd.color === 'brand' ? "border-brand/20 bg-brand/5" :
                cmd.color === 'destructive' ? "border-destructive/20 bg-destructive/5" :
                "border-blue-500/20 bg-blue-500/8"
              )}>
                <p className={cn(
                  "text-sm font-semibold",
                  cmd.color === 'brand' ? "text-brand" :
                  cmd.color === 'destructive' ? "text-destructive" :
                  "text-blue-600 dark:text-blue-400"
                )}>{cmd.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{cmd.example}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy notice */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Privacy Notice</p>
          <div className="rounded-2xl border border-border/60 bg-card px-4 py-3 space-y-1.5">
            {[
              'Voice commands are processed locally when possible',
              'Financial data is encrypted end-to-end',
              'Location data is only used for sharing features',
              'Contact access is limited to sending money',
              'You can revoke permissions anytime via voice',
            ].map((notice) => (
              <p key={notice} className="text-xs text-muted-foreground">• {notice}</p>
            ))}
          </div>
        </div>
      </ScreenShell>

      {/* M-Pesa Settings Dialog — untouched */}
      <MpesaSettingsDialog
        isOpen={isMpesaDialogOpen}
        onClose={() => setIsMpesaDialogOpen(false)}
        onSave={() => { checkMpesaNumber() }}
      />

      {/* Phone Setup Dialog */}
      <PhoneSetupDialog
        isOpen={isPhoneSetupOpen}
        onClose={() => setIsPhoneSetupOpen(false)}
        onComplete={(phone) => {
          setProfilePhone(phone)
          setIsPhoneSetupOpen(false)
        }}
        required={false}
      />

      {/* Dependants Sheet */}
      <DependantsSheet
        isOpen={isDependantsOpen}
        onClose={() => setIsDependantsOpen(false)}
      />
    </main>
  )
}
