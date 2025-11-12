# Database Setup Guide

## Overview

Ongea Pesa uses a dual-table architecture for user management:
- **`auth.users`** - Managed by Supabase Auth (authentication)
- **`public.users`** - Custom user data (profile, balance, gate info)

## Table Relationships

```
auth.users (Supabase Auth)
    ↓
    | (trigger: on_auth_user_created)
    ↓
public.users (Your App Data)
```

## Database Schema

### auth.users (Supabase Managed)
```sql
-- This table is managed by Supabase
-- You don't create it, but you can reference it
id UUID PRIMARY KEY
email VARCHAR
phone VARCHAR (optional)
raw_user_meta_data JSONB
created_at TIMESTAMP
updated_at TIMESTAMP
```

### public.users (Your Custom Table)
```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  phone VARCHAR(15) NOT NULL,
  name VARCHAR(100),
  email VARCHAR(255),
  voice_profile JSONB,
  pin_hash VARCHAR(255),
  balance NUMERIC(12, 2) DEFAULT 0.00,
  daily_limit NUMERIC(10, 2) DEFAULT 100000.00,
  gate_id INTEGER,              -- Added for payment gateway
  gate_name VARCHAR(255),       -- Added for payment gateway
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_phone_key UNIQUE (phone)
);
```

## Setup Instructions

### Step 1: Ensure Base Tables Exist

Your `public.users` table should already exist. Verify with:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'users';
```

### Step 2: Add Gate Fields

Run migration `004_add_gate_fields.sql`:

```sql
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS gate_id INTEGER,
ADD COLUMN IF NOT EXISTS gate_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_users_gate_id ON public.users(gate_id);

COMMENT ON COLUMN public.users.gate_id IS 'Payment gateway ID from external payment provider';
COMMENT ON COLUMN public.users.gate_name IS 'Payment gateway name derived from user email';
```

### Step 3: Setup Auto-Create Trigger

Run migration `005_user_creation_trigger.sql`:

This trigger ensures that whenever someone signs up via Supabase Auth:
1. Auth user is created in `auth.users`
2. Trigger fires automatically
3. Corresponding entry created in `public.users`
4. Ready for gate creation!

```sql
-- The trigger function
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id, email, phone, name, balance, daily_limit, is_active, created_at, updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.phone, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    0.00,
    100000.00,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
```

### Step 4: Backfill Existing Users

If you have existing auth users without `public.users` entries:

```sql
INSERT INTO public.users (id, email, phone, name, balance, daily_limit, is_active, created_at, updated_at)
SELECT 
  u.id,
  u.email,
  COALESCE(u.phone, ''),
  COALESCE(u.raw_user_meta_data->>'name', ''),
  0.00,
  100000.00,
  true,
  NOW(),
  NOW()
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = u.id)
ON CONFLICT (id) DO NOTHING;
```

## Signup Flow with Gate Creation

```
1. User fills signup form (email, password)
   ↓
2. Supabase creates auth.users entry
   ↓
3. Trigger creates public.users entry
   ↓
4. Frontend calls /api/gate/signup
   ↓
5. External API creates payment gate
   ↓
6. gate_id and gate_name saved to public.users
   ↓
7. User ready to transact!
```

## Verification Queries

### Check Auth Users
```sql
SELECT id, email, phone, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 10;
```

### Check Public Users
```sql
SELECT id, email, phone, name, balance, gate_id, gate_name, created_at 
FROM public.users 
ORDER BY created_at DESC 
LIMIT 10;
```

### Find Auth Users Without Public Entry
```sql
SELECT 
  au.id,
  au.email,
  au.created_at as auth_created,
  CASE 
    WHEN pu.id IS NULL THEN '❌ MISSING'
    ELSE '✅ EXISTS'
  END as status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;
```

### Find Users Without Gates
```sql
SELECT id, email, gate_id, gate_name, created_at
FROM public.users
WHERE gate_id IS NULL OR gate_name IS NULL
ORDER BY created_at DESC;
```

## Important Notes

### Phone Number Requirement

Your `public.users` table has `phone` as NOT NULL, but `auth.users` doesn't require it. You have two options:

**Option 1: Make phone nullable (Recommended for email signups)**
```sql
ALTER TABLE public.users ALTER COLUMN phone DROP NOT NULL;
```

**Option 2: Require phone during signup**
Modify your signup form to collect phone number and pass it as metadata:
```typescript
await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      phone: phoneNumber,
      name: fullName
    }
  }
});
```

### ID Matching

- The `id` in `public.users` MUST match `id` in `auth.users`
- This is enforced by the trigger
- Never manually create `public.users` entries with random UUIDs

### Security

- Use Row Level Security (RLS) on `public.users`:

```sql
-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can view their own data
CREATE POLICY "Users can view own data"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Service role can do everything (for triggers and admin operations)
CREATE POLICY "Service role has full access"
  ON public.users
  USING (auth.jwt()->>'role' = 'service_role');
```

## Migration Order

Run migrations in this order:

1. ✅ Base `users` table (already exists in your case)
2. ✅ `004_add_gate_fields.sql` - Add gate columns
3. ✅ `005_user_creation_trigger.sql` - Setup auto-creation trigger
4. ✅ Backfill existing users (if needed)
5. ✅ Enable RLS policies

## Testing

### Test User Creation
```sql
-- Check trigger exists
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Should show: on_auth_user_created | INSERT | users
```

### Test Signup Flow

1. Sign up via app with email: `test@example.com`
2. Check auth user was created:
```sql
SELECT * FROM auth.users WHERE email = 'test@example.com';
```

3. Check public user was auto-created:
```sql
SELECT * FROM public.users WHERE email = 'test@example.com';
```

4. Check gate was created:
```sql
SELECT email, gate_id, gate_name FROM public.users WHERE email = 'test@example.com';
```

Expected result:
- All three queries return data
- IDs match across tables
- gate_id and gate_name are populated

## Troubleshooting

### Trigger Not Firing

**Check if trigger exists:**
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

**Re-create trigger:**
```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
```

### Phone Constraint Error

If you see: `ERROR: null value in column "phone" violates not-null constraint`

**Solution:**
```sql
ALTER TABLE public.users ALTER COLUMN phone DROP NOT NULL;
-- or set a default:
ALTER TABLE public.users ALTER COLUMN phone SET DEFAULT '';
```

### Gate Not Being Created

Check logs in browser console and server logs. Common issues:
- Missing `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
- External API not responding
- Network connectivity issues

## Summary

✅ **auth.users** - Authentication (managed by Supabase)  
✅ **public.users** - User profile & data (managed by you)  
✅ **Trigger** - Auto-syncs the two tables  
✅ **Gate fields** - Store payment gateway info  
✅ **RLS** - Secure data access  

Your database is now ready for the complete signup + gate creation flow!
