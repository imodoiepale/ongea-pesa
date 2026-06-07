// components/ongea-pesa/security-setup.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Fingerprint, Mic, ShieldCheck, KeyRound, Check, Loader2, Scan } from 'lucide-react';
import { setPin, enrollPasskey, enrollFace, enrollFingerprint, getVoiceEnrollChallenge, enrollVoiceBiometric } from '@/lib/security-client';
import { cn } from '@/lib/utils';

export function SecuritySetupScreen() {
  const router = useRouter();
  const [pin, setPinValue] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinDone, setPinDone] = useState(false);
  const [passkeyDone, setPasskeyDone] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceDone, setVoiceDone] = useState(false);
  const [voicePhrase, setVoicePhrase] = useState<string | null>(null);
  const [voiceStep, setVoiceStep] = useState<'idle' | 'phrase' | 'recording' | 'processing'>('idle');

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

  const handleEnrollFace = async () => {
    setError(null);
    setBusy('face');
    try {
      await enrollFace();
      setPasskeyDone(true);
    } catch (e: any) {
      setError(e.message || 'Face ID enrollment failed');
    } finally {
      setBusy(null);
    }
  };

  const handleEnrollFingerprint = async () => {
    setError(null);
    setBusy('fingerprint');
    try {
      await enrollFingerprint();
      setPasskeyDone(true);
    } catch (e: any) {
      setError(e.message || 'Fingerprint enrollment failed');
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

          {/* Face ID */}
          <div className={cn(
            "rounded-2xl border px-4 py-4 flex items-center gap-3",
            passkeyDone ? "border-[rgba(0,255,136,0.3)] bg-[rgba(0,255,136,0.06)]" : "border-white/10 bg-white/5"
          )}>
            <div className="w-9 h-9 rounded-xl bg-[rgba(0,255,136,0.12)] flex items-center justify-center shrink-0">
              <Scan className="h-4 w-4 text-[hsl(var(--voice-accent))]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white">Face ID</h3>
              <p className="text-xs text-white/50">Use Face ID to confirm payments</p>
            </div>
            {passkeyDone ? (
              <Check className="h-4 w-4 text-[hsl(var(--voice-accent))] shrink-0" />
            ) : (
              <Button onClick={handleEnrollFace} disabled={busy === 'face' || passkeyDone} size="sm" variant="glass">
                {busy === 'face' ? <Loader2 className="animate-spin h-4 w-4" /> : 'Enable'}
              </Button>
            )}
          </div>

          {/* Fingerprint */}
          <div className={cn(
            "rounded-2xl border px-4 py-4 flex items-center gap-3",
            passkeyDone ? "border-[rgba(0,255,136,0.3)] bg-[rgba(0,255,136,0.06)]" : "border-white/10 bg-white/5"
          )}>
            <div className="w-9 h-9 rounded-xl bg-[rgba(0,255,136,0.12)] flex items-center justify-center shrink-0">
              <Fingerprint className="h-4 w-4 text-[hsl(var(--voice-accent))]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white">Fingerprint</h3>
              <p className="text-xs text-white/50">Use your fingerprint to confirm payments</p>
            </div>
            {passkeyDone ? (
              <Check className="h-4 w-4 text-[hsl(var(--voice-accent))] shrink-0" />
            ) : (
              <Button onClick={handleEnrollFingerprint} disabled={busy === 'fingerprint' || passkeyDone} size="sm" variant="glass">
                {busy === 'fingerprint' ? <Loader2 className="animate-spin h-4 w-4" /> : 'Enable'}
              </Button>
            )}
          </div>

          {/* Voice ID — real enrollment */}
          <div className={cn(
            "rounded-2xl border px-4 py-4",
            voiceDone ? "border-[rgba(0,255,136,0.3)] bg-[rgba(0,255,136,0.06)]" : "border-white/10 bg-white/5"
          )}>
            <div className="flex items-center mb-3">
              <div className="w-9 h-9 rounded-xl bg-[rgba(0,255,136,0.12)] flex items-center justify-center mr-3">
                <Mic className="h-4 w-4 text-[hsl(var(--voice-accent))]" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white">Voice ID</h3>
                <p className="text-xs text-white/50">
                  {voiceDone
                    ? 'Voice enrolled — your voice can authorize payments'
                    : 'Read a phrase aloud to enroll your voice biometric'}
                </p>
              </div>
              {voiceDone && <Check className="h-4 w-4 text-[hsl(var(--voice-accent))]" />}
            </div>

            {voiceStep === 'idle' && !voiceDone && (
              <Button
                onClick={async () => {
                  setError(null);
                  setVoiceBusy(true);
                  try {
                    const { phrase } = await getVoiceEnrollChallenge();
                    setVoicePhrase(phrase);
                    setVoiceStep('phrase');
                  } catch (e: any) {
                    setError(e.message || 'Failed to start voice enrollment');
                  } finally {
                    setVoiceBusy(false);
                  }
                }}
                disabled={voiceBusy}
                size="sm"
                className="w-full"
              >
                {voiceBusy ? <Loader2 className="animate-spin h-4 w-4" /> : 'Enroll Voice ID'}
              </Button>
            )}

            {voiceStep === 'phrase' && voicePhrase && (
              <div className="space-y-3">
                <p className="text-xs text-white/50 text-center">Read this phrase aloud clearly:</p>
                <div className="p-3 rounded-lg bg-white/8 border border-white/15 text-sm text-center font-medium text-white">
                  &ldquo;{voicePhrase}&rdquo;
                </div>
                <div className="flex justify-center">
                  <button
                    className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300",
                      voiceStep === 'recording'
                        ? "bg-red-500/20 border-2 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]"
                        : "bg-[rgba(0,255,136,0.12)] border-2 border-[rgba(0,255,136,0.25)] hover:bg-[rgba(0,255,136,0.2)]"
                    )}
                    onClick={async () => {
                      setVoiceStep('recording');
                      try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        const mr = new MediaRecorder(stream);
                        const chunks: Blob[] = [];
                        mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
                        mr.onstop = async () => {
                          stream.getTracks().forEach(t => t.stop());
                          setVoiceStep('processing');
                          try {
                            const blob = new Blob(chunks, { type: 'audio/webm' });
                            const ab = await blob.arrayBuffer();
                            const actx = new AudioContext();
                            const decoded = await actx.decodeAudioData(ab);
                            const offlineCtx = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
                            const src = offlineCtx.createBufferSource();
                            src.buffer = decoded;
                            src.connect(offlineCtx.destination);
                            src.start(0);
                            const rendered = await offlineCtx.startRendering();
                            const pcm = rendered.getChannelData(0);
                            const int16 = new Int16Array(pcm.length);
                            for (let i = 0; i < pcm.length; i++) {
                              int16[i] = Math.max(-32768, Math.min(32767, Math.round(pcm[i] * 32767)));
                            }
                            // base64 encode without Buffer (browser-safe)
                            const bytes = new Uint8Array(int16.buffer);
                            let binary = '';
                            for (let i = 0; i < bytes.byteLength; i++) {
                              binary += String.fromCharCode(bytes[i]);
                            }
                            const b64 = btoa(binary);
                            await enrollVoiceBiometric([b64], true);
                            setVoiceDone(true);
                            setVoiceStep('idle');
                          } catch (e: any) {
                            setError(e.message || 'Voice enrollment failed');
                            setVoiceStep('phrase');
                          }
                        };
                        mr.start();
                        setTimeout(() => { if (mr.state === 'recording') mr.stop(); }, 5000);
                      } catch {
                        setError('Microphone access denied');
                        setVoiceStep('phrase');
                      }
                    }}
                  >
                    <Mic className={cn(
                      "h-6 w-6 transition-all duration-300",
                      voiceStep === 'recording' ? "text-red-400 animate-pulse" : "text-[hsl(var(--voice-accent))]"
                    )} />
                  </button>
                </div>
                <p className="text-xs text-center text-white/40">
                  {voiceStep === 'recording' ? 'Recording… (5s)' : 'Tap mic to record'}
                </p>
              </div>
            )}

            {voiceStep === 'processing' && (
              <div className="flex items-center justify-center gap-2 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--voice-accent))]" />
                <p className="text-xs text-white/50">Processing voice enrollment…</p>
              </div>
            )}

            {/* Consent disclosure */}
            {voiceStep !== 'idle' && !voiceDone && (
              <p className="text-[10px] text-white/30 text-center leading-relaxed mt-3">
                Your voice is processed on our secure servers to create an encrypted identity pattern.
                Raw audio is never stored. You can revoke this anytime in Settings.
              </p>
            )}
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
