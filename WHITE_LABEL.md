# WHITE-LABEL ARCHITECTURE & BRANDING CUSTOMIZATION

Aether Messenger contains a fully decentralized, centralized configuration system allowing operators to rebrand the entire application dynamically.

## 1. Centralized Branding Configuration Variables

Changing these parameters updates the application in real time without code modifications:

```json
{
  "appName": "Aether Messenger",
  "appShortName": "Aether",
  "appDomain": "https://aether.app",
  "appLogo": "/icon.svg",
  "appLogoDark": "/icon.svg",
  "appFavicon": "/icon.svg",
  "primaryColor": "#06b6d4",
  "secondaryColor": "#3b82f6",
  "accentColor": "#8b5cf6",
  "description": "Futuristic white-label real-time messaging, audio/video calling, and collaboration platform.",
  "companyName": "Aether Communications Inc.",
  "companyAddress": "100 Innovation Boulevard, Tech District, CA 94105",
  "supportEmail": "support@aether.app",
  "privacyUrl": "/privacy",
  "termsUrl": "/terms",
  "cookiesUrl": "/cookies"
}
```

## 2. Automatic Cross-Surface Propagation

When updated via `PUT /api/admin/branding` or the Operations Console:
1. **Web App UI**: Headers, sidebars, logos, and accent highlights refresh instantly.
2. **Document Title & Meta**: Document title, OpenGraph cards, and Twitter meta update.
3. **PWA Manifest**: Manifest name, short name, and theme colors sync automatically.
4. **Email Templates**: All 12 email templates inject the updated brand logo, colors, company name, address, and legal links.
5. **Legal & Compliance Pages**: Privacy policies, terms of service, and cookie disclosures reference the updated company name and support email.
6. **Zero Hardcoded Brand Names**: No proprietary or hardcoded names exist within component markup.
