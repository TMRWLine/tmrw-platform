import React, { useEffect, useRef, useState } from 'react';
import { PAGE_SHELL } from './CoverHero';

interface TrailCard {
  id: number;
  x: number;
  y: number;
  rotation: number;
  src: string;
}

const ATHLETE_POOL = [
  '/coverpage.jpg',
  '/coverpage.jpg',
  '/coverpage.jpg',
  '/coverpage.jpg',
  '/coverpage.jpg',
  '/coverpage.jpg',
];

const TRAIL_ANIM_CSS =
  '@keyframes trailPop {' +
  '0% { opacity: 0; transform: translate(-50%, -50%) scale(0.45); }' +
  '18% { opacity: 0.92; transform: translate(-50%, -50%) scale(1); }' +
  '100% { opacity: 0; transform: translate(-50%, -60%) scale(1.05); }' +
  '}' +
  '.trail-card-anim { animation: trailPop 820ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }';

export const ManifestoTrail: React.FC = () => {
  const containerRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastSpawnPos = useRef({ x: 0, y: 0 });
  const imageIndexRef = useRef(0);
  const trailIdCounter = useRef(0);
  const [cards, setCards] = useState<TrailCard[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const points: Array<{ x: number; y: number; age: number }> = [];

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = parent.clientWidth * dpr;
      canvas.height = parent.clientHeight * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const handlePointerMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const dx = x - lastSpawnPos.current.x;
      const dy = y - lastSpawnPos.current.y;
      const dist = Math.hypot(dx, dy);

      points.push({ x, y, age: 1.0 });

      if (dist > 70) {
        lastSpawnPos.current = { x, y };
        const src = ATHLETE_POOL[imageIndexRef.current % ATHLETE_POOL.length];
        imageIndexRef.current += 1;
        const id = (trailIdCounter.current += 1);
        const rotation = Math.max(-10, Math.min(10, dx * 0.16));

        setCards((prev) => [...prev.slice(-6), { id, x, y, rotation, src }]);

        window.setTimeout(() => {
          setCards((prev) => prev.filter((item) => item.id !== id));
        }, 820);
      }
    };

    const container = containerRef.current;
    container?.addEventListener('mousemove', handlePointerMove);

    const renderHeatmapLoop = () => {
      const parent = canvas.parentElement;
      if (parent) {
        ctx.clearRect(0, 0, parent.clientWidth, parent.clientHeight);
      }

      for (let i = points.length - 1; i >= 0; i -= 1) {
        const pt = points[i];
        pt.age *= 0.935;

        if (pt.age < 0.02) {
          points.splice(i, 1);
          continue;
        }

        const radius = 180 * pt.age + 50;
        const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius);

        grad.addColorStop(0, 'rgba(15, 15, 17, ' + pt.age * 0.38 + ')');
        grad.addColorStop(0.35, 'rgba(204, 255, 0, ' + pt.age * 0.88 + ')');
        grad.addColorStop(0.7, 'rgba(204, 255, 0, ' + pt.age * 0.35 + ')');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = window.requestAnimationFrame(renderHeatmapLoop);
    };

    renderHeatmapLoop();

    return () => {
      window.removeEventListener('resize', resize);
      container?.removeEventListener('mousemove', handlePointerMove);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <section
      ref={containerRef}
      aria-label="Athlete commercial manifesto"
      className="relative w-full select-none overflow-hidden bg-transparent pt-20 pb-16 md:pt-32 md:pb-24"
    >
      <style>{TRAIL_ANIM_CSS}</style>

      {/* Unboxed Full-Bleed Thermal Heatmap Canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 h-full w-full blur-[32px]"
      />

      {/* Velocity-Spawned Borderless Monochrome Athlete Trail */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        {cards.map((card) => (
          <div
            key={card.id}
            style={{
              left: card.x + 'px',
              top: card.y + 'px',
              transform: 'translate(-50%, -50%) rotate(' + card.rotation + 'deg)',
            }}
            className="trail-card-anim absolute h-52 w-40 overflow-hidden bg-neutral-950 shadow-[0_20px_50px_rgba(0,0,0,0.25)] md:h-64 md:w-48"
          >
            <img
              src={card.src}
              alt=""
              className="h-full w-full object-cover grayscale contrast-125"
            />
          </div>
        ))}
      </div>

      {/* Monumental Poster-Grid Layout */}
      <div className={PAGE_SHELL + ' relative z-35'}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
          {/* Left Column: Edge-to-Edge Monumental Headline */}
          <div className="lg:col-span-7">
            <h2 className="m-0 font-sans text-6xl sm:text-7xl lg:text-[7rem] font-black tracking-[-0.05em] text-neutral-900 leading-[0.88] uppercase">
              You fill the broadcast slots. Now own the upside
              <span className="text-[#CCFF00] drop-shadow-[0_0_20px_rgba(204,255,0,0.8)]">.</span>
            </h2>
          </div>

          {/* Right Column: Balanced Sub-Dek */}
          <div className="lg:col-span-5 lg:pt-4">
            <p className="m-0 font-sans text-lg sm:text-xl md:text-2xl font-normal leading-[1.42] text-neutral-700 tracking-tight">
              Networks bank the broadcast ratings while you fund the runway. tmrw
              <span className="text-[#CCFF00] font-bold">/.</span> cuts out the middleman, locking in{' '}
              <span className="text-neutral-900 font-bold underline decoration-[#CCFF00] decoration-3 underline-offset-6">
                direct brand cash
              </span>
              , hyper-local feed whitelisting, and a hardwired{' '}
              <span className="inline-block rounded bg-[#CCFF00] px-2.5 py-0.5 font-bold text-black leading-none shadow-sm">
                70/15/15 split
              </span>{' '}
              straight to your bank and junior club.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ManifestoTrail;