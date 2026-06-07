// lib/batch-payments.ts
// Shared types and normalizers for multi-payment (batch) sends.
// Used by both API routes (server-side) and client components.

import type { PaymentScanResult } from '@/lib/ocr-shared';

/** Destination union that exactly matches WalletService.resolveRailAndSend */
export type RailDestination =
  | { kind: 'internal'; recipientId: string }
  | { kind: 'phone'; phone: string; recipientName?: string }
  | { kind: 'paybill'; paybill: string; account: string; recipientName?: string }
  | { kind: 'till'; till: string; recipientName?: string }
  | { kind: 'bill'; billType: string; meterNumber?: string; eslip?: string; customerRef?: string; account?: string; phone?: string };

export interface BatchItem {
  amount: number;
  destination: RailDestination;
  narration?: string;
  /** Optional human-readable label for UI and voice readback, e.g. "Till 832909" */
  label?: string;
}

export interface BatchResult {
  index: number;
  label?: string;
  amount: number;
  kind: string;
  success: boolean;
  transaction_id?: string;
  bank_ref?: string;
  error?: string;
}

export interface BatchResponse {
  success: boolean;
  totalRequested: number;
  successCount: number;
  failCount: number;
  results: BatchResult[];
  error?: string;
  message?: string;
  shortfall?: number;
}

// ── Normalizers ────────────────────────────────────────────────────────────────

/**
 * Map a scanner OCR result to a BatchItem.
 * `parsedAmount` overrides the amount in scan.data.amount when already parsed.
 */
export function normalizeScanToBatchItem(
  scan: PaymentScanResult,
  parsedAmount?: number
): BatchItem {
  const rawAmt = scan.data.amount ?? '0';
  const amount = parsedAmount ?? (parseFloat(rawAmt.replace(/[^0-9.]/g, '')) || 0);
  const { type, data } = scan;

  switch (type) {
    case 'buy_goods_till':
    case 'qr': {
      const till = data.till ?? '';
      return {
        amount,
        destination: { kind: 'till', till, recipientName: data.merchant ?? undefined },
        label: `Till ${till}`,
      };
    }
    case 'paybill': {
      const paybill = data.paybill ?? '';
      const account = data.account ?? '';
      return {
        amount,
        destination: { kind: 'paybill', paybill, account, recipientName: data.merchant ?? undefined },
        label: `Paybill ${paybill} / Acc ${account}`,
      };
    }
    case 'send_phone': {
      const phone = data.phone ?? '';
      return {
        amount,
        destination: { kind: 'phone', phone, recipientName: data.merchant ?? undefined },
        label: `Phone ${phone}`,
      };
    }
    // buy_goods_pochi intentionally falls to default — feature is coming soon;
    // the default returns a stub that the batch API will reject before sending.
    case 'receipt': {
      // Receipt with an extracted till or paybill is payable; otherwise expense-tracking only
      if (data.till) {
        return {
          amount,
          destination: { kind: 'till', till: data.till, recipientName: data.receiptData?.vendor ?? undefined },
          label: `Till ${data.till}`,
        };
      }
      if (data.paybill) {
        return {
          amount,
          destination: {
            kind: 'paybill',
            paybill: data.paybill,
            account: data.account ?? '',
            recipientName: data.receiptData?.vendor ?? undefined,
          },
          label: `Paybill ${data.paybill}`,
        };
      }
      // Unpayable receipt — amount captured; callers should filter these
      return { amount, destination: { kind: 'phone', phone: '', recipientName: 'Receipt' }, label: 'Receipt (expense only)' };
    }
    default:
      return { amount, destination: { kind: 'phone', phone: '', recipientName: String(type) }, label: String(type) };
  }
}

/**
 * Map a loosely-typed object from the ElevenLabs `send_batch` tool params to a BatchItem.
 * The agent passes { amount, kind?, phone?, till?, paybill?, account?, recipient?, billType?, ... }.
 * `kind` is inferred from which destination fields are present when omitted.
 */
export function normalizeVoiceItem(raw: Record<string, any>): BatchItem {
  const amount =
    typeof raw.amount === 'number'
      ? raw.amount
      : (parseFloat(String(raw.amount ?? '0').replace(/[^0-9.]/g, '')) || 0);

  const kind: string = (raw.kind ?? '').toLowerCase();
  let destination: RailDestination;

  if (kind === 'internal' && raw.recipientId) {
    destination = { kind: 'internal', recipientId: String(raw.recipientId) };
  } else if ((kind === 'bill' || (!kind && raw.billType)) && raw.billType) {
    destination = {
      kind: 'bill',
      billType: String(raw.billType),
      meterNumber: raw.meterNumber,
      customerRef: raw.customerRef,
      account: raw.account,
      phone: raw.phone,
    };
  } else if ((kind === 'paybill' || (!kind && raw.paybill)) && raw.paybill) {
    destination = {
      kind: 'paybill',
      paybill: String(raw.paybill),
      account: String(raw.account ?? ''),
      recipientName: raw.recipient ?? undefined,
    };
  } else if ((kind === 'till' || (!kind && raw.till)) && raw.till) {
    destination = {
      kind: 'till',
      till: String(raw.till),
      recipientName: raw.recipient ?? undefined,
    };
  } else if (raw.phone) {
    destination = {
      kind: 'phone',
      phone: String(raw.phone),
      recipientName: raw.recipient ?? undefined,
    };
  } else {
    // No recognisable destination — route will reject; caller filters results
    destination = { kind: 'phone', phone: '', recipientName: raw.recipient ?? undefined };
  }

  const label =
    raw.label ??
    (destination.kind === 'till'
      ? `Till ${(destination as any).till}`
      : destination.kind === 'paybill'
      ? `Paybill ${(destination as any).paybill}`
      : destination.kind === 'phone'
      ? `Phone ${(destination as any).phone}`
      : destination.kind === 'internal'
      ? `User ${(destination as any).recipientId}`
      : destination.kind === 'bill'
      ? `Bill ${(destination as any).billType}`
      : 'Payment');

  return { amount, destination, narration: raw.narration, label };
}

/** Human-readable summary of a BatchResult for voice readback */
export function summariseBatchResults(results: BatchResult[]): string {
  const passed = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  if (failed.length === 0) return `All ${passed.length} payments sent successfully.`;
  if (passed.length === 0) return `All ${failed.length} payments failed. ${failed.map(f => f.error).join('; ')}`;
  return (
    `${passed.length} of ${results.length} payments sent.` +
    ` ${failed.length} failed: ` +
    failed.map(f => `${f.label ?? f.kind} — ${f.error ?? 'unknown error'}`).join('; ') +
    '.'
  );
}
