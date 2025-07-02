"use client"

import { useState } from "react"
import { ArrowLeft, BarChart3, Mic, TrendingUp, TrendingDown, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface AnalyticsProps {
  onNavigate: (screen: string) => void
}

export default function Analytics({ onNavigate }: AnalyticsProps) {
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [voiceQuery, setVoiceQuery] = useState("")

  const handleVoiceQuery = () => {
    setIsVoiceMode(true)
    setTimeout(() => {
      setVoiceQuery("Niambie matumizi ya mwezi huu")
      setIsVoiceMode(false)
    }, 2000)
  }

  const spendingCategories = [
    { name: "Food & Dining", amount: "KSh 8,500", percentage: 35, color: "bg-red-500" },
    { name: "Transportation", amount: "KSh 4,200", percentage: 18, color: "bg-blue-500" },
    { name: "Utilities", amount: "KSh 3,800", percentage: 16, color: "bg-green-500" },
    { name: "Entertainment", amount: "KSh 2,100", percentage: 9, color: "bg-purple-500" },
    { name: "Shopping", amount: "KSh 5,200", percentage: 22, color: "bg-orange-500" },
  ]

  const monthlyStats = {
    totalSpent: "KSh 23,800",
    totalReceived: "KSh 45,000",
    netSavings: "KSh 21,200",
    transactions: 127,
  }

  return (
    <div className="min-h-screen p-4 pb-20">
      {/* Header */}
      <div className="flex items-center mb-6 pt-8">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("dashboard")} className="mr-3">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Spending insights & reports</p>
        </div>
      </div>

      {/* Voice Query */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Voice Query</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Ask: "Niambie matumizi ya mwezi huu"</p>
            </div>
            <Button
              onClick={handleVoiceQuery}
              disabled={isVoiceMode}
              className={`rounded-full ${isVoiceMode ? "bg-red-500 animate-pulse" : "bg-green-500"}`}
            >
              <Mic className="h-4 w-4" />
            </Button>
          </div>
          {voiceQuery && (
            <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300">Query: "{voiceQuery}"</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
            January 2024 Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <TrendingDown className="h-6 w-6 mx-auto mb-1 text-red-600" />
              <p className="text-xs text-red-600 dark:text-red-400">Total Spent</p>
              <p className="font-bold text-red-700 dark:text-red-300">{monthlyStats.totalSpent}</p>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <TrendingUp className="h-6 w-6 mx-auto mb-1 text-green-600" />
              <p className="text-xs text-green-600 dark:text-green-400">Total Received</p>
              <p className="font-bold text-green-700 dark:text-green-300">{monthlyStats.totalReceived}</p>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <DollarSign className="h-6 w-6 mx-auto mb-1 text-blue-600" />
              <p className="text-xs text-blue-600 dark:text-blue-400">Net Savings</p>
              <p className="font-bold text-blue-700 dark:text-blue-300">{monthlyStats.netSavings}</p>
            </div>
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <BarChart3 className="h-6 w-6 mx-auto mb-1 text-purple-600" />
              <p className="text-xs text-purple-600 dark:text-purple-400">Transactions</p>
              <p className="font-bold text-purple-700 dark:text-purple-300">{monthlyStats.transactions}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Spending Categories */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Spending by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {spendingCategories.map((category, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{category.name}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{category.amount}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`${category.color} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${category.percentage}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{category.percentage}% of total spending</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Voice Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Voice Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start bg-transparent"
              onClick={() => {
                // Simulate TTS
                alert(
                  'Playing: "Mwezi huu umetumia shilingi elfu ishirini na tatu mia nane. Kategoria kubwa ni chakula na malazi."',
                )
              }}
            >
              <Mic className="h-4 w-4 mr-2" />
              Play Monthly Summary (Swahili)
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start bg-transparent"
              onClick={() => {
                // Simulate TTS
                alert('Playing: "This month you spent 23,800 shillings. Your biggest category was food and dining."')
              }}
            >
              <Mic className="h-4 w-4 mr-2" />
              Play Monthly Summary (English)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">AI Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">💡 Spending Alert</p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                Your food spending increased by 15% this month. Consider setting a budget limit.
              </p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">✅ Good Progress</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                You saved 47% of your income this month. Great job!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
