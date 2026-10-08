# REST API & WEBSOCKET PROTOCOL SPECIFICATION

## 1. Authentication & Session Endpoints

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/auth/register` | POST | Register a new user account |
| `/api/auth/login` | POST | Authenticate using identifier + password + MFA |
| `/api/auth/me` | GET | Retrieve authenticated profile |
| `/api/auth/sessions` | GET | List active authorized device sessions |
| `/api/auth/revoke-session` | POST | Terminate session by session ID |
| `/api/auth/profile` | POST | Update display name, bio, status, avatar |
| `/api/auth/privacy` | POST | Configure last seen, read receipts, and typing |
| `/api/auth/password/change`| POST | Update password |
| `/api/auth/account/export` | POST | Export full account data JSON archive |
| `/api/auth/account/delete` | POST | Permanently delete user account |

## 2. Verification Endpoints

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/verification/email/request-otp` | POST | Dispatch email OTP code |
| `/api/verification/email/verify-otp` | POST | Validate email OTP code |
| `/api/verification/phone/request-otp` | POST | Dispatch SMS OTP via configured provider |
| `/api/verification/phone/verify-otp` | POST | Validate phone OTP code |
| `/api/verification/mfa/setup` | POST | Generate TOTP secret and backup codes |
| `/api/verification/mfa/verify` | POST | Verify TOTP code and activate MFA |
| `/api/verification/passkey/register` | POST | Register WebAuthn hardware passkey |
| `/api/verification/badge/request` | POST | Submit verified badge request |
| `/api/verification/badge/my-status`| GET | Get current verification status |

## 3. Chats, Messaging & Media

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/chats` | GET | List conversations for authenticated user |
| `/api/chats` | POST | Create direct chat or group conversation |
| `/api/chats/:id/messages` | GET | Retrieve message history |
| `/api/chats/:id/messages` | POST | Send message (text, attachments, reply) |
| `/api/messages/:id` | PUT | Edit sent message |
| `/api/messages/:id` | DELETE | Delete for me or delete for everyone |
| `/api/messages/:id/reaction`| POST | Toggle emoji reaction |
| `/api/messages/:id/pin` | POST | Pin or unpin message |
| `/api/messages/:id/star`| POST | Star or unstar message |
| `/api/chats/:id/disappearing` | POST | Update disappearing messages duration |
| `/api/media/upload` | POST | Upload and validate media attachment |
| `/api/search?q=...` | GET | Full-text search across messages & users |

## 4. Admin & Compliance

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/admin/dashboard` | GET | Platform health and counter metrics |
| `/api/admin/users` | GET | User directory with RBAC control |
| `/api/admin/users/:id/role`| POST | Update user role |
| `/api/admin/users/:id/ban` | POST | Ban or unban user |
| `/api/admin/verification-requests` | GET | Queue of pending badge requests |
| `/api/admin/verification-requests/:id/action` | POST | Approve, reject, or revoke badge |
| `/api/admin/reports` | GET | Abuse and safety report list |
| `/api/admin/reports/:id/resolve` | POST | Resolve report and take action |
| `/api/admin/audit-logs` | GET | Security audit log history |
| `/api/admin/branding` | PUT | Live update white-label branding |
| `/api/admin/email/preview/:template` | GET | Preview rendered email template |
| `/api/admin/outbox` | GET | Email and SMS outbox delivery records |
