import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { VerificationCategory } from '../../types/index.js';
import { X, Award, ShieldCheck, Building2, UserCheck, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { VerifiedBadge } from '../common/VerifiedBadge.js';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, refreshUser } = useAuth();

  const [category, setCategory] = useState<VerificationCategory>('individual');
  const [organizationName, setOrganizationName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [documentType, setDocumentType] = useState('Government-Issued ID (Passport/National ID)');
  const [documentUrl, setDocumentUrl] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/verification/badge/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          category,
          organizationName,
          websiteUrl,
          documentType,
          documentUrl: documentUrl || 'https://storage.aether.internal/verifications/uploaded_proof.pdf',
          additionalInfo,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Verification request submitted successfully. Our compliance team will review your application.');
        await refreshUser();
      } else {
        setMessage(data.error || 'Failed to submit verification request.');
      }
    } catch {
      setMessage('Network error submitting verification request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-cyan-400" />
            <h2 className="font-semibold text-slate-100 text-sm">Account Verification Request</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[80vh] space-y-5 text-xs text-slate-300">
          {/* Current Status Banner */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-cyan-950/40 text-cyan-400 border border-cyan-800/40 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-100 text-sm">Current Status:</span>
                <span className="capitalize font-semibold text-cyan-400 flex items-center gap-1">
                  {currentUser.verificationStatus}
                  {currentUser.verificationStatus === 'verified' && (
                    <VerifiedBadge status="verified" category={currentUser.verificationCategory} size="sm" />
                  )}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {currentUser.verificationStatus === 'verified'
                  ? `Your account is officially verified as an authentic ${currentUser.verificationCategory || 'individual'} presence. Badges are displayed across all chats and search listings.`
                  : currentUser.verificationStatus === 'pending'
                  ? 'Your verification application is currently queued in the administrative review queue.'
                  : 'Verified badges establish platform authenticity and trust for notable figures, organizations, and official partners.'}
              </p>
            </div>
          </div>

          {message && (
            <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/50 text-cyan-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {currentUser.verificationStatus !== 'verified' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-medium text-slate-200 mb-2">Verification Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'individual', label: 'Individual Figure', icon: UserCheck, desc: 'Creators, journalists, leaders' },
                    { id: 'business', label: 'Commercial Business', icon: ShieldCheck, desc: 'Registered businesses' },
                    { id: 'organization', label: 'Organization / NGO', icon: Building2, desc: 'Universities, research, non-profits' },
                    { id: 'official', label: 'Official Platform Account', icon: Award, desc: 'Enterprise core operations' },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = category === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setCategory(item.id as VerificationCategory)}
                        className={`p-3 text-left rounded-xl border transition flex flex-col justify-between ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-500/60 text-slate-100'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                          <span className="font-semibold text-xs text-slate-100">{item.label}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{item.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {(category === 'business' || category === 'organization') && (
                <div>
                  <label className="block font-medium text-slate-200 mb-1">Entity / Organization Legal Name</label>
                  <input
                    type="text"
                    required
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="e.g. Quantum Labs Inc."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-200 mb-1">Official Website or Portfolio URL</label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-200 mb-1">Verification Document Type</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="Government-Issued ID (Passport/National ID)">Government-Issued ID (Passport / ID)</option>
                  <option value="Articles of Incorporation / Certificate">Articles of Incorporation / Business Certificate</option>
                  <option value="Domain Ownership & Corporate Utility Bill">Domain Ownership / Utility Statement</option>
                  <option value="Press Credentials / Official Press Kit">Press Credentials / Media Recognition</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-200 mb-1">Upload Document or Evidence Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={documentUrl}
                    onChange={(e) => setDocumentUrl(e.target.value)}
                    placeholder="https://storage.provider/doc.pdf (or click Browse)"
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                  <label className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg cursor-pointer flex items-center gap-1.5 shrink-0 text-slate-200 transition">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span>Upload</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setDocumentUrl(`https://storage.aether.internal/docs/${e.target.files[0].name}`);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-200 mb-1">Additional Notes for Reviewers</label>
                <textarea
                  rows={2}
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="Provide any verifiable context regarding your identity or organization..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Submitted documents are stored encrypted at rest and reviewed solely by authorized compliance moderators.</span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold transition disabled:opacity-50"
              >
                {submitting ? 'Submitting Application...' : 'Submit Verification Request'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
