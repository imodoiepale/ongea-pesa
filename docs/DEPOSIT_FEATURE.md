# 💰 Deposit Feature - M-Pesa Integration

## Overview
Users can add money to their Ongea Pesa wallet via M-Pesa through a beautiful, user-friendly deposit dialog.

## Features

### ✅ What's Included

1. **Deposit API Endpoint** (`/api/gate/deposit`)
   - Validates phone numbers (Kenyan format)
   - Validates deposit amounts (min KSh 10)
   - Auto-saves phone as default
   - Integrates with external gate API
   - Real-time M-Pesa STK push

2. **Deposit Dialog Component**
   - Pre-fills user's phone number
   - Displays user's gate name
   - Amount input with quick presets (50, 100, 500, 1000)
   - Phone number formatting
   - Real-time validation
   - Success/error messaging
   - Auto-closes after success

3. **Dashboard Integration**
   - "Add Money" quick action card
   - Seamless UI/UX
   - Balance auto-refresh after deposit

## How It Works

### User Flow
1. User clicks "Add Money" card on dashboard
2. Deposit dialog opens with:
   - Pre-filled phone number (from profile)
   - Gate name display
   - Amount input field
3. User enters/confirms phone and amount
4. Clicks "Deposit via M-Pesa"
5. M-Pesa STK push sent to phone
6. User enters M-Pesa PIN on phone
7. Transaction completes
8. Balance updates automatically

### Technical Flow
```
Dashboard → Deposit Dialog → /api/gate/deposit → External Gate API → M-Pesa
                ↓
          Update Profile → Refresh Balance
```

## API Reference

### POST `/api/gate/deposit`

**Request Body:**
```json
{
  "amount": 100,
  "phone": "0712345678"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Deposit initiated successfully. Check your phone for M-Pesa prompt.",
  "transaction_data": {
    "amount": 100,
    "phone": "0712345678",
    "gate_name": "ijepale",
    "transaction_id": "ABC123",
    ...
  }
}
```

**Response (Error):**
```json
{
  "error": "Invalid phone number. Use format: 0712345678 or +254712345678"
}
```

### External API Integration

**Endpoint:** `https://aps.co.ke/indexpay/api/gate_deposit.php`

**Parameters:**
- `user_email`: "info@nsait.co.ke"
- `request`: "1"
- `transaction_intent`: "Deposit"
- `phone`: User's phone number
- `amount`: Deposit amount
- `currency`: "KES"
- `gate_name`: User's gate name
- `pocket_name`: "ongeapesa_wallet"
- `payment_mode`: "MPESA"

## Phone Number Validation

Accepts Kenyan phone formats:
- `0712345678` (Safaricom)
- `0112345678` (Airtel)
- `+254712345678` (International format)
- `+254112345678` (International Airtel)

## Amount Validation

- Minimum: KSh 10
- Must be positive number
- Decimal amounts allowed
- No maximum (set by external API)

## Database Updates

When deposit is initiated:
1. User's `phone_number` is updated/saved in `profiles` table
2. This becomes their default for future deposits
3. Balance will be updated by external API/webhook (depends on your integration)

## UI Components

### Deposit Dialog (`components/ongea-pesa/deposit-dialog.tsx`)

**Props:**
- `isOpen: boolean` - Controls dialog visibility
- `onClose: () => void` - Called when dialog closes
- `onSuccess?: (amount: number) => void` - Called after successful deposit

**Features:**
- Glassmorphism design
- Dark mode support
- Loading states
- Error handling
- Phone number formatting
- Quick amount presets
- Info tooltip

### Dashboard Integration (`components/ongea-pesa/main-dashboard.tsx`)

**Changes Made:**
1. Added `ArrowDownToLine` icon import
2. Added `isDepositDialogOpen` state
3. Added "Add Money" quick action card
4. Added `<DepositDialog>` component
5. Added `fetchBalance()` helper function

## Testing

### Test Deposit Flow

1. **Login** to your account
2. **Click** "Add Money" card
3. **Enter/Confirm** phone number
4. **Enter** amount (e.g., 100)
5. **Click** "Deposit via M-Pesa"
6. **Check** phone for M-Pesa prompt
7. **Enter** M-Pesa PIN
8. **Verify** balance updates

### Test Cases

✅ Valid deposit (KSh 100)
✅ Minimum amount (KSh 10)
❌ Below minimum (KSh 5) - should error
❌ Invalid phone (123) - should error
❌ Empty fields - should error
✅ Phone number saves as default
✅ Quick preset buttons work
✅ Dialog closes on success
✅ Balance refreshes after deposit

## Security

- ✅ User authentication required
- ✅ Server-side validation
- ✅ Phone number sanitization
- ✅ Amount validation
- ✅ Gate name verification
- ✅ No hardcoded credentials
- ✅ Uses external secure API

## Future Enhancements

1. **Transaction History** - Show deposit history
2. **Multiple Payment Methods** - Add card, bank transfer
3. **Recurring Deposits** - Auto-top-up feature
4. **Deposit Limits** - Daily/monthly limits
5. **Notifications** - SMS/Email confirmations
6. **Webhooks** - Real-time balance updates
7. **Promo Codes** - Bonus on deposits
8. **Transaction Receipts** - PDF generation

## Troubleshooting

### Common Issues

**Issue:** "Failed to fetch user profile"
- **Solution:** Ensure `gate_name` column exists in profiles table
- Run migration: `002_add_gate_fields_to_profiles.sql`

**Issue:** "No payment gate found"
- **Solution:** User needs a gate created first
- Run `/api/gate/ensure` endpoint

**Issue:** "M-Pesa prompt not received"
- **Solution:** Check phone number format
- Verify external API credentials
- Check M-Pesa service status

**Issue:** "Balance not updating"
- **Solution:** Refresh the page
- Check webhook integration
- Verify external API response

## Code Files

### Created Files
1. `/app/api/gate/deposit/route.ts` - API endpoint
2. `/components/ongea-pesa/deposit-dialog.tsx` - UI component
3. `/docs/DEPOSIT_FEATURE.md` - This documentation

### Modified Files
1. `/components/ongea-pesa/main-dashboard.tsx` - Added deposit button & dialog

## Next Steps

1. ✅ Run database migration for `gate_id` and `gate_name`
2. ✅ Test deposit flow with test M-Pesa number
3. ⏳ Set up webhook for balance updates (if needed)
4. ⏳ Add transaction logging
5. ⏳ Add deposit confirmation notifications

---

**Built with ❤️ for Ongea Pesa**
