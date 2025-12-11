// app/(onboarding)/layout.tsx

import React from 'react';

interface OnboardingLayoutProps {
  children: React.ReactNode;
}

export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* TODO: Add a progress indicator for onboarding steps */}
      <main className="flex-grow flex items-center justify-center p-4">
        {children}
      </main>
    </div>
  );
}
