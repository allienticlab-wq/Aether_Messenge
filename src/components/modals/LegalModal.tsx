import React, { useState } from 'react';
import { useBranding } from '../../context/BrandingContext.js';
import { X, ShieldAlert, FileText, Scale, Lock, ShieldCheck, Mail } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSection?: string;
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, defaultSection = 'privacy' }) => {
  const { branding } = useBranding();
  const [section, setSection] = useState(defaultSection);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-cyan-400" />
            <h2 className="font-semibold text-slate-100 text-sm">Platform Legal & Policies</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-800 bg-slate-950/30 overflow-x-auto text-xs py-2">
          {[
            { id: 'privacy', label: 'Privacy Policy' },
            { id: 'terms', label: 'Terms of Service' },
            { id: 'security', label: 'Security & Non-E2EE' },
            { id: 'verification', label: 'Verification Policy' },
            { id: 'retention', label: 'Data Retention' },
            { id: 'guidelines', label: 'Community Guidelines' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSection(tab.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition font-medium ${
                section === tab.id
                  ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed">
          {/* Company Details Highlight Box */}
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-[11px]">
            <div>
              <span className="text-slate-400 block">Developed By:</span>
              <strong className="text-slate-100 text-xs">Allientic Lab Technologies</strong>
            </div>
            <div>
              <span className="text-slate-400 block">Official Website:</span>
              <a href="https://Aether.xperiserv.in" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline font-mono">
                Aether.xperiserv.in
              </a>
            </div>
            <div>
              <span className="text-slate-400 block">Contact & Inquiries:</span>
              <a href="mailto:support@xperiserv.in" className="text-cyan-400 hover:underline font-mono">
                support@xperiserv.in
              </a>
            </div>
          </div>

          {section === 'privacy' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-100">Privacy Policy</h3>
              <p>
                Welcome to <strong>{branding.appName}</strong> developed by <strong>Allientic Lab Technologies</strong> (Website: <a href="https://Aether.xperiserv.in" target="_blank" rel="noreferrer" className="text-cyan-400 underline">Aether.xperiserv.in</a>). This Privacy Policy details how we handle communication data, account identifiers, and telemetry.
              </p>
              <div className="p-3 bg-cyan-950/30 border border-cyan-800/40 rounded-xl text-cyan-300 font-medium">
                <strong>Important Architecture Notice (Non-E2EE):</strong> This platform does NOT implement End-to-End Encryption (E2EE). Communication is secured in transit via TLS 1.3 and at rest via AES-256 encrypted storage. Message bodies and metadata are indexed on authorized servers to support instant multi-device search, administrative backups, content moderation, and verified regulatory compliance.
              </div>
              <h4 className="font-semibold text-slate-200 pt-2">1. Data Collected</h4>
              <p>
                We collect your registration credentials (mobile number, username, optional email), profile metadata, communication streams, attached files, call telemetry session records, and security audit logs.
              </p>
              <h4 className="font-semibold text-slate-200 pt-2">2. Data Usage & Processing</h4>
              <p>
                Server-side systems process message bodies exclusively for full-text keyword indexing, automated spam detection, safety reporting, administrative one-click backup and restore, and user-initiated synchronization across devices.
              </p>
              <h4 className="font-semibold text-slate-200 pt-2">3. User Rights & Data Portability</h4>
              <p>
                Under GDPR and CCPA guidelines, you retain the permanent right to export all historical messages as a structured JSON archive or permanently delete your account at any time through Account Settings. For any compliance requests, contact our data protection team at <a href="mailto:support@xperiserv.in" className="text-cyan-400 underline">support@xperiserv.in</a>.
              </p>
            </div>
          )}

          {section === 'terms' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-100">Terms of Service</h3>
              <p>
                By accessing <strong>{branding.appName}</strong> (hosted at <a href="https://Aether.xperiserv.in" target="_blank" rel="noreferrer" className="text-cyan-400 underline">Aether.xperiserv.in</a>), you agree to comply with all binding terms established by <strong>Allientic Lab Technologies</strong>.
              </p>
              <h4 className="font-semibold text-slate-200 pt-2">1. Acceptable Use</h4>
              <p>
                You may not utilize the platform for unlawful transmission, harassment, phishing, distributed spam, or unauthorized automated exfiltration.
              </p>
              <h4 className="font-semibold text-slate-200 pt-2">2. Account Responsibility</h4>
              <p>
                Users are solely responsible for securing session credentials, configuring Two-Factor Authentication, and maintaining accurate identity credentials.
              </p>
              <h4 className="font-semibold text-slate-200 pt-2">3. Contact & Support</h4>
              <p>
                For questions regarding these terms, contact <a href="mailto:support@xperiserv.in" className="text-cyan-400 underline">support@xperiserv.in</a> or visit <a href="https://Aether.xperiserv.in" target="_blank" rel="noreferrer" className="text-cyan-400 underline">Aether.xperiserv.in</a>.
              </p>
            </div>
          )}

          {section === 'security' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-100">Security Architecture & Non-E2EE Model</h3>
              <p>
                {branding.appName} implements defense-in-depth engineering designed for enterprise reliability and compliance:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                <li><strong>Transport Security:</strong> Strict TLS 1.3 encryption across all REST API and WebSocket connections with HSTS enforcement.</li>
                <li><strong>Storage Security:</strong> Database records and media assets are encrypted at rest using AES-256 with partitioned cloud storage keys.</li>
                <li><strong>Role-Based Access Control (RBAC):</strong> Admin privileges are divided between Super Admin, Admin, Moderator, and Support roles with complete immutable audit logging.</li>
                <li><strong>Audited Moderation:</strong> Because this service is non-E2EE, authorized trust & safety moderators may review reported content. Every administrative inspection is logged with immutable actor ID, timestamp, and IP address.</li>
              </ul>
            </div>
          )}

          {section === 'verification' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-100">Verified Account Badge Policy</h3>
              <p>
                Verified Badges on {branding.appName} are non-transferable visual markers of authenticity awarded to individuals, commercial organizations, educational institutions, and official entities.
              </p>
              <p>
                Badges are granted exclusively through compliance review. Badges may be suspended or revoked if an account violates community standards, alters its primary identity fraudulently, or becomes inactive.
              </p>
            </div>
          )}

          {section === 'retention' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-100">Data Retention & Disappearing Messages</h3>
              <p>
                Messages marked with Disappearing Messages timers (24 hours, 7 days, 30 days) are automatically deleted upon expiration. Standard conversations are retained until deleted by the user or following account termination.
              </p>
            </div>
          )}

          {section === 'guidelines' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-100">Community & Channel Guidelines</h3>
              <p>
                Communities and group channels are expected to maintain civil, constructive environments. Hate speech, targeted harassment, impersonation, and illegal file sharing are strictly prohibited and subject to immediate suspension.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
