# 🚀 Gemini AI Setup Guide

## Quick Setup (2 minutes)

### 1. Get Your API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key (starts with `AIza...`)

### 2. Create Environment File
Create `.env.local` in your project root:

```bash
# In project root: c:\Users\ADMIN\Documents\GitHub\ongea-pesa\
NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
```

### 3. Restart Your Dev Server
```bash
npm run dev
# or
pnpm dev
```

## ✅ Test the Scanner
1. Open the payment scanner
2. Enable auto-scan mode
3. Point camera at any document
4. Check browser console for network requests

## 🔧 Troubleshooting

### No Network Requests?
- Check console for "❌ GEMINI API KEY MISSING!" error
- Verify `.env.local` file exists in project root
- Restart dev server after adding API key

### API Errors?
- Verify API key is valid (starts with `AIza`)
- Check Google AI Studio quota limits
- Look for detailed error logs in browser console

## 🎯 Expected Console Output
When working correctly, you should see:
```
✅ API key found, sending to Gemini...
🚀 Starting Gemini API request...
📡 Making network request to Gemini API...
✅ Gemini API response received in 1234ms
```
