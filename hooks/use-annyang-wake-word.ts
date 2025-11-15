"use client"

import { useState, useEffect, useCallback } from 'react';

declare global {
  interface Window {
    annyang: any;
  }
}

export const useAnnyangWakeWord = () => {
  const [isListening, setIsListening] = useState(false);
  const [isWakeWordDetected, setIsWakeWordDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetWakeWord = useCallback(() => {
    setIsWakeWordDetected(false);
  }, []);

  useEffect(() => {
    // Dynamically import annyang to avoid SSR issues
    const loadAnnyang = async () => {
      try {
        const annyang = (await import('annyang')).default;
        
        if (annyang) {
          // Define wake word commands
          const commands = {
            'ongea pesa': () => {
              console.log('Wake word detected: Ongea Pesa');
              setIsWakeWordDetected(true);
            },
            'hey ongea': () => {
              console.log('Wake word detected: Hey Ongea');
              setIsWakeWordDetected(true);
            },
            'ongea': () => {
              console.log('Wake word detected: Ongea');
              setIsWakeWordDetected(true);
            }
          };

          annyang.addCommands(commands);
          
          // Set language
          annyang.setLanguage('en-US');
          
          // Add callbacks
          annyang.addCallback('start', () => {
            setIsListening(true);
            setError(null);
          });
          
          annyang.addCallback('end', () => {
            setIsListening(false);
          });
          
          annyang.addCallback('error', (err: any) => {
            setError(`Speech recognition error: ${err}`);
            setIsListening(false);
          });

          // Start listening
          annyang.start({ autoRestart: true, continuous: true });
        } else {
          setError('Annyang not supported in this browser');
        }
      } catch (err) {
        setError('Failed to load speech recognition');
        console.error(err);
      }
    };

    loadAnnyang();

    return () => {
      // Cleanup
      if (typeof window !== 'undefined' && window.annyang) {
        window.annyang.abort();
      }
    };
  }, []);

  return {
    isListening,
    isWakeWordDetected,
    error,
    resetWakeWord
  };
};
