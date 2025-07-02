"use client"

import { useState, useEffect } from "react"
import { Mic, MicOff, Volume2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import VoiceWaveform from "./voice-waveform"

interface VoiceInterfaceProps {
  onNavigate: (screen: string) => void
  isListening: boolean
  setIsListening: (listening: boolean) => void
}

export default function VoiceInterface({ onNavigate, isListening, setIsListening }: VoiceInterfaceProps) {
  const [transcript, setTranscript] = useState("")
  const [response, setResponse] = useState("")
  const [recordingTime, setRecordingTime] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isListening) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } else {
      setRecordingTime(0)
    }
    return () => clearInterval(interval)
  }, [isListening])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleVoiceCommand = (command: string) => {
    setTranscript(command)
    setIsListening(false)

    // Simulate AI response
    setTimeout(() => {
      if (command.includes("tuma") || command.includes("send")) {
        setResponse("Nimeelewa. Unataka kutuma pesa. Ni kiasi gani na kwa nani?")
      } else if (command.includes("balance") || command.includes("salio")) {
        setResponse("Salio lako ni shilingi elfu kumi na mia nne hamsini. KSh 12,450.")
      } else {
        setResponse("Samahani, sijaelewi. Tafadhali rudia.")
      }
    }, 1000)
  }

  const simulateCommands = [
    "Ongea Pesa, tuma 500 kwa John",
    "Check my balance",
    "Tuma 200 kwa namba 0712345678",
    "Seti malipo ya kodi kila tarehe moja",
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-[#0A1A2A] dark:via-[#0F2027] dark:to-[#203A43] relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center mb-6 pt-8 px-4 relative z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onNavigate("dashboard")}
          className="mr-3 text-gray-600 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-gray-800/50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Record</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Speak naturally in Swahili or English</p>
        </div>
      </div>

      {/* Main Voice Interface */}
      <div className="px-4 relative z-10">
        <Card className="mb-6 bg-white/80 dark:bg-[#0A1A2A]/90 backdrop-blur-sm border-gray-200 dark:border-gray-700/50 shadow-2xl">
          <CardContent className="p-8 text-center">
            {/* Top Waveform */}
            <div className="mb-8">
              <VoiceWaveform isActive={isListening} position="top" />
            </div>

            {/* Main Content */}
            <div className="mb-8">
              {transcript ? (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-relaxed">{transcript}</h2>
                  <div className="text-[#00FF88] font-mono text-lg">{formatTime(recordingTime)}</div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-relaxed">
                    {isListening ? "Listening..." : "Tap to speak"}
                  </h2>
                  {isListening && (
                    <div className="text-[#00FF88] font-mono text-lg animate-pulse">{formatTime(recordingTime)}</div>
                  )}
                </div>
              )}
            </div>

            {/* Voice Control Button */}
            <div className="relative mb-8">
              {/* Pulsing rings when listening */}
              {isListening && (
                <>
                  <div className="absolute inset-0 rounded-full bg-[#00FF88] animate-ping opacity-20" />
                  <div className="absolute inset-2 rounded-full bg-[#00FF88] animate-ping opacity-30 animation-delay-200" />
                  <div className="absolute inset-4 rounded-full bg-[#00FF88] animate-ping opacity-40 animation-delay-400" />
                </>
              )}

              <Button
                onMouseDown={() => setIsListening(true)}
                onMouseUp={() => setIsListening(false)}
                onTouchStart={() => setIsListening(true)}
                onTouchEnd={() => setIsListening(false)}
                className={`w-20 h-20 rounded-full shadow-2xl transition-all duration-300 relative z-10 ${
                  isListening
                    ? "bg-[#00FF88] hover:bg-[#00E67A] scale-110"
                    : "bg-gray-600 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600"
                }`}
              >
                {isListening ? <Mic className="h-8 w-8 text-white" /> : <MicOff className="h-8 w-8 text-white" />}
              </Button>
            </div>

            {/* Bottom Waveform */}
            <div className="mb-4">
              <VoiceWaveform isActive={isListening} position="bottom" />
            </div>

            {/* Status Text */}
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isListening ? "Release to stop recording" : "Hold to record"}
            </p>
          </CardContent>
        </Card>

        {/* Transcript */}
        {transcript && (
          <Card className="mb-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-500 dark:bg-[#00D4AA] rounded-full flex items-center justify-center">
                  <Mic className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-900 dark:text-white">You said:</p>
                  <p className="text-gray-700 dark:text-gray-300">{transcript}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Response */}
        {response && (
          <Card className="mb-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-[#00FF88] rounded-full flex items-center justify-center">
                  <Volume2 className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-900 dark:text-white">Ongea Pesa:</p>
                  <p className="text-gray-700 dark:text-gray-300">{response}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Test Commands */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Try these commands:</p>
          {simulateCommands.map((command, index) => (
            <Button
              key={index}
              variant="outline"
              className="w-full text-left justify-start h-auto p-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-gray-200 dark:border-gray-700 hover:bg-white/80 dark:hover:bg-gray-800/80"
              onClick={() => handleVoiceCommand(command)}
            >
              <div>
                <p className="font-medium text-sm text-gray-900 dark:text-white">{command}</p>
              </div>
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
