import React, { createContext, useContext, useState, useEffect } from 'react';
import { WhiteLabelBranding } from '../types/index.js';

interface BrandingContextType {
  branding: WhiteLabelBranding;
  theme: 'dark' | 'light' | 'amoled';
  setTheme: (theme: 'dark' | 'light' | 'amoled') => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  updateBranding: (newBranding: Partial<WhiteLabelBranding>) => Promise<void>;
}

const defaultBranding: WhiteLabelBranding = {
  appName: 'Aether Messenger',
  appShortName: 'Aether',
  appDomain: 'Aether.xperiserv.in',
  appLogo: '/icon.svg',
  appLogoDark: '/icon.svg',
  appFavicon: '/icon.svg',
  primaryColor: '#06b6d4',
  secondaryColor: '#3b82f6',
  accentColor: '#8b5cf6',
  description: 'Futuristic white-label real-time messaging, audio/video calling, and collaboration platform.',
  companyName: 'Allientic Lab Technologies',
  companyAddress: 'Allientic Lab Technologies, India',
  supportEmail: 'support@xperiserv.in',
  developerName: 'Allientic Lab Technologies',
  websiteUrl: 'https://Aether.xperiserv.in',
  privacyUrl: '/privacy',
  termsUrl: '/terms',
  cookiesUrl: '/cookies',
};

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<WhiteLabelBranding>(defaultBranding);
  const [theme, setTheme] = useState<'dark' | 'light' | 'amoled'>('dark');
  const [accentColor, setAccentColor] = useState<string>('#06b6d4');

  useEffect(() => {
    // Fetch live branding from backend
    fetch('/api/branding')
      .then(res => res.json())
      .then(data => {
        if (data.branding) {
          setBranding(data.branding);
          if (data.branding.primaryColor) {
            setAccentColor(data.branding.primaryColor);
          }
          // Dynamically update document title
          document.title = data.branding.appName;
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-dark', 'theme-light', 'theme-amoled');
    root.classList.add(`theme-${theme}`);
    if (theme === 'amoled') {
      document.body.style.backgroundColor = '#000000';
    } else if (theme === 'light') {
      document.body.style.backgroundColor = '#f8fafc';
    } else {
      document.body.style.backgroundColor = '#090d16';
    }
  }, [theme]);

  const updateBranding = async (newBranding: Partial<WhiteLabelBranding>) => {
    try {
      const res = await fetch('/api/admin/branding', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'usr_admin', // admin authorization
        },
        body: JSON.stringify(newBranding),
      });
      const data = await res.json();
      if (data.branding) {
        setBranding(data.branding);
        document.title = data.branding.appName;
      }
    } catch (e) {
      console.error('Failed to update branding:', e);
    }
  };

  return (
    <BrandingContext.Provider value={{ branding, theme, setTheme, accentColor, setAccentColor, updateBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding must be used within BrandingProvider');
  return ctx;
};
