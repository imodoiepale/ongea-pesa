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
      console.log('📊 Connection status:', conversation.status);
      setIsConnected(true);
      setIsLoading(false);
    },
    onDisconnect: (reason?: any) => {
      console.log('🎙️ Global ElevenLabs disconnected');
      console.log('📊 Disconnect reason:', reason);
      console.log('📊 Final status:', conversation.status);
      console.trace('Disconnect call stack');
      setIsConnected(false);
      setIsLoading(false); // Reset loading state to prevent stuck state
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
      console.error('🔴 Error details:', JSON.stringify(error, null, 2));
      console.error('🔴 Current status:', conversation.status);
      setIsLoading(false);
      setIsConnected(false); // Ensure disconnected state on error
    },
    onStatusChange: (status: any) => {
      console.log('📊 ElevenLabs status changed:', status);
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
  const getSignedUrl = async (): Promise<{ signedUrl: string; balance: number; userName: string; userEmail: string; userId: string; gateName: string; gateId: string }> => {
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
      
      const { signedUrl, userId: returnedUserId, balance, userName, userEmail, gateName, gateId } = await response.json();
      console.log('✅ Got signed URL for userId:', returnedUserId, 'email:', userEmail, 'balance:', balance, 'name:', userName);
      return { signedUrl, balance, userName, userEmail, userId: returnedUserId, gateName: gateName || '', gateId: gateId || '' };
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
          console.log('💰 Balance updated for ElevenLabs context:', balance);
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
  }, [userId]); // Only depend on userId to prevent interference with conversation

  // Manual start function exposed for components to use
  const startElevenLabsSession = async () => {
    if (!userId) {
      console.log('⚠️ Cannot start session: No userId');
      return;
    }

    // Comprehensive guard: check if already connected OR connecting
    const currentStatus = conversation.status;
    if (currentStatus === 'connected' || currentStatus === 'connecting') {
      console.log('⚠️ Session already active or connecting (status:', currentStatus, '), skipping duplicate start');
      if (currentStatus === 'connected') {
        setIsConnected(true);
      }
      setIsLoading(false);
      return;
    }

    // If loading flag is set, don't start another
    if (isLoading) {
      console.log('⚠️ Session already starting (loading flag set), please wait');
      return;
    }

    try {
      setIsLoading(true);
      console.log('🚀 Starting global ElevenLabs session for userId:', userId);
      
      // Request microphone permissions BEFORE starting session
      console.log('🎤 Requesting microphone permissions...');
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('✅ Microphone access granted');
      } catch (micError) {
        console.error('❌ Microphone access denied:', micError);
        setIsLoading(false);
        setIsConnected(false);
        throw new Error('Microphone access is required for voice interaction');
      }
      
      const { signedUrl, balance, userName, userEmail, userId: returnedUserId, gateName, gateId } = await getSignedUrl();
      console.log('📝 Received signed URL (first 100 chars):', signedUrl.substring(0, 100));
      
      // Prepare dynamic variables to pass to the session
      const dynamicVariables = {
        user_id: returnedUserId,
        user_email: userEmail || '',
        user_name: userName || 'User',
        balance: balance.toString(),
        gate_name: gateName || '',
        gate_id: gateId || ''
      };
      
      console.log('💰 Dynamic variables for ElevenLabs session:', dynamicVariables);
      console.log('📡 Starting session with conversation.startSession()...');
      
      await conversation.startSession({ 
        signedUrl: signedUrl,
        dynamicVariables: dynamicVariables
      });
      
      console.log('✅ conversation.startSession() completed - waiting for onConnect callback');
      
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
