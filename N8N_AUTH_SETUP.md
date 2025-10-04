# 🔐 n8n Authentication Setup - Fix 403 Error

## ❌ Error You're Seeing:

```
❌ n8n webhook failed
Status: 403
Response: Authorization data is wrong!
```

## 🔧 Quick Fix (2 minutes)

### Step 1: Get Your n8n Auth Token

Your n8n webhook has **Header Auth** enabled. You need to get the token:

#### Option A: From n8n Credentials
1. Open your n8n workflow
2. Click on the **Webhook** node
3. Look for **Credentials** → **Header Auth account 2**
4. Click on the credential name
5. You'll see the header configuration
6. The format is usually: `Bearer YOUR_TOKEN` or just `YOUR_TOKEN`

#### Option B: Create a New Header Auth
If you don't have the token, create a simple one:

1. In n8n, go to **Credentials** → **New Credential**
2. Select **Header Auth**
3. **Name**: `Authorization`
4. **Value**: `Bearer my-secret-token-12345` (create any secure token)
5. Save it
6. Update your Webhook node to use this credential

### Step 2: Add Token to Your Next.js Project

Create or update `.env.local` file in your project root:

```bash
# In: c:\Users\ADMIN\Documents\GitHub\ongea-pesa\.env.local

# Supabase (your existing config)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# ElevenLabs (your existing config)
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your_agent_id

# n8n Authentication - ADD THIS LINE
N8N_WEBHOOK_AUTH_TOKEN=Bearer my-secret-token-12345
```

**Important:** 
- If your n8n expects just the token: `N8N_WEBHOOK_AUTH_TOKEN=my-secret-token-12345`
- If it expects Bearer format: `N8N_WEBHOOK_AUTH_TOKEN=Bearer my-secret-token-12345`

### Step 3: Restart Next.js

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

---

## 🎯 Alternative: Disable n8n Authentication (For Testing Only)

If you want to test quickly without auth:

1. Open your n8n workflow
2. Click on the **Webhook** node
3. Under **Authentication**, change from **Header Auth** to **None**
4. Save and activate workflow

**⚠️ Warning:** Only do this for local testing with ngrok. **Never** deploy without authentication!

---

## ✅ Verify It Works

After adding the token and restarting:

1. Test with: "Send 100 to 0712345678"
2. Check your Next.js terminal:
   ```
   === FORWARDING TO N8N ===
   N8N URL: https://primary-production-579c.up.railway.app/webhook-test/send_money
   Auth configured: Yes
   ✅ n8n Response: { ... }
   ```

3. Should see **200 OK** instead of **403**

---

## 🔍 Troubleshooting

### Still Getting 403?

**Check the header format:**

Your n8n expects a specific header format. Common formats:

1. **Bearer Token**:
   ```
   N8N_WEBHOOK_AUTH_TOKEN=Bearer abc123xyz
   ```

2. **API Key**:
   ```
   N8N_WEBHOOK_AUTH_TOKEN=abc123xyz
   ```

3. **Custom Format**:
   Check your n8n Header Auth credential to see exactly what format it expects.

### How to Test

Add more logging to see what's being sent:

The code already logs:
```typescript
console.log('Auth configured:', N8N_AUTH_TOKEN ? 'Yes' : 'No')
```

You should see `Auth configured: Yes` in your terminal.

### Check n8n Logs

1. In n8n, click on your workflow
2. Go to **Executions** tab
3. Look for the failed execution
4. Check the error message - it might tell you the expected format

---

## 📝 Example .env.local File

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ElevenLabs Configuration  
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your_agent_id_here

# n8n Webhook Authentication
N8N_WEBHOOK_AUTH_TOKEN=Bearer my-secure-token-here

# Optional: Gemini API (for payment scanner)
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_key_here
```

---

## 🚀 After Setup

Once configured, your flow will be:

```
User Voice
    ↓
ElevenLabs
    ↓
Next.js API (adds auth header)
    ↓
n8n (validates auth) ✅
    ↓
Processes transaction
    ↓
Updates database
    ↓
Returns success
    ↓
Agent responds to user
```

**Test it now!** Say "Send 100 to 0712345678" and watch the magic happen! ✨
