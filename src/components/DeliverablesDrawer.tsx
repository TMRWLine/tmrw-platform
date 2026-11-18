import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AssetImage } from './AssetImage';
import { FilmGrainOverlay } from './FilmGrainOverlay';
import { createCheckoutSession } from '../lib/checkout';
import { portraitFile, specimenFor } from '../data/roster';
import type { CommercialAthlete, CommercialPackage } from '../data/mockDeliverables';

interface DeliverablesDrawerProps {
  isOpen: boolean;
  athlete: CommercialAthlete;
  onClose: () => void;
  initialTierId?: string;
  onBook?: (pkg: CommercialPackage) => void;
}

interface CanonicalFlight {
  tier_id: string;
  numeral: string;
  code: string;
  badge: string;
  badgeVariant: 'black' | 'yellow' | 'green';
  name: string;
  firstWord: string;
  restWords: string;
  line1: string;
  line2: string;
  price_aud: number;
  price_display: string;
  summary: string;
  specs: readonly { label: string; value: string }[];
  athlete_net: string;
  club_net: string;
  platform_net: string;
  cta_label: string;
}

const CANONICAL_FLIGHTS: readonly CanonicalFlight[] = [
  {
    tier_id: 'local_merchant',
    numeral: '01',
    code: 'PACKAGE 01',
    badge: '5km Lock',
    badgeVariant: 'black',
    name: 'Precinct Contra & Micro',
    firstWord: 'Precinct',
    restWords: 'Contra & Micro',
    line1: '5km Postcode Lock + In-Venue Session',
    line2: 'Quarterly · A$525 Net to Athlete',
    price_aud: 750,
    price_display: 'A$750',
    summary:
      "Own your immediate postcode. Built for local cafes, gyms, and recovery clinics backing an athlete's daily training block through cash and product seeding. Lock out direct local competitors within a 5km radius.",
    specs: [
      { label: 'TERRITORY', value: '5KM POSTCODE COMPETITOR LOCK' },
      { label: 'ACTIVATION', value: '1X IN-VENUE SESSION + COUNTER QR PLAQUE' },
      { label: 'DELIVERABLES', value: '2X AI-CUT 9:16 REELS (WATERMARKED)' },
      { label: 'HANDLE SPONSORSHIP', value: 'API HANDLE LINKING (AD SPEND DIRECT)' },
    ],
    athlete_net: 'A$525',
    club_net: 'A$112.50',
    platform_net: 'A$112.50',
    cta_label: 'LOCK PACKAGE 01',
  },
  {
    tier_id: 'pathway_contender',
    numeral: '02',
    code: 'PACKAGE 02',
    badge: '15km Lock',
    badgeVariant: 'black',
    name: 'Pathway Contender',
    firstWord: 'Pathway',
    restWords: 'Contender',
    line1: '15km District Lock + Training Kit Logo',
    line2: 'Annual Backing · A$2,450 Net to Athlete',
    price_aud: 3500,
    price_display: 'A$3,500',
    summary:
      'Mid-market corporate backing for 18-to-25 contenders dominating televised state leagues (NBL1, Shute Shield, VFL, WNBL). Underwrites competition travel while putting your brand on training kit and verified local feeds.',
    specs: [
      { label: 'TERRITORY', value: '15KM SUBURBAN CLUSTER EXCLUSIVITY' },
      { label: 'BRANDING', value: 'OFFICIAL TRAINING KIT LOGO PLACEMENT' },
      { label: 'ACTIVATION', value: '4X QUARTERLY 9:16 CONTENT DROPS' },
      { label: 'HANDLE SPONSORSHIP', value: 'PAID SOCIAL AMPLIFICATION (15KM)' },
    ],
    athlete_net: 'A$2,450',
    club_net: 'A$525',
    platform_net: 'A$525',
    cta_label: 'LOCK PACKAGE 02',
  },
  {
    tier_id: 'national_challenger',
    numeral: '03',
    code: 'PACKAGE 03',
    badge: 'Popular',
    badgeVariant: 'green',
    name: 'National Challenger',
    firstWord: 'National',
    restWords: 'Challenger',
    line1: 'State-Wide Category Lockout + 4K Media Vault',
    line2: 'Annual Backing · A$8,750 Net to Athlete',
    price_aud: 12500,
    price_display: 'A$12,500',
    summary:
      'Complete state-wide category lockout for national-level contenders. Block every rival brand across your sector, unlock pre-shot 4K broadcast and 9:16 social video stems, and book an executive keynote.',
    specs: [
      { label: 'TERRITORY', value: 'STATE-WIDE 48-SECTOR CATEGORY LOCK' },
      { label: 'MEDIA RIGHTS', value: 'PRE-SHOT 4K BROADCAST & AD STEM VAULT' },
      { label: 'APPEARANCES', value: '1X EXECUTIVE KEYNOTE OR CLINIC' },
      { label: 'HANDLE SPONSORSHIP', value: 'STATE-WIDE API HANDLE LINKING' },
    ],
    athlete_net: 'A$8,750',
    club_net: 'A$1,875',
    platform_net: 'A$1,875',
    cta_label: 'LOCK PACKAGE 03',
  },
  {
    tier_id: 'world_class',
    numeral: '04',
    code: 'PACKAGE 04',
    badge: 'AU & NZ',
    badgeVariant: 'yellow',
    name: 'Trans-Tasman Headline',
    firstWord: 'Trans-Tasman',
    restWords: 'Headline',
    line1: 'Pan-Pacific Licence (AU & NZ) + Keynote',
    line2: 'Headline Partner · A$17,500 Net to Athlete',
    price_aud: 25000,
    price_display: 'A$25,000',
    summary:
      'Headline single-athlete commercial partnership across Australia and New Zealand. Full trans-Tasman digital likeness licensing, direct handle sponsorship, co-branded merch rights, and internal staff town halls.',
    specs: [
      { label: 'TERRITORY', value: 'TRANS-TASMAN EXCLUSIVITY (AU & NZ)' },
      { label: 'COMMERCIAL', value: 'HEADLINE AMBASSADOR, IP & MERCH CAPSULE' },
      { label: 'KEYNOTE', value: 'INTERNAL STAFF TOWN HALL + VIP ACCESS' },
      { label: 'HANDLE SPONSORSHIP', value: 'AU & NZ PAID SOCIAL AMPLIFICATION' },
    ],
    athlete_net: 'A$17,500',
    club_net: 'A$3,750',
    platform_net: 'A$3,750',
    cta_label: 'LOCK PACKAGE 04',
  },
] as const;

function resolveCanonicalTier(rawTierId: string | undefined): CanonicalFlight {
  if (!rawTierId) return CANONICAL_FLIGHTS[0];
  const normalized = rawTierId.toLowerCase();
  if (normalized.includes('pathway') || normalized === '02' || normalized === 'metro') {
    return CANONICAL_FLIGHTS[1];
  }
  if (normalized.includes('challenger') || normalized.includes('national') || normalized === '03') {
    return CANONICAL_FLIGHTS[2];
  }
  if (normalized.includes('world') || normalized.includes('benchmark') || normalized.includes('headline') || normalized === '04' || normalized === 'regional') {
    return CANONICAL_FLIGHTS[3];
  }
  return CANONICAL_FLIGHTS[0];
}

function clubLocality(athlete: CommercialAthlete): string | null {
  const { suburb, state } = athlete.grassroots_club;
  const parts = [suburb, state].filter((part) => part.trim().length > 0);
  return parts.length > 0 ? parts.join(', ') : null;
}

export const DeliverablesDrawer: React.FC<DeliverablesDrawerProps> = ({
  isOpen,
  athlete,
  onClose,
  initialTierId,
}) => {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [activeFlight, setActiveFlight] = useState<CanonicalFlight>(() =>
    resolveCanonicalTier(initialTierId),
  );
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCheckoutLoading(false);
      setCheckoutError(null);
      return;
    }
    setActiveFlight(resolveCanonicalTier(initialTierId));
  }, [isOpen, initialTierId, athlete.id]);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const locality = clubLocality(athlete);
  const specimen = specimenFor(athlete.id);
  const imageFile = portraitFile(specimen?.image ?? athlete.image_url);
  const imageFallbacks = specimen?.imageFallbacks ?? [];

  const triggerCheckout = (flight: CanonicalFlight) => {
    setActiveFlight(flight);
    setCheckoutError(null);
    setCheckoutLoading(true);
    void createCheckoutSession({
      athleteId: athlete.id,
      tierId: flight.tier_id,
      postcode: athlete.postcode,
      athlete: {
        full_name: athlete.full_name,
        grassroots_club_name: athlete.grassroots_club.name,
        image_url: athlete.image_url,
      },
    })
      .then(({ checkoutUrl, sessionId }) => {
        if (!checkoutUrl || !/^cs_(test|live)_[a-zA-Z0-9]+$/.test(sessionId)) {
          throw new Error('Unable to initialise secure checkout.');
        }
        window.location.assign(checkoutUrl);
      })
      .catch((error: unknown) => {
        setCheckoutLoading(false);
        setCheckoutError(
          error instanceof Error ? error.message : 'Unable to initialise secure checkout.',
        );
      });
  };

  return createPortal(
    <div
      data-lenis-prevent="true"
      onClick={onClose}
      className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 selection:bg-[#CCFF00] selection:text-[#080808] animate-fadeIn"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-lenis-prevent="true"
        onWheel={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[1840px] h-[94dvh] rounded-[24px] bg-[#FFFFFF] text-[#080808] shadow-[0_30px_90px_rgba(0,0,0,0.28)] border border-black/10 flex flex-col overflow-hidden"
      >
        <header className="shrink-0 z-30 flex items-center justify-end px-4 sm:px-6 md:px-10 py-3.5 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-black/10">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            title="Close [ESC]"
            aria-label="Close modal"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0F0F11] hover:bg-white text-white hover:text-[#0F0F11] border border-transparent hover:border-black/25 px-5 py-1.5 font-sans text-xs font-bold tracking-tight shadow-sm transition-all duration-300 cursor-pointer group"
          >
            <span>Close</span>
            <span className="text-[11px] text-[#CCFF00] group-hover:text-[#0F0F11] transition-colors">✕</span>
          </button>
        </header>

        <div
          data-lenis-prevent="true"
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 md:px-10 pt-4 pb-10 bg-[#FFFFFF]"
        >
          <div className="mb-4 border-b border-black/10 pb-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 items-center">
              <div className="lg:col-span-1 flex items-center gap-4">
                <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-[14px] bg-[#EAEAE6] overflow-hidden border border-black/10">
                  <AssetImage
                    file={imageFile}
                    fallbackFiles={imageFallbacks}
                    alt={athlete.full_name}
                    className="w-full h-full object-cover filter grayscale hover:grayscale-0 transition-all duration-500"
                  />
                </div>
                <h1
                  id={titleId}
                  className="m-0 font-display text-4xl sm:text-6xl xl:text-[68px] font-black tracking-[-0.04em] leading-[0.86] uppercase text-[#080808]"
                >
                  {athlete.full_name}
                  <span className="text-[#CCFF00]">.</span>
                </h1>
              </div>

              <div className="lg:border-l lg:border-black/10 lg:pl-5">
                <p className="m-0 font-sans text-[14.5px] sm:text-[15.5px] font-bold tracking-[-0.02em] leading-[1.28] text-[#080808]">
                  Four clear packages. Zero talent agency commissions.
                </p>
                <p className="m-0 mt-1 font-sans text-[12px] leading-[1.45] text-neutral-600">
                  Every package includes automated <strong className="text-[#080808]">API handle linking</strong> so your brand can run geo-fenced Meta and TikTok ads straight through{' '}
                  <strong className="text-[#080808]">{athlete.full_name}&apos;s</strong> verified handle.
                </p>
              </div>

              <div className="lg:border-l lg:border-black/10 lg:pl-5">
                <p className="m-0 font-sans text-[12px] leading-[1.45] text-neutral-600">
                  Hardwired{' '}
                  <span className="bg-[#CCFF00] text-[#080808] font-bold px-1.5 py-0.5 rounded-[3px]">
                    70/15/15 split
                  </span>{' '}
                  backing <strong className="text-[#080808]">{athlete.full_name}</strong> and{' '}
                  <strong className="text-[#080808]">{athlete.grassroots_club.name}</strong>
                  {locality ? ` (${locality})` : ''} via instant ATO/IRD tax-deductible RCTI escrow.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 items-center mb-5 gap-5">
            <div>
              <span className="font-sans font-bold text-[14px] text-[#080808] tracking-tight">
                Select commercial package
              </span>
            </div>
            <div>
              <span className="font-sans text-[12.5px] font-normal text-[#080808] tracking-tight">
                4 pre-cleared packages · Direct handle sponsorship included
              </span>
            </div>
            <div className="md:col-span-2 flex items-center justify-end gap-3 font-sans text-[12.5px]">
              <span className="text-neutral-500">Active selection:</span>
              <span className="bg-[#CCFF00] text-[#080808] font-bold px-2.5 py-0.5 rounded-[4px]">
                {activeFlight.code} · {activeFlight.name} ({activeFlight.price_display})
              </span>
            </div>
          </div>

          <ul className="m-0 grid list-none grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-stretch gap-x-5 gap-y-6 p-0 pt-2">
            {CANONICAL_FLIGHTS.map((flight) => {
              const isSelected = flight.tier_id === activeFlight.tier_id;
              const badgeColorClass =
                flight.badgeVariant === 'yellow'
                  ? 'bg-[#FFB800] text-black'
                  : flight.badgeVariant === 'green'
                  ? 'bg-[#CCFF00] text-black'
                  : 'bg-[#0F0F11] text-white';

              return (
                <li key={flight.tier_id} className="m-0 flex min-w-0 flex-col p-0">
                  <article
                    onMouseEnter={() => setActiveFlight(flight)}
                    onClick={() => triggerCheckout(flight)}
                    className={`group relative isolate flex flex-col justify-between rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] transition-all duration-500 cursor-pointer overflow-visible select-none ${
                      isSelected
                        ? 'bg-[#080808] text-white shadow-xl'
                        : 'bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white'
                    }`}
                  >
                    <span
                      className={`absolute -top-2.5 right-5 z-30 rounded-full px-3.5 py-0.5 font-sans text-[11px] font-bold tracking-tight shadow-sm ${badgeColorClass}`}
                    >
                      {flight.badge}
                    </span>

                    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[18px]">
                      <AssetImage
                        file={imageFile}
                        fallbackFiles={imageFallbacks}
                        alt={athlete.full_name}
                        className={`w-full h-full object-cover filter contrast-125 transition-all duration-700 ease-out ${
                          isSelected
                            ? 'grayscale-0 opacity-35 scale-105'
                            : 'grayscale opacity-[0.08] group-hover:grayscale-0 group-hover:opacity-35 scale-100 group-hover:scale-105'
                        }`}
                      />
                      <div
                        className={`absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/40 to-[#080808]/85 transition-opacity duration-500 ${
                          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      />
                      <FilmGrainOverlay intensity="fine" />
                    </div>

                    <div className="relative z-20 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em] leading-snug">
                          <span
                            className={`inline-block rounded-[4px] px-1.5 -ml-1.5 transition-colors duration-200 ${
                              isSelected
                                ? 'bg-[#CCFF00] text-[#080808]'
                                : 'bg-transparent group-hover:bg-[#CCFF00] group-hover:text-[#080808]'
                            }`}
                          >
                            {flight.firstWord}
                          </span>{' '}
                          <span>{flight.restWords}</span>
                        </h3>

                        <p
                          className={`m-0 mt-1 font-sans text-[12.5px] font-normal leading-[1.4] truncate ${
                            isSelected ? 'text-neutral-200' : 'text-[#555555] group-hover:text-neutral-200'
                          }`}
                        >
                          {flight.line1}
                        </p>
                        <p
                          className={`m-0 font-sans text-[12.5px] font-normal leading-[1.4] truncate ${
                            isSelected ? 'text-neutral-300' : 'text-[#555555] group-hover:text-neutral-300'
                          }`}
                        >
                          {flight.line2} · {flight.price_display}
                        </p>
                      </div>

                      <span
                        className={`relative z-30 shrink-0 font-display text-lg font-black tracking-tight ${
                          isSelected ? 'text-[#CCFF00]' : 'text-[#080808] group-hover:text-[#CCFF00]'
                        }`}
                      >
                        {flight.price_display}
                      </span>
                    </div>

                    <div className="relative z-20 my-auto py-3 space-y-3">
                      <p
                        className={`m-0 font-sans text-[12.5px] leading-relaxed ${
                          isSelected ? 'text-neutral-200' : 'text-[#444444] group-hover:text-neutral-200'
                        }`}
                      >
                        {flight.summary}
                      </p>
                      <div
                        className={`divide-y border-y font-mono text-[9.5px] ${
                          isSelected
                            ? 'divide-white/15 border-white/15 text-neutral-300'
                            : 'divide-black/10 border-black/10 text-neutral-600 group-hover:divide-white/15 group-hover:border-white/15 group-hover:text-neutral-300'
                        }`}
                      >
                        {flight.specs.map((s) => (
                          <div key={s.label} className="py-1.5 flex items-center justify-between gap-2">
                            <span className="opacity-70">{s.label}</span>
                            <span className="font-bold text-right">{s.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="relative z-20 mt-auto flex items-end justify-between gap-3 pt-2">
                      <div className="font-display text-[96px] xl:text-[108px] font-black leading-[0.78] tracking-[-0.055em]">
                        {flight.numeral}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerCheckout(flight);
                        }}
                        className={`whitespace-nowrap rounded-full bg-[#CCFF00] text-[#080808] font-mono text-[10px] font-bold uppercase tracking-widest px-4 py-2.5 shadow-lg border-0 cursor-pointer transition-all ${
                          isSelected
                            ? 'opacity-100 translate-y-0'
                            : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
                        }`}
                      >
                        Lock {flight.price_display} →
                      </button>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </div>

        <footer className="shrink-0 z-30 border-t border-black/10 bg-[#FFFFFF] px-4 sm:px-6 md:px-10 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              SELECTED PACKAGE:
            </span>
            <span className="font-display text-lg font-black text-[#080808]">
              {activeFlight.code} · {activeFlight.name} ({activeFlight.price_display})
            </span>
            <span className="hidden md:inline font-mono text-[10px] uppercase tracking-wider text-neutral-500">
              70% Athlete ({activeFlight.athlete_net}) · 15% Club ({activeFlight.club_net}) · 15% Ops ({activeFlight.platform_net}) · Direct Handle Sponsorship
            </span>
          </div>

          <div className="flex items-center gap-3">
            {checkoutError ? (
              <span className="font-sans text-xs font-medium text-[#FF3300]">{checkoutError}</span>
            ) : null}
            <button
              type="button"
              disabled={checkoutLoading}
              onClick={() => triggerCheckout(activeFlight)}
              className="rounded-full border-0 bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] px-7 py-3 font-mono text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors disabled:cursor-wait disabled:opacity-70 shadow-md"
            >
              {checkoutLoading
                ? 'Initialising Stripe Clearing...'
                : `${activeFlight.cta_label} · ${activeFlight.price_display} →`}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
};

export default DeliverablesDrawer;