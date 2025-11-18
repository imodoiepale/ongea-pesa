import { useState, useEffect, useCallback, useRef } from 'react';

interface PollingOptions {
  transactionId: string;
  gateName: string;
  enabled?: boolean;
  maxAttempts?: number;
  intervalMs?: number;
  onSuccess?: (data: any) => void;
  onFailure?: (message: string) => void;
  onTimeout?: () => void;
}

interface PollingState {
  status: 'idle' | 'polling' | 'completed' | 'failed' | 'timeout';
  message: string | null;
  attempts: number;
  data: any | null;
}

/**
 * Custom hook for polling transaction status
 * Automatically checks transaction status until completion or timeout
 */
export function useTransactionPolling(options: PollingOptions) {
  const {
    transactionId,
    gateName,
    enabled = true,
    maxAttempts = 60,
    intervalMs = 5000,
    onSuccess,
    onFailure,
    onTimeout,
  } = options;

  const [state, setState] = useState<PollingState>({
    status: 'idle',
    message: null,
    attempts: 0,
    data: null,
  });

  const attemptsRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  /**
   * Check transaction status once
   */
  const checkStatus = useCallback(async () => {
    if (!transactionId || !gateName) {
      return null;
    }

    try {
      const response = await fetch('/api/gate/check-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_id: transactionId,
          gate_name: gateName,
        }),
      });

      if (!response.ok) {
        console.warn(`⚠️ Status check failed: ${response.status}`);
        return null;
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Status check error:', error);
      return null;
    }
  }, [transactionId, gateName]);

  /**
   * Start polling
   */
  const startPolling = useCallback(() => {
    if (isPollingRef.current || !enabled || !transactionId || !gateName) {
      return;
    }

    console.log('🔄 Starting transaction polling');
    isPollingRef.current = true;
    attemptsRef.current = 0;

    setState({
      status: 'polling',
      message: 'Checking transaction status...',
      attempts: 0,
      data: null,
    });

    const poll = async () => {
      if (!isPollingRef.current) {
        return;
      }

      attemptsRef.current += 1;

      console.log(`📡 Polling attempt ${attemptsRef.current}/${maxAttempts}`);

      setState(prev => ({
        ...prev,
        attempts: attemptsRef.current,
      }));

      const result = await checkStatus();

      if (result) {
        if (result.status === 'completed') {
          console.log('✅ Transaction completed!');
          isPollingRef.current = false;
          
          setState({
            status: 'completed',
            message: result.message || 'Transaction completed successfully',
            attempts: attemptsRef.current,
            data: result.data,
          });

          if (onSuccess) {
            onSuccess(result.data);
          }
          return;
        }

        if (result.status === 'failed') {
          console.log('❌ Transaction failed');
          isPollingRef.current = false;
          
          setState({
            status: 'failed',
            message: result.message || 'Transaction failed',
            attempts: attemptsRef.current,
            data: result.data,
          });

          if (onFailure) {
            onFailure(result.message);
          }
          return;
        }
      }

      // Check if max attempts reached
      if (attemptsRef.current >= maxAttempts) {
        console.warn('⏱️ Polling timeout');
        isPollingRef.current = false;
        
        setState({
          status: 'timeout',
          message: 'Transaction status check timed out. Please check your M-Pesa messages.',
          attempts: attemptsRef.current,
          data: null,
        });

        if (onTimeout) {
          onTimeout();
        }
        return;
      }

      // Schedule next poll
      timeoutRef.current = setTimeout(poll, intervalMs);
    };

    // Start first poll
    poll();
  }, [enabled, transactionId, gateName, maxAttempts, intervalMs, checkStatus, onSuccess, onFailure, onTimeout]);

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    console.log('⏹️ Stopping transaction polling');
    isPollingRef.current = false;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /**
   * Reset polling state
   */
  const resetPolling = useCallback(() => {
    stopPolling();
    attemptsRef.current = 0;
    setState({
      status: 'idle',
      message: null,
      attempts: 0,
      data: null,
    });
  }, [stopPolling]);

  // Auto-start polling when enabled
  useEffect(() => {
    if (enabled && transactionId && gateName && state.status === 'idle') {
      startPolling();
    }

    // Cleanup on unmount
    return () => {
      stopPolling();
    };
  }, [enabled, transactionId, gateName, state.status, startPolling, stopPolling]);

  return {
    ...state,
    isPolling: state.status === 'polling',
    isCompleted: state.status === 'completed',
    isFailed: state.status === 'failed',
    isTimeout: state.status === 'timeout',
    startPolling,
    stopPolling,
    resetPolling,
    checkStatus,
  };
}
