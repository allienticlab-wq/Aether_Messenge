# SMS PROVIDER ABSTRACTION SPECIFICATION

The SMS subsystem in `server/sms-service.ts` provides a pluggable gateway abstraction designed to connect to any SMS provider without hardcoding keys or vendors.

## 1. Supported Provider Integrations

- **Twilio**: Industry standard REST SMS gateway
- **MessageBird**: Global telecom messaging API
- **AWS SNS**: Scalable Amazon Simple Notification Service SMS
- **Infobip**: Enterprise omni-channel messaging
- **Custom Webhook**: Custom HTTPS webhook endpoint for internal telecom relays
- **Simulator**: Built-in development mode that simulates real deliveries and records messages to the audit outbox

## 2. Configuration Schema

```json
{
  "provider": "simulator",
  "senderId": "AETHER",
  "rateLimitPerMinute": 3,
  "otpExpirationSeconds": 300,
  "isConfigured": true
}
```

## 3. Rate Limiting & Safety Controls

- **Sliding-Window Rate Limiting**: Enforces a configurable dispatch rate limit (default: 3 SMS per minute per recipient phone number) to prevent toll fraud and provider exhaustion.
- **OTP Expiration**: SMS verification codes expire after 5 minutes (300 seconds).
- **Outbox Logging**: All outgoing SMS dispatches are tracked with message ID, status, and timestamp.
