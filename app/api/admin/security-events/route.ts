import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// Admin-only feed of security_events. Guarded by ADMIN_EMAILS, served via the
// service role (security_events is RLS-restricted to owners otherwise).
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase());
  if (!user.email || !adminEmails.includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const eventType = url.searchParams.get('event_type');
  const admin = createServiceClient();

  let query = admin
    .from('security_events')
    .select('id, user_id, event_type, severity, ip, user_agent, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(300);
  if (eventType) query = query.eq('event_type', eventType);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ events: data ?? [] });
}
