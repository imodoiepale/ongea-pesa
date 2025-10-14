# Ongea Pesa System Functions & Tools Reference

## CORE PAYMENT FUNCTIONS

### 1. `make_payment(recipient, amount, currency, payment_method, reference?, note?)`
**Purpose**: Execute financial transactions across all supported channels
**n8n Webhook**: `POST /api/webhooks/make-payment`
**Auth Required**: Biometric/PIN
**Response Time**: 2-15 seconds
**Integration**: M-Pesa, Airtel, Stripe, Coinbase, MetaMask

### 2. `get_balance(account_type?, currency_filter?)`
**Purpose**: Retrieve account balances across linked accounts
**n8n Webhook**: `GET /api/webhooks/get-balance`
**Auth Required**: Basic (PIN/Voice)
**Response Time**: 1-3 seconds
**Integration**: All payment providers, real-time balance APIs

### 3. `convert_currency(from_currency, to_currency, amount, from_account, to_account)`
**Purpose**: Exchange between currencies and payment methods
**n8n Webhook**: `POST /api/webhooks/convert-currency`
**Integration**: CoinGecko API, DEX aggregators, forex APIs
**Response Time**: 3-10 seconds

### 4. `transfer_between_accounts(from_account, to_account, amount, currency)`
**Purpose**: Move funds between user's own accounts
**n8n Webhook**: `POST /api/webhooks/internal-transfer`
**Auth Required**: PIN minimum
**Response Time**: 1-5 seconds

### 5. `schedule_payment(recipient, amount, schedule_type, frequency, start_date, end_date?)`
**Purpose**: Set up recurring payments
**n8n Webhook**: `POST /api/webhooks/schedule-payment`
**Integration**: Cron jobs, calendar system
**Auth Required**: Enhanced verification

## CONTACT MANAGEMENT FUNCTIONS

### 6. `fetch_contacts(search_term?, frequency_filter?, payment_method_filter?)`
**Purpose**: Retrieve contact list with payment preferences
**n8n Webhook**: `GET /api/webhooks/fetch-contacts`
**Database**: Supabase contacts table
**Response Time**: <500ms

### 7. `add_contact(name, nickname?, phone, email?, default_payment_method, notes?)`
**Purpose**: Add new contact to payment address book
**n8n Webhook**: `POST /api/webhooks/add-contact`
**Validation**: Phone format, duplicate checking
**Integration**: Phonebook sync, social media lookup

### 8. `update_contact(contact_id, field, new_value)`
**Purpose**: Modify existing contact information
**n8n Webhook**: `PUT /api/webhooks/update-contact`
**Validation**: Data integrity checks

### 9. `delete_contact(contact_id, confirm_deletion)`
**Purpose**: Remove contact from address book
**n8n Webhook**: `DELETE /api/webhooks/delete-contact`
**Auth Required**: Voice confirmation
**Safety**: Soft delete with recovery option

### 10. `search_contacts(query, search_fields?, fuzzy_match?)`
**Purpose**: Advanced contact search with multiple criteria
**Integration**: Elasticsearch for fuzzy matching
**Response Time**: <300ms

## OCR & DOCUMENT PROCESSING FUNCTIONS

### 11. `scan_document(image_input, document_type, expected_fields?)`
**Purpose**: Process images for text extraction and payment automation
**OCR Engine**: Google Vision API / Tesseract
**n8n Webhook**: `POST /api/webhooks/scan-document`
**Document Types**: bill, receipt, id, meter_reading, invoice, qr_code

### 12. `validate_scan_result(scan_id, extracted_data, confidence_threshold)`
**Purpose**: Confirm OCR extraction accuracy with user
**Integration**: TTS feedback loop
**Fallback**: Manual entry assistance

### 13. `process_qr_code(image_input, qr_type?)`
**Purpose**: Decode QR codes for payment information
**n8n Webhook**: `POST /api/webhooks/process-qr`
**Integration**: ZXing library, custom payment QR formats

### 14. `extract_bill_data(image_input, utility_provider?)`
**Purpose**: Specialized extraction for utility bills
**AI Model**: Custom-trained models for African utility formats
**Providers**: KPLC, NCWSC, Safaricom, Airtel, etc.

### 15. `save_scanned_document(document_data, category, tags?)`
**Purpose**: Store processed documents for future reference
**Storage**: Supabase storage with encryption
**Categories**: receipts, bills, contracts, identification

## TRANSACTION HISTORY FUNCTIONS

### 16. `get_transaction_history(date_range?, amount_range?, contact_filter?, status_filter?, payment_method_filter?)`
**Purpose**: Retrieve payment history with filtering
**n8n Webhook**: `GET /api/webhooks/transaction-history`
**Database**: Indexed transactions table
**Pagination**: Cursor-based for performance

### 17. `get_transaction_details(transaction_id, include_voice_log?)`
**Purpose**: Fetch comprehensive transaction information
**Response**: Full record, fees, exchange rates, timestamps
**Integration**: Voice log playback capability

### 18. `retry_transaction(transaction_id, retry_method?, new_parameters?)`
**Purpose**: Re-attempt failed or cancelled transactions
**n8n Webhook**: `POST /api/webhooks/retry-transaction`
**Logic**: Intelligent retry with different methods

### 19. `dispute_transaction(transaction_id, dispute_reason, evidence?)`
**Purpose**: Initiate transaction dispute process
**n8n Webhook**: `POST /api/webhooks/dispute-transaction`
**Integration**: Support ticket system, evidence upload

### 20. `export_transactions(format, date_range?, filters?)`
**Purpose**: Export transaction data in various formats
**Formats**: CSV, PDF, JSON, Excel
**Integration**: Report generation engine

## SECURITY & AUTHENTICATION FUNCTIONS

### 21. `authenticate_user(method, operation?, amount_threshold?)`
**Purpose**: Verify user identity before sensitive operations
**Methods**: biometric, pin, voice_verification, security_question
**Integration**: Device biometric APIs, secure PIN storage
**Risk Assessment**: Dynamic security level based on operation

### 22. `verify_transaction(transaction_data, verification_methods?, risk_score?)`
**Purpose**: Multi-step verification for high-value transactions
**Process**: Risk assessment → verification → approval/denial
**Integration**: ML fraud detection models

### 23. `log_security_event(event_type, details, risk_level)`
**Purpose**: Record security activities for audit
**Events**: login, failed_auth, suspicious_activity, policy_violation
**Storage**: Secure audit log with immutable records

### 24. `check_fraud_indicators(transaction_data, user_profile)`
**Purpose**: Analyze transaction for potential fraud
**ML Models**: Behavioral analysis, pattern recognition
**Integration**: Real-time fraud detection APIs

### 25. `enable_two_factor_auth(method, phone_number?, email?)`
**Purpose**: Set up additional security layer
**Methods**: SMS, email, authenticator app, hardware token
**Integration**: TOTP libraries, SMS gateways

## VOICE INTERACTION FUNCTIONS

### 26. `trigger_voice_reply(text, voice_style?, language?, speed?, interrupt_current?)`
**Purpose**: Generate and play text-to-speech responses
**TTS Engine**: ElevenLabs with voice cloning
**Languages**: English, Swahili, French
**Styles**: professional, friendly, urgent, whisper

### 27. `process_voice_command(audio_input, context?, user_preferences?)`
**Purpose**: Parse and understand natural language voice input
**Pipeline**: Whisper → GPT-4 → Intent classification → Entity extraction
**Integration**: Custom NLP models for financial terminology

### 28. `voice_confirmation_loop(operation_summary, confirmation_options?, timeout?, retry_limit?)`
**Purpose**: Interactive confirmation dialog for operations
**Flow**: Present options → Wait for response → Validate → Execute/Retry
**Timeout**: Configurable with graceful fallback

### 29. `calibrate_voice_recognition(user_samples?, accent?, speed_preference?)`
**Purpose**: Personalize voice recognition for user
**Training**: Custom acoustic models, user-specific vocabulary
**Adaptation**: Continuous learning from user interactions

### 30. `text_to_speech_batch(text_array, voice_settings?)`
**Purpose**: Convert multiple text items to speech for queuing
**Use Case**: Reading long transaction lists, menu options
**Optimization**: Batch processing for efficiency

## ANALYTICS & REPORTING FUNCTIONS

### 31. `generate_expense_report(period, categories?, comparison_period?, export_format?)`
**Purpose**: Create detailed spending analysis and insights
**n8n Webhook**: `POST /api/webhooks/generate-report`
**Analytics**: Spending patterns, category breakdowns, trend analysis
**Export**: Voice summary, PDF, CSV, JSON

### 32. `get_payment_insights(insight_type?, timeframe?, personalization_level?)`
**Purpose**: Provide intelligent financial insights
**Types**: spending_patterns, savings_opportunities, fraud_alerts
**AI Analysis**: Pattern recognition, anomaly detection, predictions

### 33. `calculate_spending_trends(period, categories?, comparison_metrics?)`
**Purpose**: Analyze spending trends and patterns
**Metrics**: Growth rates, seasonal patterns, category shifts
**Visualization**: Graph data for dashboard display

### 34. `budget_tracking(budget_limits, period, notifications?)`
**Purpose**: Monitor spending against set budgets
**Features**: Overspend alerts, remaining budget notifications
**Integration**: Real-time balance monitoring

### 35. `generate_tax_summary(tax_year, transaction_types?, deductible_categories?)`
**Purpose**: Compile tax-relevant transaction information
**Compliance**: Local tax authority formats
**Categories**: Business expenses, charitable donations, etc.

## UTILITY & BILL MANAGEMENT FUNCTIONS

### 36. `fetch_utility_bills(provider?, account_number?, due_date_range?)`
**Purpose**: Retrieve outstanding utility bills
**Integration**: Utility provider APIs (KPLC, NCWSC, etc.)
**Auto-detection**: Account linking and bill matching

### 37. `pay_recurring_bill(bill_id, amount?, payment_method?)`
**Purpose**: Process regular bill payments
**Scheduling**: Automatic payment before due dates
**Notifications**: Payment confirmations and receipts

### 38. `setup_bill_autopay(provider, account_number, payment_method, schedule)`
**Purpose**: Configure automatic bill payments
**Features**: Due date detection, payment scheduling
**Safety**: Spending limits and notifications

### 39. `check_bill_status(bill_reference, provider?)`
**Purpose**: Verify bill payment status
**Integration**: Provider status APIs
**Response**: Payment confirmation, receipt details

### 40. `split_bill_payment(total_amount, participants, payment_method?, split_method?)`
**Purpose**: Divide bills among multiple people
**Split Methods**: Equal, percentage, custom amounts
**Integration**: Contact system for participant selection

## CRYPTOCURRENCY FUNCTIONS

### 41. `connect_crypto_wallet(wallet_type, connection_method, wallet_address?)`
**Purpose**: Link cryptocurrency wallets to account
**Wallets**: MetaMask, Coinbase, Trust Wallet, hardware wallets
**Connection**: WalletConnect, API keys, address import

### 42. `get_crypto_balance(wallet_address?, token_contract?, network?)`
**Purpose**: Retrieve cryptocurrency balances
**Networks**: Ethereum, Polygon, BSC, Arbitrum, Bitcoin
**Tokens**: Native and ERC-20/BEP-20 tokens

### 43. `send_crypto_payment(recipient_address, amount, token_contract, network, gas_fee?)`
**Purpose**: Execute cryptocurrency transactions
**Features**: Gas estimation, slippage protection
**Security**: Address validation, double confirmation

### 44. `swap_crypto_tokens(from_token, to_token, amount, slippage_tolerance?, dex_preference?)`
**Purpose**: Exchange cryptocurrencies using DEX aggregators
**DEX Integration**: 1inch, Paraswap, Uniswap
**Optimization**: Best rate finding, MEV protection

### 45. `track_crypto_portfolio(wallet_addresses?, include_defi?)`
**Purpose**: Monitor cryptocurrency holdings and performance
**Features**: P&L tracking, portfolio allocation, yield farming
**Integration**: DeFiPulse, CoinGecko, on-chain analytics

## NOTIFICATION & COMMUNICATION FUNCTIONS

### 46. `send_notification(type, recipient, message, urgency?, delivery_method?)`
**Purpose**: Send various types of notifications to users
**Types**: payment_confirmation, security_alert, bill_reminder
**Methods**: Push notification, SMS, email, voice call

### 47. `schedule_reminder(reminder_type, date_time, message, repeat_pattern?)`
**Purpose**: Set up payment and bill reminders
**Types**: bill_due, payment_scheduled, budget_alert
**Integration**: Calendar system, notification scheduler

### 48. `generate_receipt(transaction_id, format?, delivery_method?)`
**Purpose**: Create and deliver transaction receipts
**Formats**: PDF, SMS, email, voice readout
**Templates**: Customizable receipt layouts

### 49. `send_payment_request(recipient, amount, reason?, due_date?)`
**Purpose**: Request money from contacts
**Features**: QR code generation, payment links
**Tracking**: Request status, reminder system

### 50. `broadcast_payment_status(transaction_id, recipients?, message?)`
**Purpose**: Share payment confirmations with multiple parties
**Use Cases**: Bill splitting, group payments, family updates
**Privacy**: Configurable information disclosure

## SYSTEM ADMINISTRATION FUNCTIONS

### 51. `log_action_to_n8n(action_type, payload, metadata?, priority?)`
**Purpose**: Send comprehensive action logs to orchestration
**Types**: payment, scan, query, error, security_event
**Storage**: Elasticsearch for searchable logs
**Priority**: Normal, high, critical for processing order

### 52. `health_check(components?, include_latency?)`
**Purpose**: Verify system component availability and performance
**Components**: payment_gateways, database, OCR, TTS, APIs
**Monitoring**: Response times, error rates, uptime status

### 53. `update_user_preferences(preference_category, settings, apply_immediately?)`
**Purpose**: Modify user settings and customization
**Categories**: voice, security, payments, notifications
**Sync**: Real-time preference application

### 54. `backup_user_data(data_types?, encryption_key?, storage_location?)`
**Purpose**: Create secure backups of user information
**Types**: contacts, preferences, transaction_history, voice_profiles
**Security**: End-to-end encryption, secure storage

### 55. `sync_across_devices(device_list?, sync_categories?)`
**Purpose**: Synchronize user data across multiple devices
**Categories**: contacts, preferences, recent_transactions
**Conflict Resolution**: Timestamp-based, user preference

## INTEGRATION & WEBHOOK FUNCTIONS

### 56. `register_webhook(event_type, endpoint_url, authentication?, retry_policy?)`
**Purpose**: Set up external webhook notifications
**Events**: payment_completed, security_alert, balance_change
**Security**: HMAC signatures, IP whitelisting

### 57. `call_external_api(api_endpoint, method, headers?, payload?, timeout?)`
**Purpose**: Make calls to external services
**Use Cases**: Currency rates, KYC verification, compliance checks
**Error Handling**: Retry logic, fallback mechanisms

### 58. `process_incoming_webhook(source, payload, signature?)`
**Purpose**: Handle incoming webhook notifications
**Sources**: Payment gateways, banks, utility providers
**Validation**: Signature verification, payload structure

### 59. `queue_background_task(task_type, parameters, priority?, delay?)`
**Purpose**: Schedule asynchronous operations
**Tasks**: Report generation, bulk notifications, data cleanup
**Processing**: Redis queue with worker processes

### 60. `trigger_workflow(workflow_id, input_data?, context?)`
**Purpose**: Initiate n8n workflows programmatically
**Workflows**: Complex payment flows, approval processes
**Context**: User session, transaction history, risk scores

## TESTING & DEBUGGING FUNCTIONS

### 61. `simulate_payment(scenario, test_data?, mock_responses?)`
**Purpose**: Test payment flows without real money
**Scenarios**: success, failure, timeout, insufficient_funds
**Integration**: Sandbox environments, mock APIs

### 62. `debug_voice_processing(audio_sample, processing_steps?)`
**Purpose**: Analyze voice recognition pipeline
**Steps**: STT accuracy, intent detection, entity extraction
**Output**: Confidence scores, processing logs

### 63. `validate_ocr_accuracy(test_images, expected_results)`
**Purpose**: Test document scanning functionality
**Metrics**: Character accuracy, field extraction success
**Benchmarking**: Performance against known datasets

### 64. `load_test_system(concurrent_users, duration, test_scenarios?)`
**Purpose**: Stress test system performance
**Scenarios**: Payment processing, voice recognition, database queries
**Monitoring**: Response times, error rates, resource usage

### 65. `generate_test_data(data_type, quantity, realistic_patterns?)`
**Purpose**: Create synthetic data for testing
**Types**: transactions, contacts, voice samples, documents
**Quality**: Realistic patterns, edge cases, compliance data

## API ENDPOINTS & WEBHOOK URLS

### n8n Webhook Endpoints:
- `POST /api/webhooks/make-payment` - Execute payments
- `GET /api/webhooks/get-balance` - Retrieve balances  
- `POST /api/webhooks/scan-document` - Process OCR
- `GET /api/webhooks/fetch-contacts` - Get contact list
- `POST /api/webhooks/add-contact` - Create new contact
- `GET /api/webhooks/transaction-history` - Get payment history
- `POST /api/webhooks/authenticate-user` - User verification
- `POST /api/webhooks/log-action` - System logging
- `POST /api/webhooks/generate-report` - Analytics reports
- `POST /api/webhooks/trigger-workflow` - Initiate custom flows

### External API Integrations:
- **M-Pesa Daraja API**: `https://api.safaricom.co.ke/`
- **Airtel Money API**: `https://openapitest.airtel.africa/`
- **Stripe API**: `https://api.stripe.com/`
- **Coinbase API**: `https://api.coinbase.com/`
- **Google Vision API**: `https://vision.googleapis.com/`
- **ElevenLabs TTS**: `https://api.elevenlabs.io/`
- **OpenAI API**: `https://api.openai.com/`
- **CoinGecko API**: `https://api.coingecko.com/`

### Database Schemas (Supabase):
- **users** - User profiles and authentication
- **contacts** - Payment recipients and preferences  
- **transactions** - Payment history and logs
- **documents** - Scanned bills and receipts
- **voice_logs** - Conversation transcripts
- **security_events** - Authentication and fraud logs
- **preferences** - User settings and customization
- **wallets** - Connected payment accounts

This comprehensive function and tool reference provides the complete technical foundation for implementing PayEcho's voice payment assistant with full n8n orchestration capabilities.