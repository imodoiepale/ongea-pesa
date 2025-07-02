"use client"

import { Mic, Volume2, Settings, TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react"

export default function DashboardVoiceCommands() {
  const voiceCommands = [
    {
      id: 1,
      command: "Send money to John KSh 500",
      category: "Transfer",
      frequency: 15,
      lastUsed: "2024-01-15",
      success: true,
      description: "Send money to contacts using voice",
    },
    {
      id: 2,
      command: "Check my balance",
      category: "Account",
      frequency: 45,
      lastUsed: "2024-01-15",
      success: true,
      description: "Check account balance instantly",
    },
    {
      id: 3,
      command: "Pay electricity bill",
      category: "Bills",
      frequency: 8,
      lastUsed: "2024-01-12",
      success: true,
      description: "Pay utility bills with voice commands",
    },
    {
      id: 4,
      command: "Show transaction history",
      category: "History",
      frequency: 22,
      lastUsed: "2024-01-14",
      success: true,
      description: "View recent transactions",
    },
    {
      id: 5,
      command: "Set savings goal",
      category: "Goals",
      frequency: 3,
      lastUsed: "2024-01-10",
      success: false,
      description: "Create and manage savings goals",
    },
  ]

  const voiceStats = {
    totalCommands: 93,
    successRate: 94.6,
    avgResponseTime: 1.2,
    dailyUsage: 12,
  }

  const recentActivity = [
    {
      id: 1,
      command: "Check balance",
      timestamp: "2024-01-15 14:30",
      status: "success",
      response: "Your M-Pesa balance is KSh 15,430.50",
    },
    {
      id: 2,
      command: "Send KSh 1000 to Mary",
      timestamp: "2024-01-15 12:15",
      status: "success",
      response: "Money sent successfully to Mary Wanjiku",
    },
    {
      id: 3,
      command: "Pay water bill",
      timestamp: "2024-01-15 09:45",
      status: "success",
      response: "Water bill payment of KSh 1,200 completed",
    },
    {
      id: 4,
      command: "Show spending report",
      timestamp: "2024-01-14 16:20",
      status: "failed",
      response: "Sorry, I couldn't understand that command",
    },
  ]

  const getCategoryColor = (category: string) => {
    const colors = {
      Transfer: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      Account: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      Bills: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      History: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      Goals: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
    }
    return colors[category as keyof typeof colors] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
      default:
        return <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Voice Commands</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage and track your voice interactions</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Voice Settings
        </button>
      </div>

      {/* Voice Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Commands</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{voiceStats.totalCommands}</p>
            </div>
            <Mic className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{voiceStats.successRate}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Response</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{voiceStats.avgResponseTime}s</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Daily Usage</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{voiceStats.dailyUsage}</p>
            </div>
            <Volume2 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </div>

      {/* Popular Commands */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Popular Voice Commands</h3>
        <div className="space-y-4">
          {voiceCommands.map((cmd) => (
            <div key={cmd.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${cmd.success ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"}`}
                >
                  {cmd.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">"{cmd.command}"</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{cmd.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(cmd.category)}`}>
                  {cmd.category}
                </span>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Used {cmd.frequency} times</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Last: {cmd.lastUsed}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Voice Activity</h3>
        <div className="space-y-4">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex-shrink-0 mt-1">{getStatusIcon(activity.status)}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-gray-900 dark:text-white">"{activity.command}"</p>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{activity.timestamp}</span>
                </div>
                <p
                  className={`text-sm ${activity.status === "success" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                >
                  {activity.response}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Voice Training */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Improve Voice Recognition</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Train the system to better understand your voice and accent
            </p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Start Training
          </button>
        </div>
      </div>
    </div>
  )
}
