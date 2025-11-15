# 🔍 Debug Tools - Quick Reference

## What Was Added

### 1. Debug Dashboard UI
**URL**: `http://localhost:3000/debug`

Visual dashboard showing:
- ✅ System health status (healthy/degraded/unhealthy)
- 📊 Recent webhook requests (last 50)
- 🔌 Connection status for all services
- ⚙️ Environment variable verification
- 📝 Detailed error messages

### 2. API Endpoints

#### `/api/voice/webhook/logs` 
**Method**: GET  
**Purpose**: Retrieve all recent webhook requests  
**Returns**: JSON array of last 50 requests with full details

```bash
curl http://localhost:3000/api/voice/webhook/logs
```

#### `/api/voice/webhook/test`
**Method**: GET/POST  
**Purpose**: Test if webhook is accessible  
**Returns**: Success message if reachable

```bash
curl http://localhost:3000/api/voice/webhook/test
```

#### `/api/diagnostics`
**Method**: GET  
**Purpose**: System health check  
**Returns**: Status of Supabase, ElevenLabs, n8n, and environment

```bash
curl http://localhost:3000/api/diagnostics
```

### 3. Enhanced Webhook Logging

**File**: `app/api/voice/webhook/route.ts`

Now logs every request with:
- Request ID and timestamp
- Full request body and headers
- User context
- n8n response
- Success/failure status
- Duration in milliseconds

### 4. Fixed Balance Polling Issue

**File**: `contexts/ElevenLabsContext.tsx`

**Changes**:
- ❌ Before: Polled every 10 seconds (causing timeouts)
- ✅ Now: Polls every 30 seconds
- Added 5-second timeout protection
- Retry logic (stops after 3 failures)
- Better error handling

## 🚀 How to Use

### Step 1: Check if Requests Reach Webhook

1. Open debug page: `http://localhost:3000/debug`
2. Make a voice transaction
3. Look at "Webhook Request Logs" section

**If you see logs**:
- ✅ ElevenLabs is calling your webhook correctly
- Check if success=true or failed
- Review error messages if failed

**If NO logs**:
- ❌ ElevenLabs isn't reaching your webhook
- **Action needed**:
  - Update ElevenLabs webhook URL
  - Use ngrok for local testing
  - Check send_money tool configuration

### Step 2: Verify System Health

Check the colored status boxes on debug page:

- 🟢 **Green "OK"** = Working correctly
- 🟡 **Yellow "WARNING"** = Degraded but functional  
- 🔴 **Red "ERROR"** = Not working

Common issues:
- Supabase error → Check internet/credentials
- ElevenLabs error → Verify API key and Agent ID
- n8n error → Check Railway deployment

### Step 3: Test Individual Components

```bash
# Test Supabase
curl http://localhost:3000/api/balance

# Test ElevenLabs config
curl http://localhost:3000/api/get-signed-url -X POST

# Test n8n webhook
curl -X POST https://primary-production-579c.up.railway.app/webhook/send_money \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Test voice webhook
curl http://localhost:3000/api/voice/webhook/test
```

## 🔧 Troubleshooting Your Specific Issue

### "Nothing is sent to my database"

**Possible causes**:

1. **ElevenLabs not calling webhook** (MOST LIKELY)
   - Debug page shows 0 requests
   - Fix: Update webhook URL in ElevenLabs
   
2. **Webhook called but fails before n8n**
   - Debug page shows requests with errors
   - Check error messages (balance, validation, etc.)
   
3. **n8n receives but doesn't save to DB**
   - Debug page shows success
   - Check n8n workflow logs on Railway
   - Verify database connection in n8n

### Supabase Connection Timeouts

**Already fixed** by:
- Reducing balance polling frequency
- Adding timeout protection
- Implementing retry logic

If still occurring:
- Check your internet connection
- Verify Supabase service status
- Increase polling interval to 60s in `contexts/ElevenLabsContext.tsx` line 178

## 📊 What the Logs Tell You

### Successful Request
```
========================================
🎙️ VOICE WEBHOOK CALLED
========================================
✅ User context: {...}
✅ BALANCE CHECK PASSED
✅ n8n Response parsed: {...}
📝 Request logged. Total logs: 1
```

### Failed - No User Found
```
🎙️ VOICE WEBHOOK CALLED
⚠️ No user found - using test mode
❌ No active voice sessions found
```
**Fix**: Make sure user is logged in and has active voice session

### Failed - Insufficient Funds
```
✅ User context: {...}
❌ INSUFFICIENT FUNDS
  Balance: 500
  Required: 1050
  Shortfall: 550
```
**Fix**: Add funds to wallet

### Failed - n8n Unreachable
```
✅ BALANCE CHECK PASSED
=== FORWARDING TO N8N ===
❌ n8n webhook failed
Status: 500
```
**Fix**: Check Railway deployment, verify n8n URL

## 🎯 Quick Diagnosis Flow

```
1. Go to /debug page
   ↓
2. Check "Webhook Request Logs"
   ↓
3a. No logs?                    3b. Has logs?
    → ElevenLabs issue              → Check if success=true
    → Update webhook URL            ↓
    → Check tool config         4a. Success?        4b. Failed?
                                    → Check DB          → Read error
                                    → Check n8n logs    → Fix issue
```

## 📖 Full Documentation

For detailed troubleshooting, see: `DEBUGGING_GUIDE.md`

## 🆘 Emergency Commands

```bash
# See all recent webhook calls
curl http://localhost:3000/api/voice/webhook/logs | jq '.logs'

# Check system health
curl http://localhost:3000/api/diagnostics | jq '.overall_status'

# Test webhook
curl http://localhost:3000/api/voice/webhook/test

# Manual webhook call (simulate ElevenLabs)
curl -X POST "http://localhost:3000/api/voice/webhook?request=Send+100" \
  -H "Content-Type: application/json" \
  -d '{"type":"send_phone","amount":"100","phone":"0712345678","summary":"test"}'
```

## ✅ What to Check Right Now

1. Visit `http://localhost:3000/debug`
2. Look at "Webhook Request Logs" section
3. If empty → **Your issue**: ElevenLabs webhook URL is wrong/unreachable
4. If has logs → Click on them to see details and error messages
5. Check "System Health" boxes for red/yellow warnings

---

**Files Modified**:
- `app/api/voice/webhook/route.ts` - Enhanced logging
- `contexts/ElevenLabsContext.tsx` - Fixed balance polling
- `app/api/voice/webhook/logs/route.ts` - NEW: Logs endpoint
- `app/api/voice/webhook/test/route.ts` - NEW: Test endpoint  
- `app/api/diagnostics/route.ts` - NEW: Diagnostics endpoint
- `app/debug/page.tsx` - NEW: Debug dashboard
- `DEBUGGING_GUIDE.md` - NEW: Full documentation
