import React, { useEffect, useId, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { OLYMPIC_CONTENDERS } from '../data/olympicContenders';
import { OLYMPIC_HORIZONS, type OlympicHorizonSpec } from '../data/olympicHorizons';
import type { LandingSectionId } from './Navigation';
import { FilmGrainOverlay } from './FilmGrainOverlay';
import { issuePostcodeWhitelistingGrant, type WhitelistingGrant } from '../lib/whitelisting';
import { WhitelistingLaunchModal } from './WhitelistingLaunchModal';
import {
  StripeEscrowCheckoutModal,
  type StripeCheckoutPayload,
  type StripeEscrowReceipt,
} from './StripeEscrowCheckoutModal';

interface SyndicateRunwayProps {
  onNavigateSection?: (id: LandingSectionId) => void;
  onOpenSyndicateEnquiry?: () => void;
}

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const DIPTYCH_EASE_CSS = 'cubic-bezier(0.22, 1, 0.36, 1)';

const VELODROME_IMAGE = '/syndicate/velodrome.jpg';
const CARBON_BLADE_CLOSEUP_IMAGE = '/syndicate/image_9d87cf0b.jpg';

const VELODROME_WARM_GRADE =
  'absolute inset-0 h-full w-full object-cover contrast-[1.14] brightness-[0.92] saturate-[0.88] select-none transition-transform duration-1000 ease-out';

const CARBON_BLADE_WARM_CROP =
  'absolute inset-0 h-full w-full object-cover contrast-[1.24] brightness-[0.92] sepia-[0.28] hue-rotate-[-10deg] saturate-[1.4] select-none transition-transform duration-1000 ease-out origin-bottom';

export const LIT_OBSIDIAN_BTN =
  'bg-[#0F0F11] text-white font-mono font-bold text-xs py-4 px-7 rounded-xl border border-white/15 transition-all uppercase tracking-wider text-center cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-2px_0_rgba(0,0,0,0.8),0_10px_25px_rgba(0,0,0,0.45),0_0_15px_rgba(204,255,0,0.18)] hover:bg-neutral-900 hover:border-[#CCFF00]/60 hover:text-[#CCFF00] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-2px_0_rgba(0,0,0,0.9),0_15px_30px_rgba(0,0,0,0.6),0_0_28px_rgba(204,255,0,0.35)] active:translate-y-[1px]';

const INDUSTRIES = [
  { id: 'banking', name: 'Banking & Wealth', slot: '1 of 1 AU/NZ Slot Open', lock: 'Locks out all rival retail, private & institutional banks' },
  { id: 'telco', name: 'Telco & Technology', slot: '1 of 1 AU/NZ Slot Open', lock: 'Locks out all rival mobile carriers, cloud & enterprise tech' },
  { id: 'energy', name: 'Energy & Resources', slot: '1 of 1 AU/NZ Slot Open', lock: 'Locks out all rival power, renewables & resource leaders' },
  { id: 'aviation', name: 'Aviation & Automotive', slot: '1 of 1 AU/NZ Slot Open', lock: 'Locks out all rival airlines, EV & automotive marques' },
  { id: 'health', name: 'Insurance & Healthcare', slot: '1 of 1 AU/NZ Slot Open', lock: 'Locks out all rival health, life & general insurers' },
  { id: 'retail', name: 'National Retail & Luxury', slot: '1 of 1 AU/NZ Slot Open', lock: 'Locks out all rival national retail, apparel & FMCG leaders' },
] as const;

const BESPOKE_PILLARS = [
  {
    id: 'rule40_media',
    name: 'Rule 40 Broadcast & Paid Social Whitelisting (OAuth)',
    kicker: '0% agency markup · Ad spend billed direct to your Meta/TikTok',
    summary:
      'Pre-cleared 4K campaign stems registered prior to the AOC/IPC Rule 40 blackout window, plus direct Meta Partnership & TikTok Spark handle linking.',
  },
  {
    id: 'executive_esg',
    name: 'Boardroom Keynotes & ASX/NZX ESG Attribution',
    kicker: 'Tailored to corporate calendar',
    summary:
      'Executive town halls, leadership offsites, and audited quarterly ESG & disability inclusion impact reporting across the athlete and their junior club.',
  },
  {
    id: 'grassroots_rd',
    name: 'Grassroots Club Precinct & Product Co-Creation',
    kicker: '15% club dividend activation',
    summary:
      'Branded junior development clinics at the athlete’s home club plus custom product seeding, adaptive equipment R&D, and VIP trials hospitality.',
  },
] as const;

const CONTENDER_SPECIMENS = [
  {
    id: 'vance' as const,
    ...OLYMPIC_CONTENDERS.vance,
    initials: 'CV',
    club: `${OLYMPIC_CONTENDERS.vance.clubName} (Postcode ${OLYMPIC_CONTENDERS.vance.postcode})`,
    pathway: 'LA 2028 & Brisbane 2032 Olympic Contender',
    badge: '1 Telco & 1 Bank Slot Open',
    badgeTone: 'green' as const,
    src: VELODROME_IMAGE,
    fallbackSrc: '/portraits/sienna_blake.jpg',
    grade: VELODROME_WARM_GRADE,
    position: 'center 28%',
    activeScale: 'scale-100',
    inactiveScale: 'scale-105',
  },
  {
    id: 'mercer' as const,
    ...OLYMPIC_CONTENDERS.mercer,
    initials: 'LM',
    club: `${OLYMPIC_CONTENDERS.mercer.clubName} (Postcode ${OLYMPIC_CONTENDERS.mercer.postcode})`,
    pathway: 'LA 2028 & Brisbane 2032 Paralympic Contender',
    badge: 'Rule 40 Pre-Cleared',
    badgeTone: 'yellow' as const,
    src: CARBON_BLADE_CLOSEUP_IMAGE,
    fallbackSrc: '/portraits/marcus_thorne.jpg',
    grade: CARBON_BLADE_WARM_CROP,
    position: 'center 92%',
    activeScale: 'scale-[1.45]',
    inactiveScale: 'scale-[1.52]',
  },
] as const;

type ContenderId = (typeof CONTENDER_SPECIMENS)[number]['id'];
type IndustryId = (typeof INDUSTRIES)[number]['id'];

const FIELD_LABEL = 'font-mono text-[9px] tracking-[0.2em] text-white/45 uppercase block mb-1.5';
const FIELD_INPUT =
  'w-full bg-[#0B0B0D] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-[#CCFF00] caret-[#CCFF00]';

function EditorialDiptych({
  activeHorizon,
  focus,
  onSelectFocus,
  onDirectStripeLock,
}: {
  activeHorizon: OlympicHorizonSpec;
  focus: ContenderId;
  onSelectFocus: (next: ContenderId) => void;
  onDirectStripeLock: (contenderId: ContenderId) => void;
}) {
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState<ContenderId | null>(null);
  const activeFocus = hovered ?? focus;
  const duration = reduced ? '0.01s' : '0.85s';

  return (
    <div className="flex h-full min-h-[64vh] w-full min-w-0 flex-col justify-between lg:min-h-0">
      <div className="relative flex min-h-[35rem] flex-1 gap-4 overflow-visible">
        {CONTENDER_SPECIMENS.map((specimen) => {
          const active = activeFocus === specimen.id;
          const otherSpecimen =
            CONTENDER_SPECIMENS.find((s) => s.id !== specimen.id) ?? CONTENDER_SPECIMENS[0];

          return (
            <article
              key={specimen.id}
              onPointerEnter={(event) => {
                if (event.pointerType === 'mouse') setHovered(specimen.id);
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === 'mouse') setHovered(null);
              }}
              onClick={() => onSelectFocus(specimen.id)}
              className="group relative min-w-0 cursor-pointer overflow-visible rounded-[18px] bg-[#141416] p-7 xl:p-8 flex flex-col justify-between select-none"
              style={{
                flexGrow: active ? 2.45 : 0.68,
                flexShrink: 1,
                flexBasis: 0,
                transition: `flex-grow ${duration} ${DIPTYCH_EASE_CSS}`,
              }}
            >
              <span
                className={`absolute -top-2.5 right-5 z-30 inline-flex items-center rounded-full px-3.5 py-0.5 font-sans text-[11px] font-bold tracking-tight shadow-xs ${
                  specimen.badgeTone === 'green'
                    ? 'bg-[#CCFF00] text-[#080808]'
                    : 'bg-[#F5B800] text-[#080808]'
                }`}
              >
                {specimen.badge}
              </span>

              <div
                className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[18px]"
                style={{
                  opacity: active ? 1 : 0.48,
                  transition: `opacity ${duration} ${DIPTYCH_EASE_CSS}`,
                }}
              >
                <img
                  src={specimen.src}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.endsWith(specimen.fallbackSrc)) {
                      target.src = specimen.fallbackSrc;
                    }
                  }}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className={`${specimen.grade} ${active ? specimen.activeScale : specimen.inactiveScale}`}
                  style={{ objectPosition: specimen.position }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-amber-950/15 to-black/80" />
                <FilmGrainOverlay intensity="fine" />
              </div>

              <div className="relative z-20 flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <h3 className="m-0 font-sans text-[18px] xl:text-[19px] font-bold tracking-[-0.025em] leading-[1.25] text-white whitespace-nowrap">
                    <span
                      className={`inline-block rounded-[4px] px-1.5 -ml-1.5 mr-1 transition-colors duration-200 ${
                        active ? 'bg-[#CCFF00] text-[#080808]' : 'bg-transparent text-white'
                      }`}
                    >
                      {specimen.firstInitial}
                    </span>
                    <span>{specimen.surname}</span>
                  </h3>

                  <div
                    className={`transition-opacity duration-300 ${
                      active ? 'opacity-100' : 'opacity-0 pointer-events-none hidden sm:block'
                    }`}
                  >
                    <p className="m-0 pt-0.5 font-sans text-[12.5px] font-normal tracking-[-0.01em] leading-[1.38] text-neutral-200">
                      {specimen.sport}
                    </p>
                    <p className="m-0 font-sans text-[12.5px] font-normal tracking-[-0.01em] leading-[1.38] text-neutral-300">
                      {activeHorizon.horizonTag} · {activeHorizon.priceFormatted}
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative z-20 mt-auto pt-6">
                <div
                  className={`font-display text-[120px] xl:text-[138px] font-black leading-[0.8] tracking-[-0.055em] -ml-1 text-white transition-all duration-300 ${
                    active ? 'opacity-0 translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0'
                  }`}
                >
                  {specimen.initials}
                </div>

                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute inset-x-0 bottom-0 h-10 rounded-full bg-[#FFFFFF] text-[#080808] shadow-[0_12px_32px_rgba(0,0,0,0.45)] px-2 flex items-center justify-between gap-2 transition-all duration-300 ${
                    active ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectFocus(otherSpecimen.id)}
                    className="h-7 rounded-full bg-transparent hover:bg-black/10 text-[#080808] px-2.5 font-sans text-[11.5px] font-semibold tracking-tight flex items-center gap-1.5 cursor-pointer border-0 transition-colors truncate"
                  >
                    <span>‹›</span>
                    <span className="truncate">
                      {specimen.fullName} · 70% (A${activeHorizon.athleteNet.toLocaleString()})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDirectStripeLock(specimen.id)}
                    className="h-7 rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] px-3.5 font-sans text-[11.5px] font-bold tracking-tight flex items-center gap-1.5 shrink-0 cursor-pointer border-0 transition-colors"
                  >
                    <span>Lock {activeHorizon.priceFormatted}</span>
                    <span className="text-[10px]">→</span>
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function SyndicateApplicationDrawer({
  isOpen,
  onClose,
  selectedHorizon,
  onSelectHorizon,
  selectedContenderId,
  onSelectContenderId,
  onLaunchStripeModal,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedHorizon: OlympicHorizonSpec;
  onSelectHorizon: (t: OlympicHorizonSpec) => void;
  selectedContenderId: ContenderId;
  onSelectContenderId: (id: ContenderId) => void;
  onLaunchStripeModal: (sectorLabel: string) => void;
}) {
  const titleId = useId();
  const [step, setStep] = useState<1 | 2>(1);
  const [industryId, setIndustryId] = useState<IndustryId | null>('telco');
  const [customSector, setCustomSector] = useState('');
  const [selectedPillars, setSelectedPillars] = useState<string[]>(['rule40_media', 'executive_esg']);
  const [customBrief, setCustomBrief] = useState('');

  const industry = INDUSTRIES.find((item) => item.id === industryId) ?? INDUSTRIES[0];
  const activeSectorLabel = customSector.trim() || industry.name;

  useEffect(() => {
    if (isOpen) setStep(1);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  const togglePillar = (id: string) => {
    setSelectedPillars((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      data-lenis-prevent="true"
      onWheel={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[90] flex justify-end"
    >
      <button
        type="button"
        aria-label="Close partnership application"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default border-0 bg-black/65 p-0 backdrop-blur-md"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-lenis-prevent="true"
        onWheel={(e) => e.stopPropagation()}
        className="relative z-10 flex h-dvh w-full max-w-[580px] flex-col border-l border-white/15 bg-[#0F0F11] text-white shadow-2xl overflow-hidden"
      >
        <header className="shrink-0 z-20 border-b border-white/10 bg-[#0F0F11] px-6 py-4 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id={titleId} className="m-0 font-display text-2xl font-bold tracking-tight text-white uppercase">
                {selectedHorizon.priceFormatted} · {selectedHorizon.horizonTag}<span className="text-[#CCFF00]">.</span>
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close portal"
              className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-white/10 hover:bg-white text-white hover:text-[#080808] px-4 py-1.5 font-sans text-xs font-bold transition-colors border-0"
            >
              Close ✕
            </button>
          </div>

          <div className="mt-3.5 grid grid-cols-3 gap-2">
            {OLYMPIC_HORIZONS.map((t) => {
              const isSelected = t.id === selectedHorizon.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelectHorizon(t)}
                  className={`rounded-xl border p-2.5 text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#CCFF00] bg-white/[0.08] text-white'
                      : 'border-white/10 bg-black/30 text-neutral-400 hover:border-white/25'
                  }`}
                >
                  <div className="font-display text-base font-black leading-none text-white">
                    {t.priceFormatted}
                  </div>
                  <div className="font-sans text-[10.5px] mt-1 text-neutral-300 truncate">
                    {t.horizonTag}
                  </div>
                </button>
              );
            })}
          </div>

          <ol className="mt-2.5 mb-0 grid list-none grid-cols-2 gap-2 p-0">
            {(
              [
                [1, '01. Category Exclusivity'],
                [2, '02. Bespoke Charter'],
              ] as const
            ).map(([index, label]) => {
              const active = step === index;
              return (
                <li
                  key={index}
                  onClick={() => setStep(index)}
                  className={`rounded-xl border px-3 py-2 cursor-pointer transition-colors ${
                    active ? 'border-[#CCFF00] bg-[#CCFF00]/10 text-white' : 'border-white/10 bg-black/20 text-neutral-400'
                  }`}
                >
                  <span className="block font-sans text-xs font-bold truncate">{label}</span>
                </li>
              );
            })}
          </ol>
        </header>

        <div
          data-lenis-prevent="true"
          onWheel={(e) => e.stopPropagation()}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-5 sm:px-8 space-y-4"
        >
          {step === 1 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {INDUSTRIES.map((item) => {
                  const active = industryId === item.id && !customSector.trim();
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setIndustryId(item.id);
                        setCustomSector('');
                      }}
                      className={`cursor-pointer rounded-2xl border p-3.5 text-left transition-colors ${
                        active
                          ? 'border-[#CCFF00] bg-white/[0.06]'
                          : 'border-white/10 bg-black/25 hover:border-white/25'
                      }`}
                    >
                      <span className="block font-mono text-[9px] uppercase text-[#CCFF00]">
                        {item.slot}
                      </span>
                      <span className="mt-1 block font-sans text-sm font-bold text-white">
                        {item.name}
                      </span>
                      <span className="mt-1 block font-sans text-xs text-neutral-400">
                        {item.lock}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div>
                <label className={FIELD_LABEL}>
                  Or nominate another major enterprise category (48-Sector Ledger)
                </label>
                <input
                  type="text"
                  value={customSector}
                  onChange={(e) => setCustomSector(e.target.value)}
                  placeholder="e.g. Luxury Watchmaking, Logistics, Enterprise SaaS, Agribusiness..."
                  className={FIELD_INPUT}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <span className={FIELD_LABEL}>Select Marquee Contender</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CONTENDER_SPECIMENS.map((item) => {
                    const active = selectedContenderId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectContenderId(item.id)}
                        className={`cursor-pointer rounded-2xl border p-3.5 text-left transition-colors ${
                          active
                            ? 'border-[#CCFF00] bg-white/[0.06]'
                            : 'border-white/10 bg-black/25 hover:border-white/25'
                        }`}
                      >
                        <span className="block font-mono text-[9px] uppercase text-[#CCFF00]">
                          {item.initials} · {item.badge}
                        </span>
                        <span className="mt-1 block font-sans text-sm font-bold text-white">
                          {item.fullName}
                        </span>
                        <span className="mt-0.5 block font-sans text-xs text-neutral-400">
                          {item.sport}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className={FIELD_LABEL}>
                  Tailor Bespoke Sponsor & Athlete Deliverables (Included in {selectedHorizon.priceFormatted})
                </span>
                <div className="space-y-2">
                  {BESPOKE_PILLARS.map((pillar) => {
                    const active = selectedPillars.includes(pillar.id);
                    return (
                      <button
                        key={pillar.id}
                        type="button"
                        onClick={() => togglePillar(pillar.id)}
                        className={`w-full cursor-pointer rounded-2xl border p-3.5 text-left transition-colors ${
                          active
                            ? 'border-[#CCFF00] bg-white/[0.06]'
                            : 'border-white/10 bg-black/25 hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#CCFF00]">
                            {pillar.kicker}
                          </span>
                          <span className="font-mono text-[10px] text-white">
                            {active ? '✓ INCLUDED' : '+ ADD'}
                          </span>
                        </div>
                        <span className="mt-1 block font-sans text-sm font-bold text-white">
                          {pillar.name}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-neutral-300">
                          {pillar.summary}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={FIELD_LABEL}>
                  Custom Campaign Objectives or Key Dates (Optional)
                </label>
                <input
                  type="text"
                  value={customBrief}
                  onChange={(e) => setCustomBrief(e.target.value)}
                  placeholder="e.g. Q3 national TVC shoot, Brisbane AGM keynote, adaptive R&D lab..."
                  className={FIELD_INPUT}
                />
              </div>
            </div>
          )}
        </div>

        <footer className="shrink-0 z-20 border-t border-white/10 bg-[#0F0F11] px-6 py-4 sm:px-8 flex items-center gap-3">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="cursor-pointer rounded-xl border border-white/15 bg-transparent px-5 py-3.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-white/70 hover:text-white"
            >
              ← Back
            </button>
          ) : null}

          {step === 1 ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              className={`flex-1 ${LIT_OBSIDIAN_BTN}`}
            >
              Continue to Bespoke Charter →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                onLaunchStripeModal(activeSectorLabel);
              }}
              className={`flex-1 ${LIT_OBSIDIAN_BTN}`}
            >
              Proceed to Stripe Escrow & Apple Pay ({selectedHorizon.priceFormatted}) →
            </button>
          )}
        </footer>
      </aside>
    </div>,
    document.body,
  );
}

export function SovereignSyndicateBoard({ embedded = false }: { embedded?: boolean }) {
  const reduced = useReducedMotion();
  const [selectedHorizon, setSelectedHorizon] = useState<OlympicHorizonSpec>(OLYMPIC_HORIZONS[0]);
  const [selectedContenderId, setSelectedContenderId] = useState<ContenderId>('vance');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);
  const [stripePayload, setStripePayload] = useState<StripeCheckoutPayload | null>(null);
  const [lastReceipt, setLastReceipt] = useState<StripeEscrowReceipt | null>(null);
  const [lastPaidPriceAud, setLastPaidPriceAud] = useState<number>(50000);
  const [lastPaidClubName, setLastPaidClubName] = useState<string>('Balmoral Cycling Club');
  const [unlockedGrant, setUnlockedGrant] = useState<WhitelistingGrant | null>(null);

  const activeContender =
    CONTENDER_SPECIMENS.find((c) => c.id === selectedContenderId) ?? CONTENDER_SPECIMENS[0];

  const wrapperPadding = embedded ? 'pt-12 pb-6' : 'px-4 sm:px-6 md:px-10 pt-10 pb-8 max-w-[1840px] mx-auto';

  const openStripeCheckoutForContender = (
    contenderId: ContenderId,
    horizon: OlympicHorizonSpec,
    sectorLabel = 'Telco & Technology',
  ) => {
    const c = CONTENDER_SPECIMENS.find((item) => item.id === contenderId) ?? CONTENDER_SPECIMENS[0];
    setLastPaidPriceAud(horizon.priceAud);
    setLastPaidClubName(c.club);
    setStripePayload({
      athleteId: c.athleteId,
      athleteName: `${c.fullName} (${sectorLabel})`,
      athleteSport: c.sport,
      athleteImage: c.src,
      clubName: c.club,
      postcode: c.postcode,
      tierId: horizon.tierId,
      packageCode: `HORIZON ${horizon.numeral}`,
      packageName: horizon.horizonTag,
      priceAud: horizon.priceAud,
      sectorLabel,
    });
  };

  useLayoutEffect(() => {
    const host = document.querySelector<HTMLElement>('#commercial-tiers [data-sovereign-board]');
    if (host) {
      host.classList.remove('border-t', 'border-white/10', 'pt-4');
      host.style.borderTop = '0';
      host.style.paddingTop = '0';
    }
    const headerRow = document.getElementById('commercial-tiers-heading')?.closest<HTMLElement>('.grid');
    if (headerRow) {
      headerRow.classList.remove('border-b', 'border-white/10');
      headerRow.style.borderBottom = '0';
    }

    const tierPrices: Record<string, { price: number; name: string; tierId: string }> = {
      '01': { price: 750, name: 'Precinct Contra & Micro', tierId: 'local_merchant' },
      '02': { price: 3500, name: 'Pathway Contender', tierId: 'pathway_contender' },
      '03': { price: 12500, name: 'National Challenger', tierId: 'national_challenger' },
      '04': { price: 25000, name: 'Trans-Tasman Headline', tierId: 'world_class' },
    };

    document
      .querySelectorAll<HTMLElement>(
        '#commercial-tiers span, #commercial-tiers p, #commercial-tiers div, #commercial-tiers h3, #commercial-tiers button',
      )
      .forEach((el) => {
        if (el.closest('[data-runway-root="true"]')) return;
        const text = (el.textContent || '').trim();

        if (el.tagName === 'BUTTON') {
          const matchPkg = text.match(/PACKAGE\s*0([1-4])/i);
          if (matchPkg) {
            const num = `0${matchPkg[1]}`;
            const spec = tierPrices[num];
            if (spec && !el.dataset.stripeBound) {
              el.dataset.stripeBound = 'true';
              el.addEventListener('click', (ev) => {
                ev.stopPropagation();
                setLastPaidPriceAud(spec.price);
                setLastPaidClubName('Bankstown Bruins');
                setStripePayload({
                  athleteId: 'marcus-thorne',
                  athleteName: 'Marcus Thorne',
                  athleteSport: 'Basketball · NBL1 East',
                  athleteImage: '/portraits/marcus_thorne.jpg',
                  clubName: 'Bankstown Bruins',
                  postcode: '2200',
                  tierId: spec.tierId,
                  packageCode: `PACKAGE ${num}`,
                  packageName: spec.name,
                  priceAud: spec.price,
                });
              });
            }
          } else if (text.includes('50K') && !el.dataset.stripeBound) {
            el.dataset.stripeBound = 'true';
            el.textContent = 'LOCK A$50,000–A$250,000 CATEGORY RIGHTS →';
            el.addEventListener('click', (ev) => {
              ev.stopPropagation();
              openStripeCheckoutForContender('vance', OLYMPIC_HORIZONS[0]);
            });
          }
        }
      });
  }, [embedded]);

  const downloadTermSheet = () => {
    const blob = new Blob(
      [
        `tmrw/. OLYMPIC & PARALYMPIC CATEGORY EXCLUSIVITY TERM SHEET // ${selectedHorizon.priceFormatted} AUD\n`,
        `============================================================================\n`,
        `Transaction ID: ${selectedHorizon.txId}\n`,
        `Selected Contender: ${activeContender.fullName} (${activeContender.sport})\n`,
        `Contract Horizon: ${selectedHorizon.horizonTag} (${selectedHorizon.annualRate})\n`,
        `Category Exclusivity: Strictly one category leader per enterprise sector across Australia & New Zealand\n`,
        `Brisbane 2032 Option: Includes 60-Day First Right of Refusal (ROFR) to roll into 4-Year Brisbane 2032 Quadrennial\n`,
        `70% Athlete Payout: A$${selectedHorizon.athleteNet.toLocaleString()}.00 AUD (50% T+0 / 50% Deliverable Sign-Off Escrow)\n`,
        `15% Junior Club Dividend: A$${selectedHorizon.clubNet.toLocaleString()}.00 AUD (${activeContender.club})\n`,
        `15% Clearinghouse & Rule 40 Ops: A$${selectedHorizon.opsNet.toLocaleString()}.00 AUD\n`,
      ],
      { type: 'text/plain;charset=utf-8' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tmrw_${activeContender.fullName.replace(/\s+/g, '_')}_${selectedHorizon.id}_Olympic_Term_Sheet.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div data-runway-root="true" className="w-full bg-[#080808]">
      <style>{`
        #commercial-tiers [data-sovereign-board] {
          border-top: 0 !important;
          padding-top: 0 !important;
        }
        #commercial-tiers .grid:has(#commercial-tiers-heading) {
          border-bottom: 0 !important;
        }
        #commercial-tiers button {
          background-color: #0F0F11 !important;
          color: #FFFFFF !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          border-radius: 12px !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25), inset 0 -2px 0 rgba(0, 0, 0, 0.8), 0 10px 25px rgba(0, 0, 0, 0.45), 0 0 15px rgba(204, 255, 0, 0.18) !important;
          transition: all 0.25s ease !important;
        }
        #commercial-tiers button:hover {
          border-color: rgba(204, 255, 0, 0.65) !important;
          color: #CCFF00 !important;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -2px 0 rgba(0, 0, 0, 0.9), 0 15px 30px rgba(0, 0, 0, 0.6), 0 0 28px rgba(204, 255, 0, 0.35) !important;
        }
        body:has(#tmrw-locked-runway-footer) footer:not(#tmrw-locked-runway-footer) {
          display: none !important;
        }
      `}</style>

      <div className={`relative z-10 w-full bg-[#080808] ${wrapperPadding}`}>
        <div className="grid w-full grid-cols-1 gap-10 lg:grid-cols-[minmax(0,44%)_minmax(0,56%)] items-stretch">
          <div className="flex flex-col justify-between min-w-0">
            <div>
              <h2
                id="syndicate-heading"
                className="font-display text-4xl sm:text-6xl xl:text-[68px] font-black tracking-[-0.04em] uppercase text-white leading-[0.88] m-0"
              >
                The podium is funded<span className="text-[#CCFF00]">.</span> The preparation is not<span className="text-[#CCFF00]">.</span>
              </h2>

              <motion.p
                className="text-sm sm:text-[15px] text-neutral-300 leading-[1.6] font-sans max-w-xl mt-6 mb-0"
                initial={reduced ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.7, ease: EASE_OUT }}
              >
                Only one bank, one telco, one airline, one insurer, and one best-in-class category leader across each
                major enterprise sector in Australia and New Zealand can own a marquee contender's commercial
                rights on the road to LA 2028 and Brisbane 2032. Lock in a{' '}
                <strong className="text-white">1-Year LA28 Qualifier (A$50,000)</strong> or{' '}
                <strong className="text-white">2-Year LA28 Games Partnership (A$110,000)</strong> today, and secure
                contractual <strong className="text-[#CCFF00]">First Right of Refusal</strong> to roll into the{' '}
                <strong className="text-white">4-Year Brisbane 2032 Home Games Quadrennial (A$250,000)</strong> before
                your competitors can bid.
              </motion.p>
            </div>

            <div className="my-7 max-w-xl">
              <div className="grid grid-cols-3 gap-3">
                {OLYMPIC_HORIZONS.map((horizon) => {
                  const active = selectedHorizon.id === horizon.id;
                  return (
                    <button
                      key={horizon.id}
                      type="button"
                      onClick={() => setSelectedHorizon(horizon)}
                      className={`rounded-2xl border p-4 text-left cursor-pointer transition-all ${
                        active
                          ? 'border-[#CCFF00]/60 bg-[#141418] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_14px_34px_rgba(0,0,0,0.5),0_0_20px_rgba(204,255,0,0.14)]'
                          : 'border-white/10 bg-white/[0.02] text-neutral-400 hover:border-white/25 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`font-sans text-[11px] font-bold px-1.5 py-0.5 rounded-[4px] ${
                            active ? 'bg-[#CCFF00] text-[#080808]' : 'text-neutral-500'
                          }`}
                        >
                          {horizon.numeral}.
                        </span>
                      </div>
                      <div className="font-display text-xl sm:text-2xl font-black tracking-tight text-white">
                        {horizon.priceFormatted}
                      </div>
                      <div className="font-sans text-[11.5px] leading-snug text-neutral-300 mt-1.5">
                        <span className="block font-semibold text-white">{horizon.horizonTag}</span>
                        <span className="block text-neutral-400">1 Athlete · 1 Sector Lock</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-white/10 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 font-sans text-xs text-neutral-300">
                  <span>
                    70% Athlete ({activeContender.fullName}):{' '}
                    <strong className="text-white">A${selectedHorizon.athleteNet.toLocaleString()}</strong>
                  </span>
                  <span>
                    15% Junior club: <strong className="text-[#CCFF00]">A${selectedHorizon.clubNet.toLocaleString()}</strong>
                  </span>
                  <span className="text-neutral-400">15% Ops: A${selectedHorizon.opsNet.toLocaleString()}</span>
                </div>
                <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden flex">
                  <div className="w-[70%] bg-white h-full" />
                  <div className="w-[15%] bg-[#CCFF00] h-full" />
                  <div className="w-[15%] bg-white/25 h-full" />
                </div>
                <p className="m-0 font-sans text-[12.5px] text-neutral-300 leading-relaxed">
                  {selectedHorizon.exclusivitySummary}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-xl">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className={`flex-1 ${LIT_OBSIDIAN_BTN}`}
              >
                LOCK {selectedHorizon.priceFormatted} CATEGORY RIGHTS →
              </button>

              <button
                type="button"
                onClick={() => setIsCertificateOpen(true)}
                className={LIT_OBSIDIAN_BTN}
              >
                INSPECT RCTI SPECIMEN →
              </button>
            </div>
          </div>

          <div className="relative min-w-0 overflow-visible">
            <EditorialDiptych
              activeHorizon={selectedHorizon}
              focus={selectedContenderId}
              onSelectFocus={setSelectedContenderId}
              onDirectStripeLock={(cId) => {
                setSelectedContenderId(cId);
                openStripeCheckoutForContender(cId, selectedHorizon);
              }}
            />
          </div>
        </div>
      </div>

      <footer
        id="tmrw-locked-runway-footer"
        className="w-full bg-[#080808] text-white border-t border-white/10 mt-6"
      >
        <div className="max-w-[1840px] mx-auto px-4 sm:px-6 md:px-10 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <a
            href="#top"
            className="no-underline inline-flex flex-col select-none group cursor-pointer"
          >
            <span className="font-display text-2xl font-black tracking-[-0.04em] leading-none text-white">
              tmrw
              <span className="transition-colors duration-300 group-hover:text-[#CCFF00]">/</span>
              <span className="text-[#CCFF00]">.</span>
            </span>
            <span className="font-mono text-[8px] uppercase tracking-[0.22em] text-neutral-400 mt-1 transition-colors duration-300 group-hover:text-white">
              LINE UP YOUR FUTURE
            </span>
          </a>

          <p className="m-0 font-sans text-xs text-neutral-400 sm:text-right">
            © 2026{' '}
            <span className="inline-block font-semibold text-white group cursor-pointer">
              tmrw
              <span className="transition-colors duration-300 hover:text-[#CCFF00]">/</span>
              <span className="text-[#CCFF00]">.</span>
            </span>{' '}
            All rights reserved. Sovereign sports commercialisation infrastructure for Australia and New Zealand.
          </p>
        </div>
      </footer>

      {isCertificateOpen &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[95] flex items-center justify-center p-4"
            onClick={() => setIsCertificateOpen(false)}
          >
            <div
              className="bg-white border-2 border-black max-w-xl w-full p-8 md:p-10 shadow-[8px_8px_0px_0px_rgba(204,255,0,1)] relative z-10 text-black"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-8 pb-4 border-b-2 border-black">
                <h3 className="font-mono font-bold text-base sm:text-lg uppercase tracking-tight text-black m-0">
                  OLYMPIC CATEGORY CERTIFICATE // {activeContender.fullName.toUpperCase()}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCertificateOpen(false)}
                  className="font-mono font-bold text-xs uppercase tracking-wider text-black hover:text-neutral-600 bg-transparent border-0 cursor-pointer"
                >
                  [CLOSE]
                </button>
              </div>

              <div className="space-y-4 font-mono text-xs">
                <div className="grid grid-cols-[165px_1fr] gap-4 pb-3 border-b border-neutral-300">
                  <span className="uppercase tracking-wider text-neutral-500 font-medium">TRANSACTION ID</span>
                  <span className="font-bold text-black">{selectedHorizon.txId}</span>
                </div>
                <div className="grid grid-cols-[165px_1fr] gap-4 pb-3 border-b border-neutral-300">
                  <span className="uppercase tracking-wider text-neutral-500 font-medium">MARQUEE CONTENDER</span>
                  <span className="font-bold text-black">
                    {activeContender.fullName.toUpperCase()} ({activeContender.sport.toUpperCase()})
                  </span>
                </div>
                <div className="grid grid-cols-[165px_1fr] gap-4 pb-3 border-b border-neutral-300">
                  <span className="uppercase tracking-wider text-neutral-500 font-medium">SECTOR EXCLUSIVITY</span>
                  <span className="font-bold text-black">1-OF-1 SECTOR EXCLUSIVITY + BRISBANE 2032 ROFR</span>
                </div>
                <div className="grid grid-cols-[165px_1fr] gap-4 pb-3 border-b border-neutral-300">
                  <span className="uppercase tracking-wider text-neutral-500 font-medium">70% ATHLETE PAYOUT</span>
                  <span className="font-bold text-black">
                    A${selectedHorizon.athleteNet.toLocaleString()}.00 AUD (50% T+0 / 50% SIGN-OFF ORACLE)
                  </span>
                </div>
                <div className="grid grid-cols-[165px_1fr] gap-4 pb-3 border-b border-neutral-300">
                  <span className="uppercase tracking-wider text-neutral-500 font-medium">15% CLUB DIVIDEND</span>
                  <span className="font-bold text-black">
                    A${selectedHorizon.clubNet.toLocaleString()}.00 AUD TO {activeContender.club.toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-[165px_1fr] gap-4 pb-3 border-b border-neutral-300">
                  <span className="uppercase tracking-wider text-neutral-500 font-medium">PAID WHITELISTING</span>
                  <span className="font-bold text-black">META & TIKTOK OAUTH INCLUDED (0% AD SPEND MARKUP)</span>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={downloadTermSheet}
                  className="rounded-xl border border-black bg-white hover:bg-neutral-100 text-black font-mono text-xs font-bold uppercase px-5 py-4 cursor-pointer transition-colors"
                >
                  ↓ Pull ROFR Term Sheet
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCertificateOpen(false);
                    openStripeCheckoutForContender(selectedContenderId, selectedHorizon);
                  }}
                  className={`flex-1 ${LIT_OBSIDIAN_BTN}`}
                >
                  PROCEED TO STRIPE ESCROW & APPLE PAY →
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      <SyndicateApplicationDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        selectedHorizon={selectedHorizon}
        onSelectHorizon={setSelectedHorizon}
        selectedContenderId={selectedContenderId}
        onSelectContenderId={setSelectedContenderId}
        onLaunchStripeModal={(sectorLabel) => {
          openStripeCheckoutForContender(selectedContenderId, selectedHorizon, sectorLabel);
        }}
      />

      <StripeEscrowCheckoutModal
        payload={stripePayload}
        onClose={() => setStripePayload(null)}
        onSuccess={async (receipt) => {
          if (!stripePayload) return;
          const currentPayload = stripePayload;
          setLastReceipt(receipt);
          setLastPaidPriceAud(currentPayload.priceAud);
          setLastPaidClubName(currentPayload.clubName);
          setStripePayload(null);
          const grant = await issuePostcodeWhitelistingGrant({
            athleteId: currentPayload.athleteId,
            athleteName: currentPayload.athleteName,
            flightTierId: currentPayload.tierId,
            postcode: currentPayload.postcode,
          });
          setUnlockedGrant(grant);
        }}
      />

      {unlockedGrant && (
        <WhitelistingLaunchModal
          grant={unlockedGrant}
          receipt={lastReceipt}
          priceAud={lastPaidPriceAud}
          clubName={lastPaidClubName}
          onClose={() => setUnlockedGrant(null)}
        />
      )}
    </div>
  );
}

export const SyndicateRunway: React.FC<SyndicateRunwayProps> = () => {
  const [suppressed, setSuppressed] = useState(false);

  useLayoutEffect(() => {
    if (document.querySelector('#commercial-tiers [data-sovereign-board]')) {
      setSuppressed(true);
    }
  }, []);

  if (suppressed) return null;

  return (
    <section
      id="brisbane-2032-runway"
      aria-labelledby="syndicate-heading"
      className="relative w-full overflow-x-hidden bg-[#080808] text-white"
    >
      <SovereignSyndicateBoard />
    </section>
  );
};

export default SyndicateRunway;