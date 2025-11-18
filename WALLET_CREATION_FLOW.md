# Wallet Creation Flow Documentation

## Overview
This document explains how wallet/gate creation works in Ongea Pesa, ensuring every user gets a wallet automatically without duplicates.

## ✅ Current Implementation

### 1. **Signup Flow**
When a user signs up:
- User enters email and password
- Supabase creates auth user
- User receives email confirmation link
- **No wallet is created yet** (wallet creation happens after email confirmation)

**File**: `app/signup/page.tsx`

### 2. **Email Confirmation Flow (Primary Wallet Creation)**
When user clicks email confirmation link:
- User is redirected to `/auth/callback`
- Callback route exchanges code for session
- **Checks if user has wallet** (gate_id and gate_name in profiles table)
- **Creates wallet if missing** by calling `/api/gate/signup`
- User is redirected to home page with wallet ready

**File**: `app/auth/callback/route.ts`

**Key Features**:
- ✅ Checks for existing wallet before creating (prevents duplicates)
- ✅ Uses service role client for database operations
- ✅ Non-blocking (doesn't fail auth if wallet creation fails)
- ✅ Comprehensive logging for debugging

### 3. **Login Flow (Backup Wallet Creation)**
When user logs in:
- User enters email and password
- Supabase authenticates user
- **Calls `/api/gate/ensure`** to check/create wallet
- User is redirected to home page

**File**: `app/login/page.tsx`

**Key Features**:
- ✅ Ensures existing users get wallets
- ✅ Handles edge cases where wallet creation failed during signup
- ✅ Non-blocking (doesn't fail login if wallet creation fails)

### 4. **Gate Ensure Endpoint**
Multi-purpose endpoint that ensures authenticated users have wallets:

**Endpoint**: `POST /api/gate/ensure`

**Features**:
- ✅ Authenticates user via Supabase session
- ✅ Checks if user exists in profiles table
- ✅ Creates profile if missing (with RLS bypass)
- ✅ Checks if user has gate_id and gate_name
- ✅ Creates wallet if missing
- ✅ Returns wallet info

**File**: `app/api/gate/ensure/route.ts`

### 5. **Gate Signup Endpoint**
Dedicated endpoint for creating wallets (used by auth callback):

**Endpoint**: `POST /api/gate/signup`

**Parameters**:
```json
{
  "email": "user@example.com",
  "userId": "uuid-of-user"
}
```

**Features**:
- ✅ Checks for existing wallet first (prevents duplicates)
- ✅ Creates unique gate name from email + userId
- ✅ Calls external wallet API (aps.co.ke)
- ✅ Uses upsert to ensure profile exists
- ✅ Comprehensive error handling and logging

**File**: `app/api/gate/signup/route.ts`

## 🔄 Complete Flow Diagram

```
User Signs Up
    ↓
Email Confirmation Sent
    ↓
User Clicks Confirmation Link
    ↓
Auth Callback (/auth/callback)
    ├─ Exchange Code for Session ✅
    ├─ Check if Wallet Exists
    │   ├─ Yes → Skip Creation ✅
    │   └─ No → Create Wallet via /api/gate/signup ✅
    ↓
Redirect to Home Page ✅

---

Existing User Logs In
    ↓
Login Page (/login)
    ├─ Authenticate with Supabase ✅
    ├─ Call /api/gate/ensure
    │   ├─ Wallet Exists → Success ✅
    │   └─ Wallet Missing → Create Wallet ✅
    ↓
Redirect to Home Page ✅
```

## 🛡️ Duplicate Prevention

The system prevents duplicate wallets through multiple checks:

1. **Auth Callback**: Checks profiles table before creating
2. **Gate Signup Endpoint**: Returns existing wallet if found
3. **Gate Ensure Endpoint**: Checks before creating

## 🔐 Security

- **Service Role Client**: Used for database operations that need RLS bypass
- **Auth Required**: `/api/gate/ensure` requires authenticated session
- **No Auth Required**: `/api/gate/signup` (used during signup/callback before full session)

## 📊 Database Schema

The wallet info is stored in the `profiles` table:

```sql
profiles {
  id: UUID (primary key, matches auth.users.id)
  email: TEXT
  gate_id: INTEGER (wallet ID from external API)
  gate_name: TEXT (unique wallet name)
  phone_number: TEXT
  wallet_balance: NUMERIC
  daily_limit: NUMERIC
  active: TEXT
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

## 🐛 Debugging

Check console logs for these key messages:

### Success Messages
- `✅ Email confirmed for user: [email]`
- `✅ Wallet created: [gate_id] [gate_name]`
- `✅ User already has wallet: [gate_id]`
- `🔗 Existing wallet linked successfully!`

### Warning Messages
- `⚠️ User not found in profiles table`
- `⚠️ Wallet not ready: [message]`
- `⚠️ Gate already exists externally, attempting to retrieve...`

### Error Messages
- `❌ Wallet creation failed: [error]`
- `❌ External API error: [status]`
- `❌ Failed to update profile: [error]`
- `❌ Wallet check failed (non-blocking): Selected Gate Exists`

## 🚨 Common Issue: "Selected Gate Exists" Error

**Symptom**: User sees "No payment gate found. Please contact support." but logs show "Selected Gate Exists"

**Root Cause**: Wallet exists in external API but not linked to user's database profile

**Solution**: Use the manual fix endpoint

### Quick Fix for Current User

If you're experiencing this issue right now:

1. **Open browser console** (F12)
2. **Run this command**:
```javascript
fetch('/api/gate/fix-existing', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(d => console.log('Fix result:', d))
```

3. **Refresh the page** - your wallet should now work!

### Manual Fix via API

**Endpoint**: `POST /api/gate/fix-existing`

**Authentication**: Requires active user session

**What it does**:
- Checks if user has gate in database
- Attempts to retrieve existing gate from external API
- Links the gate to user's profile
- Returns gate info

**Response**:
```json
{
  "success": true,
  "message": "Existing gate linked successfully",
  "gate_id": 12345,
  "gate_name": "user_abc123",
  "wasExisting": true,
  "fixed": true
}
```

## 🔧 Configuration

Required environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Site URL (for email redirects)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

External API endpoint:
- `https://aps.co.ke/indexpay/api/get_transactions_2.php`

## 📝 Best Practices

1. **Always use `/api/gate/ensure`** in protected routes/components
2. **Use `GateEnsurer` component** to wrap components that need wallet
3. **Don't block user flows** if wallet creation fails (graceful degradation)
4. **Check console logs** for debugging wallet issues
5. **Test both flows**: new signup + email confirmation, and existing user login

## 🚀 Testing Checklist

- [ ] New user signup → Email confirmation → Wallet created
- [ ] New user signup → Login without email confirmation → Wallet created on login
- [ ] Existing user login → Wallet already exists → No duplicate
- [ ] Existing user without wallet → Login → Wallet created
- [ ] Failed wallet creation → User can still access app → Retry works

## 📚 Related Files

- `app/signup/page.tsx` - Signup page
- `app/login/page.tsx` - Login page
- `app/auth/callback/route.ts` - Email confirmation handler
- `app/api/gate/signup/route.ts` - Wallet creation endpoint
- `app/api/gate/ensure/route.ts` - Wallet check/create endpoint
- `app/components/GateEnsurer.tsx` - Component wrapper for wallet requirement
- `app/hooks/useEnsureGate.ts` - React hook for wallet management
