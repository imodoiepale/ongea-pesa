"use client"

import { ArrowUpRight, ArrowDownLeft, Filter, Search, Calendar, Download, Eye } from "lucide-react"
import { useState } from "react"

export default function DashboardTransactions() {
  const [filterType, setFilterType] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"compact" | "detailed">("compact")

  const transactions = [
    {
      id: "TXN001",
      type: "sent",
      amount: 2500,
      recipient: "Mary Wanjiku",
      description: "Lunch money",
      date: "2024-01-15",
      time: "14:30",
      status: "completed",
      method: "M-Pesa",
      reference: "QA12345678",
    },
    {
      id: "TXN002",
      type: "received",
      amount: 5000,
      sender: "John Kamau",
      description: "Salary advance",
      date: "2024-01-15",
      time: "10:15",
      status: "completed",
      method: "Bank Transfer",
      reference: "BT87654321",
    },
    {
      id: "TXN003",
      type: "bill",
      amount: 1200,
      recipient: "KPLC",
      description: "Electricity bill payment",
      date: "2024-01-14",
      time: "16:45",
      status: "completed",
      method: "M-Pesa",
      reference: "QA98765432",
    },
    {
      id: "TXN004",
      type: "sent",
      amount: 800,
      recipient: "Grace Nyambura",
      description: "Groceries",
      date: "2024-01-14",
      time: "12:20",
      status: "pending",
      method: "M-Pesa",
      reference: "QA11223344",
    },
    {
      id: "TXN005",
      type: "received",
      amount: 15000,
      sender: "Safaricom Ltd",
      description: "Freelance payment",
      date: "2024-01-13",
      time: "09:30",
      status: "completed",
      method: "M-Pesa",
      reference: "QA55667788",
    },
    {
      id: "TXN006",
      type: "bill",
      amount: 3000,
      recipient: "Nairobi Water",
      description: "Water bill payment",
      date: "2024-01-12",
      time: "11:00",
      status: "failed",
      method: "M-Pesa",
      reference: "QA99887766",
    },
    {
      id: "TXN007",
      type: "sent",
      amount: 1500,
      recipient: "Peter Mwangi",
      description: "Transport fare",
      date: "2024-01-12",
      time: "08:15",
      status: "completed",
      method: "M-Pesa",
      reference: "QA44556677",
    },
    {
      id: "TXN008",
      type: "received",
      amount: 7500,
      sender: "KCB Bank",
      description: "Loan disbursement",
      date: "2024-01-11",
      time: "13:45",
      status: "completed",
      method: "Bank Transfer",
      reference: "BT12345678",
    },
  ]

  const getTransactionIcon = (type: string, status: string) => {
    if (status === "failed") {
      return (
        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
          <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 dark:text-red-400" />
        </div>
      )
    }

    switch (type) {
      case "sent":
      case "bill":
        return (
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
            <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 dark:text-red-400" />
          </div>
        )
      case "received":
        return (
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <ArrowDownLeft className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 dark:text-green-400" />
          </div>
        )
      default:
        return (
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center">
            <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 dark:text-gray-400" />
          </div>
        )
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const getAmountColor = (type: string, status: string) => {
    if (status === "failed") return "text-gray-500 dark:text-gray-400"
    return type === "received" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
  }

  const getAmountPrefix = (type: string) => {
    return type === "received" ? "+" : "-"
  }

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesFilter = filterType === "all" || transaction.type === filterType
    const matchesSearch =
      searchTerm === "" ||
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.recipient && transaction.recipient.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (transaction.sender && transaction.sender.toLowerCase().includes(searchTerm.toLowerCase()))

    return matchesFilter && matchesSearch
  })

  const totalSent = transactions
    .filter((t) => (t.type === "sent" || t.type === "bill") && t.status === "completed")
    .reduce((sum, t) => sum + t.amount, 0)

  const totalReceived = transactions
    .filter((t) => t.type === "received" && t.status === "completed")
    .reduce((sum, t) => sum + t.amount, 0)

  const renderCompactTransaction = (transaction: any) => (
    <div
      key={transaction.id}
      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
    >
      <div className="flex items-center space-x-3 min-w-0 flex-1">
        {getTransactionIcon(transaction.type, transaction.status)}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
            {transaction.recipient || transaction.sender}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{transaction.description}</p>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-500">{transaction.date}</span>
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}
            >
              {transaction.status}
            </span>
          </div>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-semibold ${getAmountColor(transaction.type, transaction.status)}`}>
          {getAmountPrefix(transaction.type)}KSh {transaction.amount.toLocaleString()}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500">{transaction.method}</p>
      </div>
    </div>
  )

  const renderDetailedTransaction = (transaction: any) => (
    <div
      key={transaction.id}
      className="p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700 last:border-b-0"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {getTransactionIcon(transaction.type, transaction.status)}
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{transaction.recipient || transaction.sender}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{transaction.description}</p>
            <div className="flex items-center space-x-4 mt-1">
              <span className="text-xs text-gray-500 dark:text-gray-500">
                {transaction.date} at {transaction.time}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-500">{transaction.method}</span>
              <span className="text-xs text-gray-500 dark:text-gray-500">Ref: {transaction.reference}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-lg font-semibold ${getAmountColor(transaction.type, transaction.status)}`}>
            {getAmountPrefix(transaction.type)}KSh {transaction.amount.toLocaleString()}
          </p>
          <span
            className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}
          >
            {transaction.status}
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Transactions</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">View and manage your transaction history</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode(viewMode === "compact" ? "detailed" : "compact")}
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm"
          >
            <Eye className="h-4 w-4" />
            {viewMode === "compact" ? "Detailed" : "Compact"}
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Total Sent</p>
              <p className="text-lg sm:text-2xl font-bold text-red-600 dark:text-red-400">
                KSh {totalSent.toLocaleString()}
              </p>
            </div>
            <ArrowUpRight className="h-6 w-6 sm:h-8 sm:w-8 text-red-600 dark:text-red-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Total Received</p>
              <p className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">
                KSh {totalReceived.toLocaleString()}
              </p>
            </div>
            <ArrowDownLeft className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Net Balance</p>
              <p
                className={`text-lg sm:text-2xl font-bold ${totalReceived - totalSent >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
              >
                KSh {(totalReceived - totalSent).toLocaleString()}
              </p>
            </div>
            <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Transactions</option>
              <option value="sent">Sent</option>
              <option value="received">Received</option>
              <option value="bill">Bills</option>
            </select>
            <button className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2 text-sm">
              <Filter className="h-4 w-4" />
              More
            </button>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-3 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            Recent Transactions ({filteredTransactions.length})
          </h3>
        </div>
        <div
          className={viewMode === "compact" ? "p-3 sm:p-6 space-y-3" : "divide-y divide-gray-200 dark:divide-gray-700"}
        >
          {filteredTransactions.map((transaction) =>
            viewMode === "compact" ? renderCompactTransaction(transaction) : renderDetailedTransaction(transaction),
          )}
        </div>
      </div>
    </div>
  )
}
