// components/ongea-pesa/security-setup.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Fingerprint, Mic, ShieldCheck, KeyRound } from 'lucide-react';
import WaveAnimation from './wave-animation';

export function SecuritySetupScreen() {
  const router = useRouter();

  const handleContinue = () => {
    router.push('/voice-calibration');
  };

  return (
    <div className="w-full max-w-md mx-auto text-center p-8 bg-white dark:bg-black rounded-xl shadow-lg">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Secure Your Account</h1>
      <p className="text-md text-gray-500 dark:text-gray-400 mt-2 mb-8">
        Add an extra layer of security. You can set up multiple methods.
      </p>

      <div className="space-y-4 text-left">
        <SecurityOption icon={<Mic />} title="Voice ID" description="Authenticate with your voice." />
        <SecurityOption icon={<Fingerprint />} title="Fingerprint" description="Use your fingerprint to log in." />
        <SecurityOption icon={<ShieldCheck />} title="Face ID" description="Enable facial recognition." />
        <SecurityOption icon={<KeyRound />} title="PIN Code" description="Set a secure PIN for access." />
      </div>

      <div className="mt-8">
         <Button onClick={handleContinue} className="w-full" size="lg">
          Continue
        </Button>
      </div>
    </div>
  );
}

function SecurityOption({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className="flex items-center p-4 border rounded-lg dark:border-gray-700">
            <div className="mr-4 text-green-500">
                {icon}
            </div>
            <div>
                <h3 className="font-semibold text-gray-800 dark:text-white">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
            </div>
            <div className="ml-auto">
                {/* TODO: Add a switch or button to enable/disable */}
            </div>
        </div>
    )
}
