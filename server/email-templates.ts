import { WhiteLabelBranding } from '../src/types/index.js';

interface EmailBaseProps {
  branding: WhiteLabelBranding;
  recipientName: string;
}

export function wrapEmailLayout(content: string, branding: WhiteLabelBranding, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9; }
    .wrapper { max-width: 600px; margin: 40px auto; background-color: #0f172a; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .header { padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #1e293b; background: linear-gradient(180deg, #131f37 0%, #0f172a 100%); }
    .brand-title { font-size: 22px; font-weight: 700; color: #38bdf8; letter-spacing: -0.5px; margin: 0; }
    .body-content { padding: 36px 32px; font-size: 15px; line-height: 1.6; color: #cbd5e1; }
    .btn { display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, ${branding.primaryColor}, ${branding.accentColor}); color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 8px; margin: 24px 0; }
    .otp-code { font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; background: #1e293b; padding: 16px 24px; border-radius: 8px; text-align: center; margin: 24px 0; font-family: monospace; }
    .footer { padding: 24px 32px; background-color: #090e1a; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #1e293b; }
    .footer a { color: #38bdf8; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="brand-title">${branding.appName}</div>
    </div>
    <div class="body-content">
      ${content}
    </div>
    <div class="footer">
      <p style="margin: 0 0 8px;">Sent securely by ${branding.companyName}.</p>
      <p style="margin: 0 0 12px;">${branding.companyAddress}</p>
      <p style="margin: 0;">
        <a href="${branding.privacyUrl}">Privacy Policy</a> &bull;
        <a href="${branding.termsUrl}">Terms of Service</a> &bull;
        <a href="mailto:${branding.supportEmail}">Support</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

export function renderEmailTemplate(
  templateName: string,
  data: Record<string, any>,
  branding: WhiteLabelBranding
): { subject: string; html: string } {
  const name = data.recipientName || 'Valued User';

  switch (templateName) {
    case 'welcome': {
      const subject = `Welcome to ${branding.appName}`;
      const content = `
        <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">Welcome aboard, ${name}!</h2>
        <p>Your account on <strong>${branding.appName}</strong> is now active. You can start connecting with teams, creating community groups, and exchanging messages in real time.</p>
        <p>Aether is designed for high-performance communication with verified identity trust, media sharing, and instant calling.</p>
        <div style="text-align: center;">
          <a href="${branding.appDomain}" class="btn">Launch Messenger</a>
        </div>
        <p style="font-size: 13px; color: #94a3b8;">If you did not sign up for this account, please notify our team immediately at ${branding.supportEmail}.</p>
      `;
      return { subject, html: wrapEmailLayout(content, branding, subject) };
    }

    case 'email_verification': {
      const subject = `Verify your email for ${branding.appName}`;
      const content = `
        <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">Confirm your email address</h2>
        <p>Hello ${name},</p>
        <p>Please use the verification code below to verify your email on ${branding.appName}:</p>
        <div class="otp-code">${data.otpCode || '849201'}</div>
        <p>This code will expire in <strong>${data.expiresInMinutes || 10} minutes</strong>. Please do not share this code with anyone.</p>
        <div style="text-align: center;">
          <a href="${data.verifyLink || `${branding.appDomain}/verify?token=demo`}" class="btn">Verify in Browser</a>
        </div>
      `;
      return { subject, html: wrapEmailLayout(content, branding, subject) };
    }

    case 'otp': {
      const subject = `Your ${branding.appName} Security Code: ${data.otpCode || '492015'}`;
      const content = `
        <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">One-Time Security Code</h2>
        <p>Hello ${name},</p>
        <p>Your single-use passcode for <strong>${data.actionDescription || 'authenticating your session'}</strong> is:</p>
        <div class="otp-code">${data.otpCode || '492015'}</div>
        <p style="color: #ef4444; font-size: 13px;">If you did not request this OTP, change your password immediately and contact ${branding.supportEmail}.</p>
      `;
      return { subject, html: wrapEmailLayout(content, branding, subject) };
    }

    case 'password_reset': {
      const subject = `Reset your ${branding.appName} password`;
      const content = `
        <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">Password Reset Request</h2>
        <p>Hello ${name},</p>
        <p>We received a request to reset the password for your ${branding.appName} account. You can complete this action using your reset token:</p>
        <div class="otp-code">${data.otpCode || '729104'}</div>
        <div style="text-align: center;">
          <a href="${data.resetLink || `${branding.appDomain}/reset-password?token=${data.resetToken || 'demo'}`}" class="btn">Reset Password</a>
        </div>
        <p style="font-size: 13px; color: #94a3b8;">This single-use link expires in 15 minutes. If you did not make this request, you can safely ignore this email.</p>
      `;
      return { subject, html: wrapEmailLayout(content, branding, subject) };
    }

    case 'new_login': {
      const subject = `New login detected on ${branding.appName}`;
      const content = `
        <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">Security Alert: New Sign-in</h2>
        <p>Hello ${name},</p>
        <p>Your account was just accessed from a new device or browser:</p>
        <div style="background: #1e293b; padding: 16px; border-radius: 8px; margin: 20px 0; font-size: 14px;">
          <div><strong>Device:</strong> ${data.device || 'Chrome on macOS'}</div>
          <div><strong>IP Address:</strong> ${data.ip || '192.168.1.1'}</div>
          <div><strong>Time:</strong> ${new Date().toUTCString()}</div>
        </div>
        <p>If this was you, no action is needed. If you do not recognize this activity, revoke all sessions from your Account Settings immediately.</p>
      `;
      return { subject, html: wrapEmailLayout(content, branding, subject) };
    }

    case 'new_device': {
      const subject = `Unrecognized device added to ${branding.appName}`;
      const content = `
        <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">New Device Authorization</h2>
        <p>Hello ${name},</p>
        <p>A new device was approved for your account: <strong>${data.device || 'PWA Mobile Client'}</strong>.</p>
        <p>All active sessions and cryptographic credentials can be reviewed in your Settings &gt; Devices tab.</p>
      `;
      return { subject, html: wrapEmailLayout(content, branding, subject) };
    }

    case 'security_alert': {
      const subject = `Important Security Alert: ${branding.appName}`;
      const content = `
        <h2 style="color: #ef4444; margin-top: 0; font-size: 20px;">Security Warning</h2>
        <p>Hello ${name},</p>
        <p>${data.message || 'Multiple failed authentication attempts were detected on your account from an unfamiliar network.'}</p>
        <p>As a precaution, we recommend enabling Two-Factor Authentication (TOTP) or registering a WebAuthn Passkey.</p>
      `;
      return { subject, html: wrapEmailLayout(content, branding, subject) };
    }

    case 'verification_approved': {
      const subject = `Congratulations: Your ${branding.appName} Account is Verified!`;
      const content = `
        <h2 style="color: #38bdf8; margin-top: 0; font-size: 20px;">Verification Request Approved</h2>
        <p>Hello ${name},</p>
        <p>Your request for an official verified badge on <strong>${branding.appName}</strong> has been approved!</p>
        <p>Category: <strong>${data.category || 'Official Account'}</strong></p>
        <p>The blue verified badge is now visible next to your name in chats, groups, contact search, and profile views.</p>
      `;
      return { subject, html: wrapEmailLayout(content, branding, subject) };
    }

    case 'verification_rejected': {
      const subject = `Update regarding your ${branding.appName} verification request`;
      const content = `
        <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">Verification Review Outcome</h2>
        <p>Hello ${name},</p>
        <p>Our review team evaluated your verification submission. At this time, we could not approve your request for the following reason:</p>
        <blockquote style="background: #1e293b; padding: 12px 16px; border-left: 4px solid #ef4444; margin: 16px 0; color: #f87171;">
          ${data.reason || 'Submitted documentation was incomplete or could not be independently substantiated.'}
        </blockquote>
        <p>You may submit a new request with updated supporting documents after 14 days.</p>
      `;
      return { subject, html: wrapEmailLayout(content, branding, subject) };
    }

    case 'verification_revoked': {
      const subject = `Notification: Verified status revoked on ${branding.appName}`;
      const content = `
        <h2 style="color: #ef4444; margin-top: 0; font-size: 20px;">Verification Revocation Notice</h2>
        <p>Hello ${name},</p>
        <p>Your verified account badge has been revoked in accordance with our platform community guidelines and verification policy.</p>
        <p>Reason: <strong>${data.reason || 'Policy non-compliance or expired credential authorization.'}</strong></p>
      `;
      return { subject, html: wrapEmailLayout(content, branding, subject) };
    }

    case 'email_changed': {
      const subject = `Your ${branding.appName} email address was updated`;
      const content = `
        <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">Email Address Changed</h2>
        <p>Hello ${name},</p>
        <p>This message confirms that your primary email address for ${branding.appName} was recently updated.</p>
        <p>If you made this change, no further action is necessary. If you did not initiate this change, contact security immediately at ${branding.supportEmail}.</p>
      `;
      return { subject, html: wrapEmailLayout(content, branding, subject) };
    }

    case 'account_deleted': {
      const subject = `Your ${branding.appName} account has been deleted`;
      const content = `
        <h2 style="color: #ffffff; margin-top: 0; font-size: 20px;">Account Deletion Confirmation</h2>
        <p>Hello ${name},</p>
        <p>Your account on ${branding.appName} and all associated profile records have been permanently deleted as requested in accordance with our data retention schedule.</p>
        <p>We are sorry to see you go. If this was executed in error, please contact ${branding.supportEmail}.</p>
      `;
      return { subject, html: wrapEmailLayout(content, branding, subject) };
    }

    default: {
      const subject = `Notification from ${branding.appName}`;
      const content = `<p>Hello ${name},</p><p>${data.message || 'You have a new update in your account.'}</p>`;
      return { subject, html: wrapEmailLayout(content, branding, subject) };
    }
  }
}
