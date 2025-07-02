"use client"

import { useState } from "react"
import { Shield, AlertTriangle, CheckCircle, Clock, Mic, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface SmartConfirmationProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  paymentDetails: {
    amount: string
    recipient: string
    phone: string
    type: "contact" | "paybill" | "till" | "pochi" | "bank"
    account?: string
    paybill?: string
    till?: string
  }
  riskLevel: "low" | "medium" | "high"
  warnings: string[]
  historicalData?: {
    previousTransactions: number
    lastTransaction: string
    averageAmount: string
  }
}

export default function SmartConfirmation({
  isOpen,
  onClose,
  onConfirm,
  paymentDetails,
  riskLevel,
  warnings,
  historicalData,
}: SmartConfirmationProps) {
  const [isListening, setIsListening] = useState(false)
  const [voiceConfirmation, setVoiceConfirmation] = useState("")

  if (!isOpen) return null

  const getRiskColor = () => {
    switch (riskLevel) {
      case "low":
        return "text-green-600 bg-green-50 dark:bg-green-900/20"
      case "medium":
        return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20"
      case "high":
        return "text-red-600 bg-red-50 dark:bg-red-900/20"
    }
  }

  const getRiskIcon = () => {
    switch (riskLevel) {
      case "low":
        return <CheckCircle className="h-4 w-4" />
      case "medium":
        return <Clock className="h-4 w-4" />
      case "high":
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const generateVoiceConfirmation = () => {
    const { amount, recipient, type, phone } = paymentDetails

    if (type === "paybill") {
      return `Tuma ${amount} kwa ${recipient}, Paybill ${paymentDetails.paybill}, Account ${paymentDetails.account}. Umethibitisha?`
    } else if (type === "till") {
      return `Lipa ${amount} kwa ${recipient}, Till ${paymentDetails.till}. Endelea?`
    } else if (type === "pochi") {
      return `Tuma ${amount} kwa Pochi ${phone} ya ${recipient}. Sawa?`
    } else {
      return `Tuma ${amount} kwa ${recipient}, ${phone}. Unahakikisha?`
    }
  }

  const handleVoiceConfirm = () => {
    setIsListening(true)
    setTimeout(() => {
      const responses = ["Ndio, endelea", "Sawa, tuma", "Yes, proceed"]
      const randomResponse = responses[Math.floor(Math.random() * responses.length)]
      setVoiceConfirmation(randomResponse)
      setIsListening(false)

      if (randomResponse.includes("Ndio") || randomResponse.includes("Sawa") || randomResponse.includes("Yes")) {
        setTimeout(() => onConfirm(), 1000)
      }
    }, 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Shield className="h-5 w-5 mr-2 text-blue-500" />
            Confirm Payment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Payment Details */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-semibold text-sm mb-2">Payment Details</h3>
            <div className="space-y-1 text-sm">
              <p>
                <span className="font-medium">Amount:</span> {paymentDetails.amount}
              </p>
              <p>
                <span className="font-medium">To:</span> {paymentDetails.recipient}
              </p>
              <p>
                <span className="font-medium">Phone:</span> {paymentDetails.phone}
              </p>
              {paymentDetails.paybill && (
                <p>
                  <span className="font-medium">Paybill:</span> {paymentDetails.paybill}
                </p>
              )}
              {paymentDetails.account && (
                <p>
                  <span className="font-medium">Account:</span> {paymentDetails.account}
                </p>
              )}
              {paymentDetails.till && (
                <p>
                  <span className="font-medium">Till:</span> {paymentDetails.till}
                </p>
              )}
            </div>
          </div>

          {/* Risk Assessment */}
          <div className={`p-3 rounded-lg ${getRiskColor()}`}>
            <div className="flex items-center mb-2">
              {getRiskIcon()}
              <span className="font-medium text-sm ml-2">
                {riskLevel === "low" && "Low Risk Transaction"}
                {riskLevel === "medium" && "Medium Risk - Review Required"}
                {riskLevel === "high" && "High Risk - Verify Carefully"}
              </span>
            </div>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-2">
              {warnings.map((warning, index) => (
                <div key={index} className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="flex items-start">
                    <AlertTriangle className="h-4 w-4 text-orange-500 mr-2 mt-0.5" />
                    <p className="text-sm text-orange-700 dark:text-orange-300">{warning}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Historical Data */}
          {historicalData && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Transaction History</h4>
              <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <p>Previous transactions: {historicalData.previousTransactions}</p>
                <p>Last transaction: {historicalData.lastTransaction}</p>
                <p>Average amount: {historicalData.averageAmount}</p>
              </div>
            </div>
          )}

          {/* Voice Confirmation */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm">Voice Confirmation</h4>
              <Button
                size="sm"
                onClick={handleVoiceConfirm}
                disabled={isListening}
                className={`rounded-full ${isListening ? "bg-red-500 animate-pulse" : "bg-green-500"}`}
              >
                <Mic className="h-3 w-3" />
              </Button>
            </div>

            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-blue-700 dark:text-blue-300 mb-2">
              <Volume2 className="h-3 w-3 inline mr-1" />
              AI: "{generateVoiceConfirmation()}"
            </div>

            {voiceConfirmation && (
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-sm text-green-700 dark:text-green-300">
                <Mic className="h-3 w-3 inline mr-1" />
                You: "{voiceConfirmation}"
              </div>
            )}

            {isListening && (
              <div className="text-center py-2">
                <div className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <div className="animate-pulse w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                  Listening for confirmation...
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              className="flex-1 bg-green-500 hover:bg-green-600"
              disabled={riskLevel === "high" && !voiceConfirmation}
            >
              {riskLevel === "high" ? "Voice Confirm Required" : "Confirm Payment"}
            </Button>
          </div>

          {/* Voice Commands Help */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Voice Responses:</p>
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <p>• "Ndio, endelea" or "Yes, proceed" (Confirm)</p>
              <p>• "Hapana" or "No" (Cancel)</p>
              <p>• "Badilisha kiasi" (Change amount)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
