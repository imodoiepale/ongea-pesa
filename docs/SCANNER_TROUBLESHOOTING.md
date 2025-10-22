# 🔧 Scanner Troubleshooting Guide

## Common Issues & Solutions

### Issue 1: Scan Results Not Showing

**Symptoms**:
- Camera works but no results appear after scanning
- Console shows "Payment detected" but UI doesn't update

**Solutions**:

#### Check Console Logs
Open browser DevTools (F12) and look for:
```
✅ Payment detected with confidence: 95
📋 Scan result: {type: "buy_goods_till", data: {...}}
✅ Scan result set, should display now
```

If you see these logs but no UI, check:

1. **Confidence Threshold**: Results only show if confidence > 70%
   - Look for: `result.confidence > 70`
   - Lower confidence shows warning: "I can see something, but I'm only X% confident"

2. **State Update**: Verify `setScanResult(result)` is called
   - Check line 337 in `payment-scanner.tsx`

3. **Render Condition**: Ensure `renderScanResult()` is called
   - Line 840: `{scanResult && !showBatchSummary && renderScanResult()}`

#### Quick Fix
```typescript
// In auto-scan loop (line 329-342)
if (result && result.confidence > 70) {
  console.log('✅ Payment detected:', result);
  setScanResult(result);  // ← This must execute
  setIsScanning(false);   // ← This stops camera
  stopCamera();           // ← This releases camera
}
```

---

### Issue 2: Voice Using Browser TTS Instead of ElevenLabs

**Symptoms**:
- Voice sounds robotic/mechanical
- Console shows: "🔊 Speaking via browser TTS"
- Not the natural ElevenLabs voice

**Root Cause**: ElevenLabs not connected

**Solutions**:

#### Check ElevenLabs Connection
Look for console logs:
```
🎙️ Global ElevenLabs connected
✅ Got signed URL for userId: user_abc123
💰 Balance updated for ElevenLabs context: 15000
```

If missing, check:

1. **API Key**: Verify `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` in `.env.local`
2. **Agent ID**: Must be a valid ElevenLabs conversational AI agent
3. **Connection Status**: Check `elevenLabsConnected` state

#### Voice Priority Logic
```typescript
// Line 252-268 in payment-scanner.tsx
const speakText = (text: string) => {
  // 1. Try ElevenLabs first
  if (elevenLabsConnected && conversation) {
    console.log('🎙️ Speaking via ElevenLabs:', text);
    return; // ← ElevenLabs handles speech
  }
  
  // 2. Fallback to browser TTS
  console.log('🔊 Speaking via browser TTS:', text);
  window.speechSynthesis.speak(utterance);
}
```

#### Force ElevenLabs Connection
```typescript
// Check in browser console:
console.log('ElevenLabs connected:', elevenLabsConnected);
console.log('Conversation object:', conversation);

// If false, check ElevenLabsContext.tsx line 157-204
```

---

### Issue 3: Camera Not Starting

**Symptoms**:
- Black screen or "Starting camera..." forever
- Error: "Camera Error: Permission denied"

**Solutions**:

1. **Grant Camera Permission**
   - Chrome: Click lock icon in address bar → Camera → Allow
   - Firefox: Click camera icon → Allow
   - Edge: Settings → Site permissions → Camera → Allow

2. **Check HTTPS**
   - Camera requires HTTPS (except localhost)
   - Use `https://` or `localhost`

3. **Camera In Use**
   - Close other apps using camera (Zoom, Teams, etc.)
   - Restart browser

4. **Browser Compatibility**
   - Chrome/Edge: ✅ Full support
   - Firefox: ✅ Full support
   - Safari: ⚠️ May need extra permissions

---

### Issue 4: Low Confidence Detections

**Symptoms**:
- "I can see something, but I'm only 45% confident"
- Partial detections (30-70% confidence)
- No detection at all

**Solutions**:

#### Improve Image Quality
1. **Better Lighting**
   - Use natural light or bright indoor lighting
   - Avoid shadows on document
   - No glare or reflections

2. **Camera Position**
   - Hold phone steady
   - Point directly at document (not at angle)
   - Fill frame with document
   - Distance: 15-30cm from document

3. **Document Quality**
   - Clear, readable text
   - No creases or folds
   - Flat surface
   - High contrast (dark text on light background)

#### Confidence Thresholds
```typescript
// Line 329-348 in payment-scanner.tsx
if (result.confidence > 70) {
  // ✅ Auto-accept and display
  setScanResult(result);
} else if (result.confidence > 30) {
  // ⚠️ Partial detection - keep trying
  speakText("Keep the camera steady");
} else {
  // ❌ No detection - reposition camera
}
```

---

### Issue 5: Scan Result UI Not Showing Payment Details

**Symptoms**:
- Scan result card appears but empty
- Missing paybill/till numbers
- No amount shown

**Root Cause**: Data extraction failed or incomplete

**Check Console**:
```javascript
// Look for scan result structure:
{
  type: "buy_goods_till",
  data: {
    till: "832909",        // ← Should have value
    merchant: "SuperMart", // ← Optional
    amount: "KSh 1,200"    // ← Optional
  },
  confidence: 95
}
```

**Solutions**:

1. **Check Data Fields**
   ```typescript
   // Line 551-740: renderScanResult()
   // Each payment type has specific fields:
   
   // Paybill
   data.paybill  // Required
   data.account  // Required
   data.amount   // Optional
   
   // Till
   data.till     // Required
   data.merchant // Optional
   data.amount   // Optional
   
   // Pochi
   data.phone    // Required
   data.merchant // Optional
   ```

2. **Verify Gemini Response**
   - Check `lib/gemini-vision.ts` line 45-72
   - Ensure JSON parsing works
   - Validate response format

---

### Issue 6: Audio Not Working

**Symptoms**:
- No voice feedback after scan
- Silent operation
- Audio toggle shows "ON" but no sound

**Solutions**:

1. **Check Audio Toggle**
   - Button should show "🔊 Audio ON"
   - If "🔇 Audio OFF", click to enable

2. **Browser Audio Permissions**
   - Unmute browser tab
   - Check system volume
   - Allow audio autoplay

3. **Speech Synthesis**
   ```javascript
   // Test in browser console:
   window.speechSynthesis.speak(
     new SpeechSynthesisUtterance("Test")
   );
   ```

4. **ElevenLabs Audio**
   - Check if ElevenLabs is connected
   - Verify agent has voice enabled
   - Check ElevenLabs API quota

---

### Issue 7: Batch Mode Not Working

**Symptoms**:
- "Add to Batch" button not appearing
- Batch summary not showing
- Can't pay multiple bills

**Solutions**:

1. **Enable Batch Mode**
   - Click "📦 Batch OFF" button (top-right)
   - Should change to "📦 Batch ON" (blue)
   - Audio: "Batch mode enabled"

2. **Check State**
   ```javascript
   // In browser console:
   // React DevTools → PaymentScanner component
   batchMode: true              // ← Should be true
   scannedPayments: [...]       // ← Array of scans
   showBatchSummary: true/false // ← Summary visibility
   ```

3. **Add to Batch Flow**
   - Scan document → Result appears
   - Click "Add to Batch" → Payment queued
   - Scan next document → Repeat
   - Click "Pay All (X)" → Show summary

---

## Debugging Checklist

### Before Scanning
- [ ] Camera permission granted
- [ ] HTTPS or localhost
- [ ] Good lighting
- [ ] Clear document
- [ ] Gemini API key configured
- [ ] ElevenLabs connected (optional)

### During Scanning
- [ ] Camera feed visible
- [ ] Green scanning frame visible
- [ ] "AI Auto-Scanning" indicator showing
- [ ] No camera errors
- [ ] Console shows Gemini API calls

### After Detection
- [ ] Console shows "✅ Payment detected"
- [ ] Confidence > 70%
- [ ] `setScanResult()` called
- [ ] Scan result card appears
- [ ] Payment details visible
- [ ] Audio feedback plays

### Voice Integration
- [ ] ElevenLabs connected indicator
- [ ] Console: "🎙️ Speaking via ElevenLabs"
- [ ] Natural voice (not robotic)
- [ ] Balance queries work
- [ ] Scan data in context

---

## Console Log Reference

### Successful Scan Flow
```
🚀 Starting Gemini API request...
✅ API key found, sending to Gemini...
Gemini result: {type: "buy_goods_till", ...}
✅ Payment detected with confidence: 95
📋 Scan result: {type: "buy_goods_till", data: {...}}
📡 Sending scan data to voice AI in REAL-TIME
✅ Scan data formatted: Till number detected! 832909...
🎙️ Speaking via ElevenLabs: Till number detected...
✅ Scan result set, should display now
```

### ElevenLabs Connection
```
🚀 Starting global ElevenLabs session for userId: user_abc123
✅ Got signed URL for userId: user_abc123
🎙️ Global ElevenLabs connected
💰 Balance updated for ElevenLabs context: 15000
💰 Initial balance available for ElevenLabs: 15000
```

### Partial Detection
```
Gemini result: {type: "buy_goods_till", confidence: 45, ...}
⚠️ Partial detection: 45 {type: "buy_goods_till", ...}
🔊 Speaking via browser TTS: I can see something, but I'm only 45% confident...
```

### No Detection
```
Gemini result: null
❌ No payment detected or low confidence: 0
```

---

## Environment Variables

### Required
```env
# Gemini AI (for scanning)
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here

# Supabase (for auth & database)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Optional (for voice)
```env
# ElevenLabs (for natural voice)
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your_agent_id_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

---

## Performance Tips

### Faster Scanning
1. **Scan Interval**: Currently 1.5 seconds (line 357)
   - Decrease for faster detection (but more API calls)
   - Increase for slower but more accurate

2. **Confidence Threshold**: Currently 70% (line 329)
   - Lower for more detections (but less accurate)
   - Higher for fewer but more accurate

3. **Image Quality**: Better quality = faster detection
   - Good lighting
   - Steady camera
   - Clear document

### Reduce API Costs
1. **Throttle Scanning**: Increase interval to 2-3 seconds
2. **Manual Mode**: Disable auto-scan, use manual capture
3. **Batch Processing**: Scan multiple at once

---

## Quick Fixes

### Reset Scanner
```javascript
// In browser console:
location.reload(); // Full page reload
```

### Clear State
```javascript
// React DevTools → PaymentScanner component
// Set state manually:
scanResult: null
isScanning: false
scanError: null
```

### Force ElevenLabs Reconnect
```javascript
// In ElevenLabsContext.tsx
// Restart session (requires code change)
conversation.endSession();
conversation.startSession({ signedUrl });
```

---

## Support

### Check Documentation
- `GEMINI_SETUP.md` - Gemini AI configuration
- `REALTIME_VOICE_SCANNER.md` - Voice integration
- `REALTIME_BALANCE_INTEGRATION.md` - Balance tracking
- `BATCH_PAYMENTS.md` - Batch payment feature

### Console Debugging
```javascript
// Enable verbose logging
localStorage.setItem('debug', 'true');

// Check states
console.log('Scanner state:', {
  isScanning,
  scanResult,
  elevenLabsConnected,
  balance,
  batchMode
});
```

---

**Last Updated**: October 22, 2025
**Version**: 1.0
