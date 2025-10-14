# Voice Activation & Transaction Fees

## ✅ Implementation Complete

### 1. **Voice Activation (Siri-like)**
- Wake word: **"Hey Ongea"**
- Continuous listening in background
- Responds to natural voice commands
- Auto-deactivates after 10 seconds of inactivity

### 2. **Transaction Fees**
- **M-Pesa fees**: Official Kenya M-Pesa rates
- **Platform fee**: 0.5% Ongea Pesa commission
- Automatically calculated and spoken for every transaction

---

## 🎙️ Voice Activation Usage

### How It Works:

1. **Say**: "Hey Ongea"
2. **AI responds**: "Yes? How can I help you?"
3. **You**: "Scan paybill" or "Piga till" or "Check balance"
4. **AI**: Executes command and responds

### Supported Voice Commands:

| Command | Action |
|---------|--------|
| "Hey Ongea scan paybill" | Starts paybill scanner |
| "Hey Ongea piga till" | Starts till scanner |
| "Hey Ongea piga pochi" | Starts Pochi scanner |
| "Hey Ongea scan receipt" | Starts receipt scanner |
| "Hey Ongea check balance" | Reads your current balance |
| "Hey Ongea stop" | Cancels current scan |

### Example Conversation:

```
You: "Hey Ongea"
AI: "Yes? How can I help you?"

You: "Scan till"
AI: "Starting till scan"
[Points camera at till]

AI: "Till number detected! 832909 for SuperMart. 
     Amount KSh 1200. 
     M-Pesa fee: KSh 15. 
     Ongea Pesa platform fee: KSh 6. 
     Total cost: KSh 1221. 
     Your balance is KSh 15,000. 
     Confidence 98%. 
     Should I proceed with this payment?"

You: "Yes, proceed"
```

---

## 💰 Transaction Fees Breakdown

### M-Pesa Fees (Official Rates):

| Amount Range | M-Pesa Fee |
|--------------|------------|
| KSh 1 - 100 | KSh 0 |
| KSh 101 - 500 | KSh 5 |
| KSh 501 - 1,000 | KSh 10 |
| KSh 1,001 - 1,500 | KSh 15 |
| KSh 1,501 - 2,500 | KSh 20 |
| KSh 2,501 - 3,500 | KSh 25 |
| KSh 3,501 - 5,000 | KSh 30 |
| KSh 5,001 - 7,500 | KSh 35 |
| KSh 7,501 - 10,000 | KSh 40 |
| KSh 10,001 - 15,000 | KSh 45 |
| KSh 15,001 - 20,000 | KSh 50 |
| KSh 20,001 - 35,000 | KSh 60 |
| KSh 35,001 - 50,000 | KSh 70 |
| Above KSh 50,000 | KSh 105 |

### Ongea Pesa Platform Fee:

- **Rate**: 0.5% of transaction amount
- **Formula**: `amount × 0.005`
- **Rounded**: To nearest shilling

### Example Calculations:

#### Example 1: KSh 1,200
- Amount: **KSh 1,200**
- M-Pesa fee: **KSh 15**
- Platform fee: **KSh 6** (1200 × 0.005)
- **Total debit: KSh 1,221**

#### Example 2: KSh 5,000
- Amount: **KSh 5,000**
- M-Pesa fee: **KSh 30**
- Platform fee: **KSh 25** (5000 × 0.005)
- **Total debit: KSh 5,055**

#### Example 3: KSh 10,000
- Amount: **KSh 10,000**
- M-Pesa fee: **KSh 40**
- Platform fee: **KSh 50** (10000 × 0.005)
- **Total debit: KSh 10,090**

---

## 🎯 Voice Message Examples

### With Amount (Fees Included):

```
"Till number detected! 832909 for SuperMart. 
Amount KSh 1200. 
M-Pesa fee: KSh 15. 
Ongea Pesa platform fee: KSh 6. 
Total cost: KSh 1,221. 
Your balance is KSh 15,000. 
Confidence 98%. 
Should I proceed with this payment?"
```

### Without Amount:

```
"Paybill detected! Number 247247, Account 123456. 
No amount specified. 
Your current balance is KSh 15,000. 
Confidence 95%. 
Would you like to proceed with this payment?"
```

---

## 🔧 Technical Implementation

### Files Created:

#### 1. `hooks/use-voice-activation.ts`
- Web Speech API integration
- Wake word detection
- Continuous listening mode
- Command parsing and routing

#### 2. `lib/transaction-fees.ts`
- M-Pesa fee calculator
- Platform fee (0.5%) calculator
- Balance sufficiency checker
- Fee formatting utilities

#### 3. Updated: `app/api/voice/send-scan-data/route.ts`
- Calculates fees when amount detected
- Includes fees in voice message
- Returns fee breakdown to frontend

#### 4. Updated: `components/ongea-pesa/payment-scanner.tsx`
- Integrated voice activation hook
- Voice command handler
- Automatic voice responses

---

## 🎤 Voice Activation Hook API

```typescript
const voice = useVoiceActivation({
  wakeWord: 'hey ongea',          // Trigger phrase
  continuous: true,               // Keep listening
  language: 'en-US',              // Recognition language
  onActivate: () => {},           // Called when activated
  onDeactivate: () => {},         // Called when deactivated
  onCommand: (command) => {},     // Called with recognized command
  onError: (error) => {}          // Called on error
})

// Returns:
voice.isListening      // Boolean: mic is active
voice.isActive         // Boolean: wake word detected
voice.transcript       // String: final transcript
voice.interimTranscript // String: interim results
voice.startListening() // Function: start mic
voice.stopListening()  // Function: stop mic
voice.manualActivate() // Function: activate without wake word
```

---

## 💳 Transaction Fees Library API

```typescript
import { 
  calculateTransactionFees,
  getMpesaFee,
  getPlatformFee,
  hasSufficientBalance
} from '@/lib/transaction-fees'

// Calculate all fees
const fees = calculateTransactionFees(1200)
// Returns: { 
//   amount: 1200,
//   mpesaFee: 15,
//   platformFee: 6,
//   totalFee: 21,
//   totalDebit: 1221
// }

// Get M-Pesa fee only
const mpesaFee = getMpesaFee(1200) // 15

// Get platform fee only
const platformFee = getPlatformFee(1200) // 6

// Check if balance is sufficient
const check = hasSufficientBalance(15000, 1200)
// Returns: { sufficient: true, shortfall: 0 }
```

---

## 🧪 Testing

### Test Voice Activation:

1. Open scanner
2. Say: "Hey Ongea"
3. Listen for: "Yes? How can I help you?"
4. Say: "Scan till"
5. Verify: Scanner starts

### Test Fee Calculation:

1. Scan document with amount (e.g., KSh 1,200)
2. Listen for voice message
3. Verify fees mentioned:
   - M-Pesa fee: KSh 15
   - Platform fee: KSh 6
   - Total: KSh 1,221

### Test Commands:

- ✅ "Hey Ongea check balance"
- ✅ "Hey Ongea piga paybill"
- ✅ "Hey Ongea scan till"
- ✅ "Hey Ongea piga pochi"
- ✅ "Hey Ongea stop"

---

## 🔊 Browser Compatibility

### Web Speech API Support:

- ✅ Chrome/Edge (Full support)
- ✅ Safari (Full support)
- ⚠️ Firefox (Limited support)
- ❌ Internet Explorer (Not supported)

### Fallback:

If Web Speech API not available:
- Voice activation disabled
- Manual button scanning still works
- Visual indicators shown

---

## 🎛️ Configuration

### Change Wake Word:

```typescript
const voice = useVoiceActivation({
  wakeWord: 'hey assistant',  // Change to any phrase
  // ... other options
})
```

### Change Platform Fee:

Edit `lib/transaction-fees.ts`:

```typescript
const PLATFORM_COMMISSION_RATE = 0.01 // Change to 1%
```

### Adjust Auto-deactivate Timeout:

Edit `hooks/use-voice-activation.ts`:

```typescript
setTimeout(() => {
  setIsActive(false)
  onDeactivate?.()
}, 15000) // Change to 15 seconds
```

---

## 📊 Fee Revenue Model

### Platform Earnings Example:

Daily volume: KSh 1,000,000  
Platform fee (0.5%): **KSh 5,000/day**

Monthly: **KSh 150,000**  
Yearly: **KSh 1,800,000**

### User Cost Example:

For KSh 10,000 transaction:
- M-Pesa fee: KSh 40 (0.4%)
- Ongea Pesa: KSh 50 (0.5%)
- **Total fee: KSh 90 (0.9%)**

---

## 🚀 Benefits

### For Users:
- **Hands-free**: Speak to control scanner
- **Transparent**: All fees shown upfront
- **Fast**: No manual entry needed
- **Accurate**: AI extracts payment details

### For Platform:
- **Revenue**: 0.5% commission on all transactions
- **Competitive**: M-Pesa charges more
- **Scalable**: Automatic fee calculation
- **Compliant**: All fees disclosed

---

## 🔒 Security

- ✅ Fees calculated server-side (cannot be tampered)
- ✅ Voice commands validated before execution
- ✅ Balance checked before allowing payment
- ✅ All transactions logged with fees

---

**Voice activation and fee system fully implemented!** 🎉
