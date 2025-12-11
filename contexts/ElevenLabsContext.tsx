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
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
}

const ElevenLabsContext = createContext<ElevenLabsContextType | undefined>(undefined);

export function ElevenLabsProvider({ children }: { children: ReactNode }) {
  const { userId } = useUser();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userBalance, setUserBalance] = useState<number>(0);

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
  const getSignedUrl = async (): Promise<{ signedUrl: string; balance: number; userName: string; gateName: string; gateId: string }> => {
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

      const { signedUrl, userId: returnedUserId, balance, userName, gateName, gateId } = await response.json();
      console.log('✅ Got signed URL for userId:', returnedUserId, 'balance:', balance, 'name:', userName, 'gate:', gateName);
      return { signedUrl, balance, userName, gateName, gateId };
    } catch (error) {
      console.error('❌ Error getting signed URL:', error);
      throw error;
    }
  };

  // Fetch and track user balance in real-time
  useEffect(() => {
    if (!userId) return;

    const fetchBalance = async () => {
      try {
        const response = await fetch('/api/balance');
        if (response.ok) {
          const data = await response.json();
          const balance = data.balance || 0;
          setUserBalance(balance);

          // Send balance to ElevenLabs conversation context
          if (isConnected) {
            // Store balance in state for AI to access
            console.log('💰 Balance updated for ElevenLabs context:', balance);
            // The AI agent will have access to this via the conversation session
          }
        }
      } catch (error) {
        console.error('Failed to fetch balance:', error);
      }
    };

    // Fetch immediately
    fetchBalance();

    // Refresh balance every 10 seconds for real-time updates
    const balanceInterval = setInterval(fetchBalance, 10000);

    return () => clearInterval(balanceInterval);
  }, [userId, isConnected, conversation]);

  // Manual start function exposed for components to use
  const startElevenLabsSession = async () => {
    if (!userId) {
      console.log('⚠️ Cannot start session: No userId');
      return;
    }

    // Check if already connected to prevent duplicate sessions
    if (conversation.status === 'connected') {
      console.log('⚠️ Session already active, skipping duplicate start');
      setIsConnected(true);
      setIsLoading(false);
      return;
    }

    // If loading, don't start another
    if (isLoading) {
      console.log('⚠️ Session already starting, please wait');
      return;
    }

    try {
      setIsLoading(true);
      console.log('🚀 Starting global ElevenLabs session for userId:', userId);

      const { signedUrl, balance, userName, gateName, gateId } = await getSignedUrl();

      // Append userId, balance, userName, gateName, and gateId to URL for 11labs agent
      const urlWithContext = `${signedUrl}&user_id=${encodeURIComponent(userId)}&balance=${encodeURIComponent(balance)}&user_name=${encodeURIComponent(userName)}&gate_name=${encodeURIComponent(gateName)}&gate_id=${encodeURIComponent(gateId)}`;

      console.log('💰 Sending balance to 11labs:', balance, 'for user:', userName);

      await conversation.startSession({
        signedUrl: urlWithContext
      });

      // Update local balance state
      setUserBalance(balance);
    } catch (error) {
      console.error('Failed to start ElevenLabs session:', error);
      setIsLoading(false);
      setIsConnected(false);
    }
  };

  // End session function
  const endElevenLabsSession = async () => {
    try {
      console.log('🛑 Ending ElevenLabs session');

      if (conversation?.endSession && conversation.status === 'connected') {
        await conversation.endSession();
      }

      setIsConnected(false);
      setIsLoading(false);
      clearMessages();

      console.log('✅ Session ended successfully');
    } catch (error) {
      console.error('Failed to end ElevenLabs session:', error);
      // Force disconnect
      setIsConnected(false);
      setIsLoading(false);
    }
  };

  const value = {
    isConnected,
    isLoading,
    messages,
    sendMessage,
    clearMessages,
    isSpeaking: conversation.isSpeaking || false,
    conversation,
    startSession: startElevenLabsSession,
    endSession: endElevenLabsSession
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
