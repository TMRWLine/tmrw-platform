import React from 'react';
import type { LandingSectionId } from './Navigation';
import { CourtLinesOverlay } from './CourtLinesOverlay';
import { RollingPillButton } from './RollingPillButton';

/** Shared editorial plumb line for the hero card and every section beneath it. */
export const PAGE_SHELL = 'max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 w-full';

interface CoverHeroProps {
  /**
   * Optional host router. The landing page owns smooth-scroll (Lenis), so when provided it
   * lands precisely under the fixed bar. Falls back to a native smooth scroll against `#roster`.
   */
  onNavigateSection?: (id: LandingSectionId) => void;
}

export const CoverHero: React.FC<CoverHeroProps> = ({ onNavigateSection }) => {
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });

  const scrollToRoster = () => {
    if (onNavigateSection) {
      onNavigateSection('roster');
      return;
    }
    document.getElementById('roster')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="pb-4">
      <section
        aria-label="tmrw cover"
        className="relative flex min-h-[80vh] w-full select-none flex-col justify-between overflow-hidden rounded-[28px] border border-[#EAEAEA] bg-[#080808] p-8 shadow-sm md:rounded-[32px] md:p-14"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width - 0.5;
          const y = (e.clientY - rect.top) / rect.height - 0.5;
          setMousePos({ x: x * 36, y: y * 36 });
        }}
        onMouseLeave={() => setMousePos({ x: 0, y: 0 })}
      >
        {/* Full-bleed photography */}
        <img
          src="/coverpage.jpg"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-center"
        />

        {/* Atmospheric warm red rim-light, left of subject. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_20%_40%,rgba(235,59,48,0.30)_0%,transparent_60%)]"
        />

        {/* Subtle vignette to keep the photograph dark and cinematic. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/15"
        />

        {/* Cursor-tracking ambient bloom: low and wide so it adds depth without washing the silhouette.
            No film grain on this card: it degrades the silhouette edges. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 transition-transform duration-500 ease-out"
          style={{
            transform: `translate3d(${mousePos.x * 0.6}px, ${mousePos.y * 0.6}px, 0)`,
            background:
              'radial-gradient(ellipse 70% 50% at 50% 65%, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.6) 80%, transparent 100%)',
          }}
        />

        <CourtLinesOverlay />

        {/* Centred content lockup. `my-auto` centres it inside the justify-between column. */}
        <div className="relative z-20 my-auto flex flex-col items-center text-center">
          <span className="mb-6 self-center rounded-full bg-[#B8FF00] px-3.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[#080808] shadow-md">
            Olympic Runway // LA 2028 · Brisbane 2032
          </span>
          <h1 className="m-0 inline-flex items-baseline justify-center text-center font-display text-6xl font-extrabold tracking-tight text-[#F7F7F6] drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)] md:text-8xl">
            Line up your future
            <span
              aria-hidden="true"
              className="ml-2 inline-block h-3.5 w-3.5 align-baseline rounded-full bg-[#CCFF00] shadow-[0_0_14px_rgba(204,255,0,0.85)] md:h-4 md:w-4"
            />
          </h1>
          <div className="mx-auto mb-6 max-w-xl space-y-3 text-center font-sans">
            <p className="text-sm font-normal leading-relaxed text-white/95 md:text-base">
              The grind starts long before the spotlight.{' '}
              <span className="rounded-sm bg-[#CCFF00] px-1.5 py-0.5 font-semibold text-black">tmrw/.</span>{' '}
              connects emerging athletes with brands looking to support the next generation of talent, from first grade through to Olympic and Paralympic competition.
            </p>
            <p className="text-sm font-normal leading-relaxed text-white/95 md:text-base">
              <span className="rounded-sm bg-[#CCFF00] px-1.5 py-0.5 font-semibold text-black">No agents</span>.{' '}
              <span className="rounded-sm bg-[#CCFF00] px-1.5 py-0.5 font-semibold text-black">No chasing payments</span>. Just{' '}
              <span className="rounded-sm bg-[#CCFF00] px-1.5 py-0.5 font-semibold text-black">secure deals</span>, fast payouts, and a clean split supporting your local club and your journey to LA 2028, Brisbane 2032, and beyond.
            </p>
          </div>

          <div className="mx-auto mb-6 mt-12 flex w-full max-w-lg flex-wrap items-center justify-center gap-4">
            {/* Action buttons maintain pristine spacing mirroring the top Olympic badge frame */}
            <RollingPillButton variant="primary" onClick={scrollToRoster}>
              Explore the Roster
            </RollingPillButton>
            <RollingPillButton
              variant="glass"
              onClick={() => {
                if (onNavigateSection) {
                  onNavigateSection('syndicate');
                  return;
                }
                window.location.assign('/brisbane-2032-runway');
              }}
            >
              Brisbane 2032 Runway
            </RollingPillButton>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CoverHero;
