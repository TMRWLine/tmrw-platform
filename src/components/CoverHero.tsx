import type { MouseEvent } from 'react';
import { COMMERCIAL_TIERS_PATH, HOW_IT_WORKS_PATH, isPlainLinkActivation } from '../lib/routes';
import type { LandingSectionId } from './Navigation';
import './CoverHero.css';

export const PAGE_SHELL = 'max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 w-full';

interface CoverHeroProps {
  onNavigateSection?: (id: LandingSectionId) => void;
}

const ACTIONS = [
  { id: 'how-it-works', href: HOW_IT_WORKS_PATH, label: 'Athletes: See how it works' },
  { id: 'commercial-tiers', href: COMMERCIAL_TIERS_PATH, label: 'Businesses: View sponsorship options' },
] as const;

export function CoverHero({ onNavigateSection }: CoverHeroProps) {
  function follow(event: MouseEvent<HTMLAnchorElement>, id: LandingSectionId) {
    if (!onNavigateSection || !isPlainLinkActivation(event)) return;
    event.preventDefault();
    onNavigateSection(id);
  }

  return (
    <section
      aria-label="tmrw cover"
      className="relative isolate mb-12 flex min-h-[min(720px,78svh)] items-end overflow-hidden border border-white/10 bg-[#080808] px-5 pb-10 pt-44 text-[#F7F7F6] sm:mb-20 sm:px-10 sm:pb-14 lg:px-16"
    >
      <img
        src="/coverpage.jpg"
        alt=""
        width={612}
        height={407}
        fetchPriority="high"
        className="cover-hero-still pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover"
      />
      <div aria-hidden="true" className="cover-hero-scrim pointer-events-none absolute inset-0 -z-10" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-5 top-8 border-t border-white/25 sm:inset-x-10 lg:inset-x-16" />
      <div className="max-w-3xl">
        <h1 id="cover-heading" className="m-0 font-display text-[clamp(2.5rem,9vw,7.25rem)] font-extrabold leading-[0.92] tracking-[-0.065em]">
          <span className="block overflow-hidden pb-[0.1em]"><span className="cover-hero-line block">Line up your</span></span>{' '}
          <span className="block overflow-hidden pb-[0.12em]">
            <span className="cover-hero-line cover-hero-line-next block">
              future<span aria-hidden="true" className="cover-hero-dot ml-[0.1em] inline-block size-[0.14em] rounded-full bg-volt" />
            </span>
          </span>
        </h1>
        <p className="m-0 mt-4 max-w-[37ch] text-base leading-relaxed sm:text-lg">
          Local businesses back athletes and the clubs behind them.
        </p>
        <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
          {ACTIONS.map(({ id, href, label }, index) => (
            <a
              key={id}
              href={href}
              onClick={(event) => follow(event, id)}
              className={`cover-hero-action flex min-h-11 items-center justify-between gap-4 border px-4 py-2.5 text-sm font-semibold leading-tight no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-volt active:underline ${
                index === 0
                  ? 'border-[#F7F7F6] bg-[#F7F7F6] text-[#080808] hover:bg-white'
                  : 'border-[#F7F7F6]/70 bg-[#080808] text-[#F7F7F6] hover:border-white hover:bg-white hover:text-[#080808]'
              }`}
            >
              {label}<span aria-hidden="true" className="cover-hero-arrow shrink-0">↗</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
