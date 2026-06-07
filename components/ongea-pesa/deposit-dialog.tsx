'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Wallet, Phone, DollarSign, Loader2, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useTransactionPolling } from '@/hooks/use-transaction-polling';

type DepositRail = 'indexpay' | 'daraja';

interface DepositDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (amount: number) => void;
}

export default function DepositDialog({ isOpen, onClose, onSuccess }: DepositDialogProps) {
  const [rail, setRail] = useState<DepositRail>('indexpay');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [gateName, setGateName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState<number>(0);

  // ── Daraja polling state ───────────────────────────────────────────────────
  const [darajaPolling, setDarajaPolling] = useState(false);
  const [darajaAttempts, setDarajaAttempts] = useState(0);
  const darajaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const darajaTxId = useRef<string | null>(null);

  const stopDarajaPolling = useCallback(() => {
    if (darajaTimerRef.current) {
      clearTimeout(darajaTimerRef.current);
      darajaTimerRef.current = null;
    }
    setDarajaPolling(false);
    darajaTxId.current = null;
  }, []);

  const startDarajaPolling = useCallback(
    (txId: string, paidAmount: number) => {
      darajaTxId.current = txId;
      setDarajaPolling(true);
      setDarajaAttempts(0);
      let attempts = 0;
      const MAX_ATTEMPTS = 60; // 5 minutes

      const poll = async () => {
        if (!darajaTxId.current) return;
        attempts += 1;
        setDarajaAttempts(attempts);

        try {
          const res = await fetch('/api/daraja/stk-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transaction_id: txId }),
          });
          const data = await res.json();

          if (data.status === 'completed') {
            stopDarajaPolling();
            setSuccess('Payment confirmed! Your wallet has been credited.');
            setLoading(false);
            onSuccess?.(paidAmount);
            setTimeout(() => {
              onClose();
              setSuccess('');
            }, 3000);
            return;
          }

          if (data.status === 'failed') {
            stopDarajaPolling();
            setError(data.error_message || 'Transaction failed. Please try again.');
            setLoading(false);
            return;
          }
        } catch {
          // Network blip — keep polling
        }

        if (attempts >= MAX_ATTEMPTS) {
          stopDarajaPolling();
          setSuccess(
            'Transaction is taking longer than expected. Check your M-Pesa messages or wallet balance.'
          );
          setLoading(false);
          onSuccess?.(paidAmount);
          return;
        }

        darajaTimerRef.current = setTimeout(poll, 5000);
      };

      poll();
    },
    [stopDarajaPolling, onClose, onSuccess]
  );

  // Transaction polling hook
  const polling = useTransactionPolling({
    transactionId: transactionId || '',
    gateName: gateName,
    enabled: !!transactionId && !!gateName,
    maxAttempts: 60, // 5 minutes
    intervalMs: 5000, // Check every 5 seconds
    onSuccess: (data) => {
      setSuccess('✅ Payment confirmed! Your wallet has been credited.');
      setLoading(false);
      
      if (onSuccess) {
        onSuccess(depositAmount);
      }

      // Close dialog after showing success
      setTimeout(() => {
        onClose();
        setSuccess('');
        setTransactionId(null);
      }, 3000);
    },
    onFailure: (message) => {
      setError(message || '❌ Transaction failed. Please try again.');
      setLoading(false);
      setTransactionId(null);
    },
    onTimeout: () => {
      setSuccess('⏱️ Transaction is taking longer than expected. Check your M-Pesa messages or wallet balance.');
      setLoading(false);
      setTransactionId(null);
      
      // Still notify success callback as transaction might succeed
      if (onSuccess) {
        onSuccess(depositAmount);
      }
    },
  });

  useEffect(() => {
    if (isOpen) {
      loadUserProfile();
    } else {
      // Stop Daraja polling if dialog is closed externally
      stopDarajaPolling();
    }
  }, [isOpen, stopDarajaPolling]);

  const loadUserProfile = async () => {
    try {
      setLoadingProfile(true);
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('mpesa_number, gate_name')
        .eq('id', user.id)
        .single();

      if (profile) {
        setPhone(profile.mpesa_number || '');
        setGateName(profile.gate_name || '');
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  // ── IndexPay (existing) deposit handler ───────────────────────────────────
  const handleIndexPayDeposit = async (amountValue: number) => {
    const response = await fetch('/api/gate/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amountValue, phone }),
    });

    const data = await response.json();

    if (response.ok) {
      setSuccess('M-Pesa prompt sent! Waiting for payment confirmation...');
      setAmount('');
      setDepositAmount(amountValue);

      if (data.transaction_id) {
        setTransactionId(data.transaction_id);
        // useTransactionPolling hook takes over from here
      } else {
        setLoading(false);
        onSuccess?.(amountValue);
        setTimeout(() => { onClose(); setSuccess(''); }, 3000);
      }
    } else {
      setError(data.error || 'Failed to initiate deposit');
      setLoading(false);
    }
  };

  // ── M-Pesa Direct (Daraja STK) deposit handler ────────────────────────────
  const handleDarajaDeposit = async (amountValue: number) => {
    const response = await fetch('/api/daraja/stk-deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amountValue, phone }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      setSuccess('M-Pesa prompt sent! Waiting for payment confirmation...');
      setAmount('');
      startDarajaPolling(data.transaction_id, amountValue);
    } else {
      setError(data.error || 'Failed to initiate M-Pesa STK push');
      setLoading(false);
    }
  };

  // ── Shared submit handler ─────────────────────────────────────────────────
  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const amountValue = parseFloat(amount);

      if (isNaN(amountValue) || amountValue <= 0) {
        setError('Please enter a valid amount greater than 0');
        setLoading(false);
        return;
      }

      if (amountValue < 10) {
        setError('Minimum deposit amount is KSh 10');
        setLoading(false);
        return;
      }

      if (!phone) {
        setError('Please enter your M-Pesa phone number');
        setLoading(false);
        return;
      }

      if (rail === 'daraja') {
        await handleDarajaDeposit(amountValue);
      } else {
        await handleIndexPayDeposit(amountValue);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, '');
    
    // Format as user types
    if (cleaned.startsWith('254')) {
      return cleaned.slice(0, 12);
    } else if (cleaned.startsWith('0')) {
      return cleaned.slice(0, 10);
    }
    return cleaned.slice(0, 10);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-brand p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-xl">
              <Wallet className="text-white" size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Deposit Funds</h2>
              <p className="text-white/80 text-sm">Add money to your wallet</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleDeposit} className="p-6 space-y-5">
          {loadingProfile ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-brand" size={32} />
            </div>
          ) : (
            <>
              {/* Rail Selector */}
              <div className="flex gap-2 p-1 bg-muted rounded-xl">
                <button
                  type="button"
                  onClick={() => { setRail('indexpay'); setError(''); setSuccess(''); }}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${
                    rail === 'indexpay'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Wallet Top-up
                </button>
                <button
                  type="button"
                  onClick={() => { setRail('daraja'); setError(''); setSuccess(''); }}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${
                    rail === 'daraja'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  M-Pesa Direct
                </button>
              </div>

              {/* Gate Name Display (IndexPay only) */}
              {gateName && rail === 'indexpay' && (
                <div className="bg-brand/10 border border-brand/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-brand">
                    <Wallet size={18} />
                    <span className="text-sm font-medium">Your Gate</span>
                  </div>
                  <p className="text-lg font-bold text-foreground mt-1">
                    {gateName}
                  </p>
                </div>
              )}

              {/* Phone Number Input */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  M-Pesa Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="0712345678"
                    className="w-full pl-11 pr-4 py-3 border border-border/60 rounded-xl focus:ring-2 focus:ring-brand focus:border-transparent bg-card text-foreground"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This number will be saved as your default
                </p>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Amount (KSh)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="100"
                    min="10"
                    step="1"
                    className="w-full pl-11 pr-4 py-3 border border-border/60 rounded-xl focus:ring-2 focus:ring-brand focus:border-transparent bg-card text-foreground"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum: KSh 10
                </p>
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[50, 100, 500, 1000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset.toString())}
                    className="py-2 px-3 text-sm font-medium text-brand bg-brand/5 hover:bg-brand/10 rounded-lg transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="bg-brand/10 border border-brand/20 rounded-xl p-3">
                  <p className="text-sm text-brand">{success}</p>
                </div>
              )}

              {/* Polling Status — IndexPay */}
              {rail === 'indexpay' && polling.isPolling && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <Clock className="animate-pulse text-blue-600" size={18} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                        Checking transaction status...
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                        Attempt {polling.attempts} - This usually takes 10-30 seconds
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Polling Status — Daraja */}
              {rail === 'daraja' && darajaPolling && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <Clock className="animate-pulse text-blue-600" size={18} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                        Checking transaction status...
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                        Attempt {darajaAttempts} - This usually takes 10-30 seconds
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || (rail === 'indexpay' && !gateName)}
                className="w-full py-3 px-4 bg-brand hover:bg-brand/90 active:scale-[0.97] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Processing...
                  </>
                ) : (
                  <>
                    <Wallet size={20} />
                    {rail === 'daraja' ? 'Pay via M-Pesa Direct' : 'Deposit via M-Pesa'}
                  </>
                )}
              </button>

              {/* Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
                <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                  {rail === 'daraja'
                    ? 'M-Pesa Direct uses Safaricom Daraja. You will receive an STK push on your phone. Enter your M-Pesa PIN to complete the transaction. Funds will reflect in your wallet once confirmed.'
                    : 'You will receive an M-Pesa prompt on your phone. Enter your M-Pesa PIN to complete the transaction. Funds will reflect in your wallet instantly.'}
                </p>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
