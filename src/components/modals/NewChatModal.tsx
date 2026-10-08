import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useChat } from '../../context/ChatContext.js';
import { UserProfile } from '../../types/index.js';
import { X, Search, MessageSquare, Users, Check } from 'lucide-react';
import { VerifiedBadge } from '../common/VerifiedBadge.js';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequireAuth?: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose, onRequireAuth }) => {
  const { currentUser } = useAuth();
  const { createDirectChat, createGroupChat } = useChat();

  const [mode, setMode] = useState<'direct' | 'group'>('direct');
  const [searchQuery, setSearchQuery] = useState('');
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      const headers: Record<string, string> = {};
      if (currentUser?.id) {
        headers['x-user-id'] = currentUser.id;
      }
      fetch('/api/users', { headers })
        .then((res) => res.json())
        .then((data) => {
          if (data.users) {
            setAvailableUsers(data.users.filter((u: UserProfile) => u.id !== currentUser?.id));
          }
        })
        .catch(() => {});
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const cleanQ = searchQuery.replace(/\D/g, '');
  const filteredUsers = availableUsers.filter((u) => {
    const matchName = u.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchUsername = u.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchEmail = u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const uPhoneDigits = (u.phone || '').replace(/\D/g, '');
    const matchPhone = (u.phone && u.phone.includes(searchQuery)) || (cleanQ.length >= 3 && uPhoneDigits.includes(cleanQ));
    return matchName || matchUsername || matchEmail || matchPhone;
  });

  const handleStartDirect = async (targetUserId: string) => {
    if (!currentUser) {
      onClose();
      onRequireAuth?.();
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await createDirectChat(targetUserId);
      onClose();
    } catch (err: any) {
      console.warn('Failed to start direct conversation:', err);
      setError(err?.message || 'Could not start conversation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onClose();
      onRequireAuth?.();
      return;
    }
    if (!groupName.trim() || selectedUserIds.length === 0) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await createGroupChat(groupName, groupDescription, selectedUserIds);
      onClose();
    } catch (err: any) {
      console.warn('Failed to create group:', err);
      setError(err?.message || 'Could not create group chat');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-100 text-sm">
              {mode === 'direct' ? 'Start New Conversation' : 'Create Group Chat'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Guest Warning Banner */}
        {!currentUser && (
          <div className="mx-6 mt-3 p-3 bg-cyan-950/30 border border-cyan-800/40 rounded-xl flex items-center justify-between gap-3 text-xs">
            <span className="text-cyan-200">
              Sign in is required to message contacts.
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

        {/* Error message */}
        {error && (
          <div className="mx-6 mt-3 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Mode Toggle */}
        <div className="flex items-center gap-2 px-6 pt-4 pb-2">
          <button
            onClick={() => setMode('direct')}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition flex items-center justify-center gap-1.5 ${
              mode === 'direct'
                ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Direct Message</span>
          </button>
          <button
            onClick={() => setMode('group')}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition flex items-center justify-center gap-1.5 ${
              mode === 'group'
                ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Group Chat</span>
          </button>
        </div>

        {mode === 'group' && (
          <div className="px-6 py-2 space-y-2 border-b border-slate-800">
            <input
              type="text"
              placeholder="Group Subject / Name *"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
            <input
              type="text"
              placeholder="Group Description (Optional)"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>
        )}

        {/* Search Input */}
        <div className="px-6 py-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, username, or mobile number (+91...)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-1">
          {filteredUsers.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No matching contacts found.</div>
          ) : (
            filteredUsers.map((user) => {
              const isSelected = selectedUserIds.includes(user.id);
              return (
                <div
                  key={user.id}
                  onClick={() => {
                    if (mode === 'direct') {
                       handleStartDirect(user.id);
                    } else {
                      toggleSelectUser(user.id);
                    }
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${
                    isSelected ? 'bg-cyan-950/40 border border-cyan-800/40' : 'hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName}
                      className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-700"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-slate-100 truncate">{user.displayName}</span>
                        {user.verificationStatus === 'verified' && (
                          <VerifiedBadge
                            status="verified"
                            category={user.verificationCategory}
                            size="xs"
                            showPill={true}
                            displayName={user.displayName}
                            username={user.username}
                          />
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        @{user.username} {user.phone ? `• ${user.phone}` : ''}
                      </div>
                    </div>
                  </div>

                  {mode === 'group' && (
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                        isSelected ? 'bg-cyan-500 border-cyan-500 text-slate-950' : 'border-slate-700'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {mode === 'group' && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {selectedUserIds.length} {selectedUserIds.length === 1 ? 'member' : 'members'} selected
            </span>
            <button
              onClick={handleCreateGroup}
              disabled={isSubmitting || !groupName.trim() || selectedUserIds.length === 0}
              className="py-2 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-xs transition disabled:opacity-50"
            >
              Create Group
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
