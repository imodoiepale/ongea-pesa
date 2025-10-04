# ⚡ Quick Fix for 403 Error

## ❌ Current Error:
```
❌ n8n webhook failed
Status: 403
Response: Authorization data is wrong!
```

## ✅ 2-Minute Fix

### Step 1: Add Auth Token to .env.local

Create or edit `.env.local` in your project root:

```bash
# c:\Users\ADMIN\Documents\GitHub\ongea-pesa\.env.local

# Add this line (use any secure token):
N8N_WEBHOOK_AUTH_TOKEN=Bearer my-secure-token-12345
```

### Step 2: Update n8n Webhook Credential

1. Open your n8n workflow
2. Click **Webhook** node
3. Under **Credentials** → Click **Header Auth account 2**
4. Set:
   - **Name**: `Authorization`
   - **Value**: `Bearer my-secure-token-12345` (same as .env.local)
5. **Save** credential
6. **Activate** workflow

### Step 3: Restart Next.js

```bash
# Press Ctrl+C to stop
npm run dev
```

---

## ✅ Test

Say: **"Send 100 to 0712345678"**

You should see:
```
=== FORWARDING TO N8N ===
N8N URL: https://primary-production-579c.up.railway.app/webhook-test/send_money
Auth configured: Yes
✅ n8n Response: { ... }
```

---

## 🎯 Alternative: Disable Auth (Testing Only)

If you want to test WITHOUT auth:

1. In n8n, click **Webhook** node
2. **Authentication** → Change to **None**
3. Save and activate

**⚠️ Only for local testing!**

---

## 📖 Full Details

See `N8N_AUTH_SETUP.md` for complete instructions and troubleshooting.
