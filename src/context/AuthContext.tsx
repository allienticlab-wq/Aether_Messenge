import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserSession } from '../types/index.js';

interface AuthContextType {
  currentUser: UserProfile | null;
  session: UserSession | null;
  isLoading: boolean;
  login: (identifier: string, password: string, mfaCode?: string) => Promise<{ success: boolean; requireMfa?: boolean; error?: string }>;
  register: (data: { email?: string; username: string; displayName: string; password: string; phone?: string }) => Promise<{ success: boolean; error?: string }>;
  requestPhoneOtp: (phone: string) => Promise<{ success: boolean; error?: string; previewCode?: string }>;
  verifyPhoneOtp: (phone: string, code: string, profile?: { displayName?: string; avatarUrl?: string }) => Promise<{ success: boolean; error?: string; isNewUser?: boolean }>;
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
      .then(res => {
        if (!res.ok) throw new Error('Session invalid');
        return res.json();
      })
      .then(data => {
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
          // Stale credentials in localStorage
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
