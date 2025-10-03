"use client"

import { useState } from "react"
import { ArrowLeft, Mic, Play, Volume2, TestTube } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Screen = "dashboard" | "voice" | "send" | "camera" | "recurring" | "analytics" | "test" | "permissions" | "scanner";

interface VoiceTestProps {
  onNavigate: (screen: Screen) => void;
}

export default function VoiceTest({ onNavigate }: VoiceTestProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTest, setCurrentTest] = useState<string | null>(null)

  const testScenarios = [
    {
      id: "send-money",
      title: "Send Money Command",
      userInput: "Ongea Pesa, tuma 500 kwa John",
      expectedResponse:
        "Nimeelewa. Unataka kutuma shilingi mia tano kwa John. Je, ni John Doe katika orodha yako ya mawasiliano?",
      category: "Money Transfer",
    },
    {
      id: "unsaved-number",
      title: "Unsaved Number",
      userInput: "Tuma 200 kwa namba 0712345678",
      expectedResponse: "Sawa, nitatuma shilingi mia mbili kwa namba 0712345678. Je, unahakikisha?",
      category: "Money Transfer",
    },
    {
      id: "location-share",
      title: "Location Sharing",
      userInput: "Tuma miundo hii",
      expectedResponse: "Nitachukua picha ya mahali ulipo na kutuma. Ngoja kidogo...",
      category: "Location",
    },
    {
      id: "balance-check",
      title: "Balance Inquiry",
      userInput: "Check my balance",
      expectedResponse:
        "Your current balance is 12,450 shillings. Salio lako ni shilingi elfu kumi na mia nne hamsini.",
      category: "Account",
    },
    {
      id: "recurring-setup",
      title: "Recurring Payment",
      userInput: "Seti malipo ya kodi kila tarehe moja",
      expectedResponse: "Nitaseti malipo ya kodi kila mwezi tarehe moja. Ni kiasi gani cha kodi?",
      category: "Automation",
    },
  ]

  const handleTestVoice = (scenario: any) => {
    setCurrentTest(scenario.id)
    setIsRecording(true)

    setTimeout(() => {
      setIsRecording(false)
      setIsPlaying(true)

      setTimeout(() => {
        setIsPlaying(false)
        setCurrentTest(null)
      }, 3000)
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Voice Test Mode</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Test AI voice responses</p>
        </div>
      </div>

      {/* Test Status */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  isRecording ? "bg-red-500 animate-pulse" : isPlaying ? "bg-green-500 animate-pulse" : "bg-gray-300"
                }`}
              />
              <div>
                <p className="font-semibold text-sm">
                  {isRecording ? "Recording..." : isPlaying ? "Playing Response..." : "Ready to Test"}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {isRecording
                    ? "Listening to your command"
                    : isPlaying
                      ? "AI is responding"
                      : "Select a test scenario"}
                </p>
              </div>
            </div>
            <TestTube className="h-6 w-6 text-indigo-600" />
          </div>
        </CardContent>
      </Card>

      {/* Test Scenarios */}
      <div className="space-y-4">
        {testScenarios.map((scenario) => (
          <Card key={scenario.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{scenario.title}</CardTitle>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Category: {scenario.category}</p>
                </div>
                <Button
                  onClick={() => handleTestVoice(scenario)}
                  disabled={isRecording || isPlaying}
                  className={`rounded-full ${
                    currentTest === scenario.id && isRecording
                      ? "bg-red-500 animate-pulse"
                      : currentTest === scenario.id && isPlaying
                        ? "bg-green-500 animate-pulse"
                        : "bg-indigo-500 hover:bg-indigo-600"
                  }`}
                >
                  {currentTest === scenario.id && isRecording ? (
                    <Mic className="h-4 w-4" />
                  ) : currentTest === scenario.id && isPlaying ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">User Input:</p>
                  <p className="text-sm bg-blue-50 dark:bg-blue-900/20 p-2 rounded">"{scenario.userInput}"</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Expected AI Response:</p>
                  <p className="text-sm bg-green-50 dark:bg-green-900/20 p-2 rounded">"{scenario.expectedResponse}"</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Voice Engine Settings */}
      <Card className="mt-6 mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Voice Engine Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">TTS Provider</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">ElevenLabs</p>
              </div>
              <Button variant="outline" size="sm">
                Configure
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Voice Model</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Multilingual (Swahili/English)</p>
              </div>
              <Button variant="outline" size="sm">
                Change
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Conversation Flow</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Vapi Integration</p>
              </div>
              <Button variant="outline" size="sm">
                Test
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Recent Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
              <span className="text-sm">Send Money Command</span>
              <span className="text-xs text-green-600 dark:text-green-400">✓ Passed</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
              <span className="text-sm">Balance Inquiry</span>
              <span className="text-xs text-green-600 dark:text-green-400">✓ Passed</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
              <span className="text-sm">Location Sharing</span>
              <span className="text-xs text-yellow-600 dark:text-yellow-400">⚠ Needs Review</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
