"use client"

import { useState, useEffect, useRef } from "react"
import { ArrowLeft, Camera, QrCode, Receipt, CreditCard, Building2, Mic, Check, X, AlertCircle, DollarSign, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useCamera } from "@/hooks/use-camera"
import { useVoiceActivation } from "@/hooks/use-voice-activation"
import { useElevenLabs } from '@/contexts/ElevenLabsContext'
import { PaymentScanResult } from "@/lib/gemini-vision"
import { normalizeScanToBatchItem } from '@/lib/batch-payments'
import type { BatchResponse } from '@/lib/batch-payments'
import { calculateTransactionFees, formatFeesMessage, hasSufficientBalance } from "@/lib/transaction-fees"
import { ScreenShell } from "@/components/foundation"
import { cn } from "@/lib/utils"

type Screen = "dashboard" | "voice" | "send" | "recurring" | "analytics" | "test" | "permissions" | "scanner";

interface PaymentScannerProps {
  onNavigate: (screen: Screen) => void
  /** 'page' (default) = full-page with landing/mode-picker; 'overlay' = skip landing, autoStart the camera */
  variant?: 'page' | 'overlay'
  /** When true, call handleScan(initialMode ?? null) on mount — used with variant='overlay' */
  autoStart?: boolean
  /** Initial scan mode when autoStart is true. null = auto-detect */
  initialMode?: ScanMode | null
  /** Called instead of onNavigate("dashboard") when the scanner should be closed (e.g. overlay dismissed) */
  onClose?: () => void
}

type ScanMode = "paybill" | "till" | "qr" | "receipt" | "bank" | "pochi"

export default function PaymentScanner({ onNavigate, variant = 'page', autoStart = false, initialMode, onClose }: PaymentScannerProps) {
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
  const [batchResults, setBatchResults] = useState<BatchResponse | null>(null)

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
  const { isConnected: elevenLabsConnected, isSpeaking, conversation, registerToolHandlers, unregisterToolHandlers, sendContextualUpdate } = useElevenLabs()

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
        speakText('Pochi la Biashara is coming soon and not available yet. You can scan a Till, Paybill, or QR code.')
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

  // Auto-start the camera on mount when triggered by voice (overlay mode)
  const autoStartFiredRef = useRef(false)
  useEffect(() => {
    if (autoStart && !autoStartFiredRef.current) {
      autoStartFiredRef.current = true
      handleScan(initialMode ?? null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally runs once on mount

  // Register scanner-specific client tools so the voice agent can drive the UI
  useEffect(() => {
    registerToolHandlers({
      startScan: (mode) => handleScan(mode as ScanMode ?? null),
      confirmPayment: () => {
        // Confirm the first detected payment option (index 0)
        if (scanResult?.type && scanResult.type !== 'receipt') {
          handleConfirmPayment()
        }
      },
      getBalance: () => balance,
    });
    return () => unregisterToolHandlers(['startScan', 'confirmPayment', 'getBalance']);
  }, [scanResult, balance]); // re-register when these change so closures stay fresh

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
      color: "bg-brand",
      voiceCommand: "Piga Till",
    },
    {
      id: "pochi" as ScanMode,
      title: "Pochi la Biashara",
      description: "Coming soon",
      icon: Building2,
      color: "bg-purple-300",
      voiceCommand: "Piga Pochi",
      disabled: true,
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
          console.log('🔴 LIVE: Injecting scan result into ElevenLabs conversation context');
          console.log('📋 Extracted:', data.scanData);
          // Inject the formatted scan message into the live ElevenLabs session
          await sendContextualUpdate(data.message);
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

        setLastScanTime(now)
        setIsProcessing(true)

        const ocrRes = await fetch('/api/scan/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData, scanMode: null }),
        })
        if (!ocrRes.ok) {
          console.warn('Auto-scan OCR error:', ocrRes.status)
          setIsProcessing(false)
          return
        }
        const result: PaymentScanResult = await ocrRes.json()
        console.log('OCR result:', result);

        if (result && result.confidence > 70 && result.type !== 'buy_goods_pochi') {
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
      if (!imageData) throw new Error("Failed to capture image")

      // Server route: OpenAI gpt-4o first, Gemini fallback. Key stays server-side.
      const res = await fetch('/api/scan/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData, scanMode }),
      })
      if (!res.ok) throw new Error(`OCR service error: ${res.status}`)
      const result: PaymentScanResult = await res.json()
      setScanResult(result)
      setIsScanning(false)
      stopCamera()

      if (result.data.amount) {
        const amountNum = result.data.amount.replace(/[^0-9.]/g, '')
        setEnteredAmount(amountNum)
        setShowAmountInput(false)
      } else {
        setEnteredAmount('')
        setShowAmountInput(true)
        setAmountSectionExpanded(true)
      }
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

      const amountNum = parseFloat(enteredAmount)
      selectedPayment.data.amount = `KSh ${amountNum.toLocaleString()}`

      // Determine whether this payment has a real NCBA rail destination
      const { type, data } = selectedPayment
      const isPayableTill = (type === 'buy_goods_till' || type === 'qr') && data.till
      const isPayableBill = type === 'paybill' && data.paybill
      const isPayablePhone = type === 'send_phone' && data.phone
      // Receipt with an extracted till/paybill also routes via NCBA
      const isPayableReceipt = type === 'receipt' && (data.till || data.paybill)
      const useRealRail = isPayableTill || isPayableBill || isPayablePhone || isPayableReceipt

      try {
        if (useRealRail) {
          // Route through the real NCBA rail: processing → completed/failed
          let destination: any
          if (isPayableTill || isPayableReceipt && data.till) {
            destination = { kind: 'till', till: data.till, recipientName: data.merchant }
          } else if (isPayableBill || isPayableReceipt && data.paybill) {
            destination = { kind: 'paybill', paybill: data.paybill, account: data.account || '', recipientName: data.merchant }
          } else {
            destination = { kind: 'phone', phone: data.phone, recipientName: data.merchant }
          }

          const res = await fetch('/api/wallet/pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: amountNum, destination, narration: `Scanner: ${type}` }),
          })
          const result = await res.json()

          if (res.ok && result.success) {
            toast({
              title: "✅ Payment Sent!",
              description: `KSh ${amountNum.toLocaleString()} sent.${result.bank_ref ? ` Ref: ${result.bank_ref}` : ''} ${result.message || ''}`,
              duration: 5000,
            })
            setScanResult(null); setEnteredAmount(''); setSelectedPaymentIndex(0); setAlternativesExpanded(false)
            setTimeout(() => { if (onClose) { onClose() } else { onNavigate("dashboard") } }, 1500)
          } else {
            toast({ title: "❌ Payment Failed", description: result.message || "Please try again.", variant: "destructive", duration: 4000 })
          }
        } else {
          // Expense-tracking only (receipt with no till/paybill, bank details, etc.)
          const res = await fetch('/api/transactions/create', {
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
            }),
          })

          if (res.ok) {
            const { transaction } = await res.json()
            toast({
              title: "✅ Recorded!",
              description: `KSh ${amountNum.toLocaleString()} expense saved. ID: ${transaction.id.substring(0, 8)}...`,
              duration: 5000,
            })
            setScanResult(null); setEnteredAmount(''); setSelectedPaymentIndex(0); setAlternativesExpanded(false)
            setTimeout(() => { if (onClose) { onClose() } else { onNavigate("dashboard") } }, 1500)
          } else {
            toast({ title: "❌ Failed to Record", description: "Please try again.", variant: "destructive", duration: 4000 })
          }
        }
      } catch (error) {
        console.error('Payment error:', error)
        toast({ title: "❌ Error", description: "Error processing payment. Please try again.", variant: "destructive", duration: 4000 })
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

      // Map scanner results to BatchItems using the shared normalizer
      const payments = scannedPayments.map(scan => normalizeScanToBatchItem(scan))

      // POST to the real batch route — server validates balance and sends individually
      const response = await fetch('/api/payments/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payments, narration: 'Scanner batch' }),
      })

      const json: BatchResponse = await response.json()
      setBatchResults(json)

      if (!json.success && json.error === 'Insufficient funds') {
        const shortfall = json.shortfall ?? 0
        speakText(`Insufficient balance. You need ${shortfall.toLocaleString()} shillings more.`)
        setScanError(`Insufficient balance. Need KSh ${shortfall.toFixed(2)} more.`)
        return
      }

      const succeeded = (json.results ?? []).filter(r => r.success).length
      const failed = (json.results ?? []).filter(r => !r.success).length

      if (failed === 0) {
        speakText(`All ${succeeded} payments processed successfully!`)
        toast({ title: '✅ Batch Complete', description: `${succeeded} payment(s) sent.` })
        setScannedPayments([])
        setShowBatchSummary(false)
        setBatchMode(false)
      } else {
        speakText(`${succeeded} of ${scannedPayments.length} payments sent. ${failed} failed.`)
        toast({
          title: `⚠️ Partial: ${succeeded} sent, ${failed} failed`,
          description: (json.results ?? [])
            .filter(r => !r.success)
            .map(r => `${r.label ?? r.kind}: ${r.error}`)
            .join(' | '),
          variant: 'destructive',
        })
        // Clear only succeeded items from the batch
        const failedIndices = new Set((json.results ?? []).filter(r => !r.success).map(r => r.index))
        setScannedPayments(prev => prev.filter((_, i) => failedIndices.has(i)))
        if (succeeded > 0) setShowBatchSummary(true)
      }

      // Refresh balance
      const balanceRes = await fetch('/api/balance')
      if (balanceRes.ok) {
        const data = await balanceRes.json()
        setBalance(data.balance || 0)
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
    if (onClose) {
      onClose()
    } else {
      onNavigate("dashboard")
    }
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
        <div className="rounded-2xl border border-border/60 bg-card p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Payment Detected</h3>
                <p className="text-xs text-muted-foreground">{confidence}% Confidence</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand/10 text-brand">
              {confidence}%
            </span>
          </div>

          {/* Always Visible Payment Options */}
          {allPayments.length > 1 && (
            <div className="mt-2 rounded-xl border border-blue-500/20 bg-blue-500/8 p-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-brand flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{allPayments.length}</span>
                </div>
                <p className="text-xs font-semibold text-foreground">
                  {allPayments.length} Payment Options - Choose one:
                </p>
              </div>

              <div className="space-y-1">
                {allPayments.map((payment, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedPaymentIndex(index)}
                    className={cn(
                      "w-full p-2 rounded-lg border transition-all text-left",
                      selectedPaymentIndex === index
                        ? 'border-brand/40 bg-brand/5'
                        : 'border-border/60 bg-card hover:border-border'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {selectedPaymentIndex === index && (
                          <div className="w-4 h-4 rounded-full bg-brand flex items-center justify-center">
                            <Check className="w-2 h-2 text-white" />
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-semibold text-foreground">
                            {payment.type === 'paybill' && `Paybill ${payment.data.paybill}`}
                            {payment.type === 'buy_goods_till' && `Till ${payment.data.till}`}
                            {payment.type === 'buy_goods_pochi' && `Pochi ${payment.data.phone}`}
                            {payment.type === 'send_phone' && `Send ${payment.data.phone}`}
                            {payment.type === 'qr' && `QR ${payment.data.till}`}
                          </p>
                          {payment.data.account && (
                            <p className="text-xs text-muted-foreground">Account: {payment.data.account}</p>
                          )}
                          {payment.data.merchant && (
                            <p className="text-xs text-muted-foreground">{payment.data.merchant}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {selectedPaymentIndex === index ? (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand/10 text-brand">
                            {payment.confidence}%
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {payment.confidence}%
                          </span>
                        )}
                        {selectedPaymentIndex === index && (
                          <div className="text-xs text-brand font-medium">Selected</div>
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
        <div className="rounded-2xl border border-border/60 bg-card p-3">
          {type === "paybill" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Paybill Payment</p>
                  <p className="text-xs text-muted-foreground">Utility or service payment</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-border/40">
                  <span className="text-sm text-muted-foreground">Paybill Number</span>
                  <span className="text-base font-semibold text-foreground font-mono">{data.paybill}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/40">
                  <span className="text-sm text-muted-foreground">Account Number</span>
                  <span className="text-base font-semibold text-foreground font-mono">{data.account}</span>
                </div>
                {data.merchant && (
                  <div className="flex items-center justify-between py-2 border-b border-border/40">
                    <span className="text-sm text-muted-foreground">Merchant</span>
                    <span className="text-base font-medium text-foreground">{data.merchant}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {type === "buy_goods_till" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Buy Goods - Till</p>
                  <p className="text-xs text-muted-foreground">Shop or merchant payment</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-border/40">
                  <span className="text-sm text-muted-foreground">Till Number</span>
                  <span className="text-lg font-bold text-foreground font-mono">{data.till}</span>
                </div>
                {data.merchant && (
                  <div className="flex items-center justify-between py-2 border-b border-border/40">
                    <span className="text-sm text-muted-foreground">Merchant</span>
                    <span className="text-base font-medium text-foreground">{data.merchant}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Collapsible Amount Entry - Compact */}
          {type !== 'receipt' && (
            <div className="mt-3 rounded-xl border border-border/60 bg-muted/30 overflow-hidden">
              {/* Amount Header - Always Visible */}
              <button
                onClick={() => setAmountSectionExpanded(!amountSectionExpanded)}
                className="w-full p-2 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-brand flex items-center justify-center">
                    <DollarSign className="w-3 h-3 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-foreground">
                      {enteredAmount ? `KSh ${parseFloat(enteredAmount).toLocaleString()}` : 'Enter Amount'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {amountSectionExpanded ? 'Collapse' : 'Click to enter'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {amountSectionExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Expanded Amount Input */}
              {amountSectionExpanded && (
                <div className="px-2 pb-2 space-y-2 animate-in slide-in-from-top-2">
                  <div className="pt-1 border-t border-border/40">
                    {data.amount && !showAmountInput ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-card">
                          <span className="text-xs font-medium text-muted-foreground">Detected</span>
                          <span className="text-sm font-bold text-foreground">{data.amount}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAmountInput(true)}
                          className="w-full text-xs h-7"
                        >
                          Edit Amount
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="relative flex items-center border border-border/60 rounded-lg bg-card px-2 h-8">
                          <span className="text-muted-foreground text-xs mr-1">KSh</span>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={enteredAmount}
                            onChange={(e) => setEnteredAmount(e.target.value)}
                            className="flex-1 text-sm text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/40"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {['100', '500', '1000', '2000', '5000', '10000'].map((preset) => (
                            <Button
                              key={preset}
                              variant="outline"
                              size="sm"
                              onClick={() => setEnteredAmount(preset)}
                              className="h-6 text-xs"
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
                            className="w-full text-xs h-6 text-brand hover:bg-brand/10"
                          >
                            Use detected value ({data.amount})
                          </Button>
                        )}
                      </div>
                    )}

                    {enteredAmount && parseFloat(enteredAmount) > balance && (
                      <div className="mt-2 p-2 rounded-lg border border-destructive/20 bg-destructive/8">
                        <p className="text-xs text-destructive font-medium">
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
              <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
                <p className="text-sm font-medium text-muted-foreground">Pochi la Biashara</p>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-foreground">Phone:</span>
                    <span className="text-lg font-bold font-mono text-foreground">{data.phone}</span>
                  </div>
                  {data.merchant && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">Business:</span>
                      <span className="text-sm text-foreground">{data.merchant}</span>
                    </div>
                  )}
                  {data.amount && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">Amount:</span>
                      <span className="text-lg font-bold text-brand">{data.amount}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  "Nimesoma Pochi la Biashara. Unataka kutuma pesa?"
                </p>
              </div>
            </div>
          )}

          {type === "send_phone" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
                <p className="text-sm font-medium text-muted-foreground">Send Money</p>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-foreground">Phone Number:</span>
                    <span className="text-lg font-bold font-mono text-foreground">{data.phone}</span>
                  </div>
                  {data.amount && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">Amount:</span>
                      <span className="text-lg font-bold text-brand">{data.amount}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  "Tuma pesa kwa {data.phone}. Confirm?"
                </p>
              </div>
            </div>
          )}

          {type === "qr" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
                <p className="text-sm font-medium text-muted-foreground">QR Code Scanned</p>
                <p className="text-lg font-bold text-foreground">Till: {data.till}</p>
                <p className="text-sm text-muted-foreground">Merchant: {data.merchant}</p>
                <p className="text-sm text-muted-foreground">Amount: {data.amount}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  "Scan successful. Lipa {data.amount} to {data.merchant}?"
                </p>
              </div>
            </div>
          )}

          {type === "receipt" && data.receiptData && (
            <div className="space-y-3">
              <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
                <p className="text-sm font-medium text-muted-foreground">Receipt Captured</p>
                <p className="text-lg font-bold text-foreground">{data.receiptData.vendor}</p>
                <p className="text-sm text-muted-foreground">Amount: {data.receiptData.amount}</p>
                <p className="text-sm text-muted-foreground">Date: {data.receiptData.date}</p>
                <p className="text-sm text-muted-foreground">Category: {data.receiptData.category}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  "Risiti ya {data.receiptData.category} {data.receiptData.amount}. Tag under{" "}
                  {data.receiptData.category}?"
                </p>
              </div>
            </div>
          )}

          {(type === "bank_to_mpesa" || type === "bank_to_bank") && (
            <div className="space-y-3">
              <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
                <p className="text-sm font-medium text-muted-foreground">Bank Account Detected</p>
                <p className="text-lg font-bold text-foreground">Bank Code: {data.bankCode}</p>
                <p className="text-sm text-muted-foreground">Account: {data.account}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  "Nimesoma bank details. Code {data.bankCode} account {data.account}."
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3 mt-4">
            {/* Batch mode indicator */}
            {batchMode && (
              <div className="p-2 rounded-lg border border-brand/20 bg-brand/5">
                <p className="text-xs text-brand text-center">
                  📦 Batch Mode: {scannedPayments.length} payment(s) queued
                </p>
              </div>
            )}

            <div className="flex space-x-3">
              {type === "receipt" ? (
                <>
                  <Button onClick={handleSaveReceipt} className="flex-1">
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
                      <Button variant="outline" onClick={handleAddToBatch} className="flex-1">
                        <Check className="h-4 w-4 mr-2" />
                        Add to Batch
                      </Button>
                      <Button onClick={handleConfirmPayment} className="flex-1">
                        Pay All ({scannedPayments.length})
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button onClick={handleConfirmPayment} className="flex-1">
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
      <div className="mb-5 rounded-2xl border border-border/60 bg-card">
        <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
          <span className="flex items-center gap-2 text-base font-semibold text-foreground">
            📦 Batch Payment Summary
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand/10 text-brand">
            {scannedPayments.length} Payments
          </span>
        </div>
        <div className="px-4 py-3 space-y-3">
          {/* Payment list */}
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {scannedPayments.map((payment, index) => (
              <div key={index} className="flex items-center justify-between px-3 py-2">
                <div className="flex-1">
                  <p className="font-medium text-sm text-foreground">
                    {payment.type === 'paybill' && `Paybill ${payment.data.paybill}`}
                    {payment.type === 'buy_goods_till' && `Till ${payment.data.till}`}
                    {payment.type === 'buy_goods_pochi' && `Pochi ${payment.data.phone}`}
                    {payment.type === 'qr' && `QR ${payment.data.till}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {payment.data.amount || 'Amount not specified'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveFromBatch(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Total summary */}
          <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-foreground">Total Amount:</span>
              <span className="text-2xl font-bold text-brand">KSh {totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Your Balance:</span>
              <span className={cn("font-medium", canAfford ? "text-brand" : "text-destructive")}>
                KSh {balance.toLocaleString()}
              </span>
            </div>
            {!canAfford && (
              <div className="mt-2 p-2 rounded-lg border border-destructive/20 bg-destructive/8 text-xs text-destructive">
                ⚠️ Insufficient balance. Need KSh {(totalAmount - balance).toLocaleString()} more.
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex space-x-3">
            <Button
              onClick={handlePayAllBatch}
              disabled={!canAfford || isProcessing}
              className="flex-1"
            >
              {isProcessing ? 'Processing...' : `Pay All (KSh ${totalAmount.toLocaleString()})`}
            </Button>
            <Button
              variant="outline"
              onClick={() => { setShowBatchSummary(false); setBatchResults(null) }}
              className="flex-1"
            >
              Back to Scan
            </Button>
          </div>

          {/* Per-item results (shown after sending) */}
          {batchResults?.results && batchResults.results.length > 0 && (
            <div className="rounded-xl border border-border/60 bg-muted/20 overflow-hidden">
              <p className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border/40">
                Results — {batchResults.successCount} sent, {batchResults.failCount} failed
              </p>
              {batchResults.results.map((r, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 border-b border-border/20 last:border-0">
                  <span className="text-base">{r.success ? '✅' : '❌'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{r.label ?? r.kind}</p>
                    {!r.success && <p className="text-xs text-destructive truncate">{r.error}</p>}
                    {r.success && r.bank_ref && <p className="text-xs text-muted-foreground">Ref: {r.bank_ref}</p>}
                  </div>
                  <span className="text-xs font-semibold shrink-0">KSh {r.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (isScanning) {
    return (
      <div className="min-h-[100dvh] bg-background surface-money pb-24">
        <ScreenShell className="pt-0">
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
                  <h1 className="text-xl font-bold text-foreground">
                    {isProcessing ? "Processing..." : "Scanning"}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {isProcessing ? "Analyzing document" : "Point at any payment document"}
                  </p>
                </div>
                {/* Batch mode toggle */}
                <Button
                  onClick={toggleBatchMode}
                  variant={batchMode ? "default" : "outline"}
                  size="sm"
                  className={cn(batchMode && "bg-brand hover:bg-brand/90")}
                >
                  📦 {batchMode ? "Batch ON" : "Batch OFF"}
                </Button>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card p-4 mb-4">
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
                      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-brand/90 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 animate-bounce">
                        Scanning...
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
              </div>

              {/* Scanner Status Info */}
              <div className="rounded-2xl border border-border/60 bg-card px-4 py-3 mb-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  <strong className="text-foreground">Auto Detection Active</strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  Simply point your camera at any payment document. The AI will automatically recognize:
                  Paybill numbers • Till numbers • QR codes • Receipts • Bank details • Pochi numbers
                </p>
                <p className="text-xs text-brand mt-2">
                  ✨ Works with handwritten text and simple formats too!
                </p>
              </div>

              {/* Controls */}
              {isStreaming && (
                <div className="flex gap-2 mt-4 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                    className={cn(isAudioEnabled && "bg-brand/10 border-brand/20")}
                    size="sm"
                  >
                    {isAudioEnabled ? "🔊 Audio ON" : "🔇 Audio OFF"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setAutoScanEnabled(!autoScanEnabled)}
                    className={cn(autoScanEnabled && "bg-brand/10 border-brand/20")}
                    size="sm"
                  >
                    {autoScanEnabled ? "Auto Scan ON" : "📷 Manual Mode"}
                  </Button>
                  {!autoScanEnabled && (
                    <Button onClick={handleCapture} disabled={!scanMode} size="sm">
                      📸 Capture
                    </Button>
                  )}
                </div>
              )}

              {/* Camera Error */}
              {cameraError && (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3 flex items-center gap-2 mb-4">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">
                    Camera Error: {cameraError}. Please check permissions and try again.
                  </p>
                </div>
              )}

              {/* Scan Error */}
              {scanError && (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3 flex items-center gap-2 mb-4">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">{scanError}</p>
                </div>
              )}
            </>
          )}
        </ScreenShell>
      </div>
    )
  }

  // In overlay mode, never show the landing page — show a loading placeholder until the camera starts
  if (variant === 'overlay' && !isScanning && !scanResult) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-background">
        <div className="text-center">
          <Camera className="h-12 w-12 mx-auto mb-3 animate-pulse text-brand" />
          <p className="text-sm text-muted-foreground">Opening camera…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-background surface-money">
      <ScreenShell className="pt-0">
        {/* Compact Header */}
        <div className="flex items-center mb-3 pt-2">
          <Button variant="ghost" size="sm" onClick={() => onClose ? onClose() : onNavigate("dashboard")} className="mr-2 p-1">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Payment Scanner</h1>
            <p className="text-xs text-muted-foreground">Scan bills, receipts & payment codes</p>
          </div>
        </div>

        {/* Compact Voice Activation */}
        <div className={cn(
          "rounded-2xl border bg-card px-4 py-3 mb-4",
          voiceActivated ? "border-brand/30 bg-brand/5" : "border-border/60"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <h3 className="font-semibold text-xs text-foreground">🎙️ Voice Control</h3>
                {voice.isListening && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20">
                    Listening
                  </span>
                )}
                {voiceActivated && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand text-white animate-pulse border border-brand">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Say: <strong className="text-foreground">"Hey Ongea"</strong> then <strong className="text-foreground">"Scan till"</strong> or <strong className="text-foreground">"Check balance"</strong>
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
              className={cn(
                "rounded-full p-2",
                voice.isListening ? "bg-red-500 animate-pulse" : "bg-brand"
              )}
            >
              <Mic className="h-3 w-3" />
            </Button>
          </div>
          {voiceActivated && voice.interimTranscript && (
            <div className="mt-2 p-1 rounded border border-blue-500/20 bg-blue-500/8">
              <p className="text-xs text-blue-500">Hearing: "{voice.interimTranscript}"</p>
            </div>
          )}
          {voiceActivated && voice.transcript && (
            <div className="mt-2 p-1 rounded border border-brand/20 bg-brand/5">
              <p className="text-xs text-brand">✓ Command: "{voice.transcript}"</p>
            </div>
          )}
          {elevenLabsConnected && (
            <div className="mt-2 p-1 rounded-lg border border-blue-500/20 bg-blue-500/8 flex items-center gap-1">
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
              <p className="text-xs text-blue-500">Voice Active</p>
            </div>
          )}
        </div>

        {/* Scan Result */}
        {renderScanResult()}

        {/* Compact Quick Start Auto-Scan */}
        {!scanResult && (
          <div className="mb-3">
            <div className="rounded-2xl border border-brand/25 bg-gradient-to-b from-brand/8 to-brand/3 px-5 py-5 text-center mb-4">
              <div className="w-10 h-10 bg-brand rounded-full flex items-center justify-center mx-auto mb-2">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-1.5">
                Auto Scan
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Point your camera at any bill, paybill, till, QR code, or receipt — we'll detect it instantly.
              </p>
              <Button
                onClick={() => handleScan()}
                size="sm"
                className="rounded-xl px-6 py-2 text-sm font-semibold"
              >
                Start Scanning
              </Button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-border/60" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Or scan by type</p>
              <div className="flex-1 h-px bg-border/60" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {scanModes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => {
                    if ((mode as any).disabled) return
                    handleScan(mode.id)
                  }}
                  className={cn(
                    "rounded-2xl border border-border/60 bg-card hover:border-border hover:shadow-sm transition-all active:scale-[0.98] p-3 text-center w-full",
                    (mode as any).disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className={`w-10 h-10 ${mode.color} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                    <mode.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-xs text-foreground mb-1">{mode.title}</h3>
                  <p className="text-xs text-muted-foreground mb-1">{mode.description}</p>
                  {(mode as any).disabled && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Coming soon</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent Scans */}
        <div className="mb-4 rounded-2xl border border-border/60 bg-card">
          <div className="px-4 py-3 border-b border-border/40">
            <h2 className="text-base font-semibold text-foreground">Recent Scans</h2>
          </div>
          <div>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 last:border-b-0">
              <Receipt className="h-5 w-5 text-brand shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm text-foreground">KPLC Bill - Paybill 888880</p>
                <p className="text-xs text-muted-foreground">Account: 123456789 • KSh 2,450</p>
              </div>
              <Button size="sm" variant="outline">
                Pay
              </Button>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 last:border-b-0">
              <CreditCard className="h-5 w-5 text-brand shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm text-foreground">Naivas Receipt - Till 832909</p>
                <p className="text-xs text-muted-foreground">Groceries • KSh 1,850</p>
              </div>
              <Button size="sm" variant="outline">
                View
              </Button>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mb-4 rounded-2xl border border-border/60 bg-card">
          <div className="px-4 py-3 border-b border-border/40">
            <h2 className="text-base font-semibold text-foreground">Scanning Tips</h2>
          </div>
          <div className="px-4 py-4 space-y-2 text-sm text-muted-foreground">
            <p>• Hold phone steady and ensure good lighting</p>
            <p>• For Paybill: Focus on the number and account section</p>
            <p>• For receipts: Capture the entire receipt clearly</p>
            <p>• Voice commands work even with camera open</p>
            <p>• Double-check all details before confirming payment</p>
          </div>
        </div>
      </ScreenShell>
    </div>
  )
}
