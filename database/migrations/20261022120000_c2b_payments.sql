-- Incoming PayBill/Till payments pushed by Safaricom Daraja C2B (Confirmation URL).
-- trans_id (M-Pesa receipt) is unique so Safaricom retries never double-record.
create table if not exists public.c2b_payments (
  id uuid primary key default gen_random_uuid(),
  trans_id text not null unique,
  trans_type text,
  amount numeric(14,2) not null,
  shortcode text not null,
  bill_ref text,
  msisdn text,
  first_name text,
  trans_time timestamptz,
  org_balance numeric(14,2),
  raw jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists c2b_payments_trans_time_idx on public.c2b_payments (trans_time desc);

alter table public.c2b_payments enable row level security;
-- Writes come only from the service role (callback route).
-- Admin read (needed for Realtime). ponytail: mirrors BASE_ADMIN_EMAILS in lib/admin.ts; env-only admins (ADMIN_EMAILS) get no live feed until added here.
create policy c2b_payments_admin_read on public.c2b_payments for select to authenticated
  using (lower(auth.jwt()->>'email') in ('ijepale@gmail.com','admin@ongeapesa.com','ongeapesa.kenya@gmail.com','info@nsait.co.ke'));

alter publication supabase_realtime add table public.c2b_payments;
