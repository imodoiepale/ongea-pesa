"use client"

import { Mic, Send, Camera, Calendar, BarChart3, Settings, TestTube, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTheme } from "next-themes"
import { useState, useEffect } from "react"
import WaveAnimation from "./wave-animation"

interface MainDashboardProps {
  onNavigate: (screen: string) => void
  onVoiceActivate: () => void
}

export default function MainDashboard({ onNavigate, onVoiceActivate }: MainDashboardProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleVoiceActivation = () => {
    onVoiceActivate()
    onNavigate("voice")
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen p-4 pb-24 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-10 dark:opacity-20">
        <WaveAnimation />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 pt-8 relative z-10">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ongea Pesa</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">Voice-First Financial Companion</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5 text-yellow-500" />
            ) : (
              <Moon className="h-5 w-5 text-gray-600" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onNavigate("permissions")}
            className="rounded-full border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Balance Card */}
      <Card className="mb-6 bg-gradient-to-r from-green-500 to-blue-600 dark:from-[#00FF88] dark:to-[#00D4AA] text-white border-0 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent dark:from-black/40 dark:to-transparent" />
        <CardContent className="p-6 relative z-10">
          <div className="text-center">
            <p className="text-green-100 dark:text-gray-200 text-sm mb-2">Available Balance</p>
            <h2 className="text-3xl font-bold mb-4 animate-pulse">KSh 12,450.00</h2>
            <p className="text-green-100 dark:text-gray-300 text-xs">
              Say "Ongea Pesa, check balance" for voice update
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Voice Activation Button */}
      <div className="flex justify-center mb-8 relative z-10">
        <div className="relative">
          {/* Pulsing rings */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-500 to-blue-600 dark:from-[#00FF88] dark:to-[#00D4AA] animate-ping opacity-20" />
          <div className="absolute inset-2 rounded-full bg-gradient-to-r from-green-500 to-blue-600 dark:from-[#00FF88] dark:to-[#00D4AA] animate-ping opacity-30 animation-delay-200" />
          <div className="absolute inset-4 rounded-full bg-gradient-to-r from-green-500 to-blue-600 dark:from-[#00FF88] dark:to-[#00D4AA] animate-ping opacity-40 animation-delay-400" />

          <Button
            onClick={handleVoiceActivation}
            className="w-24 h-24 rounded-full bg-gradient-to-r from-green-500 to-blue-600 dark:from-[#00FF88] dark:to-[#00D4AA] hover:from-green-600 hover:to-blue-700 dark:hover:from-[#00E67A] dark:hover:to-[#00C299] shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 relative z-10"
          >
            <div className="flex flex-col items-center">
              <Mic className="h-8 w-8 mb-1 animate-bounce" />
              <span className="text-xs font-semibold">Push to Talk</span>
            </div>
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
        <Card
          className="cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:scale-105 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700"
          onClick={() => onNavigate("send")}
        >
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 dark:from-[#00FF88] dark:to-[#00E67A] rounded-full flex items-center justify-center mx-auto mb-3">
              <Send className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Send Money</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Voice or manual</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:scale-105 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700"
          onClick={() => onNavigate("scanner")}
        >
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-[#00D4AA] dark:to-[#00C299] rounded-full flex items-center justify-center mx-auto mb-3">
              <Camera className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Payment Scanner</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Bills, receipts & QR</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:scale-105 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700"
          onClick={() => onNavigate("recurring")}
        >
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 dark:from-[#8B5CF6] dark:to-[#7C3AED] rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Recurring</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Auto payments</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:scale-105 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700"
          onClick={() => onNavigate("analytics")}
        >
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 dark:from-[#F97316] dark:to-[#EA580C] rounded-full flex items-center justify-center mx-auto mb-3">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Analytics</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Spending stats</p>
          </CardContent>
        </Card>
      </div>

      {/* Voice Commands Help */}
      <Card className="mb-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700 relative z-10">
        <CardHeader>
          <CardTitle className="text-lg flex items-center text-gray-900 dark:text-white">
            <Mic className="h-5 w-5 mr-2 text-green-600 dark:text-[#00FF88]" />
            Voice Commands
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-gray-700/50 dark:to-gray-600/50 rounded-lg">
            <p className="font-medium text-gray-900 dark:text-white">"Ongea Pesa, tuma 500 kwa John"</p>
            <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">Send money to contact</p>
          </div>
          <div className="text-sm p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-600/50 dark:to-gray-700/50 rounded-lg">
            <p className="font-medium text-gray-900 dark:text-white">"Tuma 200 kwa namba 0712345678"</p>
            <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">Send to unsaved number</p>
          </div>
          <div className="text-sm p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-700/50 dark:to-gray-600/50 rounded-lg">
            <p className="font-medium text-gray-900 dark:text-white">"Tuma miundo hii"</p>
            <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">Share current location</p>
          </div>
        </CardContent>
      </Card>

      {/* Voice Test Mode */}
      <Card
        className="cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:scale-105 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700 relative z-10"
        onClick={() => onNavigate("test")}
      >
        <CardContent className="p-4 flex items-center">
          <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-indigo-600 dark:from-[#6366F1] dark:to-[#4F46E5] rounded-full flex items-center justify-center mr-4">
            <TestTube className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Voice Test Mode</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">Test AI voice responses</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
