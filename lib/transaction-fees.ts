// Customer transaction-cost calculations for Ongea Pesa payment rails.

export type NcbaTariffRail = 'internal' | 'mobile_wallet' | 'utility_bill';

export interface TransactionFees {
  amount: number;
  /** Provider cost retained for backward compatibility with existing callers. */
  mpesaFee: number;
  providerFee: number;
  platformFee: number;
  /** Single customer-facing transaction cost. */
  totalFee: number;
  totalTransactionCost: number;
  totalDebit: number;
}

// NCBA Kenya Tariff Guide 05/26, "Mobile Money Charges" (maximum charge).
// These are the published customer bands; an actual charge returned by NCBA
// replaces this estimate during callback reconciliation.
export const NCBA_MOBILE_MONEY_TARIFF_2026 = [
  { min: 1, max: 100, fee: 0 },
  { min: 101, max: 500, fee: 11 },
  { min: 501, max: 1_000, fee: 15 },
  { min: 1_001, max: 1_500, fee: 18 },
  { min: 1_501, max: 2_500, fee: 25 },
  { min: 2_501, max: 3_500, fee: 35 },
  { min: 3_501, max: 5_000, fee: 47 },
  { min: 5_001, max: 7_500, fee: 57 },
  { min: 7_501, max: 20_000, fee: 67 },
  { min: 20_001, max: 150_000, fee: 70 },
] as const;

// NCBA Kenya Tariff Guide 05/26, online/mobile utility-bill payments.
export const NCBA_UTILITY_BILL_FEE = 63;
export const NCBA_TARIFF_VERSION = 'NCBA_TARIFF_05_26';

// M-Pesa Paybill (C2B) customer-pays tariff, 2026 schedule.
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

export const PLATFORM_FEE_RATE = 0.005;
const NO_PLATFORM_FEE_TYPES = ['deposit', 'receive'];

export interface DepositFeeBreakdown {
  amount: number;
  mpesaCharge: number;
  ongeaFee: number;
  totalFromMpesa: number;
  creditedToWallet: number;
}

export function mpesaPaybillCharge(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  for (const band of MPESA_PAYBILL_TARIFF_2026) {
    if (amount >= band.min && amount <= band.max) return band.fee;
  }
  return MPESA_PAYBILL_TARIFF_2026[MPESA_PAYBILL_TARIFF_2026.length - 1].fee;
}

export function platformFee(amount: number, type?: string): number {
  if (type && NO_PLATFORM_FEE_TYPES.includes(type)) return 0;
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * PLATFORM_FEE_RATE * 100) / 100;
}

export function depositFeeBreakdown(amount: number): DepositFeeBreakdown {
  const mpesaCharge = mpesaPaybillCharge(amount);
  return { amount, mpesaCharge, ongeaFee: 0, totalFromMpesa: amount + mpesaCharge, creditedToWallet: amount };
}

export function ncbaTransactionCost(amount: number, rail: NcbaTariffRail = 'mobile_wallet'): number {
  if (!Number.isFinite(amount) || amount <= 0 || rail === 'internal') return 0;
  if (rail === 'utility_bill') return NCBA_UTILITY_BILL_FEE;
  for (const band of NCBA_MOBILE_MONEY_TARIFF_2026) {
    if (amount >= band.min && amount <= band.max) return band.fee;
  }
  return NCBA_MOBILE_MONEY_TARIFF_2026[NCBA_MOBILE_MONEY_TARIFF_2026.length - 1].fee;
}

/** Backward-compatible alias now backed by NCBA's current published bands. */
export function getMpesaFee(amount: number): number {
  return ncbaTransactionCost(amount, 'mobile_wallet');
}

export function getPlatformFee(amount: number): number {
  return platformFee(amount);
}

export function calculateTransactionFees(
  amount: number,
  rail: NcbaTariffRail = 'mobile_wallet',
  type?: string,
): TransactionFees {
  const providerFee = ncbaTransactionCost(amount, rail);
  const platformFeeAmount = platformFee(amount, type);
  const totalTransactionCost = providerFee + platformFeeAmount;
  return {
    amount,
    mpesaFee: providerFee,
    providerFee,
    platformFee: platformFeeAmount,
    totalFee: totalTransactionCost,
    totalTransactionCost,
    totalDebit: amount + totalTransactionCost,
  };
}

export interface StoredTransactionCost {
  platform_fee?: number | null;
  transaction_cost?: number | null;
  metadata?: Record<string, unknown> | null;
}

/** Only costs explicitly marked customer-borne affect wallet totals. */
export function customerTransactionCost(transaction: StoredTransactionCost): number {
  const platform = Number(transaction.platform_fee || 0);
  const provider = transaction.metadata?.cost_bearer === 'customer'
    ? Number(transaction.transaction_cost || 0)
    : 0;
  return Math.round((platform + provider) * 100) / 100;
}

export function formatFeesMessage(fees: TransactionFees): string {
  return `Amount: KSh ${fees.amount.toLocaleString()}, Transaction cost: KSh ${fees.totalTransactionCost.toLocaleString()}, Total debit: KSh ${fees.totalDebit.toLocaleString()}`;
}

export function formatFeesForVoice(fees: TransactionFees): string {
  return `Amount ${fees.amount} shillings. Transaction cost ${fees.totalTransactionCost} shillings. Total debit ${fees.totalDebit} shillings.`;
}

export function hasSufficientBalance(
  balance: number,
  amount: number,
  rail: NcbaTariffRail = 'mobile_wallet',
): { sufficient: boolean; shortfall: number } {
  const fees = calculateTransactionFees(amount, rail);
  const sufficient = balance >= fees.totalDebit;
  return { sufficient, shortfall: sufficient ? 0 : fees.totalDebit - balance };
}
