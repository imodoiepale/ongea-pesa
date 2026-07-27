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

// M-Pesa Paybill (C2B) customer-pays tariff, 2026 schedule.
// Charged by Safaricom to the payer, on top of the amount paid into our paybill.
// Distinct from MPESA_FEE_STRUCTURE above, which covers outbound send-money.
export const MPESA_PAYBILL_TARIFF_2026 = [
  { min: 1, max: 100, fee: 0 },
  { min: 101, max: 500, fee: 7 },
  { min: 501, max: 1000, fee: 13 },
  { min: 1001, max: 1500, fee: 23 },
  { min: 1501, max: 2500, fee: 33 },
  { min: 2501, max: 3500, fee: 53 },
  { min: 3501, max: 5000, fee: 57 },
  { min: 5001, max: 7500, fee: 78 },
  { min: 7501, max: 10000, fee: 90 },
  { min: 10001, max: 15000, fee: 100 },
  { min: 15001, max: 20000, fee: 105 },
  { min: 20001, max: 250000, fee: 108 },
] as const;

// Ongea Pesa platform commission (0.5%) — single source of truth for the whole app
export const PLATFORM_FEE_RATE = 0.005; // 0.5%
const PLATFORM_COMMISSION_RATE = PLATFORM_FEE_RATE;

// Transaction types that credit the wallet and therefore carry no platform fee
const NO_PLATFORM_FEE_TYPES = ['deposit', 'receive'];

export interface DepositFeeBreakdown {
  amount: number;
  mpesaCharge: number;
  ongeaFee: number;
  totalFromMpesa: number;
  creditedToWallet: number;
}

/**
 * Safaricom paybill charge the customer pays when depositing `amount` into our paybill.
 */
export function mpesaPaybillCharge(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  for (const band of MPESA_PAYBILL_TARIFF_2026) {
    if (amount >= band.min && amount <= band.max) return band.fee;
  }
  return MPESA_PAYBILL_TARIFF_2026[MPESA_PAYBILL_TARIFF_2026.length - 1].fee;
}

/**
 * Ongea Pesa's cut for a transaction. Deposits and incoming transfers are free.
 */
export function platformFee(amount: number, type?: string): number {
  if (type && NO_PLATFORM_FEE_TYPES.includes(type)) return 0;
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * PLATFORM_FEE_RATE * 100) / 100;
}

/**
 * What the user sees before confirming a deposit: Safaricom takes the paybill
 * charge from their M-Pesa balance, we take nothing, and the full amount lands
 * in the wallet.
 */
export function depositFeeBreakdown(amount: number): DepositFeeBreakdown {
  const mpesaCharge = mpesaPaybillCharge(amount);
  return {
    amount,
    mpesaCharge,
    ongeaFee: 0,
    totalFromMpesa: amount + mpesaCharge,
    creditedToWallet: amount,
  };
}

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
