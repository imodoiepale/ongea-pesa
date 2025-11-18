'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import AuthLayout from '@/components/auth/auth-layout';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validToken, setValidToken] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if we have a valid session (user clicked the reset link)
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setValidToken(true);
      } else {
        setError('Invalid or expired reset link. Please request a new one.');
      }
    };

    checkSession();
  }, []);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    }
  };

  if (!validToken && error) {
    return (
      <AuthLayout>
        <div className="w-full max-w-sm">
          <div className="text-center bg-secondary p-8 rounded-lg">
            <div className="mb-4">
              <svg
                className="w-16 h-16 mx-auto text-destructive"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Invalid Link</h3>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link
              href="/forgot-password"
              className="inline-block w-full bg-primary text-primary-foreground font-bold py-3 px-4 rounded-lg hover:bg-primary/90 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            >
              Request New Link
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-sm">
        <h2 className="text-3xl font-bold text-foreground mb-2">Set New Password</h2>
        <p className="text-muted-foreground mb-8">
          Please enter your new password below.
        </p>
        
        {success ? (
          <div className="text-center bg-secondary p-8 rounded-lg">
            <div className="mb-4">
              <svg
                className="w-16 h-16 mx-auto text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Password Updated!</h3>
            <p className="text-muted-foreground mb-6">
              Your password has been successfully reset. You will be redirected to the login page shortly.
            </p>
            <Link
              href="/login"
              className="inline-block w-full bg-primary text-primary-foreground font-bold py-3 px-4 rounded-lg hover:bg-primary/90 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            >
              Continue to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handlePasswordReset}>
            <div className="mb-5">
              <label className="block text-sm font-medium text-foreground mb-2" htmlFor="password">
                New Password
              </label>
              <div className="relative">
                <input
                  className="w-full py-3 px-4 pr-12 bg-input text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-300 placeholder:text-muted-foreground"
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Must be at least 6 characters long
              </p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-2" htmlFor="confirmPassword">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  className="w-full py-3 px-4 pr-12 bg-input text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-300 placeholder:text-muted-foreground"
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  disabled={loading}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive rounded-lg">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}
            
            <div className="mb-6">
              <button
                className="w-full bg-primary text-primary-foreground font-bold py-3 px-4 rounded-lg hover:bg-primary/90 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
            
            <p className="text-center text-sm text-muted-foreground">
              Remember your password?{' '}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                Sign In
              </Link>
            </p>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
