# Ongea Pesa: Feature Implementation & Code Enhancement Plan

This document outlines the necessary changes, new features, and improvements required to build the Ongea Pesa application based on the detailed project specification.

## I. Codebase Analysis

The current codebase has a strong foundation of reusable UI components and several core feature components. However, significant work is needed to connect these components into complete user flows, implement backend logic, and add missing features.

**Existing Strengths:**
- **UI Library:** A comprehensive set of UI components exists in `components/ui` (likely shadcn/ui).
- **Core Components:** Foundational components for the dashboard, camera, analytics, and voice interface are present in `components/ongea-pesa`.
- **Layouts:** Basic page and dashboard layouts are defined in `app/` and `components/kokonutui`.

**Key Gaps:**
- **User Onboarding:** No unified, multi-step onboarding process exists.
- **Authentication:** No clear user authentication or session management flow.
- **State Management:** Lack of a global state management solution (like Redux, Zustand, or React Context) for user data, auth status, etc.
- **Backend/Database:** UI is not yet connected to a persistent backend for storing user profiles, transactions, or settings.
- **Wake Word Activation:** The core voice agent lacks a hands-free wake word trigger.

---

## II. Implementation Roadmap

### Phase 1: Core User Experience & Onboarding

#### 1. Implement User Onboarding Flow
*   **Status:** `Not Started`
*   **Goal:** Create a seamless 5-step onboarding experience for new users.
*   **Actions:**
    1.  Create a new directory `app/(onboarding)/` to house the onboarding screens.
    2.  Develop a main layout `app/(onboarding)/layout.tsx` with a progress indicator.
    3.  **Screen 1: Welcome (`/welcome`)**
        -   Build `components/ongea-pesa/welcome-screen.tsx`.
        -   Incorporate animated logo and value proposition text.
    4.  **Screen 2: Security Setup (`/security-setup`)**
        -   Build `components/ongea-pesa/security-setup.tsx`.
        -   Integrate biometric APIs (WebAuthn) and create a PIN setup UI.
        -   Implement logic for voice ID recording using `voice-waveform.tsx`.
    5.  **Screen 3: Voice Calibration (`/voice-calibration`)**
        -   Build `components/ongea-pesa/voice-calibration.tsx`.
        -   Present 5 phrases for the user to repeat.
        -   Record and store voice samples (requires backend integration).
    6.  **Screen 4: Permissions (`/permissions`)**
        -   Utilize and enhance the existing `components/ongea-pesa/permission-manager.tsx`.
        -   Request microphone, camera, contacts, and SMS permissions.
    7.  **Screen 5: Profile Creation (`/profile-creation`)**
        -   Build `components/ongea-pesa/profile-creation.tsx`.
        -   Create a form for name, phone, language, and avatar upload.
        -   Save profile data to the backend.

#### 2. Implement Wake Word & Voice Agent
*   **Status:** `Not Started`
*   **Goal:** Enable hands-free voice activation and integrate the ElevenLabs agent.
*   **Actions:**
    1.  Integrate a wake word detection library like `@picovoice/web-voice-processor` and `@picovoice/porcupine-web`.
    2.  Train a custom "Ongea Pesa" wake word model using the Picovoice Console.
    3.  Create a global `VoiceAgentProvider` using React Context to manage the voice agent's state (listening, processing, speaking).
    4.  Refactor `voice-interface.tsx` to use this global context.
    5.  Integrate the `elevenlabs` JS SDK for text-to-speech (TTS) responses.

### Phase 2: Dashboard & Core Features

#### 3. Enhance Main Dashboard
*   **Status:** `Partially Complete`
*   **Goal:** Build out the main dashboard to match the specified design.
*   **Actions:**
    1.  Refactor `components/ongea-pesa/main-dashboard.tsx` to match the layout.
    2.  Implement swipeable cards for M-Pesa, Bank, and Crypto balances.
    3.  Integrate `analytics.tsx` to show "Quick Insights".
    4.  Create a `RecentActivityList` component and fetch data from the backend.
    5.  Add the floating voice button, linking it to the global `VoiceAgentProvider`.

#### 4. Finalize Camera & OCR Integration
*   **Status:** `Partially Complete`
*   **Goal:** Enable smart scanning of bills and receipts.
*   **Actions:**
    1.  Integrate Google Gemini Pro Vision API within `lib/gemini-vision.ts` to process images captured by `camera-capture.tsx`.
    2.  Enhance `payment-scanner.tsx` to display extracted data (amount, due date, merchant) in editable cards.
    3.  Add confidence indicators for OCR accuracy.
    4.  Implement the voice confirmation flow: "Scan detected... Proceed?"

### Phase 3: Secondary Features & Settings

#### 5. Build Financial Management Screens
*   **Status:** `Not Started`
*   **Goal:** Create dedicated screens for managing finances.
*   **Actions:**
    1.  **Payment Methods (`/wallet`):**
        -   Create `components/ongea-pesa/wallet-management.tsx`.
        -   Display linked accounts and an "Add New Method" flow.
    2.  **Transaction History (`/history`):**
        -   Create `components/ongea-pesa/transaction-history.tsx`.
        -   Use `list-01.tsx` or similar to display a filterable list of all transactions.
    3.  **Financial Insights (`/analytics`):**
        -   Create a full-page version of `analytics.tsx` with interactive charts and date filters.
        -   Add export to PDF/CSV functionality.

#### 6. Build Automation & Settings Screens
*   **Status:** `Not Started`
*   **Goal:** Allow users to schedule payments and customize their experience.
*   **Actions:**
    1.  **Scheduled Payments (`/scheduler`):**
        -   Reuse and enhance `recurring-payments.tsx`.
        -   Add a calendar view and UI for setting up new scheduled payments.
    2.  **Settings (`/settings`):**
        -   Create a `components/ongea-pesa/settings.tsx` component.
        -   Implement UI for managing language, voice preferences, security, and notifications.

---

## III. Backend & Database Schema

*   **Status:** `Not Started`
*   **Goal:** Design and implement the backend to support the application.
*   **Actions:**
    1.  Finalize the database schema based on `database-schema.sql` and `supabase-schema.sql`.
    2.  Set up Supabase for authentication, database, and storage.
    3.  Create API endpoints (or use Supabase client) for all CRUD operations (users, transactions, accounts, etc.).
    4.  Implement the `enhanced-mcp-server.js` to handle complex voice commands and business logic.
