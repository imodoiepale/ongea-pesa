"use client"

import { useState } from "react"
import { ArrowLeft, Shield, Camera, ContactIcon as Contacts, Mic, MessageSquare, MapPin, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"

interface PermissionManagerProps {
  onNavigate: (screen: string) => void
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
    </div>
  )
}
