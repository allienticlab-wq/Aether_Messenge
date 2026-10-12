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
  customConfig?: Partial<SmtpConfig>;
}

export interface MailDeliveryResult {
  success: boolean;
  messageId?: string;
  status: 'delivered' | 'failed' | 'simulated';
  error?: string;
  outboxId: string;
  mode?: 'rest_api' | 'smtp' | 'sandbox';
}

/**
 * Creates a Nodemailer transporter using current or custom SMTP configuration
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
      rejectUnauthorized: false,
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });

  return { transporter, hasCredentials, host, port, user, config };
}

/**
 * Dispatches an email through Mailgun REST API, Mailgun SMTP, or simulated outbox
 */
export async function sendMailgunEmail(options: SendMailOptions): Promise<MailDeliveryResult> {
  const { to, template, data = {}, recipientName, customConfig } = options;
  const outboxId = `email_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  let subject = options.subject || '';
  let html = options.html || '';

  if (template) {
    const rendered = renderEmailTemplate(
      template,
      { ...data, recipientName: recipientName || data.recipientName || 'Valued User' },
      db.state.branding
    );
    subject = subject || rendered.subject;
    html = html || rendered.html;
  }

  const { transporter, hasCredentials, config } = getMailgunTransporter(customConfig);
  const fromAddress = `"${config.fromName || db.state.branding.appName}" <${config.fromEmail || 'security@mg.aether.xperiserv.in'}>`;

  // 1. Mailgun REST API Option
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
        const body = (await apiRes.json()) as any;
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
          mode: 'rest_api',
        };
      } else {
        const errText = await apiRes.text();
        console.warn(`Mailgun REST API send failed (HTTP ${apiRes.status}):`, errText);
      }
    } catch (err: any) {
      console.warn('Mailgun API send exception, trying SMTP:', err?.message);
    }
  }

  // 2. SMTP Transporter Option
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
        mode: 'smtp',
      };
    } catch (err: any) {
      console.error('Mailgun SMTP dispatch error:', err?.message || err);

      db.state.outboxEmails.unshift({
        id: outboxId,
        to,
        subject,
        html,
        template: template || 'custom',
        sentAt: now,
        status: 'failed',
        error: err?.message || 'SMTP dispatch failure',
      });

      return {
        success: false,
        status: 'failed',
        error: err?.message || 'SMTP dispatch failure',
        outboxId,
        mode: 'smtp',
      };
    }
  }

  // 3. Simulated Sandbox Outbox Mode
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
    mode: 'sandbox',
  };
}

/**
 * Validates connection handshake to the Mailgun REST API or SMTP server
 */
export async function testMailgunSmtpConnection(testConfig?: Partial<SmtpConfig>): Promise<{
  success: boolean;
  message: string;
  error?: string;
  host?: string;
  port?: number;
  mode?: 'rest_api' | 'smtp' | 'sandbox';
}> {
  const config = testConfig
    ? { ...db.state.smtpConfig, ...testConfig }
    : db.state.smtpConfig;

  // 1. Test Mailgun REST API if API Key & Domain provided
  if (config.mailgunApiKey && config.mailgunDomain) {
    try {
      const endpoint = `https://api.mailgun.net/v3/domains/${config.mailgunDomain}`;
      const authHeader = 'Basic ' + Buffer.from(`api:${config.mailgunApiKey}`).toString('base64');
      const apiRes = await fetch(endpoint, {
        method: 'GET',
        headers: { Authorization: authHeader },
      });

      if (apiRes.ok) {
        return {
          success: true,
          mode: 'rest_api',
          host: 'api.mailgun.net',
          port: 443,
          message: `Mailgun REST API Key & Domain (${config.mailgunDomain}) verified successfully!`,
        };
      } else {
        const bodyText = await apiRes.text();
        return {
          success: false,
          mode: 'rest_api',
          host: 'api.mailgun.net',
          port: 443,
          message: `Mailgun REST API connection failed (HTTP ${apiRes.status}): ${bodyText || apiRes.statusText}`,
          error: `HTTP ${apiRes.status}`,
        };
      }
    } catch (err: any) {
      console.warn('Mailgun API key check exception, checking SMTP next:', err?.message);
    }
  }

  // 2. Test SMTP connection via Nodemailer
  const { transporter, hasCredentials, host, port, user } = getMailgunTransporter(config);

  if (!hasCredentials) {
    return {
      success: true,
      mode: 'sandbox',
      host,
      port,
      message: `SMTP Sandbox Mode active. Enter SMTP Username & Password or Mailgun API Key for live email dispatch.`,
    };
  }

  try {
    await transporter.verify();
    return {
      success: true,
      mode: 'smtp',
      host,
      port,
      message: `Successfully connected and authenticated with Mailgun SMTP server at ${host}:${port} as ${user}!`,
    };
  } catch (err: any) {
    return {
      success: false,
      mode: 'smtp',
      host,
      port,
      message: `SMTP Connection / Handshake Error: ${err?.message || 'Connection refused or authentication failed'}`,
      error: err?.message || String(err),
    };
  }
}
