"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Shield, Camera, ContactIcon as Contacts, Mic, MessageSquare, MapPin, Bell, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import MpesaSettingsDialog from "./mpesa-settings-dialog"
import { createClient } from '@/lib/supabase/client'
import { useAuth } from "@/components/providers/auth-provider"

type Screen = "dashboard" | "voice" | "send" | "camera" | "recurring" | "analytics" | "test" | "permissions" | "scanner";

interface PermissionManagerProps {
  onNavigate: (screen: Screen) => void;
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
        .select('mpesa_number')
        .eq('id', user.id)
        .single()

      setMpesaNumber(profile?.mpesa_number || null)
      
      // Auto-show dialog if mpesa_number is null
      if (!profile?.mpesa_number) {
        setIsMpesaDialogOpen(true)
      }
    } catch (err) {
      console.error('Error checking M-Pesa number:', err)
    }
  }

  const togglePermission = (id: string) => {
    setPermissions((prev) =>
      prev.map((permission) => (permission.id === id ? { ...permission, enabled: !permission.enabled } : permission)),
    )
  }

  const handleVoicePermission = (permission: Permission) => {
    // Simulate voice permission request
    alert(`Voice prompt: "${permission.voicePrompt}"`)
    togglePermission(permission.id)
  }

  return (
    <div className="min-h-screen p-4 pb-20">
      {/* Header */}
      <div className="flex items-center mb-6 pt-8">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("dashboard")} className="mr-3">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Permissions</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Manage app permissions via voice</p>
        </div>
      </div>

      {/* M-Pesa Settings Card */}
      <Card className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Phone className="h-6 w-6 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-semibold text-sm text-gray-900 dark:text-white">M-Pesa Number</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {mpesaNumber ? mpesaNumber : 'Not set - Click to add'}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setIsMpesaDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {mpesaNumber ? 'Change' : 'Set Now'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Permission Status */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-semibold text-sm">Privacy & Security</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                All permissions can be managed through voice commands
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions List */}
      <div className="space-y-4">
        {permissions.map((permission) => (
          <Card key={permission.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <div
                    className={`p-2 rounded-lg ${
                      permission.enabled ? "bg-green-100 dark:bg-green-900/20" : "bg-gray-100 dark:bg-gray-800"
                    }`}
                  >
                    <permission.icon
                      className={`h-5 w-5 ${
                        permission.enabled ? "text-green-600 dark:text-green-400" : "text-gray-400"
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-sm">{permission.name}</h3>
                      {permission.required && (
                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-full">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{permission.description}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 italic">
                      Voice: "{permission.voicePrompt}"
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleVoicePermission(permission)}
                    className="text-xs"
                  >
                    <Mic className="h-3 w-3 mr-1" />
                    Voice
                  </Button>
                  <Switch
                    checked={permission.enabled}
                    onCheckedChange={() => togglePermission(permission.id)}
                    disabled={permission.required}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Voice Commands Help */}
      <Card className="mt-6 mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Voice Permission Commands</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Grant Permission</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">"Ongea Pesa, ruhusu kutumia [permission]"</p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">Revoke Permission</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">"Ongea Pesa, zuia kutumia [permission]"</p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">Check Status</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">"Ongea Pesa, onyesha ruhusa zote"</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Privacy Notice</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>• Voice commands are processed locally when possible</p>
            <p>• Financial data is encrypted end-to-end</p>
            <p>• Location data is only used for sharing features</p>
            <p>• Contact access is limited to sending money</p>
            <p>• You can revoke permissions anytime via voice</p>
          </div>
        </CardContent>
      </Card>

      {/* M-Pesa Settings Dialog */}
      <MpesaSettingsDialog
        isOpen={isMpesaDialogOpen}
        onClose={() => setIsMpesaDialogOpen(false)}
        onSave={() => {
          checkMpesaNumber()
        }}
      />
    </div>
  )
}
