import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useBranding } from '../../context/BrandingContext.js';
import { X, ShieldCheck, UserCheck, KeyRound, ArrowRight, UserPlus, LogIn } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, switchDemoUser } = useAuth();
  const { branding } = useBranding();

  const [mode, setMode] = useState<'login' | 'register' | 'mfa'>('login');
  const [identifier, setIdentifier] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login' || mode === 'mfa') {
        const res = await login(identifier, password, mode === 'mfa' ? mfaCode : undefined);
        if (res.requireMfa) {
          setMode('mfa');
          return;
        }
        if (!res.success) {
          setError(res.error || 'Authentication failed');
          return;
        }
        onClose();
      } else {
        const fullPhone = phone.trim() ? (phone.startsWith('+') ? phone.trim() : `${countryCode}${phone.trim()}`) : undefined;
        const res = await register({
          email: emailInput.trim() || undefined,
          username,
          displayName,
          password,
          phone: fullPhone,
        });
        if (!res.success) {
          setError(res.error || 'Registration failed');
          return;
        }
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectDemo = async (userId: string) => {
    setIsSubmitting(true);
    try {
      await switchDemoUser(userId);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <img src={branding.appLogo} alt={branding.appName} className="w-6 h-6 object-contain" />
            <span className="font-semibold text-slate-100 text-sm tracking-tight">{branding.appName} Account</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[85vh] space-y-5">
          {/* Production Auth Tabs */}
          <div className="flex items-center justify-center gap-4 text-xs font-semibold border-b border-slate-800 pb-2">
            <button
              onClick={() => { setMode('login'); setError(null); }}
              className={`pb-1 border-b-2 transition ${mode === 'login' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('register'); setError(null); }}
              className={`pb-1 border-b-2 transition ${mode === 'register' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              Create New Account
            </button>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-800/50 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'mfa' ? (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  6-Digit Two-Factor Authentication Passcode
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="000000"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-center text-lg tracking-widest font-mono text-cyan-400 focus:outline-none focus:border-cyan-500"
                />
              </div>
            ) : (
              <>
                {mode === 'register' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Full Display Name</label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Alex Morgan"
                        required
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Username</label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="alex_m"
                        required
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </>
                )}

                {mode === 'register' ? (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Mobile Number (India +91 Default)</label>
                      <div className="flex gap-2">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-cyan-400 font-mono focus:outline-none focus:border-cyan-500"
                        >
                          <option value="+91">🇮🇳 +91 (India)</option>
                          <option value="+1">🇺🇸 +1 (US/Canada)</option>
                          <option value="+44">🇬🇧 +44 (UK)</option>
                          <option value="+971">🇦🇪 +971 (UAE)</option>
                          <option value="+65">🇸🇬 +65 (Singapore)</option>
                          <option value="+61">🇦🇺 +61 (Australia)</option>
                          <option value="+49">🇩🇪 +49 (Germany)</option>
                        </select>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="98765 43210"
                          className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-slate-300">Email Address</label>
                        <span className="text-[10px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">Optional</span>
                      </div>
                      <input
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="user@example.com (optional)"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Mobile Number (+91), Email, or Username
                    </label>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="+91 98765 43210, email, or username"
                      required
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-xs transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              ) : mode === 'register' ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  <span>Verify Passcode</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
