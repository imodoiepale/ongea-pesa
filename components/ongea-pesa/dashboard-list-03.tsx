import { cn } from "@/lib/utils"
import {
  Calendar,
  type LucideIcon,
  ArrowRight,
  CheckCircle2,
  Timer,
  AlertCircle,
  PiggyBank,
  TrendingUp,
  CreditCard,
  Mic,
} from "lucide-react"
import React from "react"

interface ListItem {
  id: string
  title: string
  subtitle: string
  icon: LucideIcon
  iconStyle: string
  date: string
  time?: string
  amount?: string
  status: "pending" | "in-progress" | "completed"
  progress?: number
  voiceReminder?: boolean
}

interface List03Props {
  items?: ListItem[]
  className?: string
}

const iconStyles = {
  savings: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
  investment: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  debt: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
}

const statusConfig = {
  pending: {
    icon: Timer,
    class: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
  "in-progress": {
    icon: AlertCircle,
    class: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  completed: {
    icon: CheckCircle2,
    class: "text-green-600 dark:text-[#00FF88]",
    bg: "bg-green-100 dark:bg-green-900/30",
  },
}

const ITEMS: ListItem[] = [
  {
    id: "1",
    title: "Voice Savings Goal",
    subtitle: "Emergency fund with voice tracking",
    icon: PiggyBank,
    iconStyle: "savings",
    date: "Target: Dec 2024",
    amount: "KSh 15,000",
    status: "in-progress",
    progress: 65,
    voiceReminder: true,
  },
  {
    id: "2",
    title: "Investment Portfolio",
    subtitle: "Voice-managed stock investments",
    icon: TrendingUp,
    iconStyle: "investment",
    date: "Target: Jun 2024",
    amount: "KSh 50,000",
    status: "pending",
    progress: 30,
    voiceReminder: true,
  },
  {
    id: "3",
    title: "Voice Bill Reminder",
    subtitle: "Automated KPLC payment setup",
    icon: CreditCard,
    iconStyle: "debt",
    date: "Due: Tomorrow",
    amount: "KSh 2,500",
    status: "pending",
    progress: 0,
    voiceReminder: true,
  },
]

export default function DashboardList03({ items = ITEMS, className }: List03Props) {
  return (
    <div className={cn("w-full overflow-x-auto scrollbar-none", className)}>
      <div className="flex gap-3 min-w-full p-1">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex flex-col",
              "w-[280px] shrink-0",
              "bg-white/60 dark:bg-gray-800/60",
              "rounded-xl",
              "border border-gray-200 dark:border-gray-700",
              "hover:border-gray-300 dark:hover:border-gray-600",
              "transition-all duration-200",
              "shadow-sm backdrop-blur-xl",
              "hover:shadow-lg",
            )}
          >
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className={cn("p-2 rounded-lg relative", iconStyles[item.iconStyle as keyof typeof iconStyles])}>
                  <item.icon className="w-4 h-4" />
                  {item.voiceReminder && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#00FF88] rounded-full flex items-center justify-center">
                      <Mic className="w-2 h-2 text-white" />
                    </div>
                  )}
                </div>
                <div
                  className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1.5",
                    statusConfig[item.status].bg,
                    statusConfig[item.status].class,
                  )}
                >
                  {React.createElement(statusConfig[item.status].icon, { className: "w-3.5 h-3.5" })}
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">{item.title}</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{item.subtitle}</p>
                {item.voiceReminder && (
                  <p className="text-xs text-green-600 dark:text-[#00FF88] mt-1 flex items-center">
                    <Mic className="w-3 h-3 mr-1" />
                    Voice-enabled
                  </p>
                )}
              </div>

              {typeof item.progress === "number" && item.progress > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Progress</span>
                    <span className="text-gray-900 dark:text-white">{item.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-blue-600 dark:from-[#00FF88] dark:to-[#00D4AA] rounded-full transition-all duration-500"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {item.amount && (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{item.amount}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">target</span>
                </div>
              )}

              <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                <span>{item.date}</span>
              </div>
            </div>

            <div className="mt-auto border-t border-gray-200 dark:border-gray-700">
              <button
                className={cn(
                  "w-full flex items-center justify-center gap-2",
                  "py-2.5 px-3",
                  "text-xs font-medium",
                  "text-gray-600 dark:text-gray-400",
                  "hover:text-gray-900 dark:hover:text-white",
                  "hover:bg-gray-100 dark:hover:bg-gray-800/50",
                  "transition-colors duration-200",
                )}
              >
                View Details
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
