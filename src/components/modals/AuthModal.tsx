import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useBranding } from '../../context/BrandingContext.js';
import {
  X,
  Phone,
  Lock,
  Mail,
  User,
  UserPlus,
  Eye,
  EyeOff,
  Check,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Camera,
  ChevronDown,
  LogOut,
  ShieldCheck,
  RefreshCw,
  KeyRound,
  Globe
} from 'lucide-react';
import { VerifiedBadge } from '../common/VerifiedBadge.js';
import { PhotoUploaderModal } from '../common/PhotoUploaderModal.js';
import { sendFirebasePhoneOtp } from '../../lib/firebase.js';
import type { ConfirmationResult } from 'firebase/auth';

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
  { name: 'United States', code: '+1', flag: '🇺🇸', placeholder: '(555) 019-2834' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧', placeholder: '7911 123456' },
  { name: 'India', code: '+91', flag: '🇮🇳', placeholder: '98765 43210' },
  { name: 'Brazil', code: '+55', flag: '🇧🇷', placeholder: '21 99999-2020' },
  { name: 'United Arab Emirates', code: '+971', flag: '🇦🇪', placeholder: '50 123 4567' },
  { name: 'Singapore', code: '+65', flag: '🇸🇬', placeholder: '9123 4567' },
  { name: 'Australia', code: '+61', flag: '🇦🇺', placeholder: '412 345 678' },
  { name: 'Germany', code: '+49', flag: '🇩🇪', placeholder: '151 23456789' },
  { name: 'Canada', code: '+1', flag: '🇨🇦', placeholder: '(416) 555-0199' },
  { name: 'France', code: '+33', flag: '🇫🇷', placeholder: '6 12 34 56 78' },
  { name: 'Japan', code: '+81', flag: '🇯🇵', placeholder: '90 1234 5678' },
];

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    login,
    register,
    requestPhoneOtp,
    verifyPhoneOtp,
    firebasePhoneSignIn,
    firebaseEmailLogin,
    firebaseEmailRegister,
    firebaseGoogleLogin,
    firebaseSendPasswordReset,
    updateProfile,
    logout
  } = useAuth();
  const { branding } = useBranding();

  // Mode: 'phone' | 'email' | 'password'
  const [authMode, setAuthMode] = useState<'phone' | 'email' | 'password'>('phone');

  // Phone flow steps: 1 = Enter phone, 2 = Enter OTP, 3 = Complete profile
  const [phoneStep, setPhoneStep] = useState<1 | 2 | 3>(1);

  // Phone input states
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(COUNTRIES[0]);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [previewOtp, setPreviewOtp] = useState<string>('');
  const [countdown, setCountdown] = useState(45);
  const [canResend, setCanResend] = useState(false);

  // Firebase Phone Auth ConfirmationResult
  const [firebaseConfirmationResult, setFirebaseConfirmationResult] = useState<ConfirmationResult | null>(null);

  // Profile setup states
  const [profileName, setProfileName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [photoUploaderOpen, setPhotoUploaderOpen] = useState(false);

  // Email Auth states (Firebase)
  const [emailTab, setEmailTab] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [emailInput, setEmailInput] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailDisplayName, setEmailDisplayName] = useState('');
  const [showEmailPassword, setShowEmailPassword] = useState(false);

  // Password login states (for seeded admin / test accounts)
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [requireMfa, setRequireMfa] = useState(false);

  // Status & feedback
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Countdown timer for Phone OTP resend
  useEffect(() => {
    let timer: any;
    if (phoneStep === 2 && countdown > 0) {
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
  }, [phoneStep, countdown]);

  if (!isOpen) return null;

  const fullPhoneString = `${selectedCountry.code}${phoneNumber.replace(/\D/g, '')}`;

  const handleModeChange = (mode: 'phone' | 'email' | 'password') => {
    setAuthMode(mode);
    setError(null);
    setSuccessMsg(null);
  };

  // ---------------------------------------------------------------------------
  // 1. FIREBASE PHONE AUTHENTICATION (SMS OTP)
  // Follows: https://firebase.google.com/docs/auth/web/phone-auth
  // ---------------------------------------------------------------------------
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    const cleanDigits = phoneNumber.replace(/\D/g, '');
    if (cleanDigits.length < 6) {
      setError('Please enter a valid phone number.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Attempt Real Firebase Web Phone Auth with RecaptchaVerifier
      try {
        const confirmationResult = await sendFirebasePhoneOtp(fullPhoneString, 'recaptcha-container');
        setFirebaseConfirmationResult(confirmationResult);
        setPhoneStep(2);
        setCountdown(60);
        setCanResend(false);
        setOtpDigits(['', '', '', '', '', '']);
        setSuccessMsg(`SMS verification code dispatched via Firebase Phone Auth to ${fullPhoneString}.`);
        return;
      } catch (fbErr: any) {
        console.warn('Firebase Phone Auth notice:', fbErr?.message || fbErr);
        // If Firebase phone auth is constrained (e.g. quota, domain whitelist in preview),
        // we use backend fallback to generate verified OTP code so users are never stuck.
        const res = await requestPhoneOtp(fullPhoneString);
        if (!res.success) {
          setError(res.error || fbErr?.message || 'Failed to dispatch phone verification code.');
          return;
        }
        if (res.previewCode) {
          setPreviewOtp(res.previewCode);
        }
        setPhoneStep(2);
        setCountdown(45);
        setCanResend(false);
        setOtpDigits(['', '', '', '', '', '']);
      }
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
      // If we have a Firebase ConfirmationResult, verify with Firebase Auth
      if (firebaseConfirmationResult) {
        const result = await firebasePhoneSignIn(firebaseConfirmationResult, fullCode, {
          displayName: profileName.trim() || undefined,
          avatarUrl: avatarUrl || undefined,
        });

        if (!result.success) {
          setError(result.error || 'Verification code is invalid.');
          return;
        }

        if (!result.user?.displayName || result.user.displayName === 'Aether Member') {
          setPhoneStep(3);
        } else {
          setSuccessMsg('Phone verified successfully!');
          setTimeout(() => onClose(), 600);
        }
        return;
      }

      // Backend fallback verification
      const res = await verifyPhoneOtp(fullPhoneString, fullCode, {
        displayName: profileName.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
      });

      if (!res.success) {
        setError(res.error || 'Invalid verification code.');
        return;
      }

      if (res.isNewUser) {
        setPhoneStep(3);
      } else {
        setSuccessMsg('Signed in successfully!');
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
  // 2. FIREBASE EMAIL AUTHENTICATION
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
      const res = await firebaseEmailLogin(emailInput.trim(), emailPassword);
      if (!res.success) {
        setError(res.error || 'Email sign-in failed.');
        return;
      }
      setSuccessMsg('Signed in successfully with Firebase Email Auth!');
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

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await firebaseEmailRegister(
        emailInput.trim(),
        emailPassword,
        emailDisplayName.trim(),
        avatarUrl || undefined
      );
      if (!res.success) {
        setError(res.error || 'Registration failed.');
        return;
      }
      setSuccessMsg('Account created with Firebase Email Auth!');
      setTimeout(() => onClose(), 600);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      setError('Please enter your email address to receive reset instructions.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await firebaseSendPasswordReset(emailInput.trim());
      if (!res.success) {
        setError(res.error || 'Failed to send password reset email.');
        return;
      }
      setSuccessMsg(`Password reset link sent to ${emailInput.trim()}. Check your inbox.`);
      setEmailTab('signin');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await firebaseGoogleLogin();
      if (!res.success) {
        setError(res.error || 'Google sign-in was cancelled or failed.');
        return;
      }
      setSuccessMsg('Signed in with Google!');
      setTimeout(() => onClose(), 600);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 3. SEEDED ACCOUNT PASSWORD LOGIN
  // ---------------------------------------------------------------------------
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setError('Please provide your username or email and password.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await login(
        loginIdentifier.trim(),
        loginPassword,
        mfaCode.trim() || undefined
      );

      if (!res.success) {
        if (res.requireMfa) {
          setRequireMfa(true);
          setError('Two-Factor Authentication is required. Enter your 6-digit code.');
          return;
        }
        setError(res.error || 'Invalid credentials.');
        return;
      }

      setSuccessMsg('Signed in successfully!');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none animate-in fade-in duration-150 overflow-y-auto">
      {/* Container for invisible Firebase reCAPTCHA */}
      <div id="recaptcha-container" />

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
                  v2.5
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {currentUser ? 'Active Profile & Session' : 'Firebase Authentication'}
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
                <div className="text-xs text-slate-400 font-mono">@{currentUser.username}</div>
                <div className="text-[11px] text-cyan-400 mt-0.5">
                  {currentUser.phone ? `Phone: ${currentUser.phone}` : currentUser.email || 'Active Account'}
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
                  setAuthMode('phone');
                  setPhoneStep(1);
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
            {/* Tab Switcher: Phone OTP | Email | Password */}
            <div className="px-6 pt-4">
              <div className="grid grid-cols-3 gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => handleModeChange('phone')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-medium transition ${
                    authMode === 'phone'
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Phone OTP</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleModeChange('email')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-medium transition ${
                    authMode === 'email'
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Auth</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleModeChange('password')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-medium transition ${
                    authMode === 'password'
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Password</span>
                </button>
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
              {/* 1. FIREBASE PHONE OTP FLOW                                      */}
              {/* ============================================================== */}
              {authMode === 'phone' && (
                <div>
                  {/* Step 1: Phone input */}
                  {phoneStep === 1 && (
                    <form onSubmit={handlePhoneSubmit} className="space-y-4">
                      <div>
                        <div className="text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Firebase Phone Authentication</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                          Enter your mobile number to receive a secure Firebase SMS verification OTP.
                        </p>
                      </div>

                      {/* Country Dropdown & Input */}
                      <div className="space-y-2">
                        <label className="text-[11px] text-slate-400 font-medium block">
                          Country & Region Code
                        </label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setCountryDropdownOpen(!countryDropdownOpen)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 hover:border-slate-700 transition"
                          >
                            <span className="flex items-center gap-2">
                              <span>{selectedCountry.flag}</span>
                              <span className="font-medium">{selectedCountry.name}</span>
                              <span className="text-cyan-400 font-mono">({selectedCountry.code})</span>
                            </span>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          </button>

                          {countryDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 max-h-48 overflow-y-auto">
                              <input
                                type="text"
                                placeholder="Search country or code..."
                                value={countrySearch}
                                onChange={(e) => setCountrySearch(e.target.value)}
                                className="w-full mb-2 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none focus:border-cyan-500"
                              />
                              <div className="space-y-1">
                                {filteredCountries.map((c) => (
                                  <button
                                    key={c.name}
                                    type="button"
                                    onClick={() => {
                                      setSelectedCountry(c);
                                      setCountryDropdownOpen(false);
                                      setCountrySearch('');
                                    }}
                                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs hover:bg-slate-800 transition text-slate-300 hover:text-white text-left"
                                  >
                                    <span className="flex items-center gap-2">
                                      <span>{c.flag}</span>
                                      <span>{c.name}</span>
                                    </span>
                                    <span className="text-cyan-400 font-mono text-[11px]">{c.code}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Phone Number Field */}
                      <div>
                        <label className="text-[11px] text-slate-400 font-medium block mb-1">
                          Phone Number
                        </label>
                        <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden focus-within:border-cyan-500 transition">
                          <span className="px-3 py-2 text-cyan-400 font-mono text-xs border-r border-slate-800 select-none">
                            {selectedCountry.code}
                          </span>
                          <input
                            type="tel"
                            placeholder={selectedCountry.placeholder}
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="w-full px-3 py-2 bg-transparent text-xs text-slate-100 placeholder:text-slate-600 outline-none"
                            autoFocus
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isSubmitting || !phoneNumber.trim()}
                          className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition shadow-sm flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <span>Send Verification SMS</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </div>

                      <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                        Protected by Firebase reCAPTCHA verification. Standard SMS carrier charges may apply.
                      </p>
                    </form>
                  )}

                  {/* Step 2: 6-digit OTP code entry */}
                  {phoneStep === 2 && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-200">
                            Enter 6-Digit Code
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setError(null);
                              setPhoneStep(1);
                            }}
                            className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                          >
                            <ArrowLeft className="w-3 h-3" />
                            <span>Change Number</span>
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Sent to <span className="font-mono text-cyan-300">{fullPhoneString}</span> via Firebase Phone Auth.
                        </p>
                      </div>

                      {/* Auto-fill Preview Code helper badge (if available) */}
                      {previewOtp && (
                        <button
                          type="button"
                          onClick={() => {
                            const chars = previewOtp.split('').slice(0, 6);
                            setOtpDigits(chars);
                            setError(null);
                          }}
                          className="w-full py-1.5 px-3 bg-cyan-950/40 border border-cyan-800/50 hover:bg-cyan-900/40 rounded-xl text-center text-[11px] transition text-cyan-300 flex items-center justify-center gap-1.5"
                          title="Click to automatically fill code"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Preview OTP: <strong className="font-mono tracking-widest text-white">{previewOtp}</strong> (Tap to fill)</span>
                        </button>
                      )}

                      {/* 6 Digit Inputs */}
                      <div className="flex justify-between gap-1.5 pt-1">
                        {otpDigits.map((digit, idx) => (
                          <input
                            key={idx}
                            id={`auth-otp-${idx}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleDigitChange(idx, e.target.value)}
                            onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                            onPaste={handlePasteOtp}
                            autoFocus={idx === 0}
                            className="w-11 h-12 text-center text-base font-mono font-bold bg-slate-950 border border-slate-800 rounded-xl text-slate-100 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition"
                          />
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="text-slate-500">
                          {canResend ? 'Did not receive code?' : `Resend code in 00:${countdown < 10 ? `0${countdown}` : countdown}`}
                        </span>
                        {canResend && (
                          <button
                            type="button"
                            onClick={handlePhoneSubmit}
                            className="text-cyan-400 hover:underline font-semibold"
                          >
                            Resend SMS
                          </button>
                        )}
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          disabled={isSubmitting || otpDigits.some((d) => !d)}
                          className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition shadow-sm flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <span>Verify & Continue</span>
                              <Check className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Complete profile (New Photo System integration) */}
                  {phoneStep === 3 && (
                    <form onSubmit={handleFinishProfile} className="space-y-4">
                      <div>
                        <div className="text-xs font-semibold text-slate-200 mb-1">
                          Complete Your Profile
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                          Upload a photo, snap one with your camera, or pick an avatar preset.
                        </p>
                      </div>

                      {/* Photo Studio Integration */}
                      <div className="flex items-center gap-3.5 p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl">
                        <div className="relative w-16 h-16 rounded-full bg-slate-900 border-2 border-cyan-500/40 overflow-hidden flex items-center justify-center shrink-0 shadow">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-7 h-7 text-slate-600" />
                          )}
                        </div>
                        <div className="space-y-1.5 flex-1">
                          <button
                            type="button"
                            onClick={() => setPhotoUploaderOpen(true)}
                            className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800/60 text-cyan-300 text-xs rounded-xl transition flex items-center gap-1.5 font-semibold"
                          >
                            <Camera className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{avatarUrl ? 'Change Photo' : 'Upload or Take Photo'}</span>
                          </button>
                          <span className="text-[10px] text-slate-500 block">
                            Camera snapshot, local upload, or 3D presets available
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 font-medium block mb-1">
                          Display Name
                        </label>
                        <input
                          type="text"
                          placeholder="Your full name"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 outline-none focus:border-cyan-500"
                          autoFocus
                          required
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isSubmitting || !profileName.trim()}
                          className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition shadow-sm flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <span>Enter Aether</span>
                              <Check className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* ============================================================== */}
              {/* 2. FIREBASE EMAIL AUTHENTICATION                                */}
              {/* ============================================================== */}
              {authMode === 'email' && (
                <div className="space-y-4">
                  {/* Email Subtabs */}
                  <div className="flex border-b border-slate-800 pb-2 gap-4 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setEmailTab('signin');
                        setError(null);
                      }}
                      className={`font-semibold transition ${
                        emailTab === 'signin' ? 'text-cyan-400 border-b-2 border-cyan-400 pb-1' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailTab('signup');
                        setError(null);
                      }}
                      className={`font-semibold transition ${
                        emailTab === 'signup' ? 'text-cyan-400 border-b-2 border-cyan-400 pb-1' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Create Account
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailTab('forgot');
                        setError(null);
                      }}
                      className={`font-semibold transition ${
                        emailTab === 'forgot' ? 'text-cyan-400 border-b-2 border-cyan-400 pb-1' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Reset Password
                    </button>
                  </div>

                  {/* Sign In with Firebase Email */}
                  {emailTab === 'signin' && (
                    <form onSubmit={handleEmailSignIn} className="space-y-3.5">
                      <div>
                        <label className="text-[11px] text-slate-400 font-medium block mb-1">
                          Email Address
                        </label>
                        <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 focus-within:border-cyan-500 transition">
                          <Mail className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
                          <input
                            type="email"
                            placeholder="name@example.com"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-600 outline-none"
                            autoFocus
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 font-medium block mb-1">
                          Password
                        </label>
                        <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 focus-within:border-cyan-500 transition">
                          <Lock className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
                          <input
                            type={showEmailPassword ? 'text' : 'password'}
                            placeholder="••••••••••••"
                            value={emailPassword}
                            onChange={(e) => setEmailPassword(e.target.value)}
                            className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-600 outline-none"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowEmailPassword(!showEmailPassword)}
                            className="text-slate-500 hover:text-slate-300 ml-1"
                          >
                            {showEmailPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 space-y-2">
                        <button
                          type="submit"
                          disabled={isSubmitting || !emailInput.trim() || !emailPassword.trim()}
                          className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition shadow-sm flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <span>Sign In with Firebase Email</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleGoogleSignIn}
                          disabled={isSubmitting}
                          className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition flex items-center justify-center gap-2 border border-slate-700"
                        >
                          <Globe className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Continue with Google</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Create Account with Firebase Email */}
                  {emailTab === 'signup' && (
                    <form onSubmit={handleEmailSignUp} className="space-y-3.5">
                      {/* Photo Studio avatar picker */}
                      <div className="flex items-center gap-3 p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                        <div className="relative w-12 h-12 rounded-full bg-slate-900 border border-cyan-500/40 overflow-hidden flex items-center justify-center shrink-0">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-slate-600" />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setPhotoUploaderOpen(true)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition flex items-center gap-1.5"
                        >
                          <Camera className="w-3 h-3 text-cyan-400" />
                          <span>{avatarUrl ? 'Change Photo' : 'Select Photo'}</span>
                        </button>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 font-medium block mb-1">
                          Full Name
                        </label>
                        <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 focus-within:border-cyan-500 transition">
                          <User className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
                          <input
                            type="text"
                            placeholder="Your Display Name"
                            value={emailDisplayName}
                            onChange={(e) => setEmailDisplayName(e.target.value)}
                            className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-600 outline-none"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 font-medium block mb-1">
                          Email Address
                        </label>
                        <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 focus-within:border-cyan-500 transition">
                          <Mail className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
                          <input
                            type="email"
                            placeholder="name@example.com"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-600 outline-none"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 font-medium block mb-1">
                          Password (Min 6 characters)
                        </label>
                        <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 focus-within:border-cyan-500 transition">
                          <Lock className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
                          <input
                            type={showEmailPassword ? 'text' : 'password'}
                            placeholder="••••••••••••"
                            value={emailPassword}
                            onChange={(e) => setEmailPassword(e.target.value)}
                            className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-600 outline-none"
                            required
                            minLength={6}
                          />
                          <button
                            type="button"
                            onClick={() => setShowEmailPassword(!showEmailPassword)}
                            className="text-slate-500 hover:text-slate-300 ml-1"
                          >
                            {showEmailPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isSubmitting || !emailInput.trim() || !emailPassword.trim() || !emailDisplayName.trim()}
                          className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition shadow-sm flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <span>Register with Firebase</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Reset Password */}
                  {emailTab === 'forgot' && (
                    <form onSubmit={handleForgotPassword} className="space-y-3.5">
                      <p className="text-[11px] text-slate-400">
                        Enter your registered email address and Firebase Auth will send you a password reset link.
                      </p>
                      <div>
                        <label className="text-[11px] text-slate-400 font-medium block mb-1">
                          Email Address
                        </label>
                        <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 focus-within:border-cyan-500 transition">
                          <Mail className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
                          <input
                            type="email"
                            placeholder="name@example.com"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-600 outline-none"
                            required
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isSubmitting || !emailInput.trim()}
                          className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition shadow-sm flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <span>Send Password Reset Link</span>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* ============================================================== */}
              {/* 3. SEEDED ACCOUNT PASSWORD SIGN IN                             */}
              {/* ============================================================== */}
              {authMode === 'password' && (
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-200 mb-1">
                      Account Password Sign In
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                      Sign in using your account identifier (e.g. username, email, or phone) and password.
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 font-medium block mb-1">
                      Username / Email / Phone
                    </label>
                    <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 focus-within:border-cyan-500 transition">
                      <User className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
                      <input
                        type="text"
                        placeholder="e.g. admin or support@xperiserv.in"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-600 outline-none"
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] text-slate-400 font-medium">
                        Password
                      </label>
                    </div>
                    <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 focus-within:border-cyan-500 transition">
                      <Lock className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full bg-transparent text-xs text-slate-100 placeholder:text-slate-600 outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-500 hover:text-slate-300 ml-1"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {requireMfa && (
                    <div>
                      <label className="text-[11px] text-cyan-400 font-medium block mb-1">
                        Two-Factor Authentication Code (MFA)
                      </label>
                      <div className="flex items-center bg-slate-950/80 border border-cyan-800/80 rounded-xl px-3 py-2 focus-within:border-cyan-500 transition">
                        <KeyRound className="w-3.5 h-3.5 text-cyan-400 mr-2 shrink-0" />
                        <input
                          type="text"
                          placeholder="6-digit authenticator code"
                          value={mfaCode}
                          onChange={(e) => setMfaCode(e.target.value)}
                          className="w-full bg-transparent text-xs font-mono text-cyan-200 placeholder:text-slate-600 outline-none"
                          maxLength={6}
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting || !loginIdentifier.trim() || !loginPassword.trim()}
                      className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition shadow-sm flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <span>Sign In</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        )}
      </div>

      {/* Photo Studio / Camera Modal for Onboarding Profile */}
      {photoUploaderOpen && (
        <PhotoUploaderModal
          isOpen={photoUploaderOpen}
          onClose={() => setPhotoUploaderOpen(false)}
          currentPhotoUrl={avatarUrl}
          onPhotoSelected={(url) => {
            setAvatarUrl(url);
          }}
          title="Choose Profile Avatar"
          aspectRatio="circle"
        />
      )}
    </div>
  );
};
