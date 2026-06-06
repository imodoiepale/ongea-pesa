"use client"

import { useState, useRef, useEffect } from 'react';
import { Mic, MessageCircle, X, Send, Minimize2, Maximize2, PhoneOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useElevenLabs } from '@/contexts/ElevenLabsContext';
import { cn } from '@/lib/utils';

export default function GlobalVoiceWidget() {
  const { isConnected, isLoading, messages, sendMessage, clearMessages, isSpeaking, conversation, startSession, endSession } = useElevenLabs();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [textInput, setTextInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isConnected && !isLoading) {
      console.log('🎙️ Starting ElevenLabs session from global widget');
      startSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSendText = () => {
    if (textInput.trim()) {
      sendMessage(textInput);
      setTextInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleEndCall = async () => {
    try {
      await endSession();
      console.log('✅ Voice session ended from widget');
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  // Floating FAB (closed state)
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 active:scale-[0.97]",
            isConnected
              ? "bg-[rgba(0,255,136,0.15)] border border-[rgba(0,255,136,0.35)] text-[hsl(var(--voice-accent))] shadow-[0_0_20px_rgba(0,255,136,0.2)]"
              : "bg-brand border border-brand/20 text-white",
            isSpeaking && "animate-pulse"
          )}
          aria-label="Open voice assistant"
        >
          <Mic className="h-5 w-5" />
        </button>
        {isConnected && (
          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[hsl(var(--voice-accent))] rounded-full border-2 border-background" />
        )}
      </div>
    );
  }

  // Minimized view
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-4 z-50">
        <div className="w-72 rounded-2xl border border-white/10 bg-zinc-950/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-[hsl(var(--voice-accent))]" />
              <span className="text-sm font-semibold text-white">ElevenLabs AI</span>
              {isConnected && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[rgba(0,255,136,0.15)] text-[hsl(var(--voice-accent))] border border-[rgba(0,255,136,0.25)]">Live</span>
              )}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setIsMinimized(false)}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Maximize2 className="h-3 w-3" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full widget
  return (
    <div className="fixed bottom-6 right-4 z-50">
      <div className="w-88 h-[560px] rounded-2xl border border-white/10 bg-zinc-950/95 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden" style={{width:'22rem'}}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center",
              "bg-[rgba(0,255,136,0.12)] border border-[rgba(0,255,136,0.25)]"
            )}>
              <Mic className={cn("h-4 w-4 text-[hsl(var(--voice-accent))]", isSpeaking && "animate-pulse")} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">ElevenLabs AI</p>
              <p className="text-[10px] text-white/50">
                {isLoading ? 'Connecting…' : isConnected ? 'Live & Ready' : 'Disconnected'}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setIsMinimized(true)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full px-4 py-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <MessageCircle className="h-10 w-10 text-white/20 mb-3" />
                <p className="text-sm text-white/50 mb-1">Start a conversation</p>
                <p className="text-xs text-white/30">Speak or type a message</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={cn("flex", msg.source === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      "max-w-[78%] rounded-2xl px-3 py-2",
                      msg.source === 'user'
                        ? "bg-brand text-white"
                        : "bg-white/8 border border-white/10 text-white/85"
                    )}>
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      <p className="text-[10px] opacity-50 mt-0.5">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Input */}
        <div className="px-3 py-3 border-t border-white/10">
          <div className="flex gap-2">
            <input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type a message…"
              disabled={!isConnected}
              className="flex-1 px-3 py-2 rounded-xl bg-white/8 border border-white/12 text-white text-sm placeholder:text-white/30 outline-none focus:border-[rgba(0,255,136,0.3)] disabled:opacity-40 transition-colors"
            />
            <button
              onClick={handleSendText}
              disabled={!isConnected || !textInput.trim()}
              className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center text-white disabled:opacity-40 active:scale-[0.97] transition-all duration-150"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] text-white/30">
            <span>Enter to send</span>
            <div className="flex gap-3">
              {messages.length > 0 && (
                <button onClick={clearMessages} className="text-red-400/70 hover:text-red-400 transition-colors">Clear chat</button>
              )}
              {isConnected && (
                <button onClick={handleEndCall} className="text-red-400/70 hover:text-red-400 transition-colors flex items-center gap-1">
                  <PhoneOff className="h-3 w-3" />End Call
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
