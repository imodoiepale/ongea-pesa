"use client"

import { useState } from "react"
import { ArrowLeft, Calendar, Plus, Mic, Bell, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
    <div className="min-h-screen p-4 pb-20">
      {/* Header */}
      <div className="flex items-center mb-6 pt-8">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("dashboard")} className="mr-3">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Recurring Payments</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Automated bill payments</p>
        </div>
      </div>

      {/* Voice Setup */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Voice Setup</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Say: "Seti malipo ya [bill] kila [frequency]"</p>
            </div>
            <Button
              onClick={handleVoiceSetup}
              disabled={isVoiceMode}
              className={`rounded-full ${isVoiceMode ? "bg-red-500 animate-pulse" : "bg-green-500"}`}
            >
              <Mic className="h-4 w-4" />
            </Button>
          </div>
          {voiceCommand && (
            <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300">Heard: "{voiceCommand}"</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Payments */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-purple-600" />
              Active Payments
            </div>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {payments.map((payment) => (
              <div key={payment.id} className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">{payment.name}</h3>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        payment.status === "active"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {payment.status}
                    </span>
                    <Button size="sm" variant="ghost">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Amount</p>
                    <p className="font-medium">{payment.amount}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Frequency</p>
                    <p className="font-medium">{payment.frequency}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Next Payment</p>
                    <p className="font-medium">{payment.nextDate}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Recipient</p>
                    <p className="font-medium">{payment.recipient}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Reminders */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Bell className="h-5 w-5 mr-2 text-orange-600" />
            Upcoming Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-orange-700 dark:text-orange-300">Electricity Bill Due</p>
                  <p className="text-xs text-orange-600 dark:text-orange-400">Tomorrow - KSh 3,500</p>
                </div>
                <Button size="sm" variant="outline">
                  Pay Now
                </Button>
              </div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-blue-700 dark:text-blue-300">Rent Payment Due</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">In 3 days - KSh 25,000</p>
                </div>
                <Button size="sm" variant="outline">
                  Remind Me
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voice Reminders */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Voice Reminders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 border rounded-lg">
              <p className="text-sm font-medium">Daily Reminder</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                "Ni siku ya malipo ya kiraia leo" - Spoken at 9:00 AM
              </p>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="text-sm font-medium">Payment Confirmation</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                "Malipo yamekamilika. Niliset prompt kila tarehe moja"
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
