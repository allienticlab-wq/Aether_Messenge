import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useBranding } from '../../context/BrandingContext.js';
import { UserSession } from '../../types/index.js';
import {
  X,
  User,
  Shield,
  Smartphone,
  KeyRound,
  Palette,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Laptop,
  Globe,
  Award
} from 'lucide-react';
import { VerifiedBadge } from '../common/VerifiedBadge.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenVerificationModal: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onOpenVerificationModal }) => {
  const { currentUser, updateProfile, updatePrivacy, refreshUser } = useAuth();
  const { branding, theme, setTheme, accentColor, setAccentColor } = useBranding();

  const [activeTab, setActiveTab] = useState<'profile' | 'privacy' | 'security' | 'sessions' | 'appearance' | 'account'>('profile');

  // Profile Form
  const [displayName, setDisplayName] = useState('');
  const [about, setAbout] = useState('');
  const [customStatus, setCustomStatus] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Privacy State
  const [lastSeen, setLastSeen] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');
  const [readReceipts, setReadReceipts] = useState(true);
  const [typingIndicators, setTypingIndicators] = useState(true);
  const [callPermissions, setCallPermissions] = useState<'everyone' | 'contacts' | 'nobody'>('everyone');

  // Security Form
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [emailOtp, setEmailOtp] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [mfaData, setMfaData] = useState<{ secret: string; otpAuthUrl: string; backupCodes: string[] } | null>(null);
  const [mfaVerifyCode, setMfaVerifyCode] = useState('');
  const [passkeyDeviceName, setPasskeyDeviceName] = useState('My Security Key');
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName);
      setAbout(currentUser.about || 'Available');
      setCustomStatus(currentUser.customStatus || '');
      setAvatarUrl(currentUser.avatarUrl || '');
      setLastSeen(currentUser.privacy.lastSeen);
      setReadReceipts(currentUser.privacy.readReceipts);
      setTypingIndicators(currentUser.privacy.typingIndicators);
      setCallPermissions(currentUser.privacy.callPermissions);
      setPhoneNumber(currentUser.phone || '');
    }
  }, [currentUser]);

  useEffect(() => {
    if (isOpen && activeTab === 'sessions' && currentUser) {
      fetch('/api/auth/sessions', {
        headers: { 'x-user-id': currentUser.id },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.sessions) setSessions(data.sessions);
        });
    }
  }, [isOpen, activeTab, currentUser]);

  if (!isOpen || !currentUser) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updateProfile({ displayName, about, customStatus, avatarUrl });
    if (success) {
      setNotificationMsg({ type: 'success', text: 'Profile changes saved.' });
    }
  };

  const handleSavePrivacy = async () => {
    const success = await updatePrivacy({
      ...currentUser.privacy,
      lastSeen,
      readReceipts,
      typingIndicators,
      callPermissions,
    });
    if (success) {
      setNotificationMsg({ type: 'success', text: 'Privacy preferences updated.' });
    }
  };

  const handleRequestEmailOtp = async () => {
    const res = await fetch('/api/verification/email/request-otp', {
      method: 'POST',
      headers: { 'x-user-id': currentUser.id },
    });
    const data = await res.json();
    setNotificationMsg({ type: res.ok ? 'success' : 'error', text: data.message || data.error });
  };

  const handleVerifyEmailOtp = async () => {
    const res = await fetch('/api/verification/email/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
      body: JSON.stringify({ code: emailOtp }),
    });
    const data = await res.json();
    if (res.ok) {
      setNotificationMsg({ type: 'success', text: 'Email successfully verified!' });
      setEmailOtp('');
      await refreshUser();
    } else {
      setNotificationMsg({ type: 'error', text: data.error || 'Failed to verify email.' });
    }
  };

  const handleRequestPhoneOtp = async () => {
    const res = await fetch('/api/verification/phone/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
      body: JSON.stringify({ phone: phoneNumber }),
    });
    const data = await res.json();
    setNotificationMsg({ type: res.ok ? 'success' : 'error', text: data.message || data.error });
  };

  const handleVerifyPhoneOtp = async () => {
    const res = await fetch('/api/verification/phone/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
      body: JSON.stringify({ code: phoneOtp }),
    });
    const data = await res.json();
    if (res.ok) {
      setNotificationMsg({ type: 'success', text: 'Phone successfully verified!' });
      setPhoneOtp('');
      await refreshUser();
    } else {
      setNotificationMsg({ type: 'error', text: data.error || 'Failed to verify phone.' });
    }
  };

  const handleStartMfaSetup = async () => {
    const res = await fetch('/api/verification/mfa/setup', {
      method: 'POST',
      headers: { 'x-user-id': currentUser.id },
    });
    const data = await res.json();
    setMfaData(data);
  };

  const handleConfirmMfa = async () => {
    const res = await fetch('/api/verification/mfa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
      body: JSON.stringify({ code: mfaVerifyCode }),
    });
    const data = await res.json();
    if (res.ok) {
      setNotificationMsg({ type: 'success', text: 'MFA successfully enabled on your account.' });
      setMfaData(null);
      await refreshUser();
    } else {
      setNotificationMsg({ type: 'error', text: data.error || 'Invalid passcode.' });
    }
  };

  const handleRegisterPasskey = async () => {
    const res = await fetch('/api/verification/passkey/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
      body: JSON.stringify({ deviceName: passkeyDeviceName }),
    });
    const data = await res.json();
    if (res.ok) {
      setNotificationMsg({ type: 'success', text: `Passkey registered for ${passkeyDeviceName}!` });
      await refreshUser();
    }
  };

  const handleExportData = async () => {
    const res = await fetch('/api/auth/account/export', {
      method: 'POST',
      headers: { 'x-user-id': currentUser.id },
    });
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aether-data-export-${currentUser.username}.json`;
    a.click();
    setNotificationMsg({ type: 'success', text: 'Account data archive generated and downloaded.' });
  };

  const handleRevokeSession = async (sessionId: string) => {
    await fetch('/api/auth/revoke-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser.id },
      body: JSON.stringify({ sessionId }),
    });
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-100 text-sm">Settings & Preferences</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-800 bg-slate-950/30 overflow-x-auto text-xs py-2">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'privacy', label: 'Privacy', icon: Shield },
            { id: 'security', label: 'Verification & MFA', icon: KeyRound },
            { id: 'sessions', label: 'Devices', icon: Laptop },
            { id: 'appearance', label: 'Appearance', icon: Palette },
            { id: 'account', label: 'Data & Legal', icon: Globe },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setNotificationMsg(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition font-medium ${
                  active ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/60' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {notificationMsg && (
          <div
            className={`mx-6 mt-4 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
              notificationMsg.type === 'success'
                ? 'bg-cyan-950/40 border border-cyan-800/50 text-cyan-300'
                : 'bg-rose-950/40 border border-rose-800/50 text-rose-300'
            }`}
          >
            {notificationMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{notificationMsg.text}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {/* 1. PROFILE */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Profile Card Header with Verified Badge */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <img
                      src={avatarUrl || currentUser.avatarUrl}
                      alt={displayName}
                      className="w-16 h-16 rounded-full object-cover border-2 border-cyan-500/40 shadow-md"
                    />
                    {currentUser.verificationStatus === 'verified' && (
                      <div className="absolute -bottom-1 -right-1">
                        <VerifiedBadge status="verified" category={currentUser.verificationCategory} size="sm" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-slate-100">{currentUser.displayName}</span>
                      {currentUser.verificationStatus === 'verified' && (
                        <VerifiedBadge status="verified" category={currentUser.verificationCategory} size="md" />
                      )}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="font-mono">@{currentUser.username}</span>
                      {currentUser.phone && <span>&bull; {currentUser.phone}</span>}
                    </div>
                    {currentUser.verificationStatus === 'verified' && (
                      <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-700/50 text-[10px] text-cyan-300 font-medium">
                        <span>Verified {currentUser.verificationCategory || 'Account'}</span>
                        {currentUser.verificationExpiry && (
                          <span className="text-slate-400">&bull; Valid until {new Date(currentUser.verificationExpiry).toLocaleDateString()}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Avatar Image URL</label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-200 mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-200 mb-1">About Bio</label>
                <input
                  type="text"
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-200 mb-1">Custom Status Message</label>
                <input
                  type="text"
                  value={customStatus}
                  onChange={(e) => setCustomStatus(e.target.value)}
                  placeholder="In lab • Deep work"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Verified Status Section */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">Official Verification Mark:</span>
                    <span className="capitalize text-cyan-400 flex items-center gap-1 font-semibold">
                      {currentUser.verificationStatus}
                      {currentUser.verificationStatus === 'verified' && (
                        <VerifiedBadge status="verified" category={currentUser.verificationCategory} size="sm" />
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {currentUser.verificationStatus === 'verified'
                      ? `Your account holds a cryptographically audited verified mark (${currentUser.verificationCategory || 'official'}). Admin-controlled badge.`
                      : 'Request an official verified badge for your profile, business, or organization.'}
                  </p>
                  {currentUser.verificationReason && (
                    <p className="text-[10px] text-cyan-400/80 mt-1 italic font-mono">
                      Badge note: {currentUser.verificationReason}
                    </p>
                  )}
                </div>
                {currentUser.verificationStatus !== 'verified' && (
                  <button
                    type="button"
                    onClick={() => { onClose(); onOpenVerificationModal(); }}
                    className="px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 font-semibold hover:bg-cyan-900/60 transition flex items-center gap-1.5"
                  >
                    <Award className="w-4 h-4" />
                    <span>Apply for Badge</span>
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold transition"
              >
                Save Profile
              </button>
            </form>
          )}

          {/* 2. PRIVACY */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="p-3 bg-cyan-950/20 border border-cyan-800/30 rounded-xl text-[11px] text-slate-400">
                <strong className="text-cyan-400">Non-E2EE Privacy Disclosure:</strong> Aether uses modern TLS 1.3 in transit and AES-256 encryption at rest. Message bodies are server-indexed for instant full-text search, community administration, and authorized moderation.
              </div>

              <div>
                <label className="block font-medium text-slate-200 mb-1">Who can see my Last Seen?</label>
                <select
                  value={lastSeen}
                  onChange={(e) => setLastSeen(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                >
                  <option value="everyone">Everyone</option>
                  <option value="contacts">My Contacts</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-200 mb-1">Who can call me?</label>
                <select
                  value={callPermissions}
                  onChange={(e) => setCallPermissions(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                >
                  <option value="everyone">Everyone</option>
                  <option value="contacts">My Contacts</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                <div>
                  <div className="font-semibold text-slate-200">Read Receipts</div>
                  <div className="text-[11px] text-slate-400">Send double-check marks when messages are viewed.</div>
                </div>
                <input
                  type="checkbox"
                  checked={readReceipts}
                  onChange={(e) => setReadReceipts(e.target.checked)}
                  className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800">
                <div>
                  <div className="font-semibold text-slate-200">Typing Indicators</div>
                  <div className="text-[11px] text-slate-400">Broadcast live typing indicators in active conversations.</div>
                </div>
                <input
                  type="checkbox"
                  checked={typingIndicators}
                  onChange={(e) => setTypingIndicators(e.target.checked)}
                  className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                />
              </div>

              <button
                onClick={handleSavePrivacy}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold transition"
              >
                Update Privacy Settings
              </button>
            </div>
          )}

          {/* 3. SECURITY & MFA */}
          {activeTab === 'security' && (
            <div className="space-y-5">
              {/* Email Verification */}
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">Email Verification:</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${currentUser.emailVerified ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/50' : 'bg-amber-950 text-amber-400 border border-amber-800/50'}`}>
                      {currentUser.emailVerified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                  {!currentUser.emailVerified && (
                    <button
                      onClick={handleRequestEmailOtp}
                      className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                    >
                      Request Code
                    </button>
                  )}
                </div>
                {!currentUser.emailVerified && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value)}
                      placeholder="Enter 6-digit email OTP"
                      className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono tracking-wider focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      onClick={handleVerifyEmailOtp}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold rounded-lg transition"
                    >
                      Verify
                    </button>
                  </div>
                )}
              </div>

              {/* Phone SMS Verification */}
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">Phone SMS OTP:</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${currentUser.phoneVerified ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/50' : 'bg-amber-950 text-amber-400 border border-amber-800/50'}`}>
                      {currentUser.phoneVerified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                  {!currentUser.phoneVerified && (
                    <button
                      onClick={handleRequestPhoneOtp}
                      className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                    >
                      Send SMS OTP
                    </button>
                  )}
                </div>
                {!currentUser.phoneVerified && (
                  <div className="space-y-2">
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+14155550199"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={phoneOtp}
                        onChange={(e) => setPhoneOtp(e.target.value)}
                        placeholder="Enter 6-digit SMS OTP"
                        className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono tracking-wider focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        onClick={handleVerifyPhoneOtp}
                        className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold rounded-lg transition"
                      >
                        Verify Phone
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* TOTP MFA */}
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">Two-Factor Authenticator (TOTP)</div>
                    <div className="text-[11px] text-slate-400">Protect logins using Google Authenticator or 1Password.</div>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${currentUser.mfaEnabled ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/50' : 'bg-slate-800 text-slate-400'}`}>
                    {currentUser.mfaEnabled ? 'Active' : 'Disabled'}
                  </span>
                </div>

                {!currentUser.mfaEnabled && !mfaData && (
                  <button
                    onClick={handleStartMfaSetup}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition flex items-center gap-1.5"
                  >
                    <QrCode className="w-4 h-4 text-cyan-400" />
                    <span>Setup Authenticator App</span>
                  </button>
                )}

                {mfaData && (
                  <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl space-y-3">
                    <div className="text-xs text-slate-200 font-semibold">Scan QR or enter secret into Authenticator:</div>
                    <div className="p-2 bg-slate-950 border border-slate-800 rounded font-mono text-[11px] text-cyan-400 break-all select-all">
                      {mfaData.secret}
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400 mb-1">Backup Recovery Codes (save safely):</div>
                      <div className="grid grid-cols-4 gap-1 text-[10px] font-mono bg-slate-950 p-2 rounded text-slate-300">
                        {mfaData.backupCodes.map((c, i) => (
                          <span key={i}>{c}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        maxLength={6}
                        value={mfaVerifyCode}
                        onChange={(e) => setMfaVerifyCode(e.target.value)}
                        placeholder="6-digit code"
                        className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono tracking-widest text-center"
                      />
                      <button
                        onClick={handleConfirmMfa}
                        className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold rounded-lg transition"
                      >
                        Confirm & Enable
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* WebAuthn Passkeys */}
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">Hardware Passkeys (WebAuthn)</div>
                    <div className="text-[11px] text-slate-400">Passwordless sign-in via Touch ID, Face ID, or YubiKey.</div>
                  </div>
                  <span className="text-[11px] font-medium text-cyan-400">
                    {currentUser.passkeyCount} registered
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={passkeyDeviceName}
                    onChange={(e) => setPasskeyDeviceName(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={handleRegisterPasskey}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition"
                  >
                    Register Passkey
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. SESSIONS & DEVICES */}
          {activeTab === 'sessions' && (
            <div className="space-y-3">
              <div className="font-semibold text-slate-200">Authorized Sessions & Devices</div>
              <div className="space-y-2">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-800 text-cyan-400">
                        {s.deviceName.includes('Mobile') ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200 flex items-center gap-2">
                          <span>{s.deviceName}</span>
                          {s.isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/40">
                              Current Session
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {s.browser} &bull; {s.ipAddress} &bull; {new Date(s.lastActive).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    {!s.isCurrent && (
                      <button
                        onClick={() => handleRevokeSession(s.id)}
                        className="px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-950/40 border border-rose-800/40 rounded-lg transition"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="space-y-5">
              <div>
                <div className="font-semibold text-slate-200 mb-2">Display Theme</div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'dark', label: 'Dark (Default Obsidian)', bg: 'bg-[#090d16]' },
                    { id: 'amoled', label: 'AMOLED (Pitch Black)', bg: 'bg-[#000000]' },
                    { id: 'light', label: 'Light Studio', bg: 'bg-[#f8fafc]' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id as any)}
                      className={`p-3 rounded-xl border text-left transition ${
                        theme === t.id
                          ? 'border-cyan-500 bg-cyan-950/30 text-cyan-300 font-semibold'
                          : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className={`w-full h-8 rounded-lg mb-2 border border-slate-700 ${t.bg}`} />
                      <span className="text-xs">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="font-semibold text-slate-200 mb-2">Accent Highlight Palette</div>
                <div className="flex items-center gap-3">
                  {[
                    { name: 'Cyan', color: '#06b6d4' },
                    { name: 'Violet', color: '#8b5cf6' },
                    { name: 'Emerald', color: '#10b981' },
                    { name: 'Blue', color: '#3b82f6' },
                    { name: 'Amber', color: '#f59e0b' },
                  ].map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setAccentColor(c.color)}
                      style={{ backgroundColor: c.color }}
                      className={`w-7 h-7 rounded-full transition transform hover:scale-110 ${
                        accentColor === c.color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 6. DATA & LEGAL */}
          {activeTab === 'account' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">Export All Account Data</div>
                  <div className="text-[11px] text-slate-400">Download a complete JSON archive of all chats, messages, and metadata.</div>
                </div>
                <button
                  onClick={handleExportData}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Export JSON</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/40 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-rose-300">Permanent Account Deletion</div>
                  <div className="text-[11px] text-slate-400">Irreversibly erase profile credentials, active sessions, and associations.</div>
                </div>
                <button
                  onClick={async () => {
                    if (confirm('Are you absolutely sure you want to permanently erase your account? This action is irreversible.')) {
                      await fetch('/api/auth/account/delete', {
                        method: 'POST',
                        headers: { 'x-user-id': currentUser.id },
                      });
                      window.location.reload();
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 font-medium transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Account</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
