"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function Settings() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="biometric-auth">Enable Biometric Authentication</Label>
            <Switch id="biometric-auth" />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="two-factor-auth">Enable Two-Factor Authentication</Label>
            <Switch id="two-factor-auth" defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="push-notifications">Enable Push Notifications</Label>
            <Switch id="push-notifications" defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="email-notifications">Enable Email Notifications</Label>
            <Switch id="email-notifications" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
