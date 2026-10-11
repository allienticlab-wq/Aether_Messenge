import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useBranding } from '../../context/BrandingContext.js';
import {
  X,
  Phone,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  Check,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Camera,
  ChevronDown,
  LogOut,
  RefreshCw,
  QrCode,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { VerifiedBadge } from '../common/VerifiedBadge.js';
import { PhotoUploaderModal } from '../common/PhotoUploaderModal.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CountryInfo {
  name: string;
  code: string;
  flag: string;
  placeholder: string;
}

const COUNTRIES: CountryInfo[] = [
  { name: 'India', code: '+91', flag: '🇮🇳', placeholder: '98765 43210' },
  { name: 'United States', code: '+1', flag: '🇺🇸', placeholder: '(555) 019-2834' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧', placeholder: '7911 123456' },
  { name: 'United Arab Emirates', code: '+971', flag: '🇦🇪', placeholder: '50 123 4567' },
  { name: 'Singapore', code: '+65', flag: '🇸🇬', placeholder: '9123 4567' },
  { name: 'Australia', code: '+61', flag: '🇦🇺', placeholder: '412 345 678' },
  { name: 'Germany', code: '+49', flag: '🇩🇪', placeholder: '151 23456789' },
  { name: 'Canada', code: '+1', flag: '🇨🇦', placeholder: '(416) 555-0199' },
  { name: 'France', code: '+33', flag: '🇫🇷', placeholder: '6 12 34 56 78' },
  { name: 'Brazil', code: '+55', flag: '🇧🇷', placeholder: '21 99999-2020' },
];

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    login,
    register,
    requestPhoneOtp,
    verifyPhoneOtp,
    generateQrSession,
    checkQrStatus,
    authorizeQrSession,
    authorizeQrLinkCode,
    updateProfile,
    logout
  } = useAuth();
  const { branding } = useBranding();

  const isAdminPortal = Boolean(
    (typeof window !== 'undefined' &&
      (window.location.hostname.toLowerCase().startsWith('admin.') ||
        window.location.pathname.toLowerCase().startsWith('/admin') ||
        new URLSearchParams(window.location.search).get('portal') === 'admin')) ||
    (currentUser && (currentUser.role === 'super_admin' || currentUser.role === 'admin'))
  );

  // Mode: 'email' | 'qr' | 'admin'
  const [authMode, setAuthMode] = useState<'email' | 'qr' | 'admin'>(() => {
    try {
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname.toLowerCase();
        const pathname = window.location.pathname.toLowerCase();
        const searchPortal = new URLSearchParams(window.location.search).get('portal');
        if (hostname.startsWith('web.') || pathname.startsWith('/web') || searchPortal === 'web') {
          return 'qr';
        }
        if (hostname.startsWith('admin.') || pathname.startsWith('/admin') || searchPortal === 'admin') {
          return 'admin';
        }
      }
    } catch {}
    return 'email';
  });

  // QR Web Login State
  const [qrSession, setQrSession] = useState<{
    sessionId: string;
    token: string;
    linkCode?: string;
    expiresAt: number;
    qrPayload: string;
  } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrCodeCopied, setQrCodeCopied] = useState(false);
  const [qrLinkInput, setQrLinkInput] = useState('');
  const [isAuthorizingQr, setIsAuthorizingQr] = useState(false);

  // Phone flow steps: 1 = Enter phone, 2 = Enter OTP, 3 = Complete profile
  const [phoneStep, setPhoneStep] = useState<1 | 2 | 3>(1);

  // Phone input states (Default to India +91)
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(COUNTRIES[0]);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [flowType, setFlowType] = useState<'SMS' | 'WHATSAPP'>('SMS');
  const [verificationId, setVerificationId] = useState<string>('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [previewOtp, setPreviewOtp] = useState<string>('');
  const [countdown, setCountdown] = useState(45);
  const [canResend, setCanResend] = useState(false);

  // Profile setup states
  const [profileName, setProfileName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [photoUploaderOpen, setPhotoUploaderOpen] = useState(false);

  // Email Auth states
  const [emailTab, setEmailTab] = useState<'signin' | 'signup'>('signin');
  const [emailInput, setEmailInput] = useState('');
  const [customUsername, setCustomUsername] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailDisplayName, setEmailDisplayName] = useState('');
  const [showEmailPassword, setShowEmailPassword] = useState(false);

  // Admin / Staff Login Inputs (Empty in production)
  const [adminIdentifier, setAdminIdentifier] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Status & feedback
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Countdown timer for Phone OTP resend
  useEffect(() => {
    let timer: any;
    if (isOpen && phoneStep === 2 && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, phoneStep, countdown]);

  const rawCountryCode = selectedCountry.code.replace('+', '');
  const cleanPhoneDigits = phoneNumber.replace(/\D/g, '');
  const fullPhoneString = `+${rawCountryCode} ${cleanPhoneDigits}`;

  const handleModeChange = (mode: 'email' | 'qr' | 'admin') => {
    setAuthMode(mode);
    setError(null);
    setSuccessMsg(null);
    if (mode === 'qr' && !qrSession) {
      loadQrSession();
    }
  };

  // ---------------------------------------------------------------------------
  // QR WEB PAIRING (web.aether.xperiserv.in)
  // ---------------------------------------------------------------------------
  const loadQrSession = async () => {
    setQrLoading(true);
    setError(null);
    try {
      const data = await generateQrSession();
      if (data) {
        setQrSession(data);
      }
    } catch {
      setError('Failed to generate QR session.');
    } finally {
      setQrLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && authMode === 'qr' && !qrSession) {
      loadQrSession();
    }
  }, [isOpen, authMode, qrSession]);

  // Real-time polling for QR authorization
  useEffect(() => {
    if (!isOpen || authMode !== 'qr' || !qrSession?.sessionId || currentUser) return;

    const interval = setInterval(async () => {
      try {
        const res = await checkQrStatus(qrSession.sessionId);
        if (res.status === 'authorized' && res.user) {
          clearInterval(interval);
          setSuccessMsg(`Device linked! Welcome, ${res.user.displayName}`);
          setTimeout(() => onClose(), 800);
        }
      } catch {
        // Continue polling
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen, authMode, qrSession?.sessionId, currentUser]);

  const handleSimulateQrScan = async () => {
    if (!qrSession) return;
    setIsAuthorizingQr(true);
    setError(null);
    try {
      const res = await authorizeQrSession(qrSession.sessionId, qrSession.token);
      if (res.success) {
        setSuccessMsg('QR Code verified! Web Client is now authorized.');
        setTimeout(() => onClose(), 800);
      } else {
        setError(res.error || 'Failed to authorize QR code.');
      }
    } catch {
      setError('Network error authorizing QR code.');
    } finally {
      setIsAuthorizingQr(false);
    }
  };

  const handleAuthorizeLinkCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrLinkInput.trim()) return;
    setIsAuthorizingQr(true);
    setError(null);
    try {
      const res = await authorizeQrLinkCode(qrLinkInput.trim());
      if (res.success) {
        setSuccessMsg(res.message || 'Device linked successfully!');
        setQrLinkInput('');
        setTimeout(() => onClose(), 800);
      } else {
        setError(res.error || 'Invalid linking code.');
      }
    } catch {
      setError('Network error authorizing link code.');
    } finally {
      setIsAuthorizingQr(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 1. MESSAGECENTRAL VERIFYNOW (INDIA & GLOBAL OTP)
  // ---------------------------------------------------------------------------
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (cleanPhoneDigits.length < 6) {
      setError('Please enter a valid mobile number (at least 6-10 digits).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await requestPhoneOtp(cleanPhoneDigits, rawCountryCode, flowType);
      if (!res.success) {
        setError(res.error || 'Failed to dispatch verification code via MessageCentral.');
        return;
      }

      if (res.verificationId) {
        setVerificationId(res.verificationId);
      }
      if (res.previewCode) {
        setPreviewOtp(res.previewCode);
      }

      setPhoneStep(2);
      setCountdown(45);
      setCanResend(false);
      setOtpDigits(['', '', '', '', '', '']);
      setSuccessMsg(`OTP code dispatched via MessageCentral VerifyNow (${flowType}) to ${fullPhoneString}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    const fullCode = otpDigits.join('');
    if (fullCode.length < 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await verifyPhoneOtp(
        cleanPhoneDigits,
        fullCode,
        verificationId,
        rawCountryCode,
        {
          displayName: profileName.trim() || undefined,
          avatarUrl: avatarUrl || undefined,
        }
      );

      if (!res.success) {
        setError(res.error || 'Invalid or expired OTP code.');
        return;
      }

      if (res.isNewUser) {
        setPhoneStep(3);
      } else {
        setSuccessMsg('Signed in successfully via MessageCentral VerifyNow!');
        setTimeout(() => onClose(), 600);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      setError('Please enter your display name.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await updateProfile({
        displayName: profileName.trim(),
        avatarUrl: avatarUrl || undefined,
      });
      setSuccessMsg('Profile created successfully!');
      setTimeout(() => onClose(), 600);
    } catch {
      setError('Could not update profile information.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 2. EMAIL & PASSWORD AUTHENTICATION
  // ---------------------------------------------------------------------------
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !emailPassword.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await login(emailInput.trim(), emailPassword);
      if (!res.success) {
        setError(res.error || 'Email sign-in failed.');
        return;
      }
      setSuccessMsg('Signed in successfully!');
      setTimeout(() => onClose(), 600);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !emailPassword.trim() || !emailDisplayName.trim()) {
      setError('Please provide your name, email, and password.');
      return;
    }

    const cleanUsername = (
      customUsername.trim().replace(/^@/, '') ||
      emailInput.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') + Math.floor(10 + Math.random() * 90)
    ).toLowerCase();

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await register({
        email: emailInput.trim(),
        username: cleanUsername,
        displayName: emailDisplayName.trim(),
        password: emailPassword,
      });
      if (!res.success) {
        setError(res.error || 'Registration failed.');
        return;
      }
      if (avatarUrl) {
        await updateProfile({ avatarUrl });
      }
      setSuccessMsg(`Account created! Username: @${cleanUsername}`);
      setTimeout(() => onClose(), 600);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 3. ADMIN PORTAL DIRECT LOGIN
  // ---------------------------------------------------------------------------
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await login(adminIdentifier.trim(), adminPassword);
      if (!res.success) {
        setError(res.error || 'Admin credentials incorrect.');
        return;
      }
      setSuccessMsg('Authenticated as Administrator!');
      setTimeout(() => onClose(), 600);
    } finally {
      setIsSubmitting(false);
    }
  };

  // OTP Input handlers
  const handleDigitChange = (index: number, val: string) => {
    const char = val.replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = char;
    setOtpDigits(updated);

    if (char && index < 5) {
      const nextInput = document.getElementById(`auth-otp-${index + 1}`);
      nextInput?.focus();
    }

    if (updated.every((d) => d !== '') && index === 5) {
      setTimeout(() => handleVerifyOtp(), 100);
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`auth-otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePasteOtp = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      const updated = pasted.split('');
      while (updated.length < 6) updated.push('');
      setOtpDigits(updated);
      if (pasted.length === 6) {
        setTimeout(() => handleVerifyOtp(), 150);
      }
    }
  };

  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.code.includes(countrySearch)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none animate-in fade-in duration-150 overflow-y-auto">
      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <img src={branding.appLogo} alt="" className="w-4 h-4 object-contain" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-100 text-sm tracking-tight flex items-center gap-1.5">
                <span>{branding.appName}</span>
                <span className="text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-1.5 py-0.2 rounded-md font-mono">
                  Mail & Identity
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {currentUser ? 'Active Profile & Session' : 'Mail Login & Web Pair'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* If Already Logged In */}
        {currentUser ? (
          <div className="p-6 space-y-5">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3.5">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.displayName}
                className="w-14 h-14 rounded-2xl object-cover border border-slate-700 shadow"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-bold text-sm text-slate-100 truncate">
                  <span>{currentUser.displayName}</span>
                  {currentUser.verificationStatus === 'verified' && (
                    <VerifiedBadge
                      status="verified"
                      category={currentUser.verificationCategory}
                      size="sm"
                    />
                  )}
                </div>
                <div className="text-xs text-cyan-400 font-mono">@{currentUser.username}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {currentUser.email || 'Mail Account'}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-sm"
              >
                Continue to Messenger
              </button>

              <button
                type="button"
                onClick={() => {
                  logout();
                  setAuthMode('email');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-800/50 border border-slate-700 text-slate-300 font-medium text-xs transition flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tab Switcher: Mail Login | QR Web | (Admin if authorized) */}
            <div className="px-6 pt-4">
              <div className={`grid ${isAdminPortal ? 'grid-cols-3' : 'grid-cols-2'} gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs`}>
                <button
                  type="button"
                  onClick={() => handleModeChange('email')}
                  className={`flex items-center justify-center gap-1 py-1.5 rounded-lg font-medium transition ${
                    authMode === 'email'
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Mail Login</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleModeChange('qr')}
                  className={`flex items-center justify-center gap-1 py-1.5 rounded-lg font-medium transition ${
                    authMode === 'qr'
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>QR Web</span>
                </button>

                {isAdminPortal && (
                  <button
                    type="button"
                    onClick={() => handleModeChange('admin')}
                    className={`flex items-center justify-center gap-1 py-1.5 rounded-lg font-medium transition ${
                      authMode === 'admin'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Admin</span>
                  </button>
                )}
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {/* Error Banner */}
              {error && (
                <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-start justify-between gap-2">
                  <span>{error}</span>
                  <button
                    onClick={() => setError(null)}
                    className="text-rose-400 hover:text-rose-200 font-bold leading-none"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Success Banner */}
              {successMsg && (
                <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}



              {/* ============================================================== */}
              {/* 2. EMAIL & PASSWORD FLOW                                        */}
              {/* ============================================================== */}
              {authMode === 'email' && (
                <div className="space-y-4">
                  <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setEmailTab('signin')}
                      className={`flex-1 py-1.5 rounded-lg text-center font-medium transition ${
                        emailTab === 'signin' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmailTab('signup')}
                      className={`flex-1 py-1.5 rounded-lg text-center font-medium transition ${
                        emailTab === 'signup' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Create Account
                    </button>
                  </div>

                  {emailTab === 'signin' ? (
                    <form onSubmit={handleEmailSignIn} className="space-y-3">
                      <div>
                        <label className="text-[11px] text-slate-400 font-medium block mb-1">Email or Username</label>
                        <input
                          type="text"
                          placeholder="user@example.com or @username"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 outline-none focus:border-cyan-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 font-medium block mb-1">Password</label>
                        <div className="relative">
                          <input
                            type={showEmailPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={emailPassword}
                            onChange={(e) => setEmailPassword(e.target.value)}
                            className="w-full px-3 py-2 pr-9 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 outline-none focus:border-cyan-500"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowEmailPassword(!showEmailPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                          >
                            {showEmailPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-sm"
                      >
                        {isSubmitting ? 'Signing in...' : 'Sign In'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleEmailSignUp} className="space-y-3">
                      <div>
                        <label className="text-[11px] text-slate-400 font-medium block mb-1">Full Name</label>
                        <input
                          type="text"
                          placeholder="Your Display Name"
                          value={emailDisplayName}
                          onChange={(e) => setEmailDisplayName(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 outline-none focus:border-cyan-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 font-medium block mb-1">Username (for search & tags)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400 font-mono text-xs">@</span>
                          <input
                            type="text"
                            placeholder="username"
                            value={customUsername}
                            onChange={(e) => setCustomUsername(e.target.value)}
                            className="w-full pl-7 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 outline-none focus:border-cyan-500 font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 font-medium block mb-1">Email Address</label>
                        <input
                          type="email"
                          placeholder="name@example.com"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 outline-none focus:border-cyan-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 font-medium block mb-1">Password</label>
                        <input
                          type="password"
                          placeholder="At least 6 characters"
                          value={emailPassword}
                          onChange={(e) => setEmailPassword(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 outline-none focus:border-cyan-500"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-sm"
                      >
                        {isSubmitting ? 'Creating account...' : 'Create Account'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* ============================================================== */}
              {/* 3. QR WEB AUTHENTICATION (web.aether.xperiserv.in)              */}
              {/* ============================================================== */}
              {authMode === 'qr' && (
                <div className="space-y-4">
                  <div className="p-3 bg-cyan-950/40 border border-cyan-800/40 rounded-xl text-[11px] text-cyan-300 flex items-start gap-2">
                    <QrCode className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-semibold">Web Client Instant Pairing</strong>
                      <span>Scan with your mobile device or enter short link code. Dedicated URI: <code className="text-cyan-200">web.aether.xperiserv.in</code></span>
                    </div>
                  </div>

                  {/* QR Code Container */}
                  <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-950 border border-slate-800 relative overflow-hidden">
                    {qrLoading ? (
                      <div className="flex flex-col items-center justify-center py-10 space-y-2 text-slate-400 text-xs">
                        <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                        <span>Generating secure QR session...</span>
                      </div>
                    ) : qrSession ? (
                      <div className="flex flex-col items-center space-y-3">
                        {/* Animated QR Canvas Box with Laser Scanner Line */}
                        <div className="relative p-3 bg-white rounded-xl shadow-lg group">
                          {/* Simulated SVG QR Graphic */}
                          <svg className="w-44 h-44" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="100" height="100" fill="white" />
                            {/* Top Left Corner */}
                            <rect x="5" y="5" width="26" height="26" fill="black" />
                            <rect x="8" y="8" width="20" height="20" fill="white" />
                            <rect x="11" y="11" width="14" height="14" fill="black" />
                            {/* Top Right Corner */}
                            <rect x="69" y="5" width="26" height="26" fill="black" />
                            <rect x="72" y="8" width="20" height="20" fill="white" />
                            <rect x="75" y="11" width="14" height="14" fill="black" />
                            {/* Bottom Left Corner */}
                            <rect x="5" y="69" width="26" height="26" fill="black" />
                            <rect x="8" y="72" width="20" height="20" fill="white" />
                            <rect x="11" y="75" width="14" height="14" fill="black" />
                            {/* Matrix Data Blocks */}
                            <rect x="36" y="8" width="6" height="6" fill="black" />
                            <rect x="46" y="8" width="10" height="6" fill="black" />
                            <rect x="60" y="8" width="5" height="6" fill="black" />
                            <rect x="36" y="18" width="14" height="6" fill="black" />
                            <rect x="54" y="18" width="8" height="6" fill="black" />
                            <rect x="36" y="28" width="8" height="6" fill="black" />
                            <rect x="48" y="28" width="14" height="6" fill="black" />
                            {/* Center Logo */}
                            <rect x="40" y="40" width="20" height="20" rx="4" fill="#06b6d4" />
                            <circle cx="50" cy="50" r="5" fill="black" />
                            {/* Bottom Pattern */}
                            <rect x="36" y="65" width="16" height="6" fill="black" />
                            <rect x="56" y="65" width="8" height="6" fill="black" />
                            <rect x="68" y="65" width="14" height="6" fill="black" />
                            <rect x="36" y="76" width="8" height="16" fill="black" />
                            <rect x="48" y="76" width="18" height="8" fill="black" />
                            <rect x="70" y="76" width="8" height="16" fill="black" />
                            <rect x="82" y="76" width="10" height="8" fill="black" />
                            <rect x="50" y="88" width="14" height="6" fill="black" />
                            <rect x="82" y="88" width="10" height="6" fill="black" />
                          </svg>

                          {/* Animated Glowing Laser Scan Bar */}
                          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_rgba(6,182,212,1)] animate-bounce top-2 pointer-events-none" />
                        </div>

                        {/* Pairing Code & Expiry */}
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">Short Code:</span>
                          <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 font-mono font-bold text-xs text-cyan-300 tracking-wider">
                            {qrSession.linkCode || 'AE-9921'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(qrSession.linkCode || qrSession.token);
                              setQrCodeCopied(true);
                              setTimeout(() => setQrCodeCopied(false), 2000);
                            }}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                            title="Copy Code"
                          >
                            {qrCodeCopied ? 'Copied!' : 'Copy'}
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          <span>Waiting for scan from mobile app...</span>
                        </div>

                        {/* 1-Click Authorize Test Button */}
                        <div className="pt-1 w-full space-y-2">
                          <button
                            type="button"
                            onClick={handleSimulateQrScan}
                            disabled={isAuthorizingQr}
                            className="w-full py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow flex items-center justify-center gap-2"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>{isAuthorizingQr ? 'Verifying...' : 'Authorize Web Session (1-Click Test)'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={loadQrSession}
                            className="w-full py-1.5 text-[11px] text-slate-400 hover:text-slate-200 transition text-center"
                          >
                            Refresh QR Code
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-center space-y-2">
                        <p className="text-xs text-rose-400">Unable to generate QR code.</p>
                        <button
                          type="button"
                          onClick={loadQrSession}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-200"
                        >
                          Retry
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Manual Short Link Code Input Form */}
                  <form onSubmit={handleAuthorizeLinkCode} className="space-y-2 pt-1 border-t border-slate-800/80">
                    <label className="text-[11px] text-slate-400 font-medium block">
                      Pair with Code manually
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. AE-9921"
                        value={qrLinkInput}
                        onChange={(e) => setQrLinkInput(e.target.value.toUpperCase())}
                        className="flex-1 px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-100 uppercase font-mono outline-none focus:border-cyan-500"
                      />
                      <button
                        type="submit"
                        disabled={isAuthorizingQr || !qrLinkInput.trim()}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                      >
                        Pair
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* ============================================================== */}
              {/* 4. ADMIN PORTAL DIRECT LOGIN                                   */}
              {/* ============================================================== */}
              {authMode === 'admin' && isAdminPortal && (
                <div className="space-y-4">
                  <div className="p-3 bg-cyan-950/40 border border-cyan-800/40 rounded-xl text-[11px] text-cyan-300 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-semibold">Admin & Staff Portal</strong>
                      <span>Authorized operations login for platform administrators and moderation staff.</span>
                    </div>
                  </div>

                  <form onSubmit={handleAdminLogin} className="space-y-3 pt-1">
                    <div>
                      <label className="text-[11px] text-slate-400 font-medium block mb-1">Admin Username / Email</label>
                      <input
                        type="text"
                        value={adminIdentifier}
                        onChange={(e) => setAdminIdentifier(e.target.value)}
                        placeholder="admin@aether.internal"
                        className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-100 outline-none focus:border-cyan-500 font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 font-medium block mb-1">Password</label>
                      <input
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-100 outline-none focus:border-cyan-500"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-sm"
                    >
                      {isSubmitting ? 'Authenticating...' : 'Sign In as Administrator'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Photo Uploader Modal */}
      <PhotoUploaderModal
        isOpen={photoUploaderOpen}
        onClose={() => setPhotoUploaderOpen(false)}
        currentPhotoUrl={avatarUrl}
        onPhotoSelected={(url) => setAvatarUrl(url)}
        title="Choose Profile Picture"
      />
    </div>
  );
};
