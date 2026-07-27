-- Consent-backed voice reference samples for onboarding.
-- Face and fingerprint templates are intentionally not stored: passkeys keep
-- biometric matching inside the user's authenticator/device.

alter table public.profiles
  add column if not exists voice_biometric_consent_at timestamptz,
  add column if not exists voice_biometric_enrolled_at timestamptz,
  add column if not exists voice_biometric_sample_path text,
  add column if not exists device_biometrics_consent_at timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voice-biometric-samples',
  'voice-biometric-samples',
  false,
  2097152,
  array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav', 'audio/mpeg']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "voice_biometric_owner_select" on storage.objects;
drop policy if exists "voice_biometric_owner_insert" on storage.objects;
drop policy if exists "voice_biometric_owner_update" on storage.objects;
drop policy if exists "voice_biometric_owner_delete" on storage.objects;

create policy "voice_biometric_owner_select"
on storage.objects for select
using (
  bucket_id = 'voice-biometric-samples'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "voice_biometric_owner_insert"
on storage.objects for insert
with check (
  bucket_id = 'voice-biometric-samples'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "voice_biometric_owner_update"
on storage.objects for update
using (
  bucket_id = 'voice-biometric-samples'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'voice-biometric-samples'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "voice_biometric_owner_delete"
on storage.objects for delete
using (
  bucket_id = 'voice-biometric-samples'
  and (storage.foldername(name))[1] = auth.uid()::text
);
