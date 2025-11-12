# Gate Integration - Quick Start Guide

## ✅ What Was Implemented

The payment gate integration has been successfully implemented with the following features:

### 1. **Database Schema**
- Added `gate_id` (INTEGER) to profiles table
- Added `gate_name` (VARCHAR) to profiles table
- Created index for gate_id lookups
- Migration file: `database/migrations/004_add_gate_fields.sql`

### 2. **API Endpoints**

#### `/api/gate/signup` (POST)
- **Purpose**: Create gate during user signup (no auth required)
- **Input**: `{ email, userId }`
- **Output**: `{ success, message, gate_id, gate_name }`

#### `/api/gate/create` (POST)
- **Purpose**: Create gate for authenticated users
- **Input**: `{ email }`
- **Output**: `{ success, message, gate_id, gate_name }`

### 3. **Signup Flow Integration**
- Modified `app/signup/page.tsx`
- Automatically calls gate creation after successful signup
- Non-blocking (signup succeeds even if gate creation fails)

## 🚀 Setup Steps

### Step 0: Handle Phone Number Constraint (Important!)

Your `users` table has `phone` as NOT NULL, but signup only collects email. Choose one option:

**Option A: Make phone nullable (Recommended for now)**
```sql
ALTER TABLE public.users ALTER COLUMN phone DROP NOT NULL;
```

**Option B: Set default empty string**
```sql
ALTER TABLE public.users ALTER COLUMN phone SET DEFAULT '';
```

### Step 1: Run Database Migration

```sql
-- Run this in Supabase SQL Editor
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS gate_id INTEGER,
ADD COLUMN IF NOT EXISTS gate_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_users_gate_id ON public.users(gate_id);

COMMENT ON COLUMN public.users.gate_id IS 'Payment gateway ID from external payment provider';
COMMENT ON COLUMN public.users.gate_name IS 'Payment gateway name derived from user email';
```

### Step 2: Setup User Auto-Creation Trigger

Run this to ensure `public.users` entry is created when auth user signs up:

```sql
-- See database/migrations/005_user_creation_trigger.sql for full code
-- This creates a trigger that auto-populates public.users from auth.users

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, phone, name, balance, daily_limit, is_active, created_at, updated_at)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.phone, ''), 
          COALESCE(NEW.raw_user_meta_data->>'name', ''), 
          0.00, 100000.00, true, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
```

### Step 3: Add Environment Variable

Add to `.env.local`:

```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Where to find it:**
1. Go to Supabase Dashboard
2. Navigate to: Settings → API
3. Copy the `service_role` key (⚠️ Keep this secret!)

### Step 4: Verify Environment Variables

Your `.env.local` should have:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # NEW!

# ElevenLabs (if using voice)
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your_agent_id

# Optional
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 🧪 Testing

### Test 1: Sign Up New User

1. Start the dev server:
```bash
npm run dev
```

2. Navigate to: `http://localhost:3000/signup`

3. Sign up with:
   - Email: `test.user@example.com`
   - Password: `SecurePassword123!`

4. Check browser console for:
```
Gate created successfully: { gate_id: 329, gate_name: "test.user" }
```

5. Verify in Supabase:
```sql
SELECT id, email, gate_id, gate_name 
FROM users 
WHERE email = 'test.user@example.com';
```

Expected result:
```
gate_id: 329
gate_name: test.user
```

### Test 2: Manual Gate Creation (Authenticated)

```bash
# 1. Login to get a session token
# 2. Make authenticated request

curl -X POST http://localhost:3000/api/gate/create \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_SESSION_COOKIE" \
  -d '{"email": "user@example.com"}'
```

## 📋 Gate Creation Logic

### Input Processing

```
User Email: john.doe@example.com
         ↓
Extract: john.doe (everything before @)
         ↓
Gate Name: john.doe
```

### External API Call

**Endpoint:**
```
POST https://aps.co.ke/indexpay/api/get_transactions_2.php
```

**Parameters:**
```
request: "7"
user_email: "info@nsait.co.ke" (fixed)
gate_name: {extracted_from_user_email}
gate_currency: "KES"
gate_description: "USER WALLET FOR {gate_name}"
pocket_name: "ongeapesa_wallet"
gate_account_name: "0"
gate_account_no: "0"
gate_bank_name: "0"
gate_bank_branch: ""
gate_swift_code: ""
```

**Expected Response:**
```json
{
  "status": true,
  "Message": "gate add success",
  "gate_id": 329,
  "gate_name": "john.doe"
}
```

## 🔍 Debugging

### Check API Logs

For Next.js API routes:
```bash
# Terminal running npm run dev will show:
Gate creation error: [error details]
Failed to update profile with gate info: [error details]
```

### Check Browser Console

In DevTools Console:
```javascript
// Success
Gate created successfully: { gate_id: 329, gate_name: "user" }

// Failure
Gate creation failed: [error message]
Error creating gate: [error details]
```

### Check Database

```sql
-- Check if gate fields were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('gate_id', 'gate_name');

-- Check user's gate info
SELECT email, gate_id, gate_name, created_at 
FROM users 
ORDER BY created_at DESC 
LIMIT 10;
```

## ⚠️ Important Notes

### Security
- ✅ Service role key is **only** used server-side
- ✅ Never expose service role key to client
- ✅ Gate creation is non-blocking (won't break signup)

### Error Handling
- If gate creation fails, user can still sign up
- Errors are logged but don't prevent signup
- Can manually create gate later via `/api/gate/create`

### Gate Naming
- Gate name is derived from email prefix
- Example: `john.doe@example.com` → `john.doe`
- Must be unique in external system

## 📚 Documentation

- **Full Guide**: `docs/integrations/GATE_INTEGRATION.md`
- **Setup Guide**: `docs/setup/SETUP_GUIDE.md`
- **Database Migration**: `database/migrations/004_add_gate_fields.sql`

## 🎯 Success Checklist

- [ ] Database migration run successfully
- [ ] `SUPABASE_SERVICE_ROLE_KEY` added to `.env.local`
- [ ] New signup creates gate automatically
- [ ] `gate_id` and `gate_name` saved to users table
- [ ] Browser console shows success message
- [ ] Database query confirms gate data

## 🆘 Troubleshooting

### Error: "SUPABASE_SERVICE_ROLE_KEY is not defined"
**Solution:** Add the key to `.env.local` and restart dev server

### Error: "Failed to create gate with external API"
**Solution:** Check internet connection and external API availability

### Error: "Failed to save gate information to database"
**Solution:** Verify database migration ran successfully and RLS policies are correct

### Gate Created But Not Saved
**Solution:** Check if userId matches the auth.users id in Supabase

---

## ✨ Next Steps

After successful gate integration:
1. Test wallet funding via gate
2. Implement gate balance sync
3. Add gate transaction history
4. Set up webhooks for gate events
