"use client"

import { useState } from "react"
import { ArrowLeft, Camera, QrCode, Receipt, CreditCard, Building2, Mic, Check, X, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PaymentScannerProps {
  onNavigate?: (screen: string) => void
}

type ScanMode = "paybill" | "till" | "qr" | "receipt" | "bank" | "pochi"

interface ScanResult {
  type: ScanMode
  data: {
    paybill?: string
    account?: string
    till?: string
    amount?: string
    merchant?: string
    phone?: string
    bank?: string
    accountNumber?: string
    receiptData?: {
      vendor: string
      amount: string
      date: string
      category: string
    }
  }
  confidence: number
}

interface ScanReport {
  id: string
  date: string
  type: ScanMode
  merchant: string
  amount: string
  status: "success" | "failed" | "pending"
  confidence: number
}

export default function PaymentScanner({ onNavigate }: PaymentScannerProps) {
  const [activeTab, setActiveTab] = useState("scan")
  const [scanMode, setScanMode] = useState<ScanMode | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [voiceCommand, setVoiceCommand] = useState("")

  const scanModes = [
    {
      id: "paybill" as ScanMode,
      title: "Paybill Numbers",
      description: "Utility bills, rent, school fees",
      icon: Receipt,
      color: "bg-blue-500",
      voiceCommand: "Piga Paybill",
    },
    {
      id: "till" as ScanMode,
      title: "Till Numbers",
      description: "Shop stickers, restaurant receipts",
      icon: CreditCard,
      color: "bg-green-500",
      voiceCommand: "Piga Till",
    },
    {
      id: "pochi" as ScanMode,
      title: "Pochi la Biashara",
      description: "Mobile business accounts",
      icon: Building2,
      color: "bg-purple-500",
      voiceCommand: "Piga Pochi",
    },
    {
      id: "qr" as ScanMode,
      title: "QR Codes",
      description: "Lipa Na M-Pesa QR payments",
      icon: QrCode,
      color: "bg-orange-500",
      voiceCommand: "Piga QR",
    },
    {
      id: "receipt" as ScanMode,
      title: "Receipt Capture",
      description: "Expense tracking & reimbursement",
      icon: Receipt,
      color: "bg-red-500",
      voiceCommand: "Piga risiti",
    },
    {
      id: "bank" as ScanMode,
      title: "Bank Details",
      description: "Account numbers from slips",
      icon: Building2,
      color: "bg-indigo-500",
      voiceCommand: "Piga bank",
    },
  ]

  const scanReports: ScanReport[] = [
    {
      id: "1",
      date: "2024-01-15 14:30",
      type: "paybill",
      merchant: "KPLC Prepaid",
      amount: "KSh 2,500",
      status: "success",
      confidence: 95,
    },
    {
      id: "2",
      date: "2024-01-15 12:15",
      type: "till",
      merchant: "Naivas Supermarket",
      amount: "KSh 1,850",
      status: "success",
      confidence: 92,
    },
    {
      id: "3",
      date: "2024-01-14 16:45",
      type: "qr",
      merchant: "Java House",
      amount: "KSh 1,200",
      status: "success",
      confidence: 98,
    },
    {
      id: "4",
      date: "2024-01-14 10:30",
      type: "receipt",
      merchant: "Total Petrol Station",
      amount: "KSh 3,500",
      status: "failed",
      confidence: 65,
    },
    {
      id: "5",
      date: "2024-01-13 18:20",
      type: "bank",
      merchant: "KCB Bank Transfer",
      amount: "KSh 5,000",
      status: "success",
      confidence: 88,
    },
  ]

  const handleVoiceScan = () => {
    setIsVoiceMode(true)
    setTimeout(() => {
      const commands = ["Piga Paybill", "Piga risiti ya mafuta", "Scan till number"]
      const randomCommand = commands[Math.floor(Math.random() * commands.length)]
      setVoiceCommand(randomCommand)

      if (randomCommand.includes("Paybill")) {
        setScanMode("paybill")
      } else if (randomCommand.includes("risiti")) {
        setScanMode("receipt")
      } else {
        setScanMode("till")
      }

      setIsVoiceMode(false)
      handleScan(randomCommand.includes("Paybill") ? "paybill" : randomCommand.includes("risiti") ? "receipt" : "till")
    }, 2000)
  }

  const handleScan = (mode: ScanMode) => {
    setScanMode(mode)
    setIsScanning(true)

    setTimeout(() => {
      setIsScanning(false)

      const mockResults: Record<ScanMode, ScanResult> = {
        paybill: {
          type: "paybill",
          data: {
            paybill: "247247",
            account: "786520",
            merchant: "Safaricom Ltd",
            amount: "KSh 1,200",
          },
          confidence: 95,
        },
        till: {
          type: "till",
          data: {
            till: "832909",
            merchant: "Naivas Supermarket",
            amount: "KSh 2,450",
          },
          confidence: 92,
        },
        pochi: {
          type: "pochi",
          data: {
            phone: "0722123456",
            merchant: "Mama Mboga Shop",
          },
          confidence: 88,
        },
        qr: {
          type: "qr",
          data: {
            till: "883992",
            merchant: "Naivas Ltd",
            amount: "KSh 1,200",
          },
          confidence: 98,
        },
        receipt: {
          type: "receipt",
          data: {
            receiptData: {
              vendor: "Total Moi Avenue",
              amount: "KSh 3,500",
              date: "2024-01-15",
              category: "Fuel",
            },
          },
          confidence: 90,
        },
        bank: {
          type: "bank",
          data: {
            bank: "KCB Bank",
            accountNumber: "1122430052",
            merchant: "Jane Otieno",
          },
          confidence: 85,
        },
      }

      setScanResult(mockResults[mode])
    }, 3000)
  }

  const handleConfirmPayment = () => {
    if (onNavigate) {
      onNavigate("send")
    }
  }

  const handleSaveReceipt = () => {
    alert("Receipt saved to expenses!")
    setScanResult(null)
    setScanMode(null)
  }

  const handleBackNavigation = () => {
    if (onNavigate) {
      onNavigate("dashboard")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  const renderScanResult = () => {
    if (!scanResult) return null

    const { type, data, confidence } = scanResult

    return (
      <Card className="mb-4 sm:mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base flex items-center justify-between">
            <span>Scan Result</span>
            <Badge variant={confidence > 90 ? "default" : "secondary"} className="text-xs">
              {confidence}% confidence
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {type === "paybill" && (
            <div className="space-y-3">
              <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300">Paybill Detected</p>
                <p className="text-sm sm:text-base font-bold">Paybill: {data.paybill}</p>
                <p className="text-xs sm:text-sm">Account: {data.account}</p>
                <p className="text-xs sm:text-sm">Merchant: {data.merchant}</p>
                {data.amount && <p className="text-xs sm:text-sm">Amount: {data.amount}</p>}
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">
                  AI: "Nimesoma Paybill {data.paybill} ya {data.merchant}. Imethibitishwa?"
                </p>
              </div>
            </div>
          )}

          {type === "till" && (
            <div className="space-y-3">
              <div className="p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300">
                  Till Number Detected
                </p>
                <p className="text-sm sm:text-base font-bold">Till: {data.till}</p>
                <p className="text-xs sm:text-sm">Merchant: {data.merchant}</p>
                {data.amount && <p className="text-xs sm:text-sm">Amount: {data.amount}</p>}
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                  AI: "Lipa kwa {data.merchant}, Till {data.till}. Endelea?"
                </p>
              </div>
            </div>
          )}

          {type === "pochi" && (
            <div className="space-y-3">
              <div className="p-3 sm:p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-xs sm:text-sm font-medium text-purple-700 dark:text-purple-300">Pochi la Biashara</p>
                <p className="text-sm sm:text-base font-bold">Phone: {data.phone}</p>
                <p className="text-xs sm:text-sm">Business: {data.merchant}</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">
                  AI: "Tuma kwa Pochi {data.phone} ya {data.merchant}?"
                </p>
              </div>
            </div>
          )}

          {type === "qr" && (
            <div className="space-y-3">
              <div className="p-3 sm:p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <p className="text-xs sm:text-sm font-medium text-orange-700 dark:text-orange-300">QR Code Scanned</p>
                <p className="text-sm sm:text-base font-bold">Till: {data.till}</p>
                <p className="text-xs sm:text-sm">Merchant: {data.merchant}</p>
                <p className="text-xs sm:text-sm">Amount: {data.amount}</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">
                  AI: "Scan successful. Lipa {data.amount} to {data.merchant}?"
                </p>
              </div>
            </div>
          )}

          {type === "receipt" && data.receiptData && (
            <div className="space-y-3">
              <div className="p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-xs sm:text-sm font-medium text-red-700 dark:text-red-300">Receipt Captured</p>
                <p className="text-sm sm:text-base font-bold">{data.receiptData.vendor}</p>
                <p className="text-xs sm:text-sm">Amount: {data.receiptData.amount}</p>
                <p className="text-xs sm:text-sm">Date: {data.receiptData.date}</p>
                <p className="text-xs sm:text-sm">Category: {data.receiptData.category}</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">
                  AI: "Risiti ya {data.receiptData.category} {data.receiptData.amount}. Tag under{" "}
                  {data.receiptData.category}?"
                </p>
              </div>
            </div>
          )}

          {type === "bank" && (
            <div className="space-y-3">
              <div className="p-3 sm:p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <p className="text-xs sm:text-sm font-medium text-indigo-700 dark:text-indigo-300">
                  Bank Account Detected
                </p>
                <p className="text-sm sm:text-base font-bold">{data.bank}</p>
                <p className="text-xs sm:text-sm">Account: {data.accountNumber}</p>
                <p className="text-xs sm:text-sm">Name: {data.merchant}</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">
                  AI: "Send to {data.bank} Account {data.accountNumber}, {data.merchant}?"
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-4">
            {type === "receipt" ? (
              <>
                <Button
                  onClick={handleSaveReceipt}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-xs sm:text-sm"
                >
                  <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Save Receipt
                </Button>
                <Button variant="outline" onClick={() => setScanResult(null)} className="flex-1 text-xs sm:text-sm">
                  <X className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Discard
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleConfirmPayment}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-xs sm:text-sm"
                >
                  <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Proceed to Pay
                </Button>
                <Button variant="outline" onClick={() => setScanResult(null)} className="flex-1 text-xs sm:text-sm">
                  <X className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (scanMode && isScanning) {
    return (
      <div className="min-h-screen p-3 sm:p-4">
        <div className="flex items-center mb-4 sm:mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setScanMode(null)
              setIsScanning(false)
            }}
            className="mr-3 h-8 w-8 sm:h-10 sm:w-10"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Scanning...</h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Hold steady, reading {scanMode}</p>
          </div>
        </div>

        <Card className="mb-4 sm:mb-6">
          <CardContent className="p-4 sm:p-6">
            <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-green-500/20 animate-pulse" />
              <div className="text-center text-white">
                <Camera className="h-10 sm:h-12 w-10 sm:w-12 mx-auto mb-3 sm:mb-4 animate-bounce" />
                <p className="text-sm sm:text-base font-semibold">Scanning {scanMode}...</p>
                <p className="text-xs sm:text-sm opacity-75">Keep the document in view</p>
              </div>

              <div className="absolute inset-4 border-2 border-green-400 rounded-lg">
                <div className="absolute top-0 left-0 w-4 h-4 sm:w-6 sm:h-6 border-t-4 border-l-4 border-green-400" />
                <div className="absolute top-0 right-0 w-4 h-4 sm:w-6 sm:h-6 border-t-4 border-r-4 border-green-400" />
                <div className="absolute bottom-0 left-0 w-4 h-4 sm:w-6 sm:h-6 border-b-4 border-l-4 border-green-400" />
                <div className="absolute bottom-0 right-0 w-4 h-4 sm:w-6 sm:h-6 border-b-4 border-r-4 border-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-center">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                {scanMode === "paybill" && "Looking for Paybill numbers and account details..."}
                {scanMode === "till" && "Detecting Till numbers from receipts or stickers..."}
                {scanMode === "pochi" && "Reading Pochi la Biashara phone numbers..."}
                {scanMode === "qr" && "Scanning QR code for payment details..."}
                {scanMode === "receipt" && "Extracting receipt information for expense tracking..."}
                {scanMode === "bank" && "Reading bank account details from slip..."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex items-center mb-4 sm:mb-6">
        <Button variant="ghost" size="icon" onClick={handleBackNavigation} className="mr-3 h-8 w-8 sm:h-10 sm:w-10">
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
        <div>
          <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Payment Scanner</h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Scan bills, receipts & payment codes</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4 sm:mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scan" className="text-xs sm:text-sm">
            <Camera className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            Scan
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-xs sm:text-sm">
            <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scan" className="space-y-4 sm:space-y-6">
          {/* Voice Command */}
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-xs sm:text-sm">Voice Scanning</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Say: "Piga Paybill" or "Piga risiti ya mafuta"
                  </p>
                </div>
                <Button
                  onClick={handleVoiceScan}
                  disabled={isVoiceMode}
                  size="sm"
                  className={`rounded-full h-8 w-8 sm:h-10 sm:w-10 ${isVoiceMode ? "bg-red-500 animate-pulse" : "bg-green-500"}`}
                >
                  <Mic className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
              {voiceCommand && (
                <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">Heard: "{voiceCommand}"</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scan Result */}
          {renderScanResult()}

          {/* Scan Mode Selection - ALL 6 OPTIONS */}
          {!scanResult && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
              {scanModes.map((mode) => (
                <Card
                  key={mode.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleScan(mode.id)}
                >
                  <CardContent className="p-3 sm:p-4 text-center">
                    <div
                      className={`w-8 h-8 sm:w-10 sm:h-10 ${mode.color} rounded-lg flex items-center justify-center mx-auto mb-2 sm:mb-3`}
                    >
                      <mode.icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-xs sm:text-sm mb-1">{mode.title}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{mode.description}</p>
                    <Badge variant="outline" className="text-xs">
                      "{mode.voiceCommand}"
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Recent Scans */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base">Recent Scans</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mr-3" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs sm:text-sm truncate">KPLC Bill - Paybill 888880</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Account: 123456789 • KSh 2,450</p>
                </div>
                <Button size="sm" variant="outline" className="text-xs bg-transparent">
                  Pay
                </Button>
              </div>

              <div className="flex items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mr-3" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs sm:text-sm truncate">Naivas Receipt - Till 832909</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Groceries • KSh 1,850</p>
                </div>
                <Button size="sm" variant="outline" className="text-xs bg-transparent">
                  View
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base">Scanning Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                <p>• Hold phone steady and ensure good lighting</p>
                <p>• For Paybill: Focus on the number and account section</p>
                <p>• For receipts: Capture the entire receipt clearly</p>
                <p>• Voice commands work even with camera open</p>
                <p>• Double-check all details before confirming payment</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4 sm:space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <p className="text-lg sm:text-2xl font-bold text-green-600">24</p>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Successful Scans</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <p className="text-lg sm:text-2xl font-bold text-red-600">3</p>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Failed Scans</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <p className="text-lg sm:text-2xl font-bold text-blue-600">89%</p>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Accuracy</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <p className="text-lg sm:text-2xl font-bold text-purple-600">12</p>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">This Week</p>
              </CardContent>
            </Card>
          </div>

          {/* Scan History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base">Scan History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scanReports.map((report) => {
                  const mode = scanModes.find((m) => m.id === report.type)
                  const IconComponent = mode?.icon || Receipt

                  return (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                    >
                      {/* Icon + colour badge */}
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 ${
                            mode?.color ?? "bg-gray-500"
                          } rounded-full flex items-center justify-center`}
                        >
                          <IconComponent className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-xs sm:text-sm truncate">{report.merchant}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{report.date}</p>
                        </div>
                      </div>

                      {/* Amount + status */}
                      <div className="text-right">
                        <p className="font-medium text-xs sm:text-sm">{report.amount}</p>
                        <Badge className={`${getStatusColor(report.status)} text-xs`}>{report.status}</Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
