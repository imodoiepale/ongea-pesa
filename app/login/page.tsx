'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthLayout from '@/components/auth/auth-layout';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      return;
    }

    // Ensure user has a payment gate (create if missing)
    try {
      console.log('🔍 Checking wallet for user:', email);
      
      const gateResponse = await fetch('/api/gate/ensure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const gateData = await gateResponse.json();

      if (gateResponse.ok) {
        if (gateData.created) {
          console.log('🎉 Wallet created on login!');
          console.log('Gate ID:', gateData.gate_id);
          console.log('Gate Name:', gateData.gate_name);
        } else if (gateData.wasExisting) {
          console.log('🔗 Existing wallet linked successfully!');
          console.log('Gate ID:', gateData.gate_id);
          console.log('Gate Name:', gateData.gate_name);
        } else if (gateData.hasGate) {
          console.log('✅ Wallet already exists');
          console.log('Gate ID:', gateData.gate_id);
          console.log('Gate Name:', gateData.gate_name);
        } else {
          console.warn('⚠️ Wallet not ready:', gateData.message);
        }
      } else {
        console.error('❌ Wallet check failed (non-blocking):', gateData.error);
        // Don't fail login if gate creation fails
      }
    } catch (gateError) {
      console.error('⚠️ Wallet check error (non-blocking):', gateError);
      // Don't fail login if gate check fails
    }

    // Proceed to home page
    router.push('/');
    router.refresh();
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-sm">
        <h2 className="text-3xl font-bold text-foreground mb-2">Welcome Back</h2>
        <p className="text-muted-foreground mb-8">Sign in to continue to your account.</p>
        
        <form onSubmit={handleLogin}>
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
            <input
              className="w-full py-3 px-4 bg-input text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-300 placeholder:text-muted-foreground"
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-destructive text-sm text-center mb-4">{error}</p>}
          <div className="mb-6">
            <button
              className="w-full bg-primary text-primary-foreground font-bold py-3 px-4 rounded-lg hover:bg-primary/90 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              type="submit"
            >
              Sign In
            </button>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Sign Up
            </Link>
          </p>
        </form>
      </div>
    </AuthLayout>
  );
}
