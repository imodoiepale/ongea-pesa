# Payment Gate Integration

## Overview

The payment gate integration automatically creates a payment gateway account for each new user during signup. This integration uses the external payment API to create gates and stores the gate information in the user's profile.

## How It Works

### 1. User Signup Flow

When a user signs up:
1. User enters email and password
2. Supabase creates auth user
3. Profile trigger creates profile record
4. **Gate creation API is called**
5. Gate ID and name are saved to the user's profile

### 2. Gate Creation Process

```
User Email: john.doe@example.com
    ↓
Gate Name: john.doe (extracted from email)
    ↓
API Call to: https://aps.co.ke/indexpay/api/get_transactions_2.php
    ↓
Response: { gate_id: 329, gate_name: "john.doe" }
    ↓
Save to profiles table
```

## API Endpoint

### POST `/api/gate/signup`

Creates a payment gate for a new user during signup.

**Request Body:**
```json
{
  "email": "user@example.com",
  "userId": "uuid-of-user"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Gate created successfully",
  "gate_id": 329,
  "gate_name": "user"
}
```

### POST `/api/gate/create`

Creates a payment gate for an authenticated user (used for manual gate creation).

**Headers:**
```
Authorization: Bearer <supabase-token>
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

## External API Details

### Endpoint
```
POST https://aps.co.ke/indexpay/api/get_transactions_2.php
```

### Request Parameters

| Field | Value | Description |
|-------|-------|-------------|
| `request` | "7" | Request type for gate creation |
| `user_email` | "info@nsait.co.ke" | Fixed email for authentication |
| `gate_name` | User's email prefix | E.g., "john.doe" from "john.doe@example.com" |
| `gate_currency` | "KES" | Kenyan Shillings |
| `gate_description` | "USER WALLET FOR {gate_name}" | Description template |
| `pocket_name` | "ongeapesa_wallet" | Fixed pocket name |
| `gate_account_name` | "0" | Default value |
| `gate_account_no` | "0" | Default value |
| `gate_bank_name` | "0" | Default value |
| `gate_bank_branch` | "" | Empty |
| `gate_swift_code` | "" | Empty |

### Response Format

**Success:**
```json
{
  "status": true,
  "Message": "gate add success",
  "gate_id": 329,
  "gate_name": "gate_test111"
}
```

**Error:**
```json
{
  "status": false,
  "Message": "Error message here"
}
```

## Database Schema

The gate information is stored in the `users` table:

```sql
ALTER TABLE public.users
ADD COLUMN gate_id INTEGER,
ADD COLUMN gate_name VARCHAR(255);
```

## Environment Variables

Add to `.env.local`:

```bash
# Supabase (required for gate creation)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**Important:** The `SUPABASE_SERVICE_ROLE_KEY` is required to bypass Row Level Security (RLS) during initial user setup.

## Security Considerations

1. **Service Role Key**: Only used server-side for initial profile setup
2. **No Authentication Required**: The `/api/gate/signup` endpoint doesn't require authentication but validates the userId
3. **Error Handling**: Signup succeeds even if gate creation fails (non-blocking)
4. **Logging**: All gate creation attempts are logged for debugging

## Testing

### 1. Test Signup with Gate Creation

```bash
# Start development server
npm run dev

# Navigate to signup page
# Enter email: test@example.com
# Enter password: ********

# After signup, check database:
# - Profile should have gate_id and gate_name populated
# - Gate name should be "test"
```

### 2. Manual Gate Creation Test

```bash
# Using authenticated API
curl -X POST http://localhost:3000/api/gate/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -d '{"email": "user@example.com"}'
```

## Troubleshooting

### Gate Creation Fails

**Symptom:** User profile created but no gate_id

**Solutions:**
1. Check external API availability
2. Verify network connectivity
3. Check API response format
4. Review server logs for errors

### Missing Service Role Key

**Symptom:** Error: "SUPABASE_SERVICE_ROLE_KEY is not defined"

**Solution:**
Add the service role key to your `.env.local`:
```bash
SUPABASE_SERVICE_ROLE_KEY=your_key_here
```

Get it from: Supabase Dashboard → Settings → API → service_role key

### Gate Already Exists

**Symptom:** External API returns error about duplicate gate

**Solution:**
Use a different email or contact the external API provider to manage duplicate gates.

## Migration

Run the migration to add gate fields to existing profiles:

```sql
-- File: database/migrations/004_add_gate_fields.sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gate_id INTEGER,
ADD COLUMN IF NOT EXISTS gate_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_profiles_gate_id ON public.profiles(gate_id);
```

## Future Enhancements

- [ ] Retry mechanism for failed gate creations
- [ ] Background job to create gates for users without them
- [ ] Gate status monitoring
- [ ] Support for multiple gates per user
- [ ] Gate balance sync with profile wallet
