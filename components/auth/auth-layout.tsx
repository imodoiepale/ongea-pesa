'use client';

import React from 'react';

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen w-full flex bg-secondary">
      {/* Left side: Graphic and Branding */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-primary p-12">
        <div className="text-left">
          <h1 className="font-bold text-5xl text-primary-foreground mb-4 leading-tight">Ongea-Pesa</h1>
          <p className="text-xl text-primary-foreground/80">
            The future of transactions, spoken into existence.
          </p>
          <div className="mt-8 h-1 w-24 bg-secondary rounded-full"></div>
        </div>
      </div>

      {/* Right side: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
