# Ongea Pesa - Voice-Activated Fintech Platform

A comprehensive voice-activated fintech platform with centralized wallet architecture, featuring real-time AI-powered payment scanning using Google Gemini Vision.

## Features

- **Voice-Activated Payments**: Ultra-fast voice commands for money transfers
- **AI Payment Scanner**: Real-time document scanning with Gemini Vision AI
- **Multi-Payment Support**: Paybill, Till, QR codes, Bank transfers, Pochi la Biashara
- **Receipt Processing**: Automatic expense categorization and tracking
- **M-Pesa Integration**: Direct STK push payments
- **Real-time Voice Responses**: ElevenLabs TTS integration

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env.local` file with:
```bash
# Gemini AI Vision
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here

# M-Pesa (for backend integration)
MPESA_CONSUMER_KEY=your_mpesa_consumer_key
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret

# Supabase (for data storage)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Vapi Voice Agent (optional)
VAPI_API_KEY=your_vapi_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

### 3. Get Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create a new API key
3. Add it to your `.env.local` file

### 4. Run Development Server
```bash
npm run dev
```

## Payment Scanner Usage

The payment scanner uses Google Gemini 2.5 Flash for real-time document analysis:

1. **Navigate to Scanner**: Click "Payment Scanner" from dashboard
2. **Select Scan Mode**: Choose from Paybill, Till, QR, Receipt, Bank, or Pochi
3. **Camera Permission**: Allow camera access when prompted
4. **Capture**: Point camera at document and click "Capture & Analyze"
5. **AI Processing**: Gemini extracts payment details automatically
6. **Confirm**: Review extracted data and proceed with payment

### Supported Document Types

- **Paybill Numbers**: Utility bills, rent, school fees
- **Till Numbers**: Shop stickers, restaurant receipts  
- **QR Codes**: Lipa Na M-Pesa QR payments
- **Receipts**: Expense tracking with automatic categorization
- **Bank Details**: Account numbers from bank slips
- **Pochi la Biashara**: Mobile business account payments

## Voice Commands

- "Piga Paybill" - Scan paybill numbers
- "Piga Till" - Scan till numbers
- "Piga QR" - Scan QR codes
- "Piga risiti" - Capture receipts
- "Piga bank" - Scan bank details
- "Piga Pochi" - Scan Pochi la Biashara

## Architecture

```
User Voice → Vapi Agent → n8n Workflows → M-Pesa → Voice Response
Camera → Gemini Vision → Payment Details → UI → Payment Flow
```

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: Tailwind CSS, Radix UI, Lucide Icons
- **AI Vision**: Google Gemini 2.5 Flash
- **Voice**: Vapi + ElevenLabs TTS
- **Backend**: n8n workflows
- **Payments**: M-Pesa STK Push
- **Database**: Supabase

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Camera Permissions

The app requires camera access for document scanning. Ensure your browser allows camera permissions for the best experience.

## Browser Support

- Chrome/Edge: Full support
- Safari: Requires HTTPS for camera access
- Firefox: Full support
- Mobile browsers: Optimized for mobile scanning

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).