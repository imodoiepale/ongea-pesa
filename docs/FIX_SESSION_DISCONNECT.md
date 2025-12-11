# Fix: ElevenLabs Session Disconnecting After First Transaction

## Problem

Your ElevenLabs voice agent is **ending the session after completing the first transaction** instead of staying connected for multiple transactions.

### Evidence from Logs
```javascript
📨 AI: 'Done, pesa imeenda! That transaction is complete.'
📊 Disconnect reason: {reason: 'agent'}  // Agent ending session
CloseEvent: code: 1000 (normal close)
```

## Root Cause

The agent's system prompt **does not instruct it to stay connected** after completing tasks. The agent thinks:
- ✅ Task complete
- ❌ Job done → Disconnect

## Solution: Update ElevenLabs System Prompt

### Step 1: Open ElevenLabs Dashboard
1. Go to https://elevenlabs.io/app/conversational-ai
2. Select your **Ongea Pesa** agent
3. Click **"Configure"** or **"Settings"**

### Step 2: Update System Prompt

Replace your current system prompt with the updated one from:
```
docs/config/elevenlabs-system-prompt-updated.md
```

**Key additions to the prompt:**

```markdown
## SESSION MANAGEMENT (CRITICAL)
**STAY CONNECTED**: After completing ANY transaction, ALWAYS remain connected 
and ready for the next command. DO NOT end the conversation unless the user 
explicitly says:
- "Goodbye" / "Bye" / "End call" / "Hang up" / "Tutaonana" / "Kwaheri"

After every successful transaction, ask: 
**"Anything else I can help with?"** or **"Another transaction?"**
```

### Step 3: Key Changes in Agent Behavior

#### ❌ OLD BEHAVIOR (Current)
```
User: "Send 35,000 to 0743854888"
AI: "Sending..."
AI: "Done, pesa imeenda! That transaction is complete."
[DISCONNECTS] ❌
```

#### ✅ NEW BEHAVIOR (After Update)
```
User: "Send 35,000 to 0743854888"
AI: "Sending..."
AI: "Done! Anything else I can help with?"
[STAYS CONNECTED] ✅
User: "Yes, pay bill 247247 account 129349"
AI: "Processing..."
AI: "Sent! Need another transaction?"
[STILL CONNECTED] ✅
User: "No, thanks"
AI: "Sawa! Karibu tena."
[STAYS CONNECTED, WAITING] ✅
User: "Goodbye"
AI: "Asante! Goodbye!"
[NOW DISCONNECTS] ✅
```

## Testing After Update

### Test 1: Multiple Transactions
1. Open voice interface
2. Say: **"Send 100 to 0712345678"**
3. Wait for: **"Done! Anything else?"**
4. Immediately say: **"Send 200 to 0787654321"**
5. ✅ Should process without reconnecting

### Test 2: Explicit Disconnect
1. Complete a transaction
2. Say: **"Goodbye"**
3. ✅ Should disconnect cleanly

### Test 3: Session Persistence
1. Complete a transaction
2. Wait 30 seconds (silence)
3. Say another command
4. ✅ Should still be connected and process

## Additional Agent Configuration Tips

### 1. Conversation Settings (Optional)
In ElevenLabs agent settings, you can also configure:

**Max Duration**: Set to `unlimited` or `60 minutes`
- Prevents timeout during long sessions

**Silence Detection**: Set to `120 seconds`
- Only disconnect after 2 minutes of complete silence

**End Call Phrases**: Add these:
- "goodbye"
- "bye"
- "end call"
- "hang up"
- "kwaheri"
- "tutaonana"

### 2. Post-Transaction Response Template

Add this to your prompt as a template:

```
After EVERY successful send_money tool call, respond with:
"[Success phrase]! [Balance update if available]. Anything else?"

Examples:
- "Sent! Your balance is 35,000. Anything else?"
- "Done! Pesa imefika. Another transaction?"
- "Tumeshinda! Balance: 70,000. Kuna kingine?"
```

## How Your Code Handles This

Your React code (`contexts/ElevenLabsContext.tsx`) is **already set up correctly**:

```typescript
onDisconnect: (reason?: any) => {
  console.log('🎙️ Global ElevenLabs disconnected');
  console.log('📊 Disconnect reason:', reason);
  // Just logs the disconnect, doesn't force it
}
```

The code **respects the agent's decision** to stay connected. It only logs disconnects but doesn't initiate them. So once you update the agent prompt, your code will work perfectly!

## Verification Checklist

After updating the prompt:

- [ ] Agent says "Anything else?" after transactions
- [ ] Can do multiple transactions without reconnecting  
- [ ] Session only ends when user says "goodbye"
- [ ] No premature disconnects
- [ ] Balance updates work between transactions
- [ ] Voice quality remains consistent throughout

## Expected Console Logs (After Fix)

### ✅ Successful Multi-Transaction Session
```
📨 ElevenLabs message: {source: 'user', message: 'Send 1000...'}
📨 ElevenLabs message: {source: 'ai', message: 'Sending...'}
🔔 Transaction changed: {...}
✅ Balance updated: {...}
📨 ElevenLabs message: {source: 'ai', message: 'Done! Anything else?'}
💰 Balance updated: 69000
[NO DISCONNECT - STILL CONNECTED]
📨 ElevenLabs message: {source: 'user', message: 'Send 2000...'}
📨 ElevenLabs message: {source: 'ai', message: 'Processing...'}
🔔 Transaction changed: {...}
📨 ElevenLabs message: {source: 'ai', message: 'Sent! Another one?'}
💰 Balance updated: 67000
[STILL CONNECTED]
```

## Summary

**Problem**: Agent disconnecting after first transaction  
**Cause**: System prompt doesn't tell agent to stay connected  
**Solution**: Update system prompt with session management instructions  
**Result**: Multi-transaction sessions without reconnecting  

**Action Required**: 
1. Copy `docs/config/elevenlabs-system-prompt-updated.md`
2. Paste into ElevenLabs agent configuration
3. Save and test

**Expected Outcome**: Agent stays connected until user says "goodbye" ✅
