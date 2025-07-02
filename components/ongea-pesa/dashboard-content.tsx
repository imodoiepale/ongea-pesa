import { Calendar, CreditCard, Wallet, Mic } from "lucide-react"
import List01 from "./dashboard-list-01"
import List02 from "./dashboard-list-02"
import List03 from "./dashboard-list-03"

export default function DashboardContent() {
  return (
    <div className="space-y-4">
      {/* Voice Command Quick Access */}
      <div className="bg-gradient-to-r from-green-500 to-blue-600 dark:from-[#00FF88] dark:to-[#00D4AA] rounded-xl p-4 text-white mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold mb-1">Voice Commands Ready</h2>
            <p className="text-sm opacity-90">Say "Ongea Pesa" to start voice banking</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Mic className="h-6 w-6 animate-pulse" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/80 dark:bg-[#0A1A2A]/90 backdrop-blur-sm rounded-xl p-6 flex flex-col border border-gray-200 dark:border-gray-700/50 shadow-lg">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-left flex items-center gap-2">
            <Wallet className="w-5 h-5 text-green-600 dark:text-[#00FF88]" />
            Accounts
          </h2>
          <div className="flex-1">
            <List01 className="h-full" />
          </div>
        </div>
        <div className="bg-white/80 dark:bg-[#0A1A2A]/90 backdrop-blur-sm rounded-xl p-6 flex flex-col border border-gray-200 dark:border-gray-700/50 shadow-lg">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-left flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600 dark:text-[#00D4AA]" />
            Recent Transactions
          </h2>
          <div className="flex-1">
            <List02 className="h-full" />
          </div>
        </div>
      </div>

      <div className="bg-white/80 dark:bg-[#0A1A2A]/90 backdrop-blur-sm rounded-xl p-6 flex flex-col items-start justify-start border border-gray-200 dark:border-gray-700/50 shadow-lg">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-left flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          Upcoming Events
        </h2>
        <List03 />
      </div>
    </div>
  )
}
