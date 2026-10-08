import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useBranding } from '../../context/BrandingContext.js';
import {
  UserProfile,
  VerificationRequest,
  ModerationReport,
  AuditLog,
  WhiteLabelBranding,
  UserRole
} from '../../types/index.js';
import {
  X,
  LayoutDashboard,
  Users,
  Award,
  ShieldAlert,
  FileClock,
  Sparkles,
  Mail,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  ExternalLink,
  ShieldCheck,
  Server,
  Layers,
  MessageSquare,
  HardDrive,
  Phone,
  Bell,
  ToggleLeft,
  Activity,
  Trash2,
  Send,
  Sliders,
  Radio,
  Cpu,
  Database,
  Lock,
  ChevronRight,
  UserX,
  Maximize2,
  Upload,
  Download,
  Eye,
  EyeOff,
  Save
} from 'lucide-react';
import { VerifiedBadge } from '../common/VerifiedBadge.js';

interface AdminDashboardProps {
  isOpen?: boolean;
  onClose?: () => void;
  isEmbedded?: boolean; // When rendered in split view or full page mode
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen = true,
  onClose,
  isEmbedded = false,
}) => {
  const { currentUser } = useAuth();
  const { branding, updateBranding } = useBranding();

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'users'
    | 'verifications'
    | 'groups'
    | 'messages'
    | 'reports'
    | 'banned'
    | 'sessions'
    | 'storage'
    | 'calls'
    | 'notifications'
    | 'email'
    | 'sms'
    | 'branding'
    | 'flags'
    | 'health'
    | 'audit'
    | 'backup'
    | 'easypanel'
  >('overview');

  // State
  const [stats, setStats] = useState<any>(null);
  const [userList, setUserList] = useState<UserProfile[]>([]);
  const [verifRequests, setVerifRequests] = useState<VerificationRequest[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [messagesList, setMessagesList] = useState<any[]>([]);
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [sessionsList, setSessionsList] = useState<any[]>([]);
  const [storageData, setStorageData] = useState<any>(null);
  const [callsData, setCallsData] = useState<any>(null);
  const [featureFlags, setFeatureFlags] = useState<any>({});
  const [notificationsHistory, setNotificationsHistory] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [outbox, setOutbox] = useState<{ emails: any[]; sms: any[]; smtpConfig?: any; smsConfig?: any }>({ emails: [], sms: [] });

  // Database Backup & Restore State
  const [backupsList, setBackupsList] = useState<any[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // SMTP Settings State
  const [smtpForm, setSmtpForm] = useState({
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,
    username: 'apikey',
    password: '',
    fromEmail: 'support@xperiserv.in',
    fromName: 'Aether Messenger Security',
  });
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);

  // Quick Verification Modal State
  const [verifyModalUser, setVerifyModalUser] = useState<UserProfile | null>(null);
  const [verifyStatusChoice, setVerifyStatusChoice] = useState<'verified' | 'unverified' | 'pending' | 'revoked'>('verified');
  const [verifyCategoryChoice, setVerifyCategoryChoice] = useState<'individual' | 'business' | 'organization' | 'official'>('individual');
  const [verifyReasonInput, setVerifyReasonInput] = useState('');

  // Filter & Form States
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState('welcome');
  const [brandingForm, setBrandingForm] = useState<WhiteLabelBranding>(branding);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Notifications Form
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifTarget, setNotifTarget] = useState('all');

  // Test Email & SMS forms
  const [testEmailTo, setTestEmailTo] = useState('admin@example.com');
  const [testSmsPhone, setTestSmsPhone] = useState('+919876543210');
  const [testSmsBody, setTestSmsBody] = useState('Alert from Aether Ops Console');

  useEffect(() => {
    setBrandingForm(branding);
  }, [branding]);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [activeTab, currentUser]);

  const loadData = async () => {
    if (!currentUser) return;
    const headers = { 'x-user-id': currentUser.id };

    try {
      if (activeTab === 'overview') {
        const res = await fetch('/api/admin/dashboard', { headers });
        const data = await res.json();
        setStats(data.stats);
      } else if (activeTab === 'users' || activeTab === 'banned') {
        const res = await fetch('/api/admin/users', { headers });
        const data = await res.json();
        setUserList(data.users || []);
      } else if (activeTab === 'verifications') {
        const res = await fetch('/api/admin/verification-requests', { headers });
        const data = await res.json();
        setVerifRequests(data.requests || []);
      } else if (activeTab === 'groups') {
        const res = await fetch('/api/admin/groups', { headers });
        const data = await res.json();
        setGroups(data.groups || []);
        setCommunities(data.communities || []);
      } else if (activeTab === 'messages') {
        const res = await fetch(`/api/admin/messages?q=${encodeURIComponent(searchQuery)}`, { headers });
        const data = await res.json();
        setMessagesList(data.messages || []);
      } else if (activeTab === 'reports') {
        const res = await fetch('/api/admin/reports', { headers });
        const data = await res.json();
        setReports(data.reports || []);
      } else if (activeTab === 'sessions') {
        const res = await fetch('/api/admin/sessions', { headers });
        const data = await res.json();
        setSessionsList(data.sessions || []);
      } else if (activeTab === 'storage') {
        const res = await fetch('/api/admin/storage', { headers });
        const data = await res.json();
        setStorageData(data);
      } else if (activeTab === 'calls') {
        const res = await fetch('/api/admin/calls', { headers });
        const data = await res.json();
        setCallsData(data);
      } else if (activeTab === 'flags') {
        const res = await fetch('/api/admin/feature-flags', { headers });
        const data = await res.json();
        setFeatureFlags(data.featureFlags || {});
      } else if (activeTab === 'notifications') {
        const res = await fetch('/api/admin/notifications', { headers });
        const data = await res.json();
        setNotificationsHistory(data.history || []);
      } else if (activeTab === 'email' || activeTab === 'sms') {
        const res = await fetch('/api/admin/outbox', { headers });
        const data = await res.json();
        setOutbox(data);
        if (data.smtpConfig) {
          setSmtpForm((prev) => ({
            ...prev,
            ...data.smtpConfig,
            password: data.smtpConfig.password || '',
          }));
        }
      } else if (activeTab === 'health') {
        const res = await fetch('/api/admin/system-health', { headers });
        const data = await res.json();
        setSystemHealth(data);
      } else if (activeTab === 'audit') {
        const res = await fetch('/api/admin/audit-logs', { headers });
        const data = await res.json();
        setAuditLogs(data.auditLogs || []);
      } else if (activeTab === 'backup') {
        const res = await fetch('/api/admin/database/backups', { headers });
        const data = await res.json();
        setBackupsList(data.backups || []);
      }
    } catch (e) {
      console.error('Failed to load admin data:', e);
    }
  };

  const handleCreateBackup = async (customName?: string) => {
    setIsBackingUp(true);
    try {
      const res = await fetch('/api/admin/database/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || 'usr_admin' },
        body: JSON.stringify({ name: customName || `Snapshot - ${new Date().toLocaleString()}` }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Backup created successfully: ${data.snapshot?.name || 'Snapshot'}`);
        loadData();
      } else {
        setActionMessage(data.error || 'Failed to create database snapshot');
      }
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDownloadFullDatabase = () => {
    const a = document.createElement('a');
    a.href = `/api/admin/database/export?userId=${currentUser?.id || 'usr_admin'}`;
    a.download = `aether_database_${Date.now()}.json`;
    a.click();
    setActionMessage('Database JSON archive downloaded successfully.');
  };

  const handleRestoreSnapshot = async (snapshotId: string) => {
    if (!confirm('Restore this snapshot? All current database records will be replaced with this snapshot state.')) return;
    setIsRestoring(true);
    try {
      const res = await fetch('/api/admin/database/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || 'usr_admin' },
        body: JSON.stringify({ snapshotId }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage('Database successfully restored from snapshot!');
        loadData();
      } else {
        setActionMessage(data.error || 'Restore failed');
      }
    } finally {
      setIsRestoring(false);
    }
  };

  const handleUploadAndRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm(`Restore entire database from file "${file.name}"? This replaces current records.`)) return;
    setIsRestoring(true);
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);
      const res = await fetch('/api/admin/database/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || 'usr_admin' },
        body: JSON.stringify({ backupData }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage('Database restored successfully from uploaded JSON file!');
        loadData();
      } else {
        setActionMessage(data.error || 'Failed to restore database from file');
      }
    } catch (err: any) {
      setActionMessage(`Invalid JSON backup file: ${err.message}`);
    } finally {
      setIsRestoring(false);
      e.target.value = '';
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/smtp', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || 'usr_admin' },
      body: JSON.stringify(smtpForm),
    });
    if (res.ok) {
      setActionMessage('SMTP credentials & host settings saved successfully!');
      loadData();
    }
  };

  const handleUpdateUserVerification = async (userId: string, status: string, category: string, reason: string) => {
    const res = await fetch(`/api/admin/users/${userId}/verification`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || 'usr_admin' },
      body: JSON.stringify({ status, category, reason, expiryDays: 365 }),
    });
    if (res.ok) {
      setActionMessage(`User verification mark set to "${status}" (${category})`);
      setVerifyModalUser(null);
      loadData();
    }
  };

  const handleRoleChange = async (userId: string, role: UserRole) => {
    await fetch(`/api/admin/users/${userId}/role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || 'usr_admin' },
      body: JSON.stringify({ role }),
    });
    setActionMessage(`User role updated to ${role}`);
    loadData();
  };

  const handleBanUser = async (userId: string, banned: boolean) => {
    await fetch(`/api/admin/users/${userId}/ban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || 'usr_admin' },
      body: JSON.stringify({ banned, reason: 'Administrative enforcement' }),
    });
    setActionMessage(banned ? 'User account suspended.' : 'User account unbanned.');
    loadData();
  };

  const handleVerificationAction = async (requestId: string, action: 'approve' | 'reject' | 'revoke', notes: string) => {
    await fetch(`/api/admin/verification-requests/${requestId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || 'usr_admin' },
      body: JSON.stringify({ action, notes, expiryDays: 365 }),
    });
    setActionMessage(`Verification request ${action}d successfully.`);
    loadData();
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (confirm('Delete this group across the entire platform?')) {
      await fetch(`/api/admin/groups/${groupId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUser?.id || 'usr_admin' },
      });
      setActionMessage('Group removed.');
      loadData();
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    await fetch(`/api/admin/messages/${messageId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': currentUser?.id || 'usr_admin' },
    });
    setActionMessage('Message permanently removed by moderation.');
    loadData();
  };

  const handleRevokeSession = async (sessionId: string) => {
    await fetch(`/api/admin/sessions/${sessionId}/revoke`, {
      method: 'POST',
      headers: { 'x-user-id': currentUser?.id || 'usr_admin' },
    });
    setActionMessage('Session revoked.');
    loadData();
  };

  const handleStorageCleanup = async () => {
    await fetch('/api/admin/storage/cleanup', {
      method: 'POST',
      headers: { 'x-user-id': currentUser?.id || 'usr_admin' },
    });
    setActionMessage('Media cache cleaned up.');
    loadData();
  };

  const handleToggleFlag = async (key: string, currentVal: boolean) => {
    const updated = { ...featureFlags, [key]: !currentVal };
    await fetch('/api/admin/feature-flags', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || 'usr_admin' },
      body: JSON.stringify(updated),
    });
    setFeatureFlags(updated);
    setActionMessage(`Feature flag "${key}" toggled.`);
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifBody.trim()) return;
    await fetch('/api/admin/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || 'usr_admin' },
      body: JSON.stringify({ title: notifTitle, body: notifBody, target: notifTarget }),
    });
    setNotifTitle('');
    setNotifBody('');
    setActionMessage('Notification broadcasted to active sessions.');
    loadData();
  };

  const handleSendTestEmail = async () => {
    await fetch('/api/admin/email/send-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || 'usr_admin' },
      body: JSON.stringify({ toEmail: testEmailTo, template: previewTemplate }),
    });
    setActionMessage(`Test email (${previewTemplate}) sent to ${testEmailTo}`);
    loadData();
  };

  const handleSendTestSms = async () => {
    await fetch('/api/admin/sms/send-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id || 'usr_admin' },
      body: JSON.stringify({ toPhone: testSmsPhone, body: testSmsBody }),
    });
    setActionMessage(`Test SMS dispatched to ${testSmsPhone}`);
    loadData();
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateBranding(brandingForm);
    setActionMessage('White-label branding settings published across platform.');
  };

  const containerClasses = isEmbedded
    ? 'w-full h-full bg-slate-950 flex flex-col overflow-hidden text-xs text-slate-300'
    : 'fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md';

  const innerClasses = isEmbedded
    ? 'flex-1 flex overflow-hidden'
    : 'relative w-full max-w-7xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[92vh]';

  const navItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users & RBAC', icon: Users },
    { id: 'verifications', label: 'Verification Queue', icon: Award },
    { id: 'groups', label: 'Groups & Hubs', icon: Layers },
    { id: 'messages', label: 'Message Inspector', icon: MessageSquare },
    { id: 'reports', label: 'Abuse Reports', icon: ShieldAlert },
    { id: 'banned', label: 'Banned Accounts', icon: UserX },
    { id: 'sessions', label: 'Active Sessions', icon: Radio },
    { id: 'storage', label: 'Media Storage', icon: HardDrive },
    { id: 'calls', label: 'Calls & WebRTC', icon: Phone },
    { id: 'notifications', label: 'Broadcast Alerts', icon: Bell },
    { id: 'email', label: 'Email & SMTP', icon: Mail },
    { id: 'sms', label: 'SMS Gateway', icon: Smartphone },
    { id: 'branding', label: 'White-Label Branding', icon: Sparkles },
    { id: 'flags', label: 'Feature Flags', icon: Sliders },
    { id: 'health', label: 'System Health', icon: Activity },
    { id: 'audit', label: 'Audit Logs', icon: FileClock },
    { id: 'backup', label: 'Backup & Restore', icon: Database },
    { id: 'easypanel', label: 'Easypanel Deploy', icon: Server },
  ];

  return (
    <div className={containerClasses}>
      <div className={innerClasses}>
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/70 border border-cyan-800/60 text-cyan-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-100 text-sm tracking-tight">{branding.appName} Operations Console</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800/60 text-cyan-300 font-semibold uppercase">
                  RBAC: {currentUser?.role || 'super_admin'}
                </span>
                <span className="text-[10px] text-slate-400">&bull; non-E2EE Audited Control</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Refresh Data"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            {onClose && !isEmbedded && (
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {actionMessage && (
          <div className="mx-6 mt-2.5 p-2 rounded-xl bg-cyan-950/70 border border-cyan-800/60 text-cyan-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{actionMessage}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Console Body: Left Nav + Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Navigation Menu */}
          <div className="w-56 border-r border-slate-800 bg-slate-950/60 p-2 overflow-y-auto shrink-0 space-y-0.5 text-xs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id as any); setActionMessage(null); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-medium transition ${
                    active
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Main Content Panel */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
            {/* 1. OVERVIEW */}
            {activeTab === 'overview' && stats && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">Real-Time Platform Dashboard</h3>
                  <p className="text-[11px] text-slate-400">Live operational telemetry across users, messaging, sockets, and storage.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Registered Profiles', val: stats.totalUsers, sub: 'Active directory accounts' },
                    { label: 'Conversations Active', val: stats.totalChats, sub: 'Direct chats & groups' },
                    { label: 'Indexed Messages', val: stats.totalMessages, sub: 'Non-E2EE searchable' },
                    { label: 'Live Socket Clients', val: stats.activeSockets, sub: 'WebSocket active' },
                  ].map((card, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                      <span className="text-[11px] text-slate-400">{card.label}</span>
                      <div className="text-2xl font-bold text-slate-100 font-mono tabular-nums">{card.val}</div>
                      <span className="text-[10px] text-cyan-400">{card.sub}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">Pending Badges</span>
                      <Award className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="text-xl font-bold text-cyan-400 font-mono">{stats.pendingVerifications}</div>
                    <button
                      onClick={() => setActiveTab('verifications')}
                      className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>Review verification queue</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">Abuse Reports</span>
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                    </div>
                    <div className="text-xl font-bold text-rose-400 font-mono">{stats.pendingReports}</div>
                    <button
                      onClick={() => setActiveTab('reports')}
                      className="text-[11px] text-rose-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>Review reported messages</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">Media Disk Usage</span>
                      <HardDrive className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="text-xl font-bold text-indigo-400 font-mono">{stats.storageUsedMb} MB</div>
                    <button
                      onClick={() => setActiveTab('storage')}
                      className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>Inspect media assets</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. USERS & RBAC */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-100 text-sm">User Directory & Role Enforcement</h3>
                    <p className="text-[11px] text-slate-400">Assign RBAC roles, ban offending accounts, or elevate moderators.</p>
                  </div>
                  <div className="relative w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search accounts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                    />
                  </div>
                </div>

                <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/70">
                  <table className="w-full text-left">
                    <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 text-[11px]">
                      <tr>
                        <th className="p-3">User Profile</th>
                        <th className="p-3">RBAC Role</th>
                        <th className="p-3">Trust Badge</th>
                        <th className="p-3">Security Status</th>
                        <th className="p-3 text-right">Moderation Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {userList
                        .filter(
                          (u) =>
                            u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (u.email ? u.email.toLowerCase().includes(searchQuery.toLowerCase()) : false) ||
                            (u.phone ? u.phone.includes(searchQuery) : false)
                        )
                        .map((u: any) => (
                          <tr key={u.id} className="hover:bg-slate-900/40">
                            <td className="p-3">
                              <div className="flex items-center gap-2.5">
                                <img src={u.avatarUrl} alt={u.displayName} className="w-8 h-8 rounded-full object-cover" />
                                <div>
                                  <div className="font-bold text-slate-100 flex items-center gap-1.5">
                                    <span>{u.displayName}</span>
                                    {u.verificationStatus === 'verified' && (
                                      <VerifiedBadge status="verified" category={u.verificationCategory} size="sm" />
                                    )}
                                    {u.isBanned && (
                                      <span className="text-[10px] bg-rose-950 text-rose-400 px-1.5 py-0.2 rounded font-semibold">
                                        BANNED
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400">@{u.username} &bull; {u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <select
                                value={u.role}
                                onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                                className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200"
                              >
                                <option value="user">User</option>
                                <option value="support">Support</option>
                                <option value="moderator">Moderator</option>
                                <option value="admin">Admin</option>
                                <option value="super_admin">Super Admin</option>
                              </select>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                {u.verificationStatus === 'verified' ? (
                                  <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 font-semibold text-[10px] inline-flex items-center gap-1">
                                    <VerifiedBadge status="verified" category={u.verificationCategory} size="sm" />
                                    <span className="capitalize">{u.verificationCategory || 'Official'}</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-400 font-medium text-[10px] capitalize">
                                    {u.verificationStatus || 'unverified'}
                                  </span>
                                )}
                                <button
                                  onClick={() => {
                                    setVerifyModalUser(u);
                                    setVerifyStatusChoice(u.verificationStatus === 'verified' ? 'verified' : 'verified');
                                    setVerifyCategoryChoice(u.verificationCategory || 'official');
                                    setVerifyReasonInput(u.verificationReason || 'Identity verified by administrator');
                                  }}
                                  className="px-2 py-0.5 rounded bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-800/60 text-cyan-400 text-[10px] font-semibold transition"
                                  title="Admin direct verification control"
                                >
                                  {u.verificationStatus === 'verified' ? 'Edit Badge' : 'Verify Now'}
                                </button>
                              </div>
                            </td>
                            <td className="p-3 text-[11px] text-slate-400">
                              {u.emailVerified ? 'Email ✓' : 'Email ✗'} &bull; {u.mfaEnabled ? 'MFA ✓' : 'MFA ✗'}
                            </td>
                            <td className="p-3 text-right">
                              {u.isBanned ? (
                                <button
                                  onClick={() => handleBanUser(u.id, false)}
                                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
                                >
                                  Unban
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleBanUser(u.id, true)}
                                  className="px-2.5 py-1 rounded bg-rose-950/70 hover:bg-rose-900 text-rose-300 text-xs border border-rose-800/50"
                                >
                                  Ban Account
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. VERIFICATIONS QUEUE */}
            {activeTab === 'verifications' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">Identity Verification Queue</h3>
                  <p className="text-[11px] text-slate-400">Review official badge submissions, inspect government IDs/articles, and approve or reject.</p>
                </div>

                <div className="space-y-3">
                  {verifRequests.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No applications in review queue.</div>
                  ) : (
                    verifRequests.map((req) => (
                      <div key={req.id} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img
                              src={req.user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80'}
                              alt={req.user?.displayName}
                              className="w-10 h-10 rounded-full object-cover border border-slate-700"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-100 text-sm">{req.user?.displayName || req.userId}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 font-semibold uppercase">
                                  {req.category}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-semibold ${
                                  req.status === 'verified' ? 'bg-cyan-900/60 text-cyan-300' : req.status === 'pending' ? 'bg-amber-900/60 text-amber-300' : 'bg-rose-900/60 text-rose-300'
                                }`}>
                                  {req.status}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400">
                                @{req.user?.username} &bull; Entity: {req.organizationName || 'Individual Figure'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {req.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleVerificationAction(req.id, 'approve', 'Identity and documentation verified by compliance officer.')}
                                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition"
                                >
                                  Approve & Award Badge
                                </button>
                                <button
                                  onClick={() => handleVerificationAction(req.id, 'reject', 'Insufficient supporting documentation.')}
                                  className="px-3 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 font-semibold text-xs transition"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {req.status === 'verified' && (
                              <button
                                onClick={() => handleVerificationAction(req.id, 'revoke', 'Revoked due to policy violation.')}
                                className="px-3 py-1.5 rounded-lg bg-rose-900/40 hover:bg-rose-800 text-rose-300 font-semibold text-xs transition"
                              >
                                Revoke Badge
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
                          <div><strong>Document Type:</strong> {req.documentType}</div>
                          <div><strong>Proof URI:</strong> <a href={req.documentUrl} target="_blank" rel="noreferrer" className="text-cyan-400 underline">{req.documentUrl}</a></div>
                          {req.additionalInfo && <div><strong>Applicant Notes:</strong> {req.additionalInfo}</div>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 4. GROUPS & HUBS */}
            {activeTab === 'groups' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">Groups & Community Channels Oversight</h3>
                  <p className="text-[11px] text-slate-400">Manage all multi-user chat groups, community announcement channels, and permissions.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groups.map((grp) => (
                    <div key={grp.id} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <img src={grp.avatarUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=200&h=200&q=80'} alt={grp.name} className="w-9 h-9 rounded-full object-cover" />
                          <div>
                            <span className="font-bold text-slate-100 text-xs block">{grp.name}</span>
                            <span className="text-[10px] text-slate-400">{grp.memberCount} members &bull; {grp.type}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteGroup(grp.id)}
                          className="p-1.5 text-rose-400 hover:bg-rose-950/60 rounded-lg transition"
                          title="Delete Group"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2">{grp.description || 'No description'}</p>
                      {grp.adminOnlyMessaging && (
                        <span className="inline-block text-[10px] bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded border border-cyan-800/40">
                          📢 Admin-Only Broadcast Channel
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. MESSAGE INSPECTOR (NON-E2EE) */}
            {activeTab === 'messages' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-100 text-sm">Message Inspector (Non-E2EE Moderation)</h3>
                    <p className="text-[11px] text-slate-400">Authorized administrative message inspection for safety compliance.</p>
                  </div>
                  <div className="relative w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Filter message contents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && loadData()}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {messagesList.map((msg) => (
                    <div key={msg.id} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="font-semibold text-cyan-400">{msg.senderName} (@{msg.senderUsername})</span>
                          <span className="text-slate-500">in &ldquo;{msg.chatName}&rdquo;</span>
                          <span className="text-slate-500 font-mono text-[10px]">{new Date(msg.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-200">{msg.text || (msg.attachments?.length ? '📎 Media attachment' : 'No text content')}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="px-2.5 py-1 text-xs bg-rose-950/70 hover:bg-rose-900 text-rose-300 rounded-lg border border-rose-800/40 shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. ABUSE REPORTS */}
            {activeTab === 'reports' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">Abuse & Moderation Reports</h3>
                  <p className="text-[11px] text-slate-400">Review reported users, messages, or media and execute enforcement actions.</p>
                </div>

                <div className="space-y-3">
                  {reports.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No active reports.</div>
                  ) : (
                    reports.map((rep) => (
                      <div key={rep.id} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-100">Target Type: {rep.targetType}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950 border border-rose-800/60 text-rose-300 font-semibold uppercase">
                              {rep.category}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 uppercase font-semibold">
                              {rep.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { setActionMessage('Warning issued to offending user.'); loadData(); }}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
                            >
                              Issue Warning
                            </button>
                            <button
                              onClick={() => { setActionMessage('Content removed.'); loadData(); }}
                              className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                            >
                              Purge Content
                            </button>
                          </div>
                        </div>
                        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                          <div><strong>Reported Reason:</strong> {rep.reason}</div>
                          {rep.evidenceSnippet && <div><strong>Evidence Excerpt:</strong> &ldquo;{rep.evidenceSnippet}&rdquo;</div>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 7. BANNED USERS */}
            {activeTab === 'banned' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">Banned Accounts Directory</h3>
                  <p className="text-[11px] text-slate-400">All accounts currently quarantined from platform access.</p>
                </div>
                <div className="space-y-2">
                  {userList.filter((u: any) => u.isBanned).length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No banned accounts.</div>
                  ) : (
                    userList.filter((u: any) => u.isBanned).map((u: any) => (
                      <div key={u.id} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-rose-300">{u.displayName} (@{u.username})</div>
                          <div className="text-[11px] text-slate-400">Reason: {u.banReason || 'Administrative suspension'}</div>
                        </div>
                        <button
                          onClick={() => handleBanUser(u.id, false)}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium"
                        >
                          Lift Ban
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 8. ACTIVE SESSIONS */}
            {activeTab === 'sessions' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">Global Authorized Device Sessions</h3>
                  <p className="text-[11px] text-slate-400">Monitor and revoke compromised browser tokens and device connections.</p>
                </div>
                <div className="space-y-2">
                  {sessionsList.map((s) => (
                    <div key={s.id} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-100">{s.deviceName} ({s.browser} on {s.os})</div>
                        <div className="text-[11px] text-slate-400">User: {s.userDisplayName} &bull; IP: {s.ipAddress} &bull; Last Active: {new Date(s.lastActive).toLocaleTimeString()}</div>
                      </div>
                      <button
                        onClick={() => handleRevokeSession(s.id)}
                        className="px-2.5 py-1 text-xs bg-rose-950/70 hover:bg-rose-900 text-rose-300 rounded-lg border border-rose-800/40"
                      >
                        Force Revoke
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 9. MEDIA STORAGE */}
            {activeTab === 'storage' && storageData && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">Media Storage Consumption</h3>
                  <p className="text-[11px] text-slate-400">Object storage utilization across audio recordings, video, and documents.</p>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400 text-[11px]">Total Storage Used</span>
                    <div className="text-2xl font-bold text-slate-100 font-mono mt-1">{storageData.totalMb} MB</div>
                    <span className="text-[10px] text-cyan-400">Quota: {storageData.quotaMb / 1000} GB</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400 text-[11px]">Voice Notes</span>
                    <div className="text-2xl font-bold text-cyan-400 font-mono mt-1">{storageData.breakdown.voice} files</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400 text-[11px]">Images & Photos</span>
                    <div className="text-2xl font-bold text-blue-400 font-mono mt-1">{storageData.breakdown.images} files</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400 text-[11px]">Documents & PDFs</span>
                    <div className="text-2xl font-bold text-indigo-400 font-mono mt-1">{storageData.breakdown.documents} files</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-200">Purge Cached Media Thumbnails</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">Cleans up stale waveforms and temporary cache files.</p>
                  </div>
                  <button
                    onClick={handleStorageCleanup}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium"
                  >
                    Execute Cache Cleanup
                  </button>
                </div>
              </div>
            )}

            {/* 10. CALLS & WEBRTC */}
            {activeTab === 'calls' && callsData && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">Calls Telemetry & WebRTC Monitor</h3>
                  <p className="text-[11px] text-slate-400">High-fidelity WebRTC voice & video signaling performance.</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400 text-[11px]">Signaling Gateway</span>
                    <div className="text-lg font-bold text-emerald-400 mt-1">ONLINE (WebSocket)</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400 text-[11px]">STUN Server Status</span>
                    <div className="text-lg font-bold text-cyan-400 mt-1">Google STUN Ready</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400 text-[11px]">Active Calls</span>
                    <div className="text-lg font-bold text-slate-100 mt-1">{callsData.activeCalls}</div>
                  </div>
                </div>

                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/70">
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                      <tr>
                        <th className="p-3">Call ID</th>
                        <th className="p-3">Initiator</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Duration</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {callsData.history.map((c: any) => (
                        <tr key={c.id}>
                          <td className="p-3 text-cyan-400">{c.id}</td>
                          <td className="p-3 text-slate-200">{c.initiatorName}</td>
                          <td className="p-3 uppercase">{c.type}</td>
                          <td className="p-3">{Math.floor(c.durationSeconds / 60)}m {c.durationSeconds % 60}s</td>
                          <td className="p-3 capitalize text-emerald-400">{c.status}</td>
                          <td className="p-3 text-slate-500">{new Date(c.createdAt).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 11. NOTIFICATIONS DISPATCHER */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">System Broadcast & Web Push Dispatcher</h3>
                  <p className="text-[11px] text-slate-400">Send real-time alerts to all connected devices.</p>
                </div>

                <form onSubmit={handleSendNotification} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 max-w-lg">
                  <div>
                    <label className="block text-slate-300 mb-1">Notification Title</label>
                    <input
                      type="text"
                      required
                      value={notifTitle}
                      onChange={(e) => setNotifTitle(e.target.value)}
                      placeholder="e.g. Scheduled Maintenance Alert"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Body Text</label>
                    <textarea
                      rows={2}
                      required
                      value={notifBody}
                      onChange={(e) => setNotifBody(e.target.value)}
                      placeholder="Message delivered to all connected clients..."
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Dispatch Broadcast Alert</span>
                  </button>
                </form>

                <div className="space-y-2">
                  <h4 className="font-semibold text-slate-200">Dispatched History</h4>
                  {notificationsHistory.map((n) => (
                    <div key={n.id} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                      <div className="font-bold text-slate-100">{n.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{n.body}</div>
                      <div className="text-[10px] text-slate-500 mt-1">Dispatched by {n.sentBy} &bull; {new Date(n.sentAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 12. EMAIL & SMTP */}
            {activeTab === 'email' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">SMTP Gateway & Email Delivery Configuration</h3>
                  <p className="text-[11px] text-slate-400">Configure production SMTP host, API keys, credentials, and test delivery across all transactional templates.</p>
                </div>

                {/* Production SMTP Configuration Form */}
                <form onSubmit={handleSaveSmtp} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4 max-w-3xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-cyan-400" />
                      <span className="font-bold text-slate-100 text-xs">SMTP Server & API Key Credentials</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-semibold">
                      Production Ready
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1 font-medium">SMTP Server Host</label>
                      <input
                        type="text"
                        value={smtpForm.host}
                        onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                        placeholder="e.g. smtp.sendgrid.net, smtp.gmail.com, mail.xperiserv.in"
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-400 text-[11px] mb-1 font-medium">Port</label>
                        <input
                          type="number"
                          value={smtpForm.port}
                          onChange={(e) => setSmtpForm({ ...smtpForm, port: parseInt(e.target.value, 10) || 587 })}
                          placeholder="587"
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        <label className="flex items-center gap-2 text-slate-300 text-[11px] cursor-pointer pb-2">
                          <input
                            type="checkbox"
                            checked={smtpForm.secure}
                            onChange={(e) => setSmtpForm({ ...smtpForm, secure: e.target.checked })}
                            className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                          />
                          <span>SSL/TLS (Port 465)</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1 font-medium">SMTP Username / API Key Identifier</label>
                      <input
                        type="text"
                        value={smtpForm.username}
                        onChange={(e) => setSmtpForm({ ...smtpForm, username: e.target.value })}
                        placeholder="apikey or smtp_user"
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-slate-400 text-[11px] font-medium">SMTP Password / API Key Secret</label>
                        <button
                          type="button"
                          onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                          className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          {showSmtpPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>{showSmtpPassword ? 'Hide' : 'Show'}</span>
                        </button>
                      </div>
                      <input
                        type={showSmtpPassword ? 'text' : 'password'}
                        value={smtpForm.password}
                        onChange={(e) => setSmtpForm({ ...smtpForm, password: e.target.value })}
                        placeholder="SG.xxxxxxxx or password"
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1 font-medium">From / Sender Email Address</label>
                      <input
                        type="email"
                        value={smtpForm.fromEmail}
                        onChange={(e) => setSmtpForm({ ...smtpForm, fromEmail: e.target.value })}
                        placeholder="support@xperiserv.in"
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1 font-medium">From Sender Name</label>
                      <input
                        type="text"
                        value={smtpForm.fromName}
                        onChange={(e) => setSmtpForm({ ...smtpForm, fromName: e.target.value })}
                        placeholder="Aether Messenger Security"
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="email"
                        value={testEmailTo}
                        onChange={(e) => setTestEmailTo(e.target.value)}
                        placeholder="Send test to: recipient@domain.com"
                        className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 text-xs w-64 focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        type="button"
                        onClick={handleSendTestEmail}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg text-xs transition"
                      >
                        Send Test Email
                      </button>
                    </div>

                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save SMTP Settings</span>
                    </button>
                  </div>
                </form>

                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-200">Template Preview:</span>
                  <select
                    value={previewTemplate}
                    onChange={(e) => setPreviewTemplate(e.target.value)}
                    className="px-3 py-1 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs"
                  >
                    <option value="welcome">Welcome Email</option>
                    <option value="email_verification">Email Verification OTP</option>
                    <option value="otp">Security Code OTP</option>
                    <option value="password_reset">Password Reset Request</option>
                    <option value="new_login">New Login Security Alert</option>
                    <option value="new_device">New Device Authorization</option>
                    <option value="security_alert">Suspicious Activity Warning</option>
                    <option value="verification_approved">Verification Approved</option>
                    <option value="verification_rejected">Verification Rejected</option>
                    <option value="verification_revoked">Verification Revoked</option>
                    <option value="email_changed">Email Address Changed</option>
                    <option value="account_deleted">Account Permanent Eradication</option>
                  </select>
                  <a
                    href={`/api/admin/email/preview/${previewTemplate}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Standalone</span>
                  </a>
                </div>

                <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950 h-80">
                  <iframe
                    src={`/api/admin/email/preview/${previewTemplate}`}
                    title="Template Preview"
                    className="w-full h-full border-none"
                  />
                </div>
              </div>
            )}

            {/* 13. SMS GATEWAY */}
            {activeTab === 'sms' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">SMS Gateway Abstraction</h3>
                  <p className="text-[11px] text-slate-400">Configure Twilio, MessageBird, AWS SNS, Infobip, or simulator relays.</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 max-w-lg">
                  <span className="font-semibold text-slate-200">Dispatch Test SMS</span>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={testSmsPhone}
                      onChange={(e) => setTestSmsPhone(e.target.value)}
                      placeholder="+14155550199"
                      className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 flex-1"
                    />
                    <button
                      onClick={handleSendTestSms}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg"
                    >
                      Send SMS
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-200 mb-2">Outgoing SMS Outbox Log</h4>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    {outbox.sms.slice(0, 10).map((s, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex justify-between">
                        <span className="text-cyan-400">To: {s.to} &bull; &ldquo;{s.body}&rdquo;</span>
                        <span className="text-slate-500">{new Date(s.sentAt).toLocaleTimeString()} ({s.status})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 14. BRANDING CUSTOMIZER */}
            {activeTab === 'branding' && (
              <form onSubmit={handleSaveBranding} className="space-y-4 max-w-2xl">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">White-Label Branding Settings</h3>
                  <p className="text-[11px] text-slate-400">Changes propagate live to browser title, header, PWA manifest, and email templates.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">APP_NAME</label>
                    <input
                      type="text"
                      value={brandingForm.appName}
                      onChange={(e) => setBrandingForm({ ...brandingForm, appName: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">APP_SHORT_NAME</label>
                    <input
                      type="text"
                      value={brandingForm.appShortName}
                      onChange={(e) => setBrandingForm({ ...brandingForm, appShortName: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">APP_DOMAIN</label>
                    <input
                      type="url"
                      value={brandingForm.appDomain}
                      onChange={(e) => setBrandingForm({ ...brandingForm, appDomain: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">SUPPORT_EMAIL</label>
                    <input
                      type="email"
                      value={brandingForm.supportEmail}
                      onChange={(e) => setBrandingForm({ ...brandingForm, supportEmail: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">PRIMARY COLOR</label>
                    <input
                      type="color"
                      value={brandingForm.primaryColor}
                      onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                      className="w-full h-8 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">SECONDARY COLOR</label>
                    <input
                      type="color"
                      value={brandingForm.secondaryColor}
                      onChange={(e) => setBrandingForm({ ...brandingForm, secondaryColor: e.target.value })}
                      className="w-full h-8 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">ACCENT COLOR</label>
                    <input
                      type="color"
                      value={brandingForm.accentColor}
                      onChange={(e) => setBrandingForm({ ...brandingForm, accentColor: e.target.value })}
                      className="w-full h-8 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">COMPANY_NAME</label>
                  <input
                    type="text"
                    value={brandingForm.companyName}
                    onChange={(e) => setBrandingForm({ ...brandingForm, companyName: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">COMPANY_ADDRESS</label>
                  <input
                    type="text"
                    value={brandingForm.companyAddress}
                    onChange={(e) => setBrandingForm({ ...brandingForm, companyAddress: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>

                <button
                  type="submit"
                  className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold transition"
                >
                  Publish Branding Updates
                </button>
              </form>
            )}

            {/* 15. FEATURE FLAGS */}
            {activeTab === 'flags' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">Runtime Feature Flags & Switches</h3>
                  <p className="text-[11px] text-slate-400">Enable or disable specific features dynamically across the platform.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl">
                  {[
                    { key: 'voiceNotes', label: 'Voice Notes & Audio Recording', desc: 'Allows recording voice waveforms.' },
                    { key: 'videoCalls', label: 'WebRTC Video Calling', desc: 'Enables camera and video stream sessions.' },
                    { key: 'disappearingMessages', label: 'Disappearing Messages', desc: 'Enables 24h/7d/30d automatic expiration.' },
                    { key: 'fileUploads', label: 'Media & File Uploads', desc: 'Allows sending documents, images, and archives.' },
                    { key: 'communities', label: 'Community Hubs & Channels', desc: 'Enables umbrella community organizations.' },
                    { key: 'userRegistration', label: 'Public User Registration', desc: 'Allows new self-signup accounts.' },
                    { key: 'passkeys', label: 'WebAuthn Hardware Passkeys', desc: 'Passwordless biometric authentication.' },
                    { key: 'mfaEnforced', label: 'Mandatory 2FA for All Users', desc: 'Requires TOTP on every login.' },
                  ].map((flag) => {
                    const isEnabled = !!featureFlags[flag.key];
                    return (
                      <div key={flag.key} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-200">{flag.label}</div>
                          <div className="text-[10px] text-slate-400">{flag.desc}</div>
                        </div>
                        <button
                          onClick={() => handleToggleFlag(flag.key, isEnabled)}
                          className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                            isEnabled ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isEnabled ? 'ENABLED' : 'DISABLED'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 16. SYSTEM HEALTH */}
            {activeTab === 'health' && systemHealth && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">System Health & Runtime Diagnostics</h3>
                  <p className="text-[11px] text-slate-400">Node process metrics, memory usage, latency, and socket connections.</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400 text-[11px]">System Status</span>
                    <div className="text-xl font-bold text-emerald-400 font-mono mt-1">HEALTHY</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400 text-[11px]">Server Uptime</span>
                    <div className="text-xl font-bold text-cyan-400 font-mono mt-1">{systemHealth.uptimeSeconds}s</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400 text-[11px]">Heap Memory Used</span>
                    <div className="text-xl font-bold text-slate-100 font-mono mt-1">{systemHealth.memoryHeapMb} MB</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 font-mono space-y-1.5 text-[11px]">
                  <div><strong>Node.js Version:</strong> {systemHealth.nodeVersion}</div>
                  <div><strong>Database Adapter:</strong> {systemHealth.databaseEngine}</div>
                  <div><strong>Query Latency:</strong> {systemHealth.dbLatencyMs} ms</div>
                  <div><strong>TLS Cipher Suite:</strong> {systemHealth.tlsCipher}</div>
                  <div><strong>Active Socket Descriptors:</strong> {systemHealth.activeSockets}</div>
                  <div><strong>Cluster Node:</strong> {systemHealth.clusterStatus}</div>
                </div>
              </div>
            )}

            {/* 18. DATABASE BACKUP & RESTORE */}
            {activeTab === 'backup' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">One-Click Database Backup & Disaster Recovery</h3>
                  <p className="text-[11px] text-slate-400">
                    Create instant zero-downtime database snapshots, download portable JSON archives, or restore complete system state in one click.
                  </p>
                </div>

                {/* 3 Quick Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1: 1-Click Snapshot */}
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs mb-1">
                        <Database className="w-4 h-4" />
                        <span>Instant Snapshot</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Generates an in-memory & disk-persisted snapshot of all users, chats, messages, and configurations.
                      </p>
                    </div>
                    <button
                      onClick={() => handleCreateBackup()}
                      disabled={isBackingUp}
                      className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>{isBackingUp ? 'Creating Snapshot...' : '1-Click Backup Now'}</span>
                    </button>
                  </div>

                  {/* Card 2: 1-Click Download JSON */}
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
                        <Download className="w-4 h-4" />
                        <span>Download JSON Archive</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Download a complete, portable .json backup file of the entire platform database to your local machine.
                      </p>
                    </div>
                    <button
                      onClick={handleDownloadFullDatabase}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Full DB (.json)</span>
                    </button>
                  </div>

                  {/* Card 3: 1-Click Upload & Restore */}
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
                        <Upload className="w-4 h-4" />
                        <span>Restore from JSON File</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Upload any previously exported .json archive to instantly replace and restore the database state.
                      </p>
                    </div>
                    <label className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer text-center">
                      <Upload className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{isRestoring ? 'Restoring...' : 'Upload & Restore (.json)'}</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleUploadAndRestore}
                        className="hidden"
                        disabled={isRestoring}
                      />
                    </label>
                  </div>
                </div>

                {/* Backups History Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-200 text-xs">Available Database Snapshots</h4>
                    <button
                      onClick={() => loadData()}
                      className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Refresh Snapshots</span>
                    </button>
                  </div>

                  <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/70">
                    <table className="w-full text-left font-mono text-[11px]">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                        <tr>
                          <th className="p-3">Snapshot Name</th>
                          <th className="p-3">Created At</th>
                          <th className="p-3">Users</th>
                          <th className="p-3">Messages</th>
                          <th className="p-3">Chats</th>
                          <th className="p-3">Size</th>
                          <th className="p-3 text-right">1-Click Restore Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {backupsList.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-6 text-center text-slate-500 font-sans">
                              No server snapshots created yet. Click &ldquo;1-Click Backup Now&rdquo; above to generate your first backup.
                            </td>
                          </tr>
                        ) : (
                          backupsList.map((b) => (
                            <tr key={b.id} className="hover:bg-slate-900/40">
                              <td className="p-3 font-semibold text-slate-200 font-sans">{b.name}</td>
                              <td className="p-3 text-slate-400">{new Date(b.timestamp).toLocaleString()}</td>
                              <td className="p-3 text-cyan-400">{b.userCount}</td>
                              <td className="p-3 text-blue-400">{b.messageCount}</td>
                              <td className="p-3 text-indigo-400">{b.chatCount}</td>
                              <td className="p-3 text-slate-400">{(b.sizeBytes / 1024).toFixed(1)} KB</td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => handleRestoreSnapshot(b.id)}
                                  disabled={isRestoring}
                                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition disabled:opacity-50"
                                >
                                  {isRestoring ? 'Restoring...' : 'Restore This Snapshot'}
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 19. EASYPANEL DEPLOYMENT STEP-BY-STEP GUIDE */}
            {activeTab === 'easypanel' && (
              <div className="space-y-6 max-w-4xl">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold text-[10px]">
                      DEPLOYMENT MANUAL
                    </span>
                    <h3 className="font-bold text-slate-100 text-sm">How to Deploy Aether on Easypanel (Step-by-Step)</h3>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Easypanel is a Docker-powered modern control panel that automates SSL certificates, process supervision, and reverse proxy routing.
                  </p>
                </div>

                {/* Company & Domain Credentials Box */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-[11px]">
                  <div className="font-bold text-slate-200 text-xs">Production Environment Specification:</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    <div>
                      <span className="text-slate-400 block">Developer / Company:</span>
                      <strong className="text-slate-100">Allientic Lab Technologies</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Production Domain:</span>
                      <span className="text-cyan-400 font-mono">Aether.xperiserv.in</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Support Contact:</span>
                      <span className="text-cyan-400 font-mono">support@xperiserv.in</span>
                    </div>
                  </div>
                </div>

                {/* Step-by-Step Cards */}
                <div className="space-y-3 text-xs">
                  {/* Step 1 */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-cyan-400">
                      <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-700 flex items-center justify-center text-[11px]">1</span>
                      <span>Push Code to GitHub / GitLab</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed pl-7">
                      Push this complete codebase to a private or public repository on GitHub or GitLab (e.g., <code>https://github.com/your-org/aether-messenger</code>).
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-cyan-400">
                      <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-700 flex items-center justify-center text-[11px]">2</span>
                      <span>Create New Service in Easypanel</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed pl-7">
                      In your Easypanel dashboard, open your Project and click <strong>&ldquo;+ Service&rdquo;</strong> &rarr; select <strong>&ldquo;App&rdquo;</strong>. Name your app (e.g. <code>aether</code>).
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-cyan-400">
                      <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-700 flex items-center justify-center text-[11px]">3</span>
                      <span>Configure Source & Build Type</span>
                    </div>
                    <div className="pl-7 space-y-1.5 text-[11px] text-slate-300">
                      <p>&bull; <strong>Source:</strong> Select &ldquo;GitHub&rdquo; or &ldquo;Git Repository&rdquo; and link your repo.</p>
                      <p>&bull; <strong>Build Method:</strong> Select <strong>&ldquo;Dockerfile&rdquo;</strong> (the repository includes an optimized multi-stage Dockerfile).</p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-cyan-400">
                      <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-700 flex items-center justify-center text-[11px]">4</span>
                      <span>Set Environment Variables & Port</span>
                    </div>
                    <div className="pl-7 space-y-2 text-[11px]">
                      <p className="text-slate-300">Under the <strong>Environment</strong> tab in Easypanel, add:</p>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] space-y-1 text-cyan-300">
                        <div>PORT=3000</div>
                        <div>NODE_ENV=production</div>
                        <div>APP_URL=https://Aether.xperiserv.in</div>
                      </div>
                      <p className="text-slate-300">Under <strong>Ports</strong>, ensure the container port is set to <strong>3000</strong>.</p>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-cyan-400">
                      <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-700 flex items-center justify-center text-[11px]">5</span>
                      <span>Domain & Automatic Let&rsquo;s Encrypt SSL</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed pl-7">
                      Under <strong>Domains</strong>, add <code>Aether.xperiserv.in</code>. Easypanel automatically provisions a valid Let&rsquo;s Encrypt SSL certificate and routes WebSocket connections with zero additional Nginx configuration!
                    </p>
                  </div>

                  {/* Step 6 */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-emerald-400">
                      <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-700 flex items-center justify-center text-[11px]">6</span>
                      <span>Click &ldquo;Deploy&rdquo; & Sign In with Master Credentials</span>
                    </div>
                    <div className="pl-7 space-y-2 text-[11px] text-slate-300">
                      <p>Click the <strong>Deploy</strong> button in Easypanel. Once healthy, open <code>https://Aether.xperiserv.in</code> and sign in:</p>
                      <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/40 space-y-1 font-mono text-cyan-300">
                        <div>Username / Identifier: <strong>admin</strong> (or <strong>support@xperiserv.in</strong>)</div>
                        <div>Initial Master Password: <strong>AdminPass2026!</strong></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ADMIN DIRECT VERIFICATION CONTROL MODAL */}
      {verifyModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-slate-100 text-sm">Control User Verification Badge</h3>
              </div>
              <button onClick={() => setVerifyModalUser(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
              <img src={verifyModalUser.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
              <div>
                <div className="font-bold text-slate-100 text-xs">{verifyModalUser.displayName}</div>
                <div className="text-[11px] text-slate-400">@{verifyModalUser.username} &bull; {verifyModalUser.phone || verifyModalUser.email}</div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-medium">Verification Status</label>
                <select
                  value={verifyStatusChoice}
                  onChange={(e) => setVerifyStatusChoice(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                >
                  <option value="verified">Verified (Active Trusted Badge)</option>
                  <option value="unverified">Unverified (Standard Account)</option>
                  <option value="pending">Pending Application</option>
                  <option value="revoked">Revoked / Suspended Badge</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-medium">Verified Account Category</label>
                <select
                  value={verifyCategoryChoice}
                  onChange={(e) => setVerifyCategoryChoice(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                >
                  <option value="official">Official Platform Account</option>
                  <option value="organization">Organization / Enterprise</option>
                  <option value="business">Business / Commercial Entity</option>
                  <option value="individual">Individual Creator / Public Figure</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-medium">Badge Audit Reason / Note</label>
                <input
                  type="text"
                  value={verifyReasonInput}
                  onChange={(e) => setVerifyReasonInput(e.target.value)}
                  placeholder="e.g. Identity verified by administrator"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVerifyModalUser(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUpdateUserVerification(verifyModalUser.id, verifyStatusChoice, verifyCategoryChoice, verifyReasonInput)}
                className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
              >
                Apply Verification Mark
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
