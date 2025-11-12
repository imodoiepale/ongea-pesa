-- Migration: Enhanced trigger to call gate creation via webhook
-- Description: When a user is created, this trigger can notify your app to create a gate

-- Note: PostgreSQL cannot directly make HTTP requests without extensions
-- This migration provides the SQL structure
-- The actual gate creation happens via your app's API

-- Create a function that will be used to flag users needing gates
CREATE OR REPLACE FUNCTION public.flag_user_needs_gate()
RETURNS TRIGGER AS $$
BEGIN
  -- You can add a column like 'gate_creation_pending' if needed
  -- For now, we just ensure the user exists
  -- The app will check and create gates as needed
  
  RAISE NOTICE 'New user created: % - Gate creation pending', NEW.email;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Optional: Add a column to track gate creation status
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS gate_creation_attempted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS gate_creation_attempted_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.users.gate_creation_attempted IS 'Whether gate creation has been attempted for this user';
COMMENT ON COLUMN public.users.gate_creation_attempted_at IS 'When gate creation was last attempted';

-- Create trigger to flag new users
DROP TRIGGER IF EXISTS on_user_needs_gate ON public.users;

CREATE TRIGGER on_user_needs_gate
  AFTER INSERT ON public.users
  FOR EACH ROW
  WHEN (NEW.gate_id IS NULL)
  EXECUTE FUNCTION public.flag_user_needs_gate();

-- View to see users who need gates
CREATE OR REPLACE VIEW public.users_needing_gates AS
SELECT 
  id,
  email,
  name,
  created_at,
  gate_creation_attempted,
  gate_creation_attempted_at,
  CASE 
    WHEN gate_id IS NOT NULL THEN '✅ Has Gate'
    WHEN gate_creation_attempted = true THEN '⏳ Attempted'
    ELSE '❌ Needs Gate'
  END as status
FROM public.users
WHERE gate_id IS NULL OR gate_name IS NULL
ORDER BY created_at DESC;

COMMENT ON VIEW public.users_needing_gates IS 'View of all users who need gates created';

-- Function to mark gate creation attempt
CREATE OR REPLACE FUNCTION public.mark_gate_creation_attempted(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.users
  SET 
    gate_creation_attempted = true,
    gate_creation_attempted_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.mark_gate_creation_attempted IS 'Mark that gate creation has been attempted for a user';
