'use client';

import { useState, useEffect } from 'react';
import { X, Wallet, Phone, DollarSign, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useTransactionPolling } from '@/hooks/use-transaction-polling';

interface DepositDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (amount: number) => void;
}

export default function DepositDialog({ isOpen, onClose, onSuccess }: DepositDialogProps) {
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [gateName, setGateName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState<number>(0);

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
    }
  }, [isOpen]);

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

      const response = await fetch('/api/gate/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountValue,
          phone: phone,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('📱 M-Pesa prompt sent! Waiting for payment confirmation...');
        setAmount('');
        setDepositAmount(amountValue);
        
        // Start polling if transaction ID is available
        if (data.transaction_id) {
          setTransactionId(data.transaction_id);
          // Polling hook will take over from here
        } else {
          // Fallback if no transaction ID (shouldn't happen)
          setLoading(false);
          if (onSuccess) {
            onSuccess(amountValue);
          }
          setTimeout(() => {
            onClose();
            setSuccess('');
          }, 3000);
        }
      } else {
        setError(data.error || 'Failed to initiate deposit');
        setLoading(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 relative">
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
              <Loader2 className="animate-spin text-green-600" size={32} />
            </div>
          ) : (
            <>
              {/* Gate Name Display */}
              {gateName && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <Wallet size={18} />
                    <span className="text-sm font-medium">Your Gate</span>
                  </div>
                  <p className="text-lg font-bold text-green-900 dark:text-green-300 mt-1">
                    {gateName}
                  </p>
                </div>
              )}

              {/* Phone Number Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  M-Pesa Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="0712345678"
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  This number will be saved as your default
                </p>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount (KSh)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="100"
                    min="10"
                    step="1"
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
                    className="py-2 px-3 text-sm font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-lg transition-colors"
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
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3">
                  <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
                </div>
              )}

              {/* Polling Status */}
              {polling.isPolling && (
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !gateName}
                className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Processing...
                  </>
                ) : (
                  <>
                    <Wallet size={20} />
                    Deposit via M-Pesa
                  </>
                )}
              </button>

              {/* Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
                <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                  ℹ️ You will receive an M-Pesa prompt on your phone. Enter your M-Pesa PIN to complete the transaction. Funds will reflect in your wallet instantly.
                </p>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
