# ⚡ Real-Time Balance System - Complete Guide

## 🎯 System Overview

**NEW APPROACH - Transaction-Based Balance:**
- Balance is **automatically calculated** from transactions
- Database trigger updates `wallet_balance` when transactions complete
- **Real-time subscriptions** update UI instantly
- **NO manual refreshes** - everything is automatic!

---

## 🔄 How It Works

### Flow Diagram:
```
User Action (Add Balance / Send Money)
         ↓
Create Transaction Record
         ↓
Database Trigger Fires
         ↓
Auto-Update wallet_balance
    (+ for deposits, - for sends)
         ↓
Real-Time Event Published
         ↓
All Connected Clients Updated
         ↓
UI Shows New Balance ✨
```

---

## 🛠️ Components

### 1. **Database Trigger** (AUTO_BALANCE_UPDATE_TRIGGER.sql)
```sql
-- Automatically runs when transaction is inserted/updated
-- Calculates balance change based on transaction type
-- Updates profiles.wallet_balance
-- Publishes real-time event
```

**Credit Types** (Add to balance):
- `deposit` - Manual deposits
- `receive` - Receiving money

**Debit Types** (Subtract from balance):
- `send_phone` - Send to phone number
- `buy_goods_pochi` - Pochi payments
- `buy_goods_till` - Till payments
- `paybill` - Paybill payments
- `withdraw` - Cash withdrawals
- `bank_to_mpesa` - Bank transfers
- `mpesa_to_bank` - M-Pesa to bank

### 2. **Real-Time Subscriptions**
```typescript
// Listen to profiles table (balance changes)
supabase
  .channel('balance-changes')
  .on('UPDATE', { table: 'profiles', filter: `id=eq.${user.id}` })
  → Updates balance display

// Listen to transactions table (new transactions)
supabase
  .channel('transactions-changes')
  .on('*', { table: 'transactions', filter: `user_id=eq.${user.id}` })
  → Updates transaction history
```

### 3. **UI Components**
- **Main Dashboard** - Shows balance, real-time updates
- **Voice Interface** - Shows balance, real-time updates
- **Balance Sheet** - Add balance, view transactions, both update in real-time

---

## ✅ Setup Instructions

### Step 1: Run Database Trigger SQL
```bash
# In Supabase SQL Editor, run:
AUTO_BALANCE_UPDATE_TRIGGER.sql
```

This creates:
- ✅ `update_wallet_balance()` function
- ✅ Trigger on INSERT
- ✅ Trigger on UPDATE (status changes)

### Step 2: Run RLS Policies
```bash
# In Supabase SQL Editor, run:
TRANSACTIONS_RLS_FIX.sql
```

This ensures:
- ✅ Service role can insert transactions (n8n)
- ✅ Users can view own transactions
- ✅ Real-time subscriptions work

### Step 3: Update Transaction Schema
```bash
# In Supabase SQL Editor, run:
UPDATE_TRANSACTIONS_SCHEMA.sql
```

This adds:
- ✅ `deposit` transaction type
- ✅ `receive` transaction type

### Step 4: Test!
```bash
npm run dev
```

---

## 🧪 Testing

### Test 1: Add Balance
1. Open app at `localhost:3000`
2. Click balance card or + button
3. Add 1000
4. Watch console logs:
   ```
   ✅ Deposit transaction created
   💰 Added KSh 1,000
   ⚡ Balance will update automatically
   ```
5. ✅ Balance updates **instantly** (no refresh!)
6. ✅ Transaction appears in history

### Test 2: Real-Time Across Tabs
1. Open app in **two browser tabs**
2. In tab 1: Add 500
3. ✅ Tab 2 balance updates **automatically**
4. ✅ Both show same balance

### Test 3: Send Money (via n8n)
1. Say "Send 100 to 0712345678"
2. n8n creates transaction (status='completed')
3. Trigger fires automatically
4. ✅ Balance decreases by 100 instantly
5. ✅ Transaction appears in history

### Test 4: Manual SQL
```sql
-- Insert deposit
INSERT INTO transactions (
  user_id, type, amount, status
) VALUES (
  'YOUR-USER-ID', 'deposit', 2000, 'completed'
);
```
✅ Balance increases by 2000 automatically
✅ UI updates instantly

---

## 💡 Advantages

### ✅ No Manual Updates
```typescript
// OLD WAY (manual):
await supabase.update('profiles').set({ 
  wallet_balance: currentBalance + amount 
})

// NEW WAY (automatic):
await supabase.insert('transactions').values({ 
  type: 'deposit', amount: 1000, status: 'completed'
})
// Trigger handles the rest! ⚡
```

### ✅ Always Accurate
- Balance = Sum of all completed transactions
- Single source of truth
- Can't get out of sync

### ✅ Audit Trail
- Every balance change has a transaction
- Complete history
- Easy to debug

### ✅ Real-Time Everywhere
- All clients stay synced
- No polling needed
- Instant updates

---

## 📊 Example Scenarios

### Scenario 1: New User
```
1. User signs up
   wallet_balance: 0

2. User adds 5000
   → Transaction: +5000 (deposit)
   → Trigger: wallet_balance = 0 + 5000 = 5000

3. User sends 500
   → Transaction: -500 (send_phone)
   → Trigger: wallet_balance = 5000 - 500 = 4500

4. User receives 1000
   → Transaction: +1000 (receive)
   → Trigger: wallet_balance = 4500 + 1000 = 5500

Final Balance: 5500 ✅
```

### Scenario 2: Multiple Transactions
```
Starting Balance: 10,000

Transactions:
1. deposit     +3,000   →  13,000
2. send_phone  -500     →  12,500
3. paybill     -1,200   →  11,300
4. deposit     +2,000   →  13,300
5. withdraw    -500     →  12,800

Final Balance: 12,800 ✅
```

---

## 🔧 n8n Integration

### What n8n Should Do:
```
1. Receive webhook from Next.js API
2. Process transaction (M-Pesa, etc.)
3. Create transaction record:
   {
     user_id: "...",
     type: "send_phone",
     amount: 500,
     status: "completed",  ← IMPORTANT!
     phone: "0712345678"
   }
4. Trigger automatically updates wallet_balance ⚡
5. Real-time subscriptions notify UI
6. User sees updated balance
```

**Key Point:** n8n only needs to insert transaction with `status='completed'`. The trigger does the rest!

---

## 🐛 Troubleshooting

### Balance Not Updating?

**Check 1:** Is trigger installed?
```sql
SELECT * FROM information_schema.triggers 
WHERE event_object_table = 'transactions';
```
Should show 2 triggers.

**Check 2:** Is transaction completed?
```sql
SELECT * FROM transactions 
WHERE user_id = 'YOUR-ID' 
ORDER BY created_at DESC;
```
Status should be 'completed'.

**Check 3:** Are subscriptions active?
Check browser console for:
```
✅ Balance updated in real-time: ...
🔔 Transaction changed: ...
```

### Balance Wrong?

**Recalculate from scratch:**
```sql
-- See all transactions
SELECT 
  type, amount, status, created_at 
FROM transactions 
WHERE user_id = 'YOUR-ID' 
ORDER BY created_at;

-- Calculate expected balance
SELECT 
  SUM(CASE 
    WHEN type IN ('deposit', 'receive') THEN amount 
    ELSE -amount 
  END) as calculated_balance
FROM transactions 
WHERE user_id = 'YOUR-ID' 
  AND status = 'completed';

-- Update if needed
UPDATE profiles 
SET wallet_balance = (calculated_balance)
WHERE id = 'YOUR-ID';
```

---

## 📁 Files Reference

1. **`AUTO_BALANCE_UPDATE_TRIGGER.sql`** - Database trigger
2. **`TRANSACTIONS_RLS_FIX.sql`** - RLS policies
3. **`UPDATE_TRANSACTIONS_SCHEMA.sql`** - Schema updates
4. **`components/ongea-pesa/balance-sheet.tsx`** - Add balance UI
5. **`components/ongea-pesa/main-dashboard.tsx`** - Dashboard with real-time
6. **`components/ongea-pesa/voice-interface.tsx`** - Voice UI with real-time

---

## ✅ Summary

**What You Have:**
- ✅ Automatic balance calculation
- ✅ Real-time updates everywhere
- ✅ Transaction-based accuracy
- ✅ No manual refreshes
- ✅ Works with n8n
- ✅ Complete audit trail
- ✅ Multi-tab sync
- ✅ Instant UI feedback

**How It Works:**
1. Create transaction → 2. Trigger updates balance → 3. Real-time notifies UI → 4. Balance updates instantly ⚡

**No refreshes. No polling. Just real-time!** 🎉
