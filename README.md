# Aether Messenger: Next-Gen Web + Mobile Web / PWA Messaging Platform

Aether Messenger is a high-performance, white-label, real-time messaging, audio/video calling, and collaboration platform engineered with an original futuristic aesthetic for modern Web and Mobile Web/PWA devices.

> **NON-E2EE ARCHITECTURE DISCLOSURE**: This platform explicitly uses a **non-E2EE architecture**. Messages and media files are encrypted in transit via TLS 1.3 and encrypted at rest with AES-256. Message contents are indexed and processed on authorized servers to support instant multi-device search, administrative backups, content moderation, abuse reporting, and compliance synchronization. It does not advertise, claim, or implement end-to-end encryption.

---

## Key Highlights

- **Original Futuristic Design**: Obsidian deep-space aesthetic with cyber cyan, electric blue, and orbital violet accents. Dark, Light, and AMOLED modes with zero generic AI clutter.
- **Unified Real-Time Messaging**: 1-to-1 chats, group chats, community channels, and admin-only broadcast groups powered by authoritative WebSockets.
- **WebRTC Audio & Video Calling**: Voice and video calling with live audio waveforms, local and remote video grids, device mute, camera toggling, and screen sharing.
- **Voice Messages**: Web Audio recording, real-time waveform visualization, play/pause, seek scrubbing, duration timer, and 1x/1.5x/2x playback speed toggle.
- **Rich Media & Attachments**: Images, videos, voice notes, PDFs, documents, archives, shared locations with coordinate cards, and contacts.
- **Interactive Expressions**: Multi-reaction engine, emoji bar, animated and static sticker packs, and curated GIF search.
- **Verified Account Badges**: Multi-tier verification system (Individual, Business, Organization, Official Account) with admin review workflow and anti-fraud expiration controls.
- **Comprehensive Verification & Security**: Email OTP, configurable SMS provider OTP, login anomaly detection, TOTP MFA with backup codes, and WebAuthn hardware passkeys.
- **Granular RBAC Admin Console**: Dedicated dashboard for Super Admins, Admins, Moderators, and Support staff with immutable audit logging.
- **Full-Text Server-Side Search**: Instant indexing across users, usernames, chats, message bodies, and media.
- **Disappearing Messages**: Automated lifecycle expiration (Off, 24 Hours, 7 Days, 30 Days).
- **100% White-Label Ready**: Dynamic runtime variables (`APP_NAME`, `APP_DOMAIN`, `APP_LOGO`, colors, company info, legal links) propagating instantly across the UI, PWA manifest, metadata, and email templates.
- **Production PostgreSQL DDL**: Full schema with constraints, foreign keys, triggers, and full-text search indexes (`server/schema.sql`).
- **PWA & Mobile-First Touch Ergonomics**: Installable web manifest, offline cached shell, and minimum 44px hitboxes.

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Launch fullstack development server on port 3000
npm run dev

# 3. Build for production
npm run build
npm start
```
