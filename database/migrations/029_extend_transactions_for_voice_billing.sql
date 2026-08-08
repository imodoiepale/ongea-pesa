-- Extend the canonical transactions ledger for voice billing and fee rows.
--
-- Live schema currently rejects two rows the app now writes:
--   - type = 'voice_usage'
--   - type = 'platform_fee'
-- and it also lacks the optional description column used by the voice billing
-- route and the admin transaction views.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_type_check
  CHECK (
    type = ANY (
      ARRAY[
        'send_phone'::text,
        'buy_goods_pochi'::text,
        'buy_goods_till'::text,
        'paybill'::text,
        'withdraw'::text,
        'bank_to_mpesa'::text,
        'mpesa_to_bank'::text,
        'deposit'::text,
        'receive'::text,
        'voice_usage'::text,
        'platform_fee'::text
      ]
    )
  );

COMMENT ON COLUMN public.transactions.description IS
  'Optional human-readable memo for transaction detail views and billing rows.';
