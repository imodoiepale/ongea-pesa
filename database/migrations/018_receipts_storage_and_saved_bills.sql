-- Migration 018: saved_bills table + receipts storage bucket
--
-- Scanned receipts and manually entered bills are staged here. The user can
-- review, edit, and pay them later. Paid bills reference the resulting
-- transaction. Receipt images are stored in the private `receipts` bucket.

CREATE TABLE IF NOT EXISTS public.saved_bills (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type              text NOT NULL,                    -- 'receipt' | 'till' | 'paybill' | 'send_phone'
  amount            numeric NOT NULL CHECK (amount > 0),
  phone             text DEFAULT '',
  till              text DEFAULT '',
  paybill           text DEFAULT '',
  account           text DEFAULT '',
  merchant          text DEFAULT '',
  receipt_path      text DEFAULT '',                  -- Supabase Storage path (receipts bucket)
  scan_payload      jsonb,                            -- full PaymentScanResult for reference
  status            text NOT NULL DEFAULT 'pending'
                       CHECK (status = ANY (ARRAY['pending','paid','cancelled'])),
  confidence        integer CHECK (confidence >= 0 AND confidence <= 100),
  paid_at           timestamp with time zone,
  paid_transaction_id uuid,
  created_at        timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_bills_user_status
  ON public.saved_bills (user_id, status, created_at DESC);

-- Owner-only RLS. Server-side pay uses service-role, which bypasses RLS.
ALTER TABLE public.saved_bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saved_bills_select_own ON public.saved_bills;
CREATE POLICY saved_bills_select_own ON public.saved_bills
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS saved_bills_insert_own ON public.saved_bills;
CREATE POLICY saved_bills_insert_own ON public.saved_bills
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS saved_bills_update_own ON public.saved_bills;
CREATE POLICY saved_bills_update_own ON public.saved_bills
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage bucket: receipts (private, 5 MB limit, images only)
-- ---------------------------------------------------------------------------
-- The bucket CANNOT be created via a standard SQL migration — Supabase requires
-- it to be created in the dashboard UI or via the Management API.
-- As a convenience, the INSERT below can be run in the Supabase SQL editor
-- (it targets the internal storage schema which is not accessible from the
-- migrations runner in all environments).
--
-- Option A — SQL editor:
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES ('receipts', 'receipts', false, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
-- ON CONFLICT (id) DO NOTHING;
--
-- Option B — Dashboard: Storage → New bucket → name "receipts", toggle Public OFF,
--   set 5 MB file size limit, restrict to image/jpeg, image/png, image/webp.
--
-- Storage RLS policies (run in SQL editor AFTER the bucket exists):
--
-- CREATE POLICY "Users can upload their own receipts"
-- ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
--
-- CREATE POLICY "Users can view their own receipts"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
--
-- CREATE POLICY "Users can delete their own receipts"
-- ON storage.objects FOR DELETE
-- USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
