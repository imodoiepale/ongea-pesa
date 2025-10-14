// Transaction fees calculator for M-Pesa and Ongea Pesa platform

export interface TransactionFees {
  amount: number;
  mpesaFee: number;
  platformFee: number;
  totalFee: number;
  totalDebit: number;
}

// M-Pesa transaction fees (Kenya)
const MPESA_FEE_STRUCTURE = [
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
  { min: 50001, max: 70000, fee: 80 },
  { min: 70001, max: 150000, fee: 105 },
  { min: 150001, max: 250000, fee: 105 },
];

// Ongea Pesa platform commission (0.5%)
const PLATFORM_COMMISSION_RATE = 0.005; // 0.5%

/**
 * Calculate M-Pesa transaction fee based on amount
 */
export function getMpesaFee(amount: number): number {
  for (const bracket of MPESA_FEE_STRUCTURE) {
    if (amount >= bracket.min && amount <= bracket.max) {
      return bracket.fee;
    }
  }
  // For amounts above the highest bracket
  return 105;
}

/**
 * Calculate Ongea Pesa platform fee (0.5% of amount)
 */
export function getPlatformFee(amount: number): number {
  return Math.round(amount * PLATFORM_COMMISSION_RATE);
}

/**
 * Calculate all transaction fees
 */
export function calculateTransactionFees(amount: number): TransactionFees {
  const mpesaFee = getMpesaFee(amount);
  const platformFee = getPlatformFee(amount);
  const totalFee = mpesaFee + platformFee;
  const totalDebit = amount + totalFee;

  return {
    amount,
    mpesaFee,
    platformFee,
    totalFee,
    totalDebit,
  };
}

/**
 * Format fees for display
 */
export function formatFeesMessage(fees: TransactionFees): string {
  return `Amount: KSh ${fees.amount.toLocaleString()}, M-Pesa Fee: KSh ${fees.mpesaFee}, Ongea Pesa Fee: KSh ${fees.platformFee}, Total: KSh ${fees.totalDebit.toLocaleString()}`;
}

/**
 * Format fees for voice message
 */
export function formatFeesForVoice(fees: TransactionFees): string {
  return `Amount ${fees.amount} shillings. M-Pesa fee ${fees.mpesaFee} shillings. Ongea Pesa platform fee ${fees.platformFee} shillings. Total debit ${fees.totalDebit} shillings.`;
}

/**
 * Check if user has sufficient balance including fees
 */
export function hasSufficientBalance(balance: number, amount: number): { sufficient: boolean; shortfall: number } {
  const fees = calculateTransactionFees(amount);
  const sufficient = balance >= fees.totalDebit;
  const shortfall = sufficient ? 0 : fees.totalDebit - balance;
  
  return { sufficient, shortfall };
}
