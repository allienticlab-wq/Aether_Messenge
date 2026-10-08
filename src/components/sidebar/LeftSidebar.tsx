import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { useBranding } from '../../context/BrandingContext.js';
import { Chat } from '../../types/index.js';
import {
  Search,
  Plus,
  MessageSquare,
  Users,
  Globe2,
  Settings,
  Award,
  Shield,
  Star,
  Archive,
  LogOut,
  Sparkles,
  PhoneCall,
  X,
  Camera,
  QrCode
} from 'lucide-react';
import { VerifiedBadge } from '../common/VerifiedBadge.js';
import { PWAInstallButton } from '../common/PWAInstallButton.js';
import { PhotoUploaderModal } from '../common/PhotoUploaderModal.js';

interface LeftSidebarProps {
  onOpenNewChat: () => void;
  onOpenNewCommunity: () => void;
  onOpenSettings: () => void;
  onOpenVerification: () => void;
  onOpenAdmin: () => void;
  onOpenAuth: () => void;
  onOpenLegal: () => void;
  onOpenQrScanner?: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  onOpenNewChat,
  onOpenNewCommunity,
  onOpenSettings,
  onOpenVerification,
  onOpenAdmin,
  onOpenAuth,
  onOpenLegal,
  onOpenQrScanner,
}) => {
  const { chats, activeChat, setActiveChat, communities } = useChat();
  const { currentUser, logout, updateProfile } = useAuth();
  const { branding } = useBranding();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'direct' | 'group' | 'communities' | 'starred'>('all');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearchingServer, setIsSearchingServer] = useState(false);
  const [photoUploaderOpen, setPhotoUploaderOpen] = useState(false);

  // Server-side Full-Text Search
  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (val.trim().length > 1 && currentUser) {
      setIsSearchingServer(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(val.trim())}`, {
          headers: { 'x-user-id': currentUser.id },
        });
        const data = await res.json();
        setSearchResults(data);
      } catch {
        // ignore
      } finally {
        setIsSearchingServer(false);
      }
    } else {
      setSearchResults(null);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  // Filtered Chats
  const filteredChats = chats.filter((c) => {
    if (filterTab === 'direct' && c.type !== 'direct') return false;
    if (filterTab === 'group' && c.type !== 'group') return false;
    if (filterTab === 'communities' && c.type !== 'community_channel') return false;
    return true;
  });

  const isAdminRole = Boolean(
    currentUser &&
      (currentUser.role === 'super_admin' || currentUser.role === 'admin')
  );

  return (
    <div className="w-full md:w-80 lg:w-96 flex flex-col h-full border-r border-slate-800/80 bg-slate-950/60 backdrop-blur-xl shrink-0 select-none">
      {/* Top Header & Brand */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
            <img src={branding.appLogo} alt={branding.appName} className="w-6 h-6 object-contain" />
          </div>
          <div>
            <span className="font-bold text-slate-100 text-sm tracking-tight">{branding.appName}</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-cyan-400 font-medium">Verified Relay</span>
              <span className="text-[9px] text-slate-500">&bull; non-E2EE</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <PWAInstallButton />

          <button
            onClick={() => {
              if (!currentUser) {
                onOpenAuth();
              } else {
                onOpenNewChat();
              }
            }}
            className="p-2 text-slate-300 hover:text-cyan-400 rounded-xl hover:bg-slate-800 transition"
            title={currentUser ? "Start New Chat or Group" : "Sign in to start a chat"}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Full-Text Search Bar */}
      <div className="p-3 border-b border-slate-800/60 shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search messages, users, chats..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-8 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/80 transition"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Segmented Controls */}
        <div className="flex items-center gap-1 mt-2.5 overflow-x-auto text-[11px]">
          {[
            { id: 'all', label: 'All' },
            { id: 'direct', label: 'Direct' },
            { id: 'group', label: 'Groups' },
            { id: 'communities', label: 'Communities' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setFilterTab(tab.id as any); clearSearch(); }}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                filterTab === tab.id
                  ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-800/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main List Area: Search Results or Conversations List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {searchResults ? (
          /* Search Results Display */
          <div className="space-y-4 p-2 text-xs">
            {searchResults.messages.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-semibold text-cyan-400 tracking-wider">
                  Messages ({searchResults.messages.length})
                </span>
                {searchResults.messages.map((m: any) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      const target = chats.find((c) => c.id === m.chatId);
                      if (target) setActiveChat(target);
                      clearSearch();
                    }}
                    className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 cursor-pointer border border-slate-800 transition"
                  >
                    <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                      <span className="font-semibold text-slate-200">{m.chatName}</span>
                      <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="line-clamp-2 text-slate-300 text-[11px]">{m.text}</p>
                  </div>
                ))}
              </div>
            )}

            {searchResults.users.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-semibold text-cyan-400 tracking-wider">
                  Users ({searchResults.users.length})
                </span>
                {searchResults.users.map((u: any) => (
                  <div
                    key={u.id}
                    onClick={() => {
                      onOpenNewChat();
                      clearSearch();
                    }}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-900 cursor-pointer transition"
                  >
                    <img src={u.avatarUrl} alt={u.displayName} className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <div className="flex items-center gap-1 font-semibold text-slate-100">
                        <span>{u.displayName}</span>
                        {u.verificationStatus === 'verified' && (
                          <VerifiedBadge status="verified" category={u.verificationCategory} size="sm" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">@{u.username}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 space-y-2">
            <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
            <p>No conversations in this section.</p>
            <button
              onClick={onOpenNewChat}
              className="text-cyan-400 hover:underline font-medium text-xs"
            >
              Start a new chat
            </button>
          </div>
        ) : (
          /* Normal Conversations List */
          filteredChats.map((chat) => {
            const isSelected = activeChat?.id === chat.id;

            // Direct chat partner extraction
            const isDirect = chat.type === 'direct';
            const partnerMember = isDirect
              ? chat.members.find((m) => m.userId !== currentUser?.id)
              : undefined;
            const partner = partnerMember?.user;

            const name = isDirect ? (partner?.displayName || chat.name || 'Direct Chat') : chat.name;
            const avatar = isDirect ? (partner?.avatarUrl || chat.avatarUrl) : chat.avatarUrl;
            const isOnline = isDirect && partner?.isOnline;
            const verificationStatus = isDirect ? partner?.verificationStatus : undefined;
            const verificationCategory = isDirect ? partner?.verificationCategory : undefined;

            return (
              <div
                key={chat.id}
                onClick={() => setActiveChat(chat)}
                className={`group relative flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer transition ${
                  isSelected
                    ? 'bg-slate-900/90 border border-slate-700/80 shadow-md shadow-cyan-950/20'
                    : 'hover:bg-slate-900/50 border border-transparent'
                }`}
              >
                {/* Avatar with Presence Dot */}
                <div className="relative shrink-0">
                  <img
                    src={avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80'}
                    alt={name}
                    className="w-11 h-11 rounded-full object-cover border border-slate-800"
                  />
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950" />
                  )}
                </div>

                {/* Center Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0 pr-1">
                      <span className={`font-semibold text-xs truncate ${isSelected ? 'text-cyan-300' : 'text-slate-100'}`}>
                        {name}
                      </span>
                      {verificationStatus === 'verified' ? (
                        <VerifiedBadge status="verified" category={verificationCategory} size="sm" showPopover={false} />
                      ) : chat.id === 'chat_announcements' ? (
                        <VerifiedBadge status="verified" category="official" size="sm" showPopover={false} />
                      ) : null}
                    </div>
                    {chat.lastMessage && (
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">
                        {new Date(chat.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-slate-400 truncate pr-2">
                      {chat.lastMessage ? (
                        chat.lastMessage.attachments && chat.lastMessage.attachments.length > 0 ? (
                          `📎 ${chat.lastMessage.attachments[0].type.toUpperCase()}`
                        ) : (
                          chat.lastMessage.text
                        )
                      ) : (
                        'No messages yet'
                      )}
                    </p>

                    {/* Unread Counter Badge */}
                    {chat.unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-cyan-500 text-slate-950 font-bold text-[10px] font-mono shrink-0">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* User Footer Profile & Quick Access Actions */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 shrink-0 flex items-center justify-between">
        {currentUser ? (
          <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
            {/* Clickable Avatar with Camera Overlay */}
            <div className="relative group shrink-0">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.displayName}
                className="w-8 h-8 rounded-full object-cover border border-slate-700 cursor-pointer group-hover:opacity-75 transition"
                onClick={() => setPhotoUploaderOpen(true)}
                title="Change Profile Photo"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPhotoUploaderOpen(true);
                }}
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-cyan-300"
                title="Change Photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div
              onClick={onOpenSettings}
              className="min-w-0 cursor-pointer flex-1 hover:opacity-90 transition"
              title="Open Settings"
            >
              <div className="flex items-center gap-1 font-semibold text-xs text-slate-100 truncate">
                <span>{currentUser.displayName}</span>
                {currentUser.verificationStatus === 'verified' && (
                  <VerifiedBadge status="verified" category={currentUser.verificationCategory} size="sm" />
                )}
              </div>
              <span className="text-[10px] text-slate-400 block truncate">@{currentUser.username}</span>
            </div>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex-1 py-1.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition mr-2"
          >
            Sign In to Account
          </button>
        )}

        {/* Action icons */}
        <div className="flex items-center gap-1">
          {currentUser && (
            <button
              onClick={() => setPhotoUploaderOpen(true)}
              className="p-2 text-slate-400 hover:text-cyan-400 rounded-xl hover:bg-slate-900 transition"
              title="Change Profile Photo (Camera & Studio)"
            >
              <Camera className="w-4 h-4" />
            </button>
          )}

          {/* Link Desktop / Scan QR Code Button */}
          {currentUser && onOpenQrScanner && (
            <button
              onClick={onOpenQrScanner}
              className="p-2 text-slate-400 hover:text-cyan-300 rounded-xl hover:bg-slate-900 transition"
              title="Scan QR Code to Login on PC/Laptop (Web Pairing)"
            >
              <QrCode className="w-4 h-4 text-cyan-400" />
            </button>
          )}

          {isAdminRole && (
            <button
              onClick={onOpenAdmin}
              className="p-2 text-cyan-400 hover:text-cyan-300 rounded-xl hover:bg-slate-900 transition"
              title="Admin Console & Operations"
            >
              <Shield className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onOpenVerification}
            className="p-2 text-slate-400 hover:text-cyan-400 rounded-xl hover:bg-slate-900 transition"
            title="Request Verified Badge"
          >
            <Award className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-900 transition"
            title="Settings & Privacy"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenAuth}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-900 transition"
            title={currentUser ? "Account Profile / Sign Out" : "Sign In"}
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Profile Photo Uploader & Camera Studio */}
      {photoUploaderOpen && currentUser && (
        <PhotoUploaderModal
          isOpen={photoUploaderOpen}
          onClose={() => setPhotoUploaderOpen(false)}
          currentPhotoUrl={currentUser.avatarUrl}
          onPhotoSelected={async (newUrl) => {
            if (newUrl) {
              await updateProfile({ avatarUrl: newUrl });
            }
          }}
          title="Change Profile Photo"
          aspectRatio="circle"
        />
      )}
    </div>
  );
};
