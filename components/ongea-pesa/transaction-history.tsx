"use client"

import { useState, useEffect } from 'react';
import { ArrowDownLeft, ArrowUpRight, ShoppingCart, CreditCard, Smartphone, Building, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';

// Transaction fee rate: 0.05% = 0.0005
const TRANSACTION_FEE_RATE = 0.0005;

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  created_at: string;
  recipient_phone?: string;
  recipient_email?: string;
  paybill_number?: string;
  till_number?: string;
  account_number?: string;
  description?: string;
  platform_fee?: number;
}

const getTransactionIcon = (type: string) => {
  switch (type) {
    case 'deposit':
    case 'receive':
      return <ArrowDownLeft className="h-6 w-6 text-green-500" />;
    case 'send_phone':
    case 'send':
      return <ArrowUpRight className="h-6 w-6 text-red-500" />;
    case 'buy_goods_till':
    case 'buy_goods_pochi':
      return <ShoppingCart className="h-6 w-6 text-blue-500" />;
    case 'paybill':
      return <CreditCard className="h-6 w-6 text-orange-500" />;
    case 'withdraw':
      return <Smartphone className="h-6 w-6 text-purple-500" />;
    case 'bank_to_mpesa':
      return <Building className="h-6 w-6 text-indigo-500" />;
    default:
      return <CreditCard className="h-6 w-6 text-gray-500" />;
  }
};

const getTransactionLabel = (type: string) => {
  const labels: Record<string, string> = {
    'deposit': 'Deposit',
    'receive': 'Received',
    'send_phone': 'Sent to Phone',
    'send': 'Sent',
    'buy_goods_till': 'Buy Goods (Till)',
    'buy_goods_pochi': 'Buy Goods (Pochi)',
    'paybill': 'PayBill',
    'withdraw': 'Withdrawal',
    'bank_to_mpesa': 'Bank to M-Pesa',
  };
  return labels[type] || type;
};

const getTransactionDetails = (tx: Transaction) => {
  if (tx.recipient_phone) return `To ${tx.recipient_phone}`;
  if (tx.recipient_email) return `To ${tx.recipient_email}`;
  if (tx.paybill_number) return `Paybill ${tx.paybill_number}${tx.account_number ? ` - ${tx.account_number}` : ''}`;
  if (tx.till_number) return `Till ${tx.till_number}`;
  if (tx.description) return tx.description;
  return getTransactionLabel(tx.type);
};

const calculateFee = (amount: number): number => {
  // Fee = amount * 0.05% = amount * 0.0005
  return amount * TRANSACTION_FEE_RATE;
};

const isDebitTransaction = (type: string): boolean => {
  return ['send_phone', 'send', 'buy_goods_till', 'buy_goods_pochi', 'paybill', 'withdraw', 'bank_to_mpesa'].includes(type);
};

export default function TransactionHistory() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchTransactions = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;
      setTransactions(data || []);
    } catch (err: any) {
      console.error('Failed to fetch transactions:', err);
      setError(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user?.id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (amount: number, isDebit: boolean) => {
    const formatted = amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return isDebit ? `- KSh ${formatted}` : `+ KSh ${formatted}`;
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-green-600" />
            <p className="text-gray-600">Loading transactions...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchTransactions}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 pb-24">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              {transactions.length} transactions • Fee rate: 0.05%
            </CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={fetchTransactions}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No transactions yet</p>
              <p className="text-sm mt-2">Your transaction history will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((tx) => {
                const isDebit = isDebitTransaction(tx.type);
                const fee = isDebit ? calculateFee(tx.amount) : 0;
                const totalAmount = isDebit ? tx.amount + fee : tx.amount;

                return (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center space-x-4">
                      {getTransactionIcon(tx.type)}
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {getTransactionDetails(tx)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(tx.created_at)}
                        </p>
                        {isDebit && fee > 0 && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Fee: KSh {fee.toFixed(2)} (0.05%)
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${isDebit ? 'text-red-500' : 'text-green-500'}`}>
                        {formatAmount(tx.amount, isDebit)}
                      </p>
                      {isDebit && fee > 0 && (
                        <p className="text-xs text-gray-400">
                          Total: KSh {totalAmount.toFixed(2)}
                        </p>
                      )}
                      <Badge
                        variant={tx.status === 'completed' ? 'default' : tx.status === 'pending' ? 'secondary' : 'destructive'}
                        className="mt-1"
                      >
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
