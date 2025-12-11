# PWA Icons

Place the following icon files in this directory for the PWA to work correctly.

## Required Icons

| Filename | Size | Purpose |
|----------|------|---------|
| `icon-72x72.png` | 72x72 | Android maskable |
| `icon-96x96.png` | 96x96 | Android maskable |
| `icon-128x128.png` | 128x128 | Android maskable |
| `icon-144x144.png` | 144x144 | Android |
| `icon-152x152.png` | 152x152 | Apple touch icon |
| `icon-167x167.png` | 167x167 | iPad Pro touch icon |
| `icon-180x180.png` | 180x180 | iPhone touch icon |
| `icon-192x192.png` | 192x192 | Android, PWA default |
| `icon-384x384.png` | 384x384 | Android high-res |
| `icon-512x512.png` | 512x512 | PWA splash, maskable |
| `favicon-16x16.png` | 16x16 | Favicon small |
| `favicon-32x32.png` | 32x32 | Favicon standard |
| `badge-72x72.png` | 72x72 | Notification badge |

## Optional Shortcut Icons

| Filename | Size | Purpose |
|----------|------|---------|
| `scan-icon.png` | 96x96 | Scan & Pay shortcut |
| `send-icon.png` | 96x96 | Send Money shortcut |
| `voice-icon.png` | 96x96 | Voice Assistant shortcut |

## Icon Generation Tools

You can generate all required icons from a single high-resolution source image (512x512 or larger) using:

1. **Real Favicon Generator**: https://realfavicongenerator.net/
2. **PWA Asset Generator**: https://www.pwabuilder.com/imageGenerator
3. **Maskable.app**: https://maskable.app/editor (for maskable icons)

## Design Guidelines

- **Safe Zone**: For maskable icons, keep important content within the center 80%
- **Background**: Use a solid background color (#22c55e green recommended for Ongea Pesa)
- **Format**: PNG with transparency or solid background
- **Style**: Consistent with the Ongea Pesa brand (green/emerald gradient, microphone icon)

## Example Icon Design

The Ongea Pesa icon should feature:
- Green gradient background (#22c55e to #16a34a)
- White microphone icon in center
- Rounded corners for maskable versions
