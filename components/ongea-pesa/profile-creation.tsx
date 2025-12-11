// components/ongea-pesa/profile-creation.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera } from 'lucide-react';

export function ProfileCreationScreen() {
  const router = useRouter();

  const handleFinishOnboarding = () => {
    // TODO: Save profile data to the backend
    router.push('/dashboard'); // Navigate to the main app dashboard
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-white dark:bg-black rounded-xl shadow-lg">
      <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-white">Create Your Profile</h1>
      <p className="text-md text-center text-gray-500 dark:text-gray-400 mt-2 mb-8">
        Finally, let's get to know you.
      </p>

      <div className="flex justify-center mb-8">
        <div className="relative">
          <Avatar className="w-24 h-24">
            <AvatarImage src="/placeholder-user.jpg" alt="User Avatar" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <Button size="icon" className="absolute bottom-0 right-0 rounded-full">
            <Camera className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <form className="space-y-4">
        <div>
          <Label htmlFor="fullName">Full Name</Label>
          <Input id="fullName" placeholder="e.g., Juma Otieno" />
        </div>
        <div>
          <Label htmlFor="phone">Phone Number</Label>
          <Input id="phone" type="tel" placeholder="+254 712 345 678" />
        </div>
        <div>
          <Label htmlFor="language">Preferred Language</Label>
          <Input id="language" placeholder="English, Swahili, or Sheng" />
        </div>
      </form>

      <div className="mt-8">
        <Button onClick={handleFinishOnboarding} className="w-full" size="lg">
          Finish & Enter App
        </Button>
      </div>
    </div>
  );
}
