# 🎨 Ongea-Pesa Email Templates Setup

## 📧 How to Update Supabase Email Templates

### Step 1: Access Email Templates
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `efydvozipukolqmynvmv`
3. Click **Authentication** in the left sidebar
4. Click **Email Templates**

### Step 2: Update Templates

You'll see these templates:
- **Confirm signup** - When users sign up
- **Invite user** - When you invite users
- **Magic Link** - For passwordless login
- **Change Email Address** - When users change email
- **Reset Password** - For password resets

---

## ✨ Template: Confirm Signup (Primary)

### What to do:
1. In Supabase, click **Confirm signup** template
2. Copy the HTML from `SUPABASE_EMAIL_TEMPLATE.html`
3. Paste it into the template editor
4. Click **Save**

### Preview:
- Modern gradient design (purple/blue AI theme)
- Large confirmation button
- Feature showcase
- Mobile responsive
- Professional footer

---

## 🔐 Template: Reset Password

### HTML Code:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh;">
  
  <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px;">
    <tr>
      <td align="center">
        
        <table role="presentation" style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 16px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">Ongea-Pesa</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Voice-Powered Payments</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 50px 40px;">
              
              <!-- Icon -->
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; width: 80px; height: 80px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 50%; box-shadow: 0 10px 30px rgba(245, 87, 108, 0.3);">
                  <span style="font-size: 40px; line-height: 80px; color: #ffffff;">🔐</span>
                </div>
              </div>
              
              <!-- Title -->
              <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 28px; font-weight: 700; text-align: center;">Reset Your Password</h2>
              
              <!-- Message -->
              <p style="margin: 0 0 30px 0; color: #4a5568; font-size: 16px; line-height: 1.6; text-align: center;">
                We received a request to reset your password. Click the button below to create a new password.
              </p>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 18px; font-weight: 600; box-shadow: 0 10px 30px rgba(245, 87, 108, 0.4);">
                  🔑 Reset Password
                </a>
              </div>
              
              <!-- Security Notice -->
              <div style="background: #fff5f5; border-left: 4px solid #f5576c; padding: 16px; margin-top: 30px; border-radius: 8px;">
                <p style="margin: 0; color: #742a2a; font-size: 14px; font-weight: 600;">⚠️ Security Notice</p>
                <p style="margin: 8px 0 0 0; color: #742a2a; font-size: 13px; line-height: 1.5;">
                  If you didn't request a password reset, please ignore this email or contact support if you have concerns.
                </p>
              </div>
              
              <!-- Alternative Link -->
              <p style="margin: 30px 0 0 0; color: #718096; font-size: 14px; text-align: center;">
                Button not working? Copy this link:
              </p>
              <p style="margin: 10px 0 0 0; text-align: center;">
                <a href="{{ .ConfirmationURL }}" style="color: #667eea; font-size: 13px; word-break: break-all; text-decoration: underline;">
                  {{ .ConfirmationURL }}
                </a>
              </p>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #2d3748; padding: 30px 40px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #a0aec0; font-size: 14px;">Ongea-Pesa - The Future of Transactions</p>
              <p style="margin: 0; color: #718096; font-size: 12px;">Spoken into existence 🎤✨</p>
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #4a5568;">
                <p style="margin: 0; color: #718096; font-size: 11px;">This link will expire in 1 hour for security.</p>
              </div>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
```

---

## 🔗 Template: Magic Link

### HTML Code:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Magic Link</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh;">
  
  <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px;">
    <tr>
      <td align="center">
        
        <table role="presentation" style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 16px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">Ongea-Pesa</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Voice-Powered Payments</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 50px 40px;">
              
              <!-- Icon -->
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; width: 80px; height: 80px; background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); border-radius: 50%; box-shadow: 0 10px 30px rgba(250, 112, 154, 0.3);">
                  <span style="font-size: 40px; line-height: 80px; color: #ffffff;">✨</span>
                </div>
              </div>
              
              <!-- Title -->
              <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 28px; font-weight: 700; text-align: center;">Your Magic Link is Here! ✨</h2>
              
              <!-- Message -->
              <p style="margin: 0 0 30px 0; color: #4a5568; font-size: 16px; line-height: 1.6; text-align: center;">
                Click the button below to instantly sign in to your Ongea-Pesa account. No password needed!
              </p>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 18px; font-weight: 600; box-shadow: 0 10px 30px rgba(250, 112, 154, 0.4);">
                  🚀 Sign In Now
                </a>
              </div>
              
              <!-- Info Box -->
              <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin-top: 30px; border-radius: 8px;">
                <p style="margin: 0; color: #065f46; font-size: 14px; font-weight: 600;">💡 Quick Tip</p>
                <p style="margin: 8px 0 0 0; color: #065f46; font-size: 13px; line-height: 1.5;">
                  This magic link works only once and expires in 1 hour. Keep your account secure!
                </p>
              </div>
              
              <!-- Alternative Link -->
              <p style="margin: 30px 0 0 0; color: #718096; font-size: 14px; text-align: center;">
                Button not working? Copy this link:
              </p>
              <p style="margin: 10px 0 0 0; text-align: center;">
                <a href="{{ .ConfirmationURL }}" style="color: #667eea; font-size: 13px; word-break: break-all; text-decoration: underline;">
                  {{ .ConfirmationURL }}
                </a>
              </p>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #2d3748; padding: 30px 40px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #a0aec0; font-size: 14px;">Ongea-Pesa - The Future of Transactions</p>
              <p style="margin: 0; color: #718096; font-size: 12px;">Spoken into existence 🎤✨</p>
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #4a5568;">
                <p style="margin: 0; color: #718096; font-size: 11px;">If you didn't request this link, you can safely ignore this email.</p>
              </div>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
```

---

## 🎨 Design Features

### Color Scheme:
- **Primary Gradient**: Purple to Blue (`#667eea` → `#764ba2`)
- **Accent Colors**: 
  - Confirm: Purple/Blue gradient
  - Reset Password: Pink/Red gradient
  - Magic Link: Pink/Yellow gradient

### Typography:
- **Headings**: System fonts (SF Pro, Segoe UI, Roboto)
- **Sizes**: 32px (brand), 28px (title), 16px (body)
- **Weights**: 700 (bold), 600 (semibold), 400 (regular)

### Components:
- ✅ Gradient header with brand
- ✅ Icon circles with shadows
- ✅ Large CTA buttons with gradients
- ✅ Feature showcase (signup only)
- ✅ Security notices (password reset)
- ✅ Alternative text links
- ✅ Professional footer
- ✅ Mobile responsive

---

## 📱 Mobile Responsive

All templates are mobile-friendly:
- Max width: 600px
- Padding adjusts for small screens
- Buttons are touch-friendly (48px min height)
- Text is readable (16px minimum)

---

## ✅ Setup Checklist

- [ ] Go to Supabase Dashboard → Authentication → Email Templates
- [ ] Update **Confirm signup** template with `SUPABASE_EMAIL_TEMPLATE.html`
- [ ] Update **Reset Password** template (copy from above)
- [ ] Update **Magic Link** template (copy from above)
- [ ] Test each template by triggering the action
- [ ] Check emails on mobile and desktop
- [ ] Verify all links work correctly

---

## 🧪 Testing Templates

### Test Confirm Signup:
1. Sign up with a new email at `https://ongeapesa.vercel.app/signup`
2. Check email for new design
3. Click button → Should confirm account

### Test Reset Password:
1. Go to login page
2. Click "Forgot Password"
3. Enter email
4. Check email for new design

### Test Magic Link:
1. Enable magic link in Supabase settings
2. Request magic link from login page
3. Check email for new design

---

## 🎯 Benefits

✅ **Professional appearance** - Modern gradient design  
✅ **Brand consistency** - Matches Ongea-Pesa theme  
✅ **Better UX** - Clear CTAs and messaging  
✅ **Mobile friendly** - Responsive on all devices  
✅ **Security focused** - Clear security notices  
✅ **AI aesthetic** - Futuristic purple/blue theme  

---

## 💡 Pro Tips

1. **Test before deploying**: Use Supabase's preview feature
2. **Keep it simple**: Don't add too many images (email clients block them)
3. **Use inline CSS**: Email clients don't support external stylesheets
4. **Test on multiple clients**: Gmail, Outlook, Apple Mail, etc.
5. **Keep under 102KB**: Large emails may be clipped

---

## 🆘 Troubleshooting

### Styles not showing:
- Make sure all CSS is inline (in `style=""` attributes)
- Avoid external stylesheets or `<style>` tags

### Images not loading:
- Use emoji instead of images (they work everywhere)
- Or use absolute URLs for images

### Links not working:
- Verify `{{ .ConfirmationURL }}` is correct
- Check Supabase redirect URLs are configured

---

**Time to setup**: ~10 minutes  
**Impact**: Professional, branded emails! ✨
