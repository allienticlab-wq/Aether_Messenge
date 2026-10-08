# ARCHITECTURE OVERVIEW

Aether Messenger utilizes a modular, decoupled full-stack architecture optimized for low-latency bidirectional messaging, rich media delivery, audited moderation, and multitenant white-label customization.

```
+-------------------------------------------------------------------------+
|                              CLIENT LAYER                               |
|   React 19 + TypeScript + Tailwind CSS (Desktop 3-Pane + Mobile PWA)    |
|   AudioContext Waveforms + WebRTC Media Streams + WebAuthn Passkeys     |
+-------------------------------------------------------------------------+
                                    |
            REST (HTTPS/JSON)       |       WebSockets (ws:// / wss://)
                                    v
+-------------------------------------------------------------------------+
|                             GATEWAY & API                               |
|   Express 4 Server + Vite Middleware Pipeline + WebSocket Hub           |
|   Session Auth & RBAC Interceptors + Rate Limiters + Audit Logger       |
+-------------------------------------------------------------------------+
          |                         |                         |
          v                         v                         v
+-------------------+     +-------------------+     +-------------------+
|  DATA & STORAGE   |     |    COMMUNICATION  |     | TRUST & SAFETY    |
|  PostgreSQL DDL   |     |  Email Templates  |     | Verification Q    |
|  TSVector Search  |     |  SMS Abstraction  |     | Non-E2EE Inspect  |
|  Media S3 Storage |     |  WebRTC Signaling |     | Immutable Logs    |
+-------------------+     +-------------------+     +-------------------+
```

## 1. Non-E2EE Architectural Rationale

This platform intentionally operates as a **non-E2EE system**. Messages are encrypted strictly in transit (TLS 1.3) and at rest (AES-256).

- **Full-Text Search**: Allows instant, server-side indexing across millions of message records without client-side memory exhaustion.
- **Enterprise Moderation & Abuse Reporting**: Allows authorized moderators to inspect reported threads, quarantine toxic content, and protect community members.
- **Reliable Multi-Device Synchronization**: Eliminates complex cryptographic multi-ratchet session resets across web, mobile, and backup devices.
- **Audit Trails**: Supports compliance requirements with immutable logging of administrative actions.

## 2. Real-Time WebSocket Engine

The WebSocket engine in `server/websocket.ts` manages:
- **Connection Registry**: Multiplexes multiple devices under each user profile.
- **Heartbeat & Presence**: Ping-pong keeps connections alive and broadcasts status (`presence_updated`) to authorized peer contacts.
- **Instant Messaging**: Emits `new_message`, `message_edited`, `message_deleted_everyone`, and `reaction_updated` events.
- **WebRTC Signaling**: Relays SDP offers, answers, ICE candidates, and call lifecycle states without requiring proprietary signaling middleware.

## 3. White-Label System

The application features centralized configuration in `BrandingContext.tsx` and `server/db.ts`. Modifying variables updates:
- Page title & SEO meta tags
- Web App Manifest name and theme colors
- Header and footer branding
- Dynamic email templates
- Legal terms and contact details
