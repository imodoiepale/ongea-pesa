# ✅ Signup Redirect Fix - No More Localhost!

## 🐛 Problem Fixed
When users signed up online, the confirmation email redirected them to `localhost` instead of your production URL.

## ✅ Solution Applied

### 1. Added Site URL Configuration
**File: `.ENV` and `env.example`**
```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 2. Updated Signup Page
**File: `app/signup/page.tsx`**
- Now uses `emailRedirectTo` option in `signUp()`
- Automatically uses production URL when deployed
- Falls back to `window.location.origin` if env var not set

### 3. Created Auth Confirmation Routes
**File: `app/auth/confirm/page.tsx`**
- Handles email confirmation redirects (both hash and code-based)
- Works with both implicit flow and PKCE flow
- Exchanges code/tokens for session
- Redirects to dashboard after confirmation

**File: `app/auth/callback/route.ts`**
- Server-side callback handler for PKCE flow
- Handles errors gracefully

---

## 🚀 Deployment Instructions

### For Local Development
Your `.ENV` file is already configured:
```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### For Production (Vercel/Railway)

#### Step 1: Add Environment Variable
In your Vercel/Railway dashboard, add:
```bash
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

**Replace `your-app.vercel.app` with your actual production domain!**

#### Step 2: Configure Supabase
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Add these URLs to **Redirect URLs**:
   ```
   https://ongeapesa.vercel.app/auth/confirm
   https://ongeapesa.vercel.app/auth/callback
   http://localhost:3000/auth/confirm
   http://localhost:3000/auth/callback
   ```

#### Step 3: Deploy
```bash
git add .
git commit -m "Fix signup redirect to production URL"
git push origin main
```

Vercel will auto-deploy! ✅

---

## 🧪 Testing

### Test Locally
1. Start dev server: `npm run dev`
2. Go to `http://localhost:3000/signup`
3. Sign up with a new email
4. Check your email - link should point to `http://localhost:3000/auth/callback`
5. Click link → Should redirect to dashboard

### Test Production
1. Go to `https://your-app.vercel.app/signup`
2. Sign up with a new email
3. Check your email - link should point to `https://your-app.vercel.app/auth/callback`
4. Click link → Should redirect to dashboard

---

## 📋 What Changed

### Before ❌
```typescript
await supabase.auth.signUp({
  email,
  password,
});
// Email link → http://localhost:3000 (hardcoded by Supabase)
```

### After ✅
```typescript
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${siteUrl}/auth/callback`,
  },
});
// Email link → Uses your production URL!
```

---

## 🔧 Troubleshooting

### Email still shows localhost
**Solution**: 
1. Make sure `NEXT_PUBLIC_SITE_URL` is set in Vercel environment variables
2. Redeploy your app
3. Clear browser cache

### "Invalid redirect URL" error
**Solution**: 
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add your callback URL to allowed redirect URLs:
   ```
   https://your-app.vercel.app/auth/callback
   ```

### Callback redirects to wrong page
**Solution**: 
- Check `app/auth/callback/route.ts` - it redirects to `/dashboard`
- Change the redirect URL if needed:
  ```typescript
  return NextResponse.redirect(`${origin}/your-page`)
  ```

---

## ✅ Success Checklist

- [x] Added `NEXT_PUBLIC_SITE_URL` to `.ENV`
- [x] Updated signup to use `emailRedirectTo`
- [x] Created `/auth/callback` route
- [ ] Set `NEXT_PUBLIC_SITE_URL` in Vercel (when deploying)
- [ ] Added callback URL to Supabase allowed redirects
- [ ] Tested signup flow in production

---

## 🎉 Benefits

✅ **Users get correct production URL** in confirmation emails  
✅ **Works in both dev and production** automatically  
✅ **No more localhost confusion** for online signups  
✅ **Proper auth flow** with callback handling  
✅ **Better UX** - seamless signup experience  

---

## 📝 Notes

- The `emailRedirectTo` parameter tells Supabase where to send users after email confirmation
- The callback route exchanges the confirmation code for a session
- Environment variable allows different URLs for dev vs production
- Fallback to `window.location.origin` ensures it works even without env var
