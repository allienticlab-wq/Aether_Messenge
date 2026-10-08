import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useChat } from '../../context/ChatContext.js';
import { Message, Attachment } from '../../types/index.js';
import {
  Check,
  CheckCheck,
  Clock,
  MoreVertical,
  Reply,
  Forward,
  Copy,
  Edit2,
  Trash2,
  Pin,
  Star,
  Play,
  Pause,
  Download,
  FileText,
  MapPin,
  Smile,
  Info,
  CheckCircle2,
  Plus,
  AlertCircle
} from 'lucide-react';
import { VerifiedBadge } from '../common/VerifiedBadge.js';
import { PhotoLightboxModal } from '../common/PhotoLightboxModal.js';

interface MessageItemProps {
  message: Message;
  isGroup: boolean;
  onReply: (message: Message) => void;
  onForward: (message: Message) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isGroup,
  onReply,
  onForward,
}) => {
  const { currentUser } = useAuth();
  const { editMessage, deleteMessage, toggleReaction, togglePin, toggleStar } = useChat();

  const [menuOpen, setMenuOpen] = useState(false);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [showExtendedEmojis, setShowExtendedEmojis] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isLongPressed, setIsLongPressed] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || '');
  const [activeLightboxImage, setActiveLightboxImage] = useState<{ url: string; name: string } | null>(null);

  // Audio Playback state for voice messages
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // References for outside click and long-press gesture detection
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef(false);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const isMe = message.senderId === currentUser?.id;
  const isDeleted = message.deletedForEveryone;
  const activeReactions = message.reactions?.filter((r) => r.count > 0) || [];
  const hasReactions = activeReactions.length > 0;

  // Dismiss floating picker on outside click / tap or Escape key
  useEffect(() => {
    if (!reactionPickerOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        pickerRef.current &&
        !pickerRef.current.contains(target) &&
        bubbleRef.current &&
        !bubbleRef.current.contains(target)
      ) {
        setReactionPickerOpen(false);
        setShowExtendedEmojis(false);
        setIsLongPressed(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setReactionPickerOpen(false);
        setShowExtendedEmojis(false);
        setIsLongPressed(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [reactionPickerOpen]);

  // Toggle Audio Playback
  const handleToggleAudio = (voiceUrl?: string) => {
    if (!voiceUrl) return;
    if (!audioRef.current) {
      const audio = new Audio(voiceUrl);
      audio.playbackRate = playbackSpeed;
      audioRef.current = audio;

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setAudioProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      audio.onended = () => {
        setIsPlayingAudio(false);
        setAudioProgress(0);
      };
    }

    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.play().catch(() => {});
      setIsPlayingAudio(true);
    }
  };

  const cyclePlaybackSpeed = () => {
    const nextSpeed: Record<number, 1 | 1.5 | 2> = { 1: 1.5, 1.5: 2, 2: 1 };
    const next = nextSpeed[playbackSpeed];
    setPlaybackSpeed(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = next;
    }
  };

  const handleSaveEdit = async () => {
    if (editText.trim() && editText !== message.text) {
      await editMessage(message.id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleCopy = () => {
    if (message.text) {
      navigator.clipboard.writeText(message.text);
    }
    setMenuOpen(false);
  };

  // Touch Long-Press Handlers for mobile / touch screens
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      touchStartPosRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
    isLongPressTriggeredRef.current = false;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      setIsLongPressed(true);
      setReactionPickerOpen(true);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate?.(40);
        } catch {
          // ignore
        }
      }
    }, 400);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // If user scrolled or moved finger, cancel long-press to avoid interfering with scrolling
    if (touchStartPosRef.current && e.touches.length > 0) {
      const dx = Math.abs(e.touches[0].clientX - touchStartPosRef.current.x);
      const dy = Math.abs(e.touches[0].clientY - touchStartPosRef.current.y);
      if (dx > 10 || dy > 10) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (isLongPressTriggeredRef.current) {
      e.preventDefault();
    }
  };

  const handleTouchCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Mouse long-press (desktop click and hold)
  const handleMouseDown = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    isLongPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      setIsLongPressed(true);
      setReactionPickerOpen(true);
    }, 480);
  };

  const handleMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLongPressed(true);
    setReactionPickerOpen(true);
  };

  const handleSelectEmoji = (emoji: string) => {
    toggleReaction(message.id, emoji);
    setReactionPickerOpen(false);
    setShowExtendedEmojis(false);
    setIsLongPressed(false);
  };

  const voiceAttachment = message.attachments?.find((a) => a.type === 'voice');
  const mediaAttachments = message.attachments?.filter((a) => a.type !== 'voice') || [];

  const quickEmojis = ['👍', '❤️', '🔥', '⚡', '🚀', '😂', '🎉', '👏', '💯'];
  const extendedEmojis = ['😍', '🥺', '🤯', '✨', '🤝', '🙌', '👀', '🎯', '💡', '💎', '😢', '🙏'];

  return (
    <div
      className={`group relative flex flex-col mb-3 select-none ${
        isMe ? 'items-end' : 'items-start'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        if (!menuOpen) {
          setReactionPickerOpen(false);
          setShowExtendedEmojis(false);
        }
      }}
    >
      {/* Pinned Marker Banner */}
      {message.isPinned && (
        <div className="flex items-center gap-1 text-[10px] text-cyan-400 font-medium mb-0.5 px-1">
          <Pin className="w-3 h-3 fill-current rotate-45" />
          <span>Pinned Message</span>
        </div>
      )}

      <div className="flex items-end gap-1.5 max-w-[85%] md:max-w-[70%] relative">
        {/* Counterpart Avatar in Group */}
        {!isMe && isGroup && (
          <img
            src={message.sender?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80'}
            alt={message.sender?.displayName}
            className="w-7 h-7 rounded-full object-cover mb-1 border border-slate-700/60 shrink-0"
          />
        )}

        {/* Message Bubble Container with Long-Press & Hover Support */}
        <div
          ref={bubbleRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          onTouchCancel={handleTouchCancel}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onContextMenu={handleContextMenu}
          className={`relative rounded-2xl px-3.5 py-2.5 text-xs transition-all duration-200 shadow-md ${
            hasReactions ? 'mb-3.5' : ''
          } ${
            isMe
              ? 'bg-gradient-to-br from-cyan-600/90 to-blue-700/90 text-white rounded-br-xs border border-cyan-500/30'
              : 'bg-slate-900/90 text-slate-100 rounded-bl-xs border border-slate-800'
          } ${
            isHovered ? 'ring-1 ring-cyan-500/40 shadow-lg' : ''
          } ${
            isLongPressed ? 'scale-[1.02] ring-2 ring-cyan-400 shadow-cyan-500/30 shadow-xl' : ''
          }`}
        >
          {/* Group Sender Name & Verified Badge */}
          {!isMe && isGroup && message.sender && (
            <div className="flex items-center gap-1.5 mb-1 text-[11px] font-semibold text-cyan-400">
              <span className="truncate">{message.sender.displayName}</span>
              {message.sender.verificationStatus === 'verified' && (
                <VerifiedBadge
                  status="verified"
                  category={message.sender.verificationCategory}
                  size="xs"
                  displayName={message.sender.displayName}
                  username={message.sender.username}
                />
              )}
            </div>
          )}

          {/* Quoted Reply Block */}
          {message.replyTo && (
            <div className="p-2 mb-2 rounded-lg bg-black/25 border-l-2 border-cyan-400 text-[11px] text-slate-200">
              <span className="font-semibold text-cyan-300 block">{message.replyTo.senderName}</span>
              <p className="line-clamp-1 opacity-90">{message.replyTo.text || 'Media attachment'}</p>
            </div>
          )}

          {/* Voice Note Player */}
          {voiceAttachment && (
            <div className="flex items-center gap-3 p-1 min-w-[220px] sm:min-w-[260px]">
              <button
                onClick={() => handleToggleAudio(voiceAttachment.url)}
                className="w-9 h-9 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md hover:scale-105 transition"
                title={isPlayingAudio ? 'Pause Voice Note' : 'Play Voice Note'}
              >
                {isPlayingAudio ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              <div className="flex-1 space-y-1">
                {/* Simulated Interactive Waveform Bars */}
                <div className="flex items-center gap-0.5 h-6">
                  {(voiceAttachment.waveform || [20, 40, 60, 80, 50, 90, 70, 30, 60, 85, 40, 20, 50, 75]).map((val, idx) => {
                    const isPlayed = (idx / 14) * 100 <= audioProgress;
                    return (
                      <div
                        key={idx}
                        style={{ height: `${Math.max(20, val)}%` }}
                        className={`w-1 rounded-full transition-colors ${
                          isPlayed ? 'bg-white' : 'bg-white/40'
                        }`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] opacity-80 font-mono">
                  <span>{voiceAttachment.duration ? `${Math.floor(voiceAttachment.duration / 60)}:${(voiceAttachment.duration % 60).toString().padStart(2, '0')}` : '0:38'}</span>
                  <button
                    onClick={cyclePlaybackSpeed}
                    className="font-bold text-white hover:text-cyan-200 transition"
                  >
                    {playbackSpeed}x
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Media Attachments Gallery */}
          {mediaAttachments.length > 0 && (
            <div className="space-y-2 mb-2">
              {mediaAttachments.map((att) => (
                <div key={att.id} className="rounded-xl overflow-hidden">
                  {att.type === 'image' ? (
                    <img
                      src={att.url}
                      alt={att.name}
                      className="max-h-60 rounded-xl object-cover w-full cursor-pointer hover:opacity-95 transition hover:brightness-105"
                      onClick={() => setActiveLightboxImage({ url: att.url, name: att.name })}
                    />
                  ) : att.type === 'video' ? (
                    <video src={att.url} controls className="max-h-60 rounded-xl w-full" />
                  ) : att.type === 'location' ? (
                    <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-semibold text-slate-100 block">{att.name}</span>
                        <span className="text-[10px] text-slate-400">Coordinates: 37.7749° N, 122.4194° W</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-black/25 border border-white/10">
                      <FileText className="w-6 h-6 text-cyan-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold block truncate">{att.name}</span>
                        <span className="text-[10px] opacity-75">{Math.round(att.size / 1024)} KB &bull; {att.type.toUpperCase()}</span>
                      </div>
                      <a
                        href={att.url}
                        download={att.name}
                        className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition text-white"
                        title="Download file"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Text Content */}
          {isEditing ? (
            <div className="space-y-2 min-w-[220px]">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full px-2 py-1.5 bg-black/40 border border-white/20 rounded-lg text-xs text-white focus:outline-none"
                rows={2}
              />
              <div className="flex justify-end gap-1.5">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-2 py-0.5 rounded bg-white/20 text-[10px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-2 py-0.5 rounded bg-cyan-400 text-slate-950 font-bold text-[10px]"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            message.text && (
              <p className={`whitespace-pre-wrap break-words leading-relaxed select-text ${isDeleted ? 'italic opacity-60' : ''}`}>
                {message.text}
              </p>
            )
          )}

          {/* Metadata & Status Footer */}
          <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] opacity-75 select-none">
            {message.isStarred && <Star className="w-2.5 h-2.5 fill-current text-amber-300" />}
            {message.isEdited && <span>(edited)</span>}
            <span className="font-mono">
              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isMe && (
              <span
                className="inline-flex items-center ml-0.5 cursor-help"
                title={
                  message.status === 'read'
                    ? message.readBy && message.readBy.length > 0
                      ? `Read at ${new Date(message.readBy[0].readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${
                          isGroup ? ` by ${message.readBy.length} member(s)` : ''
                        }`
                      : 'Read by recipient'
                    : message.status === 'delivered'
                    ? 'Delivered to recipient device'
                    : message.status === 'sent'
                    ? 'Sent to server'
                    : message.status === 'failed'
                    ? 'Failed to send'
                    : 'Sending...'
                }
              >
                {message.status === 'read' ? (
                  <CheckCheck className="w-3.5 h-3.5 text-sky-400 drop-shadow-[0_0_4px_rgba(56,189,248,0.4)] stroke-[2.5]" />
                ) : message.status === 'delivered' ? (
                  <CheckCheck className="w-3.5 h-3.5 text-slate-300 opacity-80 stroke-[2]" />
                ) : message.status === 'sent' ? (
                  <Check className="w-3.5 h-3.5 text-slate-300 opacity-80 stroke-[2]" />
                ) : message.status === 'failed' ? (
                  <AlertCircle className="w-3 h-3 text-rose-400" />
                ) : (
                  <Clock className="w-3 h-3 animate-spin opacity-70" />
                )}
              </span>
            )}
          </div>

          {/* FLOATING EMOJI REACTION QUICK PICKER (Revealed on Hover or Long-Press) */}
          {(reactionPickerOpen || (isHovered && !menuOpen)) && !isEditing && !isDeleted && (
            <div
              ref={pickerRef}
              className={`absolute -top-11 ${
                isMe ? 'right-0' : 'left-0'
              } z-30 flex items-center gap-0.5 p-1 px-1.5 bg-slate-900/98 border border-slate-700/90 rounded-full shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 select-none`}
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={() => setIsHovered(true)}
            >
              {/* Invisible Hover Bridge connecting picker to message bubble */}
              <div className="absolute -bottom-3.5 left-0 right-0 h-3.5 pointer-events-auto" />

              {quickEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectEmoji(emoji);
                  }}
                  className="p-1 hover:scale-135 active:scale-95 transition-transform text-sm sm:text-base leading-none cursor-pointer rounded-full hover:bg-white/10"
                  title={`React ${emoji}`}
                >
                  {emoji}
                </button>
              ))}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowExtendedEmojis(!showExtendedEmojis);
                }}
                className={`p-1 transition rounded-full text-xs cursor-pointer ${
                  showExtendedEmojis
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'text-slate-400 hover:text-cyan-400 hover:bg-white/10'
                }`}
                title="More emojis"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {/* Extended Emoji Grid Popover */}
              {showExtendedEmojis && (
                <div
                  className={`absolute bottom-full ${
                    isMe ? 'right-0' : 'left-0'
                  } mb-1.5 p-2 bg-slate-900/98 border border-slate-700/90 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-wrap gap-1 max-w-[220px] z-40 animate-in fade-in zoom-in-95 duration-150`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {extendedEmojis.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectEmoji(em);
                      }}
                      className="p-1.5 hover:scale-135 transition-transform text-base leading-none rounded-lg hover:bg-white/10 cursor-pointer"
                      title={`React ${em}`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DOCKED REACTION BADGE: Rendered directly on the bottom edge of the message bubble */}
          {hasReactions && (
            <div
              className={`absolute -bottom-3.5 ${
                isMe ? 'right-2.5' : 'left-2.5'
              } z-20 flex items-center gap-1 p-0.5 px-1.5 rounded-full bg-slate-950/95 border border-slate-700/80 shadow-md backdrop-blur-md select-none transition-all`}
              onClick={(e) => e.stopPropagation()}
            >
              {activeReactions.map((r, i) => {
                const hasMyReaction = currentUser && r.userIds.includes(currentUser.id);
                return (
                  <button
                    key={`${r.emoji}-${i}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleReaction(message.id, r.emoji);
                    }}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition active:scale-90 hover:scale-105 cursor-pointer ${
                      hasMyReaction
                        ? 'bg-cyan-500/20 text-cyan-200 font-semibold border border-cyan-500/40 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                    title={
                      hasMyReaction
                        ? `You reacted with ${r.emoji} (click to remove)`
                        : `Reacted with ${r.emoji} (${r.count})`
                    }
                  >
                    <span className="text-[13px] leading-none">{r.emoji}</span>
                    {r.count > 1 && (
                      <span className="text-[10px] font-mono font-medium leading-none opacity-90">
                        {r.count}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Add Reaction Button on Badge */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setReactionPickerOpen((prev) => !prev);
                }}
                className="w-4 h-4 rounded-full flex items-center justify-center text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 transition text-[11px] cursor-pointer"
                title="Add another reaction"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
        </div>

        {/* Hover / Long-Press Action Toolbar Trigger */}
        <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mb-1 ${isMe ? 'order-first' : ''}`}>
          <button
            type="button"
            onClick={() => setReactionPickerOpen((prev) => !prev)}
            className="p-1 rounded-full bg-slate-800/80 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 transition cursor-pointer"
            title="React with Emoji"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onReply(message)}
            className="p-1 rounded-full bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition cursor-pointer"
            title="Reply"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded-full bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition cursor-pointer"
            title="Message options"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Message Context Dropdown Menu */}
      {menuOpen && (
        <div className="absolute right-4 top-8 z-40 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 text-xs text-slate-200 backdrop-blur-md">
          <button
            onClick={() => { setReactionPickerOpen(true); setMenuOpen(false); }}
            className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2"
          >
            <Smile className="w-3.5 h-3.5 text-cyan-400" />
            <span>React with Emoji</span>
          </button>
          <button
            onClick={() => { onReply(message); setMenuOpen(false); }}
            className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2"
          >
            <Reply className="w-3.5 h-3.5 text-cyan-400" />
            <span>Reply</span>
          </button>
          <button
            onClick={() => { onForward(message); setMenuOpen(false); }}
            className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2"
          >
            <Forward className="w-3.5 h-3.5 text-blue-400" />
            <span>Forward</span>
          </button>
          <button
            onClick={handleCopy}
            className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>Copy Text</span>
          </button>
          <button
            onClick={() => { togglePin(message.id); setMenuOpen(false); }}
            className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2"
          >
            <Pin className="w-3.5 h-3.5 text-amber-400" />
            <span>{message.isPinned ? 'Unpin Message' : 'Pin Message'}</span>
          </button>
          <button
            onClick={() => { toggleStar(message.id); setMenuOpen(false); }}
            className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2"
          >
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <span>{message.isStarred ? 'Unstar' : 'Star Message'}</span>
          </button>
          <button
            onClick={() => { setInfoModalOpen(true); setMenuOpen(false); }}
            className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2"
          >
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Message Info</span>
          </button>
          {isMe && !isDeleted && (
            <button
              onClick={() => { setIsEditing(true); setMenuOpen(false); }}
              className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2"
            >
              <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Edit</span>
            </button>
          )}
          <div className="my-1 border-t border-slate-800" />
          <button
            onClick={() => { deleteMessage(message.id, false); setMenuOpen(false); }}
            className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-rose-300"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete for Me</span>
          </button>
          {isMe && !isDeleted && (
            <button
              onClick={() => { deleteMessage(message.id, true); setMenuOpen(false); }}
              className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2 text-rose-400 font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete for Everyone</span>
            </button>
          )}
        </div>
      )}

      {/* Message Information Modal */}
      {infoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl text-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-semibold text-slate-100 flex items-center gap-2">
                <Info className="w-4 h-4 text-cyan-400" />
                Message Audit Record
              </span>
              <button onClick={() => setInfoModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
            <div className="space-y-2 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Sent:</span>
                <span className="font-mono">{new Date(message.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Status:</span>
                <span className="capitalize font-semibold text-cyan-400 flex items-center gap-1">
                  {message.status === 'read' ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-sky-400 stroke-[2.5]" />
                      <span>Read</span>
                    </>
                  ) : message.status === 'delivered' ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-slate-300 stroke-[2]" />
                      <span>Delivered</span>
                    </>
                  ) : message.status === 'sent' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-slate-300 stroke-[2]" />
                      <span>Sent</span>
                    </>
                  ) : (
                    <span>{message.status}</span>
                  )}
                </span>
              </div>
              {message.readBy && message.readBy.length > 0 && (
                <div className="pt-2 border-t border-slate-800 space-y-1">
                  <span className="text-[11px] font-semibold text-sky-300">Read Receipts ({message.readBy.length}):</span>
                  {message.readBy.map((r, idx) => (
                    <div key={idx} className="flex justify-between text-[11px] font-mono text-slate-400">
                      <span>Reader ID: {r.userId.slice(0, 8)}...</span>
                      <span>{new Date(r.readAt).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Sender:</span>
                <span>{message.sender?.displayName || 'User'} (@{message.sender?.username})</span>
              </div>
              {message.disappearingExpiresAt && (
                <div className="flex justify-between text-amber-400">
                  <span>Expires:</span>
                  <span className="font-mono">{new Date(message.disappearingExpiresAt).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* High-Resolution Photo Lightbox Modal */}
      {activeLightboxImage && (
        <PhotoLightboxModal
          isOpen={!!activeLightboxImage}
          onClose={() => setActiveLightboxImage(null)}
          imageUrl={activeLightboxImage.url}
          imageName={activeLightboxImage.name}
          senderName={message.sender?.displayName}
          timestamp={message.createdAt}
        />
      )}
    </div>
  );
};
