# SETUP GUIDE

This document outlines environment requirements, configuration, and launch procedures for Aether Messenger.

## 1. System Requirements

- **Node.js**: v20+ or v22+ LTS
- **Package Manager**: npm or bun
- **Database**: PostgreSQL 15+ (Production DDL located in `server/schema.sql`)
- **Memory**: Minimum 512MB RAM (2GB recommended for high WebSocket concurrency)

## 2. Configuration Setup

Copy `.env.example` to `.env`:

```env
# Application Server
PORT=3000
NODE_ENV=production
APP_URL=https://your-domain.com

# White Label Branding
APP_NAME="Aether Messenger"
APP_SHORT_NAME="Aether"
APP_DOMAIN="https://your-domain.com"
APP_LOGO="/icon.svg"
APP_PRIMARY_COLOR="#06b6d4"

# PostgreSQL Database
DATABASE_URL="postgres://user:password@localhost:5432/aether_db"

# SMTP Settings
SMTP_HOST="smtp.provider.com"
SMTP_PORT=587
SMTP_USERNAME="smtp-user"
SMTP_PASSWORD="smtp-password"
SMTP_FROM_EMAIL="noreply@your-domain.com"
SMTP_FROM_NAME="Aether Messenger Security"

# SMS Gateway (Twilio / MessageBird / AWS SNS / Infobip / Webhook)
SMS_PROVIDER="simulator"
SMS_API_KEY=""
SMS_SENDER_ID="AETHER"

# WebRTC STUN/TURN (Optional for symmetric NAT traversal)
STUN_SERVER="stun:stun.l.google.com:19302"
TURN_SERVER=""
TURN_USERNAME=""
TURN_PASSWORD=""
```

## 3. Database Migration

Execute the PostgreSQL schema against your database:

```bash
psql -U aether_user -d aether_db -f server/schema.sql
```

## 4. Run Development & Production

```bash
# Development (Vite HMR + WebSockets + Express on port 3000)
npm run dev

# Production Build
npm run build
npm start
```
