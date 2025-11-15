# Ongea Pesa - Debugging & Monitoring Guide

This guide explains how to debug issues with your voice-activated payment system, particularly when requests aren't reaching the database or AI agent.

## 🔍 Quick Diagnosis

### 1. Access the Debug Dashboard
Visit: `http://localhost:3000/debug`

This page shows:
- ✅ **System Health**: Overall status of all components
- 📊 **Webhook Logs**: All recent AI agent requests
- 🔌 **Connection Status**: Supabase, n8n, and ElevenLabs status
- ⚙️ **Environment Check**: Verify all required variables are set

### 2. Check Webhook Logs
**Endpoint**: `GET /api/voice/webhook/logs`

```bash
curl http://localhost:3000/api/voice/webhook/logs
```

**What to look for**:
- If `total_requests: 0` → ElevenLabs isn't calling your webhook
- If requests show errors → Check error messages for details
- If requests succeed but nothing in DB → Check n8n workflow

### 3. Test Webhook Connectivity
**Endpoint**: `GET /api/voice/webhook/test`

```bash
curl http://localhost:3000/api/voice/webhook/test
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Webhook endpoint is accessible and working",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 4. Run System Diagnostics
**Endpoint**: `GET /api/diagnostics`

```bash
curl http://localhost:3000/api/diagnostics
```

This checks:
- Supabase authentication and database connectivity
- ElevenLabs configuration
- n8n webhook reachability
- Environment variables

## 🚨 Common Issues & Solutions

### Issue 1: No Webhook Requests Logged

**Symptoms**:
- Debug page shows `total_requests: 0`
- AI agent speaks but nothing happens
- No logs in console

**Causes & Solutions**:

1. **Incorrect Webhook URL in ElevenLabs**
   - Check your ElevenLabs agent configuration
   - Webhook URL should be: `https://your-domain.com/api/voice/webhook`
   - For development with ngrok: `https://abc123.ngrok-free.app/api/voice/webhook`

2. **send_money Tool Not Configured**
   - Verify the tool exists in ElevenLabs dashboard
   - Check tool webhook URL matches your deployment
   - Ensure tool is enabled and properly configured

3. **CORS Issues**
   - ElevenLabs may be blocked by CORS
   - Check browser console for CORS errors
   - Webhook should include CORS headers (already implemented)

**How to Fix**:
```bash
# 1. Start ngrok if testing locally
ngrok http 3000

# 2. Update ElevenLabs webhook URL
# Go to: https://elevenlabs.io/app/conversational-ai
# Update tool webhook URL to your ngrok/production URL

# 3. Test the webhook
curl https://your-ngrok-url.ngrok-free.app/api/voice/webhook/test
```

### Issue 2: Supabase Connection Timeouts

**Symptoms**:
```
Error [ConnectTimeoutError]: Connect Timeout Error
GET /api/balance 401 in 10236ms
```

**Causes**:
- Slow/unstable internet connection
- Supabase service issues
- Too frequent API calls (was polling every 10s)

**Solutions**:

1. **Already Fixed**: Balance polling reduced from 10s → 30s intervals
2. **Added Timeout Protection**: 5-second timeout with retry logic
3. **Error Handling**: Stops polling after 3 consecutive failures

**Manual Fix** (if issues persist):
```typescript
// In contexts/ElevenLabsContext.tsx
// Line 178: Increase interval further if needed
const balanceInterval = setInterval(fetchBalance, 60000); // 60 seconds
```

### Issue 3: Requests Reach Webhook But Not Database

**Symptoms**:
- Webhook logs show successful requests
- n8n response looks good
- But no data in Supabase tables

**Debugging Steps**:

1. **Check n8n Workflow**
   ```bash
   # Test n8n directly
   curl -X POST https://primary-production-579c.up.railway.app/webhook/send_money \
     -H "Content-Type: application/json" \
     -d '{"type": "send_phone", "amount": "100", "phone": "0712345678", "user_id": "test"}'
   ```

2. **Check n8n Logs**
   - Go to Railway dashboard
   - View n8n deployment logs
   - Look for incoming requests and errors

3. **Verify Database Schema**
   ```sql
   -- Check if tables exist
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   
   -- Check transactions table
   SELECT * FROM transactions ORDER BY created_at DESC LIMIT 5;
   ```

### Issue 4: AI Agent Not Calling send_money Tool

**Symptoms**:
- AI responds but doesn't execute transactions
- No webhook calls logged
- AI says "I'll help with that" but nothing happens

**Solutions**:

1. **Check Tool Configuration**
   - Tool name must be exactly: `send_money`
   - Tool description should trigger on payment intent
   - Parameters must match schema in elevenlabs-config.json

2. **Update System Prompt**
   ```
   USE THE send_money tool for ALL transactions.
   When user wants to send money, IMMEDIATELY call send_money tool.
   ```

3. **Test Prompt**
   - Try explicit trigger: "Use send_money tool to send 100 shillings to 0712345678"
   - If this works, your prompt needs improvement

## 📊 Monitoring Console Logs

### Webhook Request Flow

When a voice transaction occurs, you should see:

```
========================================
🎙️ VOICE WEBHOOK CALLED
========================================
Request ID: req_1705315200000
Timestamp: 2024-01-15T10:30:00.000Z
Request URL: /api/voice/webhook?request=Send+100+to+0712345678

=== CHECKING FREE TRANSACTION ELIGIBILITY ===
✅ FREE TRANSACTION QUALIFIED!

=== BALANCE VALIDATION ===
✅ BALANCE CHECK PASSED

=== FORWARDING TO N8N ===
N8N Response Status: 200
✅ n8n Response parsed: {...}

=== SENDING RESPONSE TO ELEVENLABS ===
Response: {"success": true, ...}
=== WEBHOOK COMPLETED ===

📝 Request logged. Total logs: 1
```

### No Logs = Problem Location

If you see:
- **No logs at all** → ElevenLabs not calling webhook
- **Logs but error before "FORWARDING TO N8N"** → Validation failure (balance, amount, etc.)
- **Logs but n8n error** → n8n webhook unreachable
- **Everything logs successfully** → Issue is in n8n workflow or database

## 🔧 Environment Variables Checklist

Required in `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# ElevenLabs
NEXT_PUBLIC_AGENT_ID=your_agent_id
ELEVENLABS_API_KEY=sk_xxx...

# n8n (optional for auth)
N8N_WEBHOOK_AUTH_TOKEN=your_token_here
```

Verify all are set:
```bash
curl http://localhost:3000/api/diagnostics | jq '.checks.environment_variables'
```

## 🎯 Testing Workflow

### Complete End-to-End Test

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Open Debug Dashboard**
   - Navigate to `http://localhost:3000/debug`
   - Should show "System Status: HEALTHY"

3. **Test Webhook Accessibility**
   ```bash
   curl http://localhost:3000/api/voice/webhook/test
   ```

4. **Start Voice Interface**
   - Go to `http://localhost:3000`
   - Click "Start Voice Session"
   - Say: "Send 100 shillings to 0712345678"

5. **Monitor Debug Page**
   - Refresh debug page
   - Should see new request logged
   - Check if successful or failed

6. **Check Database**
   ```bash
   # Via Supabase dashboard or psql
   SELECT * FROM transactions ORDER BY created_at DESC LIMIT 1;
   ```

### Manual Webhook Test

Simulate ElevenLabs calling your webhook:

```bash
curl -X POST http://localhost:3000/api/voice/webhook?request=Send+100+to+0712345678 \
  -H "Content-Type: application/json" \
  -d '{
    "type": "send_phone",
    "amount": "100",
    "phone": "0712345678",
    "summary": "Send 100 KSh to 0712345678"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Transaction processed successfully",
  "transaction_id": "tx_xxx"
}
```

## 📝 Logging Best Practices

### Server-Side (Terminal)
All webhook requests are logged with:
- Timestamp and request ID
- User context and balance
- Transaction details
- n8n response
- Success/failure status

### Client-Side (Browser Console)
- Balance fetches
- Voice session lifecycle
- ElevenLabs connection status

### In-Memory Logs (API)
- Last 50 webhook requests stored
- Accessible via `/api/voice/webhook/logs`
- Resets on server restart

## 🚀 Production Checklist

Before deploying:

- [ ] Update ElevenLabs webhook URL to production domain
- [ ] Verify all environment variables in production
- [ ] Test webhook with production URL
- [ ] Monitor logs for 24 hours after deployment
- [ ] Set up external logging (e.g., LogRocket, Sentry)
- [ ] Configure database backups
- [ ] Set up uptime monitoring

## 🆘 Still Having Issues?

1. **Enable Verbose Logging**
   - Check all console.log statements are working
   - Add more detailed logging if needed

2. **Test Each Component Separately**
   - Supabase connection: `/api/balance`
   - ElevenLabs: `/api/get-signed-url`
   - Webhook: `/api/voice/webhook/test`
   - n8n: Direct curl to Railway URL

3. **Check Network Tab**
   - Open browser DevTools → Network
   - Filter by "webhook" or "balance"
   - Look for failed requests

4. **Review Error Messages**
   - Copy full error stack trace
   - Check if it's timeout, auth, or other issue
   - Search error code online if unfamiliar

## 📞 Support Resources

- **Debug Dashboard**: `http://localhost:3000/debug`
- **Diagnostics API**: `GET /api/diagnostics`
- **Webhook Logs**: `GET /api/voice/webhook/logs`
- **Test Endpoint**: `GET /api/voice/webhook/test`

---

**Last Updated**: January 2025
**Version**: 1.0.0
