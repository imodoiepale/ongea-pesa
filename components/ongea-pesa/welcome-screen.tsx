// components/ongea-pesa/welcome-screen.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

export function WelcomeScreen() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/security-setup');
  };

  return (
    <div className="min-h-[100dvh] surface-voice flex flex-col items-center justify-center relative overflow-hidden px-6">
      {/* Background orbs */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-[hsl(var(--voice-accent))] opacity-[0.04] blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-[hsl(var(--voice-accent-2))] opacity-[0.03] blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm text-center relative z-10">
        {/* Logo orb */}
        <div className="mx-auto mb-8 w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-[0_0_40px_rgba(0,255,136,0.15)]">
          <div className="w-16 h-16 rounded-full bg-[rgba(0,255,136,0.12)] border border-[rgba(0,255,136,0.25)] flex items-center justify-center">
            <Mic className="h-7 w-7 text-[hsl(var(--voice-accent))]" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Ongea Pesa</h1>
        <p className="text-lg text-white/70 mb-2">Speak Your Money into Motion</p>
        <p className="text-sm text-white/50 mb-10">The voice-controlled financial assistant for modern Kenyans.</p>

        {/* CTAs */}
        <div className="space-y-3">
          <Button
            onClick={handleGetStarted}
            size="xl"
            className="w-full"
          >
            Get Started
          </Button>
          <Button
            variant="glass"
            size="xl"
            className="w-full"
            disabled
          >
            Watch Demo (Coming Soon)
          </Button>
        </div>
      </div>
    </div>
  );
}
