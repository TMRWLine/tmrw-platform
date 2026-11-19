import React from 'react';

interface RollingPillButtonProps {
  children: React.ReactNode;
  href: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  variant?: 'primary' | 'glass';
  className?: string;
}

export const RollingPillButton: React.FC<RollingPillButtonProps> = ({
  children,
  href,
  onClick,
  variant = 'primary',
  className = '',
}) => {
  const baseStyles =
    'group relative inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2.5 text-xs font-medium tracking-tight overflow-hidden no-underline motion-safe:transition-colors duration-200 cursor-pointer select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-6';

  const variantStyles =
    variant === 'glass'
      ? 'bg-transparent text-white border border-white/60 hover:bg-white hover:text-[#080808] hover:border-white backdrop-blur-sm'
      : 'bg-white text-[#080808] border border-white hover:bg-volt hover:border-volt hover:text-[#080808] shadow-sm';

  return (
    <a
      href={href}
      onClick={onClick}
      onPointerMove={(event) => {
        if (event.pointerType !== 'mouse' || !window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return;
        const { offsetX, offsetY } = event.nativeEvent;
        const target = event.currentTarget;
        target.style.setProperty('--pill-x', `${(offsetX / target.offsetWidth - 0.5) * 8}px`);
        target.style.setProperty('--pill-y', `${(offsetY / target.offsetHeight - 0.5) * 6}px`);
      }}
      onPointerLeave={(event) => {
        event.currentTarget.style.removeProperty('--pill-x');
        event.currentTarget.style.removeProperty('--pill-y');
      }}
      className={`cover-pill ${baseStyles} ${variantStyles} ${className}`}
    >
      {/* Precision height container matching font line-height */}
      <span className="pointer-events-none relative block h-[15px] overflow-hidden leading-[15px]">
        {/* Primary resting label: slides up and out on hover */}
        <span className="block whitespace-nowrap motion-safe:transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-safe:group-hover:-translate-y-full">
          {children}
        </span>
        {/* Secondary reveal label: slides up into view from below on hover (hidden from assistive tech to avoid duplicate announcement) */}
        <span
          aria-hidden="true"
          className="absolute top-full left-0 block w-full whitespace-nowrap motion-safe:transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-safe:group-hover:-translate-y-full"
        >
          {children}
        </span>
      </span>
    </a>
  );
};

export default RollingPillButton;
