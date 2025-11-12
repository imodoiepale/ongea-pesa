'use client';

import { useEffect } from 'react';
import { useEnsureGate } from '@/app/hooks/useEnsureGate';

interface GateEnsurerProps {
  children: React.ReactNode;
  showLoading?: boolean;
  onGateCreated?: (gateId: number, gateName: string) => void;
}

/**
 * Component that ensures the user has a gate before rendering children
 * Use this to wrap components that require gate functionality
 * 
 * Example:
 * <GateEnsurer>
 *   <WalletDashboard />
 * </GateEnsurer>
 */
export default function GateEnsurer({ 
  children, 
  showLoading = true,
  onGateCreated 
}: GateEnsurerProps) {
  const { hasGate, gate_id, gate_name, loading, error, created, checkAndCreateGate } = useEnsureGate();

  useEffect(() => {
    if (created && gate_id && gate_name && onGateCreated) {
      onGateCreated(gate_id, gate_name);
    }
  }, [created, gate_id, gate_name, onGateCreated]);

  if (loading && showLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Setting up your wallet...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Wallet Setup Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => checkAndCreateGate()}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!hasGate && !loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-yellow-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Wallet Not Ready</h2>
          <p className="text-muted-foreground mb-4">
            Your payment gateway is not set up. Click below to initialize it.
          </p>
          <button
            onClick={() => checkAndCreateGate()}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90"
          >
            Setup Wallet
          </button>
        </div>
      </div>
    );
  }

  // Gate exists, render children
  return <>{children}</>;
}
