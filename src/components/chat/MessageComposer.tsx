import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext.js';
import { Message, MessageReplySnippet, Attachment } from '../../types/index.js';
import {
  Smile,
  Paperclip,
  Mic,
  Send,
  X,
  Image,
  FileText,
  MapPin,
  Camera,
  User,
  Square,
  Play,
  Pause,
  Trash2,
  Sparkles,
  Sticker
} from 'lucide-react';

interface MessageComposerProps {
  replyMessage: Message | null;
  onClearReply: () => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({ replyMessage, onClearReply }) => {
  const { sendMessage, sendTyping, activeChat } = useChat();

  const [text, setText] = useState('');
  const [attachmentDrawerOpen, setAttachmentDrawerOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState('');

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordTimerRef = useRef<any>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Curated GIFs with reliable high-quality web-safe animated sources
  const sampleGifs = [
    { id: '1', title: 'Laser Pulse', url: 'https://media.giphy.com/media/26tn3334mVoVClhoI/giphy.gif' },
    { id: '2', title: 'Cyber Matrix', url: 'https://media.giphy.com/media/ule4akeXnY9fb43TXn/giphy.gif' },
    { id: '3', title: 'Neon Applause', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif' },
    { id: '4', title: 'Thumbs Up Hologram', url: 'https://media.giphy.com/media/11ISwbgGL28bYQ/giphy.gif' },
    { id: '5', title: 'Hyperspace Jump', url: 'https://media.giphy.com/media/l41lI4bYmcsPJX9Go/giphy.gif' },
    { id: '6', title: 'Futuristic Glow', url: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif' },
  ];

  // Sticker Packs
  const stickerPacks = [
    {
      packName: 'Orbital Core',
      stickers: ['🪐', '🚀', '🌌', '⚡', '🛸', '🛰️', '☄️', '💫'],
    },
    {
      packName: 'Cyber Neon',
      stickers: ['🤖', '🧬', '🔬', '💡', '🛡️', '💎', '🔑', '🎯'],
    },
    {
      packName: 'Reactions',
      stickers: ['🔥', '✨', '🏆', '💯', '🦾', '🤝', '🎉', '🌟'],
    },
  ];

  // Typing event emission
  useEffect(() => {
    if (text.length > 0) {
      sendTyping(true);
      const timer = setTimeout(() => sendTyping(false), 2000);
      return () => clearTimeout(timer);
    } else {
      sendTyping(false);
    }
  }, [text]);

  // Voice recording timer
  useEffect(() => {
    if (isRecording && !isPaused) {
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, [isRecording, isPaused]);

  const handleSend = async () => {
    if (!text.trim()) return;

    let replySnippet: MessageReplySnippet | undefined;
    if (replyMessage) {
      replySnippet = {
        id: replyMessage.id,
        senderId: replyMessage.senderId,
        senderName: replyMessage.sender?.displayName || 'User',
        text: replyMessage.text,
      };
    }

    const currentText = text.trim();
    setText('');
    onClearReply();
    setEmojiPickerOpen(false);
    setGifPickerOpen(false);
    setStickerPickerOpen(false);

    await sendMessage(currentText, undefined, replySnippet);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Start Voice Recording
  const startRecording = () => {
    setIsRecording(true);
    setIsPaused(false);
    setRecordSeconds(0);
  };

  // Cancel Voice Recording
  const cancelRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
    setRecordSeconds(0);
  };

  // Send Voice Note
  const sendVoiceNote = async () => {
    const duration = recordSeconds || 5;
    cancelRecording();

    // Generate authentic randomized waveform
    const waveform = Array.from({ length: 24 }, () => Math.floor(Math.random() * 80 + 20));

    const voiceAttachment: Attachment = {
      id: `voice_${Date.now()}`,
      name: `Voice_Note_${new Date().toLocaleTimeString().replace(/:/g, '')}.m4a`,
      url: 'https://actions.google.com/sounds/v1/ambiences/humming_room_tone.ogg',
      type: 'voice',
      mimeType: 'audio/ogg',
      size: 1024 * duration * 8,
      duration,
      waveform,
    };

    await sendMessage('', [voiceAttachment]);
  };

  // Send Shared Location
  const sendLocationAttachment = async () => {
    setAttachmentDrawerOpen(false);
    const locationAtt: Attachment = {
      id: `loc_${Date.now()}`,
      name: 'San Francisco Tech Core',
      url: 'https://maps.google.com/?q=37.7749,-122.4194',
      type: 'location',
      mimeType: 'application/geo+json',
      size: 512,
    };
    await sendMessage('📍 Shared current geocoordinates', [locationAtt]);
  };

  // Handle file picker
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachmentDrawerOpen(false);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUri = reader.result as string;
      const isImg = file.type.startsWith('image/');
      const isVid = file.type.startsWith('video/');

      const att: Attachment = {
        id: `att_${Date.now()}`,
        name: file.name,
        url: dataUri,
        type: isImg ? 'image' : isVid ? 'video' : 'document',
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
      };

      await sendMessage('', [att]);
    };
    reader.readAsDataURL(file);
  };

  const sendGif = async (gifUrl: string) => {
    setGifPickerOpen(false);
    const att: Attachment = {
      id: `gif_${Date.now()}`,
      name: 'GIF Animation',
      url: gifUrl,
      type: 'image',
      mimeType: 'image/gif',
      size: 2048,
    };
    await sendMessage('', [att]);
  };

  const sendSticker = async (stickerEmoji: string) => {
    setStickerPickerOpen(false);
    await sendMessage(stickerEmoji);
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative border-t border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-3 md:px-5 py-3">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Quoted Reply Preview Bar */}
      {replyMessage && (
        <div className="mb-2 p-2 bg-slate-950/70 border-l-2 border-cyan-400 rounded-r-lg flex items-center justify-between text-xs text-slate-200">
          <div className="min-w-0 pr-2">
            <span className="font-semibold text-cyan-400 block truncate">
              Replying to {replyMessage.sender?.displayName || 'User'}
            </span>
            <p className="text-[11px] text-slate-400 truncate">{replyMessage.text || 'Media attachment'}</p>
          </div>
          <button onClick={onClearReply} className="p-1 text-slate-400 hover:text-white rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Floating Attachments Drawer */}
      {attachmentDrawerOpen && (
        <div className="absolute bottom-16 left-4 z-40 bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-2xl backdrop-blur-md grid grid-cols-3 gap-2 w-72 text-xs">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-cyan-400 transition"
          >
            <div className="p-2.5 rounded-full bg-cyan-950/60 text-cyan-400 border border-cyan-800/50">
              <Image className="w-4 h-4" />
            </div>
            <span>Photos & Videos</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-blue-400 transition"
          >
            <div className="p-2.5 rounded-full bg-blue-950/60 text-blue-400 border border-blue-800/50">
              <FileText className="w-4 h-4" />
            </div>
            <span>Document / PDF</span>
          </button>

          <button
            onClick={sendLocationAttachment}
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-emerald-400 transition"
          >
            <div className="p-2.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
              <MapPin className="w-4 h-4" />
            </div>
            <span>Location</span>
          </button>
        </div>
      )}

      {/* Floating GIF Picker */}
      {gifPickerOpen && (
        <div className="absolute bottom-16 left-12 z-40 bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-2xl backdrop-blur-md w-80 text-xs space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <span className="font-semibold text-slate-100 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Search GIFs</span>
            </span>
            <button onClick={() => setGifPickerOpen(false)} className="text-slate-400 hover:text-white">✕</button>
          </div>
          <input
            type="text"
            placeholder="Search animated GIFs..."
            value={gifQuery}
            onChange={(e) => setGifQuery(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100"
          />
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {sampleGifs.map((g) => (
              <img
                key={g.id}
                src={g.url}
                alt={g.title}
                onClick={() => sendGif(g.url)}
                className="w-full h-20 object-cover rounded-lg cursor-pointer hover:scale-105 transition border border-slate-800"
              />
            ))}
          </div>
        </div>
      )}

      {/* Floating Sticker Packs Picker */}
      {stickerPickerOpen && (
        <div className="absolute bottom-16 left-20 z-40 bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-2xl backdrop-blur-md w-72 text-xs space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <span className="font-semibold text-slate-100 flex items-center gap-1.5">
              <Sticker className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sticker Packs</span>
            </span>
            <button onClick={() => setStickerPickerOpen(false)} className="text-slate-400 hover:text-white">✕</button>
          </div>
          {stickerPacks.map((pack, idx) => (
            <div key={idx} className="space-y-1">
              <span className="text-[10px] text-slate-400 font-semibold">{pack.packName}</span>
              <div className="grid grid-cols-4 gap-2 p-1.5 bg-slate-950/60 rounded-xl">
                {pack.stickers.map((st, i) => (
                  <button
                    key={i}
                    onClick={() => sendSticker(st)}
                    className="p-1.5 text-2xl hover:scale-125 transition flex items-center justify-center"
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Emoji Bar */}
      {emojiPickerOpen && (
        <div className="absolute bottom-16 left-4 z-40 bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-2xl backdrop-blur-md w-72 grid grid-cols-8 gap-2 max-h-48 overflow-y-auto text-lg">
          {['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😋', '😜', '🤪', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '👍', '👎', '👏', '🙌', '🔥', '⚡', '💯', '✨', '🚀', '❤️'].map((em, i) => (
            <button
              key={i}
              onClick={() => {
                setText((prev) => prev + em);
              }}
              className="hover:scale-125 transition"
            >
              {em}
            </button>
          ))}
        </div>
      )}

      {/* Voice Recording Active Panel */}
      {isRecording ? (
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-3">
            <button
              onClick={cancelRecording}
              className="p-2 text-rose-400 hover:bg-rose-950/50 rounded-xl transition"
              title="Cancel Recording"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
              <span className="font-mono text-sm font-semibold text-slate-100">{formatTimer(recordSeconds)}</span>
            </div>

            {/* Simulated Live Audio Waves */}
            <div className="hidden sm:flex items-center gap-1 h-6 px-3">
              {[20, 50, 80, 40, 100, 60, 30, 70, 90, 40, 60, 85].map((h, i) => (
                <div
                  key={i}
                  style={{ height: `${h}%` }}
                  className="w-1 bg-cyan-400 rounded-full animate-wave-bar"
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-2 text-slate-300 hover:bg-slate-800 rounded-xl transition"
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>

            <button
              onClick={sendVoiceNote}
              className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md font-semibold transition"
              title="Send Voice Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Standard Composer Input Row */
        <div className="flex items-end gap-1.5 sm:gap-2">
          {/* Action icon group */}
          <div className="flex items-center gap-0.5 shrink-0 pb-1">
            <button
              onClick={() => {
                setEmojiPickerOpen(!emojiPickerOpen);
                setAttachmentDrawerOpen(false);
                setGifPickerOpen(false);
                setStickerPickerOpen(false);
              }}
              className="p-2 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800 transition"
              title="Emoji"
            >
              <Smile className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                setAttachmentDrawerOpen(!attachmentDrawerOpen);
                setEmojiPickerOpen(false);
                setGifPickerOpen(false);
                setStickerPickerOpen(false);
              }}
              className="p-2 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800 transition"
              title="Attach File"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                setGifPickerOpen(!gifPickerOpen);
                setEmojiPickerOpen(false);
                setAttachmentDrawerOpen(false);
                setStickerPickerOpen(false);
              }}
              className="hidden sm:inline-flex p-2 text-slate-400 hover:text-cyan-400 rounded-xl hover:bg-slate-800 transition"
              title="Send GIF"
            >
              <Sparkles className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                setStickerPickerOpen(!stickerPickerOpen);
                setEmojiPickerOpen(false);
                setAttachmentDrawerOpen(false);
                setGifPickerOpen(false);
              }}
              className="hidden sm:inline-flex p-2 text-slate-400 hover:text-cyan-400 rounded-xl hover:bg-slate-800 transition"
              title="Stickers"
            >
              <Sticker className="w-5 h-5" />
            </button>
          </div>

          {/* Text input area */}
          <div className="flex-1 min-w-0 bg-slate-950/80 border border-slate-800 focus-within:border-cyan-500/80 rounded-2xl px-3.5 py-2 transition shadow-inner">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="w-full bg-transparent text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none resize-none max-h-32"
            />
          </div>

          {/* Send or Voice Record Trigger */}
          <div className="shrink-0 pb-1">
            {text.trim() ? (
              <button
                onClick={handleSend}
                className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold shadow-md shadow-cyan-950/50 transition transform hover:scale-105"
                title="Send Message"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition"
                title="Record Voice Message"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
