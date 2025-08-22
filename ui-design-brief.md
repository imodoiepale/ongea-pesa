# Ongea Pesa UI/UX Design Brief
## Voice-Activated Centralized Wallet Interface

### Project Overview
Design a clean, intuitive mobile-first UI for Ongea Pesa's centralized wallet system that unifies multiple payment methods (M-Pesa, bank cards, crypto wallets, mobile money) into one seamless voice-controlled experience.

---

## Design System & Brand Identity

### Color Palette
- **Primary**: Safaricom Green (#00A651) - Trust, money, growth
- **Secondary**: Clean White (#FFFFFF) - Clarity, simplicity
- **Accent**: Deep Blue (#1E3A8A) - Security, professionalism
- **Success**: Emerald (#10B981) - Completed transactions
- **Warning**: Amber (#F59E0B) - Pending actions
- **Error**: Red (#EF4444) - Failed transactions
- **Neutral**: Gray scale (#F8FAFC to #1E293B)

### Typography
- **Primary Font**: Inter (clean, modern, excellent readability)
- **Secondary Font**: SF Pro (iOS) / Roboto (Android)
- **Voice UI Font**: Larger sizes for accessibility

### Voice-First Design Principles
- **Large Touch Targets**: Minimum 48px for voice-activated buttons
- **High Contrast**: Ensure visibility during voice interactions
- **Minimal Text**: Rely on icons and voice feedback
- **Audio-Visual Sync**: Visual feedback matches voice responses

---

## Core Screen Architecture

### 1. Main Dashboard (Home Screen)
**Layout Structure**:
```
┌─────────────────────────────────┐
│ [Profile] Ongea Pesa    [🔊Voice]│
├─────────────────────────────────┤
│                                 │
│     MAIN WALLET BALANCE         │
│       KES 25,000.00            │
│    ┌─────────┐ ┌─────────┐     │
│    │Add Funds│ │Send Money│     │
│    └─────────┘ └─────────┘     │
│                                 │
├─────────────────────────────────┤
│ Payment Methods (Horizontal)    │
│ [M-Pesa] [Bank] [Crypto] [+Add] │
├─────────────────────────────────┤
│ Recent Transactions             │
│ • John Doe    -KES 1,500  ✓    │
│ • KPLC Bill   -KES 2,400  ✓    │
│ • Salary      +KES 45,000 ✓    │
└─────────────────────────────────┘
```

**Key Features**:
- **Prominent Balance Display**: Large, centered with currency toggle
- **Voice Button**: Always visible, pulsing when listening
- **Quick Actions**: Add Funds & Send Money as primary CTAs
- **Payment Methods Carousel**: Horizontal scroll with balance previews
- **Smart Suggestions**: "Say 'Send 1000 to John' or tap to continue"

### 2. Payment Methods Hub
**Individual Method Cards**:
```
┌─────────────────────────────────┐
│ M-Pesa                    [⚙️]  │
│ KES 8,000.00                    │
│ ┌─────────┐ ┌─────────┐        │
│ │ Send    │ │ Add Funds│        │
│ └─────────┘ └─────────┘        │
│ Auto-refill: ON  [Toggle]       │
│ Last: -500 to John (2h ago)     │
└─────────────────────────────────┘
```

**Features**:
- **Balance & Status**: Clear display with last transaction
- **Quick Actions**: Send, Add Funds, Settings per method
- **Auto-refill Toggle**: Visual switch with threshold display
- **Usage Stats**: Transaction count, weekly volume

### 3. Voice Interaction Interface
**Voice Command Screen**:
```
┌─────────────────────────────────┐
│           Listening...          │
│                                 │
│        ⚫ ⚫ ⚫ ⚫ ⚫            │
│       Audio Waveform            │
│                                 │
│ "Send 1000 shillings to John"   │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Confirm Payment             │ │
│ │ To: John Doe (+254712...)   │ │
│ │ Amount: KES 1,000.00        │ │
│ │ From: M-Pesa Account        │ │
│ │ ┌─────────┐ ┌─────────┐    │ │
│ │ │ Confirm │ │ Cancel  │    │ │
│ │ └─────────┘ └─────────┘    │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**Voice States**:
- **Idle**: Microphone icon with "Tap to speak"
- **Listening**: Animated waveform with transcript
- **Processing**: Loading spinner with "Understanding..."
- **Confirmation**: Parsed command with action buttons
- **Executing**: Progress indicator with status updates

### 4. Transaction Flow
**Send Money Interface**:
```
┌─────────────────────────────────┐
│ ← Send Money                    │
├─────────────────────────────────┤
│ To: [Search contacts or number] │
│ ┌─────────────────────────────┐ │
│ │ John Doe                    │ │
│ │ +254712345678              │ │
│ │ Last sent: KES 500 (1 week)│ │
│ └─────────────────────────────┘ │
│                                 │
│ Amount: KES [1,000.00]         │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌────┐ │
│ │ 500 │ │1000 │ │2000 │ │5000│ │
│ └─────┘ └─────┘ └─────┘ └────┘ │
│                                 │
│ From: M-Pesa Account ▼          │
│ Fee: KES 7.50                   │
│ ┌─────────────────────────────┐ │
│ │ Send KES 1,000.00           │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### 5. OCR Document Scanner
**Camera Interface**:
```
┌─────────────────────────────────┐
│ ← Scan Bill                     │
├─────────────────────────────────┤
│                                 │
│    ┌─────────────────────┐     │
│    │                     │     │
│    │   📷 Camera View    │     │
│    │                     │     │
│    │   [Align bill here] │     │
│    │                     │     │
│    └─────────────────────┘     │
│                                 │
│ ┌─────────┐ ┌─────────┐        │
│ │ Gallery │ │ Capture │        │
│ └─────────┘ └─────────┘        │
│                                 │
│ "Say 'Scan my KPLC bill'"       │
└─────────────────────────────────┘
```

**Processing Results**:
```
┌─────────────────────────────────┐
│ Bill Scanned Successfully ✓     │
├─────────────────────────────────┤
│ Provider: KPLC                  │
│ Account: 123456789              │
│ Amount Due: KES 2,500.00        │
│ Due Date: Jan 31, 2024          │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Pay Now                     │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Schedule Payment            │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Save for Later              │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

---

## Voice User Experience (VUX) Design

### Voice Command Patterns
**Natural Language Processing**:
- "Send 1000 to John" → Parse amount, recipient
- "Pay my KPLC bill" → Identify utility, account
- "Check my balance" → Display all accounts
- "Add 5000 from bank card" → Transfer between methods

### Voice Feedback System
**Response Patterns**:
- **Confirmation**: "Sending 1000 shillings to John Doe"
- **Progress**: "Processing payment... Almost done"
- **Success**: "Payment sent successfully. John will receive 1000 shillings"
- **Error**: "Sorry, insufficient balance. You have 500 shillings available"

### Multimodal Interactions
**Voice + Visual**:
- Voice command triggers visual confirmation
- Screen shows transaction details while speaking
- User can tap to interrupt voice and continue manually
- Visual progress bars sync with voice updates

---

## Responsive Design Strategy

### Mobile-First Approach
**Screen Sizes**:
- **Primary**: 375x812 (iPhone X/11/12 standard)
- **Secondary**: 360x640 (Android standard)
- **Large**: 414x896 (iPhone Plus/Max)

### Tablet Adaptation
**Landscape Layout**:
- Split-screen: Wallet overview + transaction details
- Expanded payment methods grid (2x3 instead of horizontal scroll)
- Side panel for voice interactions

### Desktop Web App
**Dashboard Layout**:
- Left sidebar: Navigation and payment methods
- Center: Main content area with larger transaction lists
- Right panel: Voice assistant and quick actions

---

## Accessibility & Inclusive Design

### Voice Accessibility
- **Multiple Languages**: English, Swahili, French support
- **Accent Recognition**: Trained on Kenyan, Tanzanian, Ugandan accents
- **Speed Control**: Adjustable speech rate (0.8x to 1.5x)
- **Noise Cancellation**: Background noise filtering

### Visual Accessibility
- **High Contrast Mode**: WCAG AA compliant color ratios
- **Large Text**: Scalable fonts up to 200%
- **Screen Reader**: Full VoiceOver/TalkBack support
- **Color Blind Friendly**: Status indicators use shapes + colors

### Motor Accessibility
- **Large Touch Targets**: Minimum 48px tap areas
- **Voice Navigation**: Complete app navigation via voice
- **Gesture Alternatives**: Swipe actions have button alternatives

---

## Animation & Micro-interactions

### Voice Interaction Animations
- **Listening State**: Pulsing microphone with audio waveform
- **Processing**: Subtle loading spinner with voice processing text
- **Success**: Checkmark animation with haptic feedback
- **Error**: Gentle shake with error color transition

### Transaction Animations
- **Send Money**: Money "flying" from source to recipient
- **Balance Update**: Smooth number counting animation
- **Method Switch**: Card flip animation between payment methods
- **OCR Scan**: Camera focus animation with scan line

### Micro-interactions
- **Button Press**: Subtle scale + shadow change
- **Card Selection**: Gentle elevation increase
- **Voice Button**: Breathing animation when idle
- **Success States**: Confetti or checkmark celebrations

---

## Component Library

### Core Components
**Buttons**:
- Primary: Safaricom green, rounded corners, 48px height
- Secondary: White with green border
- Voice: Circular with microphone icon, pulsing animation
- Danger: Red for destructive actions

**Cards**:
- Payment Method Cards: Rounded corners, subtle shadow
- Transaction Cards: Clean list items with status indicators
- Balance Cards: Prominent typography, currency symbols

**Forms**:
- Amount Input: Large, numeric keypad friendly
- Contact Search: Autocomplete with recent contacts
- Voice Input: Waveform visualization

### Voice-Specific Components
**Voice Confirmation Modal**:
- Semi-transparent overlay
- Clear action summary
- Large confirm/cancel buttons
- Voice command replay option

**Audio Feedback Indicators**:
- Speaking indicator (animated sound waves)
- Listening indicator (pulsing microphone)
- Processing indicator (thinking dots)

---

## Implementation Roadmap

### Phase 1: Core UI (Weeks 1-4)
- Main dashboard with balance display
- Basic payment methods cards
- Simple send money flow
- Voice button integration (UI only)

### Phase 2: Voice Integration (Weeks 5-8)
- Voice command processing
- Audio feedback system
- Voice-visual synchronization
- Basic OCR camera interface

### Phase 3: Advanced Features (Weeks 9-12)
- Complete OCR processing
- Crypto wallet integration
- Advanced analytics dashboard
- Multi-language support

### Phase 4: Polish & Optimization (Weeks 13-16)
- Animation refinements
- Performance optimization
- Accessibility improvements
- User testing and iterations

---

## Technical Specifications

### Frontend Framework
- **React Native**: Cross-platform mobile development
- **Expo**: Rapid development and deployment
- **TypeScript**: Type safety and better development experience

### Voice Integration
- **React Native Voice**: Speech-to-text capabilities
- **ElevenLabs SDK**: Text-to-speech with custom voices
- **WebRTC**: Real-time audio processing

### Camera & OCR
- **React Native Camera**: Document scanning
- **Google Vision API**: Text extraction
- **React Native Image Picker**: Gallery integration

### State Management
- **Redux Toolkit**: Centralized state management
- **React Query**: API state management and caching
- **AsyncStorage**: Local data persistence

---

## Success Metrics

### User Experience Metrics
- **Voice Command Success Rate**: >95% accuracy
- **Transaction Completion Time**: <30 seconds average
- **User Satisfaction Score**: >4.5/5.0
- **Voice Feature Adoption**: >60% of users

### Technical Metrics
- **App Load Time**: <2 seconds
- **Voice Response Time**: <1 second
- **OCR Accuracy**: >90% for bills
- **Crash Rate**: <0.1%

### Business Metrics
- **Daily Active Users**: Growth target
- **Transaction Volume**: Monthly increase
- **Feature Usage**: Voice vs manual interaction ratios
- **User Retention**: 30-day retention >80%

---

This comprehensive UI/UX design brief provides the foundation for building Ongea Pesa's voice-activated centralized wallet interface, ensuring accessibility, usability, and seamless integration of all payment methods through intuitive voice and visual interactions.
