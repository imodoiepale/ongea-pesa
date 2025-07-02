"use client"

import { useState } from "react"
import DashboardLayout from "./dashboard-layout"
import DashboardContent from "./dashboard-content"
import DashboardAnalytics from "./dashboard-analytics"
import DashboardOrganization from "./dashboard-organization"
import DashboardProjects from "./dashboard-projects"
import DashboardVoiceCommands from "./dashboard-voice-commands"
import DashboardTransactions from "./dashboard-transactions"
import DashboardContacts from "./dashboard-contacts"
import PaymentScanner from "./payment-scanner"
import RecurringPayments from "./recurring-payments"
import SecurityManager from "./security-manager"
import SendMoney from "./send-money"

type DashboardPage =
  | "dashboard"
  | "analytics"
  | "organization"
  | "projects"
  | "voice-commands"
  | "transactions"
  | "bills"
  | "mpesa"
  | "scanner"
  | "recurring"
  | "contacts"
  | "security"
  | "voice-chat"
  | "video-support"
  | "settings"
  | "help"
  | "send"

export default function Dashboard() {
  const [currentScreen, setCurrentScreen] = useState<DashboardPage>("dashboard")

  const renderScreen = () => {
    switch (currentScreen) {
      case "dashboard":
        return <DashboardContent onNavigate={setCurrentScreen} />
      case "analytics":
        return <DashboardAnalytics onNavigate={setCurrentScreen} />
      case "organization":
        return <DashboardOrganization onNavigate={setCurrentScreen} />
      case "projects":
        return <DashboardProjects onNavigate={setCurrentScreen} />
      case "voice-commands":
        return <DashboardVoiceCommands onNavigate={setCurrentScreen} />
      case "transactions":
        return <DashboardTransactions onNavigate={setCurrentScreen} />
      case "contacts":
        return <DashboardContacts onNavigate={setCurrentScreen} />
      case "security":
        return <SecurityManager onNavigate={setCurrentScreen} />
      case "bills":
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                  Bills & Payments
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Manage your recurring bills and utility payments
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm sm:text-base lg:text-lg font-semibold mb-3 sm:mb-4">Electricity (KPLC)</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">Account: 123456789</p>
                <p className="text-sm sm:text-base text-green-600 dark:text-green-400 font-medium">
                  Last Payment: KSh 2,500
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm sm:text-base lg:text-lg font-semibold mb-3 sm:mb-4">Water (Nairobi Water)</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">Account: 987654321</p>
                <p className="text-sm sm:text-base text-green-600 dark:text-green-400 font-medium">
                  Last Payment: KSh 1,200
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm sm:text-base lg:text-lg font-semibold mb-3 sm:mb-4">Internet (Safaricom)</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">Account: 0712345678</p>
                <p className="text-sm sm:text-base text-green-600 dark:text-green-400 font-medium">
                  Last Payment: KSh 3,000
                </p>
              </div>
            </div>
          </div>
        )
      case "mpesa":
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                  M-Pesa Integration
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Connect and manage your M-Pesa account
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-sm sm:text-base lg:text-lg font-semibold">M-Pesa Account</h3>
                <span className="px-2 sm:px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs sm:text-sm">
                  Connected
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">Phone: 0712345678</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">KSh 15,430.50</p>
            </div>
          </div>
        )
      case "scanner":
        return <PaymentScanner onNavigate={setCurrentScreen} />
      case "recurring":
        return <RecurringPayments onNavigate={setCurrentScreen} />
      case "voice-chat":
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Voice Chat</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Voice-powered customer support and assistance
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-center py-6 sm:py-8">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <svg
                    className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <h3 className="text-sm sm:text-base lg:text-lg font-semibold mb-2">Start Voice Chat</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
                  Get instant help with voice commands
                </p>
                <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-xs sm:text-sm">
                  Start Chat
                </button>
              </div>
            </div>
          </div>
        )
      case "video-support":
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                  Video Support
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Get help through video calls with our support team
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-center py-6 sm:py-8">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <svg
                    className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 dark:text-green-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 11-6 0V6zM14.553 7.106A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" />
                  </svg>
                </div>
                <h3 className="text-sm sm:text-base lg:text-lg font-semibold mb-2">Schedule Video Call</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
                  Connect with our support team face-to-face
                </p>
                <button className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 sm:px-6 rounded-lg text-xs sm:text-sm">
                  Schedule Call
                </button>
              </div>
            </div>
          </div>
        )
      case "settings":
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Configure your app preferences and account settings
                </p>
              </div>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm sm:text-base lg:text-lg font-semibold mb-3 sm:mb-4">Account Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm">Email Notifications</span>
                    <input type="checkbox" className="toggle" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm">SMS Notifications</span>
                    <input type="checkbox" className="toggle" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm">Voice Alerts</span>
                    <input type="checkbox" className="toggle" />
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm sm:text-base lg:text-lg font-semibold mb-3 sm:mb-4">Privacy Settings</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm">Share Usage Data</span>
                    <input type="checkbox" className="toggle" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm">Location Services</span>
                    <input type="checkbox" className="toggle" defaultChecked />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      case "help":
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                  Help & Support
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Get help and find answers to common questions
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm sm:text-base lg:text-lg font-semibold mb-3 sm:mb-4">
                  Frequently Asked Questions
                </h3>
                <div className="space-y-3">
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                    <p className="font-medium text-xs sm:text-sm">How do I send money using voice?</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Say "Send money to [contact name] amount [amount]"
                    </p>
                  </div>
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                    <p className="font-medium text-xs sm:text-sm">How do I check my balance?</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Say "Check balance" or "What's my balance?"
                    </p>
                  </div>
                  <div className="pb-2">
                    <p className="font-medium text-xs sm:text-sm">How do I pay bills?</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Say "Pay [bill name]" or use the scanner feature
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm sm:text-base lg:text-lg font-semibold mb-3 sm:mb-4">Contact Support</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                    <span className="text-xs sm:text-sm">Phone: +254 700 123 456</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
                    <span className="text-xs sm:text-sm">Email: support@ongeapesa.com</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-3 h-3 bg-purple-500 rounded-full mr-3"></span>
                    <span className="text-xs sm:text-sm">Live Chat: Available 24/7</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      case "send":
        return <SendMoney onNavigate={setCurrentScreen} />
      default:
        return <DashboardContent onNavigate={setCurrentScreen} />
    }
  }

  return (
    <DashboardLayout currentPage={currentScreen} onNavigate={setCurrentScreen}>
      {renderScreen()}
    </DashboardLayout>
  )
}
