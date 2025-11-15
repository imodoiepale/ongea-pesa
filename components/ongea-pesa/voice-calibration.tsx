// components/ongea-pesa/voice-calibration.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Mic } from 'lucide-react';
import WaveAnimation from './wave-animation';

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
    // TODO: Add actual recording logic here
    setTimeout(() => {
      setIsRecording(false);
      if (currentPhrase < phrases.length - 1) {
        setCurrentPhrase(currentPhrase + 1);
      } else {
        // Finished all phrases
        router.push('/permissions');
      }
    }, 2000); // Simulate recording for 2 seconds
  };

  return (
    <div className="w-full max-w-md mx-auto text-center p-8 bg-white dark:bg-black rounded-xl shadow-lg">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Voice Calibration</h1>
      <p className="text-md text-gray-500 dark:text-gray-400 mt-2 mb-6">
        Please say the following phrase clearly:
      </p>

      <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg mb-6">
        <p className="text-lg font-semibold text-gray-900 dark:text-white">{phrases[currentPhrase]}</p>
      </div>

      <div className="relative h-24 w-full mb-6">
        {isRecording && <WaveAnimation className="w-full h-full text-green-500 opacity-70" />}
      </div>

      <Button onClick={handleRecord} disabled={isRecording} className="w-full" size="lg">
        <Mic className="mr-2 h-4 w-4" />
        {isRecording ? 'Recording...' : 'Record Phrase'}
      </Button>

       <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
        {currentPhrase + 1} of {phrases.length}
      </p>
    </div>
  );
}
