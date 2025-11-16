# Password Recovery Setup Guide

This guide explains how to configure and use the password recovery flow for Ongea Pesa.

## Overview

The password recovery system consists of three main components:

1. **Forgot Password Page** (`/forgot-password`) - Where users request a password reset
2. **Reset Password Page** (`/reset-password`) - Where users set their new password
3. **Supabase Email Configuration** - Email templates and settings

## User Flow

```
User clicks "Forgot Password?" on login page
  ↓
User enters email on /forgot-password
  ↓
Supabase sends password reset email
  ↓
User clicks link in email
  ↓
User redirected to /reset-password
  ↓
User enters new password
  ↓
User redirected to /login
```

## Supabase Configuration

### 1. Configure Email Templates

Go to your Supabase Dashboard:

1. Navigate to **Authentication** → **Email Templates**
2. Select **Reset Password** template
3. Update the template with the following:

**Subject:**
```
Reset Your Ongea Pesa Password
```

**Body (HTML):**
```html
<h2>Reset Your Password</h2>
<p>Hi there,</p>
<p>We received a request to reset your password for your Ongea Pesa account.</p>
<p>Click the button below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a></p>
<p>Or copy and paste this link into your browser:</p>
<p>{{ .ConfirmationURL }}</p>
<p>This link will expire in 60 minutes.</p>
<p>If you didn't request a password reset, you can safely ignore this email.</p>
<br>
<p>Thanks,<br>The Ongea Pesa Team</p>
```

### 2. Configure Site URL

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to your production domain (e.g., `https://your-domain.com`)
3. Add redirect URLs:
   - `https://your-domain.com/reset-password`
   - `http://localhost:3000/reset-password` (for development)

### 3. Configure Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. In **Redirect URLs**, add:
   ```
   https://your-domain.com/**
   http://localhost:3000/**
   ```

## Environment Variables

Ensure you have the following in your `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # Update for production
```

## Testing the Flow

### Local Testing

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/login`

3. Click **"Forgot Password?"**

4. Enter a valid email address

5. Check your email inbox (and spam folder)

6. Click the reset link in the email

7. Enter a new password (minimum 6 characters)

8. Confirm the password matches

9. Click **"Update Password"**

10. You'll be redirected to the login page

### Production Testing

1. Deploy your application with proper environment variables

2. Update `NEXT_PUBLIC_SITE_URL` to your production domain

3. Follow the same testing steps as local testing

## Security Features

- **Token Expiration**: Reset links expire after 60 minutes
- **One-Time Use**: Each reset link can only be used once
- **Password Requirements**: Minimum 6 characters (configurable)
- **Session Validation**: Ensures valid token before allowing password reset
- **Secure Redirects**: Only allows whitelisted redirect URLs

## Troubleshooting

### Email Not Received

1. Check spam/junk folder
2. Verify email is correct in Supabase Auth Users
3. Check Supabase email logs in Dashboard → Logs
4. Ensure SMTP is configured in Supabase (if using custom SMTP)

### "Invalid or Expired Reset Link"

- Link may have expired (60 minutes)
- Link may have already been used
- Request a new reset link from `/forgot-password`

### Password Not Updating

1. Check browser console for errors
2. Verify Supabase connection
3. Ensure password meets minimum requirements (6+ characters)
4. Check that passwords match

### Redirect Not Working

1. Verify `NEXT_PUBLIC_SITE_URL` is set correctly
2. Check redirect URLs in Supabase Dashboard
3. Ensure URL includes protocol (http:// or https://)

## API Reference

### Supabase Auth Methods Used

```typescript
// Request password reset
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${siteUrl}/reset-password`,
});

// Update password
await supabase.auth.updateUser({
  password: newPassword,
});

// Check session
const { data: { session } } = await supabase.auth.getSession();
```

## Customization

### Change Password Requirements

Edit `app/reset-password/page.tsx`:

```typescript
// Change minimum length
if (password.length < 8) {  // Changed from 6 to 8
  setError('Password must be at least 8 characters long');
  return;
}

// Add complexity requirements
const hasUpperCase = /[A-Z]/.test(password);
const hasLowerCase = /[a-z]/.test(password);
const hasNumbers = /\d/.test(password);
const hasSpecialChar = /[!@#$%^&*]/.test(password);

if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
  setError('Password must contain uppercase, lowercase, number, and special character');
  return;
}
```

### Customize Email Template

You can fully customize the email template in Supabase Dashboard with:
- Custom branding/logo
- Different colors
- Additional information
- Multiple languages

### Change Token Expiration

In Supabase Dashboard:
1. Go to **Authentication** → **Settings**
2. Adjust **JWT Expiry** (default is 3600 seconds = 60 minutes)

## Support

For additional help:
- Check Supabase docs: https://supabase.com/docs/guides/auth/auth-password-reset
- Review the implementation in `/app/forgot-password/page.tsx` and `/app/reset-password/page.tsx`
