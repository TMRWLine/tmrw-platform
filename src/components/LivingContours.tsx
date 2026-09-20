import { useEffect, useRef } from 'react';

const LOOPS = [
  'M120 210 C 280 40, 620 20, 920 190 S 1360 430, 1180 610 S 640 780, 220 620 S -20 390, 120 210',
  'M260 120 C 480 -20, 860 60, 1120 240 S 1480 560, 1040 740 S 420 860, 140 520 S 40 260, 260 120',
  'M80 460 C 240 300, 520 240, 820 320 S 1320 520, 1220 720 S 620 860, 180 700 S -40 580, 80 460',
  'M340 680 C 560 540, 860 500, 1160 580 S 1540 780, 1280 900 S 620 980, 260 840 S 120 740, 340 680',
  'M540 80 C 760 -40, 1080 80, 1280 260 S 1420 520, 1080 640 S 520 620, 380 360 S 320 180, 540 80',
  'M40 720 C 220 580, 480 620, 700 760 S 980 980, 620 1040 S 80 980, -40 820 S -60 760, 40 720',
];

export function LivingContours({ invert = false }: { invert?: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stroke = invert ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)';

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    let raf = 0;
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;

    const onMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      targetX = nx * 15;
      targetY = ny * 15;
    };

    const tick = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      wrap.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return (
    <div ref={wrapRef} className="living-contours pointer-events-none" aria-hidden="true">
      <svg
        className="living-contours-svg"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <g
          className="living-contours-drift"
          fill="none"
          stroke={stroke}
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {LOOPS.map((d, i) => (
            <path key={d} className="living-contour-path" d={d} style={{ animationDelay: `${i * -4.2}s` }} />
          ))}
        </g>
      </svg>
    </div>
  );
}
