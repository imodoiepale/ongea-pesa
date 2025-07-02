"use client"

import { useState } from "react"
import { ArrowLeft, Camera, MapPin, Send, Mic, ScanFace } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface CameraCaptureProps {
  onNavigate: (screen: string) => void
}

export default function CameraCapture({ onNavigate }: CameraCaptureProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [location, setLocation] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [scanningMode, setScanningMode] = useState<string | null>(null)
  const [ocrResult, setOcrResult] = useState<string | null>(null)
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false)
  const [confirmationMessage, setConfirmationMessage] = useState<string>("")

  const handleCapture = () => {
    setIsCapturing(true)
    // Simulate camera capture
    setTimeout(() => {
      setCapturedImage("/placeholder.svg?height=300&width=400")
      setLocation("Nairobi CBD, Kenya - Lat: -1.2921, Lng: 36.8219")
      setIsCapturing(false)
    }, 2000)
  }

  const handleVoiceCapture = () => {
    // Simulate voice command "tuma miundo hii"
    handleCapture()
  }

  const handleScan = (mode: string) => {
    setScanningMode(mode)
    setIsCapturing(true)
    setOcrResult(null)

    // Simulate scanning and OCR processing
    setTimeout(() => {
      setIsCapturing(false)
      switch (mode) {
        case "Paybill":
          setOcrResult("Paybill: 247247, Account: 786520")
          setConfirmationMessage("Nimesoma Paybill 247247 ya Safaricom. Imethibitishwa?")
          setConfirmationDialogOpen(true)
          break
        case "Till Number":
          setOcrResult("Till: 832909")
          setConfirmationMessage("Nimesoma Till Number 832909. Imethibitishwa?")
          setConfirmationDialogOpen(true)
          break
        case "QR Code":
          setOcrResult("QR Code: Valid Payment Link")
          setConfirmationMessage("QR Code imesomwa. Ungependa kulipa?")
          setConfirmationDialogOpen(true)
          break
        case "Receipt":
          setOcrResult("Amount detected from receipt: KSh 950")
          setConfirmationMessage("Malipo ya Stima: KSh 950, Account No. 456789. Tuma sasa?")
          setConfirmationDialogOpen(true)
          break
        case "Bank Details":
          setOcrResult("Bank: KCB, Account: 1234567890")
          setConfirmationMessage("Nimesoma Bank Details KCB Account 1234567890. Imethibitishwa?")
          setConfirmationDialogOpen(true)
          break
        default:
          setOcrResult("No result found")
      }
    }, 3000)
  }

  const handleVoiceCommand = (command: string) => {
    switch (command) {
      case "Piga Paybill":
        handleScan("Paybill")
        break
      case "Piga risiti ya mafuta":
        handleScan("Receipt")
        break
      case "Scan till number":
        handleScan("Till Number")
        break
      default:
        alert("Command not recognized")
    }
  }

  return (
    <div className="min-h-screen p-4 pb-20">
      {/* Header */}
      <div className="flex items-center mb-6 pt-8">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("dashboard")} className="mr-3">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Share Location</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Camera + GPS capture</p>
        </div>
      </div>

      {/* Voice Command */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Voice Command</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Say: "Ongea Pesa, tuma miundo hii"</p>
            </div>
            <Button onClick={handleVoiceCapture} className="rounded-full bg-green-500 hover:bg-green-600">
              <Mic className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scanning Mode Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Select Scanning Mode</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Button onClick={() => handleScan("Paybill")} variant="outline">
            Scan Paybill
          </Button>
          <Button onClick={() => handleScan("Till Number")} variant="outline">
            Scan Till Number
          </Button>
          <Button onClick={() => handleScan("QR Code")} variant="outline">
            Scan QR Code
          </Button>
          <Button onClick={() => handleScan("Receipt")} variant="outline">
            Capture Receipt
          </Button>
          <Button onClick={() => handleScan("Bank Details")} variant="outline">
            Scan Bank Details
          </Button>
        </CardContent>
      </Card>

      {/* Camera Interface */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Camera className="h-5 w-5 mr-2 text-blue-600" />
            {scanningMode ? `Scanning ${scanningMode}` : "Camera Capture"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-4 relative overflow-hidden">
            {capturedImage ? (
              <img
                src={capturedImage || "/placeholder.svg"}
                alt="Captured location"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center">
                {isCapturing ? (
                  <div className="animate-pulse">
                    <ScanFace className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-500">Scanning...</p>
                  </div>
                ) : (
                  <>
                    <Camera className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-500">Tap to capture location</p>
                  </>
                )}
              </div>
            )}
          </div>

          {ocrResult && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg mb-4">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">OCR Result</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">{ocrResult}</p>
            </div>
          )}

          <Button
            onClick={handleCapture}
            disabled={isCapturing}
            className="w-full mb-4"
            variant={capturedImage ? "outline" : "default"}
          >
            <Camera className="h-4 w-4 mr-2" />
            {capturedImage ? "Retake Photo" : "Capture Location"}
          </Button>
        </CardContent>
      </Card>

      {/* Location Details */}
      {location && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-red-600" />
              Location Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Current Location</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{location}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-medium">Accuracy</p>
                  <p className="text-gray-600 dark:text-gray-400">±5 meters</p>
                </div>
                <div>
                  <p className="font-medium">Timestamp</p>
                  <p className="text-gray-600 dark:text-gray-400">{new Date().toLocaleTimeString()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Share Options */}
      {capturedImage && location && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Share Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full bg-transparent" variant="outline">
                <Send className="h-4 w-4 mr-2" />
                Send via WhatsApp
              </Button>
              <Button className="w-full bg-transparent" variant="outline">
                <Send className="h-4 w-4 mr-2" />
                Send via SMS
              </Button>
              <Button className="w-full bg-transparent" variant="outline">
                <Send className="h-4 w-4 mr-2" />
                Share with M-Pesa Contact
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Send Button */}
      {capturedImage && location && (
        <div className="fixed bottom-6 left-4 right-4">
          <Button className="w-full h-12 bg-gradient-to-r from-blue-500 to-green-600 hover:from-blue-600 hover:to-green-700">
            <Send className="h-5 w-5 mr-2" />
            Share Location Now
          </Button>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmationDialogOpen} onOpenChange={setConfirmationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmation</DialogTitle>
            <DialogDescription>{confirmationMessage}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="secondary" onClick={() => setConfirmationDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setConfirmationDialogOpen(false)
                alert("Payment Sent!")
              }}
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
