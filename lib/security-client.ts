'use client';

import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

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
export async function enrollPasskey(deviceLabel?: string, modality?: string): Promise<void> {
  const optRes = await fetch('/api/security/passkey/register/options', { method: 'POST' });
  if (!optRes.ok) throw new Error((await optRes.json()).error || 'Failed to start enrollment');
  const options = await optRes.json();

  const attResp = await startRegistration({ optionsJSON: options });

  const verifyRes = await fetch('/api/security/passkey/register/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ response: attResp, deviceLabel, modality }),
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

export async function enrollFace(): Promise<void> {
  return enrollPasskey('Face ID', 'face');
}

export async function enrollFingerprint(): Promise<void> {
  return enrollPasskey('Fingerprint', 'fingerprint');
}

export async function listBiometrics(): Promise<Array<{
  id: string;
  device_label: string | null;
  modality: string | null;
  last_used_at: string | null;
  created_at: string | null;
}>> {
  const res = await fetch('/api/security/passkey/list', { method: 'GET' });
  if (!res.ok) throw new Error('Failed to list biometrics');
  const data = await res.json();
  return data.credentials;
}

export async function revokeBiometric(id: string): Promise<void> {
  const res = await fetch(`/api/security/passkey/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to revoke biometric');
  }
}
