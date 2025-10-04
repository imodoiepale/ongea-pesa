# 💰 How to Add Balance to Your Profile

## 🎯 Quick Method - SQL Editor

### Step 1: Find Your User ID

Go to **Supabase Dashboard** → **SQL Editor** and run:

```sql
-- Find your user ID by email
SELECT id, email 
FROM auth.users 
WHERE email = 'ijepale@gmail.com';  -- Replace with YOUR email
```

**Copy your `id`** (looks like: `b970bef4-4852-4bce-b424-90a64e2d922f`)

---

### Step 2: Check if Profile Exists

```sql
-- Check if you have a profile
SELECT * FROM profiles 
WHERE id = 'b970bef4-4852-4bce-b424-90a64e2d922f';  -- Replace with YOUR id
```

**If NO rows returned:** You need to create a profile first (see Step 3)

**If 1 row returned:** You have a profile! Skip to Step 4

---

### Step 3: Create Profile (If Needed)

```sql
-- Create your profile
INSERT INTO profiles (id, phone_number, wallet_balance)
VALUES (
  'b970bef4-4852-4bce-b424-90a64e2d922f',  -- Replace with YOUR user id
  '254712345678',  -- Replace with YOUR phone number
  10000.00  -- Starting balance (KSh 10,000)
);
```

---

### Step 4: Add Balance to Existing Profile

```sql
-- Set your balance to 10,000 KSh
UPDATE profiles 
SET wallet_balance = 10000.00
WHERE id = 'b970bef4-4852-4bce-b424-90a64e2d922f';  -- Replace with YOUR id
```

**Or add to existing balance:**

```sql
-- Add 5,000 KSh to current balance
UPDATE profiles 
SET wallet_balance = wallet_balance + 5000.00
WHERE id = 'b970bef4-4852-4bce-b424-90a64e2d922f';  -- Replace with YOUR id
```

---

### Step 5: Verify

```sql
-- Check your balance
SELECT 
  id,
  phone_number,
  wallet_balance,
  updated_at
FROM profiles 
WHERE id = 'b970bef4-4852-4bce-b424-90a64e2d922f';  -- Replace with YOUR id
```

**Expected output:**
```
id: b970bef4-4852-4bce-b424-90a64e2d922f
phone_number: 254712345678
wallet_balance: 10000.00
updated_at: 2025-10-04 15:30:00
```

---

## ✅ Real-Time Balance Update

**After updating in SQL:**

1. ✅ Balance updates **instantly** in your app (no refresh needed!)
2. ✅ Uses Supabase real-time subscriptions
3. ✅ You'll see the new balance immediately

**How it works:**
```
SQL Update → Supabase Real-time → Voice Interface → Balance Updates! ✨
```

---

## 🎯 Complete Example - From Scratch

### If you're setting up for the first time:

```sql
-- 1. Find your user ID
SELECT id, email FROM auth.users WHERE email = 'ijepale@gmail.com';

-- 2. Create profile with initial balance (copy your id from step 1)
INSERT INTO profiles (id, phone_number, wallet_balance, mpesa_number)
VALUES (
  'YOUR-USER-ID-HERE',
  '254712345678',
  10000.00,
  '254712345678'  -- Same as phone for M-Pesa
);

-- 3. Verify it worked
SELECT * FROM profiles WHERE id = 'YOUR-USER-ID-HERE';
```

---

## 💡 Common Balance Amounts

```sql
-- Small test amount
UPDATE profiles SET wallet_balance = 100.00 WHERE id = 'YOUR-ID';

-- Medium amount (1,000 KSh)
UPDATE profiles SET wallet_balance = 1000.00 WHERE id = 'YOUR-ID';

-- Large amount (10,000 KSh)
UPDATE profiles SET wallet_balance = 10000.00 WHERE id = 'YOUR-ID';

-- Big balance (100,000 KSh)
UPDATE profiles SET wallet_balance = 100000.00 WHERE id = 'YOUR-ID';
```

---

## 📊 Using Table Editor (Visual Method)

### Alternative: Use Supabase Table Editor

1. Go to **Supabase Dashboard** → **Table Editor**
2. Select **profiles** table
3. Find your row (by user id or phone number)
4. Click on the **wallet_balance** cell
5. Type new amount: `10000`
6. Press **Enter**
7. ✅ Balance updates in real-time in your app!

---

## 🔄 Balance History (Optional)

If you want to track balance changes, use this:

```sql
-- View balance history
SELECT 
  id,
  user_id,
  amount,
  balance_before,
  balance_after,
  description,
  created_at
FROM balance_history
WHERE user_id = 'YOUR-USER-ID'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🧪 Test Real-Time Updates

### Quick Test:

1. **Open your app** at `localhost:3000`
2. **Login** and view your balance (e.g., 10,000)
3. **Keep app open**
4. **In Supabase SQL Editor**, run:
   ```sql
   UPDATE profiles 
   SET wallet_balance = 15000.00 
   WHERE id = 'YOUR-USER-ID';
   ```
5. **Watch your app** → Balance should update to 15,000 **instantly!** ✨

**No refresh needed!** 🎉

---

## ⚠️ Important Notes

1. **Decimal precision:** Use `.00` for cents (e.g., `10000.00`)
2. **Currency:** All amounts are in **KSh (Kenyan Shillings)**
3. **No negatives:** Balance can't go below 0
4. **Real-time:** Updates appear instantly in all connected sessions

---

## 🎯 Your User ID Quick Reference

Run this once and save your ID:

```sql
SELECT 
  id as user_id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users 
WHERE email = 'YOUR-EMAIL@gmail.com';
```

**Save the `user_id` somewhere safe!**

Then you can quickly add balance:

```sql
-- Quick balance update (replace with your saved ID)
UPDATE profiles SET wallet_balance = 10000.00 
WHERE id = 'b970bef4-4852-4bce-b424-90a64e2d922f';
```

---

## 🚀 Summary

**To add balance:**
1. Get your user ID from `auth.users`
2. Update `wallet_balance` in `profiles` table
3. Balance updates in app **instantly!**

**No refresh required!** Real-time subscriptions handle everything! ✨
