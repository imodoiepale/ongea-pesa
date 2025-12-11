'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthLayout from '@/components/auth/auth-layout';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-sm">
        <h2 className="text-3xl font-bold text-foreground mb-2">Reset Password</h2>
        <p className="text-muted-foreground mb-8">
          Enter your email address and we'll send you a link to reset your password.
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
            <h3 className="text-xl font-semibold text-foreground mb-2">Check Your Email</h3>
            <p className="text-muted-foreground mb-6">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Didn't receive the email? Check your spam folder or try again.
            </p>
            <Link
              href="/login"
              className="inline-block w-full bg-primary text-primary-foreground font-bold py-3 px-4 rounded-lg hover:bg-primary/90 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleResetRequest}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-2" htmlFor="email">
                Email Address
              </label>
              <input
                className="w-full py-3 px-4 bg-input text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-300 placeholder:text-muted-foreground"
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
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
                {loading ? 'Sending...' : 'Send Reset Link'}
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
