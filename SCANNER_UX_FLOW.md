# Scanner UX Flow - Inline Camera

## ✅ Flow: Stays on Same Page (No Redirect)

The scanner uses **inline camera view** - everything happens on the same page without redirects.

---

## 📱 User Experience Flow

### Option 1: Voice Activation

```
┌─────────────────────────────────────┐
│  Payment Scanner Page               │
│  ┌───────────────────────────────┐  │
│  │ 🎙️ Voice Control              │  │
│  │ Say: "Hey Ongea" then...      │  │
│  │           [🎤 Mic Button]      │  │
│  └───────────────────────────────┘  │
│  [Quick Start Auto-Scanner]         │
│  [Scan Mode Options]                │
└─────────────────────────────────────┘
         ↓ (User says "Hey Ongea")
┌─────────────────────────────────────┐
│  🟢 VOICE ACTIVATED                 │
│  Hearing: "scan till"               │
└─────────────────────────────────────┘
         ↓ (Camera opens inline)
┌─────────────────────────────────────┐
│  📹 LIVE CAMERA VIEW                │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │    [Live Camera Feed]         │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│  🤖 AI Auto-Detection Active        │
│  🔊 "Point at any payment document" │
└─────────────────────────────────────┘
         ↓ (AI detects payment)
┌─────────────────────────────────────┐
│  ✅ DETECTED!                       │
│  📄 Till: 832909                    │
│  💰 Amount: KSh 1,200               │
│  💳 M-Pesa fee: KSh 15              │
│  🏢 Ongea Pesa: KSh 6               │
│  💵 Total: KSh 1,221                │
│  [✓ Proceed]  [✗ Cancel]           │
└─────────────────────────────────────┘
```

### Option 2: Button Click

```
┌─────────────────────────────────────┐
│  Payment Scanner Page               │
│  [🎙️ Voice Control]                 │
│  ┌───────────────────────────────┐  │
│  │ 📷 Start Auto-Scanning        │  │  ← User clicks
│  └───────────────────────────────┘  │
│  Or choose mode:                    │
│  [Paybill] [Till] [QR] [Receipt]    │
└─────────────────────────────────────┘
         ↓ (Same page, camera opens)
┌─────────────────────────────────────┐
│  📹 LIVE CAMERA VIEW (Inline)       │
│  [← Back] AI Processing...          │
│  ┌───────────────────────────────┐  │
│  │    🎥                          │  │
│  │  LIVE CAMERA FEED              │  │
│  │    Point at document           │  │
│  └───────────────────────────────┘  │
│  🤖 Auto-scanning every 2 seconds   │
│  [🔊 Audio ON] [🤖 Auto-Scan ON]    │
└─────────────────────────────────────┘
         ↓ (AI extracts details)
┌─────────────────────────────────────┐
│  ✅ SUCCESS!                        │
│  Voice AI speaks:                   │
│  🔊 "Till number detected! 832909   │
│      Amount KSh 1200. M-Pesa fee    │
│      KSh 15. Ongea Pesa fee KSh 6.  │
│      Total KSh 1221. Your balance   │
│      is KSh 15,000. Proceed?"       │
│  [✓ Proceed to Pay] [✗ Cancel]     │
└─────────────────────────────────────┘
```

---

## 🎯 Key UX Features

### 1. **No Page Redirects**
- ✅ Camera opens **inline** on same page
- ✅ Smooth transition (no loading/flickering)
- ✅ Back button closes camera, returns to scanner page

### 2. **Real-time Visual Feedback**
- 🟢 Green border when voice activated
- 🔴 Red pulsing mic when listening
- 📊 Live transcript display
- ⚡ Processing indicator during AI analysis

### 3. **Auto-Scan Mode (Default)**
- 🤖 Continuously scans every 2 seconds
- ✅ No need to press capture button
- 🎯 Just point and wait
- 🔊 Audio feedback when detected

### 4. **Voice Integration**
- 🎙️ Always listening for "Hey Ongea"
- 💬 Real-time transcript showing what it hears
- ✅ Confirmed commands shown in green
- 🔊 Voice speaks fees and details

---

## 📐 Layout States

### State 1: Initial Scanner Page
```
+-----------------------------------+
|  ← Payment Scanner                |
|  Scan bills, receipts & codes     |
+-----------------------------------+
| 🎙️ Voice Control     [🎤]        |
| Say: "Hey Ongea" then...          |
+-----------------------------------+
| 📷 Quick Start Auto-Scanner       |
| [Start Auto-Scanning]             |
+-----------------------------------+
| Or choose mode:                   |
| [Paybill] [Till] [QR] [Receipt]   |
| [Bank]    [Pochi]                 |
+-----------------------------------+
```

### State 2: Camera View (Inline)
```
+-----------------------------------+
| ← AI Processing...                |
| 🤖 Auto-Scanning Active           |
+-----------------------------------+
|                                   |
|      📹 LIVE CAMERA FEED          |
|                                   |
|   (Full width video element)      |
|                                   |
+-----------------------------------+
| 🤖 AI Auto-Detection Active       |
| Point at any payment document     |
+-----------------------------------+
| [🔊 Audio ON] [🤖 Auto-Scan ON]   |
+-----------------------------------+
```

### State 3: Result Display (After Detection)
```
+-----------------------------------+
| ← Payment Scanner                 |
+-----------------------------------+
| ✅ Till Number Detected           |
|                                   |
| 📄 Till: 832909                   |
| 🏪 Merchant: SuperMart            |
| 💰 Amount: KSh 1,200              |
|                                   |
| Fee Breakdown:                    |
| 💳 M-Pesa: KSh 15                 |
| 🏢 Ongea Pesa: KSh 6              |
| 💵 Total: KSh 1,221               |
|                                   |
| 💼 Your Balance: KSh 15,000       |
| 📊 Confidence: 98%                |
|                                   |
| [✓ Proceed to Pay] [✗ Cancel]    |
+-----------------------------------+
```

---

## 🔄 State Management

### Component State:
```typescript
isScanning = false    // Initial: show scanner options
isScanning = true     // Camera view (inline)
scanResult = data     // Show result, hide camera
```

### Rendering Logic:
```typescript
if (scanResult) {
  // Show detection result
  return <ScanResult />
}

if (isScanning) {
  // Show inline camera view
  return <CameraView />
}

// Show scanner options (default)
return <ScannerOptions />
```

---

## 🎨 Visual Indicators

### Voice States:
- **Listening**: Green "Listening" badge
- **Activated**: Pulsing green "Active" badge + green card border
- **Hearing**: Blue box with interim transcript
- **Command**: Green box with confirmed command

### Camera States:
- **Idle**: Ready to scan
- **Processing**: "AI Processing..." with spinner
- **Detected**: Auto-transition to result

### Audio Feedback:
- 🔊 "Starting till scan"
- 🔊 "Till detected! Number 832909..."
- 🔊 "M-Pesa fee 15 shillings..."
- 🔊 "Total cost 1221 shillings"

---

## ⚡ Performance

### Smooth Transitions:
- Camera opens in < 500ms
- AI processing: 2-3 seconds
- Voice response: Instant
- No page reloads or redirects

### Optimizations:
- Camera stream reused (not recreated)
- Auto-scan throttled to 2 seconds
- Voice recognition continuous (no restarts)
- Minimal re-renders

---

## 🧪 Test the Flow

### Test 1: Voice Activation
1. Open scanner
2. Click green mic button (starts listening)
3. Say: "Hey Ongea"
4. See: Green "Active" badge appears
5. Say: "Scan till"
6. See: Camera opens inline
7. Point at document
8. Hear: AI speaks detection

### Test 2: Button Click
1. Open scanner
2. Click "Start Auto-Scanning"
3. See: Camera opens inline (same page)
4. Point at document
5. Wait: 2-3 seconds
6. Hear: AI speaks result
7. See: Result card replaces camera

### Test 3: Specific Mode
1. Click "Till Numbers" card
2. Camera opens for till scanning
3. Auto-detects till format
4. Shows result with fees

---

## ✅ Summary

**The scanner stays on ONE page throughout:**

1. **Initial view**: Scanner options + voice control
2. **Camera view**: Inline camera (replaces options)
3. **Result view**: Detection result (replaces camera)
4. **Back button**: Returns to initial view

**No redirects. No new pages. Just smooth inline transitions.** 🚀
