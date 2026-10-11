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
  Sticker,
  AlertCircle,
  Clock
} from 'lucide-react';
import { PhotoSendPreviewModal } from './PhotoSendPreviewModal.js';
import { PhotoUploaderModal } from '../common/PhotoUploaderModal.js';
import { ScheduleMessageModal } from '../modals/ScheduleMessageModal.js';
import { ScheduledMessagesModal } from '../modals/ScheduledMessagesModal.js';

interface MessageComposerProps {
  replyMessage: Message | null;
  onClearReply: () => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({ replyMessage, onClearReply }) => {
  const {
    sendMessage,
    scheduleMessage,
    scheduledMessages,
    cancelScheduledMessage,
    sendScheduledMessageNow,
    sendTyping,
    activeChat,
  } = useChat();

  const [text, setText] = useState('');
  const [attachmentDrawerOpen, setAttachmentDrawerOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [viewScheduledModalOpen, setViewScheduledModalOpen] = useState(false);
  const [scheduleToast, setScheduleToast] = useState<string | null>(null);
  const [gifQuery, setGifQuery] = useState('');

  // Real Microphone MediaRecorder state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [liveVolumeLevels, setLiveVolumeLevels] = useState<number[]>([25, 40, 60, 35, 80, 50, 30, 65, 45, 30, 25, 20]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Photo System states
  const [photoPreviewData, setPhotoPreviewData] = useState<{
    dataUrl: string;
    name: string;
    size: number;
    mimeType: string;
  } | null>(null);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);

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

  // Ref to track typing throttle and timers
  const typingThrottleRef = useRef<number>(0);
  const stopTypingTimerRef = useRef<any>(null);
  const activeChatIdRef = useRef<string | undefined>(activeChat?.id);

  // Helper to get supported audio MIME type for MediaRecorder
  const getSupportedMimeType = () => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/aac',
      'audio/wav',
    ];
    for (const type of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  // Clean up all MediaStream, MediaRecorder, AudioContext & Animation frames
  const cleanupRecordingStream = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setIsPaused(false);
    setRecordSeconds(0);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupRecordingStream();
    };
  }, []);

  // Stop typing indicator on old chat when user switches activeChat
  useEffect(() => {
    if (activeChatIdRef.current && activeChatIdRef.current !== activeChat?.id) {
      sendTyping(false, activeChatIdRef.current);
      if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
      typingThrottleRef.current = 0;
    }
    activeChatIdRef.current = activeChat?.id;
  }, [activeChat?.id]);

  // Clean unmount typing stop
  useEffect(() => {
    return () => {
      if (activeChatIdRef.current) {
        sendTyping(false, activeChatIdRef.current);
      }
      if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
    };
  }, []);

  // Real-time typing event emission with 2s heartbeat throttle and 2.5s inactivity auto-stop
  useEffect(() => {
    if (!activeChat) return;

    if (text.trim().length > 0) {
      const now = Date.now();
      if (now - typingThrottleRef.current > 2000) {
        typingThrottleRef.current = now;
        sendTyping(true, activeChat.id);
      }

      if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
      stopTypingTimerRef.current = setTimeout(() => {
        sendTyping(false, activeChat.id);
        typingThrottleRef.current = 0;
      }, 2500);
    } else {
      if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
      sendTyping(false, activeChat.id);
      typingThrottleRef.current = 0;
    }

    return () => {
      if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
    };
  }, [text, activeChat?.id]);

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
    if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
    if (activeChat) sendTyping(false, activeChat.id);
    typingThrottleRef.current = 0;
    onClearReply();
    setEmojiPickerOpen(false);
    setGifPickerOpen(false);
    setStickerPickerOpen(false);

    await sendMessage(currentText, undefined, replySnippet);
  };

  const handleConfirmSchedule = async (isoDateTime: string) => {
    if (!activeChat) return;

    let replySnippet: MessageReplySnippet | undefined;
    if (replyMessage) {
      replySnippet = {
        id: replyMessage.id,
        senderId: replyMessage.senderId,
        senderName: replyMessage.sender?.displayName || 'User',
        text: replyMessage.text,
      };
    }

    await scheduleMessage(activeChat.id, text, isoDateTime, [], replySnippet);

    setText('');
    onClearReply();
    if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
    sendTyping(false, activeChat.id);
    typingThrottleRef.current = 0;
    setEmojiPickerOpen(false);
    setGifPickerOpen(false);
    setStickerPickerOpen(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const formattedTime = new Date(isoDateTime).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    setScheduleToast(`Message scheduled for ${formattedTime}`);
    setTimeout(() => setScheduleToast(null), 4000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Start Real Microphone Audio Recording
  const startRecording = async () => {
    setMicError(null);
    audioChunksRef.current = [];
    setRecordSeconds(0);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicError('Microphone audio recording is not supported in this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Real-time Audio Frequency Analyser for Live Waveform Metering
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateVolume = () => {
            if (analyserRef.current && !isPaused) {
              analyserRef.current.getByteFrequencyData(dataArray);
              const samples: number[] = [];
              const step = Math.max(1, Math.floor(dataArray.length / 12));
              for (let i = 0; i < 12; i++) {
                const val = dataArray[i * step] || 0;
                const percent = Math.min(100, Math.max(15, Math.round((val / 255) * 100)));
                samples.push(percent);
              }
              setLiveVolumeLevels(samples);
            }
            animFrameRef.current = requestAnimationFrame(updateVolume);
          };
          updateVolume();
        }
      } catch {
        // Fallback live volume levels
      }

      mediaRecorder.start(200);
      setIsRecording(true);
      setIsPaused(false);
    } catch (err: any) {
      console.error('Failed to access microphone:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicError('Microphone permission denied. Please allow microphone access in your browser settings.');
      } else {
        setMicError('Unable to access microphone. Please check your audio recording device.');
      }
    }
  };

  // Toggle Pause / Resume
  const togglePauseRecording = () => {
    if (!mediaRecorderRef.current) return;
    if (isPaused) {
      if (mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.resume();
      }
      setIsPaused(false);
    } else {
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.pause();
      }
      setIsPaused(true);
    }
  };

  // Cancel Voice Recording
  const cancelRecording = () => {
    audioChunksRef.current = [];
    cleanupRecordingStream();
  };

  // Process Recorded Blob into Data URI and Send Message
  const processAndSendAudioBlob = async (duration: number) => {
    const mimeType = mediaRecorderRef.current?.mimeType || getSupportedMimeType() || 'audio/webm';
    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

    if (audioBlob.size === 0) {
      cleanupRecordingStream();
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;

      // Extract representative waveform bar heights
      const waveform = liveVolumeLevels.length > 0
        ? [...liveVolumeLevels, ...liveVolumeLevels].slice(0, 24)
        : Array.from({ length: 24 }, () => Math.floor(Math.random() * 70 + 20));

      const ext = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm';

      const voiceAttachment: Attachment = {
        id: `voice_${Date.now()}`,
        name: `Audio_Note_${new Date().toLocaleTimeString().replace(/:/g, '')}.${ext}`,
        url: dataUrl,
        type: 'voice',
        mimeType,
        size: audioBlob.size,
        duration,
        waveform,
      };

      cleanupRecordingStream();
      await sendMessage('', [voiceAttachment]);
    };
    reader.readAsDataURL(audioBlob);
  };

  // Stop Recording and Send Captured Audio
  const sendVoiceNote = async () => {
    const duration = recordSeconds || 1;
    const mediaRecorder = mediaRecorderRef.current;

    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      if (audioChunksRef.current.length > 0) {
        await processAndSendAudioBlob(duration);
      } else {
        cleanupRecordingStream();
      }
      return;
    }

    mediaRecorder.onstop = () => {
      processAndSendAudioBlob(duration);
    };

    mediaRecorder.stop();
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

      if (isImg) {
        setPhotoPreviewData({
          dataUrl: dataUri,
          name: file.name,
          size: file.size,
          mimeType: file.type || 'image/jpeg',
        });
        return;
      }

      await sendMessage('', [att]);
    };
    reader.readAsDataURL(file);
  };

  const handleSendPhotoWithCaption = async (caption: string, attachment: Attachment) => {
    let replySnippet: MessageReplySnippet | undefined;
    if (replyMessage) {
      replySnippet = {
        id: replyMessage.id,
        senderId: replyMessage.senderId,
        senderName: replyMessage.sender?.displayName || 'User',
        text: replyMessage.text,
      };
    }
    await sendMessage(caption, [attachment], replySnippet);
    onClearReply();
  };

  const handleCameraPhotoSnapped = (photoUrl: string) => {
    if (photoUrl) {
      setPhotoPreviewData({
        dataUrl: photoUrl,
        name: `Camera_Photo_${Date.now()}.jpg`,
        size: Math.round(photoUrl.length * 0.75),
        mimeType: 'image/jpeg',
      });
    }
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

      {/* Scheduled Messages Banner for active chat */}
      {activeChat && scheduledMessages.length > 0 && (
        <div className="mb-2 px-3 py-1.5 bg-cyan-950/40 border border-cyan-800/40 rounded-xl flex items-center justify-between text-xs text-cyan-300">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              <strong className="text-cyan-200">{scheduledMessages.length}</strong> message{scheduledMessages.length !== 1 ? 's' : ''} scheduled for auto-sending
            </span>
          </div>
          <button
            onClick={() => setViewScheduledModalOpen(true)}
            className="px-2.5 py-1 text-[11px] font-semibold text-cyan-200 bg-cyan-900/60 hover:bg-cyan-800/80 rounded-lg border border-cyan-700/50 transition cursor-pointer"
          >
            View Scheduled
          </button>
        </div>
      )}

      {/* Schedule Toast notification */}
      {scheduleToast && (
        <div className="mb-2 px-3 py-2 bg-emerald-950/80 border border-emerald-500/40 rounded-xl flex items-center gap-2 text-xs text-emerald-200 shadow-lg">
          <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{scheduleToast}</span>
        </div>
      )}

      {/* Microphone Permission / Capture Error Banner */}
      {micError && (
        <div className="mb-2 p-2 px-3 bg-rose-950/90 border border-rose-800/80 rounded-xl flex items-center justify-between text-xs text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{micError}</span>
          </div>
          <button onClick={() => setMicError(null)} className="p-1 text-rose-400 hover:text-white rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Floating Attachments Drawer */}
      {attachmentDrawerOpen && (
        <div className="absolute bottom-16 left-4 z-40 bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-2xl backdrop-blur-md grid grid-cols-5 gap-2 w-96 text-xs">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-cyan-400 transition cursor-pointer"
          >
            <div className="p-2.5 rounded-full bg-cyan-950/60 text-cyan-400 border border-cyan-800/50">
              <Image className="w-4 h-4" />
            </div>
            <span>Photos</span>
          </button>

          <button
            onClick={() => {
              setAttachmentDrawerOpen(false);
              startRecording();
            }}
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-rose-400 transition cursor-pointer"
          >
            <div className="p-2.5 rounded-full bg-rose-950/60 text-rose-400 border border-rose-800/50">
              <Mic className="w-4 h-4" />
            </div>
            <span>Record</span>
          </button>

          <button
            onClick={() => {
              setAttachmentDrawerOpen(false);
              setCameraModalOpen(true);
            }}
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-amber-400 transition cursor-pointer"
          >
            <div className="p-2.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-800/50">
              <Camera className="w-4 h-4" />
            </div>
            <span>Camera</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-blue-400 transition cursor-pointer"
          >
            <div className="p-2.5 rounded-full bg-blue-950/60 text-blue-400 border border-blue-800/50">
              <FileText className="w-4 h-4" />
            </div>
            <span>Document</span>
          </button>

          <button
            onClick={sendLocationAttachment}
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-800/80 text-slate-300 hover:text-emerald-400 transition cursor-pointer"
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
        <div className="flex items-center justify-between px-2 py-1 select-none">
          <div className="flex items-center gap-3">
            <button
              onClick={cancelRecording}
              className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 rounded-xl transition cursor-pointer"
              title="Cancel & Discard Recording"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full bg-rose-500 ${isPaused ? 'opacity-50' : 'animate-pulse'}`} />
              <span className="font-mono text-xs sm:text-sm font-semibold text-slate-100">{formatTimer(recordSeconds)}</span>
              {isPaused && <span className="text-[10px] text-amber-400 font-medium font-mono">(Paused)</span>}
            </div>

            {/* Real-time Web Audio Live Waveform Bars */}
            <div className="hidden sm:flex items-center gap-1 h-6 px-3">
              {liveVolumeLevels.map((val, i) => (
                <div
                  key={i}
                  style={{ height: `${isPaused ? 20 : val}%` }}
                  className="w-1 bg-cyan-400 rounded-full transition-all duration-100"
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={togglePauseRecording}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title={isPaused ? 'Resume Recording' : 'Pause Recording'}
            >
              {isPaused ? <Play className="w-4 h-4 fill-current text-cyan-400" /> : <Pause className="w-4 h-4 fill-current" />}
            </button>

            <button
              onClick={sendVoiceNote}
              className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold shadow-md shadow-cyan-950/50 transition transform hover:scale-105 cursor-pointer flex items-center gap-1"
              title="Send Recorded Voice Message"
            >
              <Send className="w-4 h-4 ml-0.5" />
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
              onClick={() => setCameraModalOpen(true)}
              className="p-2 text-slate-400 hover:text-cyan-400 rounded-xl hover:bg-slate-800 transition"
              title="Camera (Take Photo)"
            >
              <Camera className="w-5 h-5" />
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
              className="hidden sm:inline-flex p-2 text-slate-400 hover:text-cyan-400 rounded-xl hover:bg-slate-800 transition cursor-pointer"
              title="Stickers"
            >
              <Sticker className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                setScheduleModalOpen(true);
                setEmojiPickerOpen(false);
                setAttachmentDrawerOpen(false);
                setGifPickerOpen(false);
                setStickerPickerOpen(false);
              }}
              className="p-2 text-slate-400 hover:text-cyan-400 rounded-xl hover:bg-slate-800 transition cursor-pointer relative"
              title="Schedule Message for Later"
            >
              <Clock className="w-5 h-5" />
              {scheduledMessages.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              )}
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

          {/* Send or Schedule / Voice Record Trigger */}
          <div className="shrink-0 pb-1 flex items-center gap-1">
            {text.trim() ? (
              <>
                <button
                  onClick={() => setScheduleModalOpen(true)}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition cursor-pointer"
                  title="Schedule Message"
                >
                  <Clock className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSend}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold shadow-md shadow-cyan-950/50 transition transform hover:scale-105 cursor-pointer"
                  title="Send Message Now"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </>
            ) : (
              <button
                onClick={startRecording}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition cursor-pointer"
                title="Record Voice Message"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Photo Preview & Caption Sender Modal */}
      {photoPreviewData && (
        <PhotoSendPreviewModal
          isOpen={!!photoPreviewData}
          onClose={() => setPhotoPreviewData(null)}
          imageFile={photoPreviewData}
          onSend={handleSendPhotoWithCaption}
        />
      )}

      {/* Camera Photo Taker Modal */}
      {cameraModalOpen && (
        <PhotoUploaderModal
          isOpen={cameraModalOpen}
          onClose={() => setCameraModalOpen(false)}
          onPhotoSelected={handleCameraPhotoSnapped}
          title="Take Photo for Chat"
          aspectRatio="square"
        />
      )}

      {/* Schedule Message Date & Time Picker Modal */}
      <ScheduleMessageModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        messageText={text}
        attachments={[]}
        onConfirmSchedule={handleConfirmSchedule}
      />

      {/* Scheduled Messages List & Management Modal */}
      <ScheduledMessagesModal
        isOpen={viewScheduledModalOpen}
        onClose={() => setViewScheduledModalOpen(false)}
        scheduledMessages={scheduledMessages}
        onCancel={async (id) => {
          if (activeChat) await cancelScheduledMessage(activeChat.id, id);
        }}
        onSendNow={async (id) => {
          if (activeChat) await sendScheduledMessageNow(activeChat.id, id);
        }}
      />
    </div>
  );
};
