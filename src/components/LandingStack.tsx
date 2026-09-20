import { type ReactNode } from 'react';
import { LivingContours } from './LivingContours';

const CARD_CLASS =
  'landing-stack-card h-screen w-full overflow-hidden flex flex-col justify-between rounded-t-3xl border-t border-white/15 shadow-[0_-20px_50px_rgba(0,0,0,0.9)]';

export function LandingStackSlot({
  z,
  children,
  surface = 'carbon',
  id,
  sticky = true,
}: {
  z: number;
  children: ReactNode;
  surface?: 'carbon' | 'cotton';
  id?: string;
  sticky?: boolean;
}) {
  const surfaceClass = surface === 'cotton' ? 'landing-stack-card-cotton' : 'landing-stack-card-carbon';
  const card = (
    <div
      id={id}
      className={`${CARD_CLASS} ${sticky ? 'sticky top-0' : 'landing-hslide-panel'} ${surfaceClass}`}
      style={{ zIndex: z }}
    >
      <LivingContours invert={surface === 'cotton'} />
      <div className="landing-stack-inner">{children}</div>
    </div>
  );

  if (!sticky) return card;

  return (
    <div className="relative w-full landing-stack-slot" style={{ zIndex: z }}>
      {card}
    </div>
  );
}

export function BrandLockup({
  onClick,
  size = 'header',
}: {
  onClick?: () => void;
  size?: 'header' | 'footer';
}) {
  const wordClass =
    size === 'header'
      ? 'font-black text-3xl md:text-4xl tracking-tight leading-none'
      : 'font-black text-2xl tracking-tight leading-none';
  const voltClass = `${wordClass} text-[#D2FF00] drop-shadow-[0_0_10px_rgba(210,255,0,0.6)]`;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'transparent',
        backgroundColor: 'transparent',
        border: 'none',
        padding: 0,
        margin: 0,
        boxShadow: 'none',
      }}
      className="text-left cursor-pointer group focus:outline-none !bg-transparent !border-0 !shadow-none"
      aria-label="Return to home"
    >
      <div className={`flex items-baseline font-sans !bg-transparent ${wordClass}`}>
        <span className={`brand-wordmark text-white ${wordClass}`}>tmrw</span>
        <span className={`brand-volt-mark animate-pulse mx-[1px] ${voltClass}`}>/</span>
        <span className={`brand-volt-mark ${voltClass}`}>.</span>
      </div>
      <span className="block text-[10px] font-mono tracking-[0.35em] text-zinc-400 mt-1 uppercase leading-none !bg-transparent">
        LINE UP YOUR FUTURE
      </span>
    </button>
  );
}

export { LivingContours as TopoOverlay } from './LivingContours';
