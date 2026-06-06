'use client';

import React from 'react';
import { Mic } from 'lucide-react';

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-[100dvh] w-full flex bg-background">
      {/* Left panel — voice/hero surface (cinematic dark glass) */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden surface-voice">
        {/* Background blur orbs */}
        <div className="absolute inset-0 bg-zinc-950" />
        <div
          aria-hidden
          className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full opacity-20 blur-[120px]"
          style={{ background: 'radial-gradient(circle, #00FF88 0%, transparent 70%)' }}
        />
        <div
          aria-hidden
          className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full opacity-10 blur-[100px]"
          style={{ background: 'radial-gradient(circle, #00D4AA 0%, transparent 70%)' }}
        />

        {/* Content */}
        <div className="relative z-10 px-12 max-w-sm">
          {/* Mic orb */}
          <div className="mb-8 inline-flex">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(0,255,136,0.15)]">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,255,136,0.12)' }}>
                <Mic className="w-5 h-5" style={{ color: '#00FF88' }} />
              </div>
            </div>
          </div>

          <h1 className="font-bold text-4xl text-white mb-3 leading-tight tracking-tight">
            Ongea Pesa
          </h1>
          <p className="text-lg text-white/60 leading-relaxed mb-8">
            The future of transactions, spoken into existence.
          </p>

          {/* Feature bullets */}
          <ul className="space-y-3">
            {[
              'Voice-activated payments',
              'Real-time balance insights',
              'Secure group savings (Chama)',
            ].map((feat) => (
              <li key={feat} className="flex items-center gap-3 text-sm text-white/50">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#00FF88' }} />
                {feat}
              </li>
            ))}
          </ul>

          <div className="mt-10 h-px w-16 rounded-full" style={{ background: 'rgba(0,255,136,0.3)' }} />
        </div>
      </div>

      {/* Right panel — form area (clean surface-money) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-background">
        {/* Mobile logo — shown only on small screens */}
        <div className="absolute top-6 left-6 lg:hidden flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center">
            <Mic className="w-4 h-4 text-brand" />
          </div>
          <span className="font-semibold text-sm text-foreground">Ongea Pesa</span>
        </div>
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
