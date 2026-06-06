// @ts-nocheck
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Mic, MicOff, Volume2, ArrowLeft, AlertCircle, BarChart3, LogOut, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import VoiceWaveform from "./voice-waveform"
import { useAuth } from "@/components/providers/auth-provider"
import { createClient } from '@/lib/supabase/client'
import BalanceSheet from "./balance-sheet"
import { useUser } from '@/contexts/UserContext';
import { useElevenLabs } from '@/contexts/ElevenLabsContext';
import { GlassCard, ScreenShell } from "@/components/foundation"

type Screen = "dashboard" | "voice" | "send" | "camera" | "recurring" | "analytics" | "test" | "permissions" | "scanner";

interface VoiceInterfaceProps {
  onNavigate: (screen: Screen) => void;
}

export default function VoiceInterface({ onNavigate }: VoiceInterfaceProps) {
  const { user, signOut } = useAuth();
  const { userId, user: userContext, isLoading: userContextLoading } = useUser();
  const { isConnected, isLoading, messages, conversation, isSpeaking, startSession, endSession } = useElevenLabs();
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

  // Inactivity timer function - DISABLED to prevent premature disconnects
  // The global voice widget should handle session management instead
  const resetInactivityTimer = useCallback(() => {
    // Timer disabled - sessions should persist until user explicitly ends them
    // This prevents the voice interface from interfering with the global widget
    return;

    // // Clear existing timer
    // if (inactivityTimerRef.current) {
    //   clearTimeout(inactivityTimerRef.current);
    // }
    //
    // // Set new timer for 60 seconds of inactivity (increased from 5s)
    // inactivityTimerRef.current = setTimeout(async () => {
    //   console.log('60 seconds of inactivity - closing session');
    //   try {
    //     await endSession();
    //   } catch (error) {
    //     console.error('Error ending session:', error);
    //   }
    //   onNavigate("dashboard");
    // }, 60000);
  }, []);

  const stopConversation = useCallback(async () => {
    try {
      await endSession();
      setTranscript("");
      setAgentResponse("");
      setRecordingTime(0);
      setIsProcessing(false);
      setIsPushToTalk(false);
    } catch (error) {
      console.error('Error stopping conversation:', error);
    }
  }, [endSession]);

  // Start session on first interaction (when user presses push-to-talk)
  const handleFirstInteraction = useCallback(() => {
    if (!isConnected && !isLoading && userId) {
      console.log('🎤 Starting voice session on user interaction');
      startSession();
    }
  }, [isConnected, isLoading, userId, startSession]);

  // Auto-start ElevenLabs session when voice interface opens
  const hasAutoStarted = useRef(false);
  useEffect(() => {
    if (userId && !isConnected && !isLoading && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      console.log('🚀 Auto-starting ElevenLabs session on voice interface open');
      startSession();
    }
  }, [userId, isConnected, isLoading, startSession]); // Include all deps but use ref to prevent re-runs

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

  // Button click to start session (no longer push-to-talk, just click to connect)
  const handleMicClick = useCallback(async () => {
    // Start session if not connected
    if (!isConnected && !isLoading) {
      console.log('🎤 Starting session on mic click...');
      hasAutoStarted.current = true; // Prevent auto-start from also triggering
      await startSession();
      return;
    }
    // If already connected, just log - ElevenLabs is always listening
    console.log('Already connected - just speak');
  }, [isConnected, isLoading, startSession]);

  // Keep these for backwards compatibility but they're not really needed anymore
  const handleMouseDown = handleMicClick;
  const handleMouseUp = useCallback(() => {
    // No-op - ElevenLabs is always listening when connected
  }, []);

  // Handle keyboard events - Space to connect if not connected
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isConnected && !isLoading) {
        e.preventDefault();
        handleMicClick();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // No-op - ElevenLabs is always listening
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isConnected, isLoading, handleMicClick]);

  // Initialize the ElevenLabs agent
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
      <div className="min-h-[100dvh] surface-voice flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full border-2 border-[hsl(var(--voice-accent))] border-t-transparent animate-spin mx-auto" />
          <p className="text-white/80 text-base font-medium">Connecting voice session&hellip;</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] surface-voice flex flex-col relative overflow-hidden">
      {/* Dark voice orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-[hsl(var(--voice-accent))] opacity-[0.04] blur-3xl animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-[hsl(var(--voice-accent-2))] opacity-[0.04] blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[hsl(var(--brand))] opacity-[0.03] blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between pt-6 pb-4 px-5 relative z-10">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('dashboard')}
            className="w-8 h-8 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/12 transition-all duration-200 active:scale-[0.97]"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-white/90 font-semibold text-base">Voice Assistant</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Balance pill */}
          <button
            onClick={() => setIsBalanceSheetOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/8 border border-white/10 hover:bg-white/12 transition-all duration-200 active:scale-[0.97]"
          >
            <Wallet className="h-3.5 w-3.5 text-[hsl(var(--voice-accent))]" />
            <span className="text-xs font-semibold text-white">
              {loadingBalance ? '…' : `KSh ${balance.toLocaleString('en-KE', {maximumFractionDigits:0})}`}
            </span>
          </button>

          {/* Status dot */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/6 border border-white/8">
            <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
              isConnected ? 'bg-[hsl(var(--voice-accent))]' :
              isLoading ? 'bg-amber-400 animate-pulse' :
              error ? 'bg-red-400' : 'bg-white/30'
            }`} />
            <span className="text-[11px] font-medium text-white/60">
              {isConnected ? 'Live' : isLoading ? 'Connecting' : error ? 'Error' : 'Ready'}
            </span>
          </div>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white font-semibold text-sm hover:bg-brand/90 transition-all active:scale-[0.97]">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.email}</p>
                <p className="text-xs text-muted-foreground">Voice-activated payments</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onNavigate("dashboard")}>
                <BarChart3 className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
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

      {/* Error alert */}
      {error && (
        <div className="px-5 relative z-10 mb-4">
          <Alert className="border-red-500/30 bg-red-500/10 text-red-300">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 relative z-10 gap-8">
        {/* GlassCard Double-Bezel orb */}
        <GlassCard
          size="lg"
          glow={isConnected || isPushToTalk}
          className={`transition-all duration-700 ${isConnected || isPushToTalk ? 'glow-green' : ''}`}
        >
          <div className="w-44 h-44 flex flex-col items-center justify-center gap-3 rounded-[calc(2rem-0.375rem)]">
            {/* Voice waveform */}
            <div className="h-12 flex items-center">
              {isConnected ? (
                <VoiceWaveform isListening={isConnected} />
              ) : isLoading ? (
                <div className="w-8 h-8 rounded-full border-2 border-[hsl(var(--voice-accent))] border-t-transparent animate-spin" />
              ) : (
                <Mic className="h-10 w-10 text-white/40" />
              )}
            </div>

            {/* Status label */}
            <span className={`text-xs font-semibold tracking-wide uppercase ${
              isConnected ? 'text-[hsl(var(--voice-accent))]' :
              isLoading ? 'text-amber-400' :
              'text-white/40'
            }`}>
              {isConnected ? (isSpeaking ? 'Speaking' : 'Listening') : isLoading ? 'Connecting' : 'Ready'}
            </span>

            {/* Timer */}
            {isConnected && (
              <span className="text-[10px] text-white/30 font-mono">
                {formatTime(recordingTime)}
              </span>
            )}
          </div>
        </GlassCard>

        {/* Transcript + response */}
        <div className="w-full max-w-sm space-y-3">
          {transcript ? (
            <>
              {/* User speech bubble */}
              <div className="glass-card rounded-2xl px-4 py-3 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white/10 border border-white/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Mic className="h-3 w-3 text-white/60" />
                </div>
                <p className="text-sm text-white/80 leading-relaxed">"{transcript}"</p>
              </div>

              {/* Processing dots */}
              {isProcessing && (
                <div className="flex items-center gap-1.5 px-4">
                  <div className="w-1.5 h-1.5 bg-[hsl(var(--voice-accent))] rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-[hsl(var(--voice-accent))] rounded-full animate-bounce animation-delay-200" />
                  <div className="w-1.5 h-1.5 bg-[hsl(var(--voice-accent))] rounded-full animate-bounce animation-delay-400" />
                  <span className="text-xs text-white/40 ml-1">Processing…</span>
                </div>
              )}
            </>
          ) : (
            <div className="text-center space-y-1.5">
              <p className="text-lg font-semibold text-white/90">
                {isLoading ? 'Connecting…' : isConnected ? 'Listening' : 'Ready to Talk'}
              </p>
              <p className="text-sm text-white/40">
                {isConnected ? "Just speak — I'm always listening" : isLoading ? 'Please wait…' : 'Press the button to connect'}
              </p>
            </div>
          )}

          {/* Agent response bubble */}
          {agentResponse && (
            <div className="glass-card rounded-2xl px-4 py-3 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[rgba(0,255,136,0.15)] border border-[rgba(0,255,136,0.25)] flex items-center justify-center shrink-0 mt-0.5">
                <Volume2 className="h-3 w-3 text-[hsl(var(--voice-accent))]" />
              </div>
              <p className="text-sm text-white/80 leading-relaxed">{agentResponse}</p>
            </div>
          )}
        </div>

        {/* Primary mic action button (Double-Bezel) + End call */}
        <div className="flex flex-col items-center gap-4 pb-4">
          {/* Outer shell */}
          <div className={`p-2 rounded-full border transition-all duration-500 ${
            isConnected || isPushToTalk
              ? 'bg-[rgba(0,255,136,0.08)] border-[rgba(0,255,136,0.3)]'
              : 'bg-white/5 border-white/10'
          }`}>
            {/* Inner button */}
            <button
              ref={buttonRef}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchEnd={handleMouseUp}
              disabled={isLoading}
              aria-label={isConnected ? 'Voice connected — just speak' : 'Connect voice session'}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--voice-accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(222,47%,6%)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)] ${
                isPushToTalk
                  ? 'bg-red-500'
                  : isConnected
                  ? 'bg-[hsl(var(--voice-accent))]'
                  : isLoading
                  ? 'bg-white/10 cursor-not-allowed'
                  : 'bg-brand'
              }`}
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : isPushToTalk ? (
                <MicOff className="h-8 w-8 text-white" />
              ) : (
                <Mic className={`h-8 w-8 ${isConnected ? 'text-black' : 'text-white'}`} />
              )}
            </button>
          </div>

          {/* End call button — only when connected */}
          {isConnected && (
            <button
              onClick={async () => {
                await endSession()
                setIsPushToTalk(false)
                setTranscript('')
                setAgentResponse('')
                onNavigate('dashboard')
              }}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-red-400 transition-colors duration-200"
            >
              <MicOff className="h-3.5 w-3.5" />
              End session
            </button>
          )}
        </div>
      </div>

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
