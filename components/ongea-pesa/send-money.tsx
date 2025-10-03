"use client"

import { useState } from "react"
import { ArrowLeft, Mic, Send, User, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Screen = "dashboard" | "voice" | "send" | "camera" | "recurring" | "analytics" | "test" | "permissions" | "scanner";

interface SendMoneyProps {
  onNavigate: (screen: Screen) => void;
}

export default function SendMoney({ onNavigate }: SendMoneyProps) {
  const [amount, setAmount] = useState("")
  const [recipient, setRecipient] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [voiceCommand, setVoiceCommand] = useState("")

  const handleVoiceSend = () => {
    setIsVoiceMode(true)
    // Simulate voice recognition
    setTimeout(() => {
      setVoiceCommand("Tuma 500 kwa John Doe")
      setAmount("500")
      setRecipient("John Doe")
      setIsVoiceMode(false)
    }, 2000)
  }

  const recentContacts = [
    { name: "John Doe", phone: "0712345678", avatar: "JD" },
    { name: "Mary Smith", phone: "0723456789", avatar: "MS" },
    { name: "Peter Kamau", phone: "0734567890", avatar: "PK" },
  ]

  return (
    <div className="min-h-screen p-4 pb-20">
      {/* Header */}
      <div className="flex items-center mb-6 pt-8">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("dashboard")} className="mr-3">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Send Money</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Voice or manual entry</p>
        </div>
      </div>

      {/* Voice Command Card */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Voice Command</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Say: "Tuma [amount] kwa [name/number]"</p>
            </div>
            <Button
              onClick={handleVoiceSend}
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

      {/* Amount Input */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-green-600" />
            Amount
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">KSh</span>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-12 text-lg h-12"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {["100", "500", "1000"].map((preset) => (
              <Button key={preset} variant="outline" size="sm" onClick={() => setAmount(preset)}>
                KSh {preset}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recipient Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <User className="h-5 w-5 mr-2 text-blue-600" />
            Send To
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="recipient">Contact Name</Label>
            <Input
              id="recipient"
              placeholder="Enter contact name"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="phone">Or Phone Number</Label>
            <Input
              id="phone"
              placeholder="0712345678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Recent Contacts */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Recent Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentContacts.map((contact, index) => (
              <div
                key={index}
                className="flex items-center p-3 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => {
                  setRecipient(contact.name)
                  setPhoneNumber(contact.phone)
                }}
              >
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                  {contact.avatar}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{contact.name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{contact.phone}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Send Button */}
      <div className="fixed bottom-6 left-4 right-4">
        <Button
          className="w-full h-12 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
          disabled={!amount || (!recipient && !phoneNumber)}
        >
          <Send className="h-5 w-5 mr-2" />
          Send KSh {amount || "0"}
        </Button>
      </div>
    </div>
  )
}
