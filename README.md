# Ongea Pesa 🗣️💰

> **Voice-Activated Mobile Money Platform** | Send money, pay bills, and manage finances using voice commands in English, Swahili, and Sheng.

[![Next.js](https://img.shields.io/badge/Next.js-15.2-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![ElevenLabs](https://img.shields.io/badge/ElevenLabs-AI-purple)](https://elevenlabs.io/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green)](https://supabase.com/)

---

## ✨ Features

### 🎙️ Voice Interface
- **Natural Language Processing**: Speak in English, Swahili, or Sheng
- **Real-time Conversations**: ElevenLabs AI agent with < 800ms response time
- **Push-to-Talk**: Hold to speak, automatic session management
- **Smart Recognition**: Understands context and handles disambiguation

### 💸 Payment Operations
- **Send Money**: Voice-activated M-Pesa transfers
- **Paybill**: Pay utility bills, rent, school fees
- **Till Numbers**: Shop payments via voice
- **Bank Transfers**: Inter-bank transactions
- **Pochi la Biashara**: Mobile business account payments
- **Withdrawals**: Agent cash withdrawals

### 📸 AI Document Scanner
- **Google Gemini Vision**: Real-time document analysis
- **Multi-Format Support**: Paybill, Till, QR codes, receipts, bank slips
- **Instant Extraction**: Auto-fills payment details from images
- **Receipt Categorization**: Automatic expense tracking

### 💳 Wallet Management
- **Real-time Balance**: Live updates via Supabase Realtime
- **Transaction History**: Comprehensive payment tracking
- **Balance Sheet**: Visual financial overview
- **Multi-currency**: Support for multiple payment methods

### 🔐 Security
- **Supabase Authentication**: Secure user sessions
- **Row Level Security (RLS)**: Database access control
- **Session Tracking**: Voice conversation logging
- **User Isolation**: Per-user data segregation

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- ElevenLabs account (for voice)
- n8n instance (for workflows)

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/ongea-pesa.git
cd ongea-pesa
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create `.env.local` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# ElevenLabs
NEXT_PUBLIC_AGENT_ID=your-agent-id
ELEVENLABS_API_KEY=your-api-key

# Google Gemini (for document scanner)
NEXT_PUBLIC_GEMINI_API_KEY=your-gemini-key

# n8n Webhooks
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
```

### 4. Database Setup
Run the SQL scripts in Supabase SQL Editor:

```bash
# 1. Main schema
docs/schema/database-schema.sql

# 2. Setup tables
docs/schema/supabase-schema.sql

# 3. Triggers and automation
docs/schema/triggers.sql
```

### 5. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📖 Documentation

### Setup Guides
- [**Installation**](docs/setup/INSTALLATION.md) - Detailed setup instructions
- [**Environment Variables**](docs/setup/ENVIRONMENT.md) - All configuration options
- [**Local Testing**](docs/setup/LOCAL_TESTING.md) - Test with ngrok

### Deployment
- [**Vercel Deployment**](docs/deployment/VERCEL.md) - Deploy to Vercel
- [**Production Setup**](docs/deployment/PRODUCTION.md) - Production checklist

### Integrations
- [**ElevenLabs Setup**](docs/integrations/ELEVENLABS_SETUP.md) - Voice agent configuration
- [**n8n Integration**](docs/integrations/N8N_INTEGRATION.md) - Workflow automation
- [**Supabase Setup**](docs/integrations/SUPABASE_SETUP.md) - Database configuration
- [**User ID Implementation**](docs/integrations/USERID_IMPLEMENTATION.md) - User tracking

### Architecture
- [**System Design**](docs/architecture/SYSTEM_DESIGN.md) - High-level architecture
- [**Database Schema**](docs/architecture/DATABASE_SCHEMA.md) - Data models
- [**API Flow**](docs/architecture/API_FLOW.md) - Request/response flows

---

## 🏗️ Project Structure

```
ongea-pesa/
├── app/
│   ├── api/                    # API routes
│   │   ├── balance/           # Balance check endpoint
│   │   ├── get-signed-url/    # ElevenLabs URL generation
│   │   ├── transactions/      # Transaction operations
│   │   ├── user/              # User management
│   │   └── voice/             # Voice webhook handler
│   ├── login/                 # Login page
│   ├── signup/                # Signup page
│   ├── dashboard/             # Dashboard (legacy)
│   └── page.tsx               # Home page
├── components/
│   ├── ongea-pesa/            # Main app components
│   │   ├── voice-interface.tsx    # Voice conversation UI
│   │   ├── main-dashboard.tsx     # Dashboard
│   │   ├── payment-scanner.tsx    # AI document scanner
│   │   ├── balance-sheet.tsx      # Balance overview
│   │   ├── send-money.tsx         # Manual send form
│   │   └── analytics.tsx          # Transaction analytics
│   ├── ui/                    # Shadcn UI components
│   └── providers/             # Context providers
├── contexts/
│   └── UserContext.tsx        # User authentication context
├── lib/
│   ├── supabase/              # Supabase clients
│   └── utils.ts               # Utility functions
├── hooks/
│   ├── use-camera.ts          # Camera access hook
│   └── use-toast.ts           # Toast notifications
├── docs/                      # Documentation
└── public/                    # Static assets
```

---

## 🎤 Voice Commands

### Send Money
```
"Send 500 to 0712345678"
"Tuma pesa 1000 kwa mama 0798765432"
"Peleka 250 Bob's number is 0733445566"
```

### Check Balance
```
"Check my balance"
"Niangalie balance"
"How much money do I have?"
```

### Pay Bills
```
"Pay paybill 247247 account 123456 amount 5000"
"Lipa bill ya stima 2500"
```

### Buy Goods
```
"Buy goods till 567890 amount 1500"
"Lipa till 300"
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, TypeScript
- **Styling**: Tailwind CSS, Shadcn UI
- **Icons**: Lucide React
- **State**: React Context + Hooks

### AI & Voice
- **Conversational AI**: ElevenLabs
- **Document Vision**: Google Gemini 2.5 Flash
- **Speech Recognition**: Browser native + ElevenLabs
- **Text-to-Speech**: ElevenLabs multilingual TTS

### Backend & Database
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Realtime**: Supabase Realtime subscriptions
- **Workflows**: n8n automation
- **Storage**: Supabase Storage

### Payments
- **M-Pesa**: STK Push integration (via n8n)
- **Webhooks**: Real-time payment notifications

---

## 🔧 Development

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

### Lint Code
```bash
npm run lint
```

### Type Check
```bash
npx tsc --noEmit
```

---

## 🧪 Testing

### Test Voice Interface
1. Navigate to http://localhost:3000
2. Sign in with test account
3. Voice interface auto-starts
4. Say: "Send 100 to 0712345678"
5. Verify agent response

### Test Document Scanner
1. Click "Payment Scanner" from dashboard
2. Allow camera access
3. Point at a paybill or till number
4. Click "Capture & Analyze"
5. Verify extracted details

### Test Balance Updates
1. Send a test transaction
2. Watch balance update in real-time
3. Check transaction history

---

## 📊 Database Schema

### Main Tables
- `profiles` - User profiles and settings
- `transactions` - Payment transaction records
- `voice_sessions` - Voice conversation tracking
- `transaction_limits` - User spending limits
- `payment_methods` - Linked payment accounts

### Key Features
- **RLS Policies**: Row-level security on all tables
- **Triggers**: Auto-create profile, auto-update balance
- **Realtime**: Subscriptions for live updates
- **Indexes**: Optimized queries for performance

See [Database Schema](docs/architecture/DATABASE_SCHEMA.md) for full details.

---

## 🌍 Localization

### Supported Languages
- **English**: Full support
- **Swahili**: Full support  
- **Sheng**: Full support (Kenyan slang)

### Dictionary
Custom ElevenLabs pronunciation dictionary includes:
- M-Pesa terminology
- Kenyan slang (Sheng)
- Common payment phrases
- Number pronunciations

See `docs/config/kenyan-dictionary.json`

---

## 🔐 Security Best Practices

### Authentication
- ✅ Server-side session validation
- ✅ HTTP-only cookies
- ✅ CSRF protection
- ✅ Rate limiting on auth endpoints

### Database
- ✅ Row Level Security (RLS) enabled
- ✅ User isolation per table
- ✅ Service role key secured server-side
- ✅ Prepared statements (SQL injection prevention)

### API
- ✅ Input validation with Zod
- ✅ Error handling (no sensitive data leaks)
- ✅ CORS configured
- ✅ Request signing for webhooks

---

## 🚀 Deployment

### Vercel (Recommended)
```bash
vercel
```

### Environment Variables (Production)
Set these in Vercel dashboard:
- All variables from `.env.local`
- Add production webhook URLs
- Update CORS origins

See [Deployment Guide](docs/deployment/VERCEL.md)

---

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

### Development Workflow
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📝 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **ElevenLabs** - Conversational AI platform
- **Supabase** - Backend infrastructure
- **Vercel** - Hosting and deployment
- **Google** - Gemini Vision AI
- **Shadcn** - UI component library

---

## 📞 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/ongea-pesa/issues)
- **Email**: support@ongeapesa.com

---

## 🗺️ Roadmap

### Q1 2025
- [ ] Multi-currency support
- [ ] Recurring payments
- [ ] Budget tracking
- [ ] Expense analytics

### Q2 2025
- [ ] WhatsApp integration
- [ ] USSD fallback
- [ ] Offline mode
- [ ] Bill reminders

### Q3 2025
- [ ] Savings accounts
- [ ] Loan products
- [ ] Investment options
- [ ] Insurance integration

---

**Made with ❤️ in Kenya** 🇰🇪

**Ongea Pesa** - Speak your money into action!
