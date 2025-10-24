// @ts-nocheck
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Mic, MicOff, Volume2, ArrowLeft, AlertCircle, BarChart3, LogOut, Menu, Wallet, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import VoiceWaveform from "./voice-waveform"
import { useAuth } from "@/components/providers/auth-provider"
import { createClient } from '@/lib/supabase/client'
import BalanceSheet from "./balance-sheet"
import { useUser } from '@/contexts/UserContext';
import { useElevenLabs } from '@/contexts/ElevenLabsContext';

type Screen = "dashboard" | "voice" | "send" | "camera" | "recurring" | "analytics" | "test" | "permissions" | "scanner";

interface VoiceInterfaceProps {
  onNavigate: (screen: Screen) => void;
}

export default function VoiceInterface({ onNavigate }: VoiceInterfaceProps) {
  const { user, signOut } = useAuth();
  const { userId, user: userContext, isLoading: userContextLoading } = useUser();
  const { isConnected, isLoading, messages, conversation, isSpeaking, startSession } = useElevenLabs();
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'speaking'>('idle')
  const [transcript, setTranscript] = useState('')
  const [agentResponse, setAgentResponse] = useState('')
  const [balance, setBalance] = useState<number>(0)
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPushToTalk, setIsPushToTalk] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBalanceSheetOpen, setIsBalanceSheetOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  // Fetch balance from API
  const fetchBalance = useCallback(async () => {
    setLoadingBalance(false); // Remove loading immediately
    try {
      const response = await fetch('/api/balance');
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance || 0);
        console.log('⚡ Balance loaded:', data.balance);
      } else {
        console.error('Failed to fetch balance:', response.statusText);
        setBalance(0);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance(0);
    }
  }, []);

  // Use messages from global context for transcript/response
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.source === 'user') {
        setTranscript(lastMessage.text);
        setIsProcessing(true);
      } else if (lastMessage.source === 'ai') {
        setAgentResponse(lastMessage.text);
        setIsProcessing(false);
      }
    }
  }, [messages]);

  // Inactivity timer function
  const resetInactivityTimer = useCallback(() => {
    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    // Set new timer for 5 seconds of inactivity
    inactivityTimerRef.current = setTimeout(async () => {
      console.log('5 seconds of inactivity - closing session and going back');
      try {
        await conversation.endSession();
      } catch (error) {
        console.error('Error ending session:', error);
      }
      onNavigate("dashboard");
    }, 5000);
  }, [conversation, onNavigate]);

  const stopConversation = useCallback(async () => {
    try {
      await conversation.endSession();
      setTranscript("");
      setAgentResponse("");
      setRecordingTime(0);
      setIsProcessing(false);
      setIsPushToTalk(false);
    } catch (error) {
      console.error('Error stopping conversation:', error);
    }
  }, [conversation]);

  // Start session on first interaction (when user presses push-to-talk)
  const handleFirstInteraction = useCallback(() => {
    if (!isConnected && !isLoading && userId) {
      console.log('🎤 Starting voice session on user interaction');
      startSession();
    }
  }, [isConnected, isLoading, userId, startSession]);

  // Fetch balance on mount and set up real-time subscription
  useEffect(() => {
    // Initial fetch
    fetchBalance();

    if (!user?.id) return;

    // Set up real-time subscription to profiles table
    const channel = supabase
      .channel('profile-balance-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Balance updated in real-time:', payload);
          if (payload.new && 'wallet_balance' in payload.new) {
            setBalance(payload.new.wallet_balance || 0);
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchBalance, supabase]);

  // Start inactivity timer when connected
  useEffect(() => {
    if (isConnected) {
      resetInactivityTimer();
    }
    
    // Cleanup timer on unmount
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [isConnected, resetInactivityTimer]);

  // Push-to-talk functionality
  const handleMouseDown = useCallback(() => {
    if (!isConnected) return;
    setIsPushToTalk(true);
    // Reset inactivity timer when user starts talking
    resetInactivityTimer();
    console.log('Started push-to-talk');
  }, [isConnected, resetInactivityTimer]);

  const handleMouseUp = useCallback(() => {
    if (!isPushToTalk) return;
    setIsPushToTalk(false);
    // Reset inactivity timer when user stops talking
    resetInactivityTimer();
    console.log('Stopped push-to-talk');
  }, [isPushToTalk, resetInactivityTimer]);

  // Handle keyboard events for push-to-talk
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isPushToTalk && isConnected) {
        e.preventDefault();
        handleMouseDown();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isPushToTalk) {
        e.preventDefault();
        handleMouseUp();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPushToTalk, isConnected, handleMouseDown, handleMouseUp]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isConnected]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Show loading state while userId is being fetched
  if (userContextLoading || !userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg font-medium">Authenticating user...</p>
          <p className="text-gray-500 text-sm mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 relative overflow-hidden">
      {/* Soft Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Clean Header with Navigation */}
      <div className="flex items-center justify-between pt-6 pb-6 px-6 relative z-10">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Ongea Pesa
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Balance Display - Clickable */}
          <Button
            onClick={() => setIsBalanceSheetOpen(true)}
            variant="ghost"
            className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-sm hover:shadow-md"
          >
            <Wallet className="h-4 w-4 text-green-600 mr-2" />
            <div className="text-left">
              <p className="text-xs text-gray-600">Balance</p>
              <p className="text-sm font-bold text-gray-900">
                {loadingBalance ? '...' : `KSh ${balance.toLocaleString()}`}
              </p>
            </div>
          </Button>

          {/* Status Indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/60 backdrop-blur-sm rounded-full">
            <div className={`w-2 h-2 rounded-full transition-colors ${
              isConnected ? 'bg-green-500 animate-pulse' : 
              isLoading ? 'bg-yellow-500 animate-pulse' : 
              error ? 'bg-red-500' : 'bg-gray-400'
            }`}></div>
            <p className="text-xs font-medium text-gray-700">
              {isConnected ? 'Connected' : 
               isLoading ? 'Connecting' : 
               error ? 'Error' : 'Starting'}
            </p>
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-semibold text-sm">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="hidden md:inline text-sm font-medium text-gray-700">
                  {user?.email?.split('@')[0] || 'User'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.email}</p>
                <p className="text-xs text-muted-foreground">Voice-activated payments</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onNavigate("dashboard")}>
                <BarChart3 className="mr-2 h-4 w-4" />
                <span>Dashboard & Reports</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-red-600 focus:text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="px-6 relative z-10 flex flex-col items-center">
        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50 animate-in slide-in-from-top-2 max-w-md w-full">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* 3D Orb Container */}
        <div className="relative mb-8">
          {/* 3D Glassmorphic Orb */}
          <div className={`relative w-48 h-48 rounded-full transition-all duration-700 ${
            isPushToTalk 
              ? 'bg-gradient-to-br from-red-200 via-pink-100 to-red-200 shadow-2xl shadow-red-200/50' 
              : isProcessing
              ? 'bg-gradient-to-br from-blue-200 via-purple-100 to-blue-200 shadow-2xl shadow-blue-200/50 animate-pulse'
              : isConnected
              ? 'bg-gradient-to-br from-green-200 via-emerald-100 to-green-200 shadow-2xl shadow-green-200/50'
              : 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 shadow-xl shadow-gray-200/30'
          }`}>
            {/* Inner glow effect */}
            <div className={`absolute inset-4 rounded-full transition-all duration-500 ${
              isPushToTalk
                ? 'bg-gradient-to-br from-red-300/50 to-pink-300/50 animate-pulse'
                : isProcessing
                ? 'bg-gradient-to-br from-blue-300/50 to-purple-300/50 animate-pulse'
                : isConnected
                ? 'bg-gradient-to-br from-green-300/50 to-emerald-300/50'
                : 'bg-gradient-to-br from-gray-300/30 to-gray-300/30'
            }`}></div>
            
            {/* Animated rings for active states */}
            {isPushToTalk && (
              <>
                <div className="absolute -inset-4 rounded-full border-2 border-red-300 opacity-60 animate-ping"></div>
                <div className="absolute -inset-8 rounded-full border border-red-200 opacity-40 animate-ping animation-delay-200"></div>
              </>
            )}
            
            {isProcessing && !isPushToTalk && (
              <>
                <div className="absolute -inset-4 rounded-full border-2 border-blue-300 opacity-60 animate-pulse"></div>
                <div className="absolute -inset-8 rounded-full border border-blue-200 opacity-40 animate-pulse animation-delay-400"></div>
              </>
            )}

            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              {isLoading ? (
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
              ) : isPushToTalk ? (
                <Mic className="h-16 w-16 text-red-600 animate-pulse" />
              ) : isProcessing ? (
                <Volume2 className="h-16 w-16 text-blue-600 animate-pulse" />
              ) : isConnected ? (
                <Mic className="h-16 w-16 text-green-600" />
              ) : (
                <MicOff className="h-16 w-16 text-gray-500" />
              )}
            </div>
          </div>
        </div>

        {/* Status Text */}
        <div className="text-center mb-8 max-w-md">
          {transcript ? (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-medium text-gray-800 leading-relaxed">
                "{transcript}"
              </h2>
              {isProcessing && (
                <div className="text-blue-600 text-sm flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce animation-delay-200"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce animation-delay-400"></div>
                  <span className="ml-2">AI is thinking...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-gray-800">
                {isLoading ? (
                  "Connecting to AI..."
                ) : isConnected ? (
                  isPushToTalk ? (
                    "Listening..."
                  ) : (
                    "Greetings, human!"
                  )
                ) : (
                  "Starting AI..."
                )}
              </h2>
              <p className="text-gray-600">
                {isConnected && !isPushToTalk ? (
                  "How may I assist you today?"
                ) : isPushToTalk ? (
                  "Speak now..."
                ) : isLoading ? (
                  "Please wait..."
                ) : (
                  "Initializing..."
                )}
              </p>
            </div>
          )}
        </div>

        {/* Push-to-Talk Button */}
        <div className="relative mb-12">
          <Button
            ref={buttonRef}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchEnd={handleMouseUp}
            disabled={!isConnected}
            className={`w-20 h-20 rounded-full transition-all duration-300 shadow-lg ${
              isPushToTalk
                ? "bg-red-500 hover:bg-red-600 scale-110 shadow-red-200"
                : isConnected
                ? "bg-green-500 hover:bg-green-600 shadow-green-200"
                : "bg-gray-400 cursor-not-allowed shadow-gray-200"
            }`}
          >
            {isPushToTalk ? (
              <div className="relative">
                <Mic className="h-8 w-8 text-white" />
                <div className="absolute inset-0 animate-ping opacity-50">
                  <Mic className="h-8 w-8 text-white" />
                </div>
              </div>
            ) : (
              <Mic className="h-8 w-8 text-white" />
            )}
          </Button>
          
          {/* Instructions */}
          <p className="text-center text-gray-600 mt-4 text-sm">
            {isConnected ? "Hold to speak" : "Connecting..."}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 max-w-md w-full mb-8">
          <Button
            variant="outline"
            onClick={() => onNavigate('dashboard')}
            className="h-12 rounded-xl border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (conversation.endSession) {
                conversation.endSession();
              }
              setIsListening(false);
              setIsPushToTalk(false);
              setTranscript('');
              setAgentResponse('');
              onNavigate('dashboard');
            }}
            className="h-12 rounded-xl border-red-300 text-red-700 hover:bg-red-50"
            disabled={!isConnected}
          >
            <MicOff className="h-4 w-4 mr-2" />
            End Call
          </Button>
        </div>

        {/* Conversation History */}
        {transcript && (
          <Card className="mb-4 bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm animate-in slide-in-from-left-4 duration-500 max-w-md w-full">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Mic className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-600 mb-1">You</p>
                  <p className="text-gray-800 text-sm leading-relaxed">{transcript}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {agentResponse && (
          <Card className="mb-6 bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm animate-in slide-in-from-right-4 duration-500 max-w-md w-full">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Volume2 className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-600 mb-1 flex items-center gap-2">
                    AI assistant
                    {isProcessing && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        Thinking...
                      </span>
                    )}
                  </p>
                  <p className="text-gray-800 text-sm leading-relaxed">{agentResponse}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Floating Add Balance Button */}
      <Button
        onClick={() => setIsBalanceSheetOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-2xl hover:shadow-green-500/50 transition-all duration-300 hover:scale-110 z-40"
        size="icon"
      >
        <Plus className="h-6 w-6 text-white" />
      </Button>

      {/* Balance Sheet */}
      <BalanceSheet
        isOpen={isBalanceSheetOpen}
        onClose={() => setIsBalanceSheetOpen(false)}
        currentBalance={balance}
        onBalanceUpdate={(newBalance) => setBalance(newBalance)}
      />
    </div>
  );
}
