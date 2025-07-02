"use client"

import { BarChart3, TrendingUp, TrendingDown, CreditCard, Wallet, PieChart } from "lucide-react"

export default function DashboardAnalytics() {
  const spendingCategories = [
    { name: "Food & Dining", amount: 15420, percentage: 35, color: "bg-blue-500" },
    { name: "Transportation", amount: 8750, percentage: 20, color: "bg-green-500" },
    { name: "Utilities", amount: 6200, percentage: 14, color: "bg-yellow-500" },
    { name: "Entertainment", amount: 5100, percentage: 12, color: "bg-purple-500" },
    { name: "Shopping", amount: 4300, percentage: 10, color: "bg-pink-500" },
    { name: "Others", amount: 3930, percentage: 9, color: "bg-gray-500" },
  ]

  const monthlyTrends = [
    { month: "Jan", income: 45000, expenses: 32000 },
    { month: "Feb", income: 48000, expenses: 35000 },
    { month: "Mar", income: 52000, expenses: 38000 },
    { month: "Apr", income: 49000, expenses: 41000 },
    { month: "May", income: 55000, expenses: 43700 },
    { month: "Jun", income: 58000, expenses: 44200 },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">Track your spending patterns and financial insights</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Income</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">KSh 58,000</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-green-600 dark:text-green-400 text-sm font-medium">+12.5%</span>
            <span className="text-gray-600 dark:text-gray-400 text-sm ml-2">from last month</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">KSh 44,200</p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
              <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-red-600 dark:text-red-400 text-sm font-medium">+8.2%</span>
            <span className="text-gray-600 dark:text-gray-400 text-sm ml-2">from last month</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Net Savings</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">KSh 13,800</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-green-600 dark:text-green-400 text-sm font-medium">+23.8%</span>
            <span className="text-gray-600 dark:text-gray-400 text-sm ml-2">from last month</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg. Daily Spend</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">KSh 1,473</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
              <CreditCard className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <span className="text-red-600 dark:text-red-400 text-sm font-medium">+5.1%</span>
            <span className="text-gray-600 dark:text-gray-400 text-sm ml-2">from last month</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Categories */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Spending by Category</h3>
            <PieChart className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {spendingCategories.map((category, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${category.color}`}></div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{category.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    KSh {category.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{category.percentage}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Trends */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Monthly Trends</h3>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {monthlyTrends.map((month, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-900 dark:text-white">{month.month}</span>
                  <span className="text-gray-600 dark:text-gray-400">
                    KSh {(month.income - month.expenses).toLocaleString()}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${(month.income / 60000) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${(month.expenses / 60000) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Income: KSh {month.income.toLocaleString()}</span>
                  <span>Expenses: KSh {month.expenses.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Insights */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Financial Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Spending Alert</h4>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              You've spent 15% more on dining this month compared to your average.
            </p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h4 className="font-medium text-green-900 dark:text-green-300 mb-2">Savings Goal</h4>
            <p className="text-sm text-green-700 dark:text-green-400">
              Great job! You're 78% towards your monthly savings goal of KSh 18,000.
            </p>
          </div>
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <h4 className="font-medium text-yellow-900 dark:text-yellow-300 mb-2">Budget Tip</h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              Consider setting up automatic transfers to boost your emergency fund.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
