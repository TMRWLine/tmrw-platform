import type { ReactNode } from 'react';

export function RollingPillButton({ children, onClick, variant = 'primary' }: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'glass';
}) {
  const base = 'group relative inline-flex items-center justify-center rounded-full px-6 py-2.5 text-xs font-medium tracking-tight overflow-hidden transition-all duration-200 cursor-pointer select-none';
  const colour = variant === 'glass'
    ? 'bg-transparent text-white border border-white/60 hover:bg-white hover:text-[#080808] hover:border-white backdrop-blur-sm'
    : 'bg-white text-[#080808] border border-white hover:bg-[#B8FF00] hover:border-[#B8FF00] hover:text-[#080808] shadow-sm';
  const roll = 'block whitespace-nowrap transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-full';
  return (
    <button type="button" onClick={onClick} className={`${base} ${colour}`}>
      <span className="relative block h-[15px] overflow-hidden leading-[15px]">
        <span className={roll}>{children}</span>
        <span aria-hidden="true" className={`absolute top-full left-0 w-full ${roll}`}>{children}</span>
      </span>
    </button>
  );
}
