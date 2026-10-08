# SECURITY POLICY & AUDIT SPECIFICATION

Aether Messenger implements defense-in-depth security principles across authentication, session authorization, network transport, file uploads, and role-based permissions.

## 1. Non-E2EE Cryptographic Baseline

- **In-Transit**: TLS 1.3 with secure cipher suites is enforced across all HTTP API requests and WebSocket frames.
- **At-Rest**: Sensitive credentials (passwords, MFA secrets, backup codes) are hashed and encrypted using standard key derivation and AES-256 before storage.
- **Data Indexing Notice**: Message bodies are indexed on the backend to provide server-side full-text search, community administration, and safety inspections. End-to-end encryption is intentionally **not** implemented.

## 2. Authentication & Credential Protections

- **Password Hashing**: Cryptographic salt + SHA-256/PBKDF2. Passwords are never logged or exposed in responses.
- **One-Time Passcodes (OTP)**: Valid for 10 minutes with strict rate limits (max 5 failed attempts per OTP code before revocation).
- **MFA (TOTP)**: Standard RFC 6238 TOTP with single-use backup recovery codes.
- **Hardware Passkeys**: WebAuthn standard public-key cryptography supporting Touch ID, Windows Hello, and YubiKeys.
- **Session Security**: Session tokens are cryptographically generated, IP/user-agent tracked, and can be revoked individually or globally from the user settings.

## 3. Role-Based Access Control (RBAC)

The application enforces 5 administrative role tiers:
1. **Super Admin**: Full platform configuration, role assignments, branding customization, system audit inspection.
2. **Admin**: User management, verification approval/revocation, queue resolution.
3. **Moderator**: Abuse report resolution, content inspection, user warnings and temporary bans.
4. **Support**: Read-only directory access and customer assistance.
5. **User**: Standard messaging and community participation.

## 4. Immutable Audit Logging

Every sensitive administrative and security action (login, password change, verification approval, user suspension, role elevation, data export) writes an immutable record to the `audit_logs` table recording:
- Actor ID and Name
- Action Type
- Resource Type & ID
- Action Parameters
- Client IP Address & Timestamp
