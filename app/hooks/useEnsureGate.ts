'use client';

import { useState, useEffect } from 'react';

interface GateStatus {
  hasGate: boolean;
  gate_id: number | null;
  gate_name: string | null;
  loading: boolean;
  error: string | null;
  created?: boolean;
}

/**
 * Hook to ensure the current user has a payment gate
 * Automatically checks and creates a gate if missing
 * 
 * @param autoCheck - Whether to automatically check on mount (default: true)
 * @returns Gate status and control functions
 */
export function useEnsureGate(autoCheck: boolean = true) {
  const [status, setStatus] = useState<GateStatus>({
    hasGate: false,
    gate_id: null,
    gate_name: null,
    loading: autoCheck,
    error: null,
  });

  const checkAndCreateGate = async () => {
    setStatus(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/gate/ensure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to ensure gate');
      }

      setStatus({
        hasGate: data.hasGate,
        gate_id: data.gate_id,
        gate_name: data.gate_name,
        loading: false,
        error: null,
        created: data.created,
      });

      return data;
    } catch (error: any) {
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to ensure gate',
      }));
      throw error;
    }
  };

  const checkGateStatus = async () => {
    try {
      const response = await fetch('/api/gate/ensure', {
        method: 'GET',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check gate status');
      }

      setStatus(prev => ({
        ...prev,
        hasGate: data.hasGate,
        gate_id: data.gate_id,
        gate_name: data.gate_name,
        loading: false,
      }));

      return data;
    } catch (error: any) {
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to check gate status',
      }));
      throw error;
    }
  };

  useEffect(() => {
    if (autoCheck) {
      checkAndCreateGate();
    }
  }, [autoCheck]);

  return {
    ...status,
    checkAndCreateGate,
    checkGateStatus,
    refresh: checkGateStatus,
  };
}
