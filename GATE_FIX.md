# Gate API Fix - Complete

## Problem
The API was trying to access a `users` table that doesn't exist. Your database uses `profiles` table instead.

## What Was Fixed

### ✅ API Files Updated (5 files)
All API endpoints now use `profiles` instead of `users`:
- `/app/api/gate/ensure/route.ts` - Main gate creation endpoint
- `/app/api/gate/backfill/route.ts` - Bulk gate creation
- `/app/api/gate/check-setup/route.ts` - Diagnostic endpoint
- `/app/api/gate/create/route.ts` - Manual gate creation
- `/app/api/gate/signup/route.ts` - Gate creation on signup

### 📋 Migration Created
Created `database/migrations/002_add_gate_fields_to_profiles.sql` to add the required columns.

## Next Steps

### 1. Run the Database Migration

Go to your Supabase dashboard and run this SQL:

```sql
-- Add gate fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS gate_id INTEGER,
ADD COLUMN IF NOT EXISTS gate_name VARCHAR(255);

-- Create index for gate_id lookups
CREATE INDEX IF NOT EXISTS idx_profiles_gate_id ON profiles(gate_id);

-- Add comments
COMMENT ON COLUMN profiles.gate_id IS 'Payment gateway ID from external payment provider';
COMMENT ON COLUMN profiles.gate_name IS 'Payment gateway name derived from user email';
```

### 2. Verify Migration

Check if columns were added:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('gate_id', 'gate_name');
```

Should return 2 rows.

### 3. Restart Dev Server

After running the migration, restart your Next.js server:

```bash
# Stop current server (Ctrl+C)
npm run dev
```

### 4. Test Login

Try logging in again. The error should be gone and gate creation should work!

## How It Works Now

1. User logs in via `/app/login/page.tsx`
2. Login calls `/api/gate/ensure` POST endpoint
3. API checks if user exists in `profiles` table
4. If user has no gate, creates one via external API
5. Updates `profiles` table with `gate_id` and `gate_name`

## Notes

- SQL lint errors are false positives (SQL Server linter, but we use PostgreSQL)
- The syntax is 100% valid for Supabase/PostgreSQL
- All table references now correctly use `profiles`
