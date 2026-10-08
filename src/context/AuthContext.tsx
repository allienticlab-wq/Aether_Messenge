import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserSession } from '../types/index.js';
import {
  signInWithFirebaseEmail,
  signUpWithFirebaseEmail,
  sendFirebasePasswordReset,
  signInWithFirebaseGoogle,
  verifyFirebasePhoneOtp,
  signOutFirebase,
} from '../lib/firebase.js';
import type { ConfirmationResult } from 'firebase/auth';

interface AuthContextType {
  currentUser: UserProfile | null;
  session: UserSession | null;
  isLoading: boolean;
  login: (identifier: string, password: string, mfaCode?: string) => Promise<{ success: boolean; requireMfa?: boolean; error?: string }>;
  register: (data: { email?: string; username: string; displayName: string; password: string; phone?: string }) => Promise<{ success: boolean; error?: string }>;
  requestPhoneOtp: (phone: string) => Promise<{ success: boolean; error?: string; previewCode?: string }>;
  verifyPhoneOtp: (phone: string, code: string, profile?: { displayName?: string; avatarUrl?: string }) => Promise<{ success: boolean; error?: string; isNewUser?: boolean }>;
  // Firebase Auth additions
  firebasePhoneSignIn: (
    confirmationResult: ConfirmationResult,
    code: string,
    profile?: { displayName?: string; avatarUrl?: string }
  ) => Promise<{ success: boolean; error?: string; user?: UserProfile }>;
  firebaseEmailLogin: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  firebaseEmailRegister: (email: string, pass: string, displayName: string, avatarUrl?: string) => Promise<{ success: boolean; error?: string }>;
  firebaseGoogleLogin: () => Promise<{ success: boolean; error?: string }>;
  firebaseSendPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  firebaseSyncUser: (data: { uid: string; email?: string; phoneNumber?: string; displayName?: string; photoURL?: string; providerId?: string }) => Promise<{ success: boolean; error?: string; user?: UserProfile }>;
  logout: () => void;
  switchDemoUser: (userId: string) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
  updatePrivacy: (privacy: UserProfile['privacy']) => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize only if user has previously logged in
  useEffect(() => {
    const savedUserId = localStorage.getItem('aether_user_id');
    const savedSessionId = localStorage.getItem('aether_session_id');

    if (!savedUserId || !savedSessionId) {
      setIsLoading(false);
      return;
    }

    fetch('/api/auth/me', {
      headers: {
        'x-user-id': savedUserId,
        'x-session-id': savedSessionId,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Session invalid');
        return res.json();
      })
      .then((data) => {
        if (data.user) {
          setCurrentUser(data.user);
          setSession({
            id: savedSessionId,
            userId: data.user.id,
            deviceName: 'Desktop Web Client',
            browser: 'Chrome 128',
            os: 'macOS',
            ipAddress: '127.0.0.1',
            location: 'San Francisco, CA',
            isCurrent: true,
            lastActive: new Date().toISOString(),
            createdAt: data.user.createdAt,
          });
        } else {
          localStorage.removeItem('aether_user_id');
          localStorage.removeItem('aether_session_id');
        }
      })
      .catch(() => {
        localStorage.removeItem('aether_user_id');
        localStorage.removeItem('aether_session_id');
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Helper to sync Firebase authenticated user with local backend session & state
  const firebaseSyncUser = async (data: {
    uid: string;
    email?: string;
    phoneNumber?: string;
    displayName?: string;
    photoURL?: string;
    providerId?: string;
  }) => {
    try {
      const res = await fetch('/api/auth/firebase-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) {
        return { success: false, error: resData.error || 'Failed to sync authentication session.' };
      }
      setCurrentUser(resData.user);
      setSession(resData.session);
      localStorage.setItem('aether_user_id', resData.user.id);
      localStorage.setItem('aether_session_id', resData.session.id);
      return { success: true, user: resData.user };
    } catch {
      return { success: false, error: 'Network error synchronizing session.' };
    }
  };

  // Firebase Phone OTP verification and account synchronization
  const firebasePhoneSignIn = async (
    confirmationResult: ConfirmationResult,
    code: string,
    profile?: { displayName?: string; avatarUrl?: string }
  ) => {
    try {
      const cred = await verifyFirebasePhoneOtp(confirmationResult, code);
      const user = cred.user;
      return await firebaseSyncUser({
        uid: user.uid,
        phoneNumber: user.phoneNumber || undefined,
        displayName: profile?.displayName || user.displayName || undefined,
        photoURL: profile?.avatarUrl || user.photoURL || undefined,
        providerId: 'phone',
      });
    } catch (err: any) {
      console.error('Firebase Phone OTP Error:', err);
      let errorMsg = 'Failed to verify OTP code.';
      if (err.code === 'auth/invalid-verification-code') {
        errorMsg = 'Invalid verification code. Please check and try again.';
      } else if (err.code === 'auth/code-expired') {
        errorMsg = 'The verification code has expired. Please request a new one.';
      }
      return { success: false, error: errorMsg };
    }
  };

  // Firebase Email Sign In
  const firebaseEmailLogin = async (email: string, pass: string) => {
    try {
      const cred = await signInWithFirebaseEmail(email, pass);
      const user = cred.user;
      return await firebaseSyncUser({
        uid: user.uid,
        email: user.email || email,
        displayName: user.displayName || undefined,
        photoURL: user.photoURL || undefined,
        providerId: 'password',
      });
    } catch (err: any) {
      console.warn('Firebase Email Login Notice:', err);

      // If Firebase email provider is not yet enabled in Firebase Console (auth/operation-not-allowed),
      // or user exists in local database (e.g. admin or pre-seeded accounts),
      // or network/origin restrictions occur in preview, automatically try server-side login
      if (
        err.code === 'auth/operation-not-allowed' ||
        err.code === 'auth/configuration-not-found' ||
        err.code === 'auth/internal-error' ||
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/api-key-not-valid' ||
        err.code === 'auth/network-request-failed'
      ) {
        const localRes = await login(email, pass);
        if (localRes.success) {
          return { success: true };
        }
      }

      let errorMsg = 'Failed to sign in with email.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMsg = 'Invalid email or password.';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = 'Invalid email address format.';
      } else if (err.code === 'auth/operation-not-allowed') {
        errorMsg = 'Email provider is disabled in Firebase Console. (Enabled automatic test fallback).';
      }
      return { success: false, error: errorMsg };
    }
  };

  // Firebase Email Sign Up
  const firebaseEmailRegister = async (
    email: string,
    pass: string,
    displayName: string,
    avatarUrl?: string
  ) => {
    try {
      const cred = await signUpWithFirebaseEmail(email, pass, displayName);
      const user = cred.user;
      return await firebaseSyncUser({
        uid: user.uid,
        email: user.email || email,
        displayName,
        photoURL: avatarUrl,
        providerId: 'password',
      });
    } catch (err: any) {
      console.warn('Firebase Email Register Notice:', err);

      // If Firebase email provider is disabled in console or restricted, fall back to server registration
      if (
        err.code === 'auth/operation-not-allowed' ||
        err.code === 'auth/configuration-not-found' ||
        err.code === 'auth/internal-error' ||
        err.code === 'auth/api-key-not-valid' ||
        err.code === 'auth/network-request-failed'
      ) {
        const localReg = await register({
          email,
          username: email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') + Math.floor(100 + Math.random() * 900),
          displayName,
          password: pass,
        });
        if (localReg.success) {
          if (avatarUrl) {
            await updateProfile({ avatarUrl });
          }
          return { success: true };
        }
      }

      let errorMsg = 'Failed to create account.';
      if (err.code === 'auth/email-already-in-use') {
        errorMsg = 'This email address is already in use.';
      } else if (err.code === 'auth/weak-password') {
        errorMsg = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/operation-not-allowed') {
        errorMsg = 'Email provider is disabled in Firebase Console. Please enable Email/Password in Firebase console.';
      }
      return { success: false, error: errorMsg };
    }
  };

  // Firebase Google Sign In
  const firebaseGoogleLogin = async () => {
    try {
      const cred = await signInWithFirebaseGoogle();
      const user = cred.user;
      return await firebaseSyncUser({
        uid: user.uid,
        email: user.email || undefined,
        displayName: user.displayName || undefined,
        photoURL: user.photoURL || undefined,
        providerId: 'google',
      });
    } catch (err: any) {
      console.error('Firebase Google Sign In Error:', err);
      return { success: false, error: err.message || 'Google sign-in was cancelled or failed.' };
    }
  };

  // Firebase Password Reset
  const firebaseSendPasswordReset = async (email: string) => {
    try {
      await sendFirebasePasswordReset(email);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to send password reset email.' };
    }
  };

  const login = async (identifier: string, password: string, mfaCode?: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginIdentifier: identifier, password, mfaCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }
      if (data.requireMfa) {
        return { success: false, requireMfa: true };
      }
      setCurrentUser(data.user);
      setSession(data.session);
      localStorage.setItem('aether_user_id', data.user.id);
      localStorage.setItem('aether_session_id', data.session.id);
      return { success: true };
    } catch {
      return { success: false, error: 'Network error connecting to authentication server.' };
    }
  };

  const register = async (formData: { email?: string; username: string; displayName: string; password: string; phone?: string }) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }
      setCurrentUser(data.user);
      setSession(data.session);
      localStorage.setItem('aether_user_id', data.user.id);
      localStorage.setItem('aether_session_id', data.session.id);
      return { success: true };
    } catch {
      return { success: false, error: 'Registration failed due to network error.' };
    }
  };

  const requestPhoneOtp = async (phone: string) => {
    try {
      const res = await fetch('/api/auth/phone/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to send OTP.' };
      }
      return { success: true, previewCode: data.previewCode };
    } catch {
      return { success: false, error: 'Failed to request OTP. Check network connection.' };
    }
  };

  const verifyPhoneOtp = async (
    phone: string,
    code: string,
    profile?: { displayName?: string; avatarUrl?: string }
  ) => {
    try {
      const res = await fetch('/api/auth/phone/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          code,
          displayName: profile?.displayName,
          avatarUrl: profile?.avatarUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Invalid verification code.' };
      }
      setCurrentUser(data.user);
      setSession(data.session);
      localStorage.setItem('aether_user_id', data.user.id);
      localStorage.setItem('aether_session_id', data.session.id);
      return { success: true, isNewUser: data.isNewUser };
    } catch {
      return { success: false, error: 'Verification failed. Please try again.' };
    }
  };

  const logout = () => {
    try {
      signOutFirebase();
    } catch {
      // ignore
    }
    setCurrentUser(null);
    setSession(null);
    localStorage.removeItem('aether_user_id');
    localStorage.removeItem('aether_session_id');
  };

  const switchDemoUser = async (userId: string) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/me', {
        headers: { 'x-user-id': userId },
      });
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
        localStorage.setItem('aether_user_id', data.user.id);
        const newSessId = `sess_${Date.now()}`;
        localStorage.setItem('aether_session_id', newSessId);
        setSession({
          id: newSessId,
          userId: data.user.id,
          deviceName: 'Browser Client',
          browser: 'Chrome 128',
          os: 'System',
          ipAddress: '127.0.0.1',
          location: 'United States',
          isCurrent: true,
          lastActive: new Date().toISOString(),
          createdAt: data.user.createdAt,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (resData.user) {
        setCurrentUser(resData.user);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const updatePrivacy = async (privacy: UserProfile['privacy']): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const res = await fetch('/api/auth/privacy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ privacy }),
      });
      const resData = await res.json();
      if (resData.privacy) {
        setCurrentUser({ ...currentUser, privacy: resData.privacy });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const refreshUser = async () => {
    if (!currentUser) return;
    const res = await fetch('/api/auth/me', {
      headers: { 'x-user-id': currentUser.id },
    });
    const data = await res.json();
    if (data.user) {
      setCurrentUser(data.user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        session,
        isLoading,
        login,
        register,
        requestPhoneOtp,
        verifyPhoneOtp,
        firebasePhoneSignIn,
        firebaseEmailLogin,
        firebaseEmailRegister,
        firebaseGoogleLogin,
        firebaseSendPasswordReset,
        firebaseSyncUser,
        logout,
        switchDemoUser,
        updateProfile,
        updatePrivacy,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
