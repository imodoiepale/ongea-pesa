import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  calculateTransactionFees,
  NCBA_TARIFF_VERSION,
  platformFee as calculatePlatformFee,
  type NcbaTariffRail,
  type TransactionFees,
} from '@/lib/transaction-fees';

const SYSTEM_WALLET_ID = '00000000-0000-0000-0000-000000000000'; // Special ID for system wallet

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
  calculateFees(amount: number, railOrExternal: NcbaTariffRail | boolean = 'internal'): TransactionFees {
    const rail: NcbaTariffRail = typeof railOrExternal === 'boolean'
      ? (railOrExternal ? 'mobile_wallet' : 'internal')
      : railOrExternal;
    return calculateTransactionFees(amount, rail);
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
   * NOTE: This method should NOT be used for STK push deposits.
   * STK push deposits are handled by:
   * 1. /api/gate/deposit - creates pending transaction
   * 2. /api/gate/mpesa-callback OR /api/gate/verify-transaction - updates to completed
   * 3. Database trigger automatically credits wallet when status changes to 'completed'
   * 
   * This method is DEPRECATED and only kept for backward compatibility.
   * It creates a completed transaction which triggers the DB balance update.
   * DO NOT manually update wallet_balance here to avoid double-crediting.
   */
  async loadMoney(
    userId: string,
    amount: number,
    mpesaTransactionId: string,
    phone: string
  ): Promise<any> {
    const wallet = await this.getOrCreateWallet(userId);
    
    // Calculate fees (no platform fee for loading)
    const fees = this.calculateFees(amount, 'mobile_wallet');
    
    // Create transaction record with status 'completed'
    // The database trigger will automatically credit the wallet balance
    // Deposits have platform_fee = 0 (we do not charge to receive)
    const { data: transaction, error: txError } = await this.supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'deposit',
        amount: amount,
        status: 'completed',
        mpesa_transaction_id: mpesaTransactionId,
        phone: phone,
        platform_fee: 0,
        net_amount: amount,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (txError) throw txError;

    // DO NOT manually update wallet_balance here!
    // The database trigger handles this automatically when transaction is created with status='completed'
    
    // Fetch the updated balance (after trigger has run)
    const { data: updatedProfile } = await this.supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', userId)
      .single();
    
    const newBalance = parseFloat(String(updatedProfile?.wallet_balance || 0));

    console.log(`💰 Loaded KES ${amount} to wallet. New balance: KES ${newBalance} (via DB trigger)`);

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
   * Withdraw money to M-Pesa via NCBA Open Banking B2C (S2C)
   * Falls back to IndexPay for amounts below KES 50 (NCBA minimum)
   */
  async withdrawMoney(
    userId: string,
    amount: number,
    phone: string,
    recipientName?: string,
    narration?: string
  ): Promise<any> {
    const wallet = await this.getOrCreateWallet(userId);

    // Estimate with NCBA's current published mobile-money band. The provider's
    // actual callback charge replaces this estimate when supplied.
    const fees = this.calculateFees(amount, 'mobile_wallet');

    // Validate balance
    if (wallet.available_balance < fees.totalDebit) {
      const shortfall = fees.totalDebit - wallet.available_balance;
      throw new Error(
        `Insufficient funds for withdrawal. You need KES ${shortfall.toFixed(2)} more.`
      );
    }

    const n8nBase = process.env.N8N_WEBHOOK_BASE_URL || 'https://n8n-lc5r.srv1631847.hstgr.cloud';

    const response = await fetch(`${n8nBase}/webhook/ncba_withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        destinationType: 'phone',
        amount,
        phoneNumber: phone,
        recipientName: recipientName || 'Beneficiary',
        narration: narration || 'Wallet withdrawal',
        platform_fee: fees.platformFee,
        transaction_cost: fees.providerFee,
        total_transaction_cost: fees.totalTransactionCost,
        total_debit: fees.totalDebit,
        cost_bearer: 'customer',
        fee_tariff: NCBA_TARIFF_VERSION,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Withdrawal failed');
    }

    console.log(`💸 Withdrawal sent via NCBA: KES ${amount} to ${phone}`);

    return {
      success: true,
      transaction_id: result.transaction_id,
      bank_ref: result.bank_ref,
      status: 'completed',
      amount,
      transaction_cost: fees.totalTransactionCost,
      total_debit: fees.totalDebit,
      message: result.message || 'Withdrawal sent successfully.',
    };
  }

  /**
   * Unified payment router for **non-voice** UI initiated payments.
   * Voice payments are handled by n8n WALLET SYSTEM → /webhook/ncba_withdraw.
   *
   * Given a destination, choose the correct rail and move money, recording
   * provider/provider_ref for callback reconciliation.
   *
   * Balance integrity: external sends insert a 'processing' transaction first
   * (no balance change), then flip to 'completed' (DB trigger debits) on success
   * or 'failed' (no change) on error — so the wallet is never debited for money
   * that didn't leave. Internal transfers use the atomic RPC.
   *
   * Wire this into an API route when a non-voice paybill/till/phone UI is built.
   * Currently not called by any route — kept as the app-side rail implementation.
   */
  async resolveRailAndSend(params: {
    userId: string;
    amount: number;
    destination:
      | { kind: 'internal'; recipientId: string }
      | { kind: 'phone'; phone: string; recipientName?: string }
      | { kind: 'paybill'; paybill: string; account: string; recipientName?: string }
      | { kind: 'till'; till: string; recipientName?: string }
      | { kind: 'bill'; billType: string; meterNumber?: string; eslip?: string; customerRef?: string; account?: string; phone?: string };
    narration?: string;
  }): Promise<any> {
    const { userId, amount, destination, narration } = params;
    const n8nBase = process.env.N8N_WEBHOOK_BASE_URL || 'https://n8n-lc5r.srv1631847.hstgr.cloud';

    // Internal in-app transfer → existing atomic RPC path
    if (destination.kind === 'internal') {
      return this.sendMoney({
        senderId: userId,
        recipientId: destination.recipientId,
        amount,
        transactionType: 'c2c',
        description: narration || '',
      });
    }

    // External rails: validate balance up-front including the estimated NCBA cost.
    const wallet = await this.getOrCreateWallet(userId);
    const rail: NcbaTariffRail = destination.kind === 'bill' ? 'utility_bill' : 'mobile_wallet';
    const fees = this.calculateFees(amount, rail);
    if (wallet.available_balance < fees.totalDebit) {
      const shortfall = fees.totalDebit - wallet.available_balance;
      throw new Error(`Insufficient funds. You need KES ${shortfall.toFixed(2)} more.`);
    }

    // Map destination → (transaction type, rail webhook, payload)
    let txType: string;
    let webhook: string;
    let payload: Record<string, any>;
    const provider = destination.kind === 'bill' ? 'ncba' : 'ncba';

    if (destination.kind === 'phone') {
      txType = 'send_phone';
      webhook = `${n8nBase}/webhook/ncba_withdraw`;
      payload = { userId, destinationType: 'phone', amount, phoneNumber: destination.phone, recipientName: destination.recipientName, narration };
    } else if (destination.kind === 'paybill') {
      txType = 'paybill';
      webhook = `${n8nBase}/webhook/ncba_withdraw`;
      payload = { userId, destinationType: 'paybill', amount, paybillOrTill: destination.paybill, accountRef: destination.account, recipientName: destination.recipientName, narration };
    } else if (destination.kind === 'till') {
      txType = 'buy_goods_till';
      webhook = `${n8nBase}/webhook/ncba_withdraw`;
      payload = { userId, destinationType: 'till', amount, paybillOrTill: destination.till, recipientName: destination.recipientName, narration };
    } else {
      // utility bill (KPLC/KRA/NHIF/NWSC)
      txType = 'paybill';
      webhook = `${n8nBase}/webhook/ncba_bill_pay`;
      payload = {
        userId, billType: destination.billType, amount, narration,
        meterNumber: destination.meterNumber, eslip: destination.eslip,
        customerRef: destination.customerRef, debitAccount: destination.account, msisdn: destination.phone,
      };
    }

    const outboundFees = fees;
    payload = {
      ...payload,
      platform_fee: outboundFees.platformFee,
      transaction_cost: outboundFees.providerFee,
      total_transaction_cost: outboundFees.totalTransactionCost,
      total_debit: outboundFees.totalDebit,
      cost_bearer: 'customer',
      fee_tariff: NCBA_TARIFF_VERSION,
    };

    // 1. Insert a 'processing' transaction (no balance change yet)
    const { data: tx, error: txError } = await this.supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: txType,
        amount,
        status: 'processing',
        provider,
        phone: (destination as any).phone || '',
        till: destination.kind === 'till' ? destination.till : '',
        paybill: destination.kind === 'paybill' ? destination.paybill : '',
        account: destination.kind === 'paybill' ? destination.account : '',
        platform_fee: outboundFees.platformFee,
        transaction_cost: outboundFees.providerFee,
        metadata: {
          cost_bearer: 'customer',
          fee_tariff: NCBA_TARIFF_VERSION,
          transaction_cost_estimated: true,
        },
      })
      .select()
      .single();
    if (txError) throw txError;

    // 2. Call the rail
    let result: any = {};
    try {
      const res = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      result = await res.json().catch(() => ({}));

      // 3. Reconcile by sync response
      if (result?.success) {
        await this.supabase
          .from('transactions')
          .update({
            status: 'completed',
            provider_ref: result.bank_ref || result.bankRef || null,
            completed_at: new Date().toISOString(),
            net_amount: amount,
          })
          .eq('id', tx.id);
        return { success: true, rail: provider, transaction_id: tx.id, bank_ref: result.bank_ref || result.bankRef, raw: result };
      }

      await this.supabase
        .from('transactions')
        .update({ status: 'failed', error_message: result?.message || 'Rail rejected the payment' })
        .eq('id', tx.id);
      throw new Error(result?.message || 'Payment failed');
    } catch (err: any) {
      await this.supabase.from('transactions').update({ status: 'failed', error_message: err.message }).eq('id', tx.id);
      throw err;
    }
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
        return total + calculatePlatformFee(parseFloat(String(tx.amount)));
      }, 0);

    const transactionsByType = transactions!.reduce((acc, tx) => {
      const type = tx.type;
      if (!acc[type]) {
        acc[type] = { count: 0, revenue: 0 };
      }
      acc[type].count++;
      if (type !== 'deposit') {
        acc[type].revenue += calculatePlatformFee(parseFloat(String(tx.amount)));
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
