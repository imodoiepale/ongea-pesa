// components/ongea-pesa/security-setup.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Fingerprint, Mic, ShieldCheck, KeyRound, Check, Loader2 } from 'lucide-react';
import { setPin, enrollPasskey } from '@/lib/security-client';
import { cn } from '@/lib/utils';

export function SecuritySetupScreen() {
  const router = useRouter();
  const [pin, setPinValue] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinDone, setPinDone] = useState(false);
  const [passkeyDone, setPasskeyDone] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSetPin = async () => {
    setError(null);
    if (!/^\d{4,6}$/.test(pin)) return setError('PIN must be 4-6 digits');
    if (pin !== pinConfirm) return setError('PINs do not match');
    setBusy('pin');
    try {
      await setPin(pin);
      setPinDone(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  const handleEnrollPasskey = async () => {
    setError(null);
    setBusy('passkey');
    try {
      await enrollPasskey();
      setPasskeyDone(true);
    } catch (e: any) {
      setError(e.message || 'Passkey enrollment failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-[100dvh] surface-voice flex flex-col items-center justify-center relative overflow-hidden px-6 py-8">
      {/* Background orb */}
      <div className="absolute top-1/3 -right-24 w-72 h-72 rounded-full bg-[hsl(var(--voice-accent))] opacity-[0.04] blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-[rgba(0,255,136,0.12)] border border-[rgba(0,255,136,0.25)] flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-[hsl(var(--voice-accent))]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Secure Your Account</h1>
          <p className="text-sm text-white/60 mt-2">Add an extra layer of security. You can set up multiple methods.</p>
        </div>

        <div className="space-y-3">
          {/* PIN section */}
          <div className={cn(
            "rounded-2xl border px-4 py-4",
            pinDone ? "border-[rgba(0,255,136,0.3)] bg-[rgba(0,255,136,0.06)]" : "border-white/10 bg-white/5"
          )}>
            <div className="flex items-center mb-3">
              <div className="w-9 h-9 rounded-xl bg-[rgba(0,255,136,0.12)] flex items-center justify-center mr-3">
                <KeyRound className="h-4 w-4 text-[hsl(var(--voice-accent))]" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white">PIN Code</h3>
                <p className="text-xs text-white/50">Set a secure 4-6 digit PIN.</p>
              </div>
              {pinDone && <Check className="h-4 w-4 text-[hsl(var(--voice-accent))]" />}
            </div>
            {!pinDone && (
              <div className="space-y-2">
                <input
                  inputMode="numeric"
                  type="password"
                  maxLength={6}
                  placeholder="Enter PIN"
                  value={pin}
                  onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/8 border border-white/15 text-white placeholder:text-white/30 text-sm outline-none focus:border-[rgba(0,255,136,0.4)] transition-colors"
                />
                <input
                  inputMode="numeric"
                  type="password"
                  maxLength={6}
                  placeholder="Confirm PIN"
                  value={pinConfirm}
                  onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/8 border border-white/15 text-white placeholder:text-white/30 text-sm outline-none focus:border-[rgba(0,255,136,0.4)] transition-colors"
                />
                <Button
                  onClick={handleSetPin}
                  disabled={busy === 'pin'}
                  size="sm"
                  className="w-full"
                >
                  {busy === 'pin' ? <Loader2 className="animate-spin h-4 w-4" /> : 'Set PIN'}
                </Button>
              </div>
            )}
          </div>

          {/* Passkey section */}
          <div className={cn(
            "rounded-2xl border px-4 py-4 flex items-center gap-3",
            passkeyDone ? "border-[rgba(0,255,136,0.3)] bg-[rgba(0,255,136,0.06)]" : "border-white/10 bg-white/5"
          )}>
            <div className="w-9 h-9 rounded-xl bg-[rgba(0,255,136,0.12)] flex items-center justify-center shrink-0">
              <Fingerprint className="h-4 w-4 text-[hsl(var(--voice-accent))]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white">Face ID / Fingerprint</h3>
              <p className="text-xs text-white/50">Use this device's biometrics (passkey).</p>
            </div>
            {passkeyDone ? (
              <Check className="h-4 w-4 text-[hsl(var(--voice-accent))] shrink-0" />
            ) : (
              <Button onClick={handleEnrollPasskey} disabled={busy === 'passkey'} size="sm" variant="glass">
                {busy === 'passkey' ? <Loader2 className="animate-spin h-4 w-4" /> : 'Enable'}
              </Button>
            )}
          </div>

          {/* Voice ID info */}
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 flex items-center gap-3 opacity-70">
            <div className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center shrink-0">
              <Mic className="h-4 w-4 text-white/60" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white">Voice ID</h3>
              <p className="text-xs text-white/50">Your voice session is tied to your login; payments confirm with PIN/biometrics.</p>
            </div>
            <ShieldCheck className="h-4 w-4 text-white/30 shrink-0" />
          </div>
        </div>

        {error && <p className="text-sm text-red-400 mt-4 text-center">{error}</p>}

        <Button
          onClick={() => router.push('/voice-calibration')}
          className="w-full mt-6"
          size="xl"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
