# 🔑 Add Service Role Key - REQUIRED!

## ❌ Current Error

```
Error [AuthApiError]: User not allowed
status: 403,
code: 'not_admin'
```

## ✅ Solution

You need to add **SUPABASE_SERVICE_ROLE_KEY** to your `.env.local` file.

---

## 📋 Step-by-Step

### Step 1: Get Your Service Role Key

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Scroll to **Project API keys**
5. Find **service_role** key (NOT anon key!)
6. Click the **👁️ icon** to reveal it
7. Click **Copy**

**Important:** It's a long key starting with `eyJ...`

---

### Step 2: Add to .env.local

**Create or edit:** `c:\Users\ADMIN\Documents\GitHub\ongea-pesa\.env.local`

Add this line:
```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ...
```

**Replace with YOUR actual service role key!**

---

### Step 3: Complete .env.local File

Your `.env.local` should have:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...

# SERVICE ROLE KEY - Required for admin operations
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key...

# ElevenLabs Configuration  
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=agent_...
ELEVENLABS_API_KEY=sk_...

# n8n Webhook Authentication (optional)
N8N_WEBHOOK_AUTH_TOKEN=Bearer your-token

# Gemini API (for payment scanner)
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_key
```

---

### Step 4: Restart Next.js

```bash
# Stop: Ctrl+C
npm run dev
```

**Wait for:** `✓ Ready in Xs`

---

### Step 5: Test Again

Say: **"Send 100 to 0712345678"**

---

## ✅ Expected After Adding Key

### Console Logs:
```
⚠️ No user context found, fetching most recent user from database
🔍 Creating admin client...
🔍 Calling auth.admin.listUsers() with service role...
List users result:
  Error: null  ✅
  Users count: 1  ✅
✅ Found 1 users in database
✅ Most recent user: ijepale@gmail.com ID: b8c5a1f0-...
✅ SUCCESSFULLY SET REAL USER DATA

📤 Final user data for n8n:
  user_id: b8c5a1f0-4d8e-4abc-9123-456789abcdef  ✅ REAL!
  user_email: ijepale@gmail.com  ✅ REAL!
```

### n8n Receives:
```json
{
  "user_id": "b8c5a1f0-...",  ✅ NOT test-user-id!
  "user_email": "ijepale@gmail.com",  ✅ NOT test@ongeapesa.com!
  "amount": 3000
}
```

---

## 🔍 How to Verify It's Set

**Windows PowerShell:**
```powershell
Get-Content .env.local | Select-String "SERVICE_ROLE"
```

**Should show:**
```
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## ⚠️ Security Notes

1. **NEVER** commit `.env.local` to git (it's in `.gitignore`)
2. **NEVER** share your service role key publicly
3. This key has **full admin access** to your database
4. Keep it secret like a password!

---

## 🚨 If You Don't Have the Key

**Option A: From Supabase Dashboard**
- Settings → API → service_role key

**Option B: Generate New One**
- You can regenerate it in Settings if needed

**Option C: Check Email**
- Supabase sends project credentials when you create a project

---

## 🎯 Quick Checklist

- [ ] Get service_role key from Supabase Dashboard
- [ ] Add to `.env.local` as `SUPABASE_SERVICE_ROLE_KEY=...`
- [ ] Restart Next.js (`npm run dev`)
- [ ] Test: "Send 100 to 0712345678"
- [ ] Check logs for "✅ SUCCESSFULLY SET REAL USER DATA"
- [ ] Check n8n for real user_id

---

**Add the key now, restart, and test!** 🔑
