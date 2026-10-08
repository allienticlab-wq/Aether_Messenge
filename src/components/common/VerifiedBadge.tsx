import React, { useState, useRef, useEffect } from 'react';
import { VerificationCategory, VerificationStatus } from '../../types/index.js';
import {
  ShieldCheck,
  Building2,
  UserCheck,
  Award,
  X,
  Check,
  ShieldAlert,
  Headphones,
  Sparkles,
  ExternalLink,
  Shield
} from 'lucide-react';

export interface VerifiedBadgeProps {
  status?: VerificationStatus;
  category?: VerificationCategory;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  showPill?: boolean;
  pillVariant?: 'subtle' | 'solid';
  username?: string;
  displayName?: string;
  showPopover?: boolean;
  verifiedAt?: string;
  className?: string;
}

interface BadgeConfig {
  icon: typeof ShieldCheck;
  label: string;
  pillText: string;
  type: string;
  badgeColor: string;
  badgeFillHex: string;
  glowColor: string;
  pillClasses: string;
  description: string;
  pillar1Title: string;
  pillar1Desc: string;
  pillar2Title: string;
  pillar2Desc: string;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  status = 'verified',
  category = 'creator',
  size = 'sm',
  showLabel = false,
  showPill = false,
  pillVariant = 'subtle',
  username,
  displayName,
  showPopover = true,
  verifiedAt,
  className = '',
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
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6',
  };

  const pillSizeClasses = {
    xs: 'text-[9px] px-1 py-0.5 gap-0.5',
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-[11px] px-2 py-0.5 gap-1.5',
    lg: 'text-xs px-2.5 py-1 gap-1.5',
    xl: 'text-sm px-3 py-1 gap-2',
  };

  // Badge configuration based on requested verification badges:
  // 'Verified Creator', 'Business', 'Support', 'Official', 'Organization'
  const categoryConfigs: Record<string, BadgeConfig> = {
    creator: {
      icon: Sparkles,
      label: 'Verified Creator',
      pillText: 'Verified Creator',
      type: 'Notable Creator & Public Contributor',
      badgeColor: 'text-sky-400',
      badgeFillHex: '#38bdf8',
      glowColor: 'shadow-sky-500/20',
      pillClasses: 'bg-sky-500/15 border-sky-400/30 text-sky-300 hover:bg-sky-500/25',
      description: 'This profile is verified as an authentic public creator, digital artist, educator, or key community figure on Aether.',
      pillar1Title: 'Identity Authenticated',
      pillar1Desc: 'Government ID, verified portfolio, and authentic platform credentials confirmed.',
      pillar2Title: 'Anti-Impersonation Protection',
      pillar2Desc: 'Exclusive name reservation safeguarding audience trust against identity fraud.',
    },
    individual: {
      icon: Sparkles,
      label: 'Verified Creator',
      pillText: 'Verified Creator',
      type: 'Notable Creator & Public Contributor',
      badgeColor: 'text-sky-400',
      badgeFillHex: '#38bdf8',
      glowColor: 'shadow-sky-500/20',
      pillClasses: 'bg-sky-500/15 border-sky-400/30 text-sky-300 hover:bg-sky-500/25',
      description: 'This profile is verified as an authentic public creator, digital artist, educator, or key community figure on Aether.',
      pillar1Title: 'Identity Authenticated',
      pillar1Desc: 'Government ID, verified portfolio, and authentic platform credentials confirmed.',
      pillar2Title: 'Anti-Impersonation Protection',
      pillar2Desc: 'Exclusive name reservation safeguarding audience trust against identity fraud.',
    },
    business: {
      icon: ShieldCheck,
      label: 'Verified Business',
      pillText: 'Business',
      type: 'Commercial Entity & Merchant Account',
      badgeColor: 'text-emerald-400',
      badgeFillHex: '#34d399',
      glowColor: 'shadow-emerald-500/20',
      pillClasses: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/25',
      description: 'This account has provided official documentation proving genuine corporate or commercial business registration.',
      pillar1Title: 'Commercial Entity Verified',
      pillar1Desc: 'Company registration number, merchant domain, and authorized representative authenticated.',
      pillar2Title: 'Trusted Merchant Guarantee',
      pillar2Desc: 'Validated business channel providing verified communications and customer support.',
    },
    support: {
      icon: Headphones,
      label: 'Official Support',
      pillText: 'Support',
      type: 'Platform Support & Customer Care',
      badgeColor: 'text-purple-400',
      badgeFillHex: '#c084fc',
      glowColor: 'shadow-purple-500/20',
      pillClasses: 'bg-purple-500/15 border-purple-400/30 text-purple-200 hover:bg-purple-500/25',
      description: 'This is an authorized official platform support agent helping users with technical questions, account recovery, and security.',
      pillar1Title: 'Authorized Support Channel',
      pillar1Desc: 'Vetted platform operations personnel authorized to handle customer inquiries.',
      pillar2Title: 'Platform Safety Channel',
      pillar2Desc: 'Zero-trust communication channel directly connected to platform engineering.',
    },
    official: {
      icon: Award,
      label: 'Official Platform Account',
      pillText: 'Official',
      type: 'Core Platform System Profile',
      badgeColor: 'text-cyan-400',
      badgeFillHex: '#22d3ee',
      glowColor: 'shadow-cyan-500/20',
      pillClasses: 'bg-cyan-500/15 border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/25',
      description: 'This is an authentic official platform account maintained directly by the Aether executive and operations teams.',
      pillar1Title: 'Root System Identity',
      pillar1Desc: 'Direct administrative authority and cryptographic platform attestation.',
      pillar2Title: 'Authentic Broadcaster',
      pillar2Desc: 'Guaranteed genuine communications for system announcements and security alerts.',
    },
    organization: {
      icon: Building2,
      label: 'Verified Organization',
      pillText: 'Organization',
      type: 'Institution & Non-Profit Entity',
      badgeColor: 'text-blue-400',
      badgeFillHex: '#60a5fa',
      glowColor: 'shadow-blue-500/20',
      pillClasses: 'bg-blue-500/15 border-blue-400/30 text-blue-300 hover:bg-blue-500/25',
      description: 'This account has been verified as a registered NGO, academic institution, research lab, or nonprofit organization.',
      pillar1Title: 'Non-Profit / NGO Authenticated',
      pillar1Desc: 'Charitable or institutional credentials validated by compliance review.',
      pillar2Title: 'Verified Public Voice',
      pillar2Desc: 'Protected identity ensuring trustworthy communication with platform members.',
    },
  };

  const key = (category as string) || 'creator';
  const config = categoryConfigs[key] || categoryConfigs.creator;
  const CategoryIcon = config.icon;

  const togglePopover = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showPopover) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <span className={`relative inline-flex items-center shrink-0 align-middle ${className}`}>
      {/* Interactive Trigger Button with Scalloped Rosette Seal */}
      <button
        ref={triggerRef}
        type="button"
        onClick={togglePopover}
        title={`Verified Account: ${config.label} (Click for details)`}
        className={`inline-flex items-center rounded-full transition-transform duration-150 focus:outline-none ${
          showPopover ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'
        }`}
        aria-label={`Verified badge: ${config.label}`}
      >
        {/* Scalloped Verified Seal Icon */}
        <span
          className={`inline-flex items-center justify-center shrink-0 ${config.badgeColor} drop-shadow-sm`}
        >
          <svg
            viewBox="0 0 24 24"
            className={`${sizeClasses[size]} shrink-0`}
            fill="currentColor"
          >
            {/* 12-point scalloped rosette seal path */}
            <path
              d="M12 1L14.4 3.75L18 3.65L19.3 7.05L22.65 8.35L22.55 12L25.3 14.4L22.55 16.8L22.65 20.45L19.3 21.75L18 25.15L14.4 25.05L12 27.8L9.6 25.05L6 25.15L4.7 21.75L1.35 20.45L1.45 16.8L-1.3 14.4L1.45 12L1.35 8.35L4.7 7.05L6 3.65L9.6 3.75L12 1Z"
              transform="scale(0.85) translate(2, 2)"
            />
            {/* Crisp center checkmark */}
            <path
              d="M9 12.5L11.5 15L16 9.5"
              fill="none"
              stroke="#090d16"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        {/* Dynamic Official Badge Pill (e.g. 'Verified Creator', 'Business', 'Support') */}
        {(showPill || showLabel) && (
          <span
            className={`ml-1 inline-flex items-center font-medium rounded-full border border-solid transition-colors ${
              config.pillClasses
            } ${pillSizeClasses[size]}`}
          >
            <CategoryIcon className="w-2.5 h-2.5 shrink-0" />
            <span className="font-semibold tracking-tight whitespace-nowrap">
              {config.pillText}
            </span>
          </span>
        )}
      </button>

      {/* Interactive Verification Details Popover */}
      {showPopover && isOpen && (
        <div
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 sm:w-84 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-slate-100 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
          style={{ minWidth: '310px' }}
        >
          {/* Popover Arrow Indicator */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-3 h-3 bg-slate-900 border-r border-b border-slate-700/80 rotate-45" />

          {/* Header Lockup */}
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3 min-w-0">
              {/* Glowing Rosette Seal Graphic */}
              <div
                className={`w-11 h-11 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center shrink-0 shadow-lg ${config.glowColor}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`w-7 h-7 ${config.badgeColor}`}
                  fill="currentColor"
                >
                  <path
                    d="M12 1L14.4 3.75L18 3.65L19.3 7.05L22.65 8.35L22.55 12L25.3 14.4L22.55 16.8L22.65 20.45L19.3 21.75L18 25.15L14.4 25.05L12 27.8L9.6 25.05L6 25.15L4.7 21.75L1.35 20.45L1.45 16.8L-1.3 14.4L1.45 12L1.35 8.35L4.7 7.05L6 3.65L9.6 3.75L12 1Z"
                    transform="scale(0.85) translate(2, 2)"
                  />
                  <path
                    d="M9 12.5L11.5 15L16 9.5"
                    fill="none"
                    stroke="#090d16"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-bold text-sm text-slate-100 truncate">
                  <span className="truncate">{displayName || 'Verified Account'}</span>
                </div>
                {username && (
                  <div className="text-[11px] text-slate-400 font-mono truncate">
                    @{username}
                  </div>
                )}
                {/* Official Badge Pill */}
                <div
                  className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${config.pillClasses}`}
                >
                  <CategoryIcon className="w-2.5 h-2.5" />
                  <span>{config.label}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition shrink-0"
              title="Close"
              aria-label="Close verification details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Explanation Body */}
          <div className="py-3 space-y-2.5 text-xs">
            <p className="text-slate-300 leading-relaxed text-[11.5px]">
              {config.description}
            </p>

            {/* Verification Guarantee Pillars */}
            <div className="p-2.5 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-2">
              <div className="flex items-start gap-2">
                <div className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <div className="leading-tight">
                  <span className="font-semibold text-slate-200 text-[11px]">
                    {config.pillar1Title}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {config.pillar1Desc}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="p-0.5 rounded-full bg-cyan-500/20 text-cyan-400 shrink-0 mt-0.5">
                  <ShieldCheck className="w-3 h-3 stroke-[3]" />
                </div>
                <div className="leading-tight">
                  <span className="font-semibold text-slate-200 text-[11px]">
                    {config.pillar2Title}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {config.pillar2Desc}
                  </p>
                </div>
              </div>
            </div>

            {verifiedAt && (
              <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                <span>Verified Date:</span>
                <span className="font-mono text-slate-300">
                  {new Date(verifiedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1 text-slate-400 font-medium">
              <Shield className="w-3 h-3 text-cyan-400" />
              <span>Aether Trust & Safety Certified</span>
            </span>
            <span className="font-semibold text-cyan-400">Official Mark</span>
          </div>
        </div>
      )}
    </span>
  );
};
