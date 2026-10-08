import React, { useState } from 'react';
import { VerificationCategory, VerificationStatus } from '../../types/index.js';
import { CheckCircle2, ShieldCheck, Building2, UserCheck, Award } from 'lucide-react';

interface VerifiedBadgeProps {
  status?: VerificationStatus;
  category?: VerificationCategory;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  status = 'verified',
  category = 'individual',
  size = 'sm',
  showLabel = false,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  if (status !== 'verified') return null;

  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const categoryConfig: Record<VerificationCategory, { icon: typeof ShieldCheck; label: string; bg: string; text: string }> = {
    official: {
      icon: Award,
      label: 'Official Platform Account',
      bg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
      text: 'text-cyan-400',
    },
    organization: {
      icon: Building2,
      label: 'Verified Organization',
      bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      text: 'text-blue-400',
    },
    business: {
      icon: ShieldCheck,
      label: 'Verified Business',
      bg: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
      text: 'text-indigo-400',
    },
    individual: {
      icon: UserCheck,
      label: 'Verified Public Figure',
      bg: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
      text: 'text-sky-400',
    },
  };

  const config = categoryConfig[category] || categoryConfig.individual;
  const IconComponent = config.icon;

  return (
    <span
      className="relative inline-flex items-center shrink-0 cursor-help"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      aria-label={config.label}
    >
      <span className={`inline-flex items-center justify-center rounded-full ${config.text}`}>
        <CheckCircle2 className={`${sizeClasses[size]} fill-current text-slate-950`} />
      </span>

      {showLabel && (
        <span className="ml-1 text-xs font-medium text-cyan-400">
          Verified
        </span>
      )}

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-none">
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-slate-900 border border-slate-700 text-slate-200 rounded shadow-xl whitespace-nowrap">
            <IconComponent className="w-3 h-3 text-cyan-400" />
            <span>{config.label}</span>
          </div>
        </div>
      )}
    </span>
  );
};
