"use client"

import { useState, useEffect } from 'react';
import { ArrowDownLeft, ArrowUpRight, ShoppingCart, CreditCard, Smartphone, Building, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import { ScreenShell } from '@/components/foundation';
import { cn } from '@/lib/utils';

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

  return (
    <div className="min-h-[100dvh] bg-background surface-money pb-24">
      <ScreenShell>
        {/* header */}
        <div className="flex items-center justify-between pt-6 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Transactions</h1>
            <p className="text-sm text-muted-foreground">{transactions.length} records • 0.05% fee</p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={fetchTransactions} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* loading */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading transactions…</span>
          </div>
        )}

        {/* error */}
        {error && !loading && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-4 mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchTransactions}>Retry</Button>
          </div>
        )}

        {/* empty */}
        {!loading && !error && transactions.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm text-muted-foreground">No transactions yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Your history will appear here</p>
          </div>
        )}

        {/* list — flat rows in hairline card container */}
        {!loading && !error && transactions.length > 0 && (
          <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40">
            {transactions.map((tx) => {
              const isDebit = isDebitTransaction(tx.type);
              const fee = isDebit ? calculateFee(tx.amount) : 0;
              return (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                  {/* Icon */}
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                    isDebit ? "bg-destructive/10" : "bg-brand/10"
                  )}>
                    <span className={isDebit ? "[&_svg]:!text-destructive [&_svg]:!h-4 [&_svg]:!w-4" : "[&_svg]:!text-brand [&_svg]:!h-4 [&_svg]:!w-4"}>
                      {getTransactionIcon(tx.type)}
                    </span>
                  </div>
                  {/* details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{getTransactionDetails(tx)}</p>
                    <p className="text-xs text-muted-foreground truncate">{formatDate(tx.created_at)}</p>
                    {isDebit && fee > 0 && (
                      <p className="text-[10px] text-muted-foreground/60">Fee: KSh {fee.toFixed(2)}</p>
                    )}
                  </div>
                  {/* amount + status */}
                  <div className="text-right shrink-0">
                    <p className={cn(
                      "text-sm font-bold",
                      isDebit ? "text-destructive" : "text-brand"
                    )} style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatAmount(tx.amount, isDebit)}
                    </p>
                    <span className={cn(
                      "text-[10px] font-semibold capitalize",
                      tx.status === 'completed' ? "text-brand" :
                      tx.status === 'pending' ? "text-amber-500" :
                      "text-destructive"
                    )}>{tx.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScreenShell>
    </div>
  );
}
