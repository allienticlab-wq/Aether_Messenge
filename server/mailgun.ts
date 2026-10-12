import nodemailer from 'nodemailer';
import { db } from './db.js';
import { renderEmailTemplate } from './email-templates.js';
import { SmtpConfig } from '../src/types/index.js';

export interface SendMailOptions {
  to: string;
  subject?: string;
  html?: string;
  template?: string;
  data?: Record<string, any>;
  recipientName?: string;
}

export interface MailDeliveryResult {
  success: boolean;
  messageId?: string;
  status: 'delivered' | 'failed' | 'simulated';
  error?: string;
  outboxId: string;
}

/**
 * Creates a Nodemailer transporter using the current SMTP/Mailgun configuration
 */
export function getMailgunTransporter(customConfig?: Partial<SmtpConfig>) {
  const config = customConfig
    ? { ...db.state.smtpConfig, ...customConfig }
    : db.state.smtpConfig;

  const host = config.host || process.env.MAILGUN_SMTP_HOST || 'smtp.mailgun.org';
  const port = Number(config.port) || Number(process.env.MAILGUN_SMTP_PORT) || 587;
  const user = config.username || process.env.MAILGUN_SMTP_LOGIN || process.env.MAILGUN_SMTP_USER || '';
  const pass = config.password || process.env.MAILGUN_SMTP_PASSWORD || '';
  const secure = config.secure ?? (port === 465);

  const hasCredentials = Boolean(user && pass);

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: hasCredentials
      ? {
          user,
          pass,
        }
      : undefined,
    tls: {
      rejectUnauthorized: false, // Prevents self-signed/proxy cert rejection in testing
    },
  });

  return { transporter, hasCredentials, host, port, user, config };
}

/**
 * Dispatches an email through Mailgun SMTP, Mailgun REST API, or simulated sandbox
 */
export async function sendMailgunEmail(options: SendMailOptions): Promise<MailDeliveryResult> {
  const { to, template, data = {}, recipientName } = options;
  const outboxId = `email_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  // If template is specified, render subject and html
  let subject = options.subject || '';
  let html = options.html || '';

  if (template) {
    const rendered = renderEmailTemplate(
      template,
      { ...data, recipientName: recipientName || data.recipientName },
      db.state.branding
    );
    subject = subject || rendered.subject;
    html = html || rendered.html;
  }

  const { transporter, hasCredentials, config } = getMailgunTransporter();
  const fromAddress = `"${config.fromName || db.state.branding.appName}" <${config.fromEmail || 'security@mg.aether.xperiserv.in'}>`;

  // 1. If Mailgun REST API credentials are configured, can also use Mailgun API
  if (config.mailgunApiKey && config.mailgunDomain) {
    try {
      const endpoint = `https://api.mailgun.net/v3/${config.mailgunDomain}/messages`;
      const authHeader = 'Basic ' + Buffer.from(`api:${config.mailgunApiKey}`).toString('base64');
      const formData = new URLSearchParams();
      formData.append('from', fromAddress);
      formData.append('to', to);
      formData.append('subject', subject);
      formData.append('html', html);

      const apiRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (apiRes.ok) {
        const body = await apiRes.json() as any;
        const messageId = body.id || `mg_${Date.now()}`;
        db.state.outboxEmails.unshift({
          id: outboxId,
          to,
          subject,
          html,
          template: template || 'custom',
          sentAt: now,
          status: 'delivered',
          messageId,
        });

        return {
          success: true,
          messageId,
          status: 'delivered',
          outboxId,
        };
      }
    } catch (err: any) {
      console.warn('Mailgun API send error, falling back to SMTP:', err?.message);
    }
  }

  // 2. If SMTP credentials exist, send via Mailgun SMTP
  if (hasCredentials) {
    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        html,
      });

      db.state.outboxEmails.unshift({
        id: outboxId,
        to,
        subject,
        html,
        template: template || 'custom',
        sentAt: now,
        status: 'delivered',
        messageId: info.messageId,
      });

      return {
        success: true,
        messageId: info.messageId,
        status: 'delivered',
        outboxId,
      };
    } catch (err: any) {
      console.error('Mailgun SMTP dispatch error:', err?.message || err);

      // Record failure in outbox
      db.state.outboxEmails.unshift({
        id: outboxId,
        to,
        subject,
        html,
        template: template || 'custom',
        sentAt: now,
        status: 'failed',
        error: err?.message || 'SMTP Connection failed',
      });

      return {
        success: false,
        status: 'failed',
        error: err?.message || 'SMTP Connection failed',
        outboxId,
      };
    }
  }

  // 3. Simulated Sandbox Mode (Credentials not yet entered by user/admin)
  // Store in outbox so user can inspect OTP codes and emails seamlessly!
  db.state.outboxEmails.unshift({
    id: outboxId,
    to,
    subject,
    html,
    template: template || 'custom',
    sentAt: now,
    status: 'simulated',
    messageId: `sim_${Date.now()}`,
  });

  return {
    success: true,
    status: 'simulated',
    messageId: `sim_${Date.now()}`,
    outboxId,
  };
}

/**
 * Validates connection handshake to the Mailgun SMTP server
 */
export async function testMailgunSmtpConnection(testConfig?: Partial<SmtpConfig>): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  try {
    const { transporter, host, port, user } = getMailgunTransporter(testConfig);
    await transporter.verify();
    return {
      success: true,
      message: `Successfully connected and authenticated with Mailgun SMTP server at ${host}:${port} as ${user || 'anonymous'}!`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to connect to SMTP server: ${err?.message || 'Connection refused or timeout'}`,
      error: err?.message || String(err),
    };
  }
}
