# Fix: Balance Showing 0 Despite Having Transactions

## Problem Summary

You're experiencing two related issues:

1. **Balance shows KSh 0** in the app despite having **KSh 15,300** in completed deposits
2. **n8n error**: `new row for relation "profiles" violates check constraint "profiles_wallet_balance_check"`

## Root Cause

The `wallet_balance` in your `profiles` table is not being automatically updated when transactions are created. This happens because:

1. **Missing triggers** - The database triggers that auto-update balance are not installed on your hosted database
2. **Constraint violation** - The check constraint `wallet_balance >= 0` prevents negative balances, causing n8n to fail

## The Fix (3 Steps)

### Step 1: Run the SQL Fix Script

Execute `FIX_BALANCE_ZERO_ISSUE.sql` in your Supabase SQL Editor:

```bash
# This script will:
# 1. Check current balances vs calculated balances
# 2. Recreate the trigger functions
# 3. Install the triggers
# 4. Sync all existing balances from transactions
# 5. Verify the fix
```

**What it does:**
- ✅ Installs `update_wallet_balance()` function
- ✅ Installs `update_wallet_balance_on_status_change()` function  
- ✅ Creates triggers on `transactions` table
- ✅ Recalculates all wallet balances from existing transactions
- ✅ Your balance will immediately show **KSh 15,300**

### Step 2: Fix Your n8n Workflow

The n8n error occurs when trying to create/update a profile. Make sure:

#### ❌ Don't Do This:
```javascript
// Don't manually set wallet_balance in n8n
{
  "wallet_balance": 0  // This can violate the constraint
}
```

#### ✅ Do This Instead:
```javascript
// Let the triggers handle wallet_balance automatically
// Only create the transaction:
{
  "user_id": "{{ $json.user_id }}",
  "type": "deposit",  // or "send_phone", etc.
  "amount": {{ $json.amount }},  // NO QUOTES - must be number
  "status": "completed",
  "phone": "{{ $json.phone }}",
  "voice_command_text": "{{ $json.command }}"
}
```

**Critical n8n Rules:**
1. **Never set `wallet_balance` manually** - triggers handle it
2. **Amount must be a number** - use `{{ $json.amount }}` NOT `"{{ $json.amount }}"`
3. **Status must be 'completed'** for balance to update
4. **Type must be valid** - see list below

### Step 3: Verify It Works

After running the SQL script:

```sql
-- Check your balance
SELECT 
  phone_number,
  wallet_balance,
  updated_at
FROM profiles
WHERE phone_number = 'YOUR_PHONE_NUMBER';

-- Should show KSh 15,300 (or whatever your deposits total)
```

## How It Works Going Forward

### Transaction Types

**Credit (adds to balance):**
- `deposit` - Manual deposits
- `receive` - Receiving money from others

**Debit (subtracts from balance):**
- `send_phone` - Send to phone number
- `buy_goods_pochi` - Buy goods (Pochi)
- `buy_goods_till` - Buy goods (Till)
- `paybill` - Paybill payment
- `withdraw` - Withdraw from wallet
- `bank_to_mpesa` - Bank to M-Pesa transfer
- `mpesa_to_bank` - M-Pesa to bank transfer

### Automatic Balance Updates

Once triggers are installed:

```
Transaction Created → Trigger Fires → Balance Updated → UI Updates
     (n8n)              (automatic)      (automatic)     (real-time)
```

**Example:**
```sql
-- User has KSh 100
-- n8n creates: deposit of KSh 50, status='completed'
-- Trigger automatically: wallet_balance = 100 + 50 = 150
-- UI shows: KSh 150 (instantly via real-time subscription)
```

## Why Your Balance Was 0

Looking at your screenshot:
- ✅ You have **5 deposits** totaling **KSh 15,300** (completed)
- ✅ You have **1 send** of **KSh 200** (pending - doesn't affect balance)
- ❌ But `wallet_balance` = 0 in database

**Reason:** The triggers were never installed on your hosted database, so transactions were created but balance never updated.

## Preventing Future Issues

### In n8n Workflows:

1. **Create Transaction Node:**
   ```json
   {
     "user_id": "{{ $json.user_id }}",
     "type": "deposit",
     "amount": {{ parseFloat($json.amount) }},
     "status": "completed",
     "created_at": "{{ $now.toISO() }}"
   }
   ```

2. **Don't Create Profile Node** (unless it's a new user):
   - Profiles should already exist
   - Never update `wallet_balance` directly
   - Let triggers handle it

3. **For New Users:**
   ```json
   // First create profile with default balance
   {
     "id": "{{ $json.user_id }}",
     "phone_number": "{{ $json.phone }}",
     "wallet_balance": 0  // OK for new users
   }
   
   // Then create deposit transaction
   {
     "user_id": "{{ $json.user_id }}",
     "type": "deposit",
     "amount": {{ $json.amount }},
     "status": "completed"
   }
   // Trigger will update balance to the deposit amount
   ```

## Testing the Fix

### Test 1: Check Current Balance
```sql
SELECT wallet_balance FROM profiles WHERE phone_number = 'YOUR_PHONE';
-- Should show KSh 15,300
```

### Test 2: Create New Deposit via n8n
```json
{
  "user_id": "your-user-id",
  "type": "deposit",
  "amount": 100,
  "status": "completed"
}
```
**Expected:** Balance increases by 100

### Test 3: Create Send Transaction
```json
{
  "user_id": "your-user-id",
  "type": "send_phone",
  "amount": 50,
  "phone": "254712345678",
  "status": "completed"
}
```
**Expected:** Balance decreases by 50

## Common Errors & Solutions

### Error: "profiles_wallet_balance_check"
**Cause:** Trying to set balance < 0  
**Fix:** Don't manually set `wallet_balance` in n8n

### Error: Amount is string not number
**Cause:** Using `"{{ $json.amount }}"` (with quotes)  
**Fix:** Use `{{ $json.amount }}` or `{{ parseFloat($json.amount) }}`

### Balance not updating
**Cause:** Status is not 'completed'  
**Fix:** Ensure `status: 'completed'` in transaction

### Trigger not firing
**Cause:** Triggers not installed  
**Fix:** Run `FIX_BALANCE_ZERO_ISSUE.sql`

## Summary

✅ **Run** `FIX_BALANCE_ZERO_ISSUE.sql` in Supabase  
✅ **Remove** any manual `wallet_balance` updates from n8n  
✅ **Ensure** transactions have `status='completed'`  
✅ **Use** numeric amounts (not strings)  
✅ **Verify** balance shows correctly in app  

Your balance will immediately update to **KSh 15,300** after running the script!
