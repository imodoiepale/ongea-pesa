'use client';

import { useState, useEffect } from 'react';
import { X, Phone, Save, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';

interface MpesaSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export default function MpesaSettingsDialog({ isOpen, onClose, onSave }: MpesaSettingsDialogProps) {
  const { user } = useAuth();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen && user?.id) {
      loadMpesaNumber();
    }
  }, [isOpen, user?.id]);

  const loadMpesaNumber = async () => {
    try {
      const supabase = createClient();
      const { data: profile } = await supabase
        .from('profiles')
        .select('mpesa_number')
        .eq('id', user?.id)
        .single();

      if (profile?.mpesa_number) {
        setPhone(profile.mpesa_number);
      }
    } catch (err) {
      console.error('Error loading M-Pesa number:', err);
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
    setError('');
  };

  const validatePhone = (phoneNumber: string): boolean => {
    const phoneRegex = /^(07|01|\+2547|\+2541)[0-9]{8}$/;
    return phoneRegex.test(phoneNumber.replace(/\s/g, ''));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!phone) {
      setError('Please enter your M-Pesa phone number');
      return;
    }

    if (!validatePhone(phone)) {
      setError('Invalid phone number. Use format: 0712345678 or +254712345678');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          mpesa_number: phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (updateError) {
        setError('Failed to save M-Pesa number');
        console.error(updateError);
        return;
      }

      setSuccess('M-Pesa number saved successfully!');
      
      if (onSave) {
        onSave();
      }

      // Close dialog after 1.5 seconds
      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
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
              <Phone className="text-white" size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">M-Pesa Number</h2>
              <p className="text-white/80 text-sm">Set your default M-Pesa number</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <p className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed">
              ℹ️ This number will be used for all M-Pesa deposits. You can change it anytime in settings.
            </p>
          </div>

          {/* Phone Number Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              M-Pesa Phone Number *
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
              Enter your Safaricom or Airtel M-Pesa number
            </p>
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

          {/* Save Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Saving...
              </>
            ) : (
              <>
                <Save size={20} />
                Save M-Pesa Number
              </>
            )}
          </button>

          {/* Supported Formats */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Supported formats:</p>
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <p>✓ 0712345678 (Safaricom)</p>
              <p>✓ 0112345678 (Airtel)</p>
              <p>✓ +254712345678 (International)</p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
