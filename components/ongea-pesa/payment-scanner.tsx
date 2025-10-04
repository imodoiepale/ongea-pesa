"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Camera, QrCode, Receipt, CreditCard, Building2, Mic, Check, X, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useCamera } from "@/hooks/use-camera"
import { geminiVision, PaymentScanResult } from "@/lib/gemini-vision"

type Screen = "dashboard" | "voice" | "send" | "camera" | "recurring" | "analytics" | "test" | "permissions" | "scanner";

interface PaymentScannerProps {
  onNavigate: (screen: Screen) => void
}

type ScanMode = "paybill" | "till" | "qr" | "receipt" | "bank" | "pochi"

export default function PaymentScanner({ onNavigate }: PaymentScannerProps) {
  const [scanMode, setScanMode] = useState<ScanMode | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<PaymentScanResult | null>(null)
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [voiceCommand, setVoiceCommand] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [autoScanEnabled, setAutoScanEnabled] = useState(true)
  const [lastScanTime, setLastScanTime] = useState(0)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [currentlySpeaking, setCurrentlySpeaking] = useState(false)

  const { 
    videoRef, 
    canvasRef, 
    isStreaming, 
    error: cameraError, 
    startCamera, 
    stopCamera, 
    captureImage 
  } = useCamera()

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

  // Generate contextual audio messages for detected payments
  const generateAudioMessage = (result: PaymentScanResult): string => {
    const { type, data, confidence } = result;
    
    switch (type) {
      case 'paybill':
        return `Paybill detected! Number ${data.paybill}. ${confidence}% confidence.`;
      case 'buy_goods_till':
        return `Till number found! ${data.till}. Ready to pay?`;
      case 'qr':
        return `QR code scanned successfully! Payment details extracted with ${confidence}% confidence.`;
      case 'receipt':
        return `Receipt detected from ${data.receiptData?.vendor || 'vendor'}. Amount ${data.receiptData?.amount || 'unknown'}.`;
      case 'bank_to_mpesa':
      case 'bank_to_bank':
        return `Bank details found! Code ${data.bankCode} account ${data.account}. ${confidence}% confidence.`;
      case 'buy_goods_pochi':
        return `Pochi la Biashara detected! Phone ${data.phone}. Ready to send?`;
      default:
        return `Payment document detected with ${confidence}% confidence. Processing...`;
    }
  };

  // Text-to-speech function for live audio feedback
  const speakText = (text: string) => {
    if (!isAudioEnabled || currentlySpeaking) return
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel()
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 1.1
    utterance.pitch = 1.0
    
    utterance.onstart = () => setCurrentlySpeaking(true)
    utterance.onend = () => setCurrentlySpeaking(false)
    utterance.onerror = () => setCurrentlySpeaking(false)
    
    window.speechSynthesis.speak(utterance)
  }

  // Cleanup camera when component unmounts
  useEffect(() => {
    return () => {
      stopCamera()
      window.speechSynthesis.cancel()
    }
  }, [stopCamera])

  // Auto-scan functionality - continuously analyze frames
  useEffect(() => {
    if (!isStreaming || !autoScanEnabled || isProcessing || scanResult) return

    console.log('Setting up auto-scan interval');
    const autoScanInterval = setInterval(async () => {
      const now = Date.now()
      if (now - lastScanTime < 3000) return // Throttle to every 3 seconds

      try {
        console.log('Attempting auto-scan capture...');
        const imageData = captureImage()
        if (!imageData) {
          console.log('No image data captured');
          return
        }

        console.log('Image captured, size:', imageData.length, 'chars');
        console.log('Checking Gemini API key...');
        
        // Check if API key exists
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
          console.error('❌ GEMINI API KEY MISSING! Add NEXT_PUBLIC_GEMINI_API_KEY to .env.local');
          setScanError('Gemini API key not configured. Check environment setup.');
          return;
        }
        
        console.log('✅ API key found, sending to Gemini...');
        setLastScanTime(now)
        setIsProcessing(true)
        
        const result = await geminiVision.autoDetectPaymentType(imageData)
        console.log('Gemini result:', result);
        
        if (result && result.confidence > 70) {
          console.log('Payment detected with confidence:', result.confidence);
          
          // Live audio feedback for detected payment
          const audioMessage = generateAudioMessage(result);
          speakText(audioMessage);
          
          setScanResult(result)
          setIsScanning(false)
          stopCamera()
        } else if (result && result.confidence > 30) {
          // Provide feedback for partial detection
          speakText(`I can see something, but I'm only ${result.confidence}% confident. Keep the camera steady.`);
          console.log('Partial detection:', result?.confidence || 0);
        } else {
          console.log('No payment detected or low confidence:', result?.confidence || 0);
        }
        
        setIsProcessing(false)
      } catch (error) {
        console.error('Auto-scan error:', error)
        setScanError(error instanceof Error ? error.message : 'Auto-scan failed')
        setIsProcessing(false)
      }
    }, 2000) // Check every 2 seconds

    return () => {
      console.log('Clearing auto-scan interval');
      clearInterval(autoScanInterval)
    }
  }, [isStreaming, autoScanEnabled, isProcessing, scanResult, lastScanTime, captureImage, stopCamera])

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

  const handleScan = async (mode: ScanMode | null = null) => {
    console.log('Starting scan with mode:', mode);
    
    // If no mode specified, use auto-detect mode
    if (!mode) {
      setScanMode(null)
    } else {
      setScanMode(mode)
    }
    
    setIsScanning(true)
    setScanError(null)
    setScanResult(null)
    setIsProcessing(false)
    
    try {
      console.log('Attempting to start camera...');
      await startCamera()
      console.log('Camera started successfully');
    } catch (error) {
      console.error('Camera start failed:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to start camera. Please check permissions."
      setScanError(errorMessage)
      setIsScanning(false)
    }
  }

  const handleCapture = async () => {
    if (!scanMode) return
    
    setIsProcessing(true)
    setScanError(null)
    
    try {
      const imageData = captureImage()
      if (!imageData) {
        throw new Error("Failed to capture image")
      }

      const result = await geminiVision.scanPaymentDocument(imageData, scanMode)
      setScanResult(result)
      setIsScanning(false)
      stopCamera()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to process image"
      setScanError(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConfirmPayment = () => {
    // Navigate to payment confirmation with scan result data
    onNavigate("send")
  }

  const handleSaveReceipt = () => {
    // Save receipt for expense tracking
    alert("Receipt saved to expenses!")
    setScanResult(null)
    setScanMode(null)
  }

  const handleRetry = () => {
    setScanResult(null)
    setScanError(null)
    if (scanMode) {
      handleScan(scanMode)
    }
  }

  const handleCancel = () => {
    setScanResult(null)
    setScanMode(null)
    setScanError(null)
    setIsScanning(false)
    stopCamera()
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
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Paybill:</span>
                    <span className="text-sm font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded border">{data.paybill}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Account:</span>
                    <span className="text-sm font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded border">{data.account}</span>
                  </div>
                  {data.amount && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Amount:</span>
                      <span className="text-lg font-bold text-green-600">{data.amount}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  AI: "Nimesoma Paybill {data.paybill}. Imethibitishwa?"
                </p>
              </div>
            </div>
          )}

          {type === "till" && (
            <div className="space-y-3">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Till Number Detected</p>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Till Number:</span>
                    <span className="text-lg font-bold font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded border">{data.till}</span>
                  </div>
                  {data.amount && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Amount:</span>
                      <span className="text-lg font-bold text-green-600">{data.amount}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  AI: "Nimeona Till {data.till}. Unataka kulipa?"
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
                  AI: "Nimesoma Pochi la Biashara. Unataka kutuma pesa?"
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
                <p className="text-lg font-bold">Bank Code: {data.bankCode}</p>
                <p className="text-sm">Account: {data.account}</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  AI: "Nimesoma bank details. Code {data.bankCode} account {data.account}."
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

  if (isScanning) {
    return (
      <div className="min-h-screen p-4 pb-20">
        <div className="flex items-center mb-6 pt-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="mr-3"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {isProcessing ? "AI Processing..." : "🤖 Auto-Scanning"}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isProcessing ? "Analyzing document with AI" : "Point at any payment document"}
            </p>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="aspect-video bg-gray-900 rounded-lg relative overflow-hidden">
              {/* Hidden canvas for image capture */}
              <canvas 
                ref={canvasRef}
                className="hidden"
              />
              
              {/* Real camera video - ALWAYS visible when streaming */}
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className={`absolute inset-0 w-full h-full object-cover ${isStreaming ? 'block' : 'hidden'}`}
              />
              
              {/* Loading overlay when not streaming */}
              {!isStreaming && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-green-500/20 animate-pulse flex items-center justify-center">
                  <div className="text-center text-white">
                    <Camera className="h-16 w-16 mx-auto mb-4 animate-bounce" />
                    <p className="text-lg font-semibold">
                      {cameraError ? "Camera Error" : "Starting AI scanner..."}
                    </p>
                    <p className="text-sm opacity-75">
                      {cameraError ? "Check permissions" : "Point at any payment document"}
                    </p>
                  </div>
                </div>
              )}

              {/* Scanning overlay - ONLY borders, no background */}
              {isStreaming && (
                <>
                  {/* Scanning frame */}
                  <div className="absolute inset-4 border-2 border-green-400 rounded-lg pointer-events-none">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-400" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-400" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-400" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-400" />
                  </div>
                  
                  {/* Auto-scan indicator with audio status */}
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-500/90 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                    🤖 AI Auto-Scanning...
                    {currentlySpeaking && (
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        <div className="w-1 h-1 bg-white rounded-full animate-pulse ml-1"></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Instructions */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-sm text-center">
                    Point camera at: Paybill • Till • QR • Receipt • Bank slip
                  </div>
                </>
              )}

              {/* Processing overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-30">
                  <div className="text-center text-white">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-lg font-semibold">AI Processing...</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                🤖 <strong>AI Auto-Detection Active</strong>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Simply point your camera at any payment document. The AI will automatically recognize:
                Paybill numbers • Till numbers • QR codes • Receipts • Bank details • Pochi numbers
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                ✨ Works with handwritten text and simple formats too!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Audio and scan controls */}
        {isStreaming && !isProcessing && (
          <div className="flex justify-center gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsAudioEnabled(!isAudioEnabled)}
              className={isAudioEnabled ? "bg-blue-100 border-blue-300" : ""}
              size="sm"
            >
              {isAudioEnabled ? "🔊 Audio ON" : "🔇 Audio OFF"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setAutoScanEnabled(!autoScanEnabled)}
              className={autoScanEnabled ? "bg-green-100 border-green-300" : ""}
              size="sm"
            >
              {autoScanEnabled ? "🤖 Auto-Scan ON" : "📷 Manual Mode"}
            </Button>
            {!autoScanEnabled && (
              <Button onClick={handleCapture} disabled={!scanMode} size="sm">
                📸 Capture
              </Button>
            )}
          </div>
        )}

        {/* Camera Error Alert */}
        {cameraError && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Camera Error: {cameraError}. Please check permissions and try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Scan Error Alert */}
        {scanError && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {scanError}
            </AlertDescription>
          </Alert>
        )}
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

      {/* Quick Start Auto-Scan */}
      {!scanResult && (
        <div className="mb-6">
          <Card className="mb-4 border-2 border-green-500 bg-green-50 dark:bg-green-900/20">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-green-700 dark:text-green-300 mb-2">
                🤖 Smart Auto-Scanner
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400 mb-4">
                Just point your camera - AI will automatically detect and extract payment details from any document!
              </p>
              <Button 
                onClick={() => handleScan()} 
                size="lg"
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full"
              >
                <Camera className="h-5 w-5 mr-2" />
                Start Auto-Scanning
              </Button>
            </CardContent>
          </Card>
          
          <div className="text-center mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Or choose specific scan mode:</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {scanModes.map((mode) => (
              <Card
                key={mode.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleScan(mode.id)}
              >
                <CardContent className="p-3 text-center">
                  <div className={`w-10 h-10 ${mode.color} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                    <mode.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-xs mb-1">{mode.title}</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{mode.description}</p>
                  <Badge variant="outline" className="text-xs">
                    "{mode.voiceCommand}"
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
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
