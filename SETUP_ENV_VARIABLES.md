# 🔧 Environment Variables Setup Guide

## ❌ Current Error

```
Error: supabaseKey is required.
```

**Cause:** The `SUPABASE_SERVICE_ROLE_KEY` is not set in your `.env.local` file.

---

## ✅ Quick Fix (3 Steps)

### Step 1: Get Your Supabase Keys

1. **Go to Supabase Dashboard:** https://supabase.com/dashboard
2. **Select your project**
3. **Navigate to:** Settings → API
4. **Copy these three values:**

   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key (⚠️ Secret!) → `SUPABASE_SERVICE_ROLE_KEY`

### Step 2: Update `.env.local`

I've created a `.env.local` file for you. Open it and replace the placeholder values:

```bash
# Open .env.local and replace these:

NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
```

### Step 3: Restart Dev Server

```bash
# Stop your server (Ctrl+C)
# Then start it again:
npm run dev
```

---

## 📋 Complete Environment Variables

Your `.env.local` should have at minimum:

```bash
# REQUIRED for gate integration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1...  # ← THIS IS CRITICAL!

# OPTIONAL (for other features)
NEXT_PUBLIC_AGENT_ID=your_elevenlabs_agent_id
ELEVENLABS_API_KEY=your_elevenlabs_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## 🔍 How to Find Supabase Keys

### Visual Guide:

1. **Supabase Dashboard:**
   ```
   https://supabase.com/dashboard
   ```

2. **Click on your project**

3. **Left sidebar → Settings (⚙️) → API**

4. **You'll see:**
   ```
   Project URL: https://xxxxx.supabase.co
   ↓
   anon public: eyJhbGci...
   ↓
   service_role: eyJhbGci... (click "Reveal" to show)
   ```

5. **Copy each value to `.env.local`**

---

## ⚠️ Important Security Notes

### DO ✅
- Keep `service_role` key secret
- Add `.env.local` to `.gitignore` (already done)
- Use different keys for dev and production
- Restart server after changing env vars

### DON'T ❌
- Commit `.env.local` to Git
- Share service_role key publicly
- Use production keys in development
- Hardcode keys in your code

---

## 🧪 Test Your Setup

After updating `.env.local` and restarting:

### 1. Check via diagnostic endpoint:

```bash
# In browser or curl:
curl http://localhost:3000/api/gate/check-setup
```

**Expected response:**
```json
{
  "environment": {
    "NEXT_PUBLIC_SUPABASE_URL": true,
    "SUPABASE_SERVICE_ROLE_KEY": true
  },
  "authentication": {
    "isAuthenticated": true,
    "userId": "b970bef4-...",
    "userEmail": "ijepale@gmail.com"
  }
}
```

### 2. Test login:

1. Login with your account
2. Check console for:
   ```
   🎉 Payment gate created on login!
   Gate ID: 329
   Gate Name: ijepale
   ```

### 3. Verify in database:

```sql
SELECT email, gate_id, gate_name 
FROM public.users 
WHERE email = 'ijepale@gmail.com';
```

---

## 🐛 Troubleshooting

### Error: "supabaseKey is required"
**Solution:** `SUPABASE_SERVICE_ROLE_KEY` is not set or is empty
- Check `.env.local` exists
- Check the value is correct (no spaces, complete key)
- Restart dev server

### Error: "Invalid API key"
**Solution:** Wrong key or wrong project
- Copy the exact key from Supabase dashboard
- Make sure you're using the right project
- Check for extra spaces or line breaks

### Error: "NEXT_PUBLIC_SUPABASE_URL is not set"
**Solution:** Missing Supabase URL
- Add `NEXT_PUBLIC_SUPABASE_URL` to `.env.local`
- Must start with `https://`
- Restart dev server

### Changes not taking effect
**Solution:** Server not restarted
```bash
# Stop with Ctrl+C
# Start again:
npm run dev
```

---

## 📝 Quick Checklist

After setup, verify:

- [ ] `.env.local` file exists in project root
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set (⚠️ Critical!)
- [ ] Dev server has been restarted
- [ ] Login works without errors
- [ ] Console shows gate creation message
- [ ] Database has gate_id and gate_name

---

## 🎯 Example .env.local

```bash
# Real example (with fake keys):
NEXT_PUBLIC_SUPABASE_URL=https://xkbpflnhrepcwqxmmqks.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhri...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhri...

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## 🚀 Next Steps

Once your environment is set up:

1. ✅ Login should work without errors
2. ✅ Gates will be created automatically
3. ✅ Console will show gate info
4. ✅ Database will have complete user data

**You're ready to go!** 🎉
