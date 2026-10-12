import React, { useState, useEffect } from 'react';
import { Download, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      setShowGuide(true);
      return;
    }
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  if (isInstalled) return null;

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-cyan-300 bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-800/60 rounded-xl transition shadow-sm cursor-pointer"
        title="Install Aether on Android / Mobile"
      >
        <Download className="w-3.5 h-3.5 text-cyan-400" />
        <span>{isAndroid ? 'Install Android App' : isIOS ? 'Install iOS App' : 'Install App'}</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Download className="w-4 h-4 text-cyan-400" />
              <span>Install Aether on {isAndroid ? 'Android' : isIOS ? 'iPhone' : 'Your Device'}</span>
            </h3>
            
            {isAndroid ? (
              <div className="text-xs text-slate-300 space-y-2">
                <p>To install directly from your browser to your home screen:</p>
                <ol className="space-y-1.5 text-[11px] text-slate-400 pl-4 list-decimal">
                  <li>Tap the browser menu <strong className="text-cyan-300">⋮ (three dots)</strong> in Chrome / Brave.</li>
                  <li>Select <strong className="text-cyan-300">&ldquo;Install App&rdquo;</strong> or <strong className="text-cyan-300">&ldquo;Add to Home screen&rdquo;</strong>.</li>
                  <li>Confirm installation. The app will launch in full standalone native view without browser bars!</li>
                </ol>
                <div className="pt-2">
                  <a
                    href="/downloads/aether-android-project.zip"
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                    download
                  >
                    <span>Download Android Studio Project (.zip)</span>
                  </a>
                </div>
              </div>
            ) : isIOS ? (
              <div className="text-xs text-slate-300 space-y-2">
                <p>To install on iPhone or iPad:</p>
                <ol className="space-y-1.5 text-[11px] text-slate-400 pl-4 list-decimal">
                  <li>Tap the <strong className="text-cyan-300">Share</strong> icon at bottom of Safari.</li>
                  <li>Scroll down and choose <strong className="text-cyan-300">&ldquo;Add to Home Screen&rdquo;</strong>.</li>
                  <li>Tap <strong className="text-cyan-300">Add</strong> at top right.</li>
                </ol>
              </div>
            ) : (
              <div className="text-xs text-slate-300 space-y-2">
                <p>Click the install icon in your address bar or download the Android Studio project archive.</p>
                <a
                  href="/downloads/aether-android-project.zip"
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  download
                >
                  <span>Download Android Project (.zip)</span>
                </a>
              </div>
            )}

            <button
              onClick={() => setShowGuide(false)}
              className="w-full rounded-xl bg-cyan-500 hover:bg-cyan-400 py-2 text-xs font-bold text-slate-950 transition cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
