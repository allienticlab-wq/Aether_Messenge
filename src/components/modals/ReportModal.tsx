import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useChat } from '../../context/ChatContext.js';
import { X, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const { activeChat } = useChat();

  const [category, setCategory] = useState<'spam' | 'harassment' | 'hate_speech' | 'impersonation' | 'illegal' | 'misinformation' | 'other'>('spam');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !activeChat || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/moderation/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          targetType: activeChat.type === 'direct' ? 'user' : 'group',
          targetId: activeChat.id,
          category,
          reason,
          evidenceSnippet: activeChat.lastMessage?.text || 'Conversation inspection requested',
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 2000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h2 className="font-semibold text-slate-100 text-sm">Submit Safety Report</h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-2 text-xs">
            <CheckCircle2 className="w-8 h-8 text-cyan-400 mx-auto" />
            <p className="font-semibold text-slate-100 text-sm">Report Submitted to Moderators</p>
            <p className="text-slate-400">Thank you for helping keep the platform secure.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            <div className="p-3 bg-rose-950/20 border border-rose-800/30 rounded-xl text-slate-300">
              Because {currentUser.displayName} is reporting this non-E2EE conversation, authorized trust moderators will review recent messages and take disciplinary action if warranted.
            </div>

            <div>
              <label className="block font-medium text-slate-200 mb-1">Violation Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="spam">Unsolicited Commercial Spam</option>
                <option value="harassment">Targeted Harassment or Threats</option>
                <option value="hate_speech">Hate Speech or Discrimination</option>
                <option value="impersonation">Identity Impersonation</option>
                <option value="illegal">Unlawful Activity / Fraud</option>
                <option value="misinformation">Dangerous Disinformation</option>
                <option value="other">Other Violation</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-200 mb-1">Specific Incident Details *</label>
              <textarea
                rows={3}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain the circumstances of the violation..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold transition disabled:opacity-50"
            >
              {submitting ? 'Submitting Report...' : 'File Report with Compliance Team'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
