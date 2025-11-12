-- Migration: Create gates for existing users without them
-- Description: Backfill script to ensure all existing users have payment gates

-- Step 1: Find all users without gates
-- This query shows users who need gates
SELECT 
  id,
  email,
  name,
  gate_id,
  gate_name,
  created_at,
  CASE 
    WHEN gate_id IS NULL OR gate_name IS NULL THEN '❌ NEEDS GATE'
    ELSE '✅ HAS GATE'
  END as gate_status
FROM public.users
WHERE gate_id IS NULL OR gate_name IS NULL
ORDER BY created_at ASC;

-- Note: The actual gate creation must be done via the API
-- because it requires calling the external payment provider
-- 
-- To create gates for these users, run the backfill API endpoint:
-- POST /api/gate/backfill
--
-- Or manually for each user:
-- POST /api/gate/create-for-user
-- Body: { "userId": "user-uuid-here" }

COMMENT ON TABLE public.users IS 'Users table - all users should have gate_id and gate_name populated';
