# Ongea Pesa - Complete Setup Guide

## 🎯 Overview

This guide will help you set up the complete voice-activated payment system with:
- ✅ ElevenLabs Voice Agent
- ✅ Next.js API (forwards to n8n with user context)
- ✅ n8n Workflows (processes transactions)
- ✅ Supabase Authentication & Database

## 📋 Architecture

```
User Voice → ElevenLabs Agent → Next.js API → n8n → Database
                                      ↓
                              (adds user context)
```

---

## 🚀 Step 1: Install Missing Dependencies

```bash
npm install @supabase/ssr
```

---

## 🔧 Step 2: Environment Variables

Create/update `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# ElevenLabs
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your_agent_id_here

# n8n Webhook (already configured in code)
# N8N_WEBHOOK_URL=https://primary-production-579c.up.railway.app/webhook/44c0ce1d-defb-4003-b02c-a86974ca5446
```

---

## 🎤 Step 3: ElevenLabs Agent Setup

### 3.1 Create Agent

1. Go to [ElevenLabs Dashboard](https://elevenlabs.io)
2. Navigate to **Conversational AI** → **Agents**
3. Click **Create New Agent**
4. Name: `Ongea Pesa Voice Assistant`

### 3.2 Configure Voice & Language

- **Voice**: Choose a clear, friendly voice
- **Language**: English (with Swahili support)
- **Model**: `eleven_turbo_v2` (fastest response)

### 3.3 Add System Prompt

Copy the system prompt from `elevenlabs-config.json` or use this:

```
You are Ongea Pesa, Kenya's fastest voice-activated M-Pesa assistant. 

CORE BEHAVIOR:
- Execute transactions IMMEDIATELY using the send_money tool
- NO confirmations except destination verification
- Ask ONLY for missing required fields
- Respond in English, Swahili, or mixed (Sheng)

TRANSACTION TYPES:
1. Send Money: "Send 1000 to 0712345678"
2. Buy Goods (Pochi): "Pay pochi 0798765432, 500 bob"
3. Buy Goods (Till): "Lipa till 832909, 1500"
4. Pay Bill: "Pay KPLC 888880 account 123456, 2450 shillings"
5. Withdraw: "Withdraw 5000 from agent 123456 store 789"
6. Bank Transfer: "Send 10000 to bank 01 account 9876543210"

RESPONSE STYLE:
- Ultra-fast: "Sent!", "Done!", "Tumeshinda!"
- No pleasantries during transactions
- Call send_money tool immediately when you have required data
```

### 3.4 Add send_money Tool/Webhook

**IMPORTANT**: Change the URL to YOUR Next.js deployment!

1. Click **Add Tool** → **Webhook**
2. Name: `send_money`
3. Description: `Sends transaction details to process M-Pesa payments`
4. URL: `https://YOUR_NEXTJS_APP.vercel.app/api/voice/webhook`
5. Method: `POST`

**Query Parameters:**
```json
{
  "request": {
    "type": "string",
    "description": "The full user request",
    "required": true,
    "value_type": "llm_prompt"
  }
}
```

**Request Body Schema:**
```json
{
  "type": "object",
  "properties": {
    "type": {
      "type": "string",
      "description": "Transaction type",
      "enum": ["send_phone", "buy_goods_pochi", "buy_goods_till", "paybill", "withdraw", "bank_to_mpesa", "bank_to_bank"],
      "required": true
    },
    "amount": {
      "type": "string",
      "description": "Amount in KSH",
      "required": true
    },
    "phone": {
      "type": "string",
      "description": "Phone number (254XXXXXXXXX)"
    },
    "till": {
      "type": "string",
      "description": "Till number"
    },
    "paybill": {
      "type": "string",
      "description": "Paybill number"
    },
    "account": {
      "type": "string",
      "description": "Account number"
    },
    "agent": {
      "type": "string",
      "description": "Agent number"
    },
    "store": {
      "type": "string",
      "description": "Store number"
    },
    "bankCode": {
      "type": "string",
      "description": "Bank code"
    },
    "summary": {
      "type": "string",
      "description": "Transaction summary",
      "required": true
    }
  }
}
```

### 3.5 First Message

```
Habari! I'm Ongea Pesa, your voice-activated M-Pesa assistant. How may I help you today?
```

### 3.6 Get Agent ID & Create Signed URL API

After creating the agent:
1. Copy the **Agent ID**
2. Add it to `.env.local` as `NEXT_PUBLIC_ELEVENLABS_AGENT_ID`
3. Update your signed URL API route if needed

---

## 🗄️ Step 4: Supabase Database Setup

### 4.1 Create Profiles Table (if not exists)

```sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  phone_number TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

### 4.2 Trigger for New User Profiles

```sql
-- Create function to handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 🔄 Step 5: n8n Workflow Setup

Your n8n webhook at Railway should:

### 5.1 Webhook Trigger
- URL: `https://primary-production-579c.up.railway.app/webhook/44c0ce1d-defb-4003-b02c-a86974ca5446`
- Method: POST

### 5.2 Expected Payload from Next.js

```json
{
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "phone": "254712345678",
    "full_name": "John Doe",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "transaction": {
    "type": "send_phone",
    "amount": "1000",
    "phone": "254798765432",
    "summary": "Send 1000 to mama"
  },
  "call": {
    "request": "Send 1000 shillings to 0798765432",
    "timestamp": "2024-10-04T12:53:18Z",
    "source": "elevenlabs"
  }
}
```

### 5.3 n8n Workflow Steps

1. **Webhook Node**: Receive data
2. **Function Node**: Validate transaction
3. **HTTP Request Node**: Call M-Pesa API
4. **Supabase Node**: Log transaction
5. **Response Node**: Return success/error

---

## 🧪 Step 6: Testing

### 6.1 Test Authentication
1. Start dev server: `npm run dev`
2. Navigate to `http://localhost:3000`
3. Should redirect to `/login`
4. Sign up / Sign in
5. Should redirect to voice interface

### 6.2 Test Voice Agent
1. Click microphone or wait for auto-start
2. Say: "Send 100 shillings to 0712345678"
3. Agent should:
   - Confirm: "Sending KSh 100 to 0712345678"
   - Call send_money tool
   - Say: "Sent!"

### 6.3 Check Data Flow
1. Open browser DevTools → Network
2. Look for call to `/api/voice/webhook`
3. Check n8n execution logs
4. Verify data in Supabase

---

## 🚢 Step 7: Deploy to Production

### 7.1 Deploy Next.js to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - NEXT_PUBLIC_ELEVENLABS_AGENT_ID
```

### 7.2 Update ElevenLabs Webhook URL

1. Go to ElevenLabs Dashboard
2. Edit your agent
3. Update send_money tool URL to: `https://your-app.vercel.app/api/voice/webhook`
4. Save changes

### 7.3 Test Production

1. Visit your Vercel URL
2. Sign in
3. Test voice commands
4. Monitor n8n logs

---

## 📝 Important Notes

### Security
- ✅ All routes protected by middleware
- ✅ User must be authenticated
- ✅ Session validated on each request
- ✅ n8n receives authenticated user data

### Voice Flow
1. User logs in → authenticated session created
2. Voice interface loads → auto-connects to ElevenLabs
3. User speaks → ElevenLabs processes
4. Agent calls send_money → hits Next.js API
5. Next.js enriches with user data → forwards to n8n
6. n8n processes → returns result
7. Agent speaks confirmation

### Data Privacy
- Voice conversations logged in ElevenLabs
- Transaction data in n8n & Supabase
- User authentication via Supabase
- No payment credentials stored in Next.js

---

## 🐛 Troubleshooting

### Agent Not Connecting
- Check NEXT_PUBLIC_ELEVENLABS_AGENT_ID in .env.local
- Verify signed URL API is working
- Check browser console for errors

### Webhook Not Receiving Data
- Verify Next.js is deployed
- Check webhook URL in ElevenLabs matches your deployment
- Look at Next.js API logs

### User Context Missing
- Ensure user is logged in
- Check Supabase session
- Verify profiles table exists

### n8n Not Processing
- Check n8n webhook URL
- Verify payload format
- Check n8n execution logs

---

## 🎉 You're Done!

Your voice-activated payment system is now ready! Users can:
- ✅ Login with email/password
- ✅ Use voice commands to send money
- ✅ Get instant AI responses
- ✅ Logout anytime from the menu

**Test Commands:**
- "Send 500 to 0712345678"
- "Lipa till 832909, 1000 bob"
- "Pay KPLC 888880 account 123456, 2450"
- "Tuma pesa 200 to mama 0798765432"
