'use client';

import { useState, useCallback } from 'react';

export type StepUpModalState = 'closed' | 'open' | 'loading' | 'error';

export interface UseStepUpReturn {
  isOpen: boolean;
  openStepUp: () => void;
  closeStepUp: () => void;
  resolvedToken: string | null;
  error: string | null;
  onTokenResolved: (token: string) => void;
  onError: (error: string) => void;
}

export function useStepUp(): UseStepUpReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [resolvedToken, setResolvedToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openStepUp = useCallback(() => {
    setResolvedToken(null);
    setError(null);
    setIsOpen(true);
  }, []);

  const closeStepUp = useCallback(() => {
    setIsOpen(false);
  }, []);

  const onTokenResolved = useCallback((token: string) => {
    setResolvedToken(token);
    setIsOpen(false);
  }, []);

  const onError = useCallback((err: string) => {
    setError(err);
  }, []);

  return { isOpen, openStepUp, closeStepUp, resolvedToken, error, onTokenResolved, onError };
}
