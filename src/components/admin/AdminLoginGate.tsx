import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useBranding } from '../../context/BrandingContext.js';
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  RefreshCw,
  KeyRound,
  Shield
} from 'lucide-react';

interface AdminLoginGateProps {
  onBackToMessenger?: () => void;
  onSuccess?: () => void;
}

export const AdminLoginGate: React.FC<AdminLoginGateProps> = ({
  onBackToMessenger,
  onSuccess,
}) => {
  const { branding } = useBranding();
  const { login, currentUser, logout } = useAuth();

  const [identifier, setIdentifier] = useState('support@xperiserv.in');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please enter your administrator username/email and password.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await login(identifier.trim(), password);
      if (res.success) {
        onSuccess?.();
      } else {
        setError(res.error || 'Invalid administrator credentials. Access denied.');
      }
    } catch {
      setError('Network communication failure. Please check your connectivity.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#060910] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none font-sans">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-cyan-500/10 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-600/5 blur-[100px] pointer-events-none rounded-full" />

      {/* Main Admin Gate Card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl p-6 sm:p-8 relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header Lockup */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
              <img src={branding.appLogo} alt="" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-1.5">
                <span>{branding.appName} Operations</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400">
                  Secured
                </span>
              </h1>
              <p className="text-xs text-slate-400">Restricted Administration Console</p>
            </div>
          </div>

          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400">
            <Shield className="w-5 h-5 text-cyan-400" />
          </div>
        </div>

        {/* Notice for current non-admin session if applicable */}
        {currentUser && currentUser.role !== 'super_admin' && currentUser.role !== 'admin' && (
          <div className="mt-5 p-3 rounded-xl bg-amber-950/40 border border-amber-800/50 text-amber-200 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Insufficient Privileges</span>
            </div>
            <p className="text-[11px] text-amber-300/80 leading-relaxed">
              Currently signed in as <strong>{currentUser.displayName}</strong> (standard user). Administrator credentials are required to access this portal.
            </p>
            <button
              type="button"
              onClick={() => logout()}
              className="text-[11px] text-cyan-400 hover:underline font-medium mt-1 inline-block"
            >
              Sign out of current account &rarr;
            </button>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="mt-5 p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Administrator Authentication Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Admin Username or Email</span>
              <span className="text-[10px] text-slate-500 font-mono">TLS 1.3</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@aether.internal or support@xperiserv.in"
                className="w-full px-3.5 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition font-mono"
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Security Password</span>
              <span className="text-[10px] text-slate-500 font-mono">Argon2 / SHA-256</span>
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold text-xs tracking-wide shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Verifying Attestation...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-3.5 h-3.5" />
                <span>Authenticate & Open Admin Console</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer actions */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          {onBackToMessenger && (
            <button
              type="button"
              onClick={onBackToMessenger}
              className="flex items-center gap-1.5 hover:text-cyan-400 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Messenger</span>
            </button>
          )}

          <div className="text-[11px] font-mono text-slate-500 ml-auto">
            Port 443 &bull; Allientic Lab Core
          </div>
        </div>
      </div>

      {/* Compliance / Security watermark */}
      <div className="mt-6 text-center text-[11px] text-slate-500 max-w-sm">
        Protected system. Unauthorized access attempts are monitored and recorded in platform audit logs.
      </div>
    </div>
  );
};
