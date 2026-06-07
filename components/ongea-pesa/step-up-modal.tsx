'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Fingerprint, Mic, KeyRound, Scan, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  verifyPinForStepUp,
  verifyPasskeyForStepUp,
  verifyVoiceForStepUp,
  getVoiceVerifyChallenge,
  listBiometrics,
  getVoiceStatus,
} from '@/lib/security-client';
import { cn } from '@/lib/utils';

type Method = 'face' | 'fingerprint' | 'passkey' | 'voice' | 'pin';

interface AvailableMethods {
  hasFace: boolean;
  hasFingerprint: boolean;
  hasPasskey: boolean;
  hasVoice: boolean;
  hasPin: boolean;
}

interface StepUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResolved: (stepupToken: string) => void;
  title?: string;
  description?: string;
}

export function StepUpModal({
  isOpen,
  onClose,
  onResolved,
  title = 'Confirm Your Identity',
  description = 'Verify your identity to proceed',
}: StepUpModalProps) {
  const [available, setAvailable] = useState<AvailableMethods | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [voicePhrase, setVoicePhrase] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceFrames, setVoiceFrames] = useState<string[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Load available methods on open
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setPin('');
      setSelectedMethod(null);
      setSuccess(false);
      setLockedUntil(null);
      setVoicePhrase(null);
      setVoiceFrames([]);
      return;
    }

    async function loadMethods() {
      try {
        const [creds, voiceStatus] = await Promise.all([
          listBiometrics().catch(() => [] as Awaited<ReturnType<typeof listBiometrics>>),
          getVoiceStatus().catch(() => ({ enrolled: false, profile: null })),
        ]);

        const hasFace = creds.some((c) => c.modality === 'face');
        const hasFingerprint = creds.some((c) => c.modality === 'fingerprint');
        const hasPasskey = creds.some(
          (c) => !c.modality || c.modality === 'platform' || c.modality === 'cross-platform'
        );

        setAvailable({
          hasFace,
          hasFingerprint,
          hasPasskey,
          hasVoice: voiceStatus.enrolled,
          hasPin: true, // PIN is always available as a fallback
        });

        // Auto-select best method
        if (hasFace) setSelectedMethod('face');
        else if (hasFingerprint) setSelectedMethod('fingerprint');
        else if (hasPasskey) setSelectedMethod('passkey');
        else if (voiceStatus.enrolled) setSelectedMethod('voice');
        else setSelectedMethod('pin');
      } catch {
        setAvailable({
          hasFace: false,
          hasFingerprint: false,
          hasPasskey: false,
          hasVoice: false,
          hasPin: true,
        });
        setSelectedMethod('pin');
      }
    }

    loadMethods();
  }, [isOpen]);

  const handlePasskeyVerify = useCallback(
    async (method: Method) => {
      setLoading(true);
      setError(null);
      try {
        const modality =
          method === 'face' ? 'face' : method === 'fingerprint' ? 'fingerprint' : undefined;
        // For face/fingerprint, request auth options filtered by modality
        const res = await fetch('/api/security/passkey/auth/options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modality }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          if (res.status === 423) {
            setLockedUntil(d.lockedUntil);
            throw new Error(d.error || 'Account locked');
          }
          throw new Error(d.error || 'Failed to start authentication');
        }
        const token = await verifyPasskeyForStepUp();
        setSuccess(true);
        setTimeout(() => onResolved(token), 400);
      } catch (e: any) {
        setError(e.message || 'Authentication failed');
      } finally {
        setLoading(false);
      }
    },
    [onResolved]
  );

  const handlePinVerify = useCallback(async () => {
    if (!/^\d{4,6}$/.test(pin)) {
      setError('PIN must be 4-6 digits');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await verifyPinForStepUp(pin);
      setSuccess(true);
      setTimeout(() => onResolved(token), 400);
    } catch (e: any) {
      if (e.status === 423) setLockedUntil(e.lockedUntil);
      setError(e.message || 'PIN verification failed');
    } finally {
      setLoading(false);
    }
  }, [pin, onResolved]);

  const handleVoiceStart = useCallback(async () => {
    setError(null);
    try {
      const { phrase } = await getVoiceVerifyChallenge();
      setVoicePhrase(phrase);
    } catch (e: any) {
      if (e.status === 423) setLockedUntil(e.lockedUntil);
      setError(e.message || 'Failed to get voice challenge');
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        // Convert to PCM frames via OfflineAudioContext
        const arrayBuffer = await blob.arrayBuffer();
        const audioCtx = new OfflineAudioContext(1, 16000 * 5, 16000);
        try {
          const decoded = await audioCtx.decodeAudioData(arrayBuffer);
          // If decoded length differs from expected, render re-samples it
          const rendered = await audioCtx.startRendering();
          const pcm = rendered.getChannelData(0);
          const int16 = new Int16Array(pcm.length);
          for (let i = 0; i < pcm.length; i++) {
            int16[i] = Math.max(-32768, Math.min(32767, Math.round(pcm[i] * 32767)));
          }
          const b64 = Buffer.from(int16.buffer).toString('base64');
          setVoiceFrames([b64]);
        } catch {
          setError('Failed to process audio. Please try again.');
        }
        setIsRecording(false);
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Auto-stop after 5 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 5000);
    } catch {
      setError('Microphone access denied');
    }
  }, []);

  const handleVoiceVerify = useCallback(async () => {
    if (voiceFrames.length === 0) {
      setError('Please record your voice first');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await verifyVoiceForStepUp(voiceFrames);
      setSuccess(true);
      setTimeout(() => onResolved(token), 400);
    } catch (e: any) {
      if (e.status === 423) setLockedUntil(e.lockedUntil);
      setError(e.message || 'Voice verification failed');
    } finally {
      setLoading(false);
    }
  }, [voiceFrames, onResolved]);

  const methodLabel: Record<Method, string> = {
    face: 'Face ID',
    fingerprint: 'Fingerprint',
    passkey: 'Passkey',
    voice: 'Voice',
    pin: 'PIN',
  };

  const methodIcon: Record<Method, React.ReactNode> = {
    face: <Scan className="w-4 h-4" />,
    fingerprint: <Fingerprint className="w-4 h-4" />,
    passkey: <Fingerprint className="w-4 h-4" />,
    voice: <Mic className="w-4 h-4" />,
    pin: <KeyRound className="w-4 h-4" />,
  };

  const availableMethods: Method[] = available
    ? ([
        available.hasFace && 'face',
        available.hasFingerprint && 'fingerprint',
        available.hasPasskey && 'passkey',
        available.hasVoice && 'voice',
        'pin',
      ].filter(Boolean) as Method[])
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{title}</DialogTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </DialogHeader>

        {lockedUntil && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              Account locked until {new Date(lockedUntil).toLocaleTimeString()}. Too many failed
              attempts.
            </span>
          </div>
        )}

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            <p className="text-sm font-medium text-foreground">Identity verified</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Method selector */}
            {availableMethods.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {availableMethods.map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setSelectedMethod(m);
                      setError(null);
                      setVoicePhrase(null);
                      setVoiceFrames([]);
                    }}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                      selectedMethod === m
                        ? 'bg-emerald-800 border-emerald-700 text-white'
                        : 'bg-muted border-border text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {methodIcon[m]}
                    {methodLabel[m]}
                  </button>
                ))}
              </div>
            )}

            {/* Face / Fingerprint / Passkey */}
            {(selectedMethod === 'face' ||
              selectedMethod === 'fingerprint' ||
              selectedMethod === 'passkey') && (
              <Button
                className="w-full bg-emerald-800 hover:bg-emerald-700 text-white"
                onClick={() => handlePasskeyVerify(selectedMethod)}
                disabled={loading || !!lockedUntil}
              >
                {loading ? 'Verifying…' : `Verify with ${methodLabel[selectedMethod]}`}
              </Button>
            )}

            {/* Voice */}
            {selectedMethod === 'voice' && (
              <div className="space-y-3">
                {!voicePhrase && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleVoiceStart}
                    disabled={!!lockedUntil}
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Start Voice Verification
                  </Button>
                )}
                {voicePhrase && (
                  <>
                    <div className="p-3 rounded-lg bg-muted text-sm text-center font-medium text-foreground">
                      &ldquo;{voicePhrase}&rdquo;
                    </div>
                    <div className="flex justify-center">
                      <button
                        onClick={isRecording ? undefined : startRecording}
                        disabled={loading || !!lockedUntil}
                        className={cn(
                          'w-16 h-16 rounded-full flex items-center justify-center transition-all',
                          isRecording
                            ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/40'
                            : voiceFrames.length > 0
                            ? 'bg-emerald-700'
                            : 'bg-emerald-800 hover:bg-emerald-700'
                        )}
                      >
                        <Mic className="w-6 h-6 text-white" />
                      </button>
                    </div>
                    {isRecording && (
                      <p className="text-xs text-center text-muted-foreground">
                        Recording… (5s)
                      </p>
                    )}
                    {voiceFrames.length > 0 && !isRecording && (
                      <Button
                        className="w-full bg-emerald-800 hover:bg-emerald-700 text-white"
                        onClick={handleVoiceVerify}
                        disabled={loading}
                      >
                        {loading ? 'Verifying…' : 'Confirm Voice'}
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* PIN */}
            {selectedMethod === 'pin' && (
              <div className="space-y-3">
                <Input
                  type="password"
                  inputMode="numeric"
                  placeholder="Enter PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength={6}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handlePinVerify();
                  }}
                  disabled={loading || !!lockedUntil}
                  className="text-center tracking-widest text-lg"
                />
                <Button
                  className="w-full bg-emerald-800 hover:bg-emerald-700 text-white"
                  onClick={handlePinVerify}
                  disabled={loading || !pin || !!lockedUntil}
                >
                  {loading ? 'Verifying…' : 'Confirm PIN'}
                </Button>
              </div>
            )}

            {error && !lockedUntil && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
