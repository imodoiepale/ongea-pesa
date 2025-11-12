# 📱 M-Pesa Number Settings - Complete Setup

## What Was Done

### ✅ Changes Made

1. **Created M-Pesa Settings Dialog** (`mpesa-settings-dialog.tsx`)
   - Saves to `profiles.mpesa_number` column
   - Phone validation (Kenyan formats)
   - Clean, modern UI with dark mode
   - Auto-closes after save

2. **Updated Permission Manager** (`permission-manager.tsx`)
   - Added M-Pesa settings card at top
   - Shows current M-Pesa number or "Not set"
   - Auto-shows popup when `mpesa_number` is NULL
   - "Change" or "Set Now" button

3. **Updated Deposit API** (`app/api/gate/deposit/route.ts`)
   - Now uses `mpesa_number` instead of `phone_number`
   - Saves phone to `mpesa_number` column
   - Auto-updates when user deposits

4. **Reverted Dashboard Changes** (`main-dashboard.tsx`)
   - Removed standalone deposit dialog
   - Uses existing BalanceSheet for deposits
   - Clean, no duplicate functionality

## 🎯 How It Works

### Auto-Popup Behavior
When user goes to **Settings (Permissions)**:
1. System checks if `mpesa_number` is NULL
2. If NULL → Dialog auto-shows
3. User must set M-Pesa number
4. Saves to `profiles.mpesa_number`

### Manual Access
User can also:
- Go to Settings/Permissions
- Click "Change" or "Set Now" button
- Update M-Pesa number anytime

## 📋 User Flow

```
Login → Settings → Check mpesa_number
                    ↓
              Is NULL?
              ↓     ↓
            Yes    No
             ↓      ↓
        Auto-show  Show current number
        Dialog     with "Change" button
             ↓      ↓
        Set number → Save to DB
             ↓
        Ready for deposits!
```

## 🔧 Database Column

The system uses:
- **Column:** `mpesa_number` (TEXT, nullable)
- **Table:** `profiles`
- **Purpose:** Store user's default M-Pesa number for deposits

**Note:** This column already exists in your `profiles` table schema!

## 🎨 UI Components

### M-Pesa Settings Dialog
**Location:** `components/ongea-pesa/mpesa-settings-dialog.tsx`

**Features:**
- Green gradient header with phone icon
- Phone input with auto-formatting
- Supported formats display
- Validation errors
- Success confirmation
- Auto-close after save

**Props:**
```typescript
interface MpesaSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}
```

### Permission Manager Integration
**Location:** `components/ongea-pesa/permission-manager.tsx`

**New Features:**
- M-Pesa card at top (green gradient)
- Displays current number or "Not set"
- Auto-checks on mount
- Auto-shows dialog if NULL
- Button to open settings

## 🚀 Testing

### Test Scenario 1: New User (mpesa_number = NULL)
1. Login as new user
2. Go to Settings
3. ✅ Dialog should auto-show
4. Enter phone: `0712345678`
5. Click "Save M-Pesa Number"
6. ✅ Dialog closes
7. ✅ Number displays in card

### Test Scenario 2: Existing User (mpesa_number exists)
1. Login as existing user
2. Go to Settings
3. ✅ Dialog does NOT auto-show
4. ✅ Number displays in card
5. Click "Change" button
6. ✅ Dialog opens with pre-filled number
7. Edit and save
8. ✅ Updated number displays

### Test Scenario 3: Deposit Flow
1. User with M-Pesa number set
2. Go to Balance Sheet
3. Add money (your existing flow)
4. ✅ Uses saved `mpesa_number`
5. ✅ Deposit API updates if different

## 📱 Phone Number Formats

Supported:
- ✅ `0712345678` (Safaricom)
- ✅ `0112345678` (Airtel)
- ✅ `+254712345678` (International Safaricom)
- ✅ `+254112345678` (International Airtel)

## 🔗 API Integration

### Deposit API Updated
**Endpoint:** `/api/gate/deposit/route.ts`

**Changes:**
```typescript
// Before: Used phone_number
select('gate_id, gate_name, phone_number')

// After: Uses mpesa_number
select('gate_id, gate_name, mpesa_number')

// Saves to mpesa_number
update({ mpesa_number: phone })
```

## 📁 Files Modified/Created

### Created
- ✅ `components/ongea-pesa/mpesa-settings-dialog.tsx` - Settings popup

### Modified
- ✅ `components/ongea-pesa/permission-manager.tsx` - Added M-Pesa card & auto-show
- ✅ `app/api/gate/deposit/route.ts` - Uses `mpesa_number` column
- ✅ `components/ongea-pesa/main-dashboard.tsx` - Reverted changes

### To Delete (Optional)
- `components/ongea-pesa/deposit-dialog.tsx` - No longer needed
- `DEPOSIT_SETUP_GUIDE.md` - Outdated approach
- `docs/DEPOSIT_FEATURE.md` - Outdated approach
- `GATE_FIX.md` - Can keep for reference

## ✨ Benefits

1. **Centralized Settings** - All in one place (Permissions)
2. **Auto-Detection** - Shows popup only when needed
3. **User-Friendly** - Clear prompts and validation
4. **Persistent** - Saves to database permanently
5. **Flexible** - Can change anytime
6. **Existing Flow** - Uses your existing BalanceSheet for deposits

## 🎯 Next Steps

1. ✅ Test the auto-popup (go to settings with NULL mpesa_number)
2. ✅ Test manual change (click "Change" button)
3. ✅ Test deposit flow (uses saved number)
4. ⏳ Optional: Delete unused deposit-dialog.tsx file

## 💡 Usage

### For Users
1. Login → Go to Settings (gear icon)
2. If no M-Pesa number → Popup auto-shows
3. Enter number → Click "Save M-Pesa Number"
4. Done! Use existing deposit flow

### For Deposits
Your existing BalanceSheet component handles deposits. The API now uses the saved `mpesa_number` automatically.

---

**Everything is integrated with your existing flow! Just test it in settings. 🎉**
