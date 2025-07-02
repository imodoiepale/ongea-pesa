import { cn } from "@/lib/utils"
import {
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  SendHorizontal,
  QrCode,
  Plus,
  ArrowRight,
  CreditCard,
  Mic,
} from "lucide-react"

interface AccountItem {
  id: string
  title: string
  description?: string
  balance: string
  type: "savings" | "checking" | "investment" | "debt" | "mpesa"
}

interface List01Props {
  totalBalance?: string
  accounts?: AccountItem[]
  className?: string
}

const ACCOUNTS: AccountItem[] = [
  {
    id: "1",
    title: "M-Pesa Account",
    description: "Voice-enabled mobile money",
    balance: "KSh 8,459.45",
    type: "mpesa",
  },
  {
    id: "2",
    title: "Checking Account",
    description: "Daily voice transactions",
    balance: "KSh 2,850.00",
    type: "checking",
  },
  {
    id: "3",
    title: "Investment Portfolio",
    description: "Voice-managed investments",
    balance: "KSh 15,230.80",
    type: "investment",
  },
  {
    id: "4",
    title: "Credit Card",
    description: "Voice payment tracking",
    balance: "KSh 1,200.00",
    type: "debt",
  },
  {
    id: "5",
    title: "Savings Account",
    description: "Voice savings goals",
    balance: "KSh 3,000.00",
    type: "savings",
  },
]

export default function DashboardList01({
  totalBalance = "KSh 30,740.25",
  accounts = ACCOUNTS,
  className,
}: List01Props) {
  return (
    <div
      className={cn(
        "w-full max-w-xl mx-auto",
        "bg-white/60 dark:bg-gray-800/60",
        "border border-gray-200 dark:border-gray-700",
        "rounded-xl shadow-sm backdrop-blur-xl",
        className,
      )}
    >
      {/* Total Balance Section */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-600 dark:text-gray-400">Total Balance</p>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{totalBalance}</h1>
        <p className="text-xs text-green-600 dark:text-[#00FF88] mt-1">
          <Mic className="w-3 h-3 inline mr-1" />
          Voice-enabled accounts
        </p>
      </div>

      {/* Accounts List */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-medium text-gray-900 dark:text-white">Your Accounts</h2>
        </div>

        <div className="space-y-1">
          {accounts.map((account) => (
            <div
              key={account.id}
              className={cn(
                "group flex items-center justify-between",
                "p-2 rounded-lg",
                "hover:bg-gray-100 dark:hover:bg-gray-800/50",
                "transition-all duration-200",
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn("p-1.5 rounded-lg", {
                    "bg-green-100 dark:bg-green-900/30": account.type === "savings",
                    "bg-blue-100 dark:bg-blue-900/30": account.type === "checking",
                    "bg-purple-100 dark:bg-purple-900/30": account.type === "investment",
                    "bg-red-100 dark:bg-red-900/30": account.type === "debt",
                    "bg-gradient-to-r from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30":
                      account.type === "mpesa",
                  })}
                >
                  {account.type === "savings" && <Wallet className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />}
                  {account.type === "checking" && <QrCode className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                  {account.type === "investment" && (
                    <ArrowUpRight className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  )}
                  {account.type === "debt" && <CreditCard className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />}
                  {account.type === "mpesa" && <Mic className="w-3.5 h-3.5 text-green-600 dark:text-[#00FF88]" />}
                </div>
                <div>
                  <h3 className="text-xs font-medium text-gray-900 dark:text-white">{account.title}</h3>
                  {account.description && (
                    <p className="text-[11px] text-gray-600 dark:text-gray-400">{account.description}</p>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-medium text-gray-900 dark:text-white">{account.balance}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Updated footer with voice-enabled actions */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            className={cn(
              "flex items-center justify-center gap-2",
              "py-2 px-3 rounded-lg",
              "text-xs font-medium",
              "bg-gradient-to-r from-green-500 to-blue-600 dark:from-[#00FF88] dark:to-[#00D4AA]",
              "text-white",
              "hover:from-green-600 hover:to-blue-700 dark:hover:from-[#00E67A] dark:hover:to-[#00C299]",
              "shadow-sm hover:shadow",
              "transition-all duration-200",
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
          <button
            type="button"
            className={cn(
              "flex items-center justify-center gap-2",
              "py-2 px-3 rounded-lg",
              "text-xs font-medium",
              "bg-gradient-to-r from-blue-500 to-purple-600 dark:from-[#00D4AA] dark:to-[#8B5CF6]",
              "text-white",
              "hover:from-blue-600 hover:to-purple-700",
              "shadow-sm hover:shadow",
              "transition-all duration-200",
            )}
          >
            <SendHorizontal className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
          <button
            type="button"
            className={cn(
              "flex items-center justify-center gap-2",
              "py-2 px-3 rounded-lg",
              "text-xs font-medium",
              "bg-gradient-to-r from-purple-500 to-pink-600 dark:from-[#8B5CF6] dark:to-[#EC4899]",
              "text-white",
              "hover:from-purple-600 hover:to-pink-700",
              "shadow-sm hover:shadow",
              "transition-all duration-200",
            )}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Top-up</span>
          </button>
          <button
            type="button"
            className={cn(
              "flex items-center justify-center gap-2",
              "py-2 px-3 rounded-lg",
              "text-xs font-medium",
              "bg-gradient-to-r from-gray-500 to-gray-600 dark:from-gray-600 dark:to-gray-700",
              "text-white",
              "hover:from-gray-600 hover:to-gray-700",
              "shadow-sm hover:shadow",
              "transition-all duration-200",
            )}
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>More</span>
          </button>
        </div>
      </div>
    </div>
  )
}
