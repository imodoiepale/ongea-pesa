// components/ongea-pesa/security-setup.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Fingerprint, Mic, ShieldCheck, KeyRound, Check, Loader2 } from 'lucide-react';
import { setPin, enrollPasskey } from '@/lib/security-client';

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
    <div className="w-full max-w-md mx-auto text-center p-8 bg-white dark:bg-black rounded-xl shadow-lg">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Secure Your Account</h1>
      <p className="text-md text-gray-500 dark:text-gray-400 mt-2 mb-8">
        Add an extra layer of security. You can set up multiple methods.
      </p>

      <div className="space-y-4 text-left">
        {/* PIN */}
        <div className="p-4 border rounded-lg dark:border-gray-700">
          <div className="flex items-center mb-3">
            <div className="mr-4 text-green-500"><KeyRound /></div>
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white">PIN Code</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Set a secure 4-6 digit PIN.</p>
            </div>
            {pinDone && <Check className="ml-auto text-green-500" />}
          </div>
          {!pinDone && (
            <div className="space-y-2">
              <Input inputMode="numeric" type="password" maxLength={6} placeholder="Enter PIN"
                value={pin} onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))} />
              <Input inputMode="numeric" type="password" maxLength={6} placeholder="Confirm PIN"
                value={pinConfirm} onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))} />
              <Button onClick={handleSetPin} disabled={busy === 'pin'} className="w-full" size="sm">
                {busy === 'pin' ? <Loader2 className="animate-spin h-4 w-4" /> : 'Set PIN'}
              </Button>
            </div>
          )}
        </div>

        {/* Passkey (Face/Touch ID via device) */}
        <div className="p-4 border rounded-lg dark:border-gray-700">
          <div className="flex items-center">
            <div className="mr-4 text-green-500"><Fingerprint /></div>
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white">Face ID / Fingerprint</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Use this device's biometrics (passkey).</p>
            </div>
            <div className="ml-auto">
              {passkeyDone ? (
                <Check className="text-green-500" />
              ) : (
                <Button onClick={handleEnrollPasskey} disabled={busy === 'passkey'} size="sm" variant="outline">
                  {busy === 'passkey' ? <Loader2 className="animate-spin h-4 w-4" /> : 'Enable'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Voice ID — session-bound + step-up (handled at payment time) */}
        <div className="flex items-center p-4 border rounded-lg dark:border-gray-700 opacity-80">
          <div className="mr-4 text-green-500"><Mic /></div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-white">Voice ID</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Your voice session is tied to your login; payments confirm with PIN/biometrics.</p>
          </div>
          <ShieldCheck className="ml-auto text-gray-400" />
        </div>
      </div>

      {error && <p className="text-sm text-red-500 mt-4">{error}</p>}

      <div className="mt-8">
        <Button onClick={() => router.push('/voice-calibration')} className="w-full" size="lg">
          Continue
        </Button>
      </div>
    </div>
  );
}
