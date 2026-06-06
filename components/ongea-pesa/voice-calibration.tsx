// components/ongea-pesa/voice-calibration.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

const phrases = [
  "Ongea Pesa, send 500 shillings to my mother.",
  "What is my M-Pesa balance?",
  "Pay my electricity bill.",
  "Tuma elfu moja kwa baba.",
  "Angalia salio langu la benki."
];

export function VoiceCalibrationScreen() {
  const router = useRouter();
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  const handleRecord = () => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      if (currentPhrase < phrases.length - 1) {
        setCurrentPhrase(currentPhrase + 1);
      } else {
        router.push('/permissions');
      }
    }, 2000);
  };

  return (
    <div className="min-h-[100dvh] surface-voice flex flex-col items-center justify-center relative overflow-hidden px-6">
      {/* Background orbs */}
      <div className="absolute top-1/4 -left-20 w-64 h-64 rounded-full bg-[hsl(var(--voice-accent))] opacity-[0.05] blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm text-center relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Voice Calibration</h1>
          <p className="text-sm text-white/60 mt-2">Please say the following phrase clearly:</p>
        </div>

        {/* Phrase display */}
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 mb-6">
          <p className="text-base font-semibold text-white leading-relaxed">{phrases[currentPhrase]}</p>
        </div>

        {/* Mic orb — animated when recording */}
        <div className="flex items-center justify-center mb-6">
          <div className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
            isRecording
              ? "bg-red-500/20 border-2 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]"
              : "bg-[rgba(0,255,136,0.12)] border-2 border-[rgba(0,255,136,0.25)]"
          )}>
            <Mic className={cn(
              "h-8 w-8 transition-all duration-300",
              isRecording ? "text-red-400 animate-pulse" : "text-[hsl(var(--voice-accent))]"
            )} />
          </div>
        </div>

        <Button
          onClick={handleRecord}
          disabled={isRecording}
          size="xl"
          className="w-full mb-4"
        >
          <Mic className="mr-2 h-4 w-4" />
          {isRecording ? 'Recording…' : 'Record Phrase'}
        </Button>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-1.5">
          {phrases.map((_, i) => (
            <div key={i} className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i < currentPhrase ? "w-6 bg-[hsl(var(--voice-accent))]" :
              i === currentPhrase ? "w-8 bg-[hsl(var(--voice-accent))]" :
              "w-3 bg-white/20"
            )} />
          ))}
        </div>
        <p className="text-xs text-white/40 mt-2">{currentPhrase + 1} of {phrases.length}</p>
      </div>
    </div>
  );
}
