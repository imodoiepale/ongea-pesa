# 🔄 Transaction Polling System Guide

## Overview

Since the IndexPay API doesn't support callbacks, we've implemented a **polling system** that continuously checks transaction status until completion. This ensures reliable transaction confirmation without requiring webhook infrastructure.

## 🏗️ Architecture

### Components Created

1. **Status Check API** - `/api/gate/check-status`
   - Checks transaction status with IndexPay
   - Updates transaction records in database
   - Returns current status (pending/completed/failed)

2. **Polling Service** - `lib/services/transactionPollingService.ts`
   - Configurable polling intervals and max attempts
   - Exponential backoff support
   - Background polling capability

3. **React Hook** - `hooks/use-transaction-polling.ts`
   - Easy-to-use polling hook for React components
   - Automatic status updates
   - Callbacks for success/failure/timeout

4. **Updated Deposit Flow** - `app/api/gate/deposit/route.ts`
   - Returns transaction ID for polling
   - Stores external reference in metadata
   - Enhanced transaction tracking

## 📊 How It Works

```
User initiates deposit
     ↓
IndexPay sends M-Pesa prompt
     ↓
Transaction ID returned
     ↓
Polling starts (every 5 seconds)
     ↓
Check status with IndexPay API
     ↓
┌─────────────────────────────┐
│ Status = Pending?           │──Yes──→ Wait 5s, check again
└─────────────────────────────┘
     │ No
     ↓
┌─────────────────────────────┐
│ Status = Completed?         │──Yes──→ Update DB, notify user ✅
└─────────────────────────────┘
     │ No
     ↓
┌─────────────────────────────┐
│ Status = Failed?            │──Yes──→ Update DB, show error ❌
└─────────────────────────────┘
     │ No
     ↓
Max attempts reached? → Timeout ⏱️
```

## 🚀 Usage

### In React Components

```typescript
import { useTransactionPolling } from '@/hooks/use-transaction-polling';

function MyComponent() {
  const polling = useTransactionPolling({
    transactionId: 'txn_123',
    gateName: 'COOL GATE',
    enabled: true,
    maxAttempts: 60, // 5 minutes at 5s intervals
    intervalMs: 5000,
    onSuccess: (data) => {
      console.log('Transaction completed!', data);
    },
    onFailure: (message) => {
      console.error('Transaction failed:', message);
    },
    onTimeout: () => {
      console.warn('Polling timed out');
    },
  });

  return (
    <div>
      {polling.isPolling && (
        <p>Checking status... Attempt {polling.attempts}</p>
      )}
      {polling.isCompleted && <p>Success! ✅</p>}
      {polling.isFailed && <p>Failed ❌</p>}
    </div>
  );
}
```

### Manual Status Check

```typescript
const response = await fetch('/api/gate/check-status', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transaction_id: 'txn_123',
    gate_name: 'COOL GATE',
  }),
});

const result = await response.json();
console.log(result.status); // 'pending' | 'completed' | 'failed'
```

### Using Polling Service Directly

```typescript
import { transactionPollingService } from '@/lib/services/transactionPollingService';

const result = await transactionPollingService.pollTransactionStatus({
  transactionId: 'txn_123',
  gateName: 'COOL GATE',
  maxAttempts: 40,
  intervalMs: 5000,
  onStatusUpdate: (status, data) => {
    console.log('Status update:', status);
  },
});

console.log(result.status); // 'completed' | 'failed' | 'timeout'
```

## ⚙️ Configuration

### Polling Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `maxAttempts` | 60 | Maximum number of polling attempts |
| `intervalMs` | 5000 | Time between checks (milliseconds) |
| `timeout` | 5 min | Total timeout (maxAttempts × intervalMs) |

### Exponential Backoff

For scenarios where you want to reduce API calls over time:

```typescript
const result = await transactionPollingService.pollWithBackoff({
  transactionId: 'txn_123',
  gateName: 'COOL GATE',
  maxAttempts: 40,
  // Intervals: 3s → 3s → 6s → 6s → 12s → 12s → 24s (max 30s)
});
```

## 🔍 Status Check API

### Endpoint
```
POST /api/gate/check-status
```

### Request Body
```json
{
  "transaction_id": "uuid-string",
  "gate_name": "COOL GATE"
}
```

### Response (Pending)
```json
{
  "status": "pending",
  "message": "Transaction is still processing",
  "data": { /* IndexPay response */ }
}
```

### Response (Completed)
```json
{
  "status": "completed",
  "message": "Transaction completed successfully",
  "data": {
    "transaction_id": "MPE12345",
    "amount": 100,
    "phone": "254712345678"
  }
}
```

### Response (Failed)
```json
{
  "status": "failed",
  "message": "Transaction failed",
  "data": { /* Error details */ }
}
```

## 📱 User Experience Flow

1. **User clicks "Deposit via M-Pesa"**
   - Loading spinner shows
   - API initiates deposit

2. **M-Pesa prompt sent**
   - Success message: "📱 M-Pesa prompt sent!"
   - Polling starts automatically

3. **Polling active**
   - Blue indicator shows: "Checking transaction status..."
   - Attempt count displayed
   - Checks every 5 seconds

4. **User enters M-Pesa PIN**
   - On their phone

5. **Transaction completes**
   - Polling detects completion
   - Green message: "✅ Payment confirmed!"
   - Dialog auto-closes after 3 seconds
   - Balance refreshes

## 🛡️ Error Handling

### Network Errors
- Polling continues even if individual checks fail
- Logs warnings but doesn't stop polling

### Timeout Handling
- After 60 attempts (5 minutes), polling stops
- User notified to check M-Pesa messages
- Transaction may still succeed (checked on next balance refresh)

### Transaction Failures
- Immediately stops polling
- Shows error message to user
- Updates transaction status in database

## 🗄️ Database Updates

Transactions are automatically updated:

```sql
-- On completion
UPDATE transactions 
SET 
  status = 'completed',
  updated_at = NOW(),
  metadata = jsonb_set(metadata, '{confirmation}', 'data')
WHERE id = 'transaction_id';

-- On failure
UPDATE transactions 
SET 
  status = 'failed',
  updated_at = NOW(),
  metadata = jsonb_set(metadata, '{error}', 'reason')
WHERE id = 'transaction_id';
```

## 🎯 Best Practices

### 1. Set Appropriate Timeouts
```typescript
// For quick transactions (STK push)
maxAttempts: 60  // 5 minutes

// For slower processes
maxAttempts: 120 // 10 minutes
```

### 2. Handle All States
```typescript
{polling.isPolling && <LoadingIndicator />}
{polling.isCompleted && <SuccessMessage />}
{polling.isFailed && <ErrorMessage />}
{polling.isTimeout && <TimeoutMessage />}
```

### 3. Cleanup on Unmount
```typescript
useEffect(() => {
  return () => {
    polling.stopPolling();
  };
}, []);
```

### 4. Provide User Feedback
- Show attempt count
- Display estimated time
- Explain what's happening

## 🔧 Troubleshooting

### Polling Never Completes
**Cause:** IndexPay API not returning updated status
**Fix:** Check IndexPay API logs, verify gate_name is correct

### Too Many API Calls
**Cause:** Interval too short
**Fix:** Increase `intervalMs` to 10000 (10 seconds)

### Timeout Too Soon
**Cause:** M-Pesa taking longer than expected
**Fix:** Increase `maxAttempts` to 120

### Status Not Updating in DB
**Cause:** Supabase permissions or connection issues
**Fix:** Check RLS policies and connection status

## 📈 Performance Considerations

### API Load
- **60 attempts × 5s = 300 seconds (5 min)**
- **1 API call per 5 seconds**
- Acceptable for IndexPay's rate limits

### Frontend Performance
- Polling runs in background
- UI remains responsive
- State updates trigger re-renders efficiently

### Database Load
- Only updates on status change
- Minimal writes (2-3 per transaction)

## 🚦 Monitoring

### Key Metrics
- Average polling duration
- Success rate
- Timeout rate
- API failure rate

### Logging
```typescript
console.log(`🔄 Starting polling for ${transactionId}`);
console.log(`📡 Polling attempt ${attempts}/${maxAttempts}`);
console.log(`✅ Transaction completed after ${attempts} attempts`);
console.log(`❌ Transaction failed after ${attempts} attempts`);
console.log(`⏱️ Polling timeout after ${attempts} attempts`);
```

## 🔐 Security

- ✅ User authentication required
- ✅ Transaction ownership verified
- ✅ API timeouts prevent hanging
- ✅ Rate limiting on status checks
- ✅ Sensitive data not logged

## 📝 Future Enhancements

1. **Webhook Integration** (when IndexPay supports it)
   - Replace polling with push notifications
   - Instant updates

2. **Smart Polling**
   - Faster checks initially (2s)
   - Slower checks later (10s)
   - Reduce API load

3. **Retry Logic**
   - Automatic retry on network failures
   - Exponential backoff

4. **Push Notifications**
   - Notify user even when app closed
   - Browser/mobile push

## ✅ Testing

### Manual Testing
1. Start a deposit
2. Observe polling indicator
3. Complete M-Pesa payment
4. Verify automatic confirmation
5. Check database update

### Edge Cases
- User closes browser during polling
- Network disconnects mid-poll
- M-Pesa timeout
- Multiple concurrent deposits

---

**The polling system ensures reliable transaction confirmation without callback infrastructure! 🎉**
