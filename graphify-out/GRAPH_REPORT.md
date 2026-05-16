# Graph Report - .  (2026-05-16)

## Corpus Check
- Large corpus: 315 files · ~279,476 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 823 nodes · 959 edges · 67 communities detected
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 41 edges (avg confidence: 0.83)
- Token cost: 37,000 input · 7,400 output

## Community Hubs (Navigation)
- [[_COMMUNITY_App Layout & Routing|App Layout & Routing]]
- [[_COMMUNITY_UI Component Library|UI Component Library]]
- [[_COMMUNITY_Voice & Camera Hooks|Voice & Camera Hooks]]
- [[_COMMUNITY_Chama Page & Flows|Chama Page & Flows]]
- [[_COMMUNITY_Voice Widget & Dialogs|Voice Widget & Dialogs]]
- [[_COMMUNITY_Chama & Escrow APIs|Chama & Escrow APIs]]
- [[_COMMUNITY_User Auth & Session Flow|User Auth & Session Flow]]
- [[_COMMUNITY_Wallet Send & Withdraw|Wallet Send & Withdraw]]
- [[_COMMUNITY_API Route Handlers|API Route Handlers]]
- [[_COMMUNITY_IP Protection Suite|IP Protection Suite]]
- [[_COMMUNITY_MCP Server|MCP Server]]
- [[_COMMUNITY_Contact Picker & Send Money|Contact Picker & Send Money]]
- [[_COMMUNITY_Escrow & Chama Tests|Escrow & Chama Tests]]
- [[_COMMUNITY_PWA Brand & Icons|PWA Brand & Icons]]
- [[_COMMUNITY_Gate Wallet Service|Gate Wallet Service]]
- [[_COMMUNITY_Auth Pages (Login & Reset)|Auth Pages (Login & Reset)]]
- [[_COMMUNITY_Revenue & Subscription Model|Revenue & Subscription Model]]
- [[_COMMUNITY_API Reference & Integration Docs|API Reference & Integration Docs]]
- [[_COMMUNITY_ElevenLabs & n8n Payment Tools|ElevenLabs & n8n Payment Tools]]
- [[_COMMUNITY_Gate Service (IndexPay)|Gate Service (IndexPay)]]
- [[_COMMUNITY_Escrow Page|Escrow Page]]
- [[_COMMUNITY_Deposit & M-Pesa Integration|Deposit & M-Pesa Integration]]
- [[_COMMUNITY_Project Overview & Tech Stack|Project Overview & Tech Stack]]
- [[_COMMUNITY_Database Schema & IndexPay Docs|Database Schema & IndexPay Docs]]
- [[_COMMUNITY_Gate Usage Examples|Gate Usage Examples]]
- [[_COMMUNITY_Gemini Vision Service|Gemini Vision Service]]
- [[_COMMUNITY_Voice Webhook & ElevenLabs Config|Voice Webhook & ElevenLabs Config]]
- [[_COMMUNITY_Chama & Escrow Data Models|Chama & Escrow Data Models]]
- [[_COMMUNITY_Deposit Dialog & Polling|Deposit Dialog & Polling]]
- [[_COMMUNITY_Email & Backend Integration Docs|Email & Backend Integration Docs]]
- [[_COMMUNITY_Chama Admin Page|Chama Admin Page]]
- [[_COMMUNITY_Revenue Analytics Helpers|Revenue Analytics Helpers]]
- [[_COMMUNITY_Sidebar & Skeleton UI|Sidebar & Skeleton UI]]
- [[_COMMUNITY_Transaction Polling Service|Transaction Polling Service]]
- [[_COMMUNITY_ElevenLabs Voice Context|ElevenLabs Voice Context]]
- [[_COMMUNITY_Placeholder UI Assets|Placeholder UI Assets]]
- [[_COMMUNITY_Security Setup Screen|Security Setup Screen]]
- [[_COMMUNITY_Admin Escrow Overview|Admin Escrow Overview]]
- [[_COMMUNITY_MCP Tools (Voice & Scan)|MCP Tools (Voice & Scan)]]
- [[_COMMUNITY_Transaction Schema & Types|Transaction Schema & Types]]
- [[_COMMUNITY_ElevenLabs Session Management|ElevenLabs Session Management]]
- [[_COMMUNITY_Auth Middleware|Auth Middleware]]
- [[_COMMUNITY_Welcome Screen|Welcome Screen]]
- [[_COMMUNITY_Payment Scanner Route|Payment Scanner Route]]
- [[_COMMUNITY_Gate Provisioning Component|Gate Provisioning Component]]
- [[_COMMUNITY_Profile Creation Screen|Profile Creation Screen]]
- [[_COMMUNITY_Voice Calibration Screen|Voice Calibration Screen]]
- [[_COMMUNITY_Contacts API Route|Contacts API Route]]
- [[_COMMUNITY_SimilarityContacts API|Similarity/Contacts API]]
- [[_COMMUNITY_Profile Initials API|Profile Initials API]]
- [[_COMMUNITY_Dual-Method API Route|Dual-Method API Route]]
- [[_COMMUNITY_Supabase Service API|Supabase Service API]]
- [[_COMMUNITY_UserId & Signed-URL Flow|UserId & Signed-URL Flow]]
- [[_COMMUNITY_Advanced Voice Tools|Advanced Voice Tools]]
- [[_COMMUNITY_Theme Toggle|Theme Toggle]]
- [[_COMMUNITY_Data API Route|Data API Route]]
- [[_COMMUNITY_Service Worker & Offline Sync|Service Worker & Offline Sync]]
- [[_COMMUNITY_Wallet Pool Architecture|Wallet Pool Architecture]]
- [[_COMMUNITY_Kenyan Language Support|Kenyan Language Support]]
- [[_COMMUNITY_Legal & Privacy Compliance|Legal & Privacy Compliance]]
- [[_COMMUNITY_Voice UX Design Principles|Voice UX Design Principles]]
- [[_COMMUNITY_Voice Provider & Wake Word|Voice Provider & Wake Word]]
- [[_COMMUNITY_Gemini Setup & Scanner|Gemini Setup & Scanner]]
- [[_COMMUNITY_PWA Asset READMEs|PWA Asset READMEs]]
- [[_COMMUNITY_Subscription Payments Table|Subscription Payments Table]]
- [[_COMMUNITY_Wallet Audit Log Table|Wallet Audit Log Table]]
- [[_COMMUNITY_TheMindGap HTML Page|TheMindGap HTML Page]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 63 edges
2. `createClient()` - 47 edges
3. `createClient()` - 26 edges
4. `IP Protection Master Guide` - 13 edges
5. `OngeaPesaMCPServer` - 12 edges
6. `useAuth()` - 12 edges
7. `WalletService` - 12 edges
8. `Ongea Pesa App Icon Design` - 11 edges
9. `fetchChamas()` - 10 edges
10. `GateWalletService` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Transaction Polling Service (lib/services/transactionPollingService.ts)` --semantically_similar_to--> `M-Pesa Callback Endpoint (/api/gate/mpesa-callback)`  [INFERRED] [semantically similar]
  TRANSACTION_POLLING_GUIDE.md → CALLBACK_INFO.md
- `POST()` --calls--> `createServiceClient()`  [INFERRED]
  app/api/chama/add-member/route.ts → lib/supabase/server.ts
- `POST()` --calls--> `createEntityGateAndPocket()`  [INFERRED]
  app/api/transactions/create/route.ts → lib/services/gateService.ts
- `POST()` --calls--> `createServiceClient()`  [INFERRED]
  app/api/transactions/create/route.ts → lib/supabase/server.ts
- `handlePickContact()` --calls--> `getContactDisplayName()`  [INFERRED]
  components/ongea-pesa/send-money.tsx → hooks/use-contacts.ts

## Hyperedges (group relationships)
- **Complete Voice Transaction Flow (ElevenLabs → Webhook → n8n)** — elevenlabs_ui_setup_agent_config, complete_overview_voice_webhook, readme_n8n_workflow [EXTRACTED 1.00]
- **Deposit Flow (Deposit Dialog → IndexPay → Polling → Transaction Tracking)** — deposit_setup_deposit_dialog, callback_deposit_endpoint, transaction_polling_service, transaction_tracking_transactions_table [EXTRACTED 0.95]
- **User Wallet Creation (Auth Callback → Gate Signup → Profiles Table)** — wallet_creation_auth_callback, wallet_creation_gate_signup, complete_overview_profiles_table [EXTRACTED 1.00]
- **Full Voice Transaction Pipeline (ElevenLabs → Webhook → n8n → Supabase)** — elevenlabs_webhook_tool, voice_webhook_api, n8n_send_money_webhook, supabase_postgres_db [EXTRACTED 1.00]
- **Gate Creation Lifecycle (Signup → Unique Name → External API → Profiles)** — gate_signup_endpoint, unique_gate_name_strategy, external_gate_api, profiles_table [EXTRACTED 1.00]
- **Chama Bulk STK Collection Flow (Create → Members → STK Push → Poll → Distribute)** — chama_collection_system, chama_start_collection, mpesa_stk_push [EXTRACTED 1.00]
- **Voice-to-Payment Pipeline (Vapi/ElevenLabs → n8n → M-Pesa → Supabase)** — VAPI_N8N_vapi_voice_agent, VAPI_N8N_n8n_voice_payment_workflow, VAPI_N8N_mpesa_stk_push, schema_db_transactions_table [EXTRACTED 1.00]
- **IP Protection Documentation Suite (Trademark, Copyright, Patent, Trade Secret)** — ip_master_guide, ip_trademark_guide, ip_copyright_guide, ip_patent_guide, ip_enforcement_guide, ip_registry_guide [EXTRACTED 1.00]
- **User Auth, Session Tracking & DB Integration (Supabase Auth + voice_sessions + userId flow)** — USERID_IMPLEMENTATION_usercontext, USERID_IMPLEMENTATION_get_signed_url_api, USERID_IMPLEMENTATION_voice_sessions_table, schema_db_voice_sessions_table [INFERRED 0.95]
- **Placeholder UI Assets Group** — placeholder_logo_png, placeholder_logo_svg, placeholder_user_jpg, placeholder_jpg, placeholder_svg [INFERRED 0.95]
- **Ongea Pesa PWA Icon Set (all sizes)** — icon_48x48, icon_72x72, icon_96x96, icon_128x128, icon_144x144, icon_152x152, icon_192x192, icon_256x256, icon_384x384, icon_512x512 [EXTRACTED 1.00]

## Communities (152 total, 30 thin omitted)

### Community 0 - "App Layout & Routing"
Cohesion: 0.05
Nodes (18): ProtectedRoute(), ThemeProvider(), useVoice(), VoiceProvider(), ElevenLabsProvider(), useElevenLabs(), UserProvider(), useUser() (+10 more)

### Community 2 - "Voice & Camera Hooks"
Cohesion: 0.09
Nodes (24): useCamera(), useVoiceActivation(), calculateTransactionFees(), formatFeesMessage(), getMpesaFee(), getPlatformFee(), hasSufficientBalance(), generateAudioMessage() (+16 more)

### Community 3 - "Chama Page & Flows"
Cohesion: 0.11
Nodes (19): addMember(), approveExit(), checkAuth(), createChama(), fetchAllUsers(), fetchChamas(), pollAndRefresh(), pollPendingStk() (+11 more)

### Community 4 - "Voice Widget & Dialogs"
Cohesion: 0.09
Nodes (6): ElevenLabsConversationAgent, handleKeyPress(), handleSendText(), getTransactionDetails(), getTransactionLabel(), Badge()

### Community 5 - "Chama & Escrow APIs"
Cohesion: 0.11
Nodes (26): POST /api/chama/create Endpoint, Chama Collection System, POST /api/chama/start-collection Endpoint, Contact Picker API (hooks/use-contacts.ts), POST /api/gate/deposit Endpoint, DepositDialog Component, Deposit Feature Documentation, POST /api/escrow/create Endpoint (+18 more)

### Community 6 - "User Auth & Session Flow"
Cohesion: 0.11
Nodes (24): API Endpoint: get-signed-url (Server-side Auth), Guest User Fallback (localStorage), UserContext (contexts/UserContext.tsx), userId Implementation & Auth Flow, voice_sessions Database Table, n8n Balance Check Workflow, M-Pesa Callback Handler (n8n Workflow), M-Pesa STK Push (Safaricom API) (+16 more)

### Community 9 - "IP Protection Suite"
Cohesion: 0.25
Nodes (16): Copyright Protection Guide, IP Enforcement & Monitoring Guide, International IP Protection Guide, IP Protection Master Guide, African Regional Intellectual Property Organization (ARIPO), Kenya Copyright Board (KECOBO), Kenya Industrial Property Institute (KIPI), Trade Secrets Protection (NDAs + Access Controls) (+8 more)

### Community 11 - "Contact Picker & Send Money"
Cohesion: 0.24
Nodes (6): formatPhoneNumber(), getContactDisplayName(), useContacts(), fetchContacts(), handlePickContact(), handleSendMoney()

### Community 12 - "Escrow & Chama Tests"
Cohesion: 0.27
Nodes (8): runAllTests(), testBulkCollection(), testCreateChama(), testDistribute(), testFullChamaCycle(), testMilestoneEscrow(), testMultiSigEscrow(), testSimpleEscrow()

### Community 13 - "PWA Brand & Icons"
Cohesion: 0.17
Nodes (12): Ongea Pesa Brand Identity, PWA Icon 128x128, PWA Icon 144x144, PWA Icon 152x152, PWA Icon 192x192, PWA Icon 256x256, PWA Icon 384x384, PWA Icon 48x48 (+4 more)

### Community 16 - "Revenue & Subscription Model"
Cohesion: 0.18
Nodes (11): Admin Revenue Dashboard (components/admin/revenue-dashboard.tsx), Free Transaction Eligibility Logic (20/month), Platform Fee (0.5% per transaction), platform_revenue DB Table, Revenue Model (Subscription + Platform Fee), Subscription System (KES 5000/month), Kenyan Sheng & Street Language Dictionary, Ongea Pesa AI System Prompt (+3 more)

### Community 17 - "API Reference & Integration Docs"
Cohesion: 0.2
Nodes (11): API Reference Documentation, Cryptocurrency API Integration, Fraud Detection and Security Protocols, n8n Workflow Orchestration Layer, POST /ocr/scan-document Endpoint, PayEcho Voice Assistant Identity, POST /payments/send Endpoint, Voice Agent System Prompt / PayEcho Knowledge Base (+3 more)

### Community 18 - "ElevenLabs & n8n Payment Tools"
Cohesion: 0.22
Nodes (11): ElevenLabs send_money Tool Integration Setup, ElevenLabs send_money Webhook Tool Configuration, make_payment() Voice Tool Function, n8n Railway Deployment, n8n send_money Webhook Endpoint, n8n Webhook Setup Documentation, Production Deployment Documentation, Production Flow Architecture (ElevenLabs → Next.js → n8n → Supabase) (+3 more)

### Community 19 - "Gate Service (IndexPay)"
Cohesion: 0.29
Nodes (5): createEntityGateAndPocket(), createGate(), createPocket(), generateGateName(), generatePocketName()

### Community 20 - "Escrow Page"
Cohesion: 0.33
Nodes (7): approveExit(), checkAuth(), createEscrow(), fetchAllUsers(), fetchEscrows(), requestExit(), resetForm()

### Community 21 - "Deposit & M-Pesa Integration"
Cohesion: 0.22
Nodes (10): Balance Endpoint (/api/gate/balance), Deposit Endpoint (/api/gate/deposit), IndexPay Integration, M-Pesa Callback Endpoint (/api/gate/mpesa-callback), Deposit Dialog (components/ongea-pesa/deposit-dialog.tsx), Main Dashboard (components/ongea-pesa/main-dashboard.tsx), Check Status API (/api/gate/check-status), Exponential Backoff Polling Strategy (+2 more)

### Community 22 - "Project Overview & Tech Stack"
Cohesion: 0.2
Nodes (10): Camera & OCR Integration (Gemini Vision), User Onboarding Flow (5-step), Google Gemini Vision AI (Document Scanner), Next.js 15 App Router, Ongea Pesa Project, Payment Operations (M-Pesa), Supabase Backend (DB + Auth + Realtime), Wallet Management (+2 more)

### Community 23 - "Database Schema & IndexPay Docs"
Cohesion: 0.22
Nodes (10): profiles DB Table (Users + Wallet Balance), profiles Table Gate Fields Migration, IndexPay API Documentation (v2.1.0), IndexPay Gates & Pockets, IndexPay Wallet Payment Endpoint, Supabase Email Template (Signup Confirmation), Auth Callback Route (app/auth/callback/route.ts), Duplicate Wallet Prevention Design (+2 more)

### Community 24 - "Gate Usage Examples"
Cohesion: 0.33
Nodes (5): getGateBalance(), getGateTransactions(), getUserGateInfo(), makeGatePayment(), syncGateBalanceToWallet()

### Community 26 - "Voice Webhook & ElevenLabs Config"
Cohesion: 0.31
Nodes (9): Voice Webhook (/api/voice/webhook), No Double Confirmation Design Principle, send_money ElevenLabs Tool, ElevenLabs Agent Configuration (UI Setup), Dynamic Variables (user_email, user_id), n8n Workflow Automation, Voice Interface (NLP/ElevenLabs), User Context Flow (signed URL → ElevenLabs → webhook) (+1 more)

### Community 27 - "Chama & Escrow Data Models"
Cohesion: 0.29
Nodes (8): Chama (Group Savings Concept), chamas DB Table, Escrow (Secure Transaction Protection), escrows DB Table, gate_transactions DB Table, Per-Entity IndexPay Gate Creation, Milestone-Based Escrow Pattern, STK Push Auto-Collection for Chama

### Community 28 - "Deposit Dialog & Polling"
Cohesion: 0.33
Nodes (3): useTransactionPolling(), formatPhoneNumber(), handlePhoneChange()

### Community 29 - "Email & Backend Integration Docs"
Cohesion: 0.29
Nodes (7): Email Templates Documentation, Node.js Express Backend, React Native Mobile Frontend, Supabase Email Templates (Confirm, Reset, Magic Link), Supabase MCP Server Configuration, Supabase PostgreSQL Database, System Design and Project Structure Documentation

### Community 31 - "Revenue Analytics Helpers"
Cohesion: 0.47
Nodes (3): formatCurrency(), formatNumber(), getTransactionTypeLabel()

### Community 36 - "ElevenLabs Voice Context"
Cohesion: 0.33
Nodes (6): current_balance Field in n8n Payload, voice_sessions DB Table, ElevenLabsContext (contexts/ElevenLabsContext.tsx), Global Voice Widget (components/ongea-pesa/global-voice-widget.tsx), WebSocket Race Condition Fix (Session Guard), Get Signed URL API (/api/get-signed-url)

### Community 37 - "Placeholder UI Assets"
Cohesion: 0.53
Nodes (6): Placeholder Image JPG, Placeholder Logo PNG, Placeholder Logo SVG (Acme Inc Brand), Placeholder Image SVG (Generic Content Block), Placeholder User Avatar JPG, Public Static Assets Directory

### Community 45 - "MCP Tools (Voice & Scan)"
Cohesion: 0.5
Nodes (5): MCP Tool: create_transaction, MCP Tool: save_scan_result, MCP Server Documentation, MCP Tool: create_voice_session / end_voice_session, VAPI to MCP Transaction Flow

### Community 46 - "Transaction Schema & Types"
Cohesion: 0.5
Nodes (5): send_money Tool Schema / Parameters, Transaction Format / JSON Schema Documentation, Universal Transaction JSON Schema, Transaction Types (send_phone, paybill, till, withdraw, bank), VAPI Assistant System Prompt

### Community 47 - "ElevenLabs Session Management"
Cohesion: 0.5
Nodes (5): ElevenLabsContext (contexts/ElevenLabsContext.tsx), ElevenLabs Updated System Prompt, ElevenLabs Session Disconnect Fix Documentation, Session Continuity / Multi-Transaction Design Pattern, ElevenLabs Session Management System Prompt

### Community 50 - "Payment Scanner Route"
Cohesion: 0.83
Nodes (3): calculateTransactionFees(), formatScanMessage(), POST()

### Community 58 - "Similarity/Contacts API"
Cohesion: 0.83
Nodes (3): calculateSimilarity(), GET(), POST()

### Community 62 - "UserId & Signed-URL Flow"
Cohesion: 0.83
Nodes (4): POST /api/get-signed-url Endpoint, n8n Integration Documentation (userId Flow), UserContext (contexts/UserContext.tsx), Voice Interface Component

### Community 63 - "Advanced Voice Tools"
Cohesion: 0.5
Nodes (4): generate_expense_report() Analytics Tool, scan_document() OCR Tool Function, send_crypto_payment() Cryptocurrency Tool, Voice Tools Reference Documentation (65 Functions)

### Community 77 - "Wallet Pool Architecture"
Cohesion: 0.67
Nodes (3): GateWalletService (lib/services/gateWalletService.ts), Gate.io Main Wallet Pool, WalletService (lib/services/walletService.ts)

### Community 78 - "Kenyan Language Support"
Cohesion: 0.67
Nodes (3): ElevenLabs Kenyan Dictionary Setup Guide, Kenyan M-Pesa Pronunciation Dictionary, Kiswahili Language and Voice Support

### Community 79 - "Legal & Privacy Compliance"
Cohesion: 1.0
Nodes (3): Kenya Data Protection Act 2019, Ongea Pesa Terms and Conditions, Voice AI Recording and Processing Consent

### Community 80 - "Voice UX Design Principles"
Cohesion: 1.0
Nodes (3): UI/UX Design Brief Documentation, Voice-First Design Principles, Voice User Experience (VUX) Design

## Knowledge Gaps
- **68 isolated node(s):** `Payment Operations (M-Pesa)`, `Next.js 15 App Router`, `Platform Fee (0.5% per transaction)`, `subscription_payments DB Table`, `wallet_transaction_log DB Table (Audit Trail)` (+63 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `UI Component Library` to `App Layout & Routing`, `Pagination UI`, `Sidebar & Skeleton UI`, `Chama Page & Flows`, `Chama Detail Page`, `Admin Users Page`, `Voice Widget & Dialogs`, `Chart Component`, `M-Pesa Transactions Page`, `Transaction History Page`, `Analytics Content`, `Admin Escrow Overview`, `Wallet Transfers Page`, `Carousel Component`, `Escrow Page`, `Date-Range Analytics Page`, `Voice Sessions Page`, `Chama Admin Page`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `createClient()` connect `Auth Pages (Login & Reset)` to `App Layout & Routing`, `Chama Page & Flows`, `Chama Detail Page`, `Admin Users Page`, `Voice Widget & Dialogs`, `M-Pesa Transactions Page`, `Transaction History Page`, `Analytics Content`, `Admin Escrow Overview`, `Wallet Transfers Page`, `Escrow Page`, `Date-Range Analytics Page`, `Voice Sessions Page`, `Deposit Dialog & Polling`, `Chama Admin Page`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `Badge()` connect `Voice Widget & Dialogs` to `Voice & Camera Hooks`, `Contact Picker & Send Money`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **What connects `Payment Operations (M-Pesa)`, `Next.js 15 App Router`, `Platform Fee (0.5% per transaction)` to the rest of the system?**
  _68 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Layout & Routing` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `UI Component Library` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Voice & Camera Hooks` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._