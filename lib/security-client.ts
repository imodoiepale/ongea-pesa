'use client';

import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { createClient } from '@/lib/supabase/client';

// ---------------------------------------------------------------------------
// Phone-login result shape
// ---------------------------------------------------------------------------

export interface StartPhoneLoginResult {
  success: true;
  otpRequired: boolean;
  challengeId?: string;
  emailHint?: string;
  token_hash?: string;
  type?: string;
}

// Client helpers for the security layer. All return data or throw on error.

export async function setPin(pin: string, currentPin?: string): Promise<void> {
  const res = await fetch('/api/security/pin/set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin, currentPin }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to set PIN');
}

/** Verify PIN → returns a step-up token to authorize a payment. */
export async function verifyPinForStepUp(pin: string): Promise<string> {
  const res = await fetch('/api/security/pin/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'PIN verification failed');
  return data.stepupToken as string;
}

/** Enroll a device passkey (Face/Touch ID). */
export async function enrollPasskey(deviceLabel?: string): Promise<void> {
  const optRes = await fetch('/api/security/passkey/register/options', { method: 'POST' });
  if (!optRes.ok) throw new Error((await optRes.json()).error || 'Failed to start enrollment');
  const options = await optRes.json();

  const attResp = await startRegistration({ optionsJSON: options });

  const verifyRes = await fetch('/api/security/passkey/register/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ response: attResp, deviceLabel }),
  });
  if (!verifyRes.ok) throw new Error((await verifyRes.json()).error || 'Passkey enrollment failed');
}

/** Authenticate with a device passkey → returns a step-up token. */
export async function verifyPasskeyForStepUp(): Promise<string> {
  const optRes = await fetch('/api/security/passkey/auth/options', { method: 'POST' });
  if (!optRes.ok) throw new Error((await optRes.json()).error || 'Failed to start verification');
  const options = await optRes.json();

  const authResp = await startAuthentication({ optionsJSON: options });

  const verifyRes = await fetch('/api/security/passkey/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ response: authResp }),
  });
  const data = await verifyRes.json();
  if (!verifyRes.ok) throw new Error(data.error || 'Passkey verification failed');
  return data.stepupToken as string;
}

/**
 * Obtain a step-up token before a payment. Tries passkey first (if the user has
 * one and the platform supports it), otherwise falls back to PIN via the
 * provided prompt callback.
 */
export async function getStepUpToken(opts?: { preferPasskey?: boolean; pin?: string }): Promise<string> {
  if (opts?.preferPasskey) {
    try {
      return await verifyPasskeyForStepUp();
    } catch {
      // fall through to PIN
    }
  }
  if (opts?.pin) return verifyPinForStepUp(opts.pin);
  throw new Error('Step-up authentication required (PIN or passkey)');
}

// ---------------------------------------------------------------------------
// Phone login helpers
// ---------------------------------------------------------------------------

/** Start phone-based login — verifies PIN server-side and returns an OTP challenge if required. */
export async function startPhoneLogin(phone: string, pin: string): Promise<StartPhoneLoginResult> {
  const res = await fetch('/api/auth/phone/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, pin }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data as StartPhoneLoginResult;
}

/** Verify the OTP code for phone login, then establish a Supabase session and ensure a payment gate. */
export async function verifyPhoneOtp(challengeId: string, code: string): Promise<void> {
  const res = await fetch('/api/auth/phone/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId, code }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'OTP verification failed');

  const { token_hash, type } = data;
  await createClient().auth.verifyOtp({ type: type as any, token_hash });

  // Non-blocking: ensure the user has a payment gate (mirrors app/login/page.tsx)
  try {
    await fetch('/api/gate/ensure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
  } catch {
    // ignore — gate creation failure must not block login
  }
}

/** Begin adding a phone number to an existing account — returns challengeId and masked emailHint. */
export async function startPhoneSetup(phone: string, pin: string): Promise<{ challengeId: string; emailHint: string }> {
  const res = await fetch('/api/auth/phone/setup/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, pin }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Phone setup failed');
  return { challengeId: data.challengeId, emailHint: data.emailHint };
}

/** Verify the OTP for phone setup and confirm the phone number is now linked. */
export async function verifyPhoneSetup(challengeId: string, code: string, phone: string): Promise<{ phone: string }> {
  const res = await fetch('/api/auth/phone/setup/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId, code, phone }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Phone setup verification failed');
  return { phone: data.phone as string };
}

/** Enable or disable email-OTP as a second factor for the current user. */
export async function setEmailOtpEnabled(enabled: boolean): Promise<void> {
  const res = await fetch('/api/auth/security/email-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to update email OTP setting');
}
