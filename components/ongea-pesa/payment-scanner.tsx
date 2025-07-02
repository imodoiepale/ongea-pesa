"use client"

import { useState } from "react"
import { ArrowLeft, Camera, QrCode, Receipt, CreditCard, Building2, Mic, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface PaymentScannerProps {
  onNavigate: (screen: string) => void
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

export default function PaymentScanner({ onNavigate }: PaymentScannerProps) {
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

    // Simulate scanning process
    setTimeout(() => {
      setIsScanning(false)

      // Mock scan results based on mode
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
    // Navigate to payment confirmation
    onNavigate("send")
  }

  const handleSaveReceipt = () => {
    // Save receipt for expense tracking
    alert("Receipt saved to expenses!")
    setScanResult(null)
    setScanMode(null)
  }

  const renderScanResult = () => {
    if (!scanResult) return null

    const { type, data, confidence } = scanResult

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Scan Result</span>
            <Badge variant={confidence > 90 ? "default" : "secondary"}>{confidence}% confidence</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {type === "paybill" && (
            <div className="space-y-3">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Paybill Detected</p>
                <p className="text-lg font-bold">Paybill: {data.paybill}</p>
                <p className="text-sm">Account: {data.account}</p>
                <p className="text-sm">Merchant: {data.merchant}</p>
                {data.amount && <p className="text-sm">Amount: {data.amount}</p>}
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  AI: "Nimesoma Paybill {data.paybill} ya {data.merchant}. Imethibitishwa?"
                </p>
              </div>
            </div>
          )}

          {type === "till" && (
            <div className="space-y-3">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Till Number Detected</p>
                <p className="text-lg font-bold">Till: {data.till}</p>
                <p className="text-sm">Merchant: {data.merchant}</p>
                {data.amount && <p className="text-sm">Amount: {data.amount}</p>}
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  AI: "Lipa kwa {data.merchant}, Till {data.till}. Endelea?"
                </p>
              </div>
            </div>
          )}

          {type === "pochi" && (
            <div className="space-y-3">
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Pochi la Biashara</p>
                <p className="text-lg font-bold">Phone: {data.phone}</p>
                <p className="text-sm">Business: {data.merchant}</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  AI: "Tuma kwa Pochi {data.phone} ya {data.merchant}?"
                </p>
              </div>
            </div>
          )}

          {type === "qr" && (
            <div className="space-y-3">
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <p className="text-sm font-medium text-orange-700 dark:text-orange-300">QR Code Scanned</p>
                <p className="text-lg font-bold">Till: {data.till}</p>
                <p className="text-sm">Merchant: {data.merchant}</p>
                <p className="text-sm">Amount: {data.amount}</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  AI: "Scan successful. Lipa {data.amount} to {data.merchant}?"
                </p>
              </div>
            </div>
          )}

          {type === "receipt" && data.receiptData && (
            <div className="space-y-3">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">Receipt Captured</p>
                <p className="text-lg font-bold">{data.receiptData.vendor}</p>
                <p className="text-sm">Amount: {data.receiptData.amount}</p>
                <p className="text-sm">Date: {data.receiptData.date}</p>
                <p className="text-sm">Category: {data.receiptData.category}</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  AI: "Risiti ya {data.receiptData.category} {data.receiptData.amount}. Tag under{" "}
                  {data.receiptData.category}?"
                </p>
              </div>
            </div>
          )}

          {type === "bank" && (
            <div className="space-y-3">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Bank Account Detected</p>
                <p className="text-lg font-bold">{data.bank}</p>
                <p className="text-sm">Account: {data.accountNumber}</p>
                <p className="text-sm">Name: {data.merchant}</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  AI: "Send to {data.bank} Account {data.accountNumber}, {data.merchant}?"
                </p>
              </div>
            </div>
          )}

          <div className="flex space-x-3 mt-4">
            {type === "receipt" ? (
              <>
                <Button onClick={handleSaveReceipt} className="flex-1 bg-green-500 hover:bg-green-600">
                  <Check className="h-4 w-4 mr-2" />
                  Save Receipt
                </Button>
                <Button variant="outline" onClick={() => setScanResult(null)} className="flex-1">
                  <X className="h-4 w-4 mr-2" />
                  Discard
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleConfirmPayment} className="flex-1 bg-green-500 hover:bg-green-600">
                  <Check className="h-4 w-4 mr-2" />
                  Proceed to Pay
                </Button>
                <Button variant="outline" onClick={() => setScanResult(null)} className="flex-1">
                  <X className="h-4 w-4 mr-2" />
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
      <div className="min-h-screen p-4 pb-20">
        <div className="flex items-center mb-6 pt-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setScanMode(null)
              setIsScanning(false)
            }}
            className="mr-3"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Scanning...</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Hold steady, reading {scanMode}</p>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-green-500/20 animate-pulse" />
              <div className="text-center text-white">
                <Camera className="h-16 w-16 mx-auto mb-4 animate-bounce" />
                <p className="text-lg font-semibold">Scanning {scanMode}...</p>
                <p className="text-sm opacity-75">Keep the document in view</p>
              </div>

              {/* Scanning overlay */}
              <div className="absolute inset-4 border-2 border-green-400 rounded-lg">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-400" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-400" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-400" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
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
    <div className="min-h-screen p-4 pb-20">
      {/* Header */}
      <div className="flex items-center mb-6 pt-8">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("dashboard")} className="mr-3">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Payment Scanner</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Scan bills, receipts & payment codes</p>
        </div>
      </div>

      {/* Voice Command */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Voice Scanning</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Say: "Piga Paybill" or "Piga risiti ya mafuta"</p>
            </div>
            <Button
              onClick={handleVoiceScan}
              disabled={isVoiceMode}
              className={`rounded-full ${isVoiceMode ? "bg-red-500 animate-pulse" : "bg-green-500"}`}
            >
              <Mic className="h-4 w-4" />
            </Button>
          </div>
          {voiceCommand && (
            <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300">Heard: "{voiceCommand}"</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scan Result */}
      {renderScanResult()}

      {/* Scan Mode Selection */}
      {!scanResult && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {scanModes.map((mode) => (
            <Card
              key={mode.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleScan(mode.id)}
            >
              <CardContent className="p-4 text-center">
                <div className={`w-12 h-12 ${mode.color} rounded-lg flex items-center justify-center mx-auto mb-3`}>
                  <mode.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{mode.title}</h3>
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
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Recent Scans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Receipt className="h-5 w-5 text-blue-600 mr-3" />
              <div className="flex-1">
                <p className="font-medium text-sm">KPLC Bill - Paybill 888880</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Account: 123456789 • KSh 2,450</p>
              </div>
              <Button size="sm" variant="outline">
                Pay
              </Button>
            </div>

            <div className="flex items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CreditCard className="h-5 w-5 text-green-600 mr-3" />
              <div className="flex-1">
                <p className="font-medium text-sm">Naivas Receipt - Till 832909</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Groceries • KSh 1,850</p>
              </div>
              <Button size="sm" variant="outline">
                View
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Scanning Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>• Hold phone steady and ensure good lighting</p>
            <p>• For Paybill: Focus on the number and account section</p>
            <p>• For receipts: Capture the entire receipt clearly</p>
            <p>• Voice commands work even with camera open</p>
            <p>• Double-check all details before confirming payment</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
