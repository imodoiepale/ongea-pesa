# Ongea Pesa PWA Setup Guide

This guide explains how to set up and use the Progressive Web App (PWA) features in Ongea Pesa.

## Installation

First, install the required packages:

```bash
npm i @ducanh2912/next-pwa && npm i -D webpack --legacy-peer-deps
```

## Features Implemented

### 1. PWA Configuration (`next.config.mjs`)

- Service worker generation with workbox
- Aggressive caching strategies for fonts, images, and static assets
- Network-first strategy for dynamic data
- Automatic service worker registration

### 2. Web App Manifest (`app/manifest.ts`)

- App name, description, and branding
- Multiple icon sizes for all devices
- App shortcuts for quick actions (Scan & Pay, Send Money, Voice)
- Standalone display mode
- Portrait orientation lock

### 3. Contact Picker API (`hooks/use-contacts.ts`)

Access native device contacts using the Contact Picker API:

```typescript
import { useContacts, formatPhoneNumber, getContactDisplayName } from "@/hooks/use-contacts";

function MyComponent() {
  const { isSupported, isLoading, selectSingleContact, selectContacts } = useContacts();

  const handlePickContact = async () => {
    const contact = await selectSingleContact();
    if (contact) {
      console.log("Selected:", getContactDisplayName(contact));
      console.log("Phone:", formatPhoneNumber(contact.tel));
    }
  };

  return (
    <button onClick={handlePickContact} disabled={!isSupported || isLoading}>
      Pick Contact
    </button>
  );
}
```

**Note:** Contact Picker API is only available on:
- Chrome 80+ on Android
- Requires HTTPS (works on localhost for development)

### 4. PWA Install Prompt (`components/ongea-pesa/pwa-install-prompt.tsx`)

Automatically shows install prompts:
- Chrome/Edge: Native install banner with custom UI
- iOS Safari: Instructions for "Add to Home Screen"
- Remembers dismissal for 7 days

### 5. OpenGraph Images (`app/opengraph-image.tsx`, `app/twitter-image.tsx`)

Dynamic social sharing images generated at build time:
- 1200x630 resolution
- Ongea Pesa branding
- Feature highlights

### 6. Offline Support (`app/offline/page.tsx`)

Fallback page when user is offline with:
- Retry functionality
- Clear status indication
- Navigation options

### 7. Service Worker (`public/sw.js`)

Custom service worker with:
- Push notification support
- Background sync for offline transactions
- Notification click handling

## Required Assets

### Icons (place in `public/icons/`)

| File | Size | Purpose |
|------|------|---------|
| `icon-72x72.png` | 72x72 | Android |
| `icon-96x96.png` | 96x96 | Android |
| `icon-128x128.png` | 128x128 | Android |
| `icon-144x144.png` | 144x144 | Android |
| `icon-152x152.png` | 152x152 | iOS |
| `icon-167x167.png` | 167x167 | iPad Pro |
| `icon-180x180.png` | 180x180 | iPhone |
| `icon-192x192.png` | 192x192 | PWA default |
| `icon-384x384.png` | 384x384 | High-res |
| `icon-512x512.png` | 512x512 | PWA splash |
| `favicon-16x16.png` | 16x16 | Favicon |
| `favicon-32x32.png` | 32x32 | Favicon |
| `badge-72x72.png` | 72x72 | Notification badge |

### Splash Screens (place in `public/splash/`)

See `public/splash/README.md` for full list of required splash screen sizes.

## Icon Generation

Use these tools to generate all required icons from a single 512x512 source:

1. **Real Favicon Generator**: https://realfavicongenerator.net/
2. **PWA Builder**: https://www.pwabuilder.com/imageGenerator
3. **Maskable.app**: https://maskable.app/editor

## Testing PWA

### Local Testing

```bash
# Build and start production server
npm run build
npm start

# Or use HTTPS in development
npm run dev -- --experimental-https
```

### PWA Checklist

1. **Installability**
   - [ ] Manifest is valid
   - [ ] Service worker is registered
   - [ ] All icons are present
   - [ ] Served over HTTPS

2. **Offline Support**
   - [ ] App shell loads offline
   - [ ] Offline page displays correctly
   - [ ] Cached assets load without network

3. **Contact Picker**
   - [ ] Works on supported browsers
   - [ ] Graceful fallback on unsupported browsers
   - [ ] Phone numbers formatted correctly

4. **Install Prompt**
   - [ ] Shows on first visit (Chrome/Android)
   - [ ] iOS instructions display correctly
   - [ ] Dismissal is remembered

## Browser Support

| Feature | Chrome | Safari | Firefox | Edge |
|---------|--------|--------|---------|------|
| PWA Install | ✅ | ✅ (iOS) | ❌ | ✅ |
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| Contact Picker | ✅ (Android) | ❌ | ❌ | ✅ (Android) |
| Push Notifications | ✅ | ✅ (iOS 16.4+) | ✅ | ✅ |

## Troubleshooting

### Service Worker Not Registering

- Ensure you're on HTTPS or localhost
- Check browser console for errors
- Clear browser cache and service workers

### Contact Picker Not Working

- Only works on Chrome/Edge on Android
- Requires secure context (HTTPS)
- User must grant permission

### Install Prompt Not Showing

- PWA criteria not met (check Lighthouse)
- User dismissed recently (7-day cooldown)
- Already installed

## Files Created

```
app/
├── manifest.ts              # Web app manifest
├── opengraph-image.tsx      # OG image generator
├── twitter-image.tsx        # Twitter card image
├── offline/
│   └── page.tsx            # Offline fallback page
├── layout.tsx              # Updated with PWA meta tags

components/ongea-pesa/
├── pwa-install-prompt.tsx  # Install prompt component
├── contact-picker.tsx      # Contact picker UI component
├── send-money.tsx          # Updated with contact picker

hooks/
└── use-contacts.ts         # Contact Picker API hook

public/
├── sw.js                   # Service worker
├── icons/
│   └── README.md          # Icon requirements
└── splash/
    └── README.md          # Splash screen requirements

next.config.mjs             # PWA configuration
.gitignore                  # Updated for PWA files
```
