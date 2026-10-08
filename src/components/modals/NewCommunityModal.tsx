import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useChat } from '../../context/ChatContext.js';
import { X, Globe2, Sparkles, Image } from 'lucide-react';

interface NewCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequireAuth?: () => void;
}

export const NewCommunityModal: React.FC<NewCommunityModalProps> = ({ isOpen, onClose, onRequireAuth }) => {
  const { currentUser } = useAuth();
  const { createCommunity } = useChat();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onClose();
      onRequireAuth?.();
      return;
    }
    if (!name.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await createCommunity(name, description);
      onClose();
    } catch (err: any) {
      console.warn('Failed to create community:', err);
      setError(err?.message || 'Could not establish community');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-cyan-400" />
            <h2 className="font-semibold text-slate-100 text-sm">Create New Community</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {!currentUser && (
            <div className="p-3 bg-cyan-950/30 border border-cyan-800/40 rounded-xl flex items-center justify-between gap-3 text-xs">
              <span className="text-cyan-200">
                Sign in is required to establish communities.
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequireAuth?.();
                }}
                className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg shrink-0 transition"
              >
                Sign In
              </button>
            </div>
          )}

          {error && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div className="p-3 bg-cyan-950/20 border border-cyan-800/30 rounded-xl text-slate-300 leading-relaxed">
            Communities unify related group chats under one umbrella with a dedicated <strong>Announcements Channel</strong> managed exclusively by community leaders.
          </div>

          <div>
            <label className="block font-medium text-slate-200 mb-1">Community Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Distributed Systems Collective"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-200 mb-1">Community Mission & Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the purpose, guidelines, and topics of this community..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold transition disabled:opacity-50"
            >
              {isSubmitting ? 'Establishing Community...' : 'Create Community'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
