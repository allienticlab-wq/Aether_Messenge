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
  Laptop,
  AlertCircle,
  CheckCircle2,
  X,
  Sparkles,
  KeyRound,
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
    authorizeQrSession,
  } = useAuth();
  const { branding, theme, setTheme } = useBranding();

  // Active form tab: 'otp' | 'password' | 'signup' | 'qr'
  const [activeTab, setActiveTab] = useState<'otp' | 'password' | 'signup' | 'qr'>(defaultTab);

  // Email OTP Login States
  const [otpStep, setOtpStep] = useState<1 | 2>(1);
  const [otpIdentifier, setOtpIdentifier] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [previewOtp, setPreviewOtp] = useState('');
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
  const [signupPreviewOtp, setSignupPreviewOtp] = useState('');
  const [signupCountdown, setSignupCountdown] = useState(60);
  const [canResendSignupOtp, setCanResendSignupOtp] = useState(false);

  // QR Web Pairing States
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [qrSessionId, setQrSessionId] = useState<string>('');
  const [qrLinkCode, setQrLinkCode] = useState<string>('AE-8492');
  const [qrExpiresAt, setQrExpiresAt] = useState<number>(0);
  const [qrRemainingSecs, setQrRemainingSecs] = useState<number>(120);
  const [qrIsExpired, setQrIsExpired] = useState<boolean>(false);
  const [qrIsLoading, setQrIsLoading] = useState<boolean>(true);
  const [qrCopied, setQrCopied] = useState<boolean>(false);
  const [qrAuthorizedSuccess, setQrAuthorizedSuccess] = useState<boolean>(false);
  const [isSimulatingScan, setIsSimulatingScan] = useState<boolean>(false);

  // General feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const pollTimerRef = useRef<any>(null);

  // Countdown timer for Login OTP
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

  // ---------------------------------------------------------------------------
  // QR Code Initialization & Polling
  // ---------------------------------------------------------------------------
  const initQrSession = async () => {
    setQrIsLoading(true);
    setQrIsExpired(false);
    setQrAuthorizedSuccess(false);

    try {
      const data = await generateQrSession();
      if (data) {
        setQrSessionId(data.sessionId);
        setQrLinkCode(data.linkCode || 'AE-8492');
        setQrExpiresAt(data.expiresAt || Date.now() + 120000);
        setQrRemainingSecs(120);

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
      console.error('Failed to generate QR session:', err);
    } finally {
      setQrIsLoading(false);
    }
  };

  useEffect(() => {
    initQrSession();
    return () => {
      clearInterval(pollTimerRef.current);
    };
  }, []);

  // QR expiration countdown
  useEffect(() => {
    if (!qrExpiresAt) return;
    const timer = setInterval(() => {
      const diff = Math.max(0, Math.round((qrExpiresAt - Date.now()) / 1000));
      setQrRemainingSecs(diff);
      if (diff <= 0) {
        setQrIsExpired(true);
        clearInterval(timer);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [qrExpiresAt]);

  // Polling for QR status
  useEffect(() => {
    if (!qrSessionId || qrIsExpired || qrAuthorizedSuccess) return;

    const pollStatus = async () => {
      try {
        const res = await checkQrStatus(qrSessionId);
        if (res.status === 'authorized' && res.user && res.session) {
          setQrAuthorizedSuccess(true);
          setSuccessMsg(`Device linked! Welcome, ${res.user.displayName}`);
          setTimeout(() => {
            if (onClose) onClose();
            else window.location.href = '/';
          }, 700);
        } else if (res.status === 'expired') {
          setQrIsExpired(true);
        }
      } catch {
        // Continue polling
      }
    };

    pollTimerRef.current = setInterval(pollStatus, 1600);
    return () => clearInterval(pollTimerRef.current);
  }, [qrSessionId, qrIsExpired, qrAuthorizedSuccess]);

  const copyQrCode = () => {
    if (!qrLinkCode) return;
    navigator.clipboard.writeText(qrLinkCode);
    setQrCopied(true);
    setTimeout(() => setQrCopied(false), 2000);
  };

  const handleSimulateMobileScan = async () => {
    if (!qrSessionId) return;
    setIsSimulatingScan(true);
    setErrorMsg(null);
    try {
      const res = await authorizeQrSession(qrSessionId, 'demo_token');
      if (res.success) {
        setQrAuthorizedSuccess(true);
        setSuccessMsg('QR Code verified! Web Client is now authorized.');
        setTimeout(() => {
          if (onClose) onClose();
          else window.location.href = '/';
        }, 700);
      } else {
        setErrorMsg(res.error || 'Failed to simulate scan.');
      }
    } catch {
      setErrorMsg('Network error authorizing QR code.');
    } finally {
      setIsSimulatingScan(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------

  // 1. Send Login OTP via Mailgun
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
        setErrorMsg(res.error || 'Failed to dispatch login OTP code.');
        return;
      }

      setMaskedEmail(res.maskedEmail || otpIdentifier.trim());
      if (res.previewOtp) setPreviewOtp(res.previewOtp);
      setOtpStep(2);
      setOtpCountdown(60);
      setCanResendOtp(false);
      setOtpDigits(['', '', '', '', '', '']);
      setSuccessMsg(res.message || 'Verification passcode sent via Mailgun SMTP.');
      setTimeout(() => {
        document.getElementById('login-otp-box-0')?.focus();
      }, 100);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Verify Login OTP
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

      setSuccessMsg('Signed in successfully via Mailgun SMTP!');
      setTimeout(() => {
        if (onClose) onClose();
        else window.location.href = '/';
      }, 600);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend Login OTP
  const handleResendLoginOtp = async () => {
    if (!canResendOtp || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await requestEmailLoginOtp(otpIdentifier.trim());
      if (res.success) {
        setOtpCountdown(60);
        setCanResendOtp(false);
        if (res.previewOtp) setPreviewOtp(res.previewOtp);
        setSuccessMsg('New 6-digit passcode sent via Mailgun SMTP.');
      } else {
        setErrorMsg(res.error || 'Failed to resend code.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Password Login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdIdentifier.trim() || !pwdValue) {
      setErrorMsg('Please enter both your identifier and password');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await login(pwdIdentifier.trim(), pwdValue);
      if (!res.success) {
        setErrorMsg(res.error || 'Invalid username or password.');
        return;
      }

      setSuccessMsg('Authenticated successfully!');
      setTimeout(() => {
        if (onClose) onClose();
        else window.location.href = '/';
      }, 600);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Request Signup OTP via Mailgun
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
        setErrorMsg(res.error || 'Failed to dispatch registration OTP.');
        return;
      }

      if (res.previewOtp) setSignupPreviewOtp(res.previewOtp);
      setSignupStep(2);
      setSignupCountdown(60);
      setCanResendSignupOtp(false);
      setSignupOtpDigits(['', '', '', '', '', '']);
      setSuccessMsg(res.message || 'Verification passcode sent to your email via Mailgun SMTP.');
      setTimeout(() => {
        document.getElementById('signup-otp-box-0')?.focus();
      }, 100);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Verify Signup OTP & Create Account
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
        if (res.previewOtp) setSignupPreviewOtp(res.previewOtp);
        setSuccessMsg('New registration code sent via Mailgun SMTP.');
      } else {
        setErrorMsg(res.error || 'Failed to resend code.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Digit Input Handlers (WhatsApp 6-box input)
  // ---------------------------------------------------------------------------
  const handleLoginOtpChange = (index: number, val: string) => {
    const char = val.replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = char;
    setOtpDigits(updated);

    if (char && index < 5) {
      document.getElementById(`login-otp-box-${index + 1}`)?.focus();
    }

    if (updated.every((d) => d !== '') && index === 5) {
      setTimeout(() => handleVerifyLoginOtp(updated), 80);
    }
  };

  const handleLoginOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      document.getElementById(`login-otp-box-${index - 1}`)?.focus();
    }
  };

  const handleLoginOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const updated = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      updated[i] = pasted[i] || '';
    }
    setOtpDigits(updated);

    const targetIdx = Math.min(pasted.length, 5);
    document.getElementById(`login-otp-box-${targetIdx}`)?.focus();

    if (pasted.length === 6) {
      setTimeout(() => handleVerifyLoginOtp(updated), 80);
    }
  };

  const handleSignupOtpChange = (index: number, val: string) => {
    const char = val.replace(/\D/g, '').slice(-1);
    const updated = [...signupOtpDigits];
    updated[index] = char;
    setSignupOtpDigits(updated);

    if (char && index < 5) {
      document.getElementById(`signup-otp-box-${index + 1}`)?.focus();
    }

    if (updated.every((d) => d !== '') && index === 5) {
      setTimeout(() => handleVerifySignupOtp(updated), 80);
    }
  };

  const handleSignupOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !signupOtpDigits[index] && index > 0) {
      document.getElementById(`signup-otp-box-${index - 1}`)?.focus();
    }
  };

  const handleSignupOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
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

  // Demo Filler for testing
  const fillAdminDemo = () => {
    setActiveTab('password');
    setPwdIdentifier('admin');
    setPwdValue('adminpassword123');
    setErrorMsg(null);
    setSuccessMsg('Filled System Admin credentials (admin / adminpassword123)');
  };

  const fillAdminEmailOtp = () => {
    setActiveTab('otp');
    setOtpIdentifier('swayamsiddhantn@gmail.com');
    setOtpStep(1);
    setErrorMsg(null);
    setSuccessMsg('Filled registered email swayamsiddhantn@gmail.com');
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
      {/* Atmosphere Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-cyan-500/10 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-10 w-[480px] h-[300px] bg-blue-600/10 blur-[120px] pointer-events-none rounded-full" />

      {/* Top Header (Fullscreen Mode) */}
      {!isModal && (
        <header className="h-16 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-6 md:px-12 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center p-1.5 shadow-sm shadow-cyan-500/20">
              <img src={branding.appLogo} alt="" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 text-sm tracking-tight">{branding.appName}</span>
                <span className="text-[11px] text-cyan-400 font-mono">Web Portal</span>
              </div>
              <p className="text-[11px] text-slate-400">Mailgun SMTP Secured · Real-Time Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <a
              href="/admin"
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 transition flex items-center gap-1.5 text-xs"
              title="Open System Admin Operations"
            >
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>Admin Portal</span>
            </a>
          </div>
        </header>
      )}

      {/* Main Container Card */}
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
              : 'w-full max-w-5xl bg-slate-900/80 border border-slate-800/90 rounded-3xl shadow-2xl backdrop-blur-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[560px]'
          }
        >
          {/* =================================================================== */}
          {/* LEFT COLUMN: AUTHENTICATION ENGINE (Email OTP, Password, Signup)   */}
          {/* =================================================================== */}
          <div className="lg:col-span-7 p-6 sm:p-8 md:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800/80 relative">
            {/* Modal Close Button if in modal mode */}
            {isModal && onClose && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition z-20"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <div className="space-y-6">
              {/* Header Title Lockup */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <img src={branding.appLogo} alt="" className="w-4 h-4 object-contain" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
                    {activeTab === 'signup'
                      ? 'Create Aether Account'
                      : activeTab === 'password'
                      ? 'Password Sign In'
                      : activeTab === 'qr'
                      ? 'Scan QR to Sign In'
                      : 'Sign in to Aether'}
                  </h1>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {activeTab === 'signup'
                    ? 'Register your account with immediate Mailgun SMTP verification.'
                    : activeTab === 'password'
                    ? 'Sign in using your account password or admin credentials.'
                    : activeTab === 'qr'
                    ? 'Point your phone camera to pair your account instantly.'
                    : 'Passwordless sign in with a 6-digit one-time code sent to your email.'}
                </p>
              </div>

              {/* Mode Switcher Tabs (WhatsApp Segmented Style) */}
              <div className="flex items-center gap-1 p-1 bg-slate-950/80 border border-slate-800 rounded-xl overflow-x-auto text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('otp');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg font-medium transition flex items-center justify-center gap-1.5 shrink-0 ${
                    activeTab === 'otp'
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Email OTP</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('password');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg font-medium transition flex items-center justify-center gap-1.5 shrink-0 ${
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
                  className={`flex-1 py-1.5 px-2.5 rounded-lg font-medium transition flex items-center justify-center gap-1.5 shrink-0 ${
                    activeTab === 'signup'
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>New Account</span>
                </button>

                {/* QR Tab is also accessible on mobile / smaller viewports */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('qr');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`lg:hidden flex-1 py-1.5 px-2.5 rounded-lg font-medium transition flex items-center justify-center gap-1.5 shrink-0 ${
                    activeTab === 'qr'
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                  <span>QR Scan</span>
                </button>
              </div>

              {/* Feedback Toasts */}
              {errorMsg && (
                <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-950/50 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* ----------------------------------------------------------- */}
              {/* TAB 1: EMAIL OTP (MAILGUN SMTP)                             */}
              {/* ----------------------------------------------------------- */}
              {activeTab === 'otp' && (
                <div>
                  {otpStep === 1 ? (
                    <form onSubmit={handleRequestLoginOtp} className="space-y-4">
                      <div>
                        <label className="block text-slate-300 text-xs font-medium mb-1.5">
                          Registered Email Address or Username
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
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
                        <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                          <span>A 6-digit one-time passcode will be sent via Mailgun SMTP.</span>
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Sending Code via Mailgun...</span>
                          </>
                        ) : (
                          <>
                            <span>Send 6-Digit Passcode</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>

                      {/* Quick demo helper for tester */}
                      <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Test Admin Account?</span>
                        <button
                          type="button"
                          onClick={fillAdminEmailOtp}
                          className="text-cyan-400 hover:underline font-mono"
                        >
                          Auto-fill swayamsiddhantn@gmail.com
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* Step 2: 6-Box WhatsApp Style OTP Entry */
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
                          className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          <ArrowLeft className="w-3 h-3" />
                          <span>Change</span>
                        </button>
                      </div>

                      {/* 6 Digit Input Boxes */}
                      <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                        {otpDigits.map((digit, idx) => (
                          <input
                            key={idx}
                            id={`login-otp-box-${idx}`}
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

                      {previewOtp && (
                        <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/50 flex items-center justify-between text-xs text-cyan-300">
                          <span>Live Mailgun Sandbox Code:</span>
                          <span className="font-mono font-bold tracking-widest text-white bg-cyan-900/60 px-2 py-0.5 rounded">
                            {previewOtp}
                          </span>
                        </div>
                      )}

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
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>Verify Code & Continue</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-400 text-[11px]">Didn&apos;t receive code?</span>
                        {canResendOtp ? (
                          <button
                            type="button"
                            onClick={handleResendLoginOtp}
                            disabled={isSubmitting}
                            className="text-cyan-400 hover:text-cyan-300 font-semibold text-[11px]"
                          >
                            Resend Code via Mailgun
                          </button>
                        ) : (
                          <span className="text-slate-500 font-mono text-[11px]">
                            Resend in {otpCountdown}s
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ----------------------------------------------------------- */}
              {/* TAB 2: PASSWORD LOGIN                                       */}
              {/* ----------------------------------------------------------- */}
              {activeTab === 'password' && (
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <div>
                    <label className="block text-slate-300 text-xs font-medium mb-1.5">
                      Username or Registered Email
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={pwdIdentifier}
                        onChange={(e) => setPwdIdentifier(e.target.value)}
                        placeholder="admin or user@domain.com"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition font-medium"
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
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showPassword ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={pwdValue}
                        onChange={(e) => setPwdValue(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberDevice}
                        onChange={(e) => setRememberDevice(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0"
                      />
                      <span className="text-[11px]">Stay signed in on this device</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setActiveTab('otp')}
                      className="text-[11px] text-cyan-400 hover:underline"
                    >
                      Use Email OTP instead
                    </button>
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

                  {/* 1-Click Demo Testing Button */}
                  <div className="pt-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Quick Testing Account:</span>
                    <button
                      type="button"
                      onClick={fillAdminDemo}
                      className="text-cyan-400 hover:underline font-semibold flex items-center gap-1"
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>Fill Admin (admin / adminpassword123)</span>
                    </button>
                  </div>
                </form>
              )}

              {/* ----------------------------------------------------------- */}
              {/* TAB 3: CREATE ACCOUNT (REGISTRATION WITH MAILGUN OTP)       */}
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
                          className="w-full px-3 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-cyan-500 transition"
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
                              onChange={(e) => setSignupUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                              placeholder="alexrivera"
                              className="w-full pl-7 pr-3 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-slate-100 text-xs font-mono focus:outline-none focus:border-cyan-500 transition"
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
                            placeholder="alex@domain.com"
                            className="w-full px-3 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-cyan-500 transition"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-slate-300 text-xs font-medium">Create Password</label>
                          <button
                            type="button"
                            onClick={() => setShowSignupPassword(!showSignupPassword)}
                            className="text-[10px] text-cyan-400 hover:underline"
                          >
                            {showSignupPassword ? 'Hide' : 'Show'}
                          </button>
                        </div>
                        <input
                          type={showSignupPassword ? 'text' : 'password'}
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          placeholder="Minimum 6 characters"
                          className="w-full px-3 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-slate-100 text-xs font-mono focus:outline-none focus:border-cyan-500 transition"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Sending Email OTP...</span>
                          </>
                        ) : (
                          <>
                            <span>Verify Email via Mailgun</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    /* Step 2: Signup OTP Verification */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-300 font-medium block">
                            Verify your registration email:
                          </span>
                          <span className="text-xs font-mono text-cyan-300 font-semibold">{signupEmail}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSignupStep(1)}
                          className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          <ArrowLeft className="w-3 h-3" />
                          <span>Edit</span>
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

                      {signupPreviewOtp && (
                        <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/50 flex items-center justify-between text-xs text-cyan-300">
                          <span>Sandbox Email OTP:</span>
                          <span className="font-mono font-bold tracking-widest text-white bg-cyan-900/60 px-2 py-0.5 rounded">
                            {signupPreviewOtp}
                          </span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleVerifySignupOtp()}
                        disabled={isSubmitting || signupOtpDigits.join('').length < 6}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Creating Account...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>Confirm & Activate Account</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-400 text-[11px]">Didn&apos;t receive code?</span>
                        {canResendSignupOtp ? (
                          <button
                            type="button"
                            onClick={handleResendSignupOtp}
                            disabled={isSubmitting}
                            className="text-cyan-400 hover:text-cyan-300 font-semibold text-[11px]"
                          >
                            Resend Code via Mailgun
                          </button>
                        ) : (
                          <span className="text-slate-500 font-mono text-[11px]">
                            Resend in {signupCountdown}s
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ----------------------------------------------------------- */}
              {/* TAB 4: QR PAIR (Rendered on mobile viewport)                 */}
              {/* ----------------------------------------------------------- */}
              {activeTab === 'qr' && (
                <div className="lg:hidden flex flex-col items-center justify-center space-y-4 py-2">
                  <div className="p-3 bg-white rounded-2xl shadow-xl w-56 h-56 flex items-center justify-center relative overflow-hidden">
                    {qrIsLoading ? (
                      <RefreshCw className="w-6 h-6 animate-spin text-cyan-600" />
                    ) : (
                      <img src={qrCodeDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                    )}
                  </div>
                  <div className="text-center space-y-1">
                    <span className="text-xs text-slate-300 font-semibold block">Pair Code: {qrLinkCode}</span>
                    <p className="text-[11px] text-slate-400">Open Aether on phone &gt; Settings &gt; Linked Devices</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSimulateMobileScan}
                    disabled={isSimulatingScan}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
                  >
                    Simulate Mobile Scan (Demo)
                  </button>
                </div>
              )}
            </div>

            {/* Security Trust Note at Bottom */}
            <div className="pt-6 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>TLS 1.3 · Mailgun SMTP Verified</span>
              </div>
              <span className="text-slate-400 font-mono text-[10px]">v3.4.0</span>
            </div>
          </div>

          {/* =================================================================== */}
          {/* RIGHT COLUMN: WHATSAPP WEB STYLE QR CODE & PAIRING INSTRUCTIONS   */}
          {/* =================================================================== */}
          <div className="hidden lg:flex lg:col-span-5 p-8 md:p-10 flex-col items-center justify-between bg-slate-950/60 relative">
            {/* Top Badge */}
            <div className="w-full flex items-center justify-between text-xs pb-2">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-cyan-400" />
                <span>Instant QR Web Pair</span>
              </span>
              <span className="text-[10px] text-cyan-400 font-mono">
                {qrIsExpired ? 'Expired' : `${qrRemainingSecs}s active`}
              </span>
            </div>

            {/* QR Card with Cyan Cyber Glow */}
            <div className="relative group my-auto">
              {/* Cyan Pulse Accent Ring */}
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-cyan-500 to-blue-600 opacity-20 blur-md group-hover:opacity-40 transition" />

              {/* White QR Code Canvas Wrapper */}
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
                    <span className="text-sm font-bold">Authorized!</span>
                    <span className="text-[11px] text-slate-600">Syncing chat data...</span>
                  </div>
                ) : qrIsExpired ? (
                  <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center space-y-3 z-30">
                    <span className="text-xs font-bold text-rose-300">Code Expired</span>
                    <p className="text-[11px] text-slate-400">Click below to refresh pairing session</p>
                    <button
                      type="button"
                      onClick={initQrSession}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Refresh Code</span>
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

            {/* Step-by-Step Instructions */}
            <div className="w-full space-y-3 pt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">How to link:</span>
                <button
                  type="button"
                  onClick={copyQrCode}
                  className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 font-mono"
                  title="Copy 8-char link code"
                >
                  {qrCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{qrCopied ? 'Copied code' : `Code: ${qrLinkCode}`}</span>
                </button>
              </div>

              <ol className="space-y-1.5 text-[11px] text-slate-300">
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/80 flex items-center justify-center text-[10px] font-bold">1</span>
                  <span>Open {branding.appName} on your phone</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/80 flex items-center justify-center text-[10px] font-bold">2</span>
                  <span>Tap Settings &gt; Linked Devices &gt; Link Device</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/80 flex items-center justify-center text-[10px] font-bold">3</span>
                  <span>Point camera at this screen to capture QR</span>
                </li>
              </ol>

              {/* Simulate Mobile Scan for instant desktop demo */}
              <button
                type="button"
                onClick={handleSimulateMobileScan}
                disabled={isSimulatingScan || qrIsExpired || qrAuthorizedSuccess}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-300 text-xs font-medium rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isSimulatingScan ? 'Authorizing Web...' : 'Simulate Phone Scan (Instant Demo)'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
