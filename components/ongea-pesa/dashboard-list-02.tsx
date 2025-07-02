import { cn } from "@/lib/utils"
import {
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  ShoppingCart,
  CreditCard,
  type LucideIcon,
  ArrowRight,
  Mic,
} from "lucide-react"

interface Transaction {
  id: string
  title: string
  amount: string
  type: "incoming" | "outgoing"
  category: string
  icon: LucideIcon
  timestamp: string
  status: "completed" | "pending" | "failed"
  voiceInitiated?: boolean
}

interface List02Props {
  transactions?: Transaction[]
  className?: string
}

const TRANSACTIONS: Transaction[] = [
  {
    id: "1",
    title: "Voice Payment - Naivas",
    amount: "KSh 999.00",
    type: "outgoing",
    category: "shopping",
    icon: ShoppingCart,
    timestamp: "Today, 2:45 PM",
    status: "completed",
    voiceInitiated: true,
  },
  {
    id: "2",
    title: "Salary Deposit",
    amount: "KSh 4,500.00",
    type: "incoming",
    category: "transport",
    icon: Wallet,
    timestamp: "Today, 9:00 AM",
    status: "completed",
    voiceInitiated: false,
  },
  {
    id: "3",
    title: "Voice Command - Netflix",
    amount: "KSh 1,200.00",
    type: "outgoing",
    category: "entertainment",
    icon: CreditCard,
    timestamp: "Yesterday",
    status: "pending",
    voiceInitiated: true,
  },
  {
    id: "4",
    title: "M-Pesa Transfer",
    amount: "KSh 500.00",
    type: "outgoing",
    category: "shopping",
    icon: ShoppingCart,
    timestamp: "Yesterday, 2:45 PM",
    status: "completed",
    voiceInitiated: true,
  },
  {
    id: "5",
    title: "Voice Bill Payment",
    amount: "KSh 2,500.00",
    type: "outgoing",
    category: "utilities",
    icon: CreditCard,
    timestamp: "2 days ago",
    status: "completed",
    voiceInitiated: true,
  },
  {
    id: "6",
    title: "Freelance Payment",
    amount: "KSh 8,000.00",
    type: "incoming",
    category: "income",
    icon: Wallet,
    timestamp: "3 days ago",
    status: "completed",
    voiceInitiated: false,
  },
]

export default function DashboardList02({ transactions = TRANSACTIONS, className }: List02Props) {
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
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Recent Activity
            <span className="text-xs font-normal text-gray-600 dark:text-gray-400 ml-1">(23 transactions)</span>
          </h2>
          <span className="text-xs text-green-600 dark:text-[#00FF88] flex items-center">
            <Mic className="w-3 h-3 mr-1" />
            Voice-enabled
          </span>
        </div>

        <div className="space-y-1">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className={cn(
                "group flex items-center gap-3",
                "p-2 rounded-lg",
                "hover:bg-gray-100 dark:hover:bg-gray-800/50",
                "transition-all duration-200",
              )}
            >
              <div
                className={cn(
                  "p-2 rounded-lg relative",
                  "bg-gray-100 dark:bg-gray-800",
                  "border border-gray-200 dark:border-gray-700",
                )}
              >
                <transaction.icon className="w-4 h-4 text-gray-900 dark:text-white" />
                {transaction.voiceInitiated && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#00FF88] rounded-full flex items-center justify-center">
                    <Mic className="w-2 h-2 text-white" />
                  </div>
                )}
              </div>

              <div className="flex-1 flex items-center justify-between min-w-0">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-medium text-gray-900 dark:text-white">{transaction.title}</h3>
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] text-gray-600 dark:text-gray-400">{transaction.timestamp}</p>
                    {transaction.voiceInitiated && (
                      <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-1 py-0.5 rounded">
                        Voice
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 pl-3">
                  <span
                    className={cn(
                      "text-xs font-medium",
                      transaction.type === "incoming"
                        ? "text-green-600 dark:text-[#00FF88]"
                        : "text-red-600 dark:text-red-400",
                    )}
                  >
                    {transaction.type === "incoming" ? "+" : "-"}
                    {transaction.amount}
                  </span>
                  {transaction.type === "incoming" ? (
                    <ArrowDownLeft className="w-3.5 h-3.5 text-green-600 dark:text-[#00FF88]" />
                  ) : (
                    <ArrowUpRight className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          className={cn(
            "w-full flex items-center justify-center gap-2",
            "py-2 px-3 rounded-lg",
            "text-xs font-medium",
            "bg-gradient-to-r from-green-500 to-blue-600",
            "dark:from-[#00FF88] dark:to-[#00D4AA]",
            "text-white",
            "hover:from-green-600 hover:to-blue-700",
            "dark:hover:from-[#00E67A] dark:hover:to-[#00C299]",
            "shadow-sm hover:shadow",
            "transform transition-all duration-200",
            "hover:-translate-y-0.5",
            "active:translate-y-0",
            "focus:outline-none focus:ring-2",
            "focus:ring-green-500 dark:focus:ring-[#00FF88]",
            "focus:ring-offset-2 dark:focus:ring-offset-gray-900",
          )}
        >
          <span>View All Transactions</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
