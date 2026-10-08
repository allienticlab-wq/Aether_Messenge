import React, { useState, useRef, useEffect } from 'react';
import { VerificationCategory, VerificationStatus } from '../../types/index.js';
import { ShieldCheck, Building2, UserCheck, Award, X, Check, ShieldAlert } from 'lucide-react';

interface VerifiedBadgeProps {
  status?: VerificationStatus;
  category?: VerificationCategory;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  username?: string;
  displayName?: string;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  status = 'verified',
  category = 'individual',
  size = 'sm',
  showLabel = false,
  username,
  displayName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (status !== 'verified') return null;

  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const categoryConfig: Record<
    VerificationCategory,
    {
      icon: typeof ShieldCheck;
      label: string;
      badgeColor: string;
      badgeFill: string;
      description: string;
      type: string;
    }
  > = {
    official: {
      icon: Award,
      label: 'Official Platform Account',
      type: 'Official System Profile',
      badgeColor: 'text-cyan-400',
      badgeFill: '#22d3ee',
      description: 'This is an authentic official platform account maintained directly by the Aether operations team.',
    },
    organization: {
      icon: Building2,
      label: 'Verified Organization',
      type: 'Corporate & Entity Profile',
      badgeColor: 'text-blue-400',
      badgeFill: '#60a5fa',
      description: 'This account has been verified as a registered legal entity, corporation, or non-profit organization.',
    },
    business: {
      icon: ShieldCheck,
      label: 'Verified Business',
      type: 'Commercial Business Profile',
      badgeColor: 'text-indigo-400',
      badgeFill: '#818cf8',
      description: 'This business account has provided official documentation establishing genuine merchant identity.',
    },
    individual: {
      icon: UserCheck,
      label: 'Verified Public Figure',
      type: 'Notable Individual Profile',
      badgeColor: 'text-sky-400',
      badgeFill: '#38bdf8',
      description: 'This profile has been verified as an authentic public figure, verified creator, or key platform contributor.',
    },
  };

  const config = categoryConfig[category] || categoryConfig.individual;
  const CategoryIcon = config.icon;

  return (
    <span className="relative inline-flex items-center shrink-0">
      {/* Trigger Button with authentic Scalloped Verified Seal */}
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        title={`Verified Account: ${config.label} (Click for details)`}
        className="inline-flex items-center gap-1 focus:outline-none rounded-full transition transform hover:scale-110 active:scale-95 cursor-pointer"
        aria-label={`Verified badge: ${config.label}`}
      >
        <span className={`inline-flex items-center justify-center shrink-0 ${config.badgeColor}`}>
          {/* Authentic Scalloped Verified Seal SVG with checkmark */}
          <svg
            viewBox="0 0 24 24"
            className={`${sizeClasses[size]} drop-shadow-sm`}
            fill="currentColor"
          >
            <path d="M12 1L14.4 3.75L18 3.65L19.3 7.05L22.65 8.35L22.55 12L25.3 14.4L22.55 16.8L22.65 20.45L19.3 21.75L18 25.15L14.4 25.05L12 27.8L9.6 25.05L6 25.15L4.7 21.75L1.35 20.45L1.45 16.8L-1.3 14.4L1.45 12L1.35 8.35L4.7 7.05L6 3.65L9.6 3.75L12 1Z"
              transform="scale(0.85) translate(2, 2)"
            />
            {/* White checkmark inside badge */}
            <path
              d="M9 12.5L11.5 15L16 9.5"
              fill="none"
              stroke="#090d16"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        {showLabel && (
          <span className="ml-1 text-[11px] font-semibold text-cyan-400">
            Verified
          </span>
        )}
      </button>

      {/* Interactive Verification Details Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-80 sm:w-84 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-slate-100 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
          style={{ minWidth: '310px' }}
        >
          {/* Popover Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-3 h-3 bg-slate-900 border-r border-b border-slate-700/80 rotate-45" />

          {/* Header Card */}
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-cyan-400" fill="currentColor">
                  <path d="M12 2L14.4 4.5L17.8 4.6L18.9 7.8L22 9.2L21.7 12.6L24 15L21.7 17.4L22 20.8L18.9 22.2L17.8 25.4L14.4 25.5L12 28L9.6 25.5L6.2 25.4L5.1 22.2L2 20.8L2.3 17.4L0 15L2.3 12.6L2 9.2L5.1 7.8L6.2 4.6L9.6 4.5L12 2Z"
                    transform="scale(0.85) translate(2, 2)"
                  />
                  <path
                    d="M9 12.5L11.5 15L16 9.5"
                    fill="none"
                    stroke="#090d16"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-bold text-sm text-slate-100">
                  <span className="truncate">{displayName || 'Verified Account'}</span>
                  <Check className="w-4 h-4 text-cyan-400 stroke-[3]" />
                </div>
                {username && (
                  <div className="text-[11px] text-slate-400 font-mono">@{username}</div>
                )}
                <div className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-semibold text-cyan-300">
                  <CategoryIcon className="w-2.5 h-2.5" />
                  <span>{config.label}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Explanation Body */}
          <div className="py-3 space-y-2.5 text-xs">
            <p className="text-slate-300 leading-relaxed text-[11.5px]">
              {config.description}
            </p>

            {/* Checklist of what the mark signifies */}
            <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-start gap-2">
                <div className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <div className="leading-tight">
                  <span className="font-semibold text-slate-200 text-[11px]">Identity Authenticated</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Phone number and official identification verified.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="p-0.5 rounded-full bg-cyan-500/20 text-cyan-400 shrink-0 mt-0.5">
                  <ShieldCheck className="w-3 h-3 stroke-[3]" />
                </div>
                <div className="leading-tight">
                  <span className="font-semibold text-slate-200 text-[11px]">Anti-Impersonation Protected</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Guaranteed exclusive verified badge to safeguard platform users from fraud.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1 text-slate-500 font-medium">
              <ShieldAlert className="w-3 h-3 text-cyan-500" />
              Trust & Safety Verified
            </span>
            <span className="text-cyan-400 font-semibold">Active Mark</span>
          </div>
        </div>
      )}
    </span>
  );
};
