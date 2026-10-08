import React, { useState, useRef, useEffect } from 'react';
import { BrandingProvider, useBranding } from './context/BrandingContext.js';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ChatProvider, useChat } from './context/ChatContext.js';
import { LeftSidebar } from './components/sidebar/LeftSidebar.js';
import { ChatHeader } from './components/chat/ChatHeader.js';
import { MessageItem } from './components/chat/MessageItem.js';
import { MessageComposer } from './components/chat/MessageComposer.js';
import { ChatInfoDrawer } from './components/chat/ChatInfoDrawer.js';
import { CallModal } from './components/calls/CallModal.js';
import { OfflineBanner } from './components/common/OfflineBanner.js';
import { AuthModal } from './components/modals/AuthModal.js';
import { NewChatModal } from './components/modals/NewChatModal.js';
import { NewCommunityModal } from './components/modals/NewCommunityModal.js';
import { VerificationModal } from './components/modals/VerificationModal.js';
import { SettingsModal } from './components/modals/SettingsModal.js';
import { AdminDashboard } from './components/admin/AdminDashboard.js';
import { ReportModal } from './components/modals/ReportModal.js';
import { LegalModal } from './components/modals/LegalModal.js';
import { MobileNavBar } from './components/mobile/MobileNavBar.js';
import { Message } from './types/index.js';
import {
  MessageSquare,
  Shield,
  Award,
  Video,
  Phone,
  Lock,
  Sparkles,
  FileText,
  Search,
  ExternalLink,
  ChevronDown,
  Columns,
  Maximize2,
  Server,
  Activity,
  Layers,
  Radio
} from 'lucide-react';
import { VerifiedBadge } from './components/common/VerifiedBadge.js';
import { PWAInstallButton } from './components/common/PWAInstallButton.js';

function MessengerApp() {
  const { branding, theme, setTheme } = useBranding();
  const { currentUser, isLoading } = useAuth();
  const {
    activeChat,
    setActiveChat,
    messages,
    isLoadingMessages,
    infoDrawerOpen,
    setInfoDrawerOpen,
    chats,
  } = useChat();

  // Top-level View Mode: 'messenger' | 'admin' | 'split'
  const [viewMode, setViewMode] = useState<'messenger' | 'admin' | 'split'>('messenger');

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [newCommunityModalOpen, setNewCommunityModalOpen] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);

  // Message reply state
  const [replyMessage, setReplyMessage] = useState<Message | null>(null);

  // Mobile navigation state
  const [mobileTab, setMobileTab] = useState<'chats' | 'communities' | 'verification' | 'settings'>('chats');
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [inChatQuery, setInChatQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeChat?.id]);

  const totalUnread = chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  const filteredInChatMessages = inChatQuery.trim()
    ? messages.filter((m) => m.text?.toLowerCase().includes(inChatQuery.toLowerCase()))
    : messages;

  const isAdminRole = Boolean(
    currentUser &&
      (currentUser.role === 'super_admin' || currentUser.role === 'admin')
  );

  // If user is not logged in as admin, force viewMode to messenger
  useEffect(() => {
    if (!isAdminRole && (viewMode === 'admin' || viewMode === 'split')) {
      setViewMode('messenger');
    }
  }, [isAdminRole, viewMode]);

  // Prompt login if user is not authenticated on load
  useEffect(() => {
    if (!isLoading && !currentUser) {
      setAuthModalOpen(true);
    }
  }, [isLoading, currentUser]);

  return (
    <div
      className={`flex flex-col h-screen w-screen overflow-hidden ${
        theme === 'amoled'
          ? 'bg-black text-slate-100'
          : theme === 'light'
          ? 'bg-slate-100 text-slate-900'
          : 'bg-[#090d16] text-slate-100'
      }`}
    >
      <OfflineBanner />

      {/* TOP COMMAND BAR: View Mode Switcher + Brand + Live Ops Status */}
      <header className="h-12 px-3 md:px-5 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md flex items-center justify-between shrink-0 select-none z-30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <img src={branding.appLogo} alt={branding.appName} className="w-5 h-5 object-contain" />
            <span className="font-bold text-xs tracking-tight text-slate-100 hidden sm:inline">{branding.appName}</span>
          </div>

          {/* Core View Switcher Controls - ONLY visible to authenticated Admins */}
          {isAdminRole && (
            <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-800 p-0.5 rounded-xl text-xs">
              <button
                onClick={() => setViewMode('messenger')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition ${
                  viewMode === 'messenger'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Messenger</span>
              </button>

              <button
                onClick={() => setViewMode('admin')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition ${
                  viewMode === 'admin'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Server className="w-3.5 h-3.5" />
                <span>Admin Console</span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse ml-0.5" />
              </button>

              <button
                onClick={() => setViewMode('split')}
                className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition ${
                  viewMode === 'split'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="View Messenger and Admin Console Side-by-Side"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Split View</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Status Badges & Account Profile */}
        <div className="flex items-center gap-2 text-xs">
          {/* Account Profile / Sign In Button */}
          <button
            onClick={() => setAuthModalOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition ${
              currentUser
                ? 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300'
                : 'bg-cyan-500 hover:bg-cyan-400 border-cyan-400 text-slate-950 font-bold shadow-sm'
            }`}
            title={currentUser ? 'Account Profile & Settings' : 'Sign In to Your Account'}
          >
            {currentUser?.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="" className="w-4 h-4 rounded-full object-cover" />
            ) : currentUser ? (
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <Lock className="w-3.5 h-3.5" />
            )}
            <span className="text-[11px] font-medium hidden sm:inline">
              {currentUser?.displayName ? currentUser.displayName.split(' ')[0] : 'Sign In'}
            </span>
            {currentUser?.verificationStatus === 'verified' && (
              <VerifiedBadge status="verified" category={currentUser?.verificationCategory} size="sm" />
            )}
            {currentUser && <ChevronDown className="w-3 h-3 text-slate-400" />}
          </button>

          {/* Theme Quick Switcher */}
          <button
            onClick={() => {
              const themes: ('dark' | 'light' | 'amoled')[] = ['dark', 'amoled', 'light'];
              const next = themes[(themes.indexOf(theme) + 1) % themes.length];
              setTheme(next);
            }}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-900 transition text-[11px] font-mono hidden md:inline"
            title="Cycle theme: Dark / AMOLED / Light"
          >
            {theme.toUpperCase()}
          </button>

          <PWAInstallButton />
        </div>
      </header>

      {/* MAIN VIEWPORT BODY */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* VIEW 1: FULL MESSENGER (or left side of SPLIT VIEW) */}
        {(viewMode === 'messenger' || viewMode === 'split') && (
          <div
            className={`h-full flex overflow-hidden relative ${
              viewMode === 'split' ? 'w-full lg:w-1/2 border-r border-slate-800' : 'w-full'
            }`}
          >
            {/* Left Sidebar */}
            <div className={`w-full md:w-auto h-full ${activeChat ? 'hidden md:flex' : 'flex'}`}>
              <LeftSidebar
                onOpenNewChat={() => {
                  if (!currentUser) {
                    setAuthModalOpen(true);
                  } else {
                    setNewChatModalOpen(true);
                  }
                }}
                onOpenNewCommunity={() => {
                  if (!currentUser) {
                    setAuthModalOpen(true);
                  } else {
                    setNewCommunityModalOpen(true);
                  }
                }}
                onOpenSettings={() => setSettingsModalOpen(true)}
                onOpenVerification={() => {
                  if (!currentUser) {
                    setAuthModalOpen(true);
                  } else {
                    setVerificationModalOpen(true);
                  }
                }}
                onOpenAdmin={() => setViewMode('admin')}
                onOpenAuth={() => setAuthModalOpen(true)}
                onOpenLegal={() => setLegalModalOpen(true)}
              />
            </div>

            {/* Center Chat View */}
            <div
              className={`flex-1 flex flex-col h-full min-w-0 bg-radial from-slate-900/30 to-slate-950/80 ${
                !activeChat ? 'hidden md:flex' : 'flex'
              }`}
            >
              {activeChat ? (
                <>
                  <ChatHeader
                    onBackMobile={() => setActiveChat(null)}
                    onToggleSearch={() => setChatSearchOpen(!chatSearchOpen)}
                  />

                  {chatSearchOpen && (
                    <div className="p-2 border-b border-slate-800/60 bg-slate-900/90 flex items-center gap-2 px-4">
                      <Search className="w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Find in current conversation..."
                        value={inChatQuery}
                        onChange={(e) => setInChatQuery(e.target.value)}
                        className="flex-1 bg-transparent text-xs text-slate-100 focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          setChatSearchOpen(false);
                          setInChatQuery('');
                        }}
                        className="text-slate-400 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Messages Stream */}
                  <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-2">
                    <div className="flex justify-center my-2">
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 backdrop-blur-md">
                        <Shield className="w-3 h-3 text-cyan-400" />
                        <span>Protected in transit (TLS 1.3) & at rest (AES-256) &bull; Non-E2EE</span>
                      </div>
                    </div>

                    {isLoadingMessages ? (
                      <div className="flex items-center justify-center py-12 text-slate-500 text-xs">
                        Loading messages...
                      </div>
                    ) : filteredInChatMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center space-y-2 text-slate-500 text-xs">
                        <MessageSquare className="w-8 h-8 text-slate-600" />
                        <p>No messages yet in this conversation.</p>
                        <p className="text-[11px] text-slate-600">Send a greeting, voice note, or share media below.</p>
                      </div>
                    ) : (
                      filteredInChatMessages.map((msg) => (
                        <MessageItem
                          key={msg.id}
                          message={msg}
                          isGroup={activeChat.type !== 'direct'}
                          onReply={(m) => setReplyMessage(m)}
                          onForward={(m) => setNewChatModalOpen(true)}
                        />
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Composer */}
                  <MessageComposer
                    replyMessage={replyMessage}
                    onClearReply={() => setReplyMessage(null)}
                  />
                </>
              ) : (
                /* Empty state when no conversation is selected */
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                  <div className="relative p-6 rounded-3xl bg-slate-900/40 border border-slate-800/80 shadow-2xl backdrop-blur-md">
                    <img src={branding.appLogo} alt={branding.appName} className="w-20 h-20 object-contain mx-auto" />
                  </div>

                  <div className="max-w-md space-y-2">
                    <h2 className="text-xl font-bold text-slate-100">{branding.appName}</h2>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Futuristic, white-label real-time messaging, WebRTC calling, verified trust badges, and audited moderation.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 max-w-sm w-full text-xs">
                    <button
                      onClick={() => {
                        if (!currentUser) {
                          setAuthModalOpen(true);
                        } else {
                          setNewChatModalOpen(true);
                        }
                      }}
                      className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850 text-slate-200 transition text-left space-y-1"
                    >
                      <MessageSquare className="w-4 h-4 text-cyan-400" />
                      <div className="font-semibold text-slate-100">{currentUser ? 'Start a Chat' : 'Sign In to Chat'}</div>
                      <div className="text-[10px] text-slate-400">{currentUser ? 'Direct 1-to-1 conversation' : 'Access your conversations'}</div>
                    </button>

                    <button
                      onClick={() => {
                        if (!currentUser) {
                          setAuthModalOpen(true);
                        } else {
                          setNewCommunityModalOpen(true);
                        }
                      }}
                      className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850 text-slate-200 transition text-left space-y-1"
                    >
                      <Award className="w-4 h-4 text-blue-400" />
                      <div className="font-semibold text-slate-100">{currentUser ? 'Communities' : 'Communities Hub'}</div>
                      <div className="text-[10px] text-slate-400">Hubs & Broadcast channels</div>
                    </button>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <button onClick={() => setLegalModalOpen(true)} className="hover:text-slate-300 transition">
                      Privacy Policy
                    </button>
                    <span>&bull;</span>
                    <button onClick={() => setLegalModalOpen(true)} className="hover:text-slate-300 transition">
                      Security Disclosures
                    </button>
                    <span>&bull;</span>
                    <button onClick={() => setLegalModalOpen(true)} className="hover:text-slate-300 transition">
                      Terms of Service
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Chat Info Drawer (Desktop only, if open) */}
            {activeChat && infoDrawerOpen && viewMode !== 'split' && (
              <div className="hidden lg:block h-full">
                <ChatInfoDrawer
                  onClose={() => setInfoDrawerOpen(false)}
                  onOpenReportModal={() => setReportModalOpen(true)}
                />
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: FULL ADMIN CONSOLE (or right side of SPLIT VIEW) - Strictly guarded */}
        {isAdminRole && (viewMode === 'admin' || viewMode === 'split') && (
          <div className={`h-full ${viewMode === 'split' ? 'w-full lg:w-1/2' : 'w-full'}`}>
            <AdminDashboard isEmbedded={true} />
          </div>
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR (in messenger view) */}
      {!activeChat && viewMode === 'messenger' && (
        <MobileNavBar
          activeTab={mobileTab}
          onSelectTab={(tab) => {
            setMobileTab(tab);
            if (tab === 'verification') setVerificationModalOpen(true);
            if (tab === 'settings') setSettingsModalOpen(true);
            if (tab === 'communities') setNewCommunityModalOpen(true);
          }}
          onOpenNewChat={() => {
            if (!currentUser) {
              setAuthModalOpen(true);
            } else {
              setNewChatModalOpen(true);
            }
          }}
          unreadCount={totalUnread}
        />
      )}

      {/* WEBRTC CALL OVERLAY */}
      <CallModal />

      {/* ALL MODALS */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <NewChatModal
        isOpen={newChatModalOpen}
        onClose={() => setNewChatModalOpen(false)}
        onRequireAuth={() => setAuthModalOpen(true)}
      />
      <NewCommunityModal
        isOpen={newCommunityModalOpen}
        onClose={() => setNewCommunityModalOpen(false)}
        onRequireAuth={() => setAuthModalOpen(true)}
      />
      <VerificationModal isOpen={verificationModalOpen} onClose={() => setVerificationModalOpen(false)} />
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onOpenVerificationModal={() => setVerificationModalOpen(true)}
      />
      <ReportModal isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)} />
      <LegalModal isOpen={legalModalOpen} onClose={() => setLegalModalOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <BrandingProvider>
      <AuthProvider>
        <ChatProvider>
          <MessengerApp />
        </ChatProvider>
      </AuthProvider>
    </BrandingProvider>
  );
}
