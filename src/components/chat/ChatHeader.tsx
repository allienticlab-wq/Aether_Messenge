import React from 'react';
import { useChat } from '../../context/ChatContext.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  ArrowLeft,
  Phone,
  Video,
  Search,
  MoreVertical,
  PanelRight,
  Clock,
  VolumeX,
  Pin
} from 'lucide-react';
import { VerifiedBadge } from '../common/VerifiedBadge.js';

interface ChatHeaderProps {
  onBackMobile?: () => void;
  onToggleSearch?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ onBackMobile, onToggleSearch }) => {
  const { activeChat, typingUsers, startCall, infoDrawerOpen, setInfoDrawerOpen } = useChat();
  const { currentUser } = useAuth();

  if (!activeChat) return null;

  // Find partner for direct chat
  const partnerMember = activeChat.type === 'direct'
    ? activeChat.members.find(m => m.userId !== currentUser?.id)
    : undefined;

  const partnerProfile = partnerMember?.user;
  const isDirect = activeChat.type === 'direct';

  const title = isDirect ? (partnerProfile?.displayName || activeChat.name || 'Direct Chat') : activeChat.name;
  const avatar = isDirect ? (partnerProfile?.avatarUrl || activeChat.avatarUrl) : activeChat.avatarUrl;
  const isOnline = isDirect && partnerProfile?.isOnline;
  const verificationStatus = isDirect ? partnerProfile?.verificationStatus : undefined;
  const verificationCategory = isDirect ? partnerProfile?.verificationCategory : undefined;

  const isTyping = (typingUsers[activeChat.id] || []).length > 0;

  return (
    <div className="h-16 px-4 md:px-6 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md flex items-center justify-between shrink-0 select-none">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Back Button */}
        {onBackMobile && (
          <button
            onClick={onBackMobile}
            className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800 transition"
            aria-label="Back to conversations list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        {/* Avatar with Presence Ring */}
        <div
          onClick={() => setInfoDrawerOpen(!infoDrawerOpen)}
          className="relative cursor-pointer shrink-0"
        >
          <img
            src={avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80'}
            alt={title}
            className="w-10 h-10 rounded-full object-cover border border-slate-700/80 shadow-sm"
          />
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
          )}
        </div>

        {/* Title & Status */}
        <div
          onClick={() => setInfoDrawerOpen(!infoDrawerOpen)}
          className="min-w-0 cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <h2 className="font-semibold text-slate-100 text-sm truncate">{title}</h2>
            {verificationStatus === 'verified' && (
              <VerifiedBadge status="verified" category={verificationCategory} size="sm" />
            )}
            {activeChat.disappearingDuration && activeChat.disappearingDuration !== 'off' && (
              <span className="flex items-center gap-0.5 text-[10px] text-cyan-400 font-mono" title={`Disappearing messages: ${activeChat.disappearingDuration}`}>
                <Clock className="w-3 h-3" />
                <span>{activeChat.disappearingDuration}</span>
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-400 truncate">
            {isTyping ? (
              <span className="text-cyan-400 font-medium animate-pulse">typing...</span>
            ) : isDirect ? (
              isOnline ? (
                <span className="text-emerald-400">Online</span>
              ) : partnerProfile?.lastSeen ? (
                `Last seen ${new Date(partnerProfile.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              ) : (
                'Offline'
              )
            ) : (
              `${activeChat.members.length} members`
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          onClick={() => startCall('voice')}
          className="p-2 text-slate-300 hover:text-cyan-400 rounded-xl hover:bg-slate-800/80 transition"
          title="Start High-Fidelity Voice Call"
          aria-label="Start voice call"
        >
          <Phone className="w-4 h-4" />
        </button>

        <button
          onClick={() => startCall('video')}
          className="p-2 text-slate-300 hover:text-cyan-400 rounded-xl hover:bg-slate-800/80 transition"
          title="Start HD Video Call"
          aria-label="Start video call"
        >
          <Video className="w-4 h-4" />
        </button>

        {onToggleSearch && (
          <button
            onClick={onToggleSearch}
            className="p-2 text-slate-300 hover:text-slate-100 rounded-xl hover:bg-slate-800/80 transition"
            title="Search inside this chat"
            aria-label="Search inside chat"
          >
            <Search className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={() => setInfoDrawerOpen(!infoDrawerOpen)}
          className={`p-2 rounded-xl transition ${
            infoDrawerOpen ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60' : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/80'
          }`}
          title="Conversation Information & Shared Media"
          aria-label="Toggle chat info drawer"
        >
          <PanelRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
