/**
 * Transaction Polling Service
 * Polls IndexPay API for transaction status until completion
 * 
 * Purpose:
 * - Handle transaction status polling since callbacks aren't implemented
 * - Check status every few seconds until transaction completes or fails
 * - Update transaction records in database
 */

interface PollingOptions {
  transactionId: string;
  gateName: string;
  maxAttempts?: number;
  intervalMs?: number;
  onStatusUpdate?: (status: string, data: any) => void;
}

interface PollingResult {
  status: 'completed' | 'failed' | 'timeout' | 'pending';
  message: string;
  data?: any;
  attempts: number;
}

export class TransactionPollingService {
  /**
   * Poll transaction status until it completes or times out
   */
  async pollTransactionStatus(options: PollingOptions): Promise<PollingResult> {
    const {
      transactionId,
      gateName,
      maxAttempts = 60, // 60 attempts = 5 minutes (at 5s intervals)
      intervalMs = 5000, // Check every 5 seconds
      onStatusUpdate
    } = options;

    console.log(`🔄 Starting transaction polling for ${transactionId}`);
    console.log(`   Max attempts: ${maxAttempts}, Interval: ${intervalMs}ms`);

    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`📡 Polling attempt ${attempts}/${maxAttempts}`);

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
          // Continue polling even if check fails
          await this.sleep(intervalMs);
          continue;
        }

        const result = await response.json();

        // Notify callback of status update
        if (onStatusUpdate) {
          onStatusUpdate(result.status, result.data);
        }

        // Check if transaction is complete
        if (result.status === 'completed') {
          console.log(`✅ Transaction completed after ${attempts} attempts`);
          return {
            status: 'completed',
            message: result.message || 'Transaction completed successfully',
            data: result.data,
            attempts,
          };
        }

        // Check if transaction failed
        if (result.status === 'failed') {
          console.log(`❌ Transaction failed after ${attempts} attempts`);
          return {
            status: 'failed',
            message: result.message || 'Transaction failed',
            data: result.data,
            attempts,
          };
        }

        // Still pending, continue polling
        console.log(`⏳ Transaction still pending (attempt ${attempts}/${maxAttempts})`);

      } catch (error) {
        console.error(`❌ Polling error on attempt ${attempts}:`, error);
        // Continue polling even if there's an error
      }

      // Wait before next attempt
      await this.sleep(intervalMs);
    }

    // Max attempts reached
    console.warn(`⏱️ Polling timeout after ${attempts} attempts`);
    return {
      status: 'timeout',
      message: `Transaction status check timed out after ${attempts} attempts. Please check your M-Pesa messages or contact support.`,
      attempts,
    };
  }

  /**
   * Start polling in background (non-blocking)
   */
  async pollInBackground(options: PollingOptions): Promise<void> {
    // Run polling in background without blocking
    this.pollTransactionStatus(options)
      .then((result) => {
        console.log('🏁 Background polling completed:', result);
      })
      .catch((error) => {
        console.error('❌ Background polling error:', error);
      });
  }

  /**
   * Helper to sleep/wait
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Poll with exponential backoff (slower polling over time)
   */
  async pollWithBackoff(options: PollingOptions): Promise<PollingResult> {
    const {
      transactionId,
      gateName,
      maxAttempts = 40,
      onStatusUpdate
    } = options;

    console.log(`🔄 Starting transaction polling with exponential backoff for ${transactionId}`);

    let attempts = 0;
    const baseInterval = 3000; // Start at 3 seconds

    while (attempts < maxAttempts) {
      attempts++;
      
      // Calculate interval with exponential backoff
      // 3s, 3s, 6s, 6s, 12s, 12s, 24s, 24s, etc. (capped at 30s)
      const intervalMs = Math.min(
        baseInterval * Math.pow(2, Math.floor(attempts / 2)),
        30000
      );

      console.log(`📡 Polling attempt ${attempts}/${maxAttempts} (next check in ${intervalMs}ms)`);

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

        if (response.ok) {
          const result = await response.json();

          if (onStatusUpdate) {
            onStatusUpdate(result.status, result.data);
          }

          if (result.status === 'completed') {
            console.log(`✅ Transaction completed after ${attempts} attempts`);
            return {
              status: 'completed',
              message: result.message,
              data: result.data,
              attempts,
            };
          }

          if (result.status === 'failed') {
            console.log(`❌ Transaction failed after ${attempts} attempts`);
            return {
              status: 'failed',
              message: result.message,
              data: result.data,
              attempts,
            };
          }
        }

      } catch (error) {
        console.error(`❌ Polling error:`, error);
      }

      await this.sleep(intervalMs);
    }

    return {
      status: 'timeout',
      message: 'Transaction polling timed out',
      attempts,
    };
  }
}

// Export singleton instance
export const transactionPollingService = new TransactionPollingService();
