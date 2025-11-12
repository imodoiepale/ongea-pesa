# Payment Gates - Quick Reference Card

## ✅ Auto-Creation on Login (Already Active!)

**Users automatically get gates when they log in!** No setup needed. ✅

When a user logs in:
1. Authentication succeeds
2. System checks if user has gate
3. If missing → Creates gate automatically
4. If exists → Continues to dashboard

**See `docs/AUTO_GATE_CREATION.md` for details.**

---

## 🚀 Quick Start (Existing Users)

### Step 1: Wrap Your Dashboard
```tsx
// app/dashboard/page.tsx
import GateEnsurer from '@/app/components/GateEnsurer';

export default function Dashboard() {
  return (
    <GateEnsurer>
      <YourContent />
    </GateEnsurer>
  );
}
```

### Step 2: Check Existing Users
```bash
curl http://localhost:3000/api/gate/backfill
```

### Step 3: Backfill If Needed
```bash
curl -X POST http://localhost:3000/api/gate/backfill
```

Done! ✅

---

## 📡 API Endpoints

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/gate/signup` | POST | Create gate during signup | No |
| `/api/gate/create` | POST | Create gate for auth user | Yes |
| `/api/gate/ensure` | POST | Check & create if missing | Yes |
| `/api/gate/ensure` | GET | Check gate status only | Yes |
| `/api/gate/backfill` | GET | Count users needing gates | Admin |
| `/api/gate/backfill` | POST | Bulk create all gates | Admin |

---

## 💾 Database Queries

### Find Users Without Gates
```sql
SELECT * FROM users WHERE gate_id IS NULL;
```

### Count Users Needing Gates
```sql
SELECT COUNT(*) FROM users WHERE gate_id IS NULL;
```

### Check Specific User
```sql
SELECT email, gate_id, gate_name FROM users WHERE email = 'user@example.com';
```

### Use Convenient View
```sql
SELECT * FROM users_needing_gates;
```

---

## 🎨 React Components

### Use Hook Directly
```tsx
import { useEnsureGate } from '@/app/hooks/useEnsureGate';

function MyComponent() {
  const { hasGate, loading, gate_id, gate_name } = useEnsureGate();
  
  if (loading) return <Loading />;
  if (!hasGate) return <NoGate />;
  
  return <div>Gate: {gate_name}</div>;
}
```

### Use Wrapper Component
```tsx
import GateEnsurer from '@/app/components/GateEnsurer';

function MyPage() {
  return (
    <GateEnsurer showLoading={true}>
      <ProtectedContent />
    </GateEnsurer>
  );
}
```

---

## ⚙️ Environment Variables

```bash
# Required in .env.local
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 📋 Migration Order

```sql
-- 1. Add gate fields
-- database/migrations/004_add_gate_fields.sql

-- 2. Setup user auto-creation trigger  
-- database/migrations/005_user_creation_trigger.sql

-- 3. Backfill query
-- database/migrations/006_backfill_missing_gates.sql

-- 4. Enhanced tracking
-- database/migrations/007_enhanced_user_trigger.sql
```

---

## 🧪 Testing Commands

### Test Ensure Endpoint
```bash
# Login first, then:
curl -X POST http://localhost:3000/api/gate/ensure \
  -H "Cookie: YOUR_SESSION_COOKIE"
```

### Test Backfill
```bash
# Check status
curl http://localhost:3000/api/gate/backfill

# Run backfill
curl -X POST http://localhost:3000/api/gate/backfill
```

### Verify in Database
```sql
-- Should return 0 after setup
SELECT COUNT(*) FROM users WHERE gate_id IS NULL;
```

---

## 🎯 Three Ways to Ensure Gates

| Method | When to Use | How | Status |
|--------|-------------|-----|--------|
| **Signup** | New users | Automatic via `/api/gate/signup` | ✅ Active |
| **Login** ⭐ | Existing users | **Automatic on login** | ✅ Active |
| **Backfill** | One-time migration | POST to `/api/gate/backfill` | Manual |

**Primary Method:** Users automatically get gates on login! 🎉

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `GATE_SETUP_QUICKSTART.md` | Initial setup guide |
| `docs/AUTO_GATE_CREATION.md` ⭐ | **Auto-creation on login** |
| `docs/GATE_BACKFILL_GUIDE.md` | Existing users guide |
| `docs/DATABASE_SETUP.md` | Database architecture |
| `docs/integrations/GATE_INTEGRATION.md` | API reference |
| `IMPLEMENTATION_SUMMARY.md` | Complete overview |
| `examples/gate-usage-example.ts` | Code examples |

---

## ✅ Success Checklist

After setup, verify:

- [ ] `gate_id` and `gate_name` columns exist in `users` table
- [ ] User creation trigger is active
- [ ] New signups automatically get gates
- [ ] Dashboard uses `GateEnsurer` component
- [ ] All existing users have gates (run backfill if needed)
- [ ] Database query returns 0: `SELECT COUNT(*) FROM users WHERE gate_id IS NULL`

---

## 🆘 Common Issues

### "null value in column 'phone'"
```sql
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;
```

### "Service role key not defined"
Add to `.env.local`:
```bash
SUPABASE_SERVICE_ROLE_KEY=your_key_here
```

### Existing users don't have gates
```bash
curl -X POST http://localhost:3000/api/gate/backfill
```

---

## 📞 External API

**Endpoint:** `https://aps.co.ke/indexpay/api/get_transactions_2.php`

**Parameters:**
- `request: "7"`
- `user_email: "info@nsait.co.ke"`
- `gate_name: {user_email_prefix}`
- `gate_currency: "KES"`
- `pocket_name: "ongeapesa_wallet"`

**Response:**
```json
{
  "status": true,
  "gate_id": 329,
  "gate_name": "user"
}
```

---

## 🚀 Ready to Go!

1. ✅ Setup complete
2. ✅ Database configured
3. ✅ APIs created
4. ✅ Components ready
5. ✅ Documentation available

**Start building payment features now!** 🎉
