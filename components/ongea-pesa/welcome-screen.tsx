// components/ongea-pesa/welcome-screen.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import WaveAnimation from './wave-animation';
import Image from 'next/image';

export function WelcomeScreen() {
  const router = useRouter();

  const handleGetStarted = () => {
    // Navigate to the next step in onboarding, e.g., security setup
    router.push('/security-setup');
  };

  return (
    <div className="w-full max-w-md mx-auto text-center p-8 bg-white dark:bg-black rounded-xl shadow-lg">
      <div className="relative w-32 h-32 mx-auto mb-6">
        <Image
          src="/placeholder-logo.svg"
          alt="Ongea Pesa Logo"
          layout="fill"
          objectFit="contain"
        />
        <div className="absolute inset-0 flex items-center justify-center">
           <WaveAnimation className="w-24 h-24 text-green-500 opacity-50" />
        </div>
      </div>

      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
        Ongea Pesa
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-300 mt-2">
        Speak Your Money into Motion
      </p>
      <p className="text-md text-gray-500 dark:text-gray-400 mt-4">
        The voice-controlled financial assistant for modern Kenyans.
      </p>

      <div className="mt-8 space-y-4">
        <Button onClick={handleGetStarted} className="w-full" size="lg">
          Get Started
        </Button>
        <Button variant="outline" className="w-full" size="lg" disabled>
          Watch Demo (Coming Soon)
        </Button>
      </div>
    </div>
  );
}
