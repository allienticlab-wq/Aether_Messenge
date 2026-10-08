import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import {
  X,
  QrCode,
  Camera,
  Check,
  RefreshCw,
  Laptop,
  Trash2,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, authorizeQrLinkCode, getActiveQrSessions } = useAuth();

  const [linkCodeInput, setLinkCodeInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setCameraActive(false);
      setError(null);
      setSuccessMsg(null);
      setLinkCodeInput('');
      return;
    }

    // Load active sessions
    loadActiveSessions();

    // Attempt camera for scanning
    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen]);

  const loadActiveSessions = async () => {
    try {
      const list = await getActiveQrSessions();
      setActiveSessions(list);
    } catch {
      // Ignore
    }
  };

  const startCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);
      }
    } catch {
      setCameraActive(false);
    }
  };

  const handleLinkCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkCodeInput.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await authorizeQrLinkCode(linkCodeInput.trim());
      if (res.success) {
        setSuccessMsg(res.message || 'Web client authorized successfully!');
        setLinkCodeInput('');
        loadActiveSessions();
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setError(res.error || 'Failed to authorize code.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error linking web code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await fetch('/api/auth/revoke-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || '',
        },
        body: JSON.stringify({ sessionId }),
      });
      loadActiveSessions();
    } catch {
      // Ignore
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-100 text-sm">Link Web Browser</h2>
              <p className="text-[11px] text-slate-400">web.aether.xperiserv.in</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Camera Scanner View or Instruction */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 h-48 flex items-center justify-center">
            {cameraActive ? (
              <>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute inset-0 border-2 border-cyan-400/50 m-6 rounded-xl pointer-events-none animate-pulse" />
                <div className="absolute bottom-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-cyan-300">
                  Point camera at QR code on screen
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-2 p-4 text-center">
                <Laptop className="w-10 h-10 text-cyan-400" />
                <div className="text-xs font-semibold text-slate-200">Open web.aether.xperiserv.in</div>
                <div className="text-[11px] text-slate-400 max-w-xs">
                  Enter the 6-character Short Code displayed on your desktop computer below to link instantly!
                </div>
              </div>
            )}
          </div>

          {/* Manual Short Link Code Input */}
          <form onSubmit={handleLinkCodeSubmit} className="space-y-3">
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                Enter 6-Character Pairing Code (e.g. AE-8492)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="AE-XXXX"
                  value={linkCodeInput}
                  onChange={(e) => setLinkCodeInput(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono font-bold text-cyan-300 tracking-wider outline-none focus:border-cyan-400 uppercase"
                  maxLength={10}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !linkCodeInput.trim()}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition shadow flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <span>Authorize</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Active Linked Web Sessions */}
          {activeSessions.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
              <span className="text-[11px] font-semibold text-slate-300 block">
                Currently Linked Web Devices ({activeSessions.length})
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {activeSessions.map((sess, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Laptop className="w-4 h-4 text-cyan-400" />
                      <div>
                        <div className="font-semibold text-slate-200 text-[11px]">
                          {sess.userAgent || 'Aether Web Client'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Code: {sess.linkCode} &bull; IP: {sess.ipAddress}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevokeSession(sess.session?.id || sess.sessionId)}
                      className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition"
                      title="Log Out This Web Client"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
