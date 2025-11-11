/**
 * Gate.io Wallet Service
 * Manages the main Ongea Pesa wallet pool via Gate.io API
 * 
 * Purpose:
 * - Store the central pool of user funds
 * - Process deposits from M-Pesa to Gate wallet
 * - Process withdrawals from Gate wallet to M-Pesa
 * - Track total balance in the main wallet
 */

import crypto from 'crypto';

// Gate.io API Configuration
const GATE_API_KEY = process.env.GATE_API_KEY || '';
const GATE_SECRET_KEY = process.env.GATE_SECRET_KEY || '';
const GATE_API_URL = process.env.GATE_API_URL || 'https://api.gate.io/api/v4';

interface GateWalletBalance {
  currency: string;
  available: number;
  locked: number;
  total: number;
}

interface DepositAddress {
  currency: string;
  address: string;
  chain: string;
}

export class GateWalletService {
  /**
   * Generate signature for Gate.io API authentication
   */
  private generateSignature(
    method: string,
    url: string,
    queryString: string,
    body: string,
    timestamp: string
  ): string {
    const hashedPayload = crypto
      .createHash('sha512')
      .update(body)
      .digest('hex');

    const signString = `${method}\n${url}\n${queryString}\n${hashedPayload}\n${timestamp}`;

    const signature = crypto
      .createHmac('sha512', GATE_SECRET_KEY)
      .update(signString)
      .digest('hex');

    return signature;
  }

  /**
   * Make authenticated request to Gate.io API
   */
  private async makeRequest(
    method: string,
    endpoint: string,
    queryParams: Record<string, any> = {},
    body: any = null
  ): Promise<any> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const queryString = new URLSearchParams(queryParams).toString();
    const bodyString = body ? JSON.stringify(body) : '';
    const url = `/api/v4${endpoint}`;

    const signature = this.generateSignature(
      method,
      url,
      queryString,
      bodyString,
      timestamp
    );

    const fullUrl = `${GATE_API_URL}${endpoint}${queryString ? '?' + queryString : ''}`;

    const headers = {
      'KEY': GATE_API_KEY,
      'Timestamp': timestamp,
      'SIGN': signature,
      'Content-Type': 'application/json',
    };

    console.log(`📡 Gate.io API Request: ${method} ${fullUrl}`);

    const response = await fetch(fullUrl, {
      method,
      headers,
      body: bodyString || undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gate.io API Error:', response.status, errorText);
      throw new Error(`Gate.io API Error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Gate.io API Response:', data);
    return data;
  }

  /**
   * Get main wallet balance
   */
  async getWalletBalance(currency: string = 'USDT'): Promise<GateWalletBalance> {
    try {
      const response = await this.makeRequest('GET', '/spot/accounts', { currency });

      if (!response || response.length === 0) {
        return {
          currency,
          available: 0,
          locked: 0,
          total: 0,
        };
      }

      const account = response[0];
      return {
        currency: account.currency,
        available: parseFloat(account.available),
        locked: parseFloat(account.locked),
        total: parseFloat(account.available) + parseFloat(account.locked),
      };
    } catch (error) {
      console.error('Failed to get wallet balance:', error);
      throw error;
    }
  }

  /**
   * Get deposit address for receiving funds
   */
  async getDepositAddress(currency: string = 'USDT'): Promise<DepositAddress> {
    try {
      const response = await this.makeRequest('GET', '/wallet/deposit_address', { currency });

      return {
        currency: response.currency,
        address: response.address,
        chain: response.chain || 'TRC20',
      };
    } catch (error) {
      console.error('Failed to get deposit address:', error);
      throw error;
    }
  }

  /**
   * Record deposit to main wallet (from M-Pesa)
   * This logs the deposit but actual funds come through M-Pesa -> Gate flow
   */
  async recordDeposit(
    userId: string,
    amount: number,
    mpesaTransactionId: string,
    currency: string = 'KES'
  ): Promise<any> {
    console.log(`💰 Recording deposit: User ${userId}, Amount ${amount} ${currency}`);
    console.log(`   M-Pesa TxID: ${mpesaTransactionId}`);

    // In production, you would:
    // 1. Convert KES to USDT/crypto
    // 2. Wait for Gate.io deposit confirmation
    // 3. Update user's internal balance

    // For now, this is a placeholder
    return {
      success: true,
      user_id: userId,
      amount,
      currency,
      mpesa_transaction_id: mpesaTransactionId,
      status: 'pending',
      message: 'Deposit recorded, waiting for Gate.io confirmation',
    };
  }

  /**
   * Process withdrawal from main wallet (to M-Pesa)
   */
  async processWithdrawal(
    userId: string,
    amount: number,
    phone: string,
    currency: string = 'KES'
  ): Promise<any> {
    console.log(`💸 Processing withdrawal: User ${userId}, Amount ${amount} ${currency}`);
    console.log(`   Phone: ${phone}`);

    // Check if we have sufficient balance in Gate wallet
    const balance = await this.getWalletBalance();

    if (balance.available <= 0) {
      throw new Error('Insufficient funds in main wallet');
    }

    // In production, you would:
    // 1. Initiate Gate.io withdrawal
    // 2. Convert to KES if needed
    // 3. Trigger M-Pesa B2C payment
    // 4. Wait for confirmation

    return {
      success: true,
      user_id: userId,
      amount,
      currency,
      phone,
      status: 'processing',
      message: 'Withdrawal initiated, processing M-Pesa payment',
    };
  }

  /**
   * Get transaction history from Gate.io
   */
  async getTransactionHistory(
    currency: string = 'USDT',
    limit: number = 100
  ): Promise<any[]> {
    try {
      const response = await this.makeRequest('GET', '/wallet/deposits', {
        currency,
        limit,
      });

      return response || [];
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      return [];
    }
  }

  /**
   * Get total AUM (Assets Under Management) in the main wallet
   */
  async getTotalAUM(): Promise<{
    total_usd: number;
    total_kes: number;
    currencies: Record<string, number>;
  }> {
    try {
      const response = await this.makeRequest('GET', '/spot/accounts');

      let totalUSD = 0;
      const currencies: Record<string, number> = {};

      for (const account of response) {
        const available = parseFloat(account.available);
        const locked = parseFloat(account.locked);
        const total = available + locked;

        if (total > 0) {
          currencies[account.currency] = total;
          
          // Convert to USD (you'd need real exchange rates here)
          // For now, assume USDT = 1 USD
          if (account.currency === 'USDT') {
            totalUSD += total;
          }
        }
      }

      // Convert USD to KES (approximate rate: 1 USD = 150 KES)
      const totalKES = totalUSD * 150;

      console.log('💎 Total AUM:');
      console.log(`   USD: $${totalUSD.toFixed(2)}`);
      console.log(`   KES: KES ${totalKES.toFixed(2)}`);

      return {
        total_usd: totalUSD,
        total_kes: totalKES,
        currencies,
      };
    } catch (error) {
      console.error('Failed to get total AUM:', error);
      throw error;
    }
  }

  /**
   * Health check for Gate.io API connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.makeRequest('GET', '/spot/currencies');
      console.log('✅ Gate.io API connection healthy');
      return true;
    } catch (error) {
      console.error('❌ Gate.io API connection failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const gateWalletService = new GateWalletService();
