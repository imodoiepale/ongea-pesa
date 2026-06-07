"use client"

import { useState, useEffect } from 'react';
import { ScreenShell } from "@/components/foundation"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { listBiometrics, getVoiceStatus } from '@/lib/security-client';

export default function Settings() {
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      try {
        const [creds, voiceStatus] = await Promise.all([
          listBiometrics().catch(() => []),
          getVoiceStatus().catch(() => ({ enrolled: false, profile: null })),
        ]);
        setBiometricEnabled(creds.length > 0 || voiceStatus.enrolled);
      } catch {
        setBiometricEnabled(false);
      } finally {
        setLoading(false);
      }
    }
    check();
  }, []);

  return (
    <div className="min-h-[100dvh] bg-background surface-money pb-24">
      <ScreenShell>
        <div className="pt-6 mb-6">
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Preferences & security</p>
        </div>

        {/* Security */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Security</p>
          <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40">
            <div className="flex items-center justify-between px-4 py-3.5">
              <Label htmlFor="biometric-auth" className="text-sm font-medium text-foreground cursor-pointer">
                Biometric Authentication
              </Label>
              <Switch
                id="biometric-auth"
                checked={biometricEnabled}
                disabled={loading}
                onCheckedChange={(checked) => {
                  // Toggle is read-only from here — enrollment happens in Security Setup.
                  // If turning off, direct users to Security Setup for credential management.
                  if (!checked) {
                    console.log('To disable biometrics, manage them in Security Setup');
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <Label htmlFor="two-factor-auth" className="text-sm font-medium text-foreground cursor-pointer">
                Two-Factor Authentication
              </Label>
              <Switch id="two-factor-auth" defaultChecked />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Notifications</p>
          <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40">
            <div className="flex items-center justify-between px-4 py-3.5">
              <Label htmlFor="push-notifications" className="text-sm font-medium text-foreground cursor-pointer">
                Push Notifications
              </Label>
              <Switch id="push-notifications" defaultChecked />
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <Label htmlFor="email-notifications" className="text-sm font-medium text-foreground cursor-pointer">
                Email Notifications
              </Label>
              <Switch id="email-notifications" />
            </div>
          </div>
        </div>
      </ScreenShell>
    </div>
  )
}
