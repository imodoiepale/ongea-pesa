import { useState, useEffect, useRef, useCallback } from 'react';

interface VoiceActivationOptions {
  wakeWord?: string;
  continuous?: boolean;
  language?: string;
  onActivate?: () => void;
  onDeactivate?: () => void;
  onCommand?: (command: string) => void;
  onError?: (error: string) => void;
}

export function useVoiceActivation(options: VoiceActivationOptions = {}) {
  const {
    wakeWord = 'hey ongea',
    continuous = false,
    language = 'en-US',
    onActivate,
    onDeactivate,
    onCommand,
    onError,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      onError?.('Speech recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('🎤 Voice recognition started');
      setIsListening(true);
    };

    recognition.onend = () => {
      console.log('🎤 Voice recognition ended');
      setIsListening(false);
      
      // Restart if continuous mode is enabled
      if (continuous && recognitionRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.log('Recognition already started');
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        onError?.(event.error);
      }
    };

    recognition.onresult = (event: any) => {
      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript.toLowerCase().trim();

        if (result.isFinal) {
          finalText += text + ' ';
        } else {
          interimText += text + ' ';
        }
      }

      setInterimTranscript(interimText);

      if (finalText) {
        setTranscript(finalText);
        console.log('Heard:', finalText);

        // Check for wake word
        if (!isActive && finalText.includes(wakeWord.toLowerCase())) {
          console.log('🎯 Wake word detected!');
          setIsActive(true);
          onActivate?.();
          
          // Auto-deactivate after 10 seconds of no command
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            setIsActive(false);
            onDeactivate?.();
          }, 10000);
        } 
        // Process command if active
        else if (isActive) {
          onCommand?.(finalText);
          
          // Reset timeout on command
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            setIsActive(false);
            onDeactivate?.();
          }, 10000);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [wakeWord, continuous, language, isActive, onActivate, onDeactivate, onCommand, onError]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.log('Recognition already started');
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsActive(false);
    }
  }, [isListening]);

  const manualActivate = useCallback(() => {
    setIsActive(true);
    onActivate?.();
    
    // Auto-deactivate after 10 seconds
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsActive(false);
      onDeactivate?.();
    }, 10000);
  }, [onActivate, onDeactivate]);

  return {
    isListening,
    isActive,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    manualActivate,
  };
}
