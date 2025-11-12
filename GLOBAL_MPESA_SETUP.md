# 🌍 Global M-Pesa Number Setup - Complete

## ✅ What Was Implemented

The M-Pesa number popup is now **GLOBAL** - it appears automatically when:
1. User signs up (first login)
2. User logs in without `mpesa_number` set
3. Anytime `mpesa_number` is NULL in the database

## 🎯 How It Works

### Automatic Popup Flow

```
User Login/Signup
       ↓
App Loads (app.tsx)
       ↓
Check profiles.mpesa_number
       ↓
   Is NULL?
   ↓     ↓
  Yes    No
   ↓      ↓
Show    Continue
Popup   Normally
   ↓
User MUST set number
(can't close dialog)
   ↓
Save to database
   ↓
Continue to app
```

### Features

**Required Mode:**
- ✅ Shows on first login/signup
- ✅ Cannot be closed without setting number
- ✅ "Welcome to Ongea Pesa!" header
- ✅ Yellow warning badge: "Required"
- ✅ Blocks app usage until set

**Optional Mode (Settings):**
- ✅ Can be closed
- ✅ Shows current number
- ✅ "M-Pesa Number" header
- ✅ Blue info badge
- ✅ Change button available

## 📁 Files Modified

### 1. Global App Component (`app.tsx`)
**Added:**
- Import for `MpesaSettingsDialog` and auth
- State: `isMpesaDialogOpen`, `checkingMpesa`
- `checkMpesaNumber()` function on mount
- Global dialog component with `required={true}`

**Key Code:**
```typescript
// Check on mount or user change
useEffect(() => {
  if (mounted && user?.id) {
    checkMpesaNumber()
  }
}, [mounted, user?.id])

// Auto-show if NULL
if (!profile?.mpesa_number) {
  setIsMpesaDialogOpen(true)
}
```

### 2. M-Pesa Dialog (`mpesa-settings-dialog.tsx`)
**Added:**
- `required` prop (boolean)
- Conditional close button (hidden when required)
- Conditional header text
- Conditional info badges (yellow=required, blue=optional)

**Props:**
```typescript
interface MpesaSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  required?: boolean; // New!
}
```

### 3. Permission Manager (`permission-manager.tsx`)
**Modified:**
- Removed auto-show logic (now global)
- Only shows on manual button click
- Dialog uses `required={false}`

### 4. Deposit API (`app/api/gate/deposit/route.ts`)
**Uses:**
- `profiles.mpesa_number` column
- Auto-saves phone when depositing

## 🚀 User Experience

### New User (Signup)
1. Complete signup form
2. Redirect to app
3. **Popup appears immediately**
4. "Welcome to Ongea Pesa!" message
5. Must enter M-Pesa number
6. Can't close dialog (no X button)
7. Click "Save M-Pesa Number"
8. App unlocks, ready to use!

### Existing User (No M-Pesa Set)
1. Login to app
2. **Popup appears automatically**
3. "Welcome to Ongea Pesa!" message
4. Must set M-Pesa number
5. Save and continue

### Existing User (M-Pesa Already Set)
1. Login to app
2. No popup (works normally)
3. Can update in Settings anytime

## 🔧 Database

**Column Used:**
- `profiles.mpesa_number` (TEXT, nullable)
- Already exists in your schema
- No migration needed

**Behavior:**
- NULL = Show popup (required)
- Has value = Don't show popup

## 🎨 UI States

### Required Mode (Global)
```
┌─────────────────────────────────────┐
│  Welcome to Ongea Pesa!             │
│  Set your M-Pesa number to continue │
│                         [No X]      │
├─────────────────────────────────────┤
│  🎯 Required: Please set your...    │
│                                     │
│  [📱 Phone Input]                   │
│  [Quick: 50 100 500 1000]          │
│                                     │
│  [💾 Save M-Pesa Number]           │
└─────────────────────────────────────┘
```

### Optional Mode (Settings)
```
┌─────────────────────────────────────┐
│  M-Pesa Number                  [X] │
│  Update your default M-Pesa number  │
├─────────────────────────────────────┤
│  ℹ️ This number will be used for... │
│                                     │
│  [📱 0712345678]                    │
│                                     │
│  [💾 Save M-Pesa Number]           │
└─────────────────────────────────────┘
```

## 📱 Phone Validation

**Supported Formats:**
- `0712345678` (Safaricom)
- `0112345678` (Airtel)
- `+254712345678` (International Safaricom)
- `+254112345678` (International Airtel)

**Validation:**
- Min length: 10 digits
- Kenyan format required
- Auto-formatting as user types
- Real-time error messages

## ✅ Testing

### Test Case 1: New Signup
1. Create new account
2. Complete signup
3. ✅ Popup appears immediately
4. ✅ Shows "Welcome to Ongea Pesa!"
5. ✅ No X button (can't close)
6. ✅ Yellow "Required" badge
7. Enter phone: `0712345678`
8. Click "Save M-Pesa Number"
9. ✅ Popup closes
10. ✅ Can use app normally

### Test Case 2: Login Without M-Pesa
1. Login as user with NULL mpesa_number
2. ✅ Popup appears on dashboard load
3. ✅ Can't close without setting
4. Set number and save
5. ✅ App continues normally

### Test Case 3: Login With M-Pesa
1. Login as user with mpesa_number set
2. ✅ No popup appears
3. ✅ App works normally
4. Go to Settings
5. ✅ See current M-Pesa number
6. Click "Change"
7. ✅ Popup shows with X button
8. ✅ Pre-filled with current number

### Test Case 4: Settings Change
1. Go to Settings (gear icon)
2. See M-Pesa card with current number
3. Click "Change" button
4. ✅ Popup opens (optional mode)
5. ✅ Has X button (can close)
6. ✅ Blue info badge
7. Update number
8. ✅ Saves successfully

## 🔐 Security

- ✅ User must be authenticated
- ✅ Server-side validation
- ✅ Phone format validation
- ✅ Database constraints
- ✅ No hardcoded values

## 🎯 Integration Points

### When M-Pesa Number is Used

1. **Deposits** - BalanceSheet → Deposit API
2. **Gate Creation** - Uses for payment gateway
3. **Transactions** - Default number for payments
4. **Settings** - Display and update

### API Endpoints Using It

- `/api/gate/deposit` - Deposit to wallet
- `/api/gate/ensure` - Gate creation (optional)

## 💡 Benefits

1. **Seamless Onboarding** - Set on first use
2. **No Manual Steps** - Automatic popup
3. **Required Field** - Can't skip
4. **Flexible** - Can change anytime
5. **Global** - Works across entire app
6. **User-Friendly** - Clear messaging

## 📋 Summary

**Before:**
- M-Pesa settings only in Settings page
- Manual navigation required
- Could be skipped

**After:**
- ✅ Global popup on login/signup
- ✅ Automatic detection (NULL check)
- ✅ Required (can't close without setting)
- ✅ Welcome message for new users
- ✅ Still changeable in Settings

---

**The M-Pesa popup is now fully global and required! Test by logging in with a user that has NULL mpesa_number. 🎉**
