import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useBranding } from '../../context/BrandingContext.js';
import {
  X,
  Phone,
  KeyRound,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  ChevronDown,
  Camera,
  Smile,
  ShieldCheck,
  Lock,
  User,
  Mail,
  AtSign
} from 'lucide-react';

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
  { name: 'Brazil', code: '+55', flag: '🇧🇷', placeholder: '21 99999-2020' },
  { name: 'United States', code: '+1', flag: '🇺🇸', placeholder: '(555) 019-2834' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧', placeholder: '7911 123456' },
  { name: 'United Arab Emirates', code: '+971', flag: '🇦🇪', placeholder: '50 123 4567' },
  { name: 'Singapore', code: '+65', flag: '🇸🇬', placeholder: '9123 4567' },
  { name: 'Australia', code: '+61', flag: '🇦🇺', placeholder: '412 345 678' },
  { name: 'Germany', code: '+49', flag: '🇩🇪', placeholder: '151 23456789' },
  { name: 'Canada', code: '+1', flag: '🇨🇦', placeholder: '(416) 555-0199' },
  { name: 'France', code: '+33', flag: '🇫🇷', placeholder: '6 12 34 56 78' },
  { name: 'Japan', code: '+81', flag: '🇯🇵', placeholder: '90 1234 5678' },
];

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, requestPhoneOtp, verifyPhoneOtp } = useAuth();
  const { branding } = useBranding();

  // Tab mode: 'phone' | 'password' | 'signup'
  const [activeTab, setActiveTab] = useState<'phone' | 'password' | 'signup'>('phone');

  // Phone wizard step: 1 (phone input), 2 (enter otp), 3 (setup profile name/avatar)
  const [phoneStep, setPhoneStep] = useState<1 | 2 | 3>(1);
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(COUNTRIES[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [previewOtp, setPreviewOtp] = useState<string>('');
  const [countdown, setCountdown] = useState(48);
  const [canResend, setCanResend] = useState(false);

  // Profile setup for new phone users
  const [profileName, setProfileName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Password Login state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [requireMfa, setRequireMfa] = useState(false);

  // Sign Up state
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmailOrPhone, setRegEmailOrPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regShowPassword, setRegShowPassword] = useState(false);

  // Status & error handling
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Countdown for Phone OTP
  useEffect(() => {
    let timer: any;
    if (activeTab === 'phone' && phoneStep === 2 && countdown > 0) {
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
  }, [activeTab, phoneStep, countdown]);

  if (!isOpen) return null;

  const fullPhoneString = `${selectedCountry.code}${phoneNumber.replace(/\D/g, '')}`;
  const displayFormattedPhone = `${selectedCountry.code} ${phoneNumber}`;

  // 1. Phone Flow: Request OTP
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanDigits = phoneNumber.replace(/\D/g, '');
    if (cleanDigits.length < 6) {
      setError('Please enter a valid mobile phone number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await requestPhoneOtp(fullPhoneString);
      if (!res.success) {
        setError(res.error || 'Failed to send SMS code.');
        return;
      }
      if (res.previewCode) {
        setPreviewOtp(res.previewCode);
      }
      setCountdown(48);
      setCanResend(false);
      setPhoneStep(2);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Phone Flow: Verify OTP
  const handleVerifyOtp = async () => {
    const fullCode = otpDigits.join('');
    if (fullCode.length < 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await verifyPhoneOtp(fullPhoneString, fullCode, {
        displayName: profileName.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
      });

      if (!res.success) {
        setError(res.error || 'Invalid verification code.');
        return;
      }

      if (res.isNewUser || !profileName.trim()) {
        setPhoneStep(3);
      } else {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Phone Flow: Finalize Profile Setup
  const handleFinishProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      setError('Please enter your name.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const fullCode = otpDigits.join('') || previewOtp;
      const res = await verifyPhoneOtp(fullPhoneString, fullCode, {
        displayName: profileName.trim(),
        avatarUrl: avatarUrl || undefined,
      });

      if (!res.success) {
        setError(res.error || 'Failed to finalize profile.');
        return;
      }

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend SMS
  const handleResendSms = async () => {
    if (!canResend) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await requestPhoneOtp(fullPhoneString);
      if (res.previewCode) {
        setPreviewOtp(res.previewCode);
      }
      setCountdown(48);
      setCanResend(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Password Login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!loginIdentifier.trim() || !loginPassword) {
      setError('Please enter your username/email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(loginIdentifier.trim(), loginPassword, requireMfa ? mfaCode.trim() : undefined);
      if (res.requireMfa) {
        setRequireMfa(true);
        return;
      }
      if (!res.success) {
        setError(res.error || 'Incorrect login details. Please check your username/email and password.');
        return;
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!regDisplayName.trim() || !regUsername.trim() || !regPassword) {
      setError('Please fill in your name, username, and password.');
      return;
    }

    const cleanUsername = regUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleanUsername.length < 3) {
      setError('Username must be at least 3 characters (letters, numbers, underscores).');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const isEmail = regEmailOrPhone.includes('@');
      const res = await register({
        displayName: regDisplayName.trim(),
        username: cleanUsername,
        password: regPassword,
        email: isEmail ? regEmailOrPhone.trim() : undefined,
        phone: !isEmail && regEmailOrPhone.trim() ? regEmailOrPhone.trim() : undefined,
      });

      if (!res.success) {
        setError(res.error || 'Failed to create account. Username or email may already be registered.');
        return;
      }

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Single digit OTP box handling
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);

    if (digit && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasteData) {
      const updated = pasteData.split('');
      while (updated.length < 6) updated.push('');
      setOtpDigits(updated);
    }
  };

  const presetAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md select-none overflow-y-auto">
      {/* Sleek Modal Dialog matching App Internal Dark UI */}
      <div className="relative w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col text-slate-100 my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Header */}
        <div className="pt-6 pb-4 px-6 flex flex-col items-center justify-center text-center border-b border-slate-800/80 bg-slate-950/40">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10 mb-2.5">
            <img
              src={branding.appLogo}
              alt={branding.appName}
              className="w-7 h-7 object-contain drop-shadow"
            />
          </div>
          <h2 className="text-white font-bold text-base tracking-tight">
            Welcome to {branding.appName}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Connect instantly with private chats, groups & communities
          </p>
        </div>

        {/* Navigation Tabs (Phone / Password / Sign Up) */}
        <div className="grid grid-cols-3 p-1.5 mx-5 mt-4 bg-slate-950/80 border border-slate-800/90 rounded-2xl text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setActiveTab('phone');
              setError(null);
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl transition ${
              activeTab === 'phone'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Phone</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('password');
              setError(null);
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl transition ${
              activeTab === 'password'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('signup');
              setError(null);
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl transition ${
              activeTab === 'signup'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Sign Up</span>
          </button>
        </div>

        {/* Error Alert Banner */}
        {error && (
          <div className="mx-6 mt-3 p-3 bg-rose-950/50 border border-rose-800/60 text-rose-200 text-xs rounded-xl flex items-center justify-between gap-2 animate-in fade-in">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-rose-200 p-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 1: PHONE NUMBER SMS ONBOARDING / LOGIN                     */}
        {/* ============================================================== */}
        {activeTab === 'phone' && (
          <div className="p-6">
            {/* Sub-step 1: Enter Phone Number */}
            {phoneStep === 1 && (
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Phone Number
                  </label>
                  <p className="text-[11px] text-slate-400 mb-3">
                    We will send a 6-digit verification code to confirm your phone number.
                  </p>

                  {/* Country Selector */}
                  <div className="relative mb-2.5">
                    <select
                      value={selectedCountry.name}
                      onChange={(e) => {
                        const found = COUNTRIES.find((c) => c.name === e.target.value);
                        if (found) setSelectedCountry(found);
                      }}
                      className="w-full appearance-none bg-slate-950/80 border border-slate-800 rounded-xl py-2.5 pl-3 pr-8 text-xs font-medium text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer shadow-sm"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.name} value={c.name} className="bg-slate-900 text-slate-200">
                          {c.flag} {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>

                  {/* Split Phone Input */}
                  <div className="flex gap-2 items-center">
                    <div className="w-16 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-center text-xs font-bold text-cyan-400 shadow-sm shrink-0">
                      {selectedCountry.code}
                    </div>
                    <input
                      type="tel"
                      autoFocus
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder={selectedCountry.placeholder}
                      className="flex-1 py-2.5 px-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-semibold text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 shadow-sm"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !phoneNumber.trim()}
                    className="w-full py-3 px-4 bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span>{isSubmitting ? 'Sending SMS Code...' : 'Send Verification Code'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => setActiveTab('password')}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium transition"
                  >
                    Have a password? Sign in with password instead &rarr;
                  </button>
                </div>
              </form>
            )}

            {/* Sub-step 2: Enter 6-Digit OTP */}
            {phoneStep === 2 && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="font-bold text-sm text-slate-100">
                    Verify {displayFormattedPhone}
                  </h3>
                  <p className="text-[11.5px] text-slate-400 mt-1">
                    Enter the 6-digit code sent to your mobile phone.
                  </p>
                </div>

                {previewOtp && (
                  <div className="p-2.5 bg-cyan-950/40 border border-cyan-800/40 rounded-xl text-center text-xs">
                    <span className="text-slate-400">Your test code: </span>
                    <span className="font-mono font-bold text-cyan-300 tracking-wider">
                      {previewOtp}
                    </span>
                  </div>
                )}

                {/* 6 Digit Input Boxes */}
                <div className="flex justify-center gap-2 py-1">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-input-${idx}`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      autoFocus={idx === 0}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      className="w-10 h-12 text-center text-lg font-bold bg-slate-950/80 border border-slate-800 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-xl text-cyan-300 focus:outline-none shadow-sm transition"
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs pt-1 px-1">
                  <button
                    type="button"
                    onClick={() => setPhoneStep(1)}
                    className="text-slate-400 hover:text-slate-200 transition flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Edit phone</span>
                  </button>

                  <button
                    type="button"
                    disabled={!canResend || isSubmitting}
                    onClick={handleResendSms}
                    className="text-cyan-400 hover:text-cyan-300 disabled:text-slate-600 transition font-medium"
                  >
                    {canResend ? 'Resend Code' : `Resend in ${countdown}s`}
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={isSubmitting || otpDigits.join('').length < 6}
                    className="w-full py-3 px-4 bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span>{isSubmitting ? 'Verifying Code...' : 'Verify & Continue'}</span>
                    <Check className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              </div>
            )}

            {/* Sub-step 3: Complete Profile (Display Name & Avatar) */}
            {phoneStep === 3 && (
              <form onSubmit={handleFinishProfile} className="space-y-4">
                <div className="text-center">
                  <h3 className="font-bold text-sm text-slate-100">
                    Set up your profile
                  </h3>
                  <p className="text-[11.5px] text-slate-400 mt-0.5">
                    Choose a display name and avatar so friends recognize you.
                  </p>
                </div>

                {/* Avatar Selection */}
                <div className="flex flex-col items-center gap-2 pt-1">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-20 h-20 rounded-full bg-slate-950 border-2 border-slate-800 hover:border-cyan-500 cursor-pointer overflow-hidden group shadow-md transition"
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                        <Camera className="w-6 h-6 text-slate-400 group-hover:text-cyan-400 transition" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => setAvatarUrl(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />

                  {/* Preset Avatars */}
                  <div className="flex items-center gap-2 pt-1">
                    {presetAvatars.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAvatarUrl(url)}
                        className={`w-7 h-7 rounded-full overflow-hidden border-2 transition ${
                          avatarUrl === url ? 'border-cyan-400 scale-110' : 'border-slate-800 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Your Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      autoFocus
                      required
                      maxLength={30}
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      className="w-full py-2.5 pl-3.5 pr-14 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-medium text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 shadow-sm"
                    />
                    <div className="absolute right-3 top-2.5 flex items-center gap-1 text-slate-500 text-[10px] font-mono">
                      <span>{30 - profileName.length}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !profileName.trim()}
                    className="w-full py-3 px-4 bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span>{isSubmitting ? 'Saving Profile...' : 'Complete & Start Chatting'}</span>
                    <Check className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: PASSWORD SIGN IN (Clean & Standard, No Admin Mention)    */}
        {/* ============================================================== */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordLogin} className="p-6 space-y-4">
            {requireMfa ? (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Two-Factor Security Code
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  Enter the 6-digit code from your authenticator app.
                </p>
                <input
                  type="text"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="000000"
                  autoFocus
                  required
                  className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-center text-lg font-mono font-bold tracking-widest text-cyan-300 focus:outline-none focus:border-cyan-500"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Username, Email, or Phone
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      autoFocus
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="Enter your username, email, or phone"
                      className="w-full py-2.5 pl-9 pr-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-medium text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 shadow-sm"
                    />
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full py-2.5 pl-9 pr-10 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-medium text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 shadow-sm"
                    />
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 p-0.5 text-slate-500 hover:text-slate-300 transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Signing In...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
              <button
                type="button"
                onClick={() => setActiveTab('phone')}
                className="text-cyan-400 hover:text-cyan-300 transition font-medium"
              >
                Log in with SMS code
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('signup')}
                className="text-slate-400 hover:text-slate-200 transition"
              >
                New user? Create account
              </button>
            </div>
          </form>
        )}

        {/* ============================================================== */}
        {/* TAB 3: SIGN UP / NEW ACCOUNT REGISTRATION                      */}
        {/* ============================================================== */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignUp} className="p-6 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Display Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  value={regDisplayName}
                  onChange={(e) => setRegDisplayName(e.target.value)}
                  placeholder="e.g. Maya Lin"
                  className="w-full py-2.5 pl-9 pr-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-medium text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 shadow-sm"
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Username (@handle)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="mayalin"
                  className="w-full py-2.5 pl-9 pr-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-medium text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 shadow-sm"
                />
                <AtSign className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email or Mobile Number (Optional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={regEmailOrPhone}
                  onChange={(e) => setRegEmailOrPhone(e.target.value)}
                  placeholder="name@example.com or +15550192834"
                  className="w-full py-2.5 pl-9 pr-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-medium text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 shadow-sm"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={regShowPassword ? 'text' : 'password'}
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="w-full py-2.5 pl-9 pr-10 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-medium text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 shadow-sm"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setRegShowPassword(!regShowPassword)}
                  className="absolute right-3 top-2.5 p-0.5 text-slate-500 hover:text-slate-300 transition"
                >
                  {regShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Creating Account...' : 'Create Account'}</span>
                <Check className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => setActiveTab('password')}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 transition font-medium"
              >
                Already have an account? Sign in &rarr;
              </button>
            </div>
          </form>
        )}

        {/* Footer Note */}
        <div className="px-6 py-3 border-t border-slate-800/80 bg-slate-950/50 text-center text-[10px] text-slate-500">
          By signing in or creating an account, you agree to {branding.appName}&apos;s{' '}
          <span className="text-cyan-400 hover:underline cursor-pointer">Terms of Service</span> and{' '}
          <span className="text-cyan-400 hover:underline cursor-pointer">Privacy Policy</span>.
        </div>
      </div>
    </div>
  );
};
