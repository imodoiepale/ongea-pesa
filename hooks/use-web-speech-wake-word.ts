"use client"

import { useState, useEffect, useCallback, useRef } from 'react';

export const useWebSpeechWakeWord = () => {
  const [isListening, setIsListening] = useState(false);
  const [isWakeWordDetected, setIsWakeWordDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const wakeWords = ['ongea pesa', 'hey ongea', 'ongea'];

  const checkForWakeWord = useCallback((transcript: string) => {
    const lowerTranscript = transcript.toLowerCase();
    const foundWakeWord = wakeWords.some(word => lowerTranscript.includes(word));
    
    if (foundWakeWord) {
      console.log('Wake word detected:', transcript);
      setIsWakeWordDetected(true);
      setIsListening(false);
    }
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            checkForWakeWord(transcript);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
        
        // Auto-restart after error (except for not-allowed)
        if (event.error !== 'not-allowed') {
          restartTimeoutRef.current = setTimeout(startListening, 2000);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        // Auto-restart unless wake word was detected
        if (!isWakeWordDetected) {
          restartTimeoutRef.current = setTimeout(startListening, 1000);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setError('Failed to start speech recognition');
      console.error(err);
    }
  }, [checkForWakeWord, isWakeWordDetected]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }
    setIsListening(false);
  }, []);

  const resetWakeWord = useCallback(() => {
    setIsWakeWordDetected(false);
    // Restart listening after reset
    setTimeout(startListening, 500);
  }, [startListening]);

  useEffect(() => {
    // Auto-start listening when component mounts
    startListening();

    return () => {
      stopListening();
    };
  }, []);

  return {
    isListening,
    isWakeWordDetected,
    error,
    resetWakeWord,
    startListening,
    stopListening
  };
};
