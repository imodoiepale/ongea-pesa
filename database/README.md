# Database Migrations for Ongea Pesa

## Quick Start - Add Gate Fields to Profiles

### Using Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Run this migration:
   - `002_add_gate_fields_to_profiles.sql` - Adds gate_id and gate_name to profiles table

### Option 2: Copy/Paste SQL Directly

Open Supabase SQL Editor and run this:

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

## Troubleshooting

### Error: "Could not find the table 'public.users' in the schema cache"

This means the API is looking for the wrong table. The fix is already done - the API now uses `profiles` instead of `users`.

### Check if migration was applied

```sql
-- Check if gate_id and gate_name columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('gate_id', 'gate_name');

-- Should return 2 rows if migration was successful
```

### Verify everything is working

```sql
-- Check your profiles table structure
SELECT * FROM profiles LIMIT 5;

-- Check if you can update gate fields
UPDATE profiles 
SET gate_id = 12345, gate_name = 'test_gate' 
WHERE id = auth.uid();
```

## After Running Migrations

1. Restart your Next.js development server
2. Try logging in again
3. The API should now work correctly

## Notes

- API uses `profiles` table to match your existing database schema
- The database stores it as `public.profiles` (standard PostgreSQL)
- `gate_id` and `gate_name` are added to track external payment gateway info
- No triggers needed - profiles table already exists with user data
