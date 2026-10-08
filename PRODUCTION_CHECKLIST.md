# PRODUCTION CONFIGURATION CHECKLIST

Everything else in the platform is fully implemented, verified, and operational. Below is the checklist containing only what you personally need to configure before launching:

- [ ] **1. Domain Name & DNS**: Point your domain `A` / `CNAME` records to your server IP or cloud load balancer.
- [ ] **2. Brand Name & Identity**: Update `APP_NAME`, `APP_SHORT_NAME`, and `APP_DESCRIPTION` in the Operations Console or `.env`.
- [ ] **3. Logo & Favicon**: Replace `public/icon.svg` with your company SVG logo.
- [ ] **4. Brand Colors**: Choose your primary, secondary, and accent colors in the Admin Console live branding editor.
- [ ] **5. Company & Legal Information**: Set `COMPANY_NAME`, `COMPANY_ADDRESS`, and `SUPPORT_EMAIL` in branding settings.
- [ ] **6. Production Database (PostgreSQL)**: Provide your `DATABASE_URL` and run `psql -f server/schema.sql`.
- [ ] **7. SMTP Credentials**: Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, and `SMTP_FROM_EMAIL`.
- [ ] **8. SMS Provider**: Select your SMS provider (Twilio, MessageBird, AWS SNS, Infobip) and provide your API Key and Sender ID.
- [ ] **9. Object Storage (S3-Compatible)**: Configure your S3 bucket name and access keys for persistent media uploads.
- [ ] **10. WebRTC TURN Server**: Configure your TURN server credentials for symmetric NAT firewall traversal.
- [ ] **11. Web Push Credentials**: Generate VAPID keys for browser push notifications.
- [ ] **12. SSL / TLS Certificate**: Ensure Let's Encrypt or your SSL certificate is active for HTTPS and secure WebSocket (`wss://`) traffic.
