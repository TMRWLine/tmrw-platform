import { type ReactNode } from 'react';

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
      <TopoOverlay invert={surface === 'cotton'} />
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
  const voltClass = `${wordClass} text-[#D2FF00] drop-shadow-[0_0_12px_rgba(210,255,0,0.7)]`;

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

export function TopoOverlay({ invert = false }: { invert?: boolean }) {
  const stroke = invert ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.06)';

  return (
    <svg
      className="landing-topo pointer-events-none"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <g className="landing-topo-drift" fill="none" stroke={stroke} strokeWidth="1.15" strokeLinecap="round">
        <ellipse cx="1080" cy="420" rx="120" ry="54" />
        <ellipse cx="1080" cy="420" rx="210" ry="96" />
        <ellipse cx="1080" cy="420" rx="310" ry="148" />
        <ellipse cx="1080" cy="420" rx="430" ry="210" />
        <ellipse cx="1080" cy="420" rx="560" ry="280" />
        <ellipse cx="1080" cy="420" rx="710" ry="360" />
        <ellipse cx="1080" cy="420" rx="860" ry="430" />
        <ellipse cx="220" cy="760" rx="90" ry="40" />
        <ellipse cx="220" cy="760" rx="170" ry="78" />
        <ellipse cx="220" cy="760" rx="270" ry="128" />
        <ellipse cx="220" cy="760" rx="390" ry="188" />
        <ellipse cx="220" cy="760" rx="520" ry="250" />
        <ellipse cx="640" cy="160" rx="80" ry="36" />
        <ellipse cx="640" cy="160" rx="160" ry="72" />
        <ellipse cx="640" cy="160" rx="260" ry="118" />
        <ellipse cx="980" cy="780" rx="110" ry="48" />
        <ellipse cx="980" cy="780" rx="200" ry="92" />
        <ellipse cx="980" cy="780" rx="310" ry="146" />
        <path d="M-80 120 C 160 40, 380 210, 620 110 S 1020 20, 1540 180" />
        <path d="M-80 190 C 180 90, 420 280, 680 170 S 1100 70, 1540 250" />
        <path d="M-80 260 C 200 160, 460 350, 740 230 S 1160 120, 1540 320" />
        <path d="M-80 330 C 220 230, 500 420, 800 300 S 1220 170, 1540 390" />
        <path d="M-80 400 C 240 300, 540 490, 860 370 S 1280 220, 1540 460" />
        <path d="M-80 470 C 180 400, 440 560, 720 470 S 1180 360, 1540 530" />
        <path d="M-80 540 C 160 470, 420 610, 680 520 S 1100 430, 1540 600" />
        <path d="M-80 610 C 200 540, 480 690, 760 600 S 1200 500, 1540 670" />
        <path d="M-80 680 C 220 610, 520 760, 820 670 S 1260 560, 1540 740" />
        <path d="M-80 750 C 180 700, 460 820, 780 740 S 1180 640, 1540 810" />
        <path d="M220 -40 C 280 140, 180 320, 340 480 S 160 720, 300 960" />
        <path d="M720 -40 C 800 160, 640 340, 780 520 S 620 740, 760 960" />
        <path d="M1180 -40 C 1260 180, 1100 360, 1240 540 S 1080 760, 1220 960" />
      </g>
    </svg>
  );
}
