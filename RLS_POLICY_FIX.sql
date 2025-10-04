-- ============================================
-- RLS POLICIES FOR VOICE_SESSIONS
-- ============================================
-- Run this in Supabase SQL Editor

-- 1. Enable RLS on voice_sessions (if not already)
ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they exist (to avoid errors)
DROP POLICY IF EXISTS "Allow reading all sessions" ON voice_sessions;
DROP POLICY IF EXISTS "Users can create own sessions" ON voice_sessions;
DROP POLICY IF EXISTS "Service role full access" ON voice_sessions;

-- 3. Allow webhook to read ALL sessions (needed for fallback user lookup)
CREATE POLICY "Allow reading all sessions"
  ON voice_sessions FOR SELECT
  USING (true);

-- 4. Allow authenticated users to insert their own sessions
CREATE POLICY "Users can create own sessions"
  ON voice_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. Allow service role full access (if you have service key)
CREATE POLICY "Service role full access"
  ON voice_sessions FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- VERIFY POLICIES
-- ============================================
SELECT 
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies
WHERE tablename = 'voice_sessions'
ORDER BY policyname;

-- ============================================
-- TEST QUERY
-- ============================================
-- This is what the webhook will run
-- Should return at least 1 row if you've opened voice interface
SELECT 
  user_id,
  session_id,
  created_at,
  status,
  expires_at
FROM voice_sessions
ORDER BY created_at DESC
LIMIT 5;

-- If this returns 0 rows:
-- → Open voice interface at localhost:3000 to create a session
-- → Check logs for "Saved voice session"

-- ============================================
-- DONE!
-- ============================================
