# ✅ Complete Setup Checklist

## 🎯 Run These SQL Scripts in Order

### 1. **Create Profile Trigger** (CRITICAL - Do First!)
**File:** `AUTO_CREATE_PROFILE_TRIGGER.sql`

**What it does:**
- ✅ Auto-creates profile when user signs up
- ✅ Backfills profiles for existing users
- ✅ Links auth.users to profiles table
- ✅ Sets initial wallet_balance to 0

**Run in Supabase SQL Editor:**
```sql
-- Copy and paste AUTO_CREATE_PROFILE_TRIGGER.sql
```

---

### 2. **Update Transaction Schema**
**File:** `UPDATE_TRANSACTIONS_SCHEMA.sql`

**What it does:**
- ✅ Adds 'deposit' transaction type
- ✅ Adds 'receive' transaction type

**Run in Supabase SQL Editor:**
```sql
-- Copy and paste UPDATE_TRANSACTIONS_SCHEMA.sql
```

---

### 3. **Setup RLS Policies**
**File:** `TRANSACTIONS_RLS_FIX.sql`

**What it does:**
- ✅ Allows service role full access (for n8n)
- ✅ Users can view own transactions
- ✅ Users can insert own transactions
- ✅ Real-time subscriptions work

**Run in Supabase SQL Editor:**
```sql
-- Copy and paste TRANSACTIONS_RLS_FIX.sql
```

---

### 4. **Balance Auto-Update Trigger** (CRITICAL!)
**File:** `AUTO_BALANCE_UPDATE_TRIGGER.sql`

**What it does:**
- ✅ Auto-updates wallet_balance when transaction created
- ✅ Adds for deposits, subtracts for sends
- ✅ Publishes real-time events
- ✅ No manual balance updates needed!

**Run in Supabase SQL Editor:**
```sql
-- Copy and paste AUTO_BALANCE_UPDATE_TRIGGER.sql
```

---

### 5. **Sync Existing Balances** (If you have old data)
**File:** `INSTANT_FIX_BALANCE.sql`

**What it does:**
- ✅ Calculates balance from all existing transactions
- ✅ Updates wallet_balance for all users
- ✅ Fixes any out-of-sync balances

**Run in Supabase SQL Editor:**
```sql
-- Copy and paste INSTANT_FIX_BALANCE.sql
```

---

## 🧪 Verify Everything Works

### Check 1: Profiles Created?
```sql
SELECT 
  u.email,
  CASE WHEN p.id IS NULL THEN '❌ NO PROFILE' ELSE '✅ HAS PROFILE' END as status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id;
```
**Should show ✅ for all users**

---

### Check 2: Triggers Installed?
```sql
-- Should show 2 triggers for transactions
SELECT trigger_name, event_manipulation 
FROM information_schema.triggers 
WHERE event_object_table = 'transactions';

-- Should show 1 trigger for auth.users
SELECT trigger_name 
FROM information_schema.triggers 
WHERE event_object_table = 'users' AND trigger_schema = 'auth';
```

---

### Check 3: RLS Policies Active?
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('profiles', 'transactions')
ORDER BY tablename, policyname;
```
**Should show policies for both tables**

---

### Check 4: Balance Correct?
```sql
-- Replace with your email
SELECT 
  p.wallet_balance as current_balance,
  (
    SELECT SUM(
      CASE 
        WHEN type IN ('deposit', 'receive') THEN amount
        ELSE -amount
      END
    )
    FROM transactions 
    WHERE user_id = p.id AND status = 'completed'
  ) as calculated_balance
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'your@email.com';
```
**Both should match!**

---

## 🚀 Test the Complete Flow

### Test 1: New User Signup
1. Create new account
2. ✅ Profile should be created automatically
3. ✅ wallet_balance should be 0
4. ✅ No errors in console

### Test 2: Add Balance
1. Login to app
2. Click balance or + button
3. Add 1000
4. ✅ Transaction created
5. ✅ Balance updates to 1000 instantly
6. ✅ Transaction appears in history

### Test 3: Real-Time Sync
1. Open app in 2 tabs
2. Add balance in tab 1
3. ✅ Tab 2 updates automatically
4. ✅ Both show same balance

### Test 4: Voice Payment
1. Say "Send 100 to 0712345678"
2. n8n processes
3. ✅ Transaction created
4. ✅ Balance decreases by 100
5. ✅ Updates instantly

---

## 📋 Quick Command Summary

### In Supabase SQL Editor (in order):
```sql
-- 1. Create profiles for all users
Run: AUTO_CREATE_PROFILE_TRIGGER.sql

-- 2. Update transaction types
Run: UPDATE_TRANSACTIONS_SCHEMA.sql

-- 3. Setup RLS policies
Run: TRANSACTIONS_RLS_FIX.sql

-- 4. Setup balance auto-update
Run: AUTO_BALANCE_UPDATE_TRIGGER.sql

-- 5. Sync existing balances (if needed)
Run: INSTANT_FIX_BALANCE.sql
```

### In Terminal:
```bash
# Install dependencies (if needed)
npm install

# Start dev server
npm run dev
```

### In n8n:
- ✅ Use service_role key (not anon key)
- ✅ Create transactions with status='completed'
- ✅ Trigger will handle balance update

---

## ✅ What You'll Have After Setup

### Database:
- ✅ Profiles auto-created for all users
- ✅ Transactions table with all types
- ✅ Auto-updating wallet_balance
- ✅ RLS policies protecting data
- ✅ Real-time subscriptions working

### Frontend:
- ✅ Instant balance display (no loading)
- ✅ Real-time updates everywhere
- ✅ Floating + button on all pages
- ✅ Clickable balance card
- ✅ Transaction history viewer

### Backend:
- ✅ n8n can create transactions
- ✅ Balance updates automatically
- ✅ No manual updates needed
- ✅ Complete audit trail

---

## 🐛 If Something's Wrong

### Balance showing 0?
→ Run `INSTANT_FIX_BALANCE.sql`

### Profile not found?
→ Run `AUTO_CREATE_PROFILE_TRIGGER.sql` (backfill section)

### Transactions not updating balance?
→ Check if trigger installed:
```sql
SELECT * FROM pg_proc WHERE proname = 'update_wallet_balance';
```

### n8n can't insert?
→ Check n8n is using **service_role** key (not anon)

### Real-time not working?
→ Check Supabase Dashboard → Database → Enable Realtime

---

## 📁 File Reference

1. `AUTO_CREATE_PROFILE_TRIGGER.sql` - Auto-create profiles
2. `UPDATE_TRANSACTIONS_SCHEMA.sql` - Add transaction types
3. `TRANSACTIONS_RLS_FIX.sql` - RLS policies
4. `AUTO_BALANCE_UPDATE_TRIGGER.sql` - Auto-update balance
5. `INSTANT_FIX_BALANCE.sql` - Sync existing balances
6. `COMPLETE_SETUP_CHECKLIST.md` - This file!

---

## ✅ Done!

After running all SQL scripts:
- ✅ All users have profiles
- ✅ Balance calculates automatically
- ✅ Real-time updates work
- ✅ n8n integration ready
- ✅ No manual intervention needed

**Your app is now production-ready!** 🎉
