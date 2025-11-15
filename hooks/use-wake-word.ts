// hooks/use-wake-word.ts
'use client';

import { useState, useEffect, useCallback } from 'react';

export const useWakeWord = () => {
  const [isListening, setIsListening] = useState(false);
  const [isWakeWordDetected, setIsWakeWordDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetWakeWord = useCallback(() => {
    setIsWakeWordDetected(false);
  }, []);

  const simulateWakeWord = useCallback(() => {
    setIsWakeWordDetected(true);
    console.log('Wake word detected!');
  }, []);

  const startListening = useCallback(async () => {
    try {
      // Dynamic import to avoid SSR issues
      const { WakeWord } = await import('react-native-wakeword');
      
      setIsListening(true);
      setError(null);

      // Initialize wake word detection
      const wakeWordInstance = new WakeWord({
        keywords: ['ongea pesa', 'hey ongea', 'ongea'],
        onDetection: (keyword: string) => {
          console.log('Wake word detected:', keyword);
          setIsWakeWordDetected(true);
          setIsListening(false);
        },
        onError: (err: any) => {
          console.error('Wake word error:', err);
          setError(`Wake word error: ${err.message || err}`);
          setIsListening(false);
        }
      });

      // Start listening
      await wakeWordInstance.start();
      
    } catch (err) {
      console.error('Failed to initialize wake word detection:', err);
      setError('Wake word detection not supported or failed to initialize');
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(async () => {
    try {
      const { WakeWord } = await import('react-native-wakeword');
      await WakeWord.stop();
      setIsListening(false);
    } catch (err) {
      console.error('Failed to stop wake word detection:', err);
    }
  }, []);

  useEffect(() => {
    // Auto-start listening when component mounts
    startListening();

    return () => {
      stopListening();
    };
  }, [startListening, stopListening]);

  return {
    isListening,
    isWakeWordDetected,
    error,
    resetWakeWord,
    simulateWakeWord,
    startListening,
    stopListening
  };
};
