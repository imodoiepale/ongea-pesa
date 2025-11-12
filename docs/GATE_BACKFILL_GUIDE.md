# Gate Backfill & Auto-Creation Guide

## 📋 Overview

This guide covers how to ensure ALL users (new and existing) have payment gates created and saved to their profiles.

## 🎯 Three Ways to Ensure Users Have Gates

### 1. **Automatic on Signup** (New Users)
New users automatically get gates when they sign up.

### 2. **Automatic on Login** (Existing Users)
Existing users without gates get them created when they log in.

### 3. **Bulk Backfill** (Admin Operation)
Create gates for all existing users at once.

---

## 🆕 Method 1: Automatic on Signup

**Status:** ✅ Already Implemented

When a new user signs up:
1. `auth.users` entry created
2. Trigger creates `public.users` entry
3. Frontend calls `/api/gate/signup`
4. Gate created and saved

**No action needed** - this works automatically!

---

## 🔐 Method 2: Automatic on Login (Existing Users)

### Implementation Option A: Using Hook

Wrap your dashboard or protected routes with the `GateEnsurer` component:

```tsx
// app/dashboard/page.tsx
import GateEnsurer from '@/app/components/GateEnsurer';

export default function Dashboard() {
  return (
    <GateEnsurer 
      showLoading={true}
      onGateCreated={(gateId, gateName) => {
        console.log('Gate created:', gateId, gateName);
      }}
    >
      <DashboardContent />
    </GateEnsurer>
  );
}
```

### Implementation Option B: Using Hook Directly

```tsx
// app/dashboard/page.tsx
'use client';

import { useEnsureGate } from '@/app/hooks/useEnsureGate';

export default function Dashboard() {
  const { hasGate, loading, error, gate_id, gate_name } = useEnsureGate();

  if (loading) return <div>Setting up your wallet...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!hasGate) return <div>No gate available</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Your Gate: {gate_name} (ID: {gate_id})</p>
    </div>
  );
}
```

### Implementation Option C: Manual API Call

```typescript
// Call this after successful login
async function ensureUserHasGate() {
  try {
    const response = await fetch('/api/gate/ensure', {
      method: 'POST',
    });
    
    const data = await response.json();
    
    if (data.created) {
      console.log('Gate created:', data.gate_id, data.gate_name);
    } else {
      console.log('Gate already exists:', data.gate_id, data.gate_name);
    }
  } catch (error) {
    console.error('Failed to ensure gate:', error);
  }
}
```

---

## 🔄 Method 3: Bulk Backfill (Admin)

### Step 1: Check How Many Users Need Gates

```bash
# GET request to check status
curl http://localhost:3000/api/gate/backfill

# Response:
# {
#   "usersNeedingGates": 25,
#   "message": "25 user(s) need gates"
# }
```

### Step 2: Run Backfill

```bash
# POST request to create gates for all users
curl -X POST http://localhost:3000/api/gate/backfill

# Response:
# {
#   "success": true,
#   "message": "Backfill completed",
#   "results": {
#     "total": 25,
#     "successful": 23,
#     "failed": 2,
#     "errors": [...]
#   }
# }
```

### Step 3: Review Results

The backfill endpoint will:
- ✅ Find all users without gates
- ✅ Create a gate for each user
- ✅ Save gate info to database
- ✅ Log all successes and failures
- ✅ Continue even if some fail

---

## 📊 Database Queries

### Find Users Without Gates

```sql
SELECT id, email, name, gate_id, gate_name, created_at
FROM public.users
WHERE gate_id IS NULL OR gate_name IS NULL
ORDER BY created_at DESC;
```

### Use the View

```sql
-- Convenient view created by migration 007
SELECT * FROM public.users_needing_gates;
```

### Count Users Needing Gates

```sql
SELECT COUNT(*) as users_needing_gates
FROM public.users
WHERE gate_id IS NULL OR gate_name IS NULL;
```

### Check Specific User

```sql
SELECT 
  id,
  email,
  gate_id,
  gate_name,
  gate_creation_attempted,
  gate_creation_attempted_at,
  CASE 
    WHEN gate_id IS NOT NULL THEN '✅ Has Gate'
    WHEN gate_creation_attempted = true THEN '⏳ Attempted'
    ELSE '❌ Needs Gate'
  END as status
FROM public.users
WHERE email = 'user@example.com';
```

---

## 🛠️ API Endpoints Reference

### POST `/api/gate/ensure`
**Purpose:** Check if current user has a gate, create if missing  
**Auth:** Required  
**Use:** Call on login or when accessing protected routes

**Response:**
```json
{
  "success": true,
  "hasGate": true,
  "gate_id": 329,
  "gate_name": "john.doe",
  "created": true  // true if just created, false if already existed
}
```

### GET `/api/gate/ensure`
**Purpose:** Check if current user has a gate (doesn't create)  
**Auth:** Required  
**Use:** Quick status check

**Response:**
```json
{
  "hasGate": true,
  "gate_id": 329,
  "gate_name": "john.doe"
}
```

### POST `/api/gate/backfill`
**Purpose:** Create gates for ALL users without them  
**Auth:** Should be protected (admin only)  
**Use:** One-time migration or periodic cleanup

**Response:**
```json
{
  "success": true,
  "message": "Backfill completed",
  "results": {
    "total": 25,
    "successful": 23,
    "failed": 2,
    "errors": [
      {
        "userId": "uuid",
        "email": "user@example.com",
        "error": "External API failed"
      }
    ]
  }
}
```

### GET `/api/gate/backfill`
**Purpose:** Count users needing gates  
**Auth:** Should be protected (admin only)  
**Use:** Check before running backfill

**Response:**
```json
{
  "usersNeedingGates": 25,
  "message": "25 user(s) need gates"
}
```

---

## 🚀 Recommended Setup

### For New Apps

1. Run migrations (004, 005, 006, 007)
2. Add `GateEnsurer` component to your main dashboard
3. Done! All users will get gates automatically

### For Existing Apps with Users

1. Run migrations (004, 005, 006, 007)
2. **Run backfill** to create gates for existing users:
   ```bash
   curl -X POST http://localhost:3000/api/gate/backfill
   ```
3. Add `GateEnsurer` component for future users
4. Done!

---

## 🎨 UI Examples

### Example 1: Dashboard with Gate Check

```tsx
'use client';

import GateEnsurer from '@/app/components/GateEnsurer';

export default function WalletPage() {
  return (
    <GateEnsurer
      onGateCreated={(gateId, gateName) => {
        // Show success notification
        toast.success(`Wallet initialized: ${gateName}`);
      }}
    >
      <div className="p-6">
        <h1>Your Wallet</h1>
        <WalletBalance />
        <TransactionHistory />
      </div>
    </GateEnsurer>
  );
}
```

### Example 2: Login with Auto Gate Creation

```tsx
// app/login/page.tsx
async function handleLogin(email: string, password: string) {
  // 1. Login user
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    setError(error.message);
    return;
  }

  // 2. Ensure user has a gate
  try {
    const gateResponse = await fetch('/api/gate/ensure', {
      method: 'POST',
    });
    const gateData = await gateResponse.json();
    
    if (gateData.created) {
      console.log('Gate created on login:', gateData.gate_id);
    }
  } catch (error) {
    // Don't fail login if gate creation fails
    console.error('Gate creation failed:', error);
  }

  // 3. Redirect to dashboard
  router.push('/dashboard');
}
```

### Example 3: Admin Backfill UI

```tsx
'use client';

import { useState } from 'react';

export default function AdminBackfill() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkStatus = async () => {
    const res = await fetch('/api/gate/backfill');
    const data = await res.json();
    setStatus(data);
  };

  const runBackfill = async () => {
    setLoading(true);
    const res = await fetch('/api/gate/backfill', { method: 'POST' });
    const data = await res.json();
    setStatus(data.results);
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1>Gate Backfill Admin</h1>
      
      <div className="space-y-4">
        <button onClick={checkStatus}>Check Status</button>
        
        {status && (
          <div>
            <p>Users needing gates: {status.usersNeedingGates || 0}</p>
          </div>
        )}
        
        <button 
          onClick={runBackfill} 
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          {loading ? 'Running...' : 'Run Backfill'}
        </button>
      </div>
    </div>
  );
}
```

---

## ⚠️ Important Notes

### Rate Limiting
The backfill endpoint includes a 500ms delay between requests to avoid overwhelming the external API.

### Error Handling
- If gate creation fails for a user, it doesn't stop the backfill
- All errors are logged and returned in the response
- You can retry failed users individually

### Idempotency
- All endpoints are safe to call multiple times
- If a user already has a gate, it won't create a duplicate
- The external API may reject duplicate gate names

### Security
- The `/api/gate/backfill` endpoint should be protected
- Only admins should be able to run bulk operations
- Consider adding authentication middleware

---

## 🧪 Testing

### Test Individual Gate Creation

```bash
# Login as a user without a gate
# Then call:
curl -X POST http://localhost:3000/api/gate/ensure \
  -H "Cookie: YOUR_SESSION_COOKIE"

# Should return:
# { "success": true, "created": true, "gate_id": 329, ... }
```

### Test Backfill

```bash
# 1. Check status
curl http://localhost:3000/api/gate/backfill

# 2. Run backfill
curl -X POST http://localhost:3000/api/gate/backfill

# 3. Verify in database
```

```sql
SELECT COUNT(*) FROM users WHERE gate_id IS NOT NULL;
```

---

## 📝 Migration Checklist

- [ ] Run migration 004 (add gate fields)
- [ ] Run migration 005 (user creation trigger)
- [ ] Run migration 006 (backfill query)
- [ ] Run migration 007 (enhanced trigger with tracking)
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`
- [ ] Test `/api/gate/ensure` endpoint
- [ ] Run `/api/gate/backfill` for existing users
- [ ] Add `GateEnsurer` component to dashboard
- [ ] Test new user signup flow
- [ ] Test existing user login flow
- [ ] Verify all users have gates

---

## 🎉 Success Criteria

After setup, verify:

1. ✅ New signups automatically get gates
2. ✅ Existing users get gates on first login
3. ✅ All database users have `gate_id` and `gate_name`
4. ✅ No errors in console or logs
5. ✅ Users can access wallet features

**Query to verify:**
```sql
-- Should return 0
SELECT COUNT(*) FROM users WHERE gate_id IS NULL OR gate_name IS NULL;
```

If this returns 0, you're all set! 🚀
