import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';

// Fee calculation constants
const PLATFORM_FEE_PERCENTAGE = 0.005; // 0.5%
const SYSTEM_WALLET_ID = '00000000-0000-0000-0000-000000000000'; // Special ID for system wallet

// M-Pesa fee brackets
const MPESA_FEE_BRACKETS = [
  { min: 1, max: 100, fee: 0 },
  { min: 101, max: 500, fee: 5 },
  { min: 501, max: 1000, fee: 10 },
  { min: 1001, max: 1500, fee: 15 },
  { min: 1501, max: 2500, fee: 20 },
  { min: 2501, max: 3500, fee: 25 },
  { min: 3501, max: 5000, fee: 30 },
  { min: 5001, max: 7500, fee: 35 },
  { min: 7501, max: 10000, fee: 40 },
  { min: 10001, max: 15000, fee: 45 },
  { min: 15001, max: 20000, fee: 50 },
  { min: 20001, max: 35000, fee: 60 },
  { min: 35001, max: 50000, fee: 70 },
];

interface TransactionFees {
  platformFee: number;
  mpesaFee: number;
  totalFee: number;
  totalDebit: number;
}

interface WalletBalance {
  wallet_id: string;
  available_balance: number;
  pending_balance: number;
  total_balance: number;
}

interface TransactionRequest {
  senderId: string;
  recipientId: string;
  amount: number;
  transactionType: 'c2c' | 'c2b' | 'b2c' | 'b2b' | 'c2s' | 's2c';
  description?: string;
  metadata?: any;
}

export class WalletService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Calculate transaction fees
   */
  calculateFees(amount: number, includeMpesa: boolean = false): TransactionFees {
    const platformFee = Math.round(amount * PLATFORM_FEE_PERCENTAGE * 100) / 100;
    
    let mpesaFee = 0;
    if (includeMpesa) {
      mpesaFee = 105; // Default for amounts above 50k
      for (const bracket of MPESA_FEE_BRACKETS) {
        if (amount >= bracket.min && amount <= bracket.max) {
          mpesaFee = bracket.fee;
          break;
        }
      }
    }

    const totalFee = platformFee + mpesaFee;
    const totalDebit = amount + totalFee;

    return { platformFee, mpesaFee, totalFee, totalDebit };
  }

  /**
   * Get or create wallet for user
   */
  async getOrCreateWallet(userId: string): Promise<WalletBalance> {
    // Check if wallet exists
    let { data: wallet, error } = await this.supabase
      .from('profiles')
      .select('id, wallet_balance')
      .eq('id', userId)
      .single();

    // If no wallet exists, create one
    if (error && error.code === 'PGRST116') {
      const { data: user } = await this.supabase.auth.getUser();
      
      const { data: newWallet, error: createError } = await this.supabase
        .from('profiles')
        .insert({
          id: userId,
          email: user?.user?.email || '',
          wallet_balance: 0,
          daily_limit: 100000,
          monthly_limit: 500000,
          kyc_verified: false,
          wallet_type: 'wallet',
          active: true,
        })
        .select('id, wallet_balance')
        .single();

      if (createError) throw createError;
      wallet = newWallet;
    } else if (error) {
      throw error;
    }

    return {
      wallet_id: wallet!.id,
      available_balance: parseFloat(String(wallet!.wallet_balance || 0)),
      pending_balance: 0,
      total_balance: parseFloat(String(wallet!.wallet_balance || 0)),
    };
  }

  /**
   * Get wallet balance
   */
  async getBalance(userId: string): Promise<WalletBalance> {
    return this.getOrCreateWallet(userId);
  }

  /**
   * Load money to wallet (C2S - from M-Pesa)
   */
  async loadMoney(
    userId: string,
    amount: number,
    mpesaTransactionId: string,
    phone: string
  ): Promise<any> {
    const wallet = await this.getOrCreateWallet(userId);
    
    // Calculate fees (no platform fee for loading)
    const fees = this.calculateFees(amount, true);
    
    // Create transaction record
    const { data: transaction, error: txError } = await this.supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'deposit',
        amount: amount,
        status: 'completed',
        mpesa_transaction_id: mpesaTransactionId,
        phone: phone,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (txError) throw txError;

    // Update wallet balance
    const newBalance = wallet.available_balance + amount;
    const { error: updateError } = await this.supabase
      .from('profiles')
      .update({
        wallet_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    console.log(`💰 Loaded KES ${amount} to wallet. New balance: KES ${newBalance}`);

    return {
      success: true,
      transaction_id: transaction.id,
      amount: amount,
      mpesa_fee: fees.mpesaFee,
      new_balance: newBalance,
    };
  }

  /**
   * Send money internally (C2C, C2B, B2C, B2B)
   */
  async sendMoney(request: TransactionRequest): Promise<any> {
    const { senderId, recipientId, amount, transactionType, description, metadata } = request;

    // Get sender and recipient wallets
    const senderWallet = await this.getOrCreateWallet(senderId);
    const recipientWallet = await this.getOrCreateWallet(recipientId);

    // Calculate fees (platform fee only for internal transfers)
    const fees = this.calculateFees(amount, false);

    // Validate sender has sufficient balance
    if (senderWallet.available_balance < fees.totalDebit) {
      const shortfall = fees.totalDebit - senderWallet.available_balance;
      throw new Error(
        `Insufficient funds. You need KES ${shortfall.toFixed(2)} more. ` +
        `Current balance: KES ${senderWallet.available_balance.toFixed(2)}, ` +
        `Required: KES ${fees.totalDebit.toFixed(2)}`
      );
    }

    // Generate unique reference
    const reference = `REF${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Start database transaction
    const { data: transaction, error: txError } = await this.supabase.rpc(
      'process_internal_transfer',
      {
        p_sender_id: senderId,
        p_recipient_id: recipientId,
        p_amount: amount,
        p_platform_fee: fees.platformFee,
        p_transaction_type: transactionType,
        p_description: description || '',
        p_reference: reference,
        p_metadata: metadata || {},
      }
    );

    if (txError) {
      console.error('❌ Transfer failed:', txError);
      throw txError;
    }

    console.log(`✅ Transfer completed: ${senderId} → ${recipientId}, KES ${amount}`);
    console.log(`💰 Platform fee earned: KES ${fees.platformFee}`);

    return {
      success: true,
      transaction_id: transaction,
      amount: amount,
      platform_fee: fees.platformFee,
      total_debit: fees.totalDebit,
      reference: reference,
      sender_balance: senderWallet.available_balance - fees.totalDebit,
      recipient_balance: recipientWallet.available_balance + amount,
    };
  }

  /**
   * Withdraw money to M-Pesa (S2C)
   */
  async withdrawMoney(
    userId: string,
    amount: number,
    phone: string
  ): Promise<any> {
    const wallet = await this.getOrCreateWallet(userId);
    
    // Calculate fees (platform fee + M-Pesa B2C fee)
    const fees = this.calculateFees(amount, true);

    // Validate balance
    if (wallet.available_balance < fees.totalDebit) {
      const shortfall = fees.totalDebit - wallet.available_balance;
      throw new Error(
        `Insufficient funds for withdrawal. You need KES ${shortfall.toFixed(2)} more.`
      );
    }

    // Create withdrawal transaction (status: processing)
    const { data: transaction, error: txError } = await this.supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'withdraw',
        amount: amount,
        status: 'processing',
        phone: phone,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (txError) throw txError;

    // Reserve amount in wallet (deduct immediately)
    const newBalance = wallet.available_balance - fees.totalDebit;
    const { error: updateError } = await this.supabase
      .from('profiles')
      .update({
        wallet_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    console.log(`💸 Withdrawal initiated: KES ${amount} to ${phone}`);

    // TODO: Initiate M-Pesa B2C payment here
    // For now, return pending status

    return {
      success: true,
      transaction_id: transaction.id,
      status: 'processing',
      amount: amount,
      platform_fee: fees.platformFee,
      mpesa_fee: fees.mpesaFee,
      total_debit: fees.totalDebit,
      new_balance: newBalance,
      message: 'Withdrawal is being processed. You will receive M-Pesa shortly.',
    };
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    userId: string,
    filters: {
      limit?: number;
      offset?: number;
      type?: string;
      status?: string;
      start_date?: string;
      end_date?: string;
    } = {}
  ): Promise<any> {
    const {
      limit = 20,
      offset = 0,
      type,
      status,
      start_date,
      end_date,
    } = filters;

    let query = this.supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) query = query.eq('type', type);
    if (status) query = query.eq('status', status);
    if (start_date) query = query.gte('created_at', start_date);
    if (end_date) query = query.lte('created_at', end_date);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      success: true,
      transactions: data,
      total: count,
      page: Math.floor(offset / limit) + 1,
      limit: limit,
    };
  }

  /**
   * Get revenue statistics (Admin only)
   */
  async getRevenueStats(
    period: 'day' | 'week' | 'month' | 'year' = 'month',
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    // This would query the platform_revenue table
    // For now, calculate from transactions
    
    let query = this.supabase
      .from('transactions')
      .select('*')
      .eq('status', 'completed');

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data: transactions, error } = await query;

    if (error) throw error;

    // Calculate revenue (0.5% of all completed transactions except deposits)
    const revenue = transactions!
      .filter(tx => tx.type !== 'deposit')
      .reduce((total, tx) => {
        const platformFee = parseFloat(String(tx.amount)) * PLATFORM_FEE_PERCENTAGE;
        return total + platformFee;
      }, 0);

    const transactionsByType = transactions!.reduce((acc, tx) => {
      const type = tx.type;
      if (!acc[type]) {
        acc[type] = { count: 0, revenue: 0 };
      }
      acc[type].count++;
      if (type !== 'deposit') {
        acc[type].revenue += parseFloat(String(tx.amount)) * PLATFORM_FEE_PERCENTAGE;
      }
      return acc;
    }, {} as Record<string, { count: number; revenue: number }>);

    return {
      success: true,
      total_revenue: Math.round(revenue * 100) / 100,
      transaction_count: transactions!.length,
      unique_users: new Set(transactions!.map(tx => tx.user_id)).size,
      average_transaction: transactions!.length > 0 
        ? Math.round((transactions!.reduce((sum, tx) => sum + parseFloat(String(tx.amount)), 0) / transactions!.length) * 100) / 100
        : 0,
      by_transaction_type: transactionsByType,
    };
  }
}

/**
 * Helper function to get wallet service instance
 */
export async function getWalletService(): Promise<WalletService> {
  const supabase = await createClient();
  return new WalletService(supabase);
}
