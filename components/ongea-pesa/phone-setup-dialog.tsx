'use client';

import { useState, useEffect } from 'react';
import { X, Smartphone, ArrowLeft, Loader2, Check } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { startPhoneSetup, verifyPhoneSetup } from '@/lib/security-client';

interface PhoneSetupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (phone: string) => void; // called with the verified display phone on success
  required?: boolean; // if true, no X close button, dialog cannot be dismissed
}

export default function PhoneSetupDialog({
  isOpen,
  onClose,
  onComplete,
  required = false,
}: PhoneSetupDialogProps) {
  const [step, setStep] = useState<'setup' | 'otp'>('setup');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [otp, setOtp] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [emailHint, setEmailHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset to setup step whenever dialog opens
  useEffect(() => {
    if (isOpen) {
      setStep('setup');
      setOtp('');
      setError('');
    }
  }, [isOpen]);

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.startsWith('254')) {
      return cleaned.slice(0, 12);
    } else if (cleaned.startsWith('0')) {
      return cleaned.slice(0, 10);
    }
    return cleaned.slice(0, 10);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
    setError('');
  };

  const validatePhone = (phoneNumber: string): boolean => {
    const phoneRegex = /^(07|01|\+2547|\+2541)[0-9]{8}$/;
    return phoneRegex.test(phoneNumber.replace(/\s/g, ''));
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phone) {
      setError('Please enter your phone number');
      return;
    }

    if (!validatePhone(phone)) {
      setError('Invalid phone number. Use format: 0712345678 or +254712345678');
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }

    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    setLoading(true);
    try {
      const result = await startPhoneSetup(phone, pin);
      setChallengeId(result.challengeId);
      setEmailHint(result.emailHint);
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to start phone setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (otp.length !== 6) {
      setError('Please enter the full 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyPhoneSetup(challengeId, otp, phone);
      onComplete(result.phone || phone);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('setup');
    setOtp('');
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-brand p-6 relative">
          {!required && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-xl">
              <Smartphone className="text-white" size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Set Up Phone Login</h2>
              <p className="text-white/80 text-sm">Link your number and create a PIN</p>
            </div>
          </div>
        </div>

        {/* Body */}
        {step === 'setup' ? (
          <form onSubmit={handleSetupSubmit} className="p-6 space-y-5">
            {/* Phone Number Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Phone Number *
              </label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="0712345678"
                  className="w-full pl-11 pr-4 py-3 border border-border/60 rounded-xl focus:ring-2 focus:ring-brand focus:border-transparent bg-card text-foreground"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Enter your Safaricom or Airtel number
              </p>
            </div>

            {/* PIN Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                4-digit PIN *
              </label>
              <input
                type="password"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                  setError('');
                }}
                placeholder="••••"
                maxLength={4}
                pattern="\d{4}"
                className="w-full px-4 py-3 border border-border/60 rounded-xl focus:ring-2 focus:ring-brand focus:border-transparent bg-card text-foreground tracking-widest text-center text-lg"
                required
              />
            </div>

            {/* Confirm PIN Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Confirm PIN *
              </label>
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => {
                  setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                  setError('');
                }}
                placeholder="••••"
                maxLength={4}
                className="w-full px-4 py-3 border border-border/60 rounded-xl focus:ring-2 focus:ring-brand focus:border-transparent bg-card text-foreground tracking-widest text-center text-lg"
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-brand hover:bg-brand/90 active:scale-[0.97] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Sending code...
                </>
              ) : (
                <>
                  <Smartphone size={20} />
                  Continue
                </>
              )}
            </button>

            {/* Supported Formats */}
            <div className="bg-muted/30 rounded-xl p-3">
              <p className="text-xs font-medium text-foreground mb-2">Supported formats:</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>✓ 0712345678 (Safaricom)</p>
                <p>✓ 0112345678 (Airtel)</p>
                <p>✓ +254712345678 (International)</p>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="p-6 space-y-5">
            {/* OTP info box */}
            <div className="bg-brand/5 border border-brand/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="bg-brand/10 p-2 rounded-lg shrink-0">
                  <Check className="text-brand" size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Check your email</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Sent to <span className="font-medium text-foreground">{emailHint}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* OTP Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                6-digit verification code
              </label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(value) => {
                    setOtp(value);
                    setError('');
                  }}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Verify Button */}
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3 px-4 bg-brand hover:bg-brand/90 active:scale-[0.97] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Verifying...
                </>
              ) : (
                <>
                  <Check size={20} />
                  Verify
                </>
              )}
            </button>

            {/* Back Button */}
            <button
              type="button"
              onClick={handleBack}
              disabled={loading}
              className="w-full py-2.5 px-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
