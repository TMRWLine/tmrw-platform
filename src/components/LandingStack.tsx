import { useEffect, useRef, useState, type ReactNode } from 'react';

export function LandingStackSlot({
  z,
  children,
  initiallyActive = false,
  surface = 'carbon',
  id,
}: {
  z: number;
  children: ReactNode;
  initiallyActive?: boolean;
  surface?: 'carbon' | 'cotton';
  id?: string;
}) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(initiallyActive);

  useEffect(() => {
    const el = slotRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setActive(entry.isIntersecting && entry.intersectionRatio >= 0.42);
      },
      { threshold: [0.2, 0.42, 0.65, 0.9] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={slotRef} className="landing-stack-slot" id={id} style={{ zIndex: z }}>
      <div
        className={`landing-stack-card sticky top-0 h-screen overflow-hidden rounded-t-3xl ${
          surface === 'cotton' ? 'landing-stack-card-cotton' : 'landing-stack-card-carbon'
        }${active ? ' is-active' : ''}`}
      >
        {surface === 'carbon' ? <TopoOverlay /> : null}
        <div className="landing-stack-inner">{children}</div>
      </div>
    </div>
  );
}

export function TopoOverlay() {
  return (
    <svg
      className="landing-topo pointer-events-none"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <g fill="none" stroke="#FFFFFF" strokeWidth="1.1">
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
        <path d="M-40 180 C 180 80, 420 260, 640 150 S 1040 40, 1500 220" />
        <path d="M-40 250 C 200 150, 460 330, 700 210 S 1100 90, 1500 290" />
        <path d="M-40 320 C 220 220, 500 400, 760 270 S 1160 140, 1500 360" />
        <path d="M-40 390 C 240 290, 540 470, 820 340 S 1220 190, 1500 430" />
        <path d="M-40 540 C 160 470, 420 610, 680 520 S 1100 430, 1500 560" />
      </g>
    </svg>
  );
}
