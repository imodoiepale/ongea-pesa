// components/voice-provider.tsx
'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useWakeWord } from '@/hooks/use-wake-word';

interface VoiceContextType {
  isWakeWordDetected: boolean;
  resetWakeWord: () => void;
  simulateWakeWord: () => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const { isWakeWordDetected, resetWakeWord, simulateWakeWord } = useWakeWord();

  return (
    <VoiceContext.Provider value={{ isWakeWordDetected, resetWakeWord, simulateWakeWord }}>
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (context === undefined) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
};
