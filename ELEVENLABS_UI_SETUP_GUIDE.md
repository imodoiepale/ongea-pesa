# ElevenLabs Webhook Tool Setup - Complete UI Guide

## 🎯 Step-by-Step Visual Guide

This guide shows you **exactly** how to configure the `send_money` webhook tool in the ElevenLabs dashboard with screenshots and detailed instructions.

---

## Prerequisites

Before you start, make sure you have:
- ✅ ElevenLabs account (sign up at https://elevenlabs.io)
- ✅ Your Vercel deployment URL (e.g., `https://ongeapesa.vercel.app`)
- ✅ Ongea Pesa app code deployed
- ✅ Your API keys set in environment variables

---

## Part 1: Create Your Agent

### Step 1: Go to ElevenLabs Dashboard

1. Open your browser and go to: **https://elevenlabs.io**
2. Sign in to your account
3. Click on **"Conversational AI"** in the left sidebar
4. Click **"+ Create Agent"** button (top right)

**What you'll see:**
```
┌─────────────────────────────────────┐
│  ElevenLabs Dashboard                │
│  ┌──────────────────────────┐       │
│  │ 🎤 Conversational AI      │       │
│  │ 📝 Text to Speech         │       │
│  │ 🎵 Audio Projects         │       │
│  └──────────────────────────┘       │
│                                      │
│  [+ Create Agent]  ←── Click here   │
└─────────────────────────────────────┘
```

### Step 2: Name Your Agent

1. **Agent Name**: Enter `Ongea Pesa Voice Assistant`
2. **Description**: `Kenya's fastest voice-activated M-Pesa payment assistant`
3. Click **"Create"**

---

## Part 2: Configure Agent Settings

### Step 3: Access Agent Settings

After creating the agent, you'll be on the agent configuration page with these tabs:
- **Agent** (where you'll spend most time)
- **Knowledge**
- **Testing**
- **Publish**

**Current Tab: Agent**

You'll see sections:
1. **Conversation** - Voice and language settings
2. **Intelligence** - Model and prompt
3. **Tools** ← **THIS IS WHERE WE'LL WORK**

---

## Part 3: Add the Webhook Tool

### Step 4: Add Tool

1. Scroll down to the **"Tools"** section
2. Click **"+ Add Tool"** button
3. Select **"Webhook"** from the dropdown

**What you'll see:**
```
Tools
┌──────────────────────────────────┐
│ Tools let your agent connect to  │
│ external systems and APIs         │
│                                   │
│  [+ Add Tool ▼]                  │
│    • Webhook      ← Select this  │
│    • Client Tool                  │
│    • MCP Server                   │
└──────────────────────────────────┘
```

### Step 5: Configure Tool Basics

A modal will pop up with multiple tabs. Start with **"Configuration"** tab:

#### Configuration Tab

| Field | Value |
|-------|-------|
| **Tool Type** | Webhook (already selected) |
| **Name** | `send_money` |
| **Description** | `Sends transaction details to process M-Pesa payments. Use this for ALL transaction types: sending money, paying bills, buying goods, withdrawals, and bank transfers.` |
| **Method** | `POST` |
| **URL** | `https://ongeapesa.vercel.app/api/voice/webhook` |

**⚠️ IMPORTANT**: Replace `ongeapesa.vercel.app` with YOUR actual Vercel deployment URL!

**Visual representation:**
```
┌─────────────────────────────────────────┐
│ Configure Webhook Tool                   │
├─────────────────────────────────────────┤
│ Name *                                   │
│ ┌─────────────────────────────────────┐ │
│ │ send_money                           │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ Description *                            │
│ ┌─────────────────────────────────────┐ │
│ │ Sends transaction details to        │ │
│ │ process M-Pesa payments...          │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ Method *                                 │
│ ┌─────────────┐                         │
│ │ POST ▼      │                         │
│ └─────────────┘                         │
│                                          │
│ URL *                                    │
│ ┌─────────────────────────────────────┐ │
│ │ https://ongeapesa.vercel.app/api/  │ │
│ │ voice/webhook                       │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## Part 4: Configure Query Parameters

### Step 6: Add Query Parameters Tab

Click on the **"Query parameters"** tab at the top of the modal.

You need to add **3 query parameters**:

#### Query Parameter 1: request

Click **"+ Add Parameter"**

| Field | Value |
|-------|-------|
| **Parameter Name** | `request` |
| **Data Type** | `string` |
| **Value Type** | `LLM Prompt` ← **Select from dropdown** |
| **Description** | `The full user request verbatim` |
| **Required** | ✅ **Check this box** |

#### Query Parameter 2: user_email ⭐ CRITICAL

Click **"+ Add Parameter"** again

| Field | Value |
|-------|-------|
| **Parameter Name** | `user_email` |
| **Data Type** | `string` |
| **Value Type** | `Dynamic Variable` ← **⚠️ NOT LLM Prompt!** |
| **Dynamic Variable** | `user_email` ← **Type this in the field** |
| **Description** | `User email from conversation context` |
| **Required** | ✅ **Check this box** |

#### Query Parameter 3: user_id ⭐ CRITICAL

Click **"+ Add Parameter"** again

| Field | Value |
|-------|-------|
| **Parameter Name** | `user_id` |
| **Data Type** | `string` |
| **Value Type** | `Dynamic Variable` ← **⚠️ NOT LLM Prompt!** |
| **Dynamic Variable** | `user_id` ← **Type this in the field** |
| **Description** | `User ID from conversation context` |
| **Required** | ✅ **Check this box** |

#### Query Parameter 4: conversation_id

Click **"+ Add Parameter"** again

| Field | Value |
|-------|-------|
| **Parameter Name** | `conversation_id` |
| **Data Type** | `string` |
| **Value Type** | `System Provided` ← **Select from dropdown** |
| **Description** | `ElevenLabs conversation ID` |
| **Required** | ❌ Leave unchecked |

**What it should look like:**
```
Query Parameters
┌──────────────────────────────────────────────┐
│ 1. request                                    │
│    Type: string | Value: LLM Prompt          │
│    ☑ Required                                 │
├──────────────────────────────────────────────┤
│ 2. user_email                                 │
│    Type: string | Value: Dynamic Variable    │
│    Dynamic Variable: user_email               │
│    ☑ Required                                 │
├──────────────────────────────────────────────┤
│ 3. user_id                                    │
│    Type: string | Value: Dynamic Variable    │
│    Dynamic Variable: user_id                  │
│    ☑ Required                                 │
├──────────────────────────────────────────────┤
│ 4. conversation_id                            │
│    Type: string | Value: System Provided     │
│    ☐ Required                                 │
└──────────────────────────────────────────────┘
```

---

## Part 5: Configure Request Body

### Step 7: Add Body Parameters Tab

Click on the **"Body"** tab at the top of the modal.

You need to add **10 body parameters**:

#### Body Parameter 1: type ⭐ REQUIRED

Click **"+ Add Parameter"**

| Field | Value |
|-------|-------|
| **Parameter Name** | `type` |
| **Data Type** | `string` |
| **Value Type** | `LLM Prompt` |
| **Description** | `Transaction type: send_phone, buy_goods_pochi, buy_goods_till, paybill, withdraw, bank_to_mpesa, bank_to_bank` |
| **Enum Values** | ⚠️ **Click "Add enum"** and add these 7 values one by one:<br>• `send_phone`<br>• `buy_goods_pochi`<br>• `buy_goods_till`<br>• `paybill`<br>• `withdraw`<br>• `bank_to_mpesa`<br>• `bank_to_bank` |
| **Required** | ✅ **Check this box** |

#### Body Parameter 2: amount ⭐ REQUIRED

| Field | Value |
|-------|-------|
| **Parameter Name** | `amount` |
| **Data Type** | `string` |
| **Value Type** | `LLM Prompt` |
| **Description** | `Amount to send in KSH (Kenyan Shillings). Extract numeric value only.` |
| **Required** | ✅ **Check this box** |

#### Body Parameter 3: summary ⭐ REQUIRED

| Field | Value |
|-------|-------|
| **Parameter Name** | `summary` |
| **Data Type** | `string` |
| **Value Type** | `LLM Prompt` |
| **Description** | `Brief summary of the transaction request` |
| **Required** | ✅ **Check this box** |

#### Body Parameters 4-10: Optional Fields

Add these **7 optional** parameters (Required = ❌):

| # | Name | Description |
|---|------|-------------|
| 4 | `phone` | `Phone number for send_phone or buy_goods_pochi. Format: 254XXXXXXXXX or 07XXXXXXXX` |
| 5 | `till` | `Till number for buy_goods_till transactions (5-7 digits)` |
| 6 | `paybill` | `Paybill number for bill payments (5-7 digits)` |
| 7 | `account` | `Account number for paybill or bank transfers` |
| 8 | `store` | `Store number for agent withdrawals` |
| 9 | `agent` | `Agent number for cash withdrawals` |
| 10 | `bankCode` | `Bank code for bank transfers (e.g., 01 for KCB, 11 for Equity)` |

All these should have:
- **Data Type**: `string`
- **Value Type**: `LLM Prompt`
- **Required**: ❌ **Unchecked**

**Final body structure:**
```
Request Body
┌───────────────────────────────────────────┐
│ ☑ type * (enum) - Transaction type       │
│ ☑ amount * - Amount in KSH                │
│ ☑ summary * - Transaction summary         │
│ ☐ phone - Phone number                    │
│ ☐ till - Till number                      │
│ ☐ paybill - Paybill number                │
│ ☐ account - Account number                │
│ ☐ store - Store number                    │
│ ☐ agent - Agent number                    │
│ ☐ bankCode - Bank code                    │
└───────────────────────────────────────────┘
```

---

## Part 6: Configure Dynamic Variables

### Step 8: Dynamic Variables Tab

Click on the **"Dynamic variables"** tab.

This is where you tell ElevenLabs where to find `user_email` and `user_id`.

#### Add Dynamic Variable Placeholders

Click **"+ Add Variable"** twice to add:

**Variable 1:**
| Field | Value |
|-------|-------|
| **Variable Name** | `user_email` |
| **Source** | `Query Parameter` ← **Select from dropdown** |
| **Description** | `User's email address from signed URL` |

**Variable 2:**
| Field | Value |
|-------|-------|
| **Variable Name** | `user_id` |
| **Source** | `Query Parameter` ← **Select from dropdown** |
| **Description** | `User's unique ID from signed URL` |

**What it looks like:**
```
Dynamic Variables
┌────────────────────────────────────────────┐
│ These variables are extracted from the     │
│ connection URL when the session starts     │
│                                             │
│ Variable: user_email                        │
│ Source: Query Parameter                     │
│ Description: User's email from signed URL   │
│                                             │
│ Variable: user_id                           │
│ Source: Query Parameter                     │
│ Description: User's unique ID from URL      │
└────────────────────────────────────────────┘
```

---

## Part 7: Save and Test

### Step 9: Save the Tool

1. Click **"Save"** or **"Create Tool"** button at the bottom
2. You should see the tool appear in your Tools list

### Step 10: Update System Prompt

Scroll up to the **"Intelligence"** section and update your system prompt:

```
# Ongea Pesa AI Assistant - System Prompt

## Core Identity
You are **Ongea Pesa**, Kenya's fastest voice-activated M-Pesa assistant. 
You execute transactions immediately using the `send_money` tool.

## Primary Function
USE THE `send_money` tool for ALL transactions. Extract transaction 
details from user speech and execute immediately.

## Transaction Types

### 1. SEND MONEY (Tuma Pesa)
- **Triggers**: "Send money", "Tuma pesa", "Send [amount] to [phone]"
- **Action**: Use send_money with type "send_phone"

### 2. BUY GOODS - POCHI
- **Triggers**: "Buy goods", "Nunua", "Pay pochi"
- **Action**: Use send_money with type "buy_goods_pochi"

### 3. BUY GOODS - TILL
- **Triggers**: "Pay till", "Lipa till"
- **Action**: Use send_money with type "buy_goods_till"

### 4. PAY BILL
- **Triggers**: "Pay bill", "Lipa bill", "Paybill"
- **Action**: Use send_money with type "paybill"

## Execution Flow
1. User states intent
2. Extract: amount, phone/till/paybill, account (if needed)
3. IMMEDIATELY call send_money tool
4. Confirm completion

## Rules
- Be fast and efficient
- Confirm amounts verbally before sending
- Speak in English or Swahili as needed
- Keep responses under 20 words
```

---

## Part 8: Deploy Your App

### Step 11: Deploy to Vercel

```bash
# In your project directory
git add .
git commit -m "Add voice webhook and ElevenLabs integration"
git push

# Deploy
vercel --prod
```

### Step 12: Update Environment Variables in Vercel

Go to your Vercel dashboard → Your Project → Settings → Environment Variables

Add these:

```bash
# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_api_key
NEXT_PUBLIC_AGENT_ID=your_agent_id_from_elevenlabs

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# n8n (optional - already in code)
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/your-id
```

**To get your Agent ID:**
1. Go to ElevenLabs dashboard
2. Click on your agent
3. Look at the URL: `https://elevenlabs.io/app/conversational-ai/AGENT_ID_HERE`
4. Copy the ID and paste it as `NEXT_PUBLIC_AGENT_ID`

---

## Part 9: Test the Integration

### Step 13: Test Voice Commands

1. Go to your deployed app: `https://your-app.vercel.app`
2. Sign in
3. Click the microphone button
4. Wait for "Connected" status
5. Say: **"Send 100 to 0712345678"**

**Expected Flow:**
```
You: "Send 100 to 0712345678"
    ↓
Agent: "Sending 100 shillings to 0712345678..."
    ↓
[Tool Call: send_money]
    ↓
Agent: "Sent successfully!"
```

### Step 14: Check Logs

**In Vercel:**
1. Go to your project → Deployments
2. Click on the latest deployment
3. Click "Functions" tab
4. Click on `/api/voice/webhook`
5. Check logs for:
   ```
   ✅ Found user by email: ijepale@gmail.com
   💳 Debit transaction detected
   ✅ Balance sufficient
   === FORWARDING TO N8N ===
   ```

**In ElevenLabs:**
1. Go to your agent → Testing tab
2. Click on recent conversation
3. Check "Tool Calls" section
4. Verify `send_money` was called with correct parameters

---

## Common Issues & Fixes

### Issue 1: "user_email is undefined"

**Cause**: Value Type is still set to `LLM Prompt` instead of `Dynamic Variable`

**Fix**: 
1. Edit tool → Query parameters tab
2. Find `user_email` parameter
3. Change **Value Type** from `LLM Prompt` to `Dynamic Variable`
4. Fill in **Dynamic Variable** field: `user_email`
5. Save

### Issue 2: "No active voice sessions found"

**Cause**: Voice session not being created in database

**Fix**:
1. Check Supabase → `voice_sessions` table exists
2. Verify `/api/get-signed-url` is working
3. Check browser console for errors when opening voice interface

### Issue 3: "Insufficient funds" but balance is correct

**Cause**: Balance not being fetched from database

**Fix**:
1. Check Supabase → `profiles` table has `wallet_balance` column
2. Verify user has correct balance in database
3. Check `/api/balance` endpoint

### Issue 4: Tool not being called

**Cause**: System prompt doesn't mention the tool

**Fix**:
1. Update system prompt to explicitly mention `send_money` tool
2. Add examples of when to use it
3. Test in ElevenLabs testing console first

---

## Verification Checklist

Before going live, verify:

- [ ] Tool name is `send_money`
- [ ] URL points to your Vercel app: `https://YOUR-APP.vercel.app/api/voice/webhook`
- [ ] Method is `POST`
- [ ] Query parameter `user_email` uses `Dynamic Variable` type
- [ ] Query parameter `user_id` uses `Dynamic Variable` type
- [ ] Dynamic variables section has `user_email` and `user_id` defined
- [ ] Body parameters include `type`, `amount`, `summary` as required
- [ ] System prompt mentions the `send_money` tool
- [ ] Environment variables are set in Vercel
- [ ] Supabase `voice_sessions` table exists
- [ ] App is deployed and accessible

---

## Next Steps

✅ **Configuration Complete!** Your voice-activated payment system is ready.

**Test thoroughly:**
1. Try different transaction types (send, paybill, till)
2. Test with different amounts
3. Verify balance updates correctly
4. Check n8n receives complete payload

**Monitor:**
- Check Vercel logs for webhook calls
- Monitor ElevenLabs conversation history
- Review n8n execution logs
- Track transactions in database

🎉 **You're all set! Users can now make voice payments through your app.**
