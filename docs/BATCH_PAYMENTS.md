# 📦 Batch Payments Feature

## Overview

The Batch Payments feature allows users to scan multiple payment documents (bills, till numbers, paybills, etc.) and pay them all at once with a single confirmation.

---

## ✨ Key Features

### 1. Multi-Document Scanning
- Scan unlimited payment documents
- Each scan automatically added to batch queue
- Real-time counter shows queued payments
- Visual list of all scanned payments

### 2. Smart Balance Checking
- Calculates total amount across all payments
- Compares against current balance
- Shows insufficient balance warnings
- Prevents payment if balance too low

### 3. Batch Summary View
- Detailed list of all queued payments
- Total amount calculation
- Balance comparison
- Individual payment removal
- One-click "Pay All" button

### 4. Voice Integration
- Voice command: "Enable batch mode"
- Voice feedback: "Payment added to batch. Total: X payments"
- Voice confirmation: "All X payments processed successfully!"

---

## 🎯 How to Use

### Method 1: UI-Based Batch Payment

#### Step 1: Enable Batch Mode
1. Open Payment Scanner
2. Click "📦 Batch OFF" button in top-right
3. Button changes to "📦 Batch ON" (blue)
4. Audio feedback: "Batch mode enabled. Scan multiple payments."

#### Step 2: Scan Multiple Documents
1. Point camera at first payment document
2. Wait for AI detection
3. Click "Add to Batch" button
4. Audio feedback: "Payment added to batch. Total: 1 payment"
5. Camera automatically continues scanning
6. Repeat for all documents

#### Step 3: Review Batch Summary
1. After scanning all documents, click "Pay All (X)" button
2. Batch Summary screen appears showing:
   - List of all scanned payments
   - Total amount
   - Your current balance
   - Affordability check

#### Step 4: Confirm and Pay
1. Review all payments in the list
2. Remove any unwanted payments (click X)
3. Verify total amount
4. Click "Pay All (KSh X,XXX)" button
5. All payments processed simultaneously
6. Balance updated automatically

---

### Method 2: Voice-Activated Batch Payment

#### Voice Commands:
```
"Hey Ongea, enable batch mode"
→ Batch mode activated

[Scan first document]
"Add to batch"
→ Payment 1 added

[Scan second document]
"Add to batch"
→ Payment 2 added

[Scan third document]
"Add to batch"
→ Payment 3 added

"Pay all"
→ Shows batch summary

"Confirm"
→ Processes all payments
```

---

## 💡 Use Cases

### 1. Monthly Bills
**Scenario**: Pay all monthly bills at once

**Example**:
- Scan KPLC bill (KSh 2,500)
- Scan Water bill (KSh 800)
- Scan Rent paybill (KSh 25,000)
- Scan Internet bill (KSh 3,000)
- **Total**: KSh 31,300
- **Pay all with one click**

---

### 2. Shopping Spree
**Scenario**: Pay multiple merchants after shopping

**Example**:
- Scan SuperMart till (KSh 3,450)
- Scan Pharmacy till (KSh 850)
- Scan Restaurant till (KSh 1,200)
- Scan Fuel station till (KSh 5,000)
- **Total**: KSh 10,500
- **Pay all at once**

---

### 3. Group Expenses
**Scenario**: Pay multiple people back

**Example**:
- Scan John's Pochi (KSh 500)
- Scan Mary's till (KSh 1,000)
- Scan Peter's paybill (KSh 750)
- **Total**: KSh 2,250
- **Settle all debts together**

---

### 4. Business Payments
**Scenario**: Pay suppliers and vendors

**Example**:
- Scan Supplier A invoice (KSh 15,000)
- Scan Supplier B invoice (KSh 8,500)
- Scan Utility bills (KSh 4,200)
- Scan Staff payments (KSh 12,000)
- **Total**: KSh 39,700
- **Process all business payments**

---

## 🎨 UI Components

### Batch Mode Toggle Button
```tsx
Location: Top-right of scanner screen
States:
  - OFF: Gray outline, "📦 Batch OFF"
  - ON: Blue solid, "📦 Batch ON"
```

### Batch Indicator
```tsx
Location: Below scan result card
Display: "📦 Batch Mode: X payment(s) queued"
Color: Blue background
```

### Scan Result Buttons (Batch Mode)
```tsx
Primary: "Add to Batch" (Blue)
Secondary: "Pay All (X)" (Green)
```

### Batch Summary Card
```tsx
Header: "📦 Batch Payment Summary"
Badge: "X Payments"
Content:
  - Scrollable payment list
  - Remove button (X) for each
  - Total amount (large, bold)
  - Balance comparison
  - Insufficient funds warning (if applicable)
Buttons:
  - "Pay All (KSh X,XXX)" (Green, disabled if insufficient)
  - "Back to Scan" (Outline)
```

---

## 🔧 Technical Implementation

### State Management
```typescript
const [batchMode, setBatchMode] = useState(false)
const [scannedPayments, setScannedPayments] = useState<PaymentScanResult[]>([])
const [showBatchSummary, setShowBatchSummary] = useState(false)
```

### Key Functions

#### Toggle Batch Mode
```typescript
const toggleBatchMode = () => {
  setBatchMode(!batchMode)
  if (!batchMode) {
    speakText('Batch mode enabled. Scan multiple payments.')
  } else {
    speakText('Batch mode disabled.')
    setScannedPayments([])
    setShowBatchSummary(false)
  }
}
```

#### Add to Batch
```typescript
const handleAddToBatch = () => {
  if (scanResult) {
    setScannedPayments(prev => [...prev, scanResult])
    setScanResult(null)
    speakText(`Payment added to batch. Total: ${scannedPayments.length + 1} payments`)
    handleScan(null) // Continue scanning
  }
}
```

#### Remove from Batch
```typescript
const handleRemoveFromBatch = (index: number) => {
  setScannedPayments(prev => prev.filter((_, i) => i !== index))
  speakText(`Payment removed. ${scannedPayments.length - 1} payments remaining`)
}
```

#### Pay All Batch
```typescript
const handlePayAllBatch = async () => {
  // Calculate total
  const totalAmount = scannedPayments.reduce((sum, payment) => {
    const amount = parseFloat(payment.data.amount?.replace(/[^0-9.]/g, '') || '0')
    return sum + amount
  }, 0)

  // Check balance
  if (balance < totalAmount) {
    // Show error
    return
  }

  // Process batch
  const response = await fetch('/api/payments/batch', {
    method: 'POST',
    body: JSON.stringify({ payments: scannedPayments, totalAmount, balance })
  })

  // Handle response
}
```

---

## 📊 API Endpoint

### POST /api/payments/batch

**Request**:
```json
{
  "payments": [
    {
      "type": "paybill",
      "data": {
        "paybill": "888880",
        "account": "123456",
        "amount": "KSh 2,500"
      },
      "confidence": 95
    },
    {
      "type": "buy_goods_till",
      "data": {
        "till": "832909",
        "merchant": "SuperMart",
        "amount": "KSh 1,200"
      },
      "confidence": 98
    }
  ],
  "totalAmount": 3700,
  "balance": 15000
}
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "Processed 2 of 2 payments",
  "successCount": 2,
  "failCount": 0,
  "results": [
    {
      "type": "paybill",
      "success": true,
      "transaction_id": "txn_abc123"
    },
    {
      "type": "buy_goods_till",
      "success": true,
      "transaction_id": "txn_def456"
    }
  ],
  "newBalance": 11300
}
```

**Response (Insufficient Balance)**:
```json
{
  "error": "Insufficient balance",
  "message": "Need KSh 5,000 more",
  "success": false
}
```

---

## ⚠️ Edge Cases Handled

### 1. Insufficient Balance
**Scenario**: Total amount exceeds balance

**Handling**:
- Calculate total before processing
- Show warning in batch summary
- Disable "Pay All" button
- Display shortfall amount
- Suggest adding funds

### 2. Partial Failures
**Scenario**: Some payments succeed, others fail

**Handling**:
- Process each payment individually
- Track success/failure count
- Return detailed results
- Only deduct successful amounts from balance
- Show which payments failed

### 3. Duplicate Payments
**Scenario**: User scans same document twice

**Handling**:
- Allow duplicates (user might want to pay twice)
- Show all in batch summary
- User can remove duplicates manually

### 4. Mixed Payment Types
**Scenario**: Paybills, tills, QR codes in same batch

**Handling**:
- Support all payment types in one batch
- Display type-specific information
- Process each according to its type

### 5. Empty Batch
**Scenario**: User tries to pay with no scanned payments

**Handling**:
- Disable "Pay All" button when empty
- Show message: "No payments in batch"
- Prevent API call

---

## 🧪 Testing Scenarios

### Test Case 1: Basic Batch Payment
1. Enable batch mode
2. Scan 3 different bills
3. Verify all 3 appear in batch
4. Click "Pay All"
5. Verify all 3 processed
6. Verify balance updated correctly

**Expected**: ✅ All payments successful

---

### Test Case 2: Insufficient Balance
1. Enable batch mode
2. Scan bills totaling more than balance
3. Click "Pay All"
4. Verify warning shown
5. Verify "Pay All" button disabled

**Expected**: ✅ Payment blocked, warning displayed

---

### Test Case 3: Remove from Batch
1. Enable batch mode
2. Scan 5 bills
3. Remove 2 bills from batch
4. Verify only 3 remain
5. Pay remaining 3

**Expected**: ✅ Only 3 payments processed

---

### Test Case 4: Disable Batch Mode
1. Enable batch mode
2. Scan 2 bills
3. Disable batch mode
4. Verify batch cleared

**Expected**: ✅ Batch mode off, queue empty

---

### Test Case 5: Voice Commands
1. Say "Enable batch mode"
2. Scan bill
3. Say "Add to batch"
4. Scan another bill
5. Say "Add to batch"
6. Say "Pay all"

**Expected**: ✅ Voice commands work, payments processed

---

## 📈 Benefits

### For Users
- ✅ **Save Time**: Pay multiple bills in one go
- ✅ **Convenience**: No need to process each payment separately
- ✅ **Overview**: See all payments before confirming
- ✅ **Control**: Remove unwanted payments easily
- ✅ **Safety**: Balance check before processing

### For Business
- ✅ **Efficiency**: Bulk payment processing
- ✅ **Accuracy**: Review all before paying
- ✅ **Record Keeping**: Single batch transaction record
- ✅ **Cash Flow**: Better planning with batch totals

---

## 🚀 Future Enhancements

### Phase 1 (Q1 2025)
- [ ] Batch payment scheduling
- [ ] Save batch templates
- [ ] Recurring batch payments
- [ ] Batch payment history

### Phase 2 (Q2 2025)
- [ ] Split batch across multiple accounts
- [ ] Batch payment priorities
- [ ] Partial batch processing
- [ ] Batch payment analytics

### Phase 3 (Q3 2025)
- [ ] AI-suggested batches
- [ ] Auto-batch similar payments
- [ ] Batch payment reminders
- [ ] Batch optimization (minimize fees)

---

## 💰 Fee Calculation

### Individual Fees
Each payment in batch has its own M-Pesa fee:
- Payment 1: KSh 2,500 → Fee: KSh 20
- Payment 2: KSh 1,200 → Fee: KSh 15
- Payment 3: KSh 800 → Fee: KSh 10
- **Total Fees**: KSh 45

### Platform Fee
0.5% of total amount:
- Total: KSh 4,500
- Platform Fee: KSh 22.50
- **Grand Total**: KSh 4,567.50

---

## 🔐 Security

### Batch Payment Security
- ✅ User authentication required
- ✅ Balance verification before processing
- ✅ Transaction logging for each payment
- ✅ Atomic operations (all or nothing option planned)
- ✅ Audit trail for batch payments

---

## 📝 User Guide

### Quick Start
1. **Enable**: Click "📦 Batch OFF" button
2. **Scan**: Point at multiple payment documents
3. **Add**: Click "Add to Batch" after each scan
4. **Review**: Click "Pay All (X)" to see summary
5. **Confirm**: Click "Pay All (KSh X,XXX)" to process

### Tips
- 💡 Scan all documents before reviewing
- 💡 Check total amount matches expectations
- 💡 Remove duplicates if accidentally scanned
- 💡 Ensure sufficient balance before confirming
- 💡 Use voice commands for hands-free operation

---

## 🐛 Troubleshooting

### Issue: Batch mode won't enable
**Solution**: Refresh page, ensure scanner is initialized

### Issue: "Add to Batch" button not appearing
**Solution**: Verify batch mode is ON (blue button)

### Issue: Can't remove payment from batch
**Solution**: Click X button on the right side of payment card

### Issue: "Pay All" button disabled
**Solution**: Check if balance is sufficient, add funds if needed

### Issue: Some payments failed
**Solution**: Check results, retry failed payments individually

---

**Status**: ✅ Implemented
**Version**: 1.0
**Last Updated**: October 22, 2025
