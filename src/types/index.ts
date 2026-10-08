/**
 * Central TypeScript Definitions for Aether Messenger
 * White-label, Non-E2EE, Real-Time Messaging & Collaboration Platform
 */

export type UserRole = 'super_admin' | 'admin' | 'moderator' | 'support' | 'user';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected' | 'revoked';

export type VerificationCategory =
  | 'creator'
  | 'business'
  | 'support'
  | 'official'
  | 'organization'
  | 'individual';

export interface UserProfile {
  id: string;
  email?: string;
  phone?: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  about?: string;
  customStatus?: string;
  role: UserRole;
  isOnline: boolean;
  lastSeen: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  mfaEnabled: boolean;
  passkeyCount: number;
  verificationStatus: VerificationStatus;
  verificationCategory?: VerificationCategory;
  verifiedAt?: string;
  verificationExpiry?: string;
  verificationReason?: string;
  createdAt: string;
  privacy: {
    lastSeen: 'everyone' | 'contacts' | 'nobody';
    onlineStatus: 'everyone' | 'same_as_last_seen';
    profilePhoto: 'everyone' | 'contacts' | 'nobody';
    about: 'everyone' | 'contacts' | 'nobody';
    readReceipts: boolean;
    typingIndicators: boolean;
    callPermissions: 'everyone' | 'contacts' | 'nobody';
    allowGroupInvites: 'everyone' | 'contacts';
  };
}

export interface UserSession {
  id: string;
  userId: string;
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  location: string;
  isCurrent: boolean;
  lastActive: string;
  createdAt: string;
}

export type ChatType = 'direct' | 'group' | 'community_channel';

export type DisappearingDuration = 'off' | '24h' | '7d' | '30d' | 'custom';

export interface ChatMember {
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  user?: UserProfile;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'voice' | 'pdf' | 'document' | 'archive' | 'contact' | 'location';
  mimeType: string;
  size: number;
  caption?: string;
  duration?: number;
  waveform?: number[];
  dimensions?: { width: number; height: number };
  thumbnailUrl?: string;
  extra?: Record<string, unknown>;
}

export interface MessageReaction {
  emoji: string;
  userIds: string[];
  count: number;
}

export interface MessageReplySnippet {
  id: string;
  senderId: string;
  senderName: string;
  text?: string;
  attachmentType?: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  sender?: UserProfile;
  text?: string;
  attachments?: Attachment[];
  reactions: MessageReaction[];
  replyTo?: MessageReplySnippet;
  forwarded?: boolean;
  isEdited?: boolean;
  isPinned?: boolean;
  isStarred?: boolean;
  deletedForUserIds: string[];
  deletedForEveryone?: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  disappearingExpiresAt?: string;
  mentions?: string[];
  linkPreviews?: {
    url: string;
    title?: string;
    description?: string;
    image?: string;
  }[];
  createdAt: string;
  updatedAt?: string;
  readBy?: { userId: string; readAt: string }[];
  deliveredTo?: { userId: string; deliveredAt: string }[];
}

export interface Chat {
  id: string;
  type: ChatType;
  name?: string;
  avatarUrl?: string;
  description?: string;
  members: ChatMember[];
  lastMessage?: Message;
  unreadCount: number;
  isPinned?: boolean;
  isArchived?: boolean;
  isMuted?: boolean;
  disappearingDuration: DisappearingDuration;
  adminOnlyMessaging?: boolean;
  communityId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  avatarUrl?: string;
  bannerUrl?: string;
  ownerId: string;
  channelIds: string[];
  memberCount: number;
  inviteCode?: string;
  createdAt: string;
}

export interface CallParticipant {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing: boolean;
}

export interface CallSession {
  id: string;
  chatId: string;
  initiatorId: string;
  type: 'voice' | 'video';
  status: 'calling' | 'ringing' | 'connected' | 'ended' | 'declined' | 'missed';
  startedAt: string;
  endedAt?: string;
  duration?: number;
  participants: CallParticipant[];
}

export interface VerificationRequest {
  id: string;
  userId: string;
  user?: UserProfile;
  category: VerificationCategory;
  organizationName?: string;
  websiteUrl?: string;
  documentType: string;
  documentUrl?: string;
  additionalInfo?: string;
  status: VerificationStatus;
  reviewedBy?: string;
  reviewNotes?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModerationReport {
  id: string;
  reporterId: string;
  reporter?: UserProfile;
  targetType: 'user' | 'message' | 'group' | 'media';
  targetId: string;
  category: 'spam' | 'harassment' | 'hate_speech' | 'impersonation' | 'illegal' | 'misinformation' | 'other';
  reason: string;
  evidenceSnippet?: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  assignedTo?: string;
  moderatorNotes?: string;
  actionTaken?: 'none' | 'warning' | 'message_removed' | 'user_suspended' | 'user_banned';
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, unknown>;
  ipAddress: string;
  createdAt: string;
}

export interface WhiteLabelBranding {
  appName: string;
  appShortName: string;
  appDomain: string;
  appLogo: string;
  appLogoDark: string;
  appFavicon: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  description: string;
  companyName: string;
  companyAddress: string;
  supportEmail: string;
  developerName?: string;
  websiteUrl?: string;
  privacyUrl: string;
  termsUrl: string;
  cookiesUrl: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure?: boolean;
  username: string;
  password?: string;
  fromEmail: string;
  fromName: string;
  isConfigured: boolean;
}

export interface SmsConfig {
  provider: 'twilio' | 'messagebird' | 'aws_sns' | 'infobip' | 'webhook' | 'simulator';
  senderId: string;
  rateLimitPerMinute: number;
  otpExpirationSeconds: number;
  isConfigured: boolean;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'maintenance';
  uptimeSeconds: number;
  activeSockets: number;
  totalUsers: number;
  totalMessages: number;
  activeCalls: number;
  storageUsedBytes: number;
  databaseConnections: number;
  memoryUsageMb: number;
}
