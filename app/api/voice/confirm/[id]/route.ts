import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { consumeStepupToken, isLocked } from '@/lib/services/securityService';
import { logSecurityEvent, requestContext } from '@/lib/services/auditService';

const N8N_BASE = process.env.N8N_WEBHOOK_BASE_URL || 'https://n8n-lc5r.srv1631847.hstgr.cloud';
const N8N_WEBHOOK_URL = `${N8N_BASE}/webhook/send_money`;

// Release a staged voice payment after a fresh PIN/passkey proof.
// Body: { stepup_token }
// Returns the n8n response on success.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { stepup_token } = await request.json().catch(() => ({}));
    const { ip, userAgent } = requestContext(request);
    const admin = createServiceClient();

    // Account-lock check (mirrors /api/wallet/* gates).
    const { data: lockState } = await admin
      .from('profiles')
      .select('locked_until, failed_attempts')
      .eq('id', user.id)
      .single();
    if (isLocked(lockState)) {
      return NextResponse.json(
        { error: 'Account temporarily locked.', lockedUntil: lockState!.locked_until },
        { status: 423 }
      );
    }

    // Load the staged payment and verify ownership + state.
    const { data: pending, error: pendingError } = await admin
      .from('pending_voice_payments')
      .select('id, user_id, payload, status, expires_at')
      .eq('id', id)
      .single();

    if (pendingError || !pending) {
      return NextResponse.json({ error: 'Pending payment not found' }, { status: 404 });
    }
    if (pending.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (pending.status !== 'awaiting_confirm') {
      return NextResponse.json(
        { error: `Already ${pending.status}`, status: pending.status },
        { status: 409 }
      );
    }
    if (new Date(pending.expires_at).getTime() < Date.now()) {
      await admin.from('pending_voice_payments').update({ status: 'expired' }).eq('id', pending.id);
      return NextResponse.json({ error: 'Pending payment expired' }, { status: 410 });
    }

    // Consume the step-up token (fresh PIN/passkey proof).
    const stepUpOk = await consumeStepupToken(admin, user.id, stepup_token);
    if (!stepUpOk) {
      return NextResponse.json(
        { error: 'Step-up authentication required', code: 'STEPUP_REQUIRED' },
        { status: 403 }
      );
    }

    await logSecurityEvent(
      { userId: user.id, eventType: 'money_send_initiated', ip, userAgent, metadata: { source: 'voice', pendingId: pending.id, type: (pending.payload as any)?.type } },
      admin
    );

    // Release: forward the original n8n payload to /webhook/send_money.
    let n8nResult: any = {};
    let okStatus = 200;
    try {
      const res = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pending.payload),
      });
      okStatus = res.status;
      const text = await res.text();
      n8nResult = text ? (() => { try { return JSON.parse(text); } catch { return { raw: text }; } })() : {};
    } catch (err: any) {
      await admin
        .from('pending_voice_payments')
        .update({ status: 'failed', result: { error: err.message } })
        .eq('id', pending.id);
      return NextResponse.json({ success: false, error: 'Failed to release to n8n', details: err.message }, { status: 502 });
    }

    await admin
      .from('pending_voice_payments')
      .update({ status: 'released', released_at: new Date().toISOString(), result: n8nResult })
      .eq('id', pending.id);

    await logSecurityEvent(
      { userId: user.id, eventType: 'money_send_result', severity: okStatus < 400 ? 'info' : 'warning', ip, userAgent, metadata: { source: 'voice', pendingId: pending.id, n8nStatus: okStatus } },
      admin
    );

    return NextResponse.json({ success: true, pending_id: pending.id, n8n: n8nResult });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to confirm payment' }, { status: 500 });
  }
}

// Cancel a staged voice payment from the app.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createServiceClient();
    const { data: pending } = await admin
      .from('pending_voice_payments')
      .select('id, user_id, status')
      .eq('id', id)
      .single();
    if (!pending || pending.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (pending.status !== 'awaiting_confirm') {
      return NextResponse.json({ error: `Already ${pending.status}` }, { status: 409 });
    }

    await admin
      .from('pending_voice_payments')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', pending.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to cancel' }, { status: 500 });
  }
}
