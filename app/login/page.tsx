'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, ArrowLeft, LockKeyhole, UserRound } from 'lucide-react';
import AuthLayout from '@/components/auth/auth-layout';
import { createClient } from '@/lib/supabase/client';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { startPhoneLogin, verifyPhoneOtp } from '@/lib/security-client';

type LoginMode = 'phone' | 'otp' | 'email';

export default function LoginPage() {
  const router = useRouter();

  // Shared state
  const [mode, setMode] = useState<LoginMode>('phone');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Phone mode state
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');

  // OTP mode state
  const [otp, setOtp] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [emailHint, setEmailHint] = useState('');

  // Email mode state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ---------------------------------------------------------------------------
  // Phone login handler
  // ---------------------------------------------------------------------------
  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (phone.includes('@')) {
        const { error: emailError } = await createClient().auth.signInWithPassword({
          email: phone.trim(),
          password: pin,
        });
        if (emailError) throw emailError;
        try {
          await fetch('/api/gate/ensure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });
        } catch {
          // Wallet provisioning is retried after login and must not block access.
        }
        router.push('/');
        router.refresh();
        return;
      }

      const result = await startPhoneLogin(phone, pin);

      if (!result.otpRequired) {
        // Direct session — verify OTP token hash immediately
        await createClient().auth.verifyOtp({
          type: result.type as any,
          token_hash: result.token_hash!,
        });
        // Ensure gate (non-blocking)
        try {
          await fetch('/api/gate/ensure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });
        } catch {
          // ignore — must not block login
        }
        router.push('/');
        router.refresh();
      } else {
        // OTP challenge required
        setChallengeId(result.challengeId!);
        setEmailHint(result.emailHint!);
        setOtp('');
        setError(null);
        setMode('otp');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // OTP verify handler
  // ---------------------------------------------------------------------------
  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await verifyPhoneOtp(challengeId, otp);
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Email login handler (existing logic, verbatim)
  // ---------------------------------------------------------------------------
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Ensure user has a payment gate (create if missing)
    try {
      const gateResponse = await fetch('/api/gate/ensure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const gateData = await gateResponse.json();
      if (gateResponse.ok) {
        if (gateData.created) {
          console.log('Wallet created on login! Gate ID:', gateData.gate_id);
        } else if (gateData.wasExisting) {
          console.log('Existing wallet linked. Gate ID:', gateData.gate_id);
        } else if (gateData.hasGate) {
          console.log('Wallet already exists. Gate ID:', gateData.gate_id);
        }
      } else {
        console.error('Wallet check failed (non-blocking):', gateData.error);
      }
    } catch (gateError) {
      console.error('Wallet check error (non-blocking):', gateError);
    }

    router.push('/');
    router.refresh();
  };

  // ---------------------------------------------------------------------------
  // Render: Phone mode
  // ---------------------------------------------------------------------------
  if (mode === 'phone') {
    return (
      <AuthLayout variant="access">
        <div className="w-full max-w-sm">
          <h2 className="text-3xl font-bold text-foreground mb-2">Welcome back</h2>
          <p className="text-muted-foreground mb-8">Sign in to continue</p>

          <form onSubmit={handlePhoneLogin}>
            <div className="mb-5">
              <label className="block text-sm font-medium text-foreground mb-2" htmlFor="phone">
                Phone or email
              </label>
              <div className="onboarding-input-shell">
                <UserRound aria-hidden="true" />
                <input
                  id="phone"
                  type="text"
                  inputMode="email"
                  autoComplete="username"
                  placeholder="0701 234 567 or you@example.com"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-2" htmlFor="pin">
                Password
              </label>
              <div className="onboarding-input-shell">
                <LockKeyhole aria-hidden="true" />
                <input
                id="pin"
                type={showPassword ? "text" : "password"}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>
            <div className="onboarding-access__forgot">
              <Link href="/forgot-password">Forgot password?</Link>
            </div>
            {error && <p className="text-destructive text-sm text-center mb-4">{error}</p>}
            <div className="mb-6">
              <button
                className="w-full bg-primary text-primary-foreground font-bold py-3 px-4 rounded-lg hover:bg-primary/90 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:opacity-60"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </div>
            <div className="onboarding-access__divider"><span>or</span></div>
            <button
              type="button"
              className="onboarding-passkey"
              onClick={() => setError('Sign in once on this device before using your enrolled passkey.')}
            >
              <span aria-hidden="true">●◆</span>
              Use a passkey
            </button>
            <p className="sr-only">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-semibold text-primary hover:underline">
                Sign Up
              </Link>
            </p>
            <p className="sr-only">
              <button
                type="button"
                onClick={() => { setError(null); setMode('email'); }}
                className="text-primary hover:underline"
              >
                Other login options
              </button>
            </p>
          </form>
        </div>
      </AuthLayout>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: OTP mode
  // ---------------------------------------------------------------------------
  if (mode === 'otp') {
    return (
      <AuthLayout variant="access">
        <div className="w-full max-w-sm">
          <h2 className="text-3xl font-bold text-foreground mb-2">Check your email</h2>
          <p className="text-muted-foreground mb-8">Sent to {emailHint}</p>

          <form onSubmit={handleOtpVerify}>
            <div className="mb-6 flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(value) => setOtp(value)}
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
            {error && <p className="text-destructive text-sm text-center mb-4">{error}</p>}
            <div className="mb-6">
              <button
                className="w-full bg-primary text-primary-foreground font-bold py-3 px-4 rounded-lg hover:bg-primary/90 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:opacity-60"
                type="submit"
                disabled={loading || otp.length < 6}
              >
                {loading ? 'Verifying…' : 'Verify'}
              </button>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              <button
                type="button"
                onClick={() => { setError(null); setOtp(''); setMode('phone'); }}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            </p>
          </form>
        </div>
      </AuthLayout>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Email mode (verbatim existing form)
  // ---------------------------------------------------------------------------
  return (
    <AuthLayout variant="access">
      <div className="w-full max-w-sm">
        <h2 className="text-3xl font-bold text-foreground mb-2">Welcome Back</h2>
        <p className="text-muted-foreground mb-8">Sign in with your email and password</p>

        <form onSubmit={handleEmailLogin}>
          <div className="mb-5">
            <label className="block text-sm font-medium text-foreground mb-2" htmlFor="email">
              Email
            </label>
            <input
              className="w-full py-3 px-4 bg-input text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-300 placeholder:text-muted-foreground"
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-foreground" htmlFor="password">
                Password
              </label>
              <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <input
                className="w-full py-3 px-4 pr-12 bg-input text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-300 placeholder:text-muted-foreground"
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          {error && <p className="text-destructive text-sm text-center mb-4">{error}</p>}
          <div className="mb-6">
            <button
              className="w-full bg-primary text-primary-foreground font-bold py-3 px-4 rounded-lg hover:bg-primary/90 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:opacity-60"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </div>
          <p className="text-center text-sm text-muted-foreground mb-4">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Sign Up
            </Link>
          </p>
          <p className="text-center text-sm text-muted-foreground">
            <button
              type="button"
              onClick={() => { setError(null); setMode('phone'); }}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to phone login
            </button>
          </p>
        </form>
      </div>
    </AuthLayout>
  );
}
