import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WalletService } from '@/lib/services/walletService';
import type { BatchItem } from '@/lib/batch-payments';
import { normalizePhone, displayPhone } from '@/lib/phone';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Resolve a recipient name (or raw string) to a phone number via personal_contacts.
 * Returns the item with phone filled in, or with an error flag if not found.
 */
async function resolvePhoneByName(
  supabase: SupabaseClient,
  userId: string,
  item: BatchItem
): Promise<BatchItem> {
  if (item.destination.kind !== 'phone') return item;

  const dest = item.destination as { kind: 'phone'; phone: string; recipientName?: string };

  // Already has a valid phone — skip
  const norm = normalizePhone(dest.phone ?? '');
  if (norm) {
    return {
      ...item,
      destination: { ...dest, phone: displayPhone(norm) },
    };
  }

  // Try to resolve by recipientName
  const nameQuery = dest.recipientName?.trim();
  if (!nameQuery) return item; // no phone, no name → will fail validation downstream

  try {
    const { data: rows } = await supabase
      .from('personal_contacts')
      .select('display_name, phone, normalized_phone')
      .eq('user_id', userId)
      .ilike('display_name', `%${nameQuery}%`)
      .order('display_name', { ascending: true })
      .limit(5);

    if (!rows || rows.length === 0) return item;

    const qLower = nameQuery.toLowerCase();
    const best = rows.find(r => r.display_name.toLowerCase().startsWith(qLower)) ?? rows[0];

    return {
      ...item,
      destination: {
        kind: 'phone',
        phone: best.phone || displayPhone(best.normalized_phone),
        recipientName: best.display_name,
      },
      label: item.label || best.display_name,
    };
  } catch {
    return item; // table may not exist yet — fall through to validation
  }
}

// Multi-payment batch route — no step-up (matches /api/wallet/pay posture).
// Each item is dispatched as an INDIVIDUAL request via WalletService.resolveRailAndSend.
// Execution: sequential (avoids overspend races on the same balance).
// Failure: continue + report (external M-Pesa/NCBA sends are irreversible).
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    // Client-supplied totalAmount / balance are intentionally IGNORED — server derives the total.
    const { payments, narration } = body as { payments?: BatchItem[]; narration?: string };

    if (!Array.isArray(payments) || payments.length === 0) {
      return NextResponse.json(
        { error: 'payments[] is required and must be non-empty' },
        { status: 400 }
      );
    }

    // Per-item validation
    const validKinds = new Set(['internal', 'phone', 'paybill', 'till', 'bill']);
    for (let i = 0; i < payments.length; i++) {
      const p = payments[i];
      if (!p.amount || p.amount <= 0) {
        return NextResponse.json({ error: `payments[${i}].amount must be > 0` }, { status: 400 });
      }
      if (!p.destination?.kind || !validKinds.has(p.destination.kind)) {
        return NextResponse.json(
          { error: `payments[${i}].destination.kind must be one of: internal, phone, paybill, till, bill` },
          { status: 400 }
        );
      }
    }

    // ── Name resolution — fill phone from personal_contacts for voice items ──
    // The ElevenLabs agent sometimes sends { recipient: "Mary", phone: "" }
    // when the user said a name instead of a number.
    const resolvedPayments = await Promise.all(
      payments.map(p => resolvePhoneByName(supabase, user.id, p))
    );

    // Re-validate after resolution (a resolved item may now have a valid phone)
    for (let i = 0; i < resolvedPayments.length; i++) {
      const p = resolvedPayments[i];
      if (p.destination.kind === 'phone') {
        const d = p.destination as { kind: 'phone'; phone: string };
        if (!d.phone) {
          return NextResponse.json(
            { error: `payments[${i}]: phone number is required but could not be resolved from the recipient name.` },
            { status: 400 }
          );
        }
      }
    }

    const ws = new WalletService(supabase);

    // ── Pre-flight: sum estimated debits, compare to balance ─────────────────
    // This is the "know the total, compare to balance" check — reject the whole
    // batch before sending a single payment if the user can't afford it all.
    let totalRequested = 0;
    for (const p of resolvedPayments) {
      const isExternal = p.destination.kind !== 'internal';
      const fees = ws.calculateFees(p.amount, isExternal);
      totalRequested += fees.totalDebit;
    }

    const wallet = await ws.getOrCreateWallet(user.id);
    if (wallet.available_balance < totalRequested) {
      const shortfall = totalRequested - wallet.available_balance;
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient funds',
          message:
            `You need KES ${shortfall.toFixed(2)} more to cover all ${resolvedPayments.length} payments ` +
            `(estimated total debit KES ${totalRequested.toFixed(2)}).`,
          shortfall,
          totalRequested,
        },
        { status: 400 }
      );
    }

    console.log(
      `📦 Batch: ${resolvedPayments.length} payments, estimated KES ${totalRequested.toFixed(2)} for user ${user.id}`
    );

    // ── Sequential fan-out — one resolveRailAndSend call per item ────────────
    const results: Array<{
      index: number;
      label?: string;
      amount: number;
      kind: string;
      success: boolean;
      transaction_id?: string;
      bank_ref?: string;
      error?: string;
    }> = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < resolvedPayments.length; i++) {
      const p = resolvedPayments[i];
      try {
        const result = await ws.resolveRailAndSend({
          userId: user.id,
          amount: p.amount,
          destination: p.destination,
          narration: p.narration ?? narration ?? `Batch item ${i + 1} of ${resolvedPayments.length}`,
        });
        results.push({
          index: i,
          label: p.label,
          amount: p.amount,
          kind: p.destination.kind,
          success: true,
          transaction_id: result.transaction_id,
          bank_ref: result.bank_ref,
        });
        successCount++;
        console.log(`  ✅ [${i + 1}/${resolvedPayments.length}] ${p.label ?? p.destination.kind} KES ${p.amount}`);
      } catch (err: any) {
        results.push({
          index: i,
          label: p.label,
          amount: p.amount,
          kind: p.destination.kind,
          success: false,
          error: err.message,
        });
        failCount++;
        console.warn(
          `  ❌ [${i + 1}/${resolvedPayments.length}] ${p.label ?? p.destination.kind} KES ${p.amount}: ${err.message}`
        );
        // Continue with the rest — external sends can't be reversed, so we process what we can.
      }
    }

    console.log(`✅ Batch done: ${successCount} succeeded, ${failCount} failed`);

    return NextResponse.json({
      success: true,
      totalRequested,
      successCount,
      failCount,
      results,
    });
  } catch (error: any) {
    console.error('Batch payment error:', error);
    return NextResponse.json(
      { error: 'Failed to process batch payment', details: error.message },
      { status: 500 }
    );
  }
}
