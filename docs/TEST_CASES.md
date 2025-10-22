# 🧪 Comprehensive Test Cases - Ongea Pesa

## Test Suite Overview

This document contains all test cases for the Ongea Pesa payment scanner and voice AI integration.

---

## 1. Scanner Functionality Tests

### TC-001: Basic Scanner Initialization
**Objective**: Verify scanner opens and initializes correctly

**Prerequisites**:
- User logged in
- Camera permissions granted
- Gemini API key configured

**Steps**:
1. Navigate to Payment Scanner
2. Click "Start Auto-Scanning"

**Expected Results**:
- ✅ Camera feed appears
- ✅ Green scanning frame visible
- ✅ "AI Auto-Scanning..." indicator shows
- ✅ Console shows: "Camera started successfully"
- ✅ Balance loaded and displayed

**Status**: [ ] Pass [ ] Fail

---

### TC-002: Paybill Number Detection
**Objective**: Verify AI can extract paybill numbers accurately

**Test Data**:
- Paybill: 888880 (KPLC)
- Account: 123456789
- Amount: KSh 2,500

**Steps**:
1. Open scanner
2. Point camera at paybill document
3. Wait for auto-detection (1-2 seconds)

**Expected Results**:
- ✅ Paybill number extracted: 888880
- ✅ Account number extracted: 123456789
- ✅ Amount extracted: KSh 2,500
- ✅ Confidence score > 70%
- ✅ Green result card appears
- ✅ Audio feedback speaks details

**Status**: [ ] Pass [ ] Fail

---

### TC-003: Till Number Detection
**Objective**: Verify AI can extract till numbers from stickers

**Test Data**:
- Till: 832909
- Merchant: SuperMart
- Amount: KSh 1,200

**Steps**:
1. Open scanner
2. Point camera at till sticker
3. Wait for auto-detection

**Expected Results**:
- ✅ Till number extracted: 832909
- ✅ Merchant name extracted (if visible)
- ✅ Amount extracted (if visible)
- ✅ Confidence score > 70%
- ✅ Result card shows till details

**Status**: [ ] Pass [ ] Fail

---

### TC-004: QR Code Scanning
**Objective**: Verify QR code detection and extraction

**Test Data**:
- QR code with embedded payment info

**Steps**:
1. Open scanner
2. Point camera at QR code
3. Wait for detection

**Expected Results**:
- ✅ QR code detected
- ✅ Payment details extracted
- ✅ Till/Paybill number shown
- ✅ Merchant name shown
- ✅ Amount shown (if encoded)

**Status**: [ ] Pass [ ] Fail

---

### TC-005: Receipt Scanning
**Objective**: Verify receipt data extraction

**Test Data**:
- Receipt from any vendor
- With date, amount, items

**Steps**:
1. Open scanner
2. Point camera at receipt
3. Wait for detection

**Expected Results**:
- ✅ Vendor name extracted
- ✅ Total amount extracted
- ✅ Date extracted
- ✅ Category suggested
- ✅ "Save Receipt" button appears

**Status**: [ ] Pass [ ] Fail

---

### TC-006: Low Quality Image Handling
**Objective**: Verify scanner handles blurry/poor quality images

**Test Data**:
- Blurry payment document
- Poor lighting conditions

**Steps**:
1. Open scanner
2. Point at blurry document
3. Observe behavior

**Expected Results**:
- ✅ Lower confidence score (30-69%)
- ✅ Audio feedback: "Keep camera steady"
- ✅ Continues scanning
- ✅ No crash or error

**Status**: [ ] Pass [ ] Fail

---

### TC-007: Handwritten Number Detection
**Objective**: Verify AI can read handwritten payment details

**Test Data**:
- Handwritten till/paybill number

**Steps**:
1. Open scanner
2. Point at handwritten document
3. Wait for detection

**Expected Results**:
- ✅ Numbers extracted (may be slower)
- ✅ Confidence score reflects uncertainty
- ✅ User can retry if needed
- ✅ No crash

**Status**: [ ] Pass [ ] Fail

---

## 2. Balance Integration Tests

### TC-101: Balance Display on Scanner
**Objective**: Verify balance is shown in scanner

**Prerequisites**:
- User has balance in wallet

**Steps**:
1. Open scanner
2. Check UI for balance display

**Expected Results**:
- ✅ Balance visible at top
- ✅ Formatted correctly (KSh X,XXX)
- ✅ Console shows: "Balance loaded: X"

**Status**: [ ] Pass [ ] Fail

---

### TC-102: Sufficient Balance Check
**Objective**: Verify system checks if balance is sufficient

**Test Data**:
- Balance: KSh 15,000
- Payment: KSh 1,200

**Steps**:
1. Scan payment document
2. Listen to AI message

**Expected Results**:
- ✅ AI says: "Your balance is KSh 15,000"
- ✅ No warning message
- ✅ "Proceed to Pay" button enabled

**Status**: [ ] Pass [ ] Fail

---

### TC-103: Insufficient Balance Warning
**Objective**: Verify AI warns when balance is too low

**Test Data**:
- Balance: KSh 500
- Payment: KSh 2,000

**Steps**:
1. Scan payment document
2. Listen to AI message

**Expected Results**:
- ✅ AI says: "WARNING: Your balance is insufficient"
- ✅ AI says: "You need KSh 1,500 more"
- ✅ AI asks: "Would you like to add funds?"
- ✅ Payment blocked or warning shown

**Status**: [ ] Pass [ ] Fail

---

### TC-104: Low Balance Warning
**Objective**: Verify AI warns when balance will be very low after payment

**Test Data**:
- Balance: KSh 1,250
- Payment: KSh 1,200

**Steps**:
1. Scan payment document
2. Listen to AI message

**Expected Results**:
- ✅ AI says: "After this payment, you'll only have KSh 50 remaining"
- ✅ AI says: "Consider adding funds soon"
- ✅ User can still proceed

**Status**: [ ] Pass [ ] Fail

---

### TC-105: Real-Time Balance Update
**Objective**: Verify balance updates after transaction

**Prerequisites**:
- Initial balance known

**Steps**:
1. Note current balance
2. Complete a payment
3. Wait 10 seconds
4. Check balance display

**Expected Results**:
- ✅ Balance decreases by payment amount + fees
- ✅ Console shows: "💰 Balance updated: X"
- ✅ UI reflects new balance
- ✅ AI knows new balance

**Status**: [ ] Pass [ ] Fail

---

## 3. Voice Integration Tests

### TC-201: ElevenLabs Connection
**Objective**: Verify ElevenLabs connects successfully

**Prerequisites**:
- ElevenLabs API key configured
- User logged in

**Steps**:
1. Open app
2. Wait for auto-connection
3. Check indicators

**Expected Results**:
- ✅ Purple "ElevenLabs AI Active" indicator
- ✅ Console: "🎙️ Global ElevenLabs connected"
- ✅ Console: "💰 Initial balance available"

**Status**: [ ] Pass [ ] Fail

---

### TC-202: Voice Balance Query
**Objective**: Verify AI can answer balance questions

**Steps**:
1. Ensure ElevenLabs connected
2. Say: "Hey Ongea, what's my balance?"
3. Listen to response

**Expected Results**:
- ✅ AI responds with exact balance
- ✅ Format: "Your current balance is X shillings"
- ✅ Response within 2 seconds

**Status**: [ ] Pass [ ] Fail

---

### TC-203: Scan + Voice Question
**Objective**: Verify AI understands scanned data in conversation

**Steps**:
1. Scan a payment document
2. Wait for scan to complete
3. Say: "Hey Ongea, what did I just scan?"
4. Listen to response

**Expected Results**:
- ✅ AI describes scanned payment
- ✅ Includes till/paybill number
- ✅ Includes amount
- ✅ Includes merchant (if detected)

**Status**: [ ] Pass [ ] Fail

---

### TC-204: Affordability Check via Voice
**Objective**: Verify AI can compare payment vs balance

**Steps**:
1. Scan payment document with amount
2. Say: "Hey Ongea, can I afford this?"
3. Listen to response

**Expected Results**:
- ✅ AI compares amount vs balance
- ✅ Says "Yes" if sufficient
- ✅ Says "No" with shortfall if insufficient
- ✅ Mentions fees in calculation

**Status**: [ ] Pass [ ] Fail

---

### TC-205: Multiple Scans Tracking
**Objective**: Verify AI tracks multiple scanned documents

**Steps**:
1. Scan first payment document
2. Scan second payment document
3. Say: "Hey Ongea, can I pay both?"
4. Listen to response

**Expected Results**:
- ✅ AI remembers both scans
- ✅ Calculates total amount
- ✅ Compares total vs balance
- ✅ Advises accordingly

**Status**: [ ] Pass [ ] Fail

---

### TC-206: Voice-Initiated Scan
**Objective**: Verify voice can trigger scanner

**Steps**:
1. Say: "Hey Ongea, scan a bill"
2. Observe behavior

**Expected Results**:
- ✅ AI responds: "Opening scanner..."
- ✅ Scanner opens automatically
- ✅ Camera starts
- ✅ Ready to scan

**Status**: [ ] Pass [ ] Fail

---

## 4. User Authentication Tests

### TC-301: User Login
**Objective**: Verify user can log in successfully

**Test Data**:
- Email: test@example.com
- Password: TestPass123

**Steps**:
1. Navigate to login page
2. Enter credentials
3. Click login

**Expected Results**:
- ✅ User logged in
- ✅ Console: "✅ User logged in: test@example.com ID: xxx"
- ✅ Redirected to dashboard
- ✅ User ID stored correctly

**Status**: [ ] Pass [ ] Fail

---

### TC-302: User Logout
**Objective**: Verify logout clears user data

**Steps**:
1. Log in as User A
2. Note user ID in console
3. Log out
4. Check console

**Expected Results**:
- ✅ Console: "🚪 User logged out - clearing localStorage"
- ✅ localStorage cleared
- ✅ New guest user created
- ✅ Old user ID not retained

**Status**: [ ] Pass [ ] Fail

---

### TC-303: Different User Login
**Objective**: Verify switching users works correctly

**Steps**:
1. Log in as User A
2. Note user ID
3. Log out
4. Log in as User B
5. Note user ID

**Expected Results**:
- ✅ User B's ID different from User A
- ✅ User B's balance shown (not User A's)
- ✅ No data leakage
- ✅ Console shows correct user

**Status**: [ ] Pass [ ] Fail

---

## 5. Edge Cases & Error Handling

### TC-401: No Camera Permission
**Objective**: Verify graceful handling when camera denied

**Steps**:
1. Deny camera permissions
2. Try to open scanner

**Expected Results**:
- ✅ Error message shown
- ✅ Instructions to enable permissions
- ✅ No crash
- ✅ User can retry after granting

**Status**: [ ] Pass [ ] Fail

---

### TC-402: Missing Gemini API Key
**Objective**: Verify error handling for missing API key

**Prerequisites**:
- Remove NEXT_PUBLIC_GEMINI_API_KEY from .env.local

**Steps**:
1. Open scanner
2. Try to scan

**Expected Results**:
- ✅ Error: "Gemini API key not configured"
- ✅ Console: "❌ GEMINI API KEY MISSING!"
- ✅ Instructions shown
- ✅ No crash

**Status**: [ ] Pass [ ] Fail

---

### TC-403: Network Failure
**Objective**: Verify handling of network errors

**Steps**:
1. Disconnect internet
2. Try to scan document

**Expected Results**:
- ✅ Error message shown
- ✅ Fallback to cached data (if any)
- ✅ User can retry
- ✅ No crash

**Status**: [ ] Pass [ ] Fail

---

### TC-404: Invalid Payment Document
**Objective**: Verify handling of non-payment documents

**Steps**:
1. Open scanner
2. Point at random text/image
3. Wait for detection

**Expected Results**:
- ✅ Low confidence score (< 30%)
- ✅ Message: "No payment detected"
- ✅ User can retry
- ✅ No false positives

**Status**: [ ] Pass [ ] Fail

---

### TC-405: Concurrent Scans
**Objective**: Verify handling of rapid successive scans

**Steps**:
1. Open scanner
2. Quickly scan multiple documents
3. Observe behavior

**Expected Results**:
- ✅ Throttling prevents overload
- ✅ Only processes one at a time
- ✅ No crashes
- ✅ All scans eventually processed

**Status**: [ ] Pass [ ] Fail

---

## 6. Performance Tests

### TC-501: Scan Speed
**Objective**: Measure time from scan to result

**Steps**:
1. Open scanner
2. Point at clear payment document
3. Time until result appears

**Expected Results**:
- ✅ Detection within 1.5-2 seconds
- ✅ Result displayed within 3 seconds total
- ✅ Audio feedback immediate

**Status**: [ ] Pass [ ] Fail

---

### TC-502: Balance Refresh Rate
**Objective**: Verify balance updates at correct interval

**Steps**:
1. Connect ElevenLabs
2. Monitor console logs
3. Count time between updates

**Expected Results**:
- ✅ Balance fetched immediately on connect
- ✅ Updates every 10 seconds
- ✅ Console: "💰 Balance updated" every 10s

**Status**: [ ] Pass [ ] Fail

---

### TC-503: Memory Usage
**Objective**: Verify no memory leaks during extended use

**Steps**:
1. Open scanner
2. Scan 20+ documents
3. Monitor browser memory

**Expected Results**:
- ✅ Memory usage stable
- ✅ No continuous growth
- ✅ Camera resources released properly

**Status**: [ ] Pass [ ] Fail

---

## 7. UI/UX Tests

### TC-601: Green Theme Consistency
**Objective**: Verify green color theme throughout

**Steps**:
1. Open scanner
2. Scan document
3. Check result card colors

**Expected Results**:
- ✅ Result card: green/emerald/teal gradients
- ✅ No purple/pink/blue colors
- ✅ Consistent with app theme

**Status**: [ ] Pass [ ] Fail

---

### TC-602: Responsive Design
**Objective**: Verify UI works on different screen sizes

**Steps**:
1. Test on desktop (1920x1080)
2. Test on tablet (768x1024)
3. Test on mobile (375x667)

**Expected Results**:
- ✅ All elements visible
- ✅ No overflow
- ✅ Touch targets adequate
- ✅ Text readable

**Status**: [ ] Pass [ ] Fail

---

### TC-603: Dark Mode
**Objective**: Verify dark mode support

**Steps**:
1. Enable dark mode
2. Open scanner
3. Scan document

**Expected Results**:
- ✅ Colors adjust appropriately
- ✅ Text remains readable
- ✅ Contrast sufficient
- ✅ No white flashes

**Status**: [ ] Pass [ ] Fail

---

## 8. Integration Tests

### TC-701: End-to-End Payment Flow
**Objective**: Complete payment from scan to confirmation

**Steps**:
1. Open scanner
2. Scan payment document
3. Verify details
4. Click "Proceed to Pay"
5. Confirm payment

**Expected Results**:
- ✅ All details extracted correctly
- ✅ Balance checked
- ✅ Fees calculated
- ✅ Payment processed
- ✅ Balance updated

**Status**: [ ] Pass [ ] Fail

---

### TC-702: Voice-to-Payment Flow
**Objective**: Complete payment via voice commands

**Steps**:
1. Say: "Hey Ongea, pay a bill"
2. Scanner opens
3. Scan document
4. Say: "Pay it"
5. Confirm

**Expected Results**:
- ✅ Voice triggers scanner
- ✅ Scan completes
- ✅ AI understands "pay it"
- ✅ Payment processed

**Status**: [ ] Pass [ ] Fail

---

## Test Summary

### Coverage
- **Scanner**: 7 tests
- **Balance**: 5 tests
- **Voice**: 6 tests
- **Auth**: 3 tests
- **Edge Cases**: 5 tests
- **Performance**: 3 tests
- **UI/UX**: 3 tests
- **Integration**: 2 tests

**Total**: 34 test cases

### Execution Checklist

#### Pre-Testing Setup
- [ ] .env.local configured with all API keys
- [ ] Supabase database set up
- [ ] Test user accounts created
- [ ] Camera permissions granted
- [ ] Network connection stable

#### Test Execution
- [ ] Run all Scanner tests (TC-001 to TC-007)
- [ ] Run all Balance tests (TC-101 to TC-105)
- [ ] Run all Voice tests (TC-201 to TC-206)
- [ ] Run all Auth tests (TC-301 to TC-303)
- [ ] Run all Edge Case tests (TC-401 to TC-405)
- [ ] Run all Performance tests (TC-501 to TC-503)
- [ ] Run all UI/UX tests (TC-601 to TC-603)
- [ ] Run all Integration tests (TC-701 to TC-702)

#### Post-Testing
- [ ] Document all failures
- [ ] Create bug reports
- [ ] Retest after fixes
- [ ] Update test cases as needed

---

## Bug Report Template

```markdown
**Bug ID**: BUG-XXX
**Test Case**: TC-XXX
**Severity**: Critical / High / Medium / Low
**Status**: Open / In Progress / Fixed / Closed

**Description**:
[Clear description of the bug]

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected Result**:
[What should happen]

**Actual Result**:
[What actually happened]

**Screenshots/Logs**:
[Attach relevant evidence]

**Environment**:
- Browser: [Chrome/Firefox/Safari]
- OS: [Windows/Mac/Linux]
- Version: [App version]
```

---

## Regression Testing

Run these critical tests before each release:
- [ ] TC-001: Scanner initialization
- [ ] TC-002: Paybill detection
- [ ] TC-003: Till detection
- [ ] TC-103: Insufficient balance warning
- [ ] TC-201: ElevenLabs connection
- [ ] TC-203: Scan + voice question
- [ ] TC-303: Different user login
- [ ] TC-701: End-to-end payment

---

**Last Updated**: October 22, 2025
**Version**: 1.0
**Status**: Ready for Execution
