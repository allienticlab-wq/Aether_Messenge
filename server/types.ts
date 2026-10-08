import {
  UserProfile,
  UserSession,
  Chat,
  Message,
  Community,
  VerificationRequest,
  ModerationReport,
  AuditLog,
  WhiteLabelBranding,
  SmtpConfig,
  SmsConfig,
  QrAuthSession
} from '../src/types/index.js';

export interface DbUser extends UserProfile {
  passwordHash: string;
  phone?: string;
  isSuspended: boolean;
  isBanned: boolean;
  banReason?: string;
  twoFactorSecret?: string;
  backupCodes?: string[];
  passkeys?: {
    id: string;
    credentialId: string;
    publicKey: string;
    deviceName: string;
    counter: number;
    createdAt: string;
  }[];
}

export interface StoredOtp {
  id: string;
  identifier: string; // email or phone
  code: string;
  purpose: 'email_verify' | 'phone_verify' | 'login_challenge' | 'password_reset';
  attempts: number;
  maxAttempts: number;
  expiresAt: number;
}

export interface ServerState {
  users: Map<string, DbUser>;
  sessions: Map<string, UserSession>;
  chats: Map<string, Chat>;
  messages: Map<string, Message>;
  communities: Map<string, Community>;
  verificationRequests: Map<string, VerificationRequest>;
  verificationHistory: {
    id: string;
    userId: string;
    action: string;
    actorId?: string;
    notes?: string;
    createdAt: string;
  }[];
  reports: Map<string, ModerationReport>;
  auditLogs: AuditLog[];
  otps: Map<string, StoredOtp>;
  qrSessions: Map<string, QrAuthSession>;
  branding: WhiteLabelBranding;
  smtpConfig: SmtpConfig;
  smsConfig: SmsConfig;
  outboxEmails: {
    id: string;
    to: string;
    subject: string;
    html: string;
    template: string;
    sentAt: string;
  }[];
  outboxSms: {
    id: string;
    to: string;
    body: string;
    sentAt: string;
    status: 'delivered' | 'failed' | 'simulated';
  }[];
  featureFlags: {
    voiceNotes: boolean;
    videoCalls: boolean;
    disappearingMessages: boolean;
    fileUploads: boolean;
    communities: boolean;
    userRegistration: boolean;
    passkeys: boolean;
    mfaEnforced: boolean;
    maxUploadSizeMb: number;
    otpExpirationMinutes: number;
  };
  callsHistory: {
    id: string;
    chatId: string;
    initiatorId: string;
    initiatorName: string;
    type: 'voice' | 'video';
    durationSeconds: number;
    status: 'completed' | 'missed' | 'declined';
    createdAt: string;
  }[];
  notificationsHistory: {
    id: string;
    target: string;
    title: string;
    body: string;
    sentBy: string;
    sentAt: string;
  }[];
  backups: {
    id: string;
    timestamp: string;
    name: string;
    userCount: number;
    messageCount: number;
    chatCount: number;
    sizeBytes: number;
    data: any;
  }[];
}
