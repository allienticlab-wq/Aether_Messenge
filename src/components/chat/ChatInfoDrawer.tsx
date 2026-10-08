import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { DisappearingDuration } from '../../types/index.js';
import {
  X,
  Clock,
  Shield,
  FileText,
  Image,
  Link2,
  Users,
  UserPlus,
  UserMinus,
  Ban,
  AlertTriangle,
  VolumeX,
  CheckCircle2,
  Lock,
  Pin
} from 'lucide-react';
import { VerifiedBadge } from '../common/VerifiedBadge.js';

interface ChatInfoDrawerProps {
  onClose: () => void;
  onOpenReportModal: () => void;
}

export const ChatInfoDrawer: React.FC<ChatInfoDrawerProps> = ({ onClose, onOpenReportModal }) => {
  const { activeChat, messages } = useChat();
  const { currentUser } = useAuth();

  const [activeMediaTab, setActiveMediaTab] = useState<'media' | 'docs' | 'links'>('media');
  const [selectedDuration, setSelectedDuration] = useState<DisappearingDuration>(
    activeChat?.disappearingDuration || 'off'
  );
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!activeChat) return null;

  const isDirect = activeChat.type === 'direct';
  const partnerMember = isDirect
    ? activeChat.members.find((m) => m.userId !== currentUser?.id)
    : undefined;
  const partnerProfile = partnerMember?.user;

  const title = isDirect ? (partnerProfile?.displayName || activeChat.name) : activeChat.name;
  const avatar = isDirect ? (partnerProfile?.avatarUrl || activeChat.avatarUrl) : activeChat.avatarUrl;
  const about = isDirect ? (partnerProfile?.about || 'Available on Aether') : activeChat.description;

  // Extract shared media
  const sharedMedia = messages
    .flatMap((m) => m.attachments || [])
    .filter((a) => a.type === 'image' || a.type === 'video');

  const sharedDocs = messages
    .flatMap((m) => m.attachments || [])
    .filter((a) => a.type === 'document' || a.type === 'pdf' || a.type === 'archive');

  // Update disappearing messages
  const handleUpdateDisappearing = async (duration: DisappearingDuration) => {
    if (!currentUser) return;
    setSelectedDuration(duration);
    try {
      await fetch(`/api/chats/${activeChat.id}/disappearing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ duration }),
      });
      setStatusMsg(`Disappearing messages set to: ${duration}`);
      setTimeout(() => setStatusMsg(null), 3000);
    } catch {
      setStatusMsg('Failed to update timer');
    }
  };

  return (
    <div className="w-80 md:w-88 border-l border-slate-800/80 bg-slate-900/50 backdrop-blur-md flex flex-col h-full shrink-0 overflow-y-auto text-xs text-slate-300">
      {/* Top Bar */}
      <div className="h-16 px-5 border-b border-slate-800/80 flex items-center justify-between shrink-0">
        <h3 className="font-semibold text-slate-100 text-sm">Conversation Details</h3>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-6">
        {/* Profile Lockup */}
        <div className="flex flex-col items-center text-center space-y-2 pb-4 border-b border-slate-800">
          <img
            src={avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80'}
            alt={title}
            className="w-20 h-20 rounded-full object-cover border-2 border-slate-700 shadow-lg"
          />
          <div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="font-bold text-slate-100 text-base">{title}</span>
              {partnerProfile?.verificationStatus === 'verified' && (
                <VerifiedBadge status="verified" category={partnerProfile?.verificationCategory} size="md" />
              )}
            </div>
            {isDirect && partnerProfile?.username && (
              <span className="text-[11px] text-slate-400">@{partnerProfile.username}</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs">{about}</p>
        </div>

        {statusMsg && (
          <div className="p-2.5 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 text-[11px] text-center">
            {statusMsg}
          </div>
        )}

        {/* Security & Non-E2EE Transparency Notice */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
            <Shield className="w-4 h-4" />
            <span>Platform Security Architecture</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Encrypted in transit via TLS 1.3 & at rest via AES-256. This is a <strong>non-E2EE platform</strong>: messages are server-indexed for instant search, device sync, and authorized safety moderation.
          </p>
        </div>

        {/* Disappearing Messages Setting */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Disappearing Messages</span>
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {(['off', '24h', '7d', '30d'] as DisappearingDuration[]).map((d) => (
              <button
                key={d}
                onClick={() => handleUpdateDisappearing(d)}
                className={`py-1 text-center rounded-lg font-medium transition ${
                  selectedDuration === d
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {d.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Group Members (if group or community) */}
        {!isDirect && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>Members ({activeChat.members.length})</span>
              </span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {activeChat.members.map((member) => (
                <div key={member.userId} className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={member.user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80'}
                      alt={member.user?.displayName}
                      className="w-7 h-7 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 truncate">
                        <span className="font-semibold text-slate-100 truncate text-[11px]">{member.user?.displayName || member.userId}</span>
                        {member.user?.verificationStatus === 'verified' && (
                          <VerifiedBadge status="verified" category={member.user?.verificationCategory} size="sm" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">Joined {new Date(member.joinedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {member.role !== 'member' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 font-semibold uppercase">
                      {member.role}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shared Media Tabs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-3">
              {[
                { id: 'media', label: `Media (${sharedMedia.length})`, icon: Image },
                { id: 'docs', label: `Docs (${sharedDocs.length})`, icon: FileText },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveMediaTab(tab.id as any)}
                  className={`font-semibold transition ${
                    activeMediaTab === tab.id ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeMediaTab === 'media' && (
            <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
              {sharedMedia.length === 0 ? (
                <div className="col-span-3 text-center py-4 text-slate-500">No media in conversation.</div>
              ) : (
                sharedMedia.map((m) => (
                  <img
                    key={m.id}
                    src={m.url}
                    alt={m.name}
                    className="w-full h-16 object-cover rounded-lg cursor-pointer hover:opacity-90"
                    onClick={() => window.open(m.url, '_blank')}
                  />
                ))
              )}
            </div>
          )}

          {activeMediaTab === 'docs' && (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {sharedDocs.length === 0 ? (
                <div className="text-center py-4 text-slate-500">No files uploaded.</div>
              ) : (
                sharedDocs.map((d) => (
                  <div key={d.id} className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                    <span className="truncate pr-2">{d.name}</span>
                    <a href={d.url} download={d.name} className="text-cyan-400 hover:underline">Get</a>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Actions & Moderation */}
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <button
            onClick={onOpenReportModal}
            className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-rose-400 flex items-center justify-center gap-2 transition"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Report Conversation</span>
          </button>
        </div>
      </div>
    </div>
  );
};
