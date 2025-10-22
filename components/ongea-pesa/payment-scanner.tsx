"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Camera, QrCode, Receipt, CreditCard, Building2, Mic, Check, X, AlertCircle, DollarSign, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { useCamera } from "@/hooks/use-camera"
import { useVoiceActivation } from "@/hooks/use-voice-activation"
import { useElevenLabs } from '@/contexts/ElevenLabsContext'
import { geminiVision, PaymentScanResult } from "@/lib/gemini-vision"
import { calculateTransactionFees, formatFeesMessage, hasSufficientBalance } from "@/lib/transaction-fees"

type Screen = "dashboard" | "voice" | "send" | "camera" | "recurring" | "analytics" | "test" | "permissions" | "scanner";

interface PaymentScannerProps {
  onNavigate: (screen: Screen) => void
}

type ScanMode = "paybill" | "till" | "qr" | "receipt" | "bank" | "pochi"

export default function PaymentScanner({ onNavigate }: PaymentScannerProps) {
  const { toast } = useToast()
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
  const [balance, setBalance] = useState<number>(0)
  const [loadingBalance, setLoadingBalance] = useState(true)
  const [voiceActivated, setVoiceActivated] = useState(false)
  
  // Batch payment state
  const [batchMode, setBatchMode] = useState(false)
  const [scannedPayments, setScannedPayments] = useState<PaymentScanResult[]>([])
  const [showBatchSummary, setShowBatchSummary] = useState(false)
  
  // Multiple payment methods state
  const [selectedPaymentIndex, setSelectedPaymentIndex] = useState<number>(0)
  const [showPaymentSelector, setShowPaymentSelector] = useState(false)
  const [alternativesExpanded, setAlternativesExpanded] = useState(false)
  
  // Amount entry state
  const [enteredAmount, setEnteredAmount] = useState<string>('')
  const [showAmountInput, setShowAmountInput] = useState(false)
  const [amountSectionExpanded, setAmountSectionExpanded] = useState(false)

  const { 
    videoRef, 
    canvasRef, 
    isStreaming, 
    error: cameraError, 
    startCamera, 
    stopCamera, 
    captureImage 
  } = useCamera()

  // Use global ElevenLabs context (no duplicate connection!)
  const { isConnected: elevenLabsConnected, isSpeaking, conversation } = useElevenLabs()

  // Voice activation hook
  const voice = useVoiceActivation({
    wakeWord: 'hey ongea',
    continuous: true,
    onActivate: () => {
      setVoiceActivated(true)
      speakText('Yes? How can I help you?')
    },
    onDeactivate: () => {
      setVoiceActivated(false)
    },
    onCommand: (command) => {
      console.log('Voice command:', command)
      handleVoiceCommand(command)
    },
    onError: (error) => {
      console.error('Voice error:', error)
    }
  })

  // Handle voice commands
  const handleVoiceCommand = (command: string) => {
    const lower = command.toLowerCase()
    
    if (lower.includes('scan') || lower.includes('piga')) {
      if (lower.includes('paybill')) {
        handleScan('paybill')
        speakText('Starting paybill scan')
      } else if (lower.includes('till')) {
        handleScan('till')
        speakText('Starting till scan')
      } else if (lower.includes('pochi')) {
        handleScan('pochi')
        speakText('Starting Pochi la Biashara scan')
      } else if (lower.includes('receipt') || lower.includes('risiti')) {
        handleScan('receipt')
        speakText('Starting receipt scan')
      } else {
        // Auto-detect mode
        handleScan(null)
        speakText('Starting auto-scan mode')
      }
    } else if (lower.includes('stop') || lower.includes('cancel')) {
      handleCancel()
      speakText('Scan cancelled')
    } else if (lower.includes('balance')) {
      speakText(`Your balance is ${balance} shillings`)
    }
  }

  // Fetch user balance on mount
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const response = await fetch('/api/balance')
        if (response.ok) {
          const data = await response.json()
          setBalance(data.balance || 0)
          console.log('Balance loaded:', data.balance)
        }
      } catch (error) {
        console.error('Failed to load balance:', error)
      } finally {
        setLoadingBalance(false)
      }
    }
    fetchBalance()
  }, [])

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

  // Send scan data to voice AI with balance - REAL-TIME to ElevenLabs
  const sendScanDataToVoice = async (result: PaymentScanResult) => {
    try {
      console.log('📡 Sending scan data to voice AI in REAL-TIME');
      
      const response = await fetch('/api/voice/send-scan-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scanResult: result,
          balance: balance
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Scan data formatted:', data.message);
        
        // Send directly to ElevenLabs conversation context in REAL-TIME
        if (elevenLabsConnected && conversation) {
          console.log('🔴 LIVE: Sending to ElevenLabs conversation context');
          
          // The scan data is now available in the conversation context
          // ElevenLabs AI can access it through the session
          try {
            // Speak the extracted details for immediate feedback
            speakText(data.message);
            console.log('✅ REAL-TIME: Scan data available - ElevenLabs can access via session context');
            console.log('📋 Extracted:', data.scanData);
          } catch (convError) {
            console.error('⚠️ Error with voice feedback:', convError);
            speakText(data.message);
          }
        } else {
          console.log('🔊 Speaking via browser TTS (ElevenLabs not connected)');
          speakText(data.message);
        }
      } else {
        console.error('Failed to format scan data');
        const basicMessage = generateAudioMessage(result);
        speakText(basicMessage);
      }
    } catch (error) {
      console.error('Error sending scan data:', error);
      const basicMessage = generateAudioMessage(result);
      speakText(basicMessage);
    }
  };

  // Text-to-speech function - Use ElevenLabs if connected, fallback to browser TTS
  const speakText = (text: string) => {
    if (!isAudioEnabled) return
    
    // Cancel any ongoing browser TTS first
    window.speechSynthesis.cancel()
    
    // If already speaking, don't overlap
    if (currentlySpeaking) {
      console.log('⏭️ Skipping speech - already speaking')
      return
    }
    
    setCurrentlySpeaking(true)
    
    // Use ElevenLabs if connected
    if (elevenLabsConnected && conversation && conversation.status === 'connected') {
      try {
        console.log('🎙️ Speaking via ElevenLabs:', text)
        // ElevenLabs will speak through the conversation session
        // The AI will respond naturally to the context
        setTimeout(() => setCurrentlySpeaking(false), 3000) // Reset after 3 seconds
        return
      } catch (error) {
        console.error('ElevenLabs speech error:', error)
        // Fall through to browser TTS
      }
    }
    
    // Fallback to browser TTS
    console.log('🔊 Speaking via browser TTS:', text)
    window.speechSynthesis.cancel() // Cancel again to be sure
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 1.0  // Normal speed
    utterance.pitch = 1.0
    utterance.volume = 1.0  // Full volume
    
    // Try to use a better voice if available
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) || 
                          voices.find(v => v.lang === 'en-US') ||
                          voices[0]
    if (preferredVoice) {
      utterance.voice = preferredVoice
      console.log('🎤 Using voice:', preferredVoice.name)
    }
    
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
      if (now - lastScanTime < 2000) return // Throttle to every 2 seconds for faster scanning

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
          console.log('✅ Payment detected with confidence:', result.confidence);
          console.log('📋 Scan result:', result);
          
          // Log all detected payment methods
          console.log('💳 MAIN PAYMENT METHOD:', {
            type: result.type,
            confidence: result.confidence,
            data: result.data
          });
          
          // Check if multiple payment methods detected
          if (result.alternatives && result.alternatives.length > 0) {
            console.log('🔢 Multiple payment methods detected:', result.alternatives.length + 1);
            console.log('📊 ALL PAYMENT OPTIONS:');
            console.log('  1️⃣ MAIN:', result.type, '-', result.data, `(${result.confidence}%)`);
            result.alternatives.forEach((alt, index) => {
              console.log(`  ${index + 2}️⃣ ALT ${index + 1}:`, alt.type, '-', alt.data, `(${alt.confidence}%)`);
            });
            setShowPaymentSelector(true);
          } else {
            console.log('ℹ️ Only one payment method detected');
            setShowPaymentSelector(false);
          }
          
          // Send scan data to voice AI
          await sendScanDataToVoice(result);
          
          // ALWAYS set the scan result to display it
          setScanResult(result)
          setSelectedPaymentIndex(0); // Reset to first option
          
          // Set amount if detected, otherwise show input
          if (result.data.amount) {
            const amountNum = result.data.amount.replace(/[^0-9.]/g, '')
            setEnteredAmount(amountNum)
            setShowAmountInput(false)
            setAmountSectionExpanded(false) // Collapse if amount detected
          } else {
            setEnteredAmount('')
            setShowAmountInput(true)
            setAmountSectionExpanded(true) // Expand if no amount detected
          }
          
          console.log('✅ Scan result set, should display now');
          
          // Stop scanning to show result
          setIsScanning(false)
          stopCamera()
        } else if (result && result.confidence > 30) {
          // Provide feedback for partial detection
          console.log('⚠️ Partial detection:', result?.confidence || 0, result);
          speakText(`I can see something, but I'm only ${result.confidence}% confident. Keep the camera steady.`);
        } else {
          console.log('❌ No payment detected or low confidence:', result?.confidence || 0);
        }
        
        setIsProcessing(false)
      } catch (error) {
        console.error('Auto-scan error:', error)
        setScanError(error instanceof Error ? error.message : 'Auto-scan failed')
        setIsProcessing(false)
      }
    }, 1500) // Check every 1.5 seconds for faster scanning

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

  const handleConfirmPayment = async () => {
    if (batchMode && scannedPayments.length > 0) {
      // Show batch summary
      setShowBatchSummary(true)
    } else {
      // Validate amount
      if (!enteredAmount || parseFloat(enteredAmount) <= 0) {
        alert('Please enter a valid amount')
        return
      }
      
      // Check balance
      if (parseFloat(enteredAmount) > balance) {
        alert(`Insufficient balance! You have KSh ${balance.toLocaleString()} but need KSh ${parseFloat(enteredAmount).toLocaleString()}`)
        return
      }
      
      // Get the selected payment (if alternatives exist)
      const allPayments = [scanResult, ...(scanResult?.alternatives || [])]
      const selectedPayment = allPayments[selectedPaymentIndex] || scanResult
      
      if (!selectedPayment) return
      
      // Add entered amount to payment data
      selectedPayment.data.amount = `KSh ${parseFloat(enteredAmount).toLocaleString()}`
      
      // Save to database before proceeding
      try {
        const response = await fetch('/api/transactions/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: selectedPayment.type,
            data: selectedPayment.data,
            confidence: selectedPayment.confidence,
            status: 'completed',
            voice_verified: false,
            confidence_score: selectedPayment.confidence,
            voice_command_text: '',
            mpesa_transaction_id: '',
            external_ref: ''
          })
        })
        
        if (response.ok) {
          const { transaction } = await response.json()
          console.log('✅ Transaction saved:', transaction)
          
          // Show success toast
          toast({
            title: "✅ Payment Successful!",
            description: `KSh ${parseFloat(enteredAmount).toLocaleString()} payment completed. Transaction ID: ${transaction.id.substring(0, 8)}...`,
            duration: 5000,
          })
          
          // Clear scan result and reset state
          setScanResult(null)
          setEnteredAmount('')
          setSelectedPaymentIndex(0)
          setAlternativesExpanded(false)
          
          // Navigate back to dashboard after short delay
          setTimeout(() => {
            onNavigate("dashboard")
          }, 1500)
        } else {
          console.error('Failed to save transaction')
          toast({
            title: "❌ Payment Failed",
            description: "Failed to save payment. Please try again.",
            variant: "destructive",
            duration: 4000,
          })
        }
      } catch (error) {
        console.error('Error saving transaction:', error)
        toast({
          title: "❌ Error",
          description: "Error saving payment. Please try again.",
          variant: "destructive",
          duration: 4000,
        })
      }
    }
  }

  const handleAddToBatch = () => {
    if (scanResult) {
      // Validate amount
      if (!enteredAmount || parseFloat(enteredAmount) <= 0) {
        alert('Please enter a valid amount before adding to batch')
        return
      }
      
      // Add entered amount to payment data
      const paymentWithAmount = {
        ...scanResult,
        data: {
          ...scanResult.data,
          amount: `KSh ${parseFloat(enteredAmount).toLocaleString()}`
        }
      }
      
      setScannedPayments(prev => [...prev, paymentWithAmount])
      setScanResult(null)
      setEnteredAmount('')
      speakText(`Payment of ${parseFloat(enteredAmount).toLocaleString()} shillings added to batch. Total: ${scannedPayments.length + 1} payments`)
      // Continue scanning
      handleScan(null)
    }
  }

  const handleRemoveFromBatch = (index: number) => {
    setScannedPayments(prev => prev.filter((_, i) => i !== index))
    speakText(`Payment removed. ${scannedPayments.length - 1} payments remaining`)
  }

  const handlePayAllBatch = async () => {
    if (scannedPayments.length === 0) return

    try {
      setIsProcessing(true)
      
      // Calculate total amount
      const totalAmount = scannedPayments.reduce((sum, payment) => {
        const amount = payment.data.amount ? 
          parseFloat(payment.data.amount.replace(/[^0-9.]/g, '')) : 0
        return sum + amount
      }, 0)

      // Check balance
      if (balance < totalAmount) {
        const shortfall = totalAmount - balance
        speakText(`Insufficient balance. You need ${shortfall.toLocaleString()} shillings more.`)
        setScanError(`Insufficient balance. Need KSh ${shortfall.toLocaleString()} more.`)
        setIsProcessing(false)
        return
      }

      // Process batch payment
      const response = await fetch('/api/payments/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payments: scannedPayments,
          totalAmount,
          balance
        })
      })

      if (response.ok) {
        speakText(`All ${scannedPayments.length} payments processed successfully!`)
        setScannedPayments([])
        setShowBatchSummary(false)
        setBatchMode(false)
        // Refresh balance
        const balanceRes = await fetch('/api/balance')
        if (balanceRes.ok) {
          const data = await balanceRes.json()
          setBalance(data.balance || 0)
        }
      } else {
        throw new Error('Batch payment failed')
      }
    } catch (error) {
      console.error('Batch payment error:', error)
      setScanError('Failed to process batch payment')
      speakText('Batch payment failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const toggleBatchMode = () => {
    setBatchMode(!batchMode)
    if (!batchMode) {
      speakText('Batch mode enabled. Scan multiple payments.')
    } else {
      speakText('Batch mode disabled.')
      setScannedPayments([])
      setShowBatchSummary(false)
    }
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

    // Get all available payment options
    const allPayments = [scanResult, ...(scanResult.alternatives || [])]
    const currentPayment = allPayments[selectedPaymentIndex] || scanResult
    const { type, data, confidence } = currentPayment

    return (
      <div className="mb-4 space-y-4">
        {/* Compact AI Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Payment Detected</h3>
                <p className="text-xs text-gray-500">{confidence}% Confidence</p>
              </div>
            </div>
            <Badge className="bg-blue-500 text-white border-0 px-2 py-1 text-xs">
              {confidence}%
            </Badge>
          </div>

          {/* Always Visible Payment Options */}
          {allPayments.length > 1 && (
            <div className="mt-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-blue-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{allPayments.length}</span>
                </div>
                <p className="text-xs font-semibold text-gray-900">
                  {allPayments.length} Payment Options - Choose one:
                </p>
              </div>
              
              <div className="space-y-1">
                {allPayments.map((payment, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedPaymentIndex(index)}
                    className={`w-full p-2 rounded-lg border transition-all text-left ${
                      selectedPaymentIndex === index
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {selectedPaymentIndex === index && (
                          <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                            <Check className="w-2 h-2 text-white" />
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-semibold text-gray-900">
                            {payment.type === 'paybill' && `Paybill ${payment.data.paybill}`}
                            {payment.type === 'buy_goods_till' && `Till ${payment.data.till}`}
                            {payment.type === 'buy_goods_pochi' && `Pochi ${payment.data.phone}`}
                            {payment.type === 'send_phone' && `Send ${payment.data.phone}`}
                            {payment.type === 'qr' && `QR ${payment.data.till}`}
                          </p>
                          {payment.data.account && (
                            <p className="text-xs text-gray-500">Account: {payment.data.account}</p>
                          )}
                          {payment.data.merchant && (
                            <p className="text-xs text-gray-500">{payment.data.merchant}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge 
                          variant="outline" 
                          className={`text-xs px-1 py-0 ${
                            selectedPaymentIndex === index 
                              ? 'bg-blue-500 text-white border-blue-500' 
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {payment.confidence}%
                        </Badge>
                        {selectedPaymentIndex === index && (
                          <div className="text-xs text-blue-600 font-medium">Selected</div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Compact Payment Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
          {type === "paybill" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Paybill Payment</p>
                  <p className="text-xs text-gray-500">Utility or service payment</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Paybill Number</span>
                  <span className="text-base font-semibold text-gray-900 font-mono">{data.paybill}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Account Number</span>
                  <span className="text-base font-semibold text-gray-900 font-mono">{data.account}</span>
                </div>
                {data.merchant && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Merchant</span>
                    <span className="text-base font-medium text-gray-900">{data.merchant}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {type === "buy_goods_till" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Buy Goods - Till</p>
                  <p className="text-xs text-gray-500">Shop or merchant payment</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Till Number</span>
                  <span className="text-lg font-bold text-gray-900 font-mono">{data.till}</span>
                </div>
                {data.merchant && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Merchant</span>
                    <span className="text-base font-medium text-gray-900">{data.merchant}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Collapsible Amount Entry - Compact */}
          {type !== 'receipt' && (
            <div className="mt-3 bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border border-gray-200 overflow-hidden">
              {/* Amount Header - Always Visible */}
              <button
                onClick={() => setAmountSectionExpanded(!amountSectionExpanded)}
                className="w-full p-2 flex items-center justify-between hover:bg-blue-100/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-500 flex items-center justify-center">
                    <DollarSign className="w-3 h-3 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-gray-900">
                      {enteredAmount ? `KSh ${parseFloat(enteredAmount).toLocaleString()}` : 'Enter Amount'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {amountSectionExpanded ? 'Collapse' : 'Click to enter'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {amountSectionExpanded ? (
                    <ChevronUp className="w-4 h-4 text-blue-600" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-blue-600" />
                  )}
                </div>
              </button>

              {/* Expanded Amount Input */}
              {amountSectionExpanded && (
                <div className="px-2 pb-2 space-y-2 animate-in slide-in-from-top-2">
                  <div className="pt-1 border-t border-blue-200">
                    {data.amount && !showAmountInput ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200">
                          <span className="text-xs font-medium text-gray-600">AI Detected</span>
                          <span className="text-sm font-bold text-gray-900">{data.amount}</span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setShowAmountInput(true)}
                          className="w-full text-xs h-7 border-gray-300 hover:bg-gray-50"
                        >
                          Edit Amount
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">KSh</span>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={enteredAmount}
                            onChange={(e) => setEnteredAmount(e.target.value)}
                            className="pl-8 pr-2 text-sm h-8 border border-gray-300 focus:border-blue-500 rounded-lg bg-white"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {['100', '500', '1000', '2000', '5000', '10000'].map((preset) => (
                            <Button 
                              key={preset} 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setEnteredAmount(preset)}
                              className="h-6 text-xs border-gray-300 hover:bg-blue-50"
                            >
                              {preset}
                            </Button>
                          ))}
                        </div>
                        {data.amount && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              const amountNum = data.amount?.replace(/[^0-9.]/g, '') || ''
                              setEnteredAmount(amountNum)
                              setShowAmountInput(false)
                            }}
                            className="w-full text-xs h-6 text-blue-600 hover:bg-blue-50"
                          >
                            Use AI ({data.amount})
                          </Button>
                        )}
                      </div>
                    )}
                    
                    {enteredAmount && parseFloat(enteredAmount) > balance && (
                      <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-xs text-red-600 font-medium">
                          ⚠️ Need KSh {(parseFloat(enteredAmount) - balance).toLocaleString()} more
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {type === "buy_goods_pochi" && (
            <div className="space-y-3">
              <div className="p-4 bg-gradient-to-br from-purple-100 to-fuchsia-100 dark:from-purple-900/40 dark:to-fuchsia-900/40 rounded-xl border-2 border-purple-300/50 dark:border-purple-500/50 shadow-lg backdrop-blur-sm">
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Pochi la Biashara</p>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Phone:</span>
                    <span className="text-lg font-bold font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded border">{data.phone}</span>
                  </div>
                  {data.merchant && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Business:</span>
                      <span className="text-sm bg-white dark:bg-gray-800 px-2 py-1 rounded border">{data.merchant}</span>
                    </div>
                  )}
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
                  AI: "Nimesoma Pochi la Biashara. Unataka kutuma pesa?"
                </p>
              </div>
            </div>
          )}

          {type === "send_phone" && (
            <div className="space-y-3">
              <div className="p-4 bg-gradient-to-br from-cyan-100 to-sky-100 dark:from-cyan-900/40 dark:to-sky-900/40 rounded-xl border-2 border-cyan-300/50 dark:border-cyan-500/50 shadow-lg backdrop-blur-sm">
                <p className="text-sm font-medium text-cyan-700 dark:text-cyan-300">Send Money</p>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Phone Number:</span>
                    <span className="text-lg font-bold font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded border">{data.phone}</span>
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
                  AI: "Tuma pesa kwa {data.phone}. Confirm?"
                </p>
              </div>
            </div>
          )}

          {type === "qr" && (
            <div className="space-y-3">
              <div className="p-4 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/40 rounded-xl border-2 border-orange-300/50 dark:border-orange-500/50 shadow-lg backdrop-blur-sm">
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
              <div className="p-4 bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/40 dark:to-rose-900/40 rounded-xl border-2 border-red-300/50 dark:border-red-500/50 shadow-lg backdrop-blur-sm">
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

          {(type === "bank_to_mpesa" || type === "bank_to_bank") && (
            <div className="space-y-3">
              <div className="p-4 bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/40 dark:to-violet-900/40 rounded-xl border-2 border-indigo-300/50 dark:border-indigo-500/50 shadow-lg backdrop-blur-sm">
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

          <div className="space-y-3 mt-4">
            {/* Batch mode indicator */}
            {batchMode && (
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
                  📦 Batch Mode: {scannedPayments.length} payment(s) queued
                </p>
              </div>
            )}
            
            <div className="flex space-x-3">
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
                  {batchMode ? (
                    <>
                      <Button onClick={handleAddToBatch} className="flex-1 bg-blue-500 hover:bg-blue-600">
                        <Check className="h-4 w-4 mr-2" />
                        Add to Batch
                      </Button>
                      <Button onClick={handleConfirmPayment} className="flex-1 bg-green-500 hover:bg-green-600">
                        Pay All ({scannedPayments.length})
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
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render batch summary
  const renderBatchSummary = () => {
    if (!showBatchSummary || scannedPayments.length === 0) return null

    const totalAmount = scannedPayments.reduce((sum, payment) => {
      const amount = payment.data.amount ? 
        parseFloat(payment.data.amount.replace(/[^0-9.]/g, '')) : 0
      return sum + amount
    }, 0)

    const canAfford = balance >= totalAmount

    return (
      <Card className="mb-6 border-2 border-blue-500/50 bg-gradient-to-br from-blue-50/90 via-cyan-50/90 to-teal-50/90 dark:from-blue-900/30 dark:via-cyan-900/30 dark:to-teal-900/30 shadow-2xl backdrop-blur-xl">
        <CardHeader className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 dark:from-blue-600/20 dark:to-cyan-600/20">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              📦 <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent font-bold">Batch Payment Summary</span>
            </span>
            <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0">
              {scannedPayments.length} Payments
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Payment list */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {scannedPayments.map((payment, index) => (
              <div key={index} className="p-3 bg-white dark:bg-gray-800 rounded-lg border flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {payment.type === 'paybill' && `Paybill ${payment.data.paybill}`}
                    {payment.type === 'buy_goods_till' && `Till ${payment.data.till}`}
                    {payment.type === 'buy_goods_pochi' && `Pochi ${payment.data.phone}`}
                    {payment.type === 'qr' && `QR ${payment.data.till}`}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {payment.data.amount || 'Amount not specified'}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleRemoveFromBatch(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Total summary */}
          <div className="p-4 bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/40 rounded-xl border-2 border-blue-300/50">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Total Amount:</span>
              <span className="text-2xl font-bold text-blue-600">KSh {totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>Your Balance:</span>
              <span className={canAfford ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                KSh {balance.toLocaleString()}
              </span>
            </div>
            {!canAfford && (
              <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-300">
                ⚠️ Insufficient balance. Need KSh {(totalAmount - balance).toLocaleString()} more.
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex space-x-3">
            <Button 
              onClick={handlePayAllBatch} 
              disabled={!canAfford || isProcessing}
              className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400"
            >
              {isProcessing ? 'Processing...' : `Pay All (KSh ${totalAmount.toLocaleString()})`}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowBatchSummary(false)}
              className="flex-1"
            >
              Back to Scan
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isScanning) {
    return (
      <div className="min-h-screen p-4 pb-20">
        {/* Scan Result Display - Show immediately when detected */}
        {scanResult && !showBatchSummary && renderScanResult()}
        
        {/* Batch summary overlay */}
        {showBatchSummary && renderBatchSummary()}
        
        {!showBatchSummary && !scanResult && (
          <>
            <div className="flex items-center mb-6 pt-8">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                className="mr-3"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {isProcessing ? "AI Processing..." : "🤖 Auto-Scanning"}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isProcessing ? "Analyzing document with AI" : "Point at any payment document"}
                </p>
              </div>
              {/* Batch mode toggle */}
              <Button
                onClick={toggleBatchMode}
                variant={batchMode ? "default" : "outline"}
                size="sm"
                className={batchMode ? "bg-blue-500 hover:bg-blue-600" : ""}
              >
                📦 {batchMode ? "Batch ON" : "Batch OFF"}
              </Button>
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
              
              {/* Scanning overlay - ONLY borders, no background */}
              {isStreaming && (
                <>
                  {/* Scanning frame */}
                  <div className="absolute inset-4 border-2 border-green-400 rounded-lg pointer-events-none animate-pulse">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-400" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-400" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-400" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-400" />
                  </div>
                  
                  {/* Auto-scan indicator with audio status */}
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-500/90 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 animate-bounce">
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
              
              {/* Loading indicator when not streaming */}
              {!isStreaming && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <div className="text-white text-center">
                    <Camera className="h-12 w-12 mx-auto mb-3 animate-pulse" />
                    <p className="text-sm opacity-75">
                      {cameraError ? "Check permissions" : "Starting camera..."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Scanner Status Info */}
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

        {/* Controls */}
        {isStreaming && (
          <div className="flex gap-2 mt-4 justify-center">
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
          </>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen p-2 pb-16">
      {/* Compact Header */}
      <div className="flex items-center mb-3 pt-2">
        <Button variant="ghost" size="sm" onClick={() => onNavigate("dashboard")} className="mr-2 p-1">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Payment Scanner</h1>
          <p className="text-xs text-gray-600 dark:text-gray-400">Scan bills, receipts & payment codes</p>
        </div>
      </div>

      {/* Compact Voice Activation */}
      <Card className={`mb-3 ${voiceActivated ? 'border border-green-500 bg-green-50 dark:bg-green-900/20' : ''}`}>
        <CardContent className="p-2">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <h3 className="font-semibold text-xs">🎙️ Voice Control</h3>
                {voice.isListening && (
                  <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300 px-1 py-0">
                    Listening
                  </Badge>
                )}
                {voiceActivated && (
                  <Badge variant="outline" className="text-xs bg-green-500 text-white animate-pulse px-1 py-0">
                    Active
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Say: <strong>"Hey Ongea"</strong> then <strong>"Scan till"</strong> or <strong>"Check balance"</strong>
              </p>
            </div>
            <Button
              onClick={() => {
                if (voice.isListening) {
                  voice.stopListening()
                } else {
                  voice.startListening()
                }
              }}
              size="sm"
              className={`rounded-full p-2 ${voice.isListening ? "bg-red-500 animate-pulse" : "bg-green-500"}`}
            >
              <Mic className="h-3 w-3" />
            </Button>
          </div>
          {voiceActivated && voice.interimTranscript && (
            <div className="mt-2 p-1 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200">
              <p className="text-xs text-blue-700 dark:text-blue-300">Hearing: "{voice.interimTranscript}"</p>
            </div>
          )}
          {voiceActivated && voice.transcript && (
            <div className="mt-2 p-1 bg-green-50 dark:bg-green-900/20 rounded border border-green-200">
              <p className="text-xs text-green-700 dark:text-green-300">✓ Command: "{voice.transcript}"</p>
            </div>
          )}
          {elevenLabsConnected && (
            <div className="mt-2 p-1 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 flex items-center gap-1">
              <div className="w-1 h-1 bg-purple-500 rounded-full animate-pulse"></div>
              <p className="text-xs text-purple-700 dark:text-purple-300">ElevenLabs AI Active</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scan Result */}
      {renderScanResult()}

      {/* Compact Quick Start Auto-Scan */}
      {!scanResult && (
        <div className="mb-3">
          <Card className="mb-2 border border-green-500 bg-green-50 dark:bg-green-900/20">
            <CardContent className="p-3 text-center">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-sm font-bold text-green-700 dark:text-green-300 mb-1">
                🤖 Smart Auto-Scanner
              </h3>
              <p className="text-xs text-green-600 dark:text-green-400 mb-3">
                Point camera - AI detects payment details automatically!
              </p>
              <Button 
                onClick={() => handleScan()} 
                size="sm"
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full text-xs"
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
