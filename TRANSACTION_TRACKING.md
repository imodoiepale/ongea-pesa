# 📊 Transaction Tracking - Complete Guide

## ✅ What Was Updated

The deposit API now **ALWAYS** creates a transaction record in the `transactions` table when a deposit is initiated.

## 🔄 Transaction Flow

### 1. Deposit Initiated
```
User clicks "Add via M-Pesa" 
      ↓
/api/gate/deposit called
      ↓
✅ Transaction created with status: 'pending'
      ↓
External Gate API called
      ↓
M-Pesa STK push sent to phone
```

### 2. Transaction Record Created
```typescript
{
  user_id: user.id,
  type: 'deposit',
  amount: depositAmount,
  phone: phone,
  status: 'pending',  // ⏳ Waiting for M-Pesa confirmation
  voice_command_text: 'M-Pesa deposit of KSh 100 from 0712345678',
  created_at: new Date().toISOString()
}
```

### 3. User Completes Payment
```
User receives M-Pesa prompt
      ↓
User enters PIN
      ↓
M-Pesa processes payment
      ↓
🔔 Webhook should update transaction status
```

## 📝 Transaction Statuses

**Current Implementation:**
- **`pending`** - Deposit initiated, waiting for M-Pesa confirmation
- **`completed`** - Payment successful (needs webhook to update)
- **`failed`** - Payment failed (needs webhook to update)

## 🪝 Webhook Integration (TODO)

You'll need to create a webhook endpoint to receive M-Pesa callbacks:

### Create Webhook Endpoint
**File:** `app/api/webhooks/mpesa/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const supabase = await createClient();
    
    // Extract M-Pesa callback data
    const {
      TransactionID,
      Amount,
      PhoneNumber,
      ResultCode, // 0 = success
      ResultDesc
    } = data;

    // Update transaction status
    if (ResultCode === 0) {
      // Payment successful
      await supabase
        .from('transactions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('phone', PhoneNumber)
        .eq('amount', Amount)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);
      
      // Update wallet balance
      await supabase.rpc('update_wallet_balance', {
        p_user_id: /* get user_id from transaction */,
        p_amount: Amount
      });
    } else {
      // Payment failed
      await supabase
        .from('transactions')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('phone', PhoneNumber)
        .eq('amount', Amount)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
```

### Register Webhook URL
In your M-Pesa/Gate API settings:
```
Webhook URL: https://your-domain.com/api/webhooks/mpesa
Method: POST
```

## 📊 Real-Time Updates

The balance sheet already has real-time subscription to transactions:

```typescript
// In balance-sheet.tsx
const channel = supabase
  .channel('balance-sheet-transactions')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'transactions',
    filter: `user_id=eq.${user.id}`,
  }, (payload) => {
    console.log('🔔 Transaction changed:', payload)
    fetchTransactions() // Refreshes the list
  })
  .subscribe()
```

**This means:**
- When transaction status changes to 'completed' → UI updates automatically
- When balance updates → Dashboard updates automatically
- All in real-time, no page refresh needed!

## 🎯 Current Behavior

### What Works Now
✅ Transaction record created when deposit initiated
✅ Transaction appears in Balance Sheet as "pending"
✅ Transaction list updates in real-time
✅ Phone number recorded with transaction
✅ Amount and timestamp tracked

### What Needs Webhook
⏳ Update status from 'pending' to 'completed'
⏳ Update wallet balance automatically
⏳ Set completed_at timestamp
⏳ Handle failed transactions

## 📱 User Experience

### With Transaction Tracking
1. User clicks "Add via M-Pesa"
2. ✅ Transaction shows as "Pending" immediately
3. User sees M-Pesa prompt on phone
4. User enters PIN
5. ⏳ Transaction updates to "Completed" (via webhook)
6. ✅ Balance updates automatically

### Without Webhook (Current)
1. User clicks "Add via M-Pesa"
2. ✅ Transaction shows as "Pending"
3. User completes M-Pesa
4. ⏳ Transaction stays "Pending" (manual update needed)
5. Manual: Admin updates status in database

## 🔍 Query Transactions

### Check Pending Deposits
```sql
SELECT * FROM transactions 
WHERE type = 'deposit' 
AND status = 'pending'
ORDER BY created_at DESC;
```

### Check User's Deposits
```sql
SELECT * FROM transactions 
WHERE user_id = 'user-uuid-here'
AND type = 'deposit'
ORDER BY created_at DESC;
```

### Manually Complete a Transaction (for testing)
```sql
UPDATE transactions 
SET 
  status = 'completed',
  completed_at = NOW(),
  updated_at = NOW()
WHERE id = 'transaction-id-here';
```

## 🎨 UI Indicators

The balance sheet shows transaction status with icons:

- ✅ **Completed** - Green check icon
- ⏰ **Pending** - Yellow clock icon  
- ❌ **Failed** - Red X icon

## 📋 Testing

### Test Transaction Creation
1. Open Balance Sheet
2. Enter amount (e.g., 100)
3. Click "Add via M-Pesa"
4. ✅ Check transactions table - should see pending record
5. ✅ Check Balance Sheet - should show in list as pending

### Test Real-Time Updates
1. Open Balance Sheet (keep it open)
2. In another tab, manually update transaction status in Supabase
3. ✅ Balance Sheet should update automatically

## 💡 Best Practices

1. **Always create transaction on initiation** ✅ (Already done)
2. **Use 'pending' status initially** ✅ (Already done)
3. **Set up webhook for status updates** ⏳ (TODO)
4. **Log all transaction changes** ✅ (Already done)
5. **Use real-time subscriptions** ✅ (Already done)

## 🚀 Next Steps

1. ✅ Transaction creation - **DONE**
2. ⏳ Create M-Pesa webhook endpoint
3. ⏳ Register webhook URL with Gate API
4. ⏳ Test webhook with real M-Pesa
5. ⏳ Add error handling for failed payments
6. ⏳ Add retry logic for failed webhooks

---

**Transactions are now being tracked! Every deposit creates a record, even before M-Pesa confirms. 🎉**
