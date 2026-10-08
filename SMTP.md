# SMTP & EMAIL SYSTEM SPECIFICATION

Aether Messenger contains 12 responsive, styled email templates with dynamic brand variables.

## 1. Environment Configuration

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=your_api_key_or_password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME="Aether Messenger Security"
```

## 2. Implemented Email Templates

1. **welcome**: Welcomes new registered user and provides direct login link.
2. **email_verification**: Dispatches 6-digit email confirmation OTP code and browser link.
3. **otp**: Security one-time passcode for authenticating sensitive actions.
4. **password_reset**: Single-use password reset link with 15-minute token expiry.
5. **new_login**: Alerts user of new device sign-in with IP address and device name.
6. **new_device**: Informs user when an unrecognized client was added to their authorized list.
7. **security_alert**: Critical warning regarding multiple failed attempts or security changes.
8. **verification_approved**: Congratulates user upon approval of their official verified badge.
9. **verification_rejected**: Notifies user of rejected badge application with stated reason.
10. **verification_revoked**: Informs user when a verified badge has been withdrawn.
11. **email_changed**: Security confirmation when primary email address has been updated.
12. **account_deleted**: Confirmation that all user account records have been permanently erased.

## 3. Template Testing & Live Preview

Administrators can preview every email template directly in the Operations Console under **Email & SMS Center** or via the endpoint:
```
GET /api/admin/email/preview/:templateName
```
All templates dynamically inject the current white-label brand colors, logo, company name, address, and legal links.
