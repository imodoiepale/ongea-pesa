-- Orbital Voice onboarding persistence, reminder schedules, and profile avatars.

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists avatar_url text,
  add column if not exists preferred_language text not null default 'en'
    check (preferred_language in ('en', 'sw')),
  add column if not exists voice_calibration_score integer
    check (voice_calibration_score between 0 and 100),
  add column if not exists voice_calibrated_at timestamptz,
  add column if not exists onboarding_completed_at timestamptz;

create table if not exists public.scheduled_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_label text not null,
  destination jsonb not null,
  amount numeric(15,2) not null check (amount > 0),
  frequency text not null check (frequency in ('once', 'weekly', 'monthly')),
  next_run_at timestamptz not null,
  reminder_enabled boolean not null default true,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scheduled_payments_user_next_idx
  on public.scheduled_payments(user_id, next_run_at)
  where status = 'active';

alter table public.scheduled_payments enable row level security;
drop policy if exists "scheduled_payments_owner_select" on public.scheduled_payments;
drop policy if exists "scheduled_payments_owner_insert" on public.scheduled_payments;
drop policy if exists "scheduled_payments_owner_update" on public.scheduled_payments;
drop policy if exists "scheduled_payments_owner_delete" on public.scheduled_payments;
create policy "scheduled_payments_owner_select" on public.scheduled_payments for select using (auth.uid() = user_id);
create policy "scheduled_payments_owner_insert" on public.scheduled_payments for insert with check (auth.uid() = user_id);
create policy "scheduled_payments_owner_update" on public.scheduled_payments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "scheduled_payments_owner_delete" on public.scheduled_payments for delete using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatar_public_read" on storage.objects;
drop policy if exists "avatar_owner_insert" on storage.objects;
drop policy if exists "avatar_owner_update" on storage.objects;
drop policy if exists "avatar_owner_delete" on storage.objects;
create policy "avatar_public_read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatar_owner_insert" on storage.objects for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar_owner_update" on storage.objects for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar_owner_delete" on storage.objects for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
