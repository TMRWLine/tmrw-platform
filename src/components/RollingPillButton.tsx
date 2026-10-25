import React from 'react';

interface RollingPillButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'glass';
  className?: string;
}

export const RollingPillButton: React.FC<RollingPillButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  className = '',
}) => {
  const baseStyles =
    'group relative inline-flex items-center justify-center rounded-full px-6 py-2.5 text-xs font-medium tracking-tight overflow-hidden transition-all duration-200 cursor-pointer select-none';

  const variantStyles =
    variant === 'glass'
      ? 'bg-transparent text-white border border-white/60 hover:bg-white hover:text-[#080808] hover:border-white backdrop-blur-sm'
      : 'bg-white text-[#080808] border border-white hover:bg-[#B8FF00] hover:border-[#B8FF00] hover:text-[#080808] shadow-sm';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${baseStyles} ${variantStyles} ${className}`}
    >
      {/* Precision height container matching font line-height */}
      <span className="relative block h-[15px] overflow-hidden leading-[15px]">
        {/* Primary resting label: slides up and out on hover */}
        <span className="block whitespace-nowrap transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-full">
          {children}
        </span>
        {/* Secondary reveal label: slides up into view from below on hover (hidden from assistive tech to avoid duplicate announcement) */}
        <span
          aria-hidden="true"
          className="absolute top-full left-0 block w-full whitespace-nowrap transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-full"
        >
          {children}
        </span>
      </span>
    </button>
  );
};

export default RollingPillButton;
