"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useConversation } from '@elevenlabs/react';
import { useUser } from './UserContext';

interface Message {
  id: string;
  text: string;
  source: 'user' | 'ai';
  timestamp: Date;
}

interface ElevenLabsContextType {
  isConnected: boolean;
  isLoading: boolean;
  messages: Message[];
  sendMessage: (text: string) => void;
  clearMessages: () => void;
  isSpeaking: boolean;
  conversation: any;
}

const ElevenLabsContext = createContext<ElevenLabsContextType | undefined>(undefined);

export function ElevenLabsProvider({ children }: { children: ReactNode }) {
  const { userId } = useUser();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  // ElevenLabs conversation hook
  const conversation = useConversation({
    onConnect: () => {
      console.log('🎙️ Global ElevenLabs connected');
      setIsConnected(true);
      setIsLoading(false);
    },
    onDisconnect: () => {
      console.log('🎙️ Global ElevenLabs disconnected');
      setIsConnected(false);
    },
    onMessage: (message: any) => {
      console.log('📨 ElevenLabs message:', message);
      
      // Handle AI responses
      if (message.source === 'ai' || message.type === 'agent_response') {
        const text = message.message || message.text || message.agent_response || message.response;
        if (text) {
          addMessage(text, 'ai');
        }
      }
      
      // Handle user transcripts
      if (message.source === 'user' || message.type === 'user_transcript') {
        const text = message.message || message.text || message.user_transcript;
        if (text) {
          addMessage(text, 'user');
        }
      }
    },
    onError: (error: any) => {
      console.error('🔴 Global ElevenLabs error:', error);
      setIsLoading(false);
    }
  });

  // Add message to chat
  const addMessage = (text: string, source: 'user' | 'ai') => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      source,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  // Send text message to AI
  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    
    // Add user message immediately
    addMessage(text, 'user');
    
    // Note: ElevenLabs conversation API doesn't have direct text send
    // We'll use the conversation's internal methods if available
    console.log('💬 Sending message to ElevenLabs:', text);
    
    // The conversation API is voice-based, so we log this
    // In production, you might want to convert text to speech or use a different API
  };

  // Clear all messages
  const clearMessages = () => {
    setMessages([]);
  };

  // Get signed URL for ElevenLabs
  const getSignedUrl = async (): Promise<string> => {
    try {
      const response = await fetch('/api/get-signed-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to get signed URL');
      }
      
      const { signedUrl, userId: returnedUserId } = await response.json();
      console.log('✅ Got signed URL for userId:', returnedUserId);
      return signedUrl;
    } catch (error) {
      console.error('❌ Error getting signed URL:', error);
      throw error;
    }
  };

  // Auto-start ElevenLabs session when userId is available
  useEffect(() => {
    let mounted = true;
    let sessionStarted = false;

    const startSession = async () => {
      if (!mounted || !userId || isConnected || isLoading || sessionStarted) return;

      // Check if already connected to prevent duplicate sessions
      if (conversation.status === 'connected') {
        console.log('⚠️ Session already active, skipping duplicate start');
        setIsConnected(true);
        return;
      }

      try {
        sessionStarted = true;
        setIsLoading(true);
        console.log('🚀 Starting global ElevenLabs session for userId:', userId);
        
        const signedUrl = await getSignedUrl();
        
        // Append userId to URL
        const urlWithUserId = `${signedUrl}&user_id=${encodeURIComponent(userId)}`;
        
        await conversation.startSession({ 
          signedUrl: urlWithUserId
        });
      } catch (error) {
        console.error('Failed to start ElevenLabs session:', error);
        setIsLoading(false);
        sessionStarted = false;
      }
    };

    // Delay start by 2 seconds to ensure everything is ready
    const timer = setTimeout(startSession, 2000);

    return () => {
      mounted = false;
      clearTimeout(timer);
      // Don't end session on unmount - keep it global
    };
  }, [userId]);

  const value = {
    isConnected,
    isLoading,
    messages,
    sendMessage,
    clearMessages,
    isSpeaking: conversation.isSpeaking || false,
    conversation
  };

  return (
    <ElevenLabsContext.Provider value={value}>
      {children}
    </ElevenLabsContext.Provider>
  );
}

export function useElevenLabs() {
  const context = useContext(ElevenLabsContext);
  if (!context) {
    throw new Error('useElevenLabs must be used within ElevenLabsProvider');
  }
  return context;
}
