# ⚡ Quick Fix Checklist - Get It Working Now!

## ✅ What's Fixed in Code

- [x] User authentication in signed URL generation
- [x] Voice session tracking in database
- [x] 3-tier user lookup (session → email → voice_sessions)
- [x] Real wallet_balance display on UI
- [x] Auto-refresh balance every 30 seconds
- [x] n8n authentication header support
- [x] TypeScript errors fixed

## 🎯 What YOU Need to Do (5 minutes)

### 1. Fix n8n Auth (Choose One)

#### Option A: Add Token (Secure - 2 min)
```bash
# Create c:\Users\ADMIN\Documents\GitHub\ongea-pesa\.env.local

N8N_WEBHOOK_AUTH_TOKEN=Bearer abc123xyz
```

Then in n8n:
- Webhook node → Credentials → Header Auth
- Name: `Authorization`
- Value: `Bearer abc123xyz` (same token)
- Save & Activate

#### Option B: Disable Auth (Fast - 30 sec)
In n8n:
- Webhook node → Authentication → **None**
- Save & Activate

### 2. Restart Next.js
```bash
# Press Ctrl+C
npm run dev
```

### 3. Test!
1. Go to `localhost:3000`
2. **Login** (important!)
3. Click voice button or go to `/`
4. Say: **"Send 100 to 0712345678"**

---

## 🔍 Expected Results

### ✅ Success Logs:
```
Generating signed URL for user: your@email.com
Saved voice session: session-123

=== VOICE WEBHOOK CALLED ===
✅ Found user from session: your@email.com
✅ User context: { id: "...", wallet_balance: 10000 }

=== FORWARDING TO N8N ===
Auth configured: Yes
✅ n8n Response: { success: true }
```

### ✅ UI Updates:
- Dashboard shows: **KSh 10,000.00** → **KSh 9,900.00**
- Transaction appears in n8n execution logs
- Balance updates within 30 seconds

### ✅ Database:
```sql
-- Check your transaction
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 1;

-- Check your balance  
SELECT wallet_balance FROM profiles WHERE phone_number = 'YOUR_PHONE';

-- Check voice session
SELECT * FROM voice_sessions ORDER BY created_at DESC LIMIT 1;
```

---

## ❌ If Still Not Working

### Problem: "test mode" in logs
**Solution**: Make sure you're logged in at `localhost:3000/login`

### Problem: 403 from n8n
**Solution**: Set `N8N_WEBHOOK_AUTH_TOKEN` in .env.local OR disable auth in n8n

### Problem: Balance shows 0
**Solution**: Check if wallet_balance column exists:
```sql
SELECT wallet_balance FROM profiles LIMIT 1;
```

### Problem: user_email undefined
**Solution**: Voice session lookup will find user automatically (new feature!)

---

## 📁 Key Files Updated

1. `/api/get-signed-url/route.ts` - Now requires auth, saves sessions
2. `/api/voice/webhook/route.ts` - 3-tier user lookup, n8n auth
3. `/api/balance/route.ts` - Returns wallet_balance
4. `/api/user/route.ts` - Get current user info
5. `components/ongea-pesa/main-dashboard.tsx` - Shows real balance

---

## 🎉 You're Done!

**Test Command:**
"Send 100 to 0712345678"

**Expected:**
- ✅ Real user found (not test mode)
- ✅ Transaction saved with your user_id
- ✅ Balance decreases by 100
- ✅ UI updates automatically
- ✅ Agent responds: "Sent!"

**Everything is ready!** Just fix the n8n auth and test! 🚀

---

## 📖 Detailed Docs

- `USER_CONTEXT_FIXED.md` - Complete explanation
- `FIX_403_ERROR.md` - n8n auth setup
- `N8N_AUTH_SETUP.md` - Detailed auth guide
- `INTEGRATION_COMPLETE.md` - Full integration guide
