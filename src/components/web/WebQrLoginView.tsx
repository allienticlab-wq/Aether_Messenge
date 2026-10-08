import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useAuth } from '../../context/AuthContext.js';
import { useBranding } from '../../context/BrandingContext.js';
import {
  QrCode,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  Lock,
  Globe,
  ExternalLink,
  Laptop
} from 'lucide-react';

interface WebQrLoginViewProps {
  onOpenMobileLogin?: () => void;
}

export const WebQrLoginView: React.FC<WebQrLoginViewProps> = ({ onOpenMobileLogin }) => {
  const { branding } = useBranding();
  const { currentUser } = useAuth();

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [linkCode, setLinkCode] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [remainingSecs, setRemainingSecs] = useState<number>(120);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [authorizedSuccess, setAuthorizedSuccess] = useState<boolean>(false);

  const pollTimerRef = useRef<any>(null);

  // Generate new QR Session
  const initQrSession = async () => {
    setIsLoading(true);
    setIsExpired(false);
    setAuthorizedSuccess(false);

    try {
      const res = await fetch('/api/auth/qr/generate', { method: 'POST' });
      const data = await res.json();

      if (data.sessionId) {
        setSessionId(data.sessionId);
        setLinkCode(data.linkCode || 'AE-8492');
        setExpiresAt(data.expiresAt || Date.now() + 120000);
        setRemainingSecs(120);

        // Generate QR image data URL using qrcode package
        const qrUrl = await QRCode.toDataURL(data.qrPayload || data.sessionId, {
          width: 320,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        });
        setQrCodeDataUrl(qrUrl);
      }
    } catch (err) {
      console.error('Failed to initialize QR session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initQrSession();
    return () => {
      clearInterval(pollTimerRef.current);
    };
  }, []);

  // Countdown timer for expiration
  useEffect(() => {
    if (!expiresAt) return;

    const timer = setInterval(() => {
      const diff = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
      setRemainingSecs(diff);
      if (diff <= 0) {
        setIsExpired(true);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  // Polling for QR status every 1.5 seconds
  useEffect(() => {
    if (!sessionId || isExpired || authorizedSuccess) return;

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/auth/qr/status/${encodeURIComponent(sessionId)}`);
        const data = await res.json();

        if (data.status === 'authorized' && data.user && data.session) {
          setAuthorizedSuccess(true);
          localStorage.setItem('aether_user_id', data.user.id);
          localStorage.setItem('aether_session_id', data.session.id);
          // Reload page to enter full web messenger
          setTimeout(() => {
            window.location.href = '/';
          }, 800);
        } else if (data.status === 'expired') {
          setIsExpired(true);
        }
      } catch {
        // Ignore poll error
      }
    };

    pollTimerRef.current = setInterval(pollStatus, 1500);

    return () => clearInterval(pollTimerRef.current);
  }, [sessionId, isExpired, authorizedSuccess]);

  const copyPairingCode = () => {
    if (!linkCode) return;
    navigator.clipboard.writeText(linkCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="min-h-screen w-full bg-[#060910] text-slate-100 flex flex-col select-none relative overflow-hidden font-sans">
      {/* Background radial atmosphere */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-500/10 blur-[130px] pointer-events-none rounded-full" />

      {/* Top Header */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-6 md:px-12 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center p-1.5 shadow">
            <img src={branding.appLogo} alt="" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              <span>{branding.appName} Web</span>
              <span className="text-[10px] bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 px-2 py-0.5 rounded-full font-mono">
                web.aether.xperiserv.in
              </span>
            </h1>
            <p className="text-[10px] text-slate-400">Scan & Connect Seamlessly</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <a
            href="/"
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition flex items-center gap-1.5"
          >
            <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Mobile App</span>
          </a>
          <a
            href="/admin"
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Admin Portal</span>
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-8 z-10">
        <div className="w-full max-w-4xl bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[520px]">
          {/* Left Instructions Column */}
          <div className="md:col-span-7 p-6 md:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800/80">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 text-xs font-semibold">
                  <Laptop className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Desktop Web Portal</span>
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Use {branding.appName} on your Computer
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Log in directly without typing passwords. Keep your conversations in sync across phone and desktop.
                </p>
              </div>

              {/* Instructions steps */}
              <ol className="space-y-4 text-xs text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 border border-cyan-500/30 text-xs">
                    1
                  </span>
                  <div className="pt-0.5">
                    <span className="font-semibold text-white">Open Aether on your phone</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">Available on mobile web or PWA app</p>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 border border-cyan-500/30 text-xs">
                    2
                  </span>
                  <div className="pt-0.5">
                    <span className="font-semibold text-white">Tap &ldquo;Link Web Browser&rdquo; or QR Scanner</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">Found on the top bar or inside settings</p>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 border border-cyan-500/30 text-xs">
                    3
                  </span>
                  <div className="pt-0.5">
                    <span className="font-semibold text-white">Scan this QR code with your phone camera</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">Or type the 6-character short code below</p>
                  </div>
                </li>
              </ol>

              {/* Manual 6-character Link Code fallback */}
              {linkCode && (
                <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Short Link Code</span>
                    <span className="text-base font-mono font-bold text-cyan-300 tracking-wider">
                      {linkCode}
                    </span>
                  </div>
                  <button
                    onClick={copyPairingCode}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition flex items-center gap-1.5 font-medium"
                    title="Copy short code"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bottom help & mobile login button */}
            <div className="pt-6 border-t border-slate-800/60 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">No phone right now?</span>
              <button
                onClick={() => {
                  if (onOpenMobileLogin) onOpenMobileLogin();
                  else window.location.href = '/?login=true';
                }}
                className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
              >
                <span>Sign in with Mobile OTP</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right QR Code Column */}
          <div className="md:col-span-5 p-6 md:p-8 flex flex-col items-center justify-center bg-slate-950/40 relative">
            <div className="relative group">
              {/* Animated scan line over QR */}
              {!isExpired && !authorizedSuccess && (
                <div className="absolute inset-x-2 h-0.5 bg-cyan-400 shadow-[0_0_12px_#06b6d4] z-20 animate-bounce pointer-events-none top-6" />
              )}

              {/* QR Container */}
              <div className="p-4 bg-white rounded-3xl shadow-2xl relative overflow-hidden w-64 h-64 md:w-72 md:h-72 flex items-center justify-center">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center space-y-2 text-slate-700">
                    <RefreshCw className="w-8 h-8 animate-spin text-cyan-600" />
                    <span className="text-xs font-medium">Generating QR...</span>
                  </div>
                ) : authorizedSuccess ? (
                  <div className="flex flex-col items-center justify-center space-y-2 text-emerald-600 animate-in zoom-in-95">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Check className="w-10 h-10 text-emerald-600 stroke-[3]" />
                    </div>
                    <span className="text-sm font-bold">Authorized!</span>
                    <span className="text-[11px] text-slate-600">Loading messenger...</span>
                  </div>
                ) : isExpired ? (
                  <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center space-y-3 z-30">
                    <span className="text-xs font-semibold text-rose-300">QR Code Expired</span>
                    <p className="text-[11px] text-slate-400">Click below to generate a new active code</p>
                    <button
                      onClick={initQrSession}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reload Code</span>
                    </button>
                  </div>
                ) : (
                  <img
                    src={qrCodeDataUrl}
                    alt="Aether Web Login QR Code"
                    className="w-full h-full object-contain select-none"
                  />
                )}
              </div>

              {/* Status footer pill */}
              <div className="mt-4 flex items-center justify-between w-full px-2 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <span className={`w-2 h-2 rounded-full ${isExpired ? 'bg-rose-400' : 'bg-cyan-400 animate-pulse'}`} />
                  <span>{isExpired ? 'Expired' : 'Waiting for scan...'}</span>
                </div>
                {!isExpired && (
                  <span className="text-[11px] font-mono text-cyan-400 font-semibold">
                    Expires in {remainingSecs}s
                  </span>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 text-center mt-6 max-w-[240px]">
              Point phone camera directly at the code. Protected by TLS 1.3 token verification.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-10 border-t border-slate-800/60 bg-slate-950/80 px-6 flex items-center justify-between text-[11px] text-slate-500 z-10 shrink-0">
        <div>&copy; {new Date().getFullYear()} {branding.companyName}. All rights reserved.</div>
        <div className="flex items-center gap-4">
          <span>End-to-End Encrypted Signaling</span>
          <span>&bull;</span>
          <span className="text-slate-400">Secure Web Gateway</span>
        </div>
      </footer>
    </div>
  );
};
