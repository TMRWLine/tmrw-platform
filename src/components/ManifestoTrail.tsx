import React, { useEffect, useRef } from 'react';
import type { LandingSectionId } from './Navigation';

const PAGE_SHELL = 'max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 w-full';

interface ManifestoTrailProps {
  onNavigateSection?: (id: LandingSectionId) => void;
}

interface HeatNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  intensity: number;
}

export const ManifestoTrail: React.FC<ManifestoTrailProps> = () => {
  const containerRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastMouseRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const nodes: HeatNode[] = [];

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = parent.clientWidth * dpr;
      canvas.height = parent.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const handlePointerMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const prev = lastMouseRef.current ?? { x, y };
      const vx = x - prev.x;
      const vy = y - prev.y;
      const speed = Math.min(Math.hypot(vx, vy), 65);
      lastMouseRef.current = { x, y };

      nodes.push({
        x,
        y,
        vx: vx * 0.18,
        vy: vy * 0.18,
        age: 1.0,
        intensity: Math.max(0.45, Math.min(1.35, speed / 28)),
      });

      if (nodes.length > 55) {
        nodes.shift();
      }
    };

    const container = containerRef.current;
    container?.addEventListener('mousemove', handlePointerMove);

    const renderHeatmapLoop = () => {
      const parent = canvas.parentElement;
      if (parent) {
        ctx.clearRect(0, 0, parent.clientWidth, parent.clientHeight);
      }

      for (let i = nodes.length - 1; i >= 0; i -= 1) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;
        n.vx *= 0.92;
        n.vy *= 0.92;
        n.age *= 0.94;

        if (n.age < 0.02) {
          nodes.splice(i, 1);
          continue;
        }

        const radius = 150 * n.intensity * n.age + 45;
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, radius);

        grad.addColorStop(0, 'rgba(204, 255, 0, ' + n.age * 0.95 + ')');
        grad.addColorStop(0.42, 'rgba(204, 255, 0, ' + n.age * 0.55 + ')');
        grad.addColorStop(0.75, 'rgba(15, 15, 17, ' + n.age * 0.12 + ')');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
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
      className="relative w-full select-none overflow-hidden bg-transparent pt-3 pb-10 md:pt-4 md:pb-14"
    >
      {/* Invisible Kinetic Thermal Heatmap Shader */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 h-full w-full blur-[28px]"
      />

      <div className={PAGE_SHELL + ' relative z-20'}>
        {/* Pangram-Style 3-Card Bento Grid (Exact Box Proportions & Sizing) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          
          {/* Box 1: Carbon Black with White Text & Green Full Stop */}
          <div className="rounded-[28px] bg-[#0F0F11] p-8 sm:p-12 text-white flex flex-col justify-center shadow-2xl border border-neutral-800 relative overflow-hidden min-h-[380px]">
            <h3 className="m-0 font-sans text-4xl sm:text-5xl lg:text-[3.25rem] font-black uppercase tracking-[-0.03em] leading-[1.05] text-white">
              You fill the broadcast slots<span className="text-[#CCFF00]">.</span>
            </h3>
          </div>

          {/* Box 2: Exact "Seeing in Colour" Gradient Background & Size */}
          <div className="rounded-[28px] bg-gradient-to-br from-[#93C5FD] via-[#818CF8] to-[#C084FC] p-8 sm:p-12 text-[#0F0F11] flex flex-col justify-center shadow-2xl border border-indigo-200/50 relative overflow-hidden min-h-[380px]">
            <h3 className="m-0 font-sans text-4xl sm:text-5xl lg:text-[3.25rem] font-black uppercase tracking-tight text-[#0F0F11] leading-[1.05]">
              Now own the upside<span className="text-[#CCFF00]">.</span>
            </h3>
          </div>

          {/* Box 3: Cinematic Image Card using shoe.jpg with Overlaid Narrative Copy */}
          <div className="rounded-[28px] bg-neutral-900 overflow-hidden shadow-2xl border border-neutral-800 relative flex flex-col justify-end p-8 sm:p-12 group min-h-[380px]">
            <img
              src="/shoe.jpg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover contrast-110 opacity-70 group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
            
            <div className="relative z-10">
              <p className="m-0 font-sans text-sm sm:text-base font-medium leading-[1.45] text-white tracking-[-0.01em]">
                Networks bank the broadcast ratings while you fund the runway. tmrw
                <span className="text-[#CCFF00] font-black">/.</span> cuts out the middleman, locking in direct brand cash, direct handle sponsorship, and a hardwired{' '}
                <span className="bg-[#CCFF00] text-[#0F0F11] font-bold px-1 py-0.5 rounded-[2px]">
                  70/15/15 split
                </span>{' '}
                straight to your bank and junior club.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default ManifestoTrail;