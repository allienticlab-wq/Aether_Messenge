import React from 'react';
import { MessageSquare, Globe2, Award, Settings, QrCode } from 'lucide-react';

interface MobileNavBarProps {
  activeTab: 'chats' | 'communities' | 'verification' | 'settings';
  onSelectTab: (tab: 'chats' | 'communities' | 'verification' | 'settings') => void;
  onOpenNewChat: () => void;
  onOpenQrScanner?: () => void;
  unreadCount: number;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({
  activeTab,
  onSelectTab,
  onOpenNewChat,
  onOpenQrScanner,
  unreadCount,
}) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800/80 backdrop-blur-lg pb-safe">
      <div className="grid grid-cols-5 items-center h-16 px-1">
        <button
          onClick={() => onSelectTab('chats')}
          className={`min-h-[44px] flex flex-col items-center justify-center transition ${
            activeTab === 'chats' ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full bg-cyan-500 text-slate-950 text-[9px] font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-1">Chats</span>
        </button>

        <button
          onClick={() => onSelectTab('communities')}
          className={`min-h-[44px] flex flex-col items-center justify-center transition ${
            activeTab === 'communities' ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe2 className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Communities</span>
        </button>

        {/* Center Linked Devices / QR Scanner */}
        <button
          onClick={() => onOpenQrScanner?.()}
          className="min-h-[44px] flex flex-col items-center justify-center text-cyan-400 hover:text-cyan-300 transition"
          title="Scan QR Code to Login on PC/Laptop"
        >
          <div className="p-2 rounded-2xl bg-cyan-950/80 border border-cyan-500/50 shadow-sm shadow-cyan-950 -mt-3 text-cyan-300">
            <QrCode className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight font-medium text-cyan-400 mt-0.5">Link Web</span>
        </button>

        <button
          onClick={() => onSelectTab('verification')}
          className={`min-h-[44px] flex flex-col items-center justify-center transition ${
            activeTab === 'verification' ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Award className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Badges</span>
        </button>

        <button
          onClick={() => onSelectTab('settings')}
          className={`min-h-[44px] flex flex-col items-center justify-center transition ${
            activeTab === 'settings' ? 'text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-1">Settings</span>
        </button>
      </div>
    </div>
  );
};
