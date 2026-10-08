import crypto from 'crypto';
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
  VerificationCategory,
  VerificationStatus,
  UserRole
} from '../src/types/index.js';
import { DbUser, StoredOtp, ServerState } from './types.js';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_aether_salt_2026').digest('hex');
}

class Database {
  public state: ServerState;

  constructor() {
    this.state = {
      users: new Map(),
      sessions: new Map(),
      chats: new Map(),
      messages: new Map(),
      communities: new Map(),
      verificationRequests: new Map(),
      verificationHistory: [],
      reports: new Map(),
      auditLogs: [],
      otps: new Map(),
      branding: {
        appName: 'Aether Messenger',
        appShortName: 'Aether',
        appDomain: 'Aether.xperiserv.in',
        appLogo: '/icon.svg',
        appLogoDark: '/icon.svg',
        appFavicon: '/icon.svg',
        primaryColor: '#06b6d4',
        secondaryColor: '#3b82f6',
        accentColor: '#8b5cf6',
        description: 'Next-Generation Real-Time Messaging and Collaboration Platform.',
        companyName: 'Allientic Lab Technologies',
        companyAddress: 'Allientic Lab Technologies, India',
        supportEmail: 'support@xperiserv.in',
        developerName: 'Allientic Lab Technologies',
        websiteUrl: 'https://Aether.xperiserv.in',
        privacyUrl: '/privacy',
        termsUrl: '/terms',
        cookiesUrl: '/cookies',
      },
      smtpConfig: {
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        username: 'apikey',
        password: '',
        fromEmail: 'support@xperiserv.in',
        fromName: 'Aether Messenger Security',
        isConfigured: true,
      },
      smsConfig: {
        provider: 'simulator',
        senderId: 'AETHER',
        rateLimitPerMinute: 3,
        otpExpirationSeconds: 300,
        isConfigured: true,
      },
      outboxEmails: [],
      outboxSms: [],
      backups: [],
      featureFlags: {
        voiceNotes: true,
        videoCalls: true,
        disappearingMessages: true,
        fileUploads: true,
        communities: true,
        userRegistration: true,
        passkeys: true,
        mfaEnforced: false,
        maxUploadSizeMb: 50,
        otpExpirationMinutes: 10,
      },
      callsHistory: [
        {
          id: 'call_seed_1',
          chatId: 'chat_direct_elena',
          initiatorId: 'usr_elena',
          initiatorName: 'Dr. Elena Rostova',
          type: 'video',
          durationSeconds: 342,
          status: 'completed',
          createdAt: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
        },
        {
          id: 'call_seed_2',
          chatId: 'chat_direct_elena',
          initiatorId: 'usr_admin',
          initiatorName: 'System Administrator',
          type: 'voice',
          durationSeconds: 128,
          status: 'completed',
          createdAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
        },
      ],
      notificationsHistory: [
        {
          id: 'notif_1',
          target: 'all',
          title: 'System Update Completed',
          body: 'Platform core engine upgraded to v2.4 with enhanced WebRTC latency reduction.',
          sentBy: 'System Administrator',
          sentAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
        },
      ],
    };

    this.seedInitialData();
  }

  private seedInitialData() {
    const now = new Date().toISOString();

    // 1. Production Super Administrator
    const adminUser: DbUser = {
      id: 'usr_admin',
      email: 'support@xperiserv.in',
      phone: '+919876543210',
      username: 'admin',
      displayName: 'System Administrator',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80',
      about: 'Platform Lead & Operations Administrator - Allientic Lab Technologies',
      customStatus: 'Aether Platform Online',
      role: 'super_admin',
      isOnline: true,
      lastSeen: now,
      emailVerified: true,
      phoneVerified: true,
      mfaEnabled: false,
      passkeyCount: 0,
      verificationStatus: 'verified',
      verificationCategory: 'official',
      verificationReason: 'Platform Owner & Lead Engineer (Allientic Lab Technologies)',
      verifiedAt: now,
      passwordHash: hashPassword('AdminPass2026!'),
      isSuspended: false,
      isBanned: false,
      createdAt: now,
      privacy: {
        lastSeen: 'everyone',
        onlineStatus: 'everyone',
        profilePhoto: 'everyone',
        about: 'everyone',
        readReceipts: true,
        typingIndicators: true,
        callPermissions: 'everyone',
        allowGroupInvites: 'everyone',
      },
    };
    this.state.users.set(adminUser.id, adminUser);

    // 2. Verified Creator: Aria Vance (@ariavance)
    const ariaUser: DbUser = {
      id: 'usr_aria',
      email: 'aria@creator.aether.internal',
      phone: '+14155552671',
      username: 'ariavance',
      displayName: 'Aria Vance',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&h=200&q=80',
      about: 'Digital artist & UI/3D creator. Sharing shaders, interactive prototypes & spatial design.',
      customStatus: 'Creating new tutorials 🎨',
      role: 'user',
      isOnline: true,
      lastSeen: now,
      emailVerified: true,
      phoneVerified: true,
      mfaEnabled: false,
      passkeyCount: 0,
      verificationStatus: 'verified',
      verificationCategory: 'creator',
      verificationReason: 'Verified Digital Creator & Key Platform Contributor',
      verifiedAt: now,
      passwordHash: hashPassword('CreatorPass2026!'),
      isSuspended: false,
      isBanned: false,
      createdAt: now,
      privacy: {
        lastSeen: 'everyone',
        onlineStatus: 'everyone',
        profilePhoto: 'everyone',
        about: 'everyone',
        readReceipts: true,
        typingIndicators: true,
        callPermissions: 'everyone',
        allowGroupInvites: 'everyone',
      },
    };
    this.state.users.set(ariaUser.id, ariaUser);

    // 3. Verified Business: Apex Robotics Corp (@apexrobotics)
    const apexUser: DbUser = {
      id: 'usr_apex',
      email: 'care@apexrobotics.internal',
      phone: '+18005553920',
      username: 'apexrobotics',
      displayName: 'Apex Robotics',
      avatarUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=200&h=200&q=80',
      about: 'Commercial automated robotics & hardware solutions. Verified merchant and enterprise account.',
      customStatus: 'Support desk open 9am - 8pm EST',
      role: 'user',
      isOnline: true,
      lastSeen: now,
      emailVerified: true,
      phoneVerified: true,
      mfaEnabled: false,
      passkeyCount: 0,
      verificationStatus: 'verified',
      verificationCategory: 'business',
      verificationReason: 'Verified Commercial Business & Registered Merchant Account',
      verifiedAt: now,
      passwordHash: hashPassword('BusinessPass2026!'),
      isSuspended: false,
      isBanned: false,
      createdAt: now,
      privacy: {
        lastSeen: 'everyone',
        onlineStatus: 'everyone',
        profilePhoto: 'everyone',
        about: 'everyone',
        readReceipts: true,
        typingIndicators: true,
        callPermissions: 'everyone',
        allowGroupInvites: 'everyone',
      },
    };
    this.state.users.set(apexUser.id, apexUser);

    // 4. Official Support: Aether Support (@support)
    const supportUser: DbUser = {
      id: 'usr_support',
      email: 'support@xperiserv.in',
      phone: '+18005550199',
      username: 'support',
      displayName: 'Aether Support',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&h=200&q=80',
      about: 'Official 24/7 Platform Customer Care & Security Assistance.',
      customStatus: 'Always here to assist you ⚡',
      role: 'support',
      isOnline: true,
      lastSeen: now,
      emailVerified: true,
      phoneVerified: true,
      mfaEnabled: false,
      passkeyCount: 0,
      verificationStatus: 'verified',
      verificationCategory: 'support',
      verificationReason: 'Official Platform Customer Support & Safety Representative',
      verifiedAt: now,
      passwordHash: hashPassword('SupportPass2026!'),
      isSuspended: false,
      isBanned: false,
      createdAt: now,
      privacy: {
        lastSeen: 'everyone',
        onlineStatus: 'everyone',
        profilePhoto: 'everyone',
        about: 'everyone',
        readReceipts: true,
        typingIndicators: true,
        callPermissions: 'everyone',
        allowGroupInvites: 'everyone',
      },
    };
    this.state.users.set(supportUser.id, supportUser);

    // Official Umbrella Community
    const community: Community = {
      id: 'comm_global',
      name: 'Aether Collective',
      description: 'Official umbrella community for announcements, support, and platform operations.',
      avatarUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=200&h=200&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&h=300&q=80',
      ownerId: adminUser.id,
      channelIds: ['chat_announcements'],
      memberCount: 4,
      inviteCode: 'AETHER-GLOBAL',
      createdAt: now,
    };
    this.state.communities.set(community.id, community);

    // Official Announcements Broadcast Channel (Admin-only broadcast)
    const announcementsChat: Chat = {
      id: 'chat_announcements',
      type: 'community_channel',
      name: '📢 Official Announcements',
      description: 'Official platform notifications, updates, and maintenance announcements.',
      communityId: community.id,
      adminOnlyMessaging: true,
      disappearingDuration: 'off',
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
      members: [
        { userId: adminUser.id, role: 'owner', joinedAt: now },
        { userId: ariaUser.id, role: 'member', joinedAt: now },
        { userId: apexUser.id, role: 'member', joinedAt: now },
        { userId: supportUser.id, role: 'member', joinedAt: now },
      ],
    };
    this.state.chats.set(announcementsChat.id, announcementsChat);

    // Official Welcome Message
    const welcomeMsg: Message = {
      id: 'msg_ann_1',
      chatId: announcementsChat.id,
      senderId: adminUser.id,
      text: '🚀 Welcome to Aether Messenger. Real-time communication, WebRTC calling, official verified identity marks (Verified Creator, Business, and Support), and audited moderation are fully operational.',
      reactions: [
        { emoji: '⚡', userIds: [adminUser.id], count: 1 },
      ],
      deletedForUserIds: [],
      status: 'read',
      createdAt: now,
    };
    this.state.messages.set(welcomeMsg.id, welcomeMsg);
    announcementsChat.lastMessage = welcomeMsg;

    // Connect admin to initial direct chats
    this.ensureUserDefaultChats(adminUser.id);

    // Production System Boot Audit Log
    const log1: AuditLog = {
      id: 'log_boot',
      actorId: adminUser.id,
      actorName: 'System Administrator',
      action: 'SYSTEM_BOOT',
      resourceType: 'system',
      resourceId: 'kernel',
      details: {
        environment: 'production',
        developer: 'Allientic Lab Technologies',
        domain: 'Aether.xperiserv.in',
        supportEmail: 'support@xperiserv.in',
      },
      ipAddress: '127.0.0.1',
      createdAt: now,
    };
    this.state.auditLogs.unshift(log1);
  }

  // --- Audit Logging ---
  public addAuditLog(actorId: string, actorName: string, action: string, resourceType: string, resourceId: string, details: Record<string, unknown>, ipAddress = '127.0.0.1') {
    const log: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      actorId,
      actorName,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress,
      createdAt: new Date().toISOString(),
    };
    this.state.auditLogs.unshift(log);
    // Keep recent 1000 logs
    if (this.state.auditLogs.length > 1000) {
      this.state.auditLogs.pop();
    }
  }

  // --- Auth & User Retrieval ---
  public getUserByEmail(email?: string): DbUser | undefined {
    if (!email) return undefined;
    const normalized = email.toLowerCase().trim();
    if (!normalized) return undefined;
    for (const u of this.state.users.values()) {
      if (u.email && u.email.toLowerCase() === normalized) return u;
    }
    return undefined;
  }

  public getUserByPhone(phone?: string): DbUser | undefined {
    if (!phone) return undefined;
    const clean = phone.replace(/\D/g, '');
    if (!clean) return undefined;
    for (const u of this.state.users.values()) {
      if (u.phone) {
        const uClean = u.phone.replace(/\D/g, '');
        if (u.phone === phone || uClean === clean || (clean.length >= 10 && uClean.endsWith(clean))) {
          return u;
        }
      }
    }
    return undefined;
  }

  public getUserByUsername(username: string): DbUser | undefined {
    const normalized = username.toLowerCase().trim();
    for (const u of this.state.users.values()) {
      if (u.username.toLowerCase() === normalized) return u;
    }
    return undefined;
  }

  public getUserById(id: string): DbUser | undefined {
    return this.state.users.get(id);
  }

  public toPublicProfile(user: DbUser): UserProfile {
    const { passwordHash, twoFactorSecret, backupCodes, passkeys, isSuspended, isBanned, banReason, ...publicProfile } = user;
    return publicProfile;
  }

  public ensureUserDefaultChats(userId: string) {
    const user = this.state.users.get(userId);
    if (!user) return;
    const now = new Date().toISOString();

    // 1. Ensure user is in announcements channel
    const annChat = this.state.chats.get('chat_announcements');
    if (annChat && !annChat.members.some(m => m.userId === userId)) {
      annChat.members.push({ userId, role: 'member', joinedAt: now });
    }

    // Default verified contact partners to seed chats with:
    const defaultPartners: Array<{ id: string; defaultMsg: string }> = [
      {
        id: 'usr_aria',
        defaultMsg: 'Hey there! Welcome to Aether ✨ I am Aria Vance, verified creator. Feel free to reach out if you want to collaborate on creative spatial projects!',
      },
      {
        id: 'usr_apex',
        defaultMsg: 'Hello! Welcome to Apex Robotics customer channel. We are a verified commercial partner on Aether. How may our enterprise team assist you today?',
      },
      {
        id: 'usr_support',
        defaultMsg: 'Welcome to Aether! This is official platform support. Our verified helpdesk team is on standby 24/7 for account safety, badges, and technical questions.',
      },
    ];

    for (const partner of defaultPartners) {
      if (partner.id === userId) continue;
      const partnerUser = this.state.users.get(partner.id);
      if (!partnerUser) continue;

      // Check if direct chat already exists
      let existingChat: Chat | undefined;
      for (const c of this.state.chats.values()) {
        if (
          c.type === 'direct' &&
          c.members.some(m => m.userId === userId) &&
          c.members.some(m => m.userId === partner.id)
        ) {
          existingChat = c;
          break;
        }
      }

      if (!existingChat) {
        const chatId = `chat_dm_${partner.id}_${userId}`;
        const newChat: Chat = {
          id: chatId,
          type: 'direct',
          members: [
            { userId, role: 'member', joinedAt: now },
            { userId: partner.id, role: 'member', joinedAt: now },
          ],
          unreadCount: 1,
          disappearingDuration: 'off',
          createdAt: now,
          updatedAt: now,
        };
        this.state.chats.set(newChat.id, newChat);

        const initialMsg: Message = {
          id: `msg_init_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          chatId: newChat.id,
          senderId: partner.id,
          text: partner.defaultMsg,
          reactions: [],
          deletedForUserIds: [],
          status: 'sent',
          createdAt: now,
        };
        this.state.messages.set(initialMsg.id, initialMsg);
        newChat.lastMessage = initialMsg;
      }
    }
  }

  public createUser(data: { email?: string; username: string; displayName: string; password: string; phone?: string; role?: UserRole }): DbUser {
    const now = new Date().toISOString();
    const email = data.email ? data.email.toLowerCase().trim() : '';
    const newUser: DbUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email,
      phone: data.phone,
      username: data.username.toLowerCase().trim(),
      displayName: data.displayName.trim(),
      avatarUrl: `https://images.unsplash.com/photo-${1535713875002 + Math.floor(Math.random() * 100)}?auto=format&fit=crop&w=200&h=200&q=80`,
      about: 'Available on Aether',
      role: data.role || 'user',
      isOnline: true,
      lastSeen: now,
      emailVerified: false,
      phoneVerified: false,
      mfaEnabled: false,
      passkeyCount: 0,
      verificationStatus: 'unverified',
      passwordHash: hashPassword(data.password),
      isSuspended: false,
      isBanned: false,
      createdAt: now,
      privacy: {
        lastSeen: 'everyone',
        onlineStatus: 'everyone',
        profilePhoto: 'everyone',
        about: 'everyone',
        readReceipts: true,
        typingIndicators: true,
        callPermissions: 'everyone',
        allowGroupInvites: 'everyone',
      },
    };
    this.state.users.set(newUser.id, newUser);
    this.addAuditLog(newUser.id, newUser.displayName, 'USER_REGISTERED', 'user', newUser.id, { email: newUser.email, username: newUser.username, phone: newUser.phone });
    this.ensureUserDefaultChats(newUser.id);
    return newUser;
  }

  // --- Sessions ---
  public createSession(userId: string, userAgent = 'Browser Client', ip = '127.0.0.1'): UserSession {
    const id = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();
    const session: UserSession = {
      id,
      userId,
      deviceName: userAgent.includes('Mobile') ? 'Mobile Web / PWA' : 'Desktop Browser',
      browser: userAgent.includes('Chrome') ? 'Chrome' : userAgent.includes('Safari') ? 'Safari' : 'Modern Browser',
      os: userAgent.includes('Mac') ? 'macOS' : userAgent.includes('Windows') ? 'Windows' : 'Linux / Mobile OS',
      ipAddress: ip,
      location: 'Local / Secure Relay',
      isCurrent: true,
      lastActive: now,
      createdAt: now,
    };
    this.state.sessions.set(session.id, session);
    return session;
  }

  public getSession(sessionId: string): UserSession | undefined {
    return this.state.sessions.get(sessionId);
  }

  public revokeSession(sessionId: string): boolean {
    return this.state.sessions.delete(sessionId);
  }

  public getUserSessions(userId: string, currentSessionId?: string): UserSession[] {
    const list: UserSession[] = [];
    for (const s of this.state.sessions.values()) {
      if (s.userId === userId) {
        list.push({
          ...s,
          isCurrent: s.id === currentSessionId,
        });
      }
    }
    return list;
  }

  // --- OTP Verification ---
  public createOtp(identifier: string, purpose: 'email_verify' | 'phone_verify' | 'login_challenge' | 'password_reset'): StoredOtp {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const id = `otp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    const stored: StoredOtp = {
      id,
      identifier: identifier.toLowerCase().trim(),
      code,
      purpose,
      attempts: 0,
      maxAttempts: 5,
      expiresAt,
    };
    this.state.otps.set(id, stored);
    return stored;
  }

  public verifyOtp(identifier: string, code: string, purpose: string): { success: boolean; error?: string } {
    const norm = identifier.toLowerCase().trim();
    for (const [id, stored] of this.state.otps.entries()) {
      if (stored.identifier === norm && stored.purpose === purpose) {
        if (Date.now() > stored.expiresAt) {
          this.state.otps.delete(id);
          return { success: false, error: 'Code has expired. Please request a new one.' };
        }
        if (stored.attempts >= stored.maxAttempts) {
          this.state.otps.delete(id);
          return { success: false, error: 'Maximum attempts exceeded. Please request a new code.' };
        }
        if (stored.code === code.trim()) {
          this.state.otps.delete(id);
          return { success: true };
        }
        stored.attempts += 1;
        return { success: false, error: `Invalid code. ${stored.maxAttempts - stored.attempts} attempts remaining.` };
      }
    }
    return { success: false, error: 'No active verification code found.' };
  }

  // --- Full-Text Search ---
  public search(query: string, currentUserId: string): {
    users: UserProfile[];
    messages: (Message & { chatName?: string })[];
    chats: Chat[];
    communities: Community[];
  } {
    const q = query.toLowerCase().trim();
    if (!q) return { users: [], messages: [], chats: [], communities: [] };

    // Users
    const matchedUsers: UserProfile[] = [];
    const cleanDigits = q.replace(/\D/g, '');

    for (const u of this.state.users.values()) {
      const matchUsername = u.username.toLowerCase().includes(q);
      const matchDisplayName = u.displayName.toLowerCase().includes(q);
      const matchEmail = u.email && u.email.toLowerCase().includes(q);
      const userPhoneDigits = (u.phone || '').replace(/\D/g, '');
      const matchPhone = (u.phone && u.phone.includes(q)) || (cleanDigits.length >= 3 && userPhoneDigits.includes(cleanDigits));

      if (matchUsername || matchDisplayName || matchEmail || matchPhone) {
        matchedUsers.push(this.toPublicProfile(u));
      }
    }

    // Chats where current user is member
    const matchedChats: Chat[] = [];
    for (const c of this.state.chats.values()) {
      const isMember = c.members.some(m => m.userId === currentUserId);
      if (isMember) {
        if (
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.description && c.description.toLowerCase().includes(q))
        ) {
          matchedChats.push(c);
        }
      }
    }

    // Messages
    const matchedMessages: (Message & { chatName?: string })[] = [];
    for (const m of this.state.messages.values()) {
      const chat = this.state.chats.get(m.chatId);
      if (!chat) continue;
      const isMember = chat.members.some(mem => mem.userId === currentUserId);
      if (!isMember) continue;
      if (m.deletedForEveryone || m.deletedForUserIds.includes(currentUserId)) continue;

      if (m.text && m.text.toLowerCase().includes(q)) {
        matchedMessages.push({
          ...m,
          chatName: chat.name || 'Direct Chat',
        });
      }
    }

    // Communities
    const matchedCommunities: Community[] = [];
    for (const com of this.state.communities.values()) {
      if (
        com.name.toLowerCase().includes(q) ||
        com.description.toLowerCase().includes(q)
      ) {
        matchedCommunities.push(com);
      }
    }

    return {
      users: matchedUsers.slice(0, 20),
      messages: matchedMessages.slice(0, 30),
      chats: matchedChats.slice(0, 20),
      communities: matchedCommunities.slice(0, 10),
    };
  }

  // --- Admin User Verification Control ---
  public setUserVerification(
    userId: string,
    status: VerificationStatus,
    category: VerificationCategory = 'individual',
    reason = '',
    expiryDays = 365,
    actorId = 'usr_admin',
    actorName = 'System Administrator'
  ): DbUser | undefined {
    const user = this.state.users.get(userId);
    if (!user) return undefined;
    const now = new Date().toISOString();
    user.verificationStatus = status;
    if (status === 'verified') {
      user.verificationCategory = category;
      user.verifiedAt = now;
      user.verificationReason = reason || 'Admin verified account';
      user.verificationExpiry = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
    } else if (status === 'revoked' || status === 'unverified') {
      user.verificationExpiry = undefined;
      user.verificationReason = reason || `Status set to ${status}`;
    } else if (status === 'pending') {
      user.verificationReason = reason || 'Pending admin review';
    }

    this.state.verificationHistory.unshift({
      id: `vh_${Date.now()}`,
      userId,
      action: `VERIFICATION_${status.toUpperCase()}`,
      actorId,
      notes: reason || `Updated to ${status}`,
      createdAt: now,
    });

    this.addAuditLog(actorId, actorName, 'USER_VERIFICATION_UPDATED', 'user', userId, {
      status,
      category,
      reason,
    });
    return user;
  }

  // --- One-Click Database Backup & Restore ---
  public createBackup(name = 'Manual Backup', actorId = 'usr_admin', actorName = 'System Administrator') {
    const id = `bkp_${Date.now()}`;
    const timestamp = new Date().toISOString();
    const data = this.exportDatabaseJson();
    const jsonStr = JSON.stringify(data);
    const snapshot = {
      id,
      timestamp,
      name,
      userCount: this.state.users.size,
      messageCount: this.state.messages.size,
      chatCount: this.state.chats.size,
      sizeBytes: Buffer.byteLength(jsonStr, 'utf8'),
      data,
    };
    this.state.backups.unshift(snapshot);
    if (this.state.backups.length > 20) {
      this.state.backups = this.state.backups.slice(0, 20);
    }
    this.addAuditLog(actorId, actorName, 'DATABASE_BACKUP_CREATED', 'system', id, {
      snapshotId: id,
      name,
      sizeBytes: snapshot.sizeBytes,
    });
    return snapshot;
  }

  public restoreBackup(backupIdOrData: string | any, actorId = 'usr_admin', actorName = 'System Administrator'): { success: boolean; error?: string } {
    let dataToRestore: any = null;
    if (typeof backupIdOrData === 'string') {
      const found = this.state.backups.find(b => b.id === backupIdOrData);
      if (!found) return { success: false, error: 'Backup snapshot not found in system history.' };
      dataToRestore = found.data;
    } else if (typeof backupIdOrData === 'object' && backupIdOrData !== null) {
      dataToRestore = backupIdOrData;
    }

    if (!dataToRestore || !dataToRestore.users) {
      return { success: false, error: 'Invalid backup file structure. Missing users entity.' };
    }

    try {
      // 1. Restore Users
      this.state.users.clear();
      for (const u of dataToRestore.users || []) {
        this.state.users.set(u.id, u);
      }

      // 2. Restore Chats
      this.state.chats.clear();
      for (const c of dataToRestore.chats || []) {
        this.state.chats.set(c.id, c);
      }

      // 3. Restore Messages
      this.state.messages.clear();
      for (const m of dataToRestore.messages || []) {
        this.state.messages.set(m.id, m);
      }

      // 4. Restore Communities
      this.state.communities.clear();
      for (const comm of dataToRestore.communities || []) {
        this.state.communities.set(comm.id, comm);
      }

      // 5. Restore Reports
      this.state.reports.clear();
      for (const r of dataToRestore.reports || []) {
        this.state.reports.set(r.id, r);
      }

      // 6. Restore Settings if present
      if (dataToRestore.branding) {
        this.state.branding = { ...this.state.branding, ...dataToRestore.branding };
      }
      if (dataToRestore.smtpConfig) {
        this.state.smtpConfig = { ...this.state.smtpConfig, ...dataToRestore.smtpConfig };
      }
      if (dataToRestore.smsConfig) {
        this.state.smsConfig = { ...this.state.smsConfig, ...dataToRestore.smsConfig };
      }
      if (dataToRestore.featureFlags) {
        this.state.featureFlags = { ...this.state.featureFlags, ...dataToRestore.featureFlags };
      }

      this.addAuditLog(actorId, actorName, 'DATABASE_RESTORE_EXECUTED', 'system', 'database', {
        restoredUsers: this.state.users.size,
        restoredMessages: this.state.messages.size,
        restoredChats: this.state.chats.size,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to execute restore.' };
    }
  }

  public exportDatabaseJson(): any {
    return {
      version: '2.5.0',
      exportedAt: new Date().toISOString(),
      branding: this.state.branding,
      smtpConfig: this.state.smtpConfig,
      smsConfig: this.state.smsConfig,
      featureFlags: this.state.featureFlags,
      users: Array.from(this.state.users.values()),
      chats: Array.from(this.state.chats.values()),
      messages: Array.from(this.state.messages.values()),
      communities: Array.from(this.state.communities.values()),
      reports: Array.from(this.state.reports.values()),
      verificationRequests: Array.from(this.state.verificationRequests.values()),
      verificationHistory: this.state.verificationHistory,
      auditLogs: this.state.auditLogs.slice(0, 500),
      callsHistory: this.state.callsHistory,
      notificationsHistory: this.state.notificationsHistory,
    };
  }
}

export const db = new Database();
