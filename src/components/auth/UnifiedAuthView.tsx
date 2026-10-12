import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useAuth } from '../../context/AuthContext.js';
import { useBranding } from '../../context/BrandingContext.js';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  QrCode,
  RefreshCw,
  Copy,
  Check,
  Shield,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface UnifiedAuthViewProps {
  mode?: 'fullscreen' | 'modal';
  onClose?: () => void;
  defaultTab?: 'otp' | 'password' | 'signup' | 'qr';
}

export const UnifiedAuthView: React.FC<UnifiedAuthViewProps> = ({
  mode = 'fullscreen',
  onClose,
  defaultTab = 'otp',
}) => {
  const {
    login,
    requestEmailLoginOtp,
    verifyEmailLoginOtp,
    requestEmailSignupOtp,
    verifyEmailSignupOtp,
    generateQrSession,
    checkQrStatus,
  } = useAuth();
  const { branding } = useBranding();

  // Active form tab: 'otp' | 'password' | 'signup' | 'qr'
  const [activeTab, setActiveTab] = useState<'otp' | 'password' | 'signup' | 'qr'>(defaultTab);

  // Email OTP Login States
  const [otpStep, setOtpStep] = useState<1 | 2>(1);
  const [otpIdentifier, setOtpIdentifier] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(60);
  const [canResendOtp, setCanResendOtp] = useState(false);

  // Password Login States
  const [pwdIdentifier, setPwdIdentifier] = useState('');
  const [pwdValue, setPwdValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);

  // Signup States
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [signupDisplayName, setSignupDisplayName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupOtpDigits, setSignupOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [signupCountdown, setSignupCountdown] = useState(60);
  const [canResendSignupOtp, setCanResendSignupOtp] = useState(false);

  // QR Web Pairing States (WhatsApp Web Experience)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [qrSessionId, setQrSessionId] = useState<string>('');
  const [qrLinkCode, setQrLinkCode] = useState<string>('');
  const [qrRemainingSecs, setQrRemainingSecs] = useState<number>(120);
  const [qrIsExpired, setQrIsExpired] = useState<boolean>(false);
  const [qrIsLoading, setQrIsLoading] = useState<boolean>(true);
  const [qrCopied, setQrCopied] = useState<boolean>(false);
  const [qrAuthorizedSuccess, setQrAuthorizedSuccess] = useState<boolean>(false);

  // Feedback & Loading
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const pollTimerRef = useRef<any>(null);

  // Countdown timer for Email Login OTP
  useEffect(() => {
    let timer: any;
    if (otpStep === 2 && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => {
          if (prev <= 1) {
            setCanResendOtp(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpStep, otpCountdown]);

  // Countdown timer for Signup OTP
  useEffect(() => {
    let timer: any;
    if (signupStep === 2 && signupCountdown > 0) {
      timer = setInterval(() => {
        setSignupCountdown((prev) => {
          if (prev <= 1) {
            setCanResendSignupOtp(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [signupStep, signupCountdown]);

  // QR Session Initialization
  const initQrSession = async () => {
    setQrIsLoading(true);
    setQrIsExpired(false);
    setQrAuthorizedSuccess(false);
    try {
      const data = await generateQrSession();
      if (data && data.sessionId) {
        setQrSessionId(data.sessionId);
        setQrLinkCode(data.linkCode || data.sessionId.substring(0, 8).toUpperCase());
        const secondsRemaining = Math.max(10, Math.floor((data.expiresAt - Date.now()) / 1000));
        setQrRemainingSecs(secondsRemaining);

        const qrDataUrl = await QRCode.toDataURL(data.qrPayload, {
          width: 320,
          margin: 1,
          color: {
            dark: '#060913',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'M',
        });
        setQrCodeDataUrl(qrDataUrl);
      } else {
        setErrorMsg('Unable to initialize QR pairing session. Please use phone or email login.');
      }
    } catch (err: any) {
      setErrorMsg('Failed to generate pairing QR code.');
    } finally {
      setQrIsLoading(false);
    }
  };

  useEffect(() => {
    initQrSession();
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // QR Expiration countdown & status polling
  useEffect(() => {
    if (!qrSessionId || qrIsExpired || qrAuthorizedSuccess) return;

    const timer = setInterval(() => {
      setQrRemainingSecs((prev) => {
        if (prev <= 1) {
          setQrIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [qrSessionId, qrIsExpired, qrAuthorizedSuccess]);

  // Auto-poll QR Session status until paired
  useEffect(() => {
    if (!qrSessionId || qrIsExpired || qrAuthorizedSuccess) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    const pollStatus = async () => {
      try {
        const res = await checkQrStatus(qrSessionId);
        if (res.status === 'authorized') {
          setQrAuthorizedSuccess(true);
          setSuccessMsg('Device linked successfully! Launching your conversations...');
          clearInterval(pollTimerRef.current);
          setTimeout(() => {
            if (onClose) onClose();
            else window.location.href = '/';
          }, 800);
        } else if (res.status === 'expired') {
          setQrIsExpired(true);
          clearInterval(pollTimerRef.current);
        }
      } catch {
        // Continue polling
      }
    };

    pollTimerRef.current = setInterval(pollStatus, 1500);
    return () => clearInterval(pollTimerRef.current);
  }, [qrSessionId, qrIsExpired, qrAuthorizedSuccess]);

  const copyQrCode = () => {
    if (!qrLinkCode) return;
    navigator.clipboard.writeText(qrLinkCode);
    setQrCopied(true);
    setTimeout(() => setQrCopied(false), 2000);
  };

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------

  // 1. Email OTP Request
  const handleRequestLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpIdentifier.trim()) {
      setErrorMsg('Please enter your email or username');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await requestEmailLoginOtp(otpIdentifier.trim());
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to send email verification code.');
        return;
      }

      setMaskedEmail(res.maskedEmail || otpIdentifier.trim());
      setOtpStep(2);
      setOtpCountdown(60);
      setCanResendOtp(false);
      setOtpDigits(['', '', '', '', '', '']);
      setSuccessMsg(res.message || 'Passcode sent to your email.');
      setTimeout(() => {
        document.getElementById('email-otp-box-0')?.focus();
      }, 100);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Verify Email OTP
  const handleVerifyLoginOtp = async (overrideDigits?: string[]) => {
    const code = (overrideDigits || otpDigits).join('');
    if (code.length < 6) {
      setErrorMsg('Please enter the complete 6-digit passcode');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await verifyEmailLoginOtp(otpIdentifier.trim(), code);
      if (!res.success) {
        setErrorMsg(res.error || 'Invalid or expired passcode.');
        return;
      }

      setSuccessMsg('Signed in successfully!');
      setTimeout(() => {
        if (onClose) onClose();
        else window.location.href = '/';
      }, 600);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend Email OTP
  const handleResendLoginOtp = async () => {
    if (!canResendOtp || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await requestEmailLoginOtp(otpIdentifier.trim());
      if (res.success) {
        setOtpCountdown(60);
        setCanResendOtp(false);
        setSuccessMsg('New 6-digit passcode sent to your email.');
      } else {
        setErrorMsg(res.error || 'Failed to resend email code.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Password Login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdIdentifier.trim() || !pwdValue) {
      setErrorMsg('Please enter your identifier and password');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await login(pwdIdentifier.trim(), pwdValue);
      if (!res.success) {
        setErrorMsg(res.error || 'Invalid credentials.');
        return;
      }

      setSuccessMsg('Signed in successfully!');
      setTimeout(() => {
        if (onClose) onClose();
        else window.location.href = '/';
      }, 600);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. Signup Request OTP
  const handleRequestSignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupDisplayName.trim()) {
      setErrorMsg('Please enter your display name');
      return;
    }
    if (!signupUsername.trim()) {
      setErrorMsg('Please choose a username');
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address');
      return;
    }
    if (signupPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await requestEmailSignupOtp(signupEmail.trim(), signupDisplayName.trim());
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to send registration code.');
        return;
      }

      setSignupStep(2);
      setSignupCountdown(60);
      setCanResendSignupOtp(false);
      setSignupOtpDigits(['', '', '', '', '', '']);
      setSuccessMsg(res.message || 'Verification passcode sent to your email.');
      setTimeout(() => {
        document.getElementById('signup-otp-box-0')?.focus();
      }, 100);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 7. Verify Signup OTP & Create Account
  const handleVerifySignupOtp = async (overrideDigits?: string[]) => {
    const code = (overrideDigits || signupOtpDigits).join('');
    if (code.length < 6) {
      setErrorMsg('Please enter the complete 6-digit passcode');
      return;
    }

    const cleanUser = signupUsername.trim().replace(/^@/, '').toLowerCase();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await verifyEmailSignupOtp({
        email: signupEmail.trim(),
        code,
        username: cleanUser,
        displayName: signupDisplayName.trim(),
        password: signupPassword,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Verification code incorrect or expired.');
        return;
      }

      setSuccessMsg(`Account created & verified! Welcome, @${cleanUser}`);
      setTimeout(() => {
        if (onClose) onClose();
        else window.location.href = '/';
      }, 600);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend Signup OTP
  const handleResendSignupOtp = async () => {
    if (!canResendSignupOtp || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await requestEmailSignupOtp(signupEmail.trim(), signupDisplayName.trim());
      if (res.success) {
        setSignupCountdown(60);
        setCanResendSignupOtp(false);
        setSuccessMsg('New registration code sent to your email.');
      } else {
        setErrorMsg(res.error || 'Failed to resend code.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for Email OTP Digits
  const handleLoginOtpChange = (index: number, val: string) => {
    if (val.length > 1) val = val.slice(-1);
    if (val && !/^\d$/.test(val)) return;

    const updated = [...otpDigits];
    updated[index] = val;
    setOtpDigits(updated);

    if (val && index < 5) {
      document.getElementById(`email-otp-box-${index + 1}`)?.focus();
    }

    if (updated.every((d) => d !== '')) {
      handleVerifyLoginOtp(updated);
    }
  };

  const handleLoginOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      document.getElementById(`email-otp-box-${index - 1}`)?.focus();
    }
  };

  const handleLoginOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const updated = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      updated[i] = pasted[i] || '';
    }
    setOtpDigits(updated);

    const targetIdx = Math.min(pasted.length, 5);
    document.getElementById(`email-otp-box-${targetIdx}`)?.focus();

    if (pasted.length === 6) {
      setTimeout(() => handleVerifyLoginOtp(updated), 80);
    }
  };

  // Helper for Signup OTP Digits
  const handleSignupOtpChange = (index: number, val: string) => {
    if (val.length > 1) val = val.slice(-1);
    if (val && !/^\d$/.test(val)) return;

    const updated = [...signupOtpDigits];
    updated[index] = val;
    setSignupOtpDigits(updated);

    if (val && index < 5) {
      document.getElementById(`signup-otp-box-${index + 1}`)?.focus();
    }

    if (updated.every((d) => d !== '')) {
      handleVerifySignupOtp(updated);
    }
  };

  const handleSignupOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !signupOtpDigits[index] && index > 0) {
      document.getElementById(`signup-otp-box-${index - 1}`)?.focus();
    }
  };

  const handleSignupOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const updated = [...signupOtpDigits];
    for (let i = 0; i < 6; i++) {
      updated[i] = pasted[i] || '';
    }
    setSignupOtpDigits(updated);

    const targetIdx = Math.min(pasted.length, 5);
    document.getElementById(`signup-otp-box-${targetIdx}`)?.focus();

    if (pasted.length === 6) {
      setTimeout(() => handleVerifySignupOtp(updated), 80);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const isModal = mode === 'modal';

  return (
    <div
      className={
        isModal
          ? 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none overflow-y-auto'
          : 'min-h-screen w-full bg-[#060913] text-slate-100 flex flex-col select-none relative overflow-x-hidden font-sans'
      }
    >
      {/* Ambient Radial Atmosphere */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-cyan-500/10 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-10 w-[480px] h-[300px] bg-blue-600/10 blur-[120px] pointer-events-none rounded-full" />

      {/* Top Header (Fullscreen Mode) */}
      {!isModal && (
        <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 md:px-12 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center p-1.5 shadow-sm shadow-cyan-500/20">
              <img src={branding.appLogo} alt="" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 text-sm tracking-tight">{branding.appName}</span>
                <span className="text-[11px] text-cyan-400 font-mono font-medium">Web & Mobile</span>
              </div>
              <p className="text-[11px] text-slate-400">Next-Generation Real-Time Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-xs">
            <a
              href="/downloads/aether-android-project.zip"
              download="aether-android-project.zip"
              className="px-3 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 hover:text-cyan-200 border border-cyan-800/60 transition flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              title="Download Android Studio Project (.zip) configured for https://aether.xperiserv.in/"
            >
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
              <span>Android App (.zip)</span>
            </a>
          </div>
        </header>
      )}

      {/* Main Container Card (WhatsApp Web Inspired Split Card) */}
      <div
        className={
          isModal
            ? 'relative w-full max-w-4xl bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col'
            : 'flex-1 flex items-center justify-center p-4 md:p-8 z-10'
        }
      >
        <div
          className={
            isModal
              ? 'grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto'
              : 'w-full max-w-5xl bg-[#0b1120]/90 border border-slate-800 rounded-3xl shadow-[0_20px_60px_-15px_rgba(6,182,212,0.12)] backdrop-blur-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]'
          }
        >
          {/* =================================================================== */}
          {/* LEFT COLUMN: INTERACTIVE AUTHENTICATION FORM                        */}
          {/* =================================================================== */}
          <div className="lg:col-span-7 p-6 sm:p-8 md:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800/80 relative">
            {/* Modal Close Button */}
            {isModal && onClose && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition z-20 cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <div className="space-y-6">
              {/* Header Title Lockup */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm">
                    <img src={branding.appLogo} alt="" className="w-5 h-5 object-contain" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
                      {activeTab === 'signup'
                        ? 'Create Your Account'
                        : activeTab === 'password'
                        ? 'Password Sign In'
                        : activeTab === 'qr'
                        ? 'Link with QR Code'
                        : 'Sign In with Email'}
                    </h1>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {activeTab === 'signup'
                    ? 'Register your identity with real-time end-to-end encrypted messaging.'
                    : activeTab === 'password'
                    ? 'Sign in using your account username and password.'
                    : activeTab === 'qr'
                    ? 'Point your camera to link your account instantly.'
                    : 'Enter your registered email address to receive a 6-digit passcode.'}
                </p>
              </div>

              {/* Segmented Auth Navigation Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-950/90 border border-slate-800 rounded-xl overflow-x-auto text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('otp');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg font-medium transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
                    activeTab === 'otp'
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Email Code</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('password');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg font-medium transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
                    activeTab === 'password'
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Password</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('signup');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg font-medium transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
                    activeTab === 'signup'
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Sign Up</span>
                </button>

                {/* Mobile-only QR view switcher */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('qr');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`lg:hidden flex-1 py-1.5 px-2.5 rounded-lg font-medium transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
                    activeTab === 'qr'
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                  <span>QR Pair</span>
                </button>
              </div>

              {/* Alert Feedback Messages */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/70 text-rose-300 text-xs flex items-start gap-2 shadow-sm animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/70 text-emerald-300 text-xs flex items-start gap-2 shadow-sm animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* ----------------------------------------------------------- */}
              {/* TAB 1: EMAIL OTP AUTHENTICATION                             */}
              {/* ----------------------------------------------------------- */}
              {activeTab === 'otp' && (
                <div>
                  {otpStep === 1 ? (
                    <form onSubmit={handleRequestLoginOtp} className="space-y-4">
                      <div>
                        <label className="block text-slate-300 text-xs font-medium mb-1.5">
                          Email Address or Username
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                          <input
                            type="text"
                            value={otpIdentifier}
                            onChange={(e) => setOtpIdentifier(e.target.value)}
                            placeholder="name@example.com or @handle"
                            className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition font-medium"
                            autoFocus
                            required
                          />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1.5">
                          A 6-digit one-time passcode will be sent to your email.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="remember-email"
                          checked={rememberDevice}
                          onChange={(e) => setRememberDevice(e.target.checked)}
                          className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-cyan-500/20 cursor-pointer accent-cyan-500"
                        />
                        <label htmlFor="remember-email" className="text-xs text-slate-400 cursor-pointer select-none">
                          Stay logged in on this browser
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Sending Code...</span>
                          </>
                        ) : (
                          <>
                            <span>Send Passcode</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    /* Step 2: 6-Box OTP Entry */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-300 font-medium block">
                            Enter the 6-digit passcode sent to:
                          </span>
                          <span className="text-xs font-mono text-cyan-300 font-semibold">{maskedEmail}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setOtpStep(1);
                            setErrorMsg(null);
                          }}
                          className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <ArrowLeft className="w-3 h-3" />
                          <span>Change</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                        {otpDigits.map((digit, idx) => (
                          <input
                            key={idx}
                            id={`email-otp-box-${idx}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleLoginOtpChange(idx, e.target.value)}
                            onKeyDown={(e) => handleLoginOtpKeyDown(idx, e)}
                            onPaste={idx === 0 ? handleLoginOtpPaste : undefined}
                            className={`w-11 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-mono font-bold rounded-xl border bg-slate-950 transition focus:outline-none ${
                              digit
                                ? 'border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-500/20'
                                : 'border-slate-800 text-slate-100 focus:border-cyan-500'
                            }`}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleVerifyLoginOtp()}
                        disabled={isSubmitting || otpDigits.join('').length < 6}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Verify Passcode</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                        <span>Didn&apos;t receive email?</span>
                        {canResendOtp ? (
                          <button
                            type="button"
                            onClick={handleResendLoginOtp}
                            disabled={isSubmitting}
                            className="text-cyan-400 hover:underline font-semibold cursor-pointer"
                          >
                            Resend Code
                          </button>
                        ) : (
                          <span className="font-mono text-slate-500">Resend in {otpCountdown}s</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ----------------------------------------------------------- */}
              {/* TAB 3: PASSWORD LOGIN                                       */}
              {/* ----------------------------------------------------------- */}
              {activeTab === 'password' && (
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <div>
                    <label className="block text-slate-300 text-xs font-medium mb-1.5">
                      Username or Email
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={pwdIdentifier}
                        onChange={(e) => setPwdIdentifier(e.target.value)}
                        placeholder="Username or email address"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-cyan-500 transition font-medium"
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-slate-300 text-xs font-medium">Password</label>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('otp');
                          setErrorMsg(null);
                        }}
                        className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={pwdValue}
                        onChange={(e) => setPwdValue(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-cyan-500 transition font-medium"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="remember-pwd"
                      checked={rememberDevice}
                      onChange={(e) => setRememberDevice(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-cyan-500/20 cursor-pointer accent-cyan-500"
                    />
                    <label htmlFor="remember-pwd" className="text-xs text-slate-400 cursor-pointer select-none">
                      Stay logged in on this browser
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Signing In...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* ----------------------------------------------------------- */}
              {/* TAB 4: CREATE ACCOUNT (REGISTRATION)                        */}
              {/* ----------------------------------------------------------- */}
              {activeTab === 'signup' && (
                <div>
                  {signupStep === 1 ? (
                    <form onSubmit={handleRequestSignupOtp} className="space-y-3">
                      <div>
                        <label className="block text-slate-300 text-xs font-medium mb-1">Full Display Name</label>
                        <input
                          type="text"
                          value={signupDisplayName}
                          onChange={(e) => setSignupDisplayName(e.target.value)}
                          placeholder="e.g. Alex Rivera"
                          className="w-full px-3 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-cyan-500 transition font-medium"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-300 text-xs font-medium mb-1">Username</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-cyan-400 font-mono text-xs">@</span>
                            <input
                              type="text"
                              value={signupUsername}
                              onChange={(e) => setSignupUsername(e.target.value)}
                              placeholder="username"
                              className="w-full pl-7 pr-3 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-cyan-500 transition font-medium font-mono"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-300 text-xs font-medium mb-1">Email Address</label>
                          <input
                            type="email"
                            value={signupEmail}
                            onChange={(e) => setSignupEmail(e.target.value)}
                            placeholder="name@example.com"
                            className="w-full px-3 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-cyan-500 transition font-medium"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-300 text-xs font-medium mb-1">Create Password</label>
                        <div className="relative">
                          <input
                            type={showSignupPassword ? 'text' : 'password'}
                            value={signupPassword}
                            onChange={(e) => setSignupPassword(e.target.value)}
                            placeholder="At least 6 characters"
                            className="w-full pl-3 pr-10 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-cyan-500 transition font-medium"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowSignupPassword(!showSignupPassword)}
                            className="absolute right-3 top-2 text-slate-400 hover:text-slate-200 cursor-pointer"
                          >
                            {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-400">
                        By continuing, you accept the Platform Terms of Service and End-to-End Privacy Policy.
                      </p>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Sending Verification...</span>
                          </>
                        ) : (
                          <>
                            <span>Create Account</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    /* Signup Step 2: 6-Box OTP */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-300 font-medium block">Enter confirmation code sent to:</span>
                          <span className="text-xs font-mono text-cyan-300 font-semibold">{signupEmail}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSignupStep(1);
                            setErrorMsg(null);
                          }}
                          className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <ArrowLeft className="w-3 h-3" />
                          <span>Edit Info</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                        {signupOtpDigits.map((digit, idx) => (
                          <input
                            key={idx}
                            id={`signup-otp-box-${idx}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleSignupOtpChange(idx, e.target.value)}
                            onKeyDown={(e) => handleSignupOtpKeyDown(idx, e)}
                            onPaste={idx === 0 ? handleSignupOtpPaste : undefined}
                            className={`w-11 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-mono font-bold rounded-xl border bg-slate-950 transition focus:outline-none ${
                              digit
                                ? 'border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-500/20'
                                : 'border-slate-800 text-slate-100 focus:border-cyan-500'
                            }`}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleVerifySignupOtp()}
                        disabled={isSubmitting || signupOtpDigits.join('').length < 6}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Confirming Account...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Verify &amp; Enter Platform</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                        <span>Didn&apos;t receive email?</span>
                        {canResendSignupOtp ? (
                          <button
                            type="button"
                            onClick={handleResendSignupOtp}
                            disabled={isSubmitting}
                            className="text-cyan-400 hover:underline font-semibold cursor-pointer"
                          >
                            Resend Code
                          </button>
                        ) : (
                          <span className="font-mono text-slate-500">Resend in {signupCountdown}s</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ----------------------------------------------------------- */}
              {/* TAB 5: MOBILE-ONLY QR VIEW                                  */}
              {/* ----------------------------------------------------------- */}
              {activeTab === 'qr' && (
                <div className="lg:hidden flex flex-col items-center justify-center space-y-4 py-2">
                  <div className="p-3 bg-white rounded-2xl shadow-xl w-56 h-56 flex items-center justify-center relative overflow-hidden">
                    {qrIsLoading ? (
                      <RefreshCw className="w-6 h-6 animate-spin text-cyan-600" />
                    ) : (
                      <img src={qrCodeDataUrl} alt="QR Code" className="w-full h-full object-contain select-none" />
                    )}
                  </div>
                  <div className="text-center space-y-1">
                    <span className="text-xs text-slate-300 font-semibold block">Pair Code: {qrLinkCode}</span>
                    <p className="text-[11px] text-slate-400">Open Aether on phone &gt; Settings &gt; Linked Devices</p>
                  </div>
                  {qrIsExpired && (
                    <button
                      type="button"
                      onClick={initQrSession}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Refresh Code</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Security Trust Badge */}
            <div className="pt-6 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>AES-256-GCM End-to-End Encrypted</span>
              </div>
              <span className="text-slate-500 font-mono text-[10px]">v3.4.0</span>
            </div>
          </div>

          {/* =================================================================== */}
          {/* RIGHT COLUMN: WHATSAPP WEB STYLE QR CODE & PAIRING STATION         */}
          {/* =================================================================== */}
          <div className="hidden lg:flex lg:col-span-5 p-8 md:p-10 flex-col items-center justify-between bg-slate-950/70 relative">
            {/* Top QR Station Header */}
            <div className="w-full flex items-center justify-between text-xs pb-2">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-cyan-400" />
                <span>Link with QR Code</span>
              </span>
              <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded-full">
                {qrIsExpired ? 'Code Expired' : `${qrRemainingSecs}s active`}
              </span>
            </div>

            {/* WhatsApp Web Style Elevated QR Canvas Card */}
            <div className="relative group my-auto">
              {/* Cyan Subtle Cyber Ring */}
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-cyan-500 to-blue-600 opacity-20 blur-md group-hover:opacity-35 transition" />

              {/* White High-Contrast QR Code Surface */}
              <div className="relative p-4 bg-white rounded-3xl shadow-2xl w-64 h-64 flex items-center justify-center overflow-hidden">
                {qrIsLoading ? (
                  <div className="flex flex-col items-center justify-center space-y-2 text-slate-700">
                    <RefreshCw className="w-8 h-8 animate-spin text-cyan-600" />
                    <span className="text-xs font-semibold">Generating QR...</span>
                  </div>
                ) : qrAuthorizedSuccess ? (
                  <div className="flex flex-col items-center justify-center space-y-2 text-emerald-600 animate-in zoom-in-95">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Check className="w-8 h-8 text-emerald-600 stroke-[3]" />
                    </div>
                    <span className="text-sm font-bold">Device Linked!</span>
                    <span className="text-[11px] text-slate-600">Syncing chat data...</span>
                  </div>
                ) : qrIsExpired ? (
                  <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center space-y-3 z-30">
                    <span className="text-xs font-bold text-rose-300">QR Code Expired</span>
                    <p className="text-[11px] text-slate-400">Click below to generate a fresh pairing session</p>
                    <button
                      type="button"
                      onClick={initQrSession}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Refresh QR Code</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <img
                      src={qrCodeDataUrl}
                      alt="WhatsApp Style Web Login QR"
                      className="w-full h-full object-contain select-none"
                    />
                    {/* Animated laser scan beam */}
                    <div className="absolute inset-x-2 h-0.5 bg-cyan-400 shadow-[0_0_10px_#06b6d4] z-20 animate-bounce pointer-events-none top-6" />
                  </>
                )}
              </div>
            </div>

            {/* Step-by-Step Instructions (Exact WhatsApp Web UX) */}
            <div className="w-full space-y-3 pt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px] font-medium">To link your device:</span>
                <button
                  type="button"
                  onClick={copyQrCode}
                  className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 font-mono cursor-pointer"
                  title="Copy Link Code"
                >
                  {qrCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{qrCopied ? 'Copied code' : `Code: ${qrLinkCode}`}</span>
                </button>
              </div>

              <ol className="space-y-2 text-[11px] text-slate-300">
                <li className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/80 flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                  <span>Open {branding.appName} on your phone</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/80 flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                  <span>Go to <strong>Settings</strong> &gt; <strong>Linked Devices</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/80 flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                  <span>Point camera at this screen to capture QR</span>
                </li>
              </ol>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('otp');
                    setErrorMsg(null);
                  }}
                  className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
                >
                  Sign in with email instead &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
