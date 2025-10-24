"use client"

import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, MessageCircle, X, Send, Minimize2, Maximize2, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useElevenLabs } from '@/contexts/ElevenLabsContext';

export default function GlobalVoiceWidget() {
  const { isConnected, isLoading, messages, sendMessage, clearMessages, isSpeaking, conversation, startSession } = useElevenLabs();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [textInput, setTextInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Start session when widget opens
  useEffect(() => {
    if (isOpen && !isConnected && !isLoading) {
      console.log('🎙️ Starting ElevenLabs session from global widget');
      startSession();
    }
  }, [isOpen, isConnected, isLoading, startSession]);

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
      if (conversation?.endSession) {
        await conversation.endSession();
        clearMessages();
        console.log('Voice session ended');
      }
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  // Floating button (when closed)
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className={`rounded-full h-16 w-16 shadow-lg ${
            isConnected ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-600'
          } ${isSpeaking ? 'animate-pulse' : ''}`}
        >
          <Mic className="h-6 w-6" />
        </Button>
        {isConnected && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse border-2 border-white"></div>
        )}
      </div>
    );
  }

  // Minimized view
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Card className="w-80 shadow-2xl">
          <CardHeader className="p-3 flex flex-row items-center justify-between bg-gradient-to-r from-purple-500 to-pink-500">
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-white" />
              <span className="text-sm font-semibold text-white">ElevenLabs AI</span>
              {isConnected && (
                <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                  Connected
                </Badge>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(false)}
                className="h-6 w-6 p-0 text-white hover:bg-white/20"
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0 text-white hover:bg-white/20"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Full widget view
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className="w-96 h-[600px] shadow-2xl flex flex-col">
        {/* Header */}
        <CardHeader className="p-4 flex flex-row items-center justify-between bg-gradient-to-r from-purple-500 to-pink-500 rounded-t-lg">
          <div className="flex items-center gap-2">
            <Mic className={`h-5 w-5 text-white ${isSpeaking ? 'animate-pulse' : ''}`} />
            <div>
              <h3 className="text-sm font-bold text-white">ElevenLabs AI</h3>
              <p className="text-xs text-white/80">
                {isLoading ? 'Connecting...' : isConnected ? 'Live & Ready' : 'Disconnected'}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
              className="h-8 w-8 p-0 text-white hover:bg-white/20"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 p-0 text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        {/* Messages */}
        <CardContent className="flex-1 p-4 overflow-hidden">
          <ScrollArea className="h-full pr-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageCircle className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500 mb-2">Start a conversation</p>
                <p className="text-xs text-gray-400">Speak or type a message</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.source === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.source === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
        </CardContent>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <Input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1"
              disabled={!isConnected}
            />
            <Button
              onClick={handleSendText}
              disabled={!isConnected || !textInput.trim()}
              size="icon"
              className="bg-blue-500 hover:bg-blue-600"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-gray-500">Press Enter to send</span>
            <div className="flex gap-2">
              {messages.length > 0 && (
                <button
                  onClick={clearMessages}
                  className="text-red-500 hover:text-red-700"
                >
                  Clear chat
                </button>
              )}
              {isConnected && (
                <button
                  onClick={handleEndCall}
                  className="text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                >
                  <PhoneOff className="h-3 w-3" />
                  End Call
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
