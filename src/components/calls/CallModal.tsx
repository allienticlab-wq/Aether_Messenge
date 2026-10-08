import React, { useState, useEffect } from 'react';
import { useChat } from '../../context/ChatContext.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Monitor,
  Maximize2,
  Minimize2,
  Volume2,
  Shield,
  Signal
} from 'lucide-react';

export const CallModal: React.FC = () => {
  const { activeCall, endCall } = useChat();
  const { currentUser } = useAuth();

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (!activeCall) {
      setCallDuration(0);
      return;
    }

    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [activeCall]);

  if (!activeCall) return null;

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isVideoCall = activeCall.type === 'video';

  if (isMinimized) {
    return (
      <div className="fixed bottom-20 right-6 z-50 flex items-center gap-3 p-3 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-semibold text-slate-100 font-mono">{formatDuration(callDuration)}</span>
        </div>
        <button
          onClick={() => setIsMinimized(false)}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={endCall}
          className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-500"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="relative w-full max-w-3xl bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[75vh]">
        {/* Top Call Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/50 text-cyan-300 text-xs font-medium">
              <Signal className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              <span>WebRTC High-Fidelity {isVideoCall ? 'Video' : 'Voice'}</span>
            </div>
            <span className="text-xs font-mono text-slate-400 font-semibold">{formatDuration(callDuration)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition"
              title="Minimize Call Window"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video / Call Center Area */}
        <div className="flex-1 relative flex items-center justify-center p-6 bg-radial from-slate-900/60 to-slate-950">
          {isVideoCall && !isVideoOff ? (
            <div className="w-full h-full grid grid-cols-2 gap-4">
              {/* Remote Participant Video Canvas */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80"
                  alt="Remote Participant"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[11px] font-medium text-slate-200">
                  Dr. Elena Rostova
                </div>
              </div>

              {/* Local Participant Video Canvas */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
                {currentUser?.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                    You
                  </div>
                )}
                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[11px] font-medium text-slate-200">
                  You ({currentUser?.displayName})
                </div>
              </div>
            </div>
          ) : (
            /* Voice Call Avatar & Waveform Presentation */
            <div className="flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <div className="w-28 h-28 rounded-full border-2 border-cyan-500/40 p-1">
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80"
                    alt="Active Call"
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 p-2 rounded-full bg-cyan-500 text-slate-950 shadow-lg">
                  <Volume2 className="w-4 h-4" />
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-100">Direct Voice Session</h3>
                <p className="text-xs text-cyan-400 mt-1">Live Audio Waveform Connected</p>
              </div>

              {/* Dynamic Equalizer Bar Simulation */}
              <div className="flex items-center gap-1.5 h-10">
                {[14, 28, 48, 72, 90, 60, 35, 75, 100, 80, 45, 65, 88, 50, 30, 20].map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h}%`, animationDelay: `${i * 0.08}s` }}
                    className="w-1.5 bg-gradient-to-t from-cyan-500 to-blue-400 rounded-full animate-wave-bar"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Call Controls Footer */}
        <div className="px-6 py-5 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-center gap-4">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-3.5 rounded-full transition ${
              isMuted ? 'bg-rose-600/80 text-white hover:bg-rose-600' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {isVideoCall && (
            <button
              onClick={() => setIsVideoOff(!isVideoOff)}
              className={`p-3.5 rounded-full transition ${
                isVideoOff ? 'bg-rose-600/80 text-white hover:bg-rose-600' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              title={isVideoOff ? 'Enable Video' : 'Turn Off Video'}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          )}

          <button
            onClick={() => setIsScreenSharing(!isScreenSharing)}
            className={`p-3.5 rounded-full transition ${
              isScreenSharing ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            title="Screen Sharing"
          >
            <Monitor className="w-5 h-5" />
          </button>

          <button
            onClick={endCall}
            className="p-3.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30 transition transform hover:scale-105"
            title="End Call"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
