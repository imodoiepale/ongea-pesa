-- A one-time, explicitly disclosed starter-wallet funding checkpoint.
-- Existing onboarded customers are grandfathered so this only gates new users.

alter table public.profiles
  add column if not exists voice_funding_completed_at timestamptz,
  add column if not exists voice_funding_transaction_id text,
  add column if not exists voice_funding_amount numeric(15,2);

update public.profiles
set voice_funding_completed_at = coalesce(onboarding_completed_at, now()),
    voice_funding_amount = coalesce(voice_funding_amount, 0)
where onboarding_completed_at is not null
  and voice_funding_completed_at is null;
