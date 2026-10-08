import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { useAuth } from '../../context/AuthContext.js';
import {
  Camera,
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  ShieldCheck,
  SwitchCamera
} from 'lucide-react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (code: string) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { authorizeQrLinkCode, authorizeQrSession } = useAuth();

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [manualCode, setManualCode] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setSuccessInfo(null);
      setErrorMessage(null);
      setIsProcessing(false);
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    stopCamera();
    setErrorMessage(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasPermission(false);
        setErrorMessage('Camera API is not supported on this device/browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS Safari
        await videoRef.current.play();
        setHasPermission(true);
        requestAnimationFrame(scanQrFrame);
      }
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      setHasPermission(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Camera access was denied. Please allow camera permissions in browser settings.');
      } else {
        setErrorMessage('Unable to activate camera. You can still pair using the 6-character short code below.');
      }
    }
  };

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleDetectedCode = async (codeText: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // Vibrate for physical feedback on mobile
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 60, 40]);
      }

      let res: any;
      // If scanned code is JSON or URL with token
      if (codeText.startsWith('{') && codeText.endsWith('}')) {
        try {
          const parsed = JSON.parse(codeText);
          if (parsed.sessionId && parsed.token) {
            res = await authorizeQrSession(parsed.sessionId, parsed.token);
          }
        } catch {}
      }

      // If not parsed as JSON, pair as short code or link code
      if (!res) {
        let clean = codeText.trim();
        if (clean.includes('linkCode=')) {
          const match = clean.match(/linkCode=([^&]+)/);
          if (match) clean = match[1];
        }
        res = await authorizeQrLinkCode(clean);
      }

      if (res && res.success) {
        setSuccessInfo('Desktop Web paired successfully! You are now logged into your computer.');
        stopCamera();
        onSuccess?.(codeText);
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setErrorMessage(res?.error || 'Invalid or expired QR code session.');
        setTimeout(() => {
          setIsProcessing(false);
          setErrorMessage(null);
          requestAnimationFrame(scanQrFrame);
        }, 2500);
      }
    } catch {
      setErrorMessage('Communication error while authorizing QR code.');
      setIsProcessing(false);
      requestAnimationFrame(scanQrFrame);
    }
  };

  const scanQrFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || isProcessing) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          handleDetectedCode(code.data);
          return;
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(scanQrFrame);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    await handleDetectedCode(manualCode.trim());
  };

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md select-none animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-800 text-cyan-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Scan QR Code to Login</h3>
              <p className="text-[11px] text-slate-400">Link your laptop or desktop browser session</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewfinder */}
        <div className="relative aspect-square max-h-[340px] w-full bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanner HUD Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Dark vignette corners */}
            <div className="relative w-56 h-56 rounded-2xl border-2 border-cyan-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-cyan-400 rounded-br-lg" />

              {/* Animated laser scan line */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_rgba(6,182,212,1)] animate-bounce top-2" />
            </div>
          </div>

          {/* Camera switch toggle button */}
          <button
            type="button"
            onClick={toggleCameraFacing}
            className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 text-white backdrop-blur-md border border-white/20 hover:bg-black/80 transition"
            title="Switch Front / Rear Camera"
          >
            <SwitchCamera className="w-5 h-5" />
          </button>

          {/* Processing / Success Banner */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center space-y-3">
              {successInfo ? (
                <>
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
                  <p className="font-bold text-slate-100 text-sm">{successInfo}</p>
                </>
              ) : (
                <>
                  <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                  <p className="font-semibold text-slate-200 text-xs">Authorizing desktop session...</p>
                </>
              )}
            </div>
          )}

          {/* Camera Error Message */}
          {hasPermission === false && (
            <div className="absolute inset-0 bg-slate-950 p-6 flex flex-col items-center justify-center text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-amber-400" />
              <p className="text-xs text-slate-300 leading-relaxed max-w-xs">{errorMessage}</p>
              <button
                onClick={startCamera}
                className="px-3 py-1.5 bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl"
              >
                Retry Camera
              </button>
            </div>
          )}
        </div>

        {/* Instructions & Short Code Fallback */}
        <div className="p-4 sm:p-5 space-y-3 bg-slate-900/60 border-t border-slate-800">
          <div className="flex items-start gap-2 text-[11px] text-slate-300">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              On your laptop or desktop browser, visit <strong className="text-cyan-300 font-mono">web.aether.xperiserv.in</strong> and point this camera at the QR code.
            </span>
          </div>

          {/* Manual Short Code Form */}
          <form onSubmit={handleManualSubmit} className="space-y-1.5 pt-2 border-t border-slate-800/80">
            <label className="text-[11px] text-slate-400 block font-medium">
              Or enter the 6-character Code displayed on desktop:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. AE-8492"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 font-mono uppercase tracking-widest outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={isProcessing || !manualCode.trim()}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition disabled:opacity-50"
              >
                {isProcessing ? 'Pairing...' : 'Link'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
