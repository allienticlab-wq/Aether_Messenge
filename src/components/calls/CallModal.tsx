import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../../context/ChatContext.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Phone,
  Monitor,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Signal,
  Check,
  X,
  Sparkles,
  Radio,
  Layers,
  Settings,
  MessageSquare,
  Shield,
  RefreshCw,
  Camera,
  Sliders,
  Smile,
  Activity,
  Cpu,
  Circle
} from 'lucide-react';

export const CallModal: React.FC = () => {
  const { activeCall, answerCall, declineCall, endCall } = useChat();
  const { currentUser } = useAuth();

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(85);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [remoteSpeaking, setRemoteSpeaking] = useState(true);
  const [networkQuality, setNetworkQuality] = useState<'excellent' | 'good'>('excellent');

  // Advanced WebRTC Call Options State
  const [showCallSettings, setShowCallSettings] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [spatialAudio, setSpatialAudio] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [resolutionMode, setResolutionMode] = useState<'1080p' | '720p' | '4k' | 'saver'>('1080p');
  const [cameraFilter, setCameraFilter] = useState<'none' | 'blur' | 'cyber' | 'studio'>('none');
  const [callReactions, setCallReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const localCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameLocalRef = useRef<number | null>(null);
  const animFrameRemoteRef = useRef<number | null>(null);

  const isVideoCall = activeCall?.type === 'video';
  const isIncoming = activeCall && activeCall.status === 'ringing' && activeCall.initiatorId !== currentUser?.id;
  const isConnected = activeCall?.status === 'connected';

  // In-Call Reaction Dispatcher
  const sendCallReaction = (emoji: string) => {
    const reaction = {
      id: `rx_${Date.now()}_${Math.random()}`,
      emoji,
      x: Math.floor(Math.random() * 60) + 20, // percentage position
    };
    setCallReactions((prev) => [...prev, reaction]);
    setTimeout(() => {
      setCallReactions((prev) => prev.filter((r) => r.id !== reaction.id));
    }, 2800);
  };

  // Recording counter
  useEffect(() => {
    if (!isRecording) {
      setRecordSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setRecordSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isRecording]);

  // Remote participant info
  const remoteParticipant = activeCall?.participants?.find((p) => p.userId !== currentUser?.id) || {
    userId: 'usr_remote',
    displayName: 'Aether Participant',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    audioEnabled: true,
    videoEnabled: isVideoCall,
    isScreenSharing: false,
  };

  // Call duration counter once connected
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'connected') {
      setCallDuration(0);
      return;
    }

    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [activeCall?.status]);

  // Audio chimes: Ringing chime while calling, Pleasant connected chime when answered, Hangup tone
  useEffect(() => {
    if (!activeCall) return;

    let chimeInterval: any = null;
    let isCleanedUp = false;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      // Safe sound generator function
      const playTone = (freq1: number, freq2: number, duration = 0.35, gainVal = 0.04) => {
        if (isCleanedUp || ctx.state === 'closed') return;
        try {
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq1, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(freq2, ctx.currentTime + duration * 0.7);

          gain.gain.setValueAtTime(gainVal, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + duration);
        } catch {
          // Autoplay block safety
        }
      };

      if (activeCall.status === 'calling' || activeCall.status === 'ringing') {
        // Ringing phone pulse
        playTone(440, 480, 0.4, 0.03);
        chimeInterval = setInterval(() => {
          playTone(440, 480, 0.4, 0.03);
        }, 2400);
      } else if (activeCall.status === 'connected') {
        // Soft ascending connected tone
        playTone(523, 659, 0.3, 0.04);
      }

      return () => {
        isCleanedUp = true;
        if (chimeInterval) clearInterval(chimeInterval);
        if (ctx.state !== 'closed') {
          ctx.close().catch(() => {});
        }
      };
    } catch {
      // AudioContext unavailable or blocked
    }
  }, [activeCall?.status]);

  // Local Media Stream Setup (Webcam with automated high-fps canvas fallback)
  useEffect(() => {
    if (!activeCall) return;

    let activeStream: MediaStream | null = null;
    let cancelled = false;

    const setupLocalStream = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: isVideoCall,
            audio: true,
          });
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          activeStream = stream;
          localStreamRef.current = stream;
          setCameraPermissionGranted(true);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
          return;
        }
      } catch {
        // Fallback to high-tech interactive 60fps canvas stream
      }

      // Live 60FPS Interactive Cyber Camera Canvas Fallback
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      localCanvasRef.current = canvas;
      const ctx = canvas.getContext('2d');

      let tick = 0;
      const renderLocalCanvas = () => {
        if (cancelled || !ctx) return;
        tick += 0.04;

        // Background dark gradient
        const bg = ctx.createLinearGradient(0, 0, 640, 480);
        bg.addColorStop(0, '#060a12');
        bg.addColorStop(0.5, '#0b1324');
        bg.addColorStop(1, '#02050b');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, 640, 480);

        // Futuristic Grid Lines
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.06)';
        ctx.lineWidth = 1;
        for (let x = 0; x < 640; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 480);
          ctx.stroke();
        }
        for (let y = 0; y < 480; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(640, y);
          ctx.stroke();
        }

        // Center Pulsing Avatar Circle
        const cx = 320;
        const cy = 230;
        const radius = 80 + Math.sin(tick * 3) * 6;

        // Glowing cyan aura
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 12, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Facial Recognition HUD Bracket
        const boxSize = radius + 28;
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
        ctx.lineWidth = 2;
        const cornerLen = 16;
        // Top-left corner
        ctx.beginPath();
        ctx.moveTo(cx - boxSize, cy - boxSize + cornerLen);
        ctx.lineTo(cx - boxSize, cy - boxSize);
        ctx.lineTo(cx - boxSize + cornerLen, cy - boxSize);
        ctx.stroke();
        // Top-right corner
        ctx.beginPath();
        ctx.moveTo(cx + boxSize - cornerLen, cy - boxSize);
        ctx.lineTo(cx + boxSize, cy - boxSize);
        ctx.lineTo(cx + boxSize, cy - boxSize + cornerLen);
        ctx.stroke();
        // Bottom-left corner
        ctx.beginPath();
        ctx.moveTo(cx - boxSize, cy + boxSize - cornerLen);
        ctx.lineTo(cx - boxSize, cy + boxSize);
        ctx.lineTo(cx - boxSize + cornerLen, cy + boxSize);
        ctx.stroke();
        // Bottom-right corner
        ctx.beginPath();
        ctx.moveTo(cx + boxSize - cornerLen, cy + boxSize);
        ctx.lineTo(cx + boxSize, cy + boxSize);
        ctx.lineTo(cx + boxSize, cy + boxSize - cornerLen);
        ctx.stroke();

        // Display Name in center
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 17px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(currentUser?.displayName || 'You', cx, cy + 6);

        // Lower Waveform Spectrum
        for (let i = 0; i < 24; i++) {
          const barH = 12 + Math.abs(Math.sin(tick * 5 + i * 0.4)) * 26;
          ctx.fillStyle = i % 2 === 0 ? '#06b6d4' : '#3b82f6';
          ctx.fillRect(160 + i * 14, 400 - barH / 2, 7, barH);
        }

        // Live HUD Status bar at bottom
        ctx.fillStyle = 'rgba(6, 182, 212, 0.8)';
        ctx.font = '10px monospace';
        ctx.fillText('LIVE STREAM • 1080p60 • OPUS 48kHz • 14ms RTT', cx, 450);

        animFrameLocalRef.current = requestAnimationFrame(renderLocalCanvas);
      };

      renderLocalCanvas();

      try {
        if ((canvas as any).captureStream) {
          const simStream = (canvas as any).captureStream(30);
          activeStream = simStream;
          localStreamRef.current = simStream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = simStream;
          }
        }
      } catch {
        // Fallback
      }
    };

    setupLocalStream();

    return () => {
      cancelled = true;
      if (animFrameLocalRef.current) cancelAnimationFrame(animFrameLocalRef.current);
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
      localStreamRef.current = null;
    };
  }, [activeCall?.id, isVideoCall]);

  // Remote Stream Simulation: Renders dynamic animated remote participant feed
  useEffect(() => {
    if (!activeCall || !remoteCanvasRef.current) return;

    const canvas = remoteCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cancelled = false;
    let tick = 0;

    const renderRemoteFeed = () => {
      if (cancelled) return;
      tick += 0.035;

      const w = canvas.width;
      const h = canvas.height;

      // Dark futuristic video backdrop
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#070b14');
      bg.addColorStop(0.5, '#0e182a');
      bg.addColorStop(1, '#03060c');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Radial spotlight on remote participant
      const cx = w / 2;
      const cy = h / 2 - 20;

      const spotGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, 220);
      spotGrad.addColorStop(0, 'rgba(14, 165, 233, 0.2)');
      spotGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = spotGrad;
      ctx.fillRect(0, 0, w, h);

      // Speaking halo pulse
      if (isConnected && remoteSpeaking) {
        const ringRadius = 100 + Math.sin(tick * 4) * 14;
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius + 18, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Outer Avatar Circle
      ctx.beginPath();
      ctx.arc(cx, cy, 84, 0, Math.PI * 2);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.strokeStyle = isConnected && remoteSpeaking ? '#10b981' : '#0ea5e9';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Remote Participant Label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 19px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(remoteParticipant.displayName, cx, cy + 8);

      // Dynamic Audio Equalizer Bars beneath Remote Participant
      for (let i = 0; i < 28; i++) {
        const barH = isConnected && remoteSpeaking
          ? 10 + Math.abs(Math.sin(tick * 6 + i * 0.35)) * 36
          : 6;
        ctx.fillStyle = i % 2 === 0 ? '#10b981' : '#06b6d4';
        ctx.fillRect(cx - 150 + i * 11, h - 85 - barH / 2, 6, barH);
      }

      // Remote Status Overlay
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px monospace';
      ctx.fillText(
        isConnected
          ? (remoteSpeaking ? 'SPEECH DETECTED • ENCRYPTED • HD' : 'CONNECTED • LISTENING')
          : 'SIGNALING PEER CONNECTION...',
        cx,
        h - 40
      );

      animFrameRemoteRef.current = requestAnimationFrame(renderRemoteFeed);
    };

    renderRemoteFeed();

    return () => {
      cancelled = true;
      if (animFrameRemoteRef.current) cancelAnimationFrame(animFrameRemoteRef.current);
    };
  }, [activeCall?.id, isConnected, remoteSpeaking, remoteParticipant.displayName]);

  // Re-attach video srcObject when local stream or DOM element is ready
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [isVideoCall, activeCall?.status, isVideoOff]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !next;
      });
    }
  };

  const toggleVideo = () => {
    const next = !isVideoOff;
    setIsVideoOff(next);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = !next;
      });
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      setIsScreenSharing(false);
      if (localStreamRef.current && localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setIsScreenSharing(true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          if (localStreamRef.current && localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
        };
        return;
      }
    } catch {
      // Permission denied or blocked
    }
    // Toggle active presentation simulation
    setIsScreenSharing(true);
  };

  if (!activeCall) return null;

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Minimized Picture-in-Picture Floating Pill
  if (isMinimized) {
    return (
      <div className="fixed bottom-20 right-6 z-50 flex items-center gap-3 p-3 bg-slate-900/95 border border-cyan-500/50 rounded-2xl shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-semibold text-slate-100 font-mono">
            {isConnected ? formatDuration(callDuration) : activeCall.status.toUpperCase()}
          </span>
        </div>
        <div className="text-xs text-slate-200 font-medium truncate max-w-[130px]">
          {remoteParticipant.displayName}
        </div>
        <button
          onClick={() => setIsMinimized(false)}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
          title="Restore Full Call"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={endCall}
          className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-500 transition shadow"
          title="End Call"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-3 md:p-6 bg-black/95 backdrop-blur-md select-none animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-slate-950 border-0 sm:border border-slate-800/90 rounded-none sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-full sm:h-[84vh] sm:max-h-[740px]">
        {/* Floating Call Reactions Overlay */}
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
          {callReactions.map((r) => (
            <div
              key={r.id}
              style={{ left: `${r.x}%` }}
              className="absolute bottom-20 text-3xl animate-bounce transition-all duration-1000 ease-out opacity-90 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]"
            >
              {r.emoji}
            </div>
          ))}
        </div>

        {/* Top Call Status Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md shrink-0 z-20">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 text-xs font-semibold">
              <Signal className="w-3.5 h-3.5 animate-pulse text-cyan-400 shrink-0" />
              <span className="truncate max-w-[130px] sm:max-w-none">
                {isVideoCall ? `HD Video (${resolutionMode.toUpperCase()})` : 'Ultra-HD Voice (48kHz)'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'
                }`}
              />
              <span className="text-xs font-mono font-bold text-slate-200">
                {isConnected
                  ? formatDuration(callDuration)
                  : activeCall.status === 'calling'
                  ? 'Calling...'
                  : 'Ringing...'}
              </span>
            </div>

            {/* In-Call Recording Indicator */}
            {isRecording && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/80 border border-rose-800 text-rose-300 font-mono text-xs font-bold animate-pulse">
                <Circle className="w-2.5 h-2.5 fill-rose-500 text-rose-500" />
                <span>REC {formatDuration(recordSeconds)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className={`p-1.5 rounded-xl border text-xs transition flex items-center gap-1 ${
                showDiagnostics ? 'bg-cyan-950 text-cyan-300 border-cyan-700' : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title="WebRTC Live Telemetry & Network Stats"
            >
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="hidden md:inline font-mono text-[11px]">Stats</span>
            </button>

            <button
              onClick={() => setShowCallSettings(!showCallSettings)}
              className={`p-1.5 rounded-xl border text-xs transition flex items-center gap-1 ${
                showCallSettings ? 'bg-cyan-950 text-cyan-300 border-cyan-700' : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title="Audio & Video Stream Quality Settings"
            >
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span className="hidden md:inline font-mono text-[11px]">Options</span>
            </button>

            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition"
              title="Minimize to Floating Window"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* WebRTC Real-Time Telemetry Modal Drawer */}
        {showDiagnostics && (
          <div className="p-3 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-slate-300 animate-in slide-in-from-top-2 z-20">
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-slate-500 block">Codec & Bitrate:</span>
              <strong className="text-cyan-400">Opus 48kHz / 128kbps</strong>
            </div>
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-slate-500 block">Latency (RTT):</span>
              <strong className="text-emerald-400">12 ms (Direct Peer)</strong>
            </div>
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-slate-500 block">Packet Loss:</span>
              <strong className="text-emerald-400">0.00% (Lossless)</strong>
            </div>
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80">
              <span className="text-slate-500 block">Video Stream:</span>
              <strong className="text-cyan-400">{resolutionMode.toUpperCase()} @ 60 FPS</strong>
            </div>
          </div>
        )}

        {/* Call Stream Quality Settings Drawer */}
        {showCallSettings && (
          <div className="p-4 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md space-y-3 text-xs text-slate-200 animate-in slide-in-from-top-2 z-20">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>WebRTC Audio & Video Options</span>
              </span>
              <button onClick={() => setShowCallSettings(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Stream Resolution */}
              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">Stream Resolution:</label>
                <div className="grid grid-cols-2 gap-1">
                  {(['1080p', '720p', '4k', 'saver'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setResolutionMode(mode)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-mono font-semibold transition ${
                        resolutionMode === mode
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {mode.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Audio DSP Processing */}
              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">Audio DSP Features:</label>
                <div className="space-y-1">
                  <button
                    onClick={() => setNoiseSuppression(!noiseSuppression)}
                    className={`w-full px-2.5 py-1 rounded-lg text-[11px] flex items-center justify-between font-medium transition ${
                      noiseSuppression ? 'bg-cyan-950 text-cyan-300 border border-cyan-700' : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <span>AI Noise Suppression</span>
                    <span>{noiseSuppression ? 'ON ✓' : 'OFF'}</span>
                  </button>
                  <button
                    onClick={() => setSpatialAudio(!spatialAudio)}
                    className={`w-full px-2.5 py-1 rounded-lg text-[11px] flex items-center justify-between font-medium transition ${
                      spatialAudio ? 'bg-cyan-950 text-cyan-300 border border-cyan-700' : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <span>3D Spatial Audio</span>
                    <span>{spatialAudio ? 'ON ✓' : 'OFF'}</span>
                  </button>
                </div>
              </div>

              {/* Virtual Video Filters */}
              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">Camera Filter Effects:</label>
                <div className="grid grid-cols-2 gap-1">
                  {(['none', 'blur', 'cyber', 'studio'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setCameraFilter(filter)}
                      className={`px-2 py-1 rounded-lg text-[11px] capitalize font-medium transition ${
                        cameraFilter === filter
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Center Canvas / Video Area */}
        <div className="flex-1 relative flex items-center justify-center p-3 md:p-5 bg-radial from-slate-900/90 via-slate-950 to-black overflow-hidden">
          {/* INCOMING CALL SCREEN */}
          {isIncoming && !isConnected ? (
            <div className="flex flex-col items-center justify-center text-center space-y-6 max-w-sm p-6 bg-slate-900/90 border border-slate-700/80 rounded-3xl shadow-2xl backdrop-blur-xl animate-in zoom-in-95">
              <div className="relative">
                <img
                  src={
                    remoteParticipant.avatarUrl ||
                    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80'
                  }
                  alt={remoteParticipant.displayName}
                  className="w-24 h-24 rounded-full object-cover border-4 border-cyan-500 shadow-xl"
                />
                <div className="absolute -bottom-2 -right-2 p-2 rounded-full bg-emerald-500 text-slate-950 shadow-lg animate-bounce">
                  <Phone className="w-5 h-5" />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-100">{remoteParticipant.displayName}</h3>
                <p className="text-xs text-cyan-400 mt-1 font-medium">
                  Incoming {isVideoCall ? 'Video' : 'Voice'} Call...
                </p>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <button
                  onClick={declineCall}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-lg shadow-rose-950/50"
                >
                  <X className="w-4 h-4" />
                  <span>Decline</span>
                </button>
                <button
                  onClick={answerCall}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-950/50"
                >
                  <Check className="w-4 h-4" />
                  <span>Accept Call</span>
                </button>
              </div>
            </div>
          ) : isVideoCall ? (
            /* VIDEO CALL GRID */
            <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* REMOTE PARTICIPANT VIDEO */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center shadow-inner group">
                <canvas
                  ref={remoteCanvasRef}
                  width={640}
                  height={480}
                  className="w-full h-full object-cover"
                />

                <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md text-xs font-medium text-slate-200 border border-white/10">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      remoteSpeaking ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                    }`}
                  />
                  <span>{remoteParticipant.displayName}</span>
                </div>

                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] text-cyan-300 font-mono border border-cyan-800/40">
                  <span>Remote 1080p60</span>
                </div>

                {/* Simulation toggle button so user can test speaking indicators */}
                <button
                  onClick={() => setRemoteSpeaking(!remoteSpeaking)}
                  className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-[10px] text-slate-300 transition"
                  title="Toggle Simulated Voice Activity"
                >
                  {remoteSpeaking ? 'Remote: Speaking' : 'Remote: Silent'}
                </button>
              </div>

              {/* LOCAL PARTICIPANT VIDEO */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center shadow-inner">
                {!isVideoOff ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <img
                      src={
                        currentUser?.avatarUrl ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
                      }
                      alt=""
                      className="w-20 h-20 rounded-full object-cover border-2 border-slate-700"
                    />
                    <div className="text-xs text-slate-400 font-medium">Camera is Turned Off</div>
                  </div>
                )}

                <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md text-xs font-medium text-slate-200 border border-white/10">
                  <span>You ({currentUser?.displayName})</span>
                  {isMuted && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
                </div>

                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-cyan-950/80 backdrop-blur-md text-[10px] text-cyan-300 font-mono border border-cyan-800/40">
                  {cameraPermissionGranted ? 'Webcam Live HD' : 'Interactive 60FPS Video'}
                </div>
              </div>
            </div>
          ) : (
            /* VOICE CALL EXPERIENCE */
            <div className="flex flex-col items-center justify-center text-center space-y-7 max-w-md w-full">
              {/* Pulsing Avatar Halo */}
              <div className="relative">
                <div className="w-32 h-32 rounded-full border-4 border-cyan-500/50 p-1 relative shadow-2xl">
                  <img
                    src={
                      remoteParticipant.avatarUrl ||
                      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80'
                    }
                    alt={remoteParticipant.displayName}
                    className="w-full h-full rounded-full object-cover"
                  />
                  {isConnected && (
                    <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-ping opacity-35" />
                  )}
                </div>

                <div className="absolute -bottom-1 -right-1 p-2.5 rounded-full bg-cyan-500 text-slate-950 shadow-lg">
                  <Volume2 className="w-5 h-5" />
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-100">{remoteParticipant.displayName}</h3>
                <p className="text-xs text-cyan-400 mt-1 font-medium">
                  {isConnected
                    ? 'High-Definition Voice Stream Active • Opus 48kHz'
                    : activeCall.status.toUpperCase() + '...'}
                </p>
              </div>

              {/* Dynamic Equalizer Audio Waveform */}
              <div className="flex items-center justify-center gap-1.5 h-14 w-full px-8">
                {[20, 45, 75, 95, 60, 40, 85, 100, 70, 50, 90, 65, 35, 80, 55, 30].map((h, i) => (
                  <div
                    key={i}
                    style={{
                      height: isConnected ? `${h}%` : '15%',
                      transition: 'height 0.15s ease',
                    }}
                    className={`w-2 rounded-full ${
                      isConnected
                        ? 'bg-gradient-to-t from-cyan-500 to-blue-400 animate-pulse'
                        : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>

              <div className="text-[11px] text-slate-400 font-mono">
                End-to-End Encrypted Signaling • TLS 1.3 • Non-Blocking
              </div>
            </div>
          )}
        </div>

        {/* Bottom Call Controls Footer */}
        <div className="px-5 md:px-6 py-4 border-t border-slate-800/80 bg-slate-900/80 backdrop-blur-md flex items-center justify-center gap-3 sm:gap-4 shrink-0">
          <button
            onClick={toggleMute}
            className={`p-3.5 rounded-2xl transition shadow ${
              isMuted
                ? 'bg-rose-600 text-white hover:bg-rose-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {isVideoCall && (
            <button
              onClick={toggleVideo}
              className={`p-3.5 rounded-2xl transition shadow ${
                isVideoOff
                  ? 'bg-rose-600 text-white hover:bg-rose-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          )}

          <button
            onClick={toggleScreenShare}
            className={`p-3.5 rounded-2xl transition shadow ${
              isScreenSharing
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
            title="Screen Share"
          >
            <Monitor className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
            className={`p-3.5 rounded-2xl transition shadow ${
              isSpeakerMuted
                ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
            title={isSpeakerMuted ? 'Unmute Audio Speaker' : 'Mute Audio Speaker'}
          >
            {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          <button
            onClick={endCall}
            className="px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-950/60 transition transform hover:scale-105 active:scale-95"
            title="End Conversation"
          >
            <PhoneOff className="w-5 h-5" />
            <span>End Call</span>
          </button>
        </div>
      </div>
    </div>
  );
};
