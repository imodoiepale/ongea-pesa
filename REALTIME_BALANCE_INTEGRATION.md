# 💰 Real-Time Balance Integration with ElevenLabs

## ✅ What's Implemented

Your ElevenLabs AI now has **real-time access** to the user's balance at all times - whether using:
1. **Scanner with voice** - Scan and talk
2. **Scanner alone with UI** - Scan, enter amount, send
3. **Voice conversation** - Talk to initiate camera scan

---

## 🔴 How It Works

### Real-Time Balance Tracking

```typescript
// In ElevenLabsContext.tsx
useEffect(() => {
  // Fetch balance immediately
  fetchBalance();
  
  // Update every 10 seconds
  const interval = setInterval(fetchBalance, 10000);
  
  return () => clearInterval(interval);
}, [userId, isConnected]);
```

### What Happens:
1. **On connection** - Balance fetched immediately
2. **Every 10 seconds** - Balance refreshed automatically
3. **On transaction** - Balance updates within 10 seconds
4. **Always available** - AI can access current balance anytime

---

## 🎯 Three Usage Scenarios

### 1️⃣ Scanner with Voice

**Flow:**
```
1. Open scanner
2. Scan payment document
3. AI speaks: "Till 832909 detected, amount 1,200..."
4. You say: "Hey Ongea, do I have enough?"
5. AI: "Yes, your balance is 15,000 shillings, enough for 1,200"
6. You: "Pay it"
7. AI: "Processing payment..."
```

**What AI Knows:**
- ✅ Current balance (real-time)
- ✅ Scanned payment details
- ✅ Amount to be paid
- ✅ Fees involved

---

### 2️⃣ Scanner Alone with UI

**Flow:**
```
1. Open scanner
2. Scan till number
3. Enter amount manually in UI
4. Click "Proceed to Pay"
5. System checks balance
6. Payment processed
```

**What Happens:**
- Scanner extracts till/paybill
- You enter amount in UI
- Balance checked before payment
- Transaction processed if sufficient

---

### 3️⃣ Voice Conversation → Camera Scan

**Flow:**
```
1. You: "Hey Ongea, I want to pay a bill"
2. AI: "Sure, please scan the bill with your camera"
3. [You open scanner via voice command]
4. [Scan paybill]
5. AI: "Paybill 888880 detected, account 123456..."
6. You: "Can I afford it?"
7. AI: "Your balance is 15,000 shillings, the bill is 2,500..."
8. You: "Pay it"
9. AI: "Processing payment now..."
```

**What AI Knows:**
- ✅ Balance before scan
- ✅ Balance after scan
- ✅ Scanned payment details
- ✅ Can compare and advise

---

## 💬 Natural Conversations

### Balance Queries

**You**: "What's my balance?"
**AI**: "Your current balance is 15,000 shillings."

**You**: "Can I afford this?"
**AI**: "Yes, the payment is 1,200 shillings and your balance is 15,000 shillings."

**You**: "How much will I have left?"
**AI**: "After paying 1,200 shillings plus 15 shillings in fees, you'll have 13,785 shillings remaining."

### During Scanning

**You**: *[Scans till]*
**AI**: "Till 832909 detected, amount 1,200 shillings. Your balance is 15,000 shillings."

**You**: "Is that enough?"
**AI**: "Yes, you have more than enough. Would you like to proceed?"

### Multiple Payments

**You**: *[Scans first bill]*
**AI**: "Paybill 888880, amount 2,500 shillings..."

**You**: *[Scans second bill]*
**AI**: "Paybill 247247, amount 1,800 shillings..."

**You**: "Can I pay both?"
**AI**: "Both payments total 4,300 shillings. Your balance is 15,000 shillings, so yes, you can pay both."

---

## 🔄 Balance Updates

### Automatic Refresh
- **Every 10 seconds** - Balance checked
- **After transactions** - Updates within 10 seconds
- **Real-time** - No manual refresh needed

### Console Logs
```
💰 Balance updated for ElevenLabs context: 15000
💰 Balance updated for ElevenLabs context: 13785 (after payment)
```

---

## 🎨 UI Integration

### Scanner Shows Balance
- Balance badge at top
- Updates in real-time
- Color-coded (green = sufficient, red = insufficient)

### Voice Interface Shows Balance
- Balance visible during conversation
- Updates as you talk
- AI references it naturally

---

## 📊 Data Flow

### Scanner → Voice
```
1. Scan document
   ↓
2. Extract payment details
   ↓
3. Format message with balance
   ↓
4. Send to /api/voice/send-scan-data
   ↓
5. API returns formatted message
   ↓
6. Speak message (includes balance)
   ↓
7. ElevenLabs has context
```

### Voice → Scanner
```
1. You: "Scan a bill"
   ↓
2. AI: "Opening scanner..."
   ↓
3. Scanner opens
   ↓
4. Balance already loaded
   ↓
5. Scan document
   ↓
6. AI responds with balance context
```

---

## 🔧 Technical Details

### Balance Tracking in Context
```typescript
// ElevenLabsContext.tsx
const [userBalance, setUserBalance] = useState<number>(0);

useEffect(() => {
  const fetchBalance = async () => {
    const response = await fetch('/api/balance');
    const data = await response.json();
    setUserBalance(data.balance || 0);
    console.log('💰 Balance updated:', data.balance);
  };
  
  fetchBalance();
  const interval = setInterval(fetchBalance, 10000);
  return () => clearInterval(interval);
}, [userId, isConnected]);
```

### Balance in Scanner
```typescript
// payment-scanner.tsx
const [balance, setBalance] = useState<number>(0);

useEffect(() => {
  const fetchBalance = async () => {
    const response = await fetch('/api/balance');
    const data = await response.json();
    setBalance(data.balance || 0);
  };
  fetchBalance();
}, []);
```

### Balance in API Response
```typescript
// /api/voice/send-scan-data
return NextResponse.json({
  success: true,
  message: `Till detected! ... Your balance is KSh ${balance}...`,
  scanData: {
    balance: userBalance,
    // ... other scan data
  }
});
```

---

## 🧪 Testing

### Test 1: Balance Query
1. Connect to ElevenLabs
2. Say: "What's my balance?"
3. AI should respond with exact balance

### Test 2: Scan + Balance Check
1. Scan a payment document
2. Say: "Can I afford this?"
3. AI should compare amount vs balance

### Test 3: Real-Time Update
1. Note current balance
2. Make a payment
3. Wait 10 seconds
4. Ask: "What's my balance?"
5. Should show updated balance

### Test 4: Multiple Scans
1. Scan first document
2. Scan second document
3. Say: "Can I pay both?"
4. AI should calculate total vs balance

---

## 📋 Console Logs to Watch

### Balance Updates
```
💰 Balance updated for ElevenLabs context: 15000
💰 Initial balance available for ElevenLabs: 15000
```

### Scan with Balance
```
📡 Sending scan data to voice AI in REAL-TIME
✅ Scan data formatted: Till detected! ... Your balance is KSh 15,000...
🔴 LIVE: Sending to ElevenLabs conversation context
✅ REAL-TIME: Scan data available - ElevenLabs can access via session context
```

---

## 💡 Pro Tips

### 1. **Always Connect First**
- Make sure ElevenLabs is connected
- Look for purple "ElevenLabs AI Active" indicator
- Balance tracking starts on connection

### 2. **Ask Natural Questions**
- "Can I afford this?"
- "How much will I have left?"
- "Is my balance enough?"
- AI understands context

### 3. **Multiple Scenarios**
- Scan multiple documents
- AI tracks all of them
- Can calculate totals

### 4. **Real-Time Awareness**
- Balance updates every 10 seconds
- AI always has latest balance
- No need to refresh manually

---

## 🚨 Troubleshooting

### AI Doesn't Know Balance?

**Check:**
1. Is ElevenLabs connected?
2. Is `/api/balance` endpoint working?
3. Check console for balance logs

**Fix:**
- Reconnect ElevenLabs
- Refresh page
- Check API endpoint

### Balance Not Updating?

**Check:**
1. Is the 10-second interval running?
2. Are transactions completing?
3. Check console logs

**Fix:**
- Wait 10 seconds after transaction
- Check `/api/balance` response
- Verify database updates

### Scanner Shows Wrong Balance?

**Check:**
1. Is scanner fetching balance on mount?
2. Is balance state updating?
3. Check console logs

**Fix:**
- Reload scanner
- Check `/api/balance` endpoint
- Verify user ID is correct

---

## 🎉 Benefits

### For Users:
- ✅ Always know their balance
- ✅ AI warns about insufficient funds
- ✅ Can ask balance questions anytime
- ✅ No manual balance checks needed

### For AI:
- ✅ Real-time balance data
- ✅ Can advise on affordability
- ✅ Prevents failed transactions
- ✅ Better user experience

### For System:
- ✅ No database overhead
- ✅ Simple API calls
- ✅ 10-second refresh is efficient
- ✅ Works across all interfaces

---

## 📝 Summary

Your ElevenLabs AI now has **constant, real-time access** to the user's balance:

1. **Balance tracked every 10 seconds** in ElevenLabsContext
2. **Scanner includes balance** in all scan messages
3. **Voice interface** can answer balance questions
4. **Works in all scenarios** - scanner, voice, or both

**The AI always knows your balance - just ask!** 💰🎙️
