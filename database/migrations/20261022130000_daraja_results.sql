-- Async results from Daraja org APIs (Account Balance, Transaction Status, Pull)
-- posted to /api/pay/daraja/result. Service-role writes and reads only.
create table if not exists public.daraja_results (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  conversation_id text,
  originator_conversation_id text,
  result_code text,
  result_desc text,
  params jsonb not null default '{}',
  raw jsonb,
  created_at timestamptz not null default now()
);
create index if not exists daraja_results_kind_created_idx on public.daraja_results (kind, created_at desc);
alter table public.daraja_results enable row level security;
