"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DollarSign,
  TrendingUp,
  Users,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download,
  Calendar,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface RevenueSummary {
  total_revenue: number
  platform_fees: number
  transaction_count: number
  transaction_value: number
  unique_users: number
  average_transaction: number
  average_revenue_per_transaction: number
}

interface TransactionTypeData {
  type: string
  count: number
  revenue: number
  total_value: number
  percentage: number
}

interface DailyData {
  date: string
  revenue: number
  transactions: number
}

interface RevenueData {
  success: boolean
  period: string
  date_range: {
    start: string
    end: string
  }
  summary: RevenueSummary
  by_transaction_type: TransactionTypeData[]
  daily_breakdown: DailyData[]
}

export default function RevenueDashboard() {
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState("month")
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const fetchRevenue = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        period: selectedPeriod,
        year: selectedYear.toString(),
        month: selectedMonth.toString(),
      })

      const response = await fetch(`/api/admin/revenue/summary?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch revenue data')
      }

      const result = await response.json()
      setData(result)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      console.error('Failed to fetch revenue:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRevenue()
  }, [selectedPeriod, selectedMonth, selectedYear])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-KE').format(num)
  }

  const getTransactionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'deposit': 'bg-green-500',
      'withdraw': 'bg-red-500',
      'send_phone': 'bg-blue-500',
      'paybill': 'bg-purple-500',
      'buy_goods_till': 'bg-orange-500',
      'buy_goods_pochi': 'bg-pink-500',
      'default': 'bg-gray-500',
    }
    return colors[type] || colors['default']
  }

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'deposit': 'Deposits',
      'withdraw': 'Withdrawals',
      'send_phone': 'Send to Phone',
      'paybill': 'PayBill',
      'buy_goods_till': 'Buy Goods (Till)',
      'buy_goods_pochi': 'Buy Goods (Pochi)',
      'bank_to_mpesa': 'Bank to M-Pesa',
      'qr': 'QR Payments',
    }
    return labels[type] || type
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading revenue data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="p-6">
            <p className="text-red-600 dark:text-red-400">Error: {error}</p>
            <Button onClick={fetchRevenue} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

  const { summary, by_transaction_type, daily_breakdown } = data

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Ongea Pesa Revenue Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Platform profits and analytics
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={fetchRevenue}
              variant="outline"
              size="icon"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex gap-4 flex-wrap">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Daily</SelectItem>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
              <SelectItem value="year">Yearly</SelectItem>
            </SelectContent>
          </Select>

          {selectedPeriod === 'month' && (
            <>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <SelectItem key={month} value={month.toString()}>
                      {new Date(2024, month - 1).toLocaleString('default', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        {/* Date Range Display */}
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Calendar className="h-4 w-4" />
          <span>
            {data.date_range.start} to {data.date_range.end}
          </span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.total_revenue)}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Platform fees earned (0.5%)
            </p>
          </CardContent>
        </Card>

        {/* Transaction Count */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Transactions
            </CardTitle>
            <CreditCard className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatNumber(summary.transaction_count)}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Total volume: {formatCurrency(summary.transaction_value)}
            </p>
          </CardContent>
        </Card>

        {/* Active Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Active Users
            </CardTitle>
            <Users className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatNumber(summary.unique_users)}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Unique users this period
            </p>
          </CardContent>
        </Card>

        {/* Average Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Avg Revenue/Tx
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(summary.average_revenue_per_transaction)}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Per transaction
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Transaction Type */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Revenue by Transaction Type</CardTitle>
          <CardDescription>
            Breakdown of platform fees by transaction category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {by_transaction_type
              .sort((a, b) => b.revenue - a.revenue)
              .map((txType) => (
                <div key={txType.type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getTransactionTypeColor(txType.type)}`} />
                      <span className="text-sm font-medium">
                        {getTransactionTypeLabel(txType.type)}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">
                        {formatCurrency(txType.revenue)}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {txType.count} transactions ({txType.percentage.toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`${getTransactionTypeColor(txType.type)} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${txType.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Daily Revenue Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Revenue Trend</CardTitle>
          <CardDescription>
            Revenue performance over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {daily_breakdown.slice(-14).map((day) => (
              <div key={day.date} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <div className="text-sm font-medium">
                    {new Date(day.date).toLocaleDateString('en-KE', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {day.transactions} transactions
                  </div>
                </div>
                <div className="text-sm font-bold text-green-600">
                  {formatCurrency(day.revenue)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-start gap-3">
                <ArrowUpRight className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-300">
                    Revenue Growth
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    Platform earned {formatCurrency(summary.total_revenue)} from {formatNumber(summary.transaction_count)} transactions
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-700 dark:text-blue-300">
                    User Engagement
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    {formatNumber(summary.unique_users)} active users with average transaction of {formatCurrency(summary.average_transaction)}
                  </p>
                </div>
              </div>
            </div>

            {by_transaction_type.length > 0 && (
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <CreditCard className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-purple-700 dark:text-purple-300">
                      Top Revenue Source
                    </p>
                    <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                      {getTransactionTypeLabel(by_transaction_type[0].type)} generated {formatCurrency(by_transaction_type[0].revenue)} ({by_transaction_type[0].percentage.toFixed(1)}% of total)
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
