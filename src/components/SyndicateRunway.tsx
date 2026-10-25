import React, { useEffect, useId, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { LandingSectionId } from './Navigation';
import { FilmGrainOverlay } from './FilmGrainOverlay';
import { ABN_ERROR_MESSAGE, isValidAbn, stripNonDigits } from '../lib/validation';

interface SyndicateRunwayProps {
  onNavigateSection?: (id: LandingSectionId) => void;
  onOpenSyndicateEnquiry?: () => void;
}

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const DIPTYCH_EASE = [0.22, 1, 0.36, 1] as const;
const DIPTYCH_EASE_CSS = 'cubic-bezier(0.22, 1, 0.36, 1)';
const CONTENDER_IMAGE = '/syndicate/image_9d87cf0b.jpg';
const VELODROME_IMAGE = '/syndicate/velodrome.jpg';
const CONTENDER_GRADE =
  'absolute inset-0 h-full w-full object-cover grayscale contrast-[1.14] brightness-[0.96] saturate-0 select-none';
const VELODROME_GRADE =
  'absolute inset-0 h-full w-full object-cover grayscale contrast-[1.55] brightness-[0.76] saturate-0 select-none';

const TELEMETRY = [
  '3500+ PRE-CLEARED OLYMPIC & PARALYMPIC PATHWAY ATHLETES',
  '100% SPORT INTEGRITY AUSTRALIA, TPA & RULE 40 COMPLIANT',
  'AUTOMATED STRIPE ESCROW & INSTANT 100% TAX-DEDUCTIBLE ATO RCTIs',
] as const;

const INDUSTRIES = [
  { id: 'banking', name: 'Banking & Wealth', lock: 'Institutional banking, wealth, and superannuation lockout' },
  { id: 'telco', name: 'Telco & Tech', lock: 'Carrier, cloud, and connectivity monopoly' },
  { id: 'energy', name: 'Energy & Transition', lock: 'Generation, fuels, and net-zero transition lockout' },
  { id: 'aviation', name: 'Aviation & Logistics', lock: 'Airline, freight, and supply-chain monopoly' },
  { id: 'health', name: 'Healthcare & Biotech', lock: 'Clinical, recovery, and biotech lockout' },
  { id: 'retail', name: 'Retail & Consumer Staples', lock: 'National retail and staple brand lockout' },
] as const;

const PORTFOLIOS = [
  {
    id: 'mixed',
    name: 'Olympic & Paralympic Mixed',
    kicker: 'Default allocation',
    summary:
      'Five-athlete mixed programme across swimming, triathlon, athletics, rowing, and Para Athletics T54, paired with five grassroots junior clubs.',
  },
  {
    id: 'paralympic',
    name: 'Paralympic Classification First',
    kicker: 'Adaptive priority',
    summary:
      'Prioritising adaptive equipment, classification support, and Paralympic qualifier travel across a five-athlete, five-club allocation.',
  },
  {
    id: 'women',
    name: 'Women on the Runway',
    kicker: 'LA 2028 corridor',
    summary:
      'Female pathway programme to LA 2028 and Brisbane 2032, with net backing weighted to emerging Olympic and Paralympic contenders.',
  },
] as const;

type IndustryId = (typeof INDUSTRIES)[number]['id'];
type PortfolioId = (typeof PORTFOLIOS)[number]['id'];
type ApplicationStep = 1 | 2 | 3;

const FIELD_LABEL = 'font-mono text-[9px] tracking-[0.2em] text-white/40 uppercase block mb-2';
const FIELD_INPUT =
  'w-full bg-[#0B0B0D] border border-white/10 rounded-xl px-4 py-3 text-sm text-neutral-200 placeholder-white/30 outline-none focus:border-[#CCFF00] caret-[#CCFF00]';

function formatAbn(raw: string): string {
  const digits = stripNonDigits(raw).slice(0, 11);
  const parts = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 8), digits.slice(8, 11)].filter(Boolean);
  return parts.join(' ');
}

function PhotographicPlate({
  src,
  alt,
  grade,
  position = 'center',
}: {
  src: string;
  alt: string;
  grade: string;
  position?: string;
}) {
  return (
    <>
      <img src={src} alt={alt} draggable={false} className={grade} style={{ objectPosition: position }} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/72" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/30 via-transparent to-white/20 mix-blend-soft-light" />
      <FilmGrainOverlay intensity="heavy" />
    </>
  );
}

type DiptychFocus = 'reality' | 'syndicate';

const DIPTYCH_PANELS: readonly {
  id: DiptychFocus;
  tab: string;
  kicker: string;
  kickerClass: string;
  src: string;
  alt: string;
  grade: string;
  position: string;
  copy: string;
}[] = [
  {
    id: 'reality',
    tab: 'UNBACKED REALITY',
    kicker: 'UNBACKED CONTENDER REALITY',
    kickerClass: 'text-[#FF4444]',
    src: CONTENDER_IMAGE,
    alt: 'Paralympic athlete fastening a carbon running blade on a night track',
    grade: CONTENDER_GRADE,
    position: 'center 42%',
    copy: 'Average dAIS Government Grant: $14000/year. Result: $28000 annual personal deficit across coaching, adaptive Paralympic equipment, kit, and international qualifiers.',
  },
  {
    id: 'syndicate',
    tab: 'SOVEREIGN SYNDICATE',
    kicker: '$250000 AUD SOVEREIGN SYNDICATE',
    kickerClass: 'text-[#CCFF00]',
    src: VELODROME_IMAGE,
    alt: 'Track cyclist holding an aerodynamic line on a velodrome',
    grade: VELODROME_GRADE,
    position: 'center 28%',
    copy: '$175000 net backing directly to your premier Olympic & Paralympic roster + $37500 direct to their grassroots junior clubs. Backed by quarterly board ESG telemetry and national PR distribution.',
  },
];

function EditorialDiptych() {
  const reduced = useReducedMotion();
  const [locked, setLocked] = useState<DiptychFocus>('reality');
  const [hovered, setHovered] = useState<DiptychFocus | null>(null);
  const focus = hovered ?? locked;
  const duration = reduced ? '0.01s' : '0.85s';
  const activePanel = DIPTYCH_PANELS.find((panel) => panel.id === focus) ?? DIPTYCH_PANELS[0];

  return (
    <div className="flex h-full min-h-[70vh] w-full min-w-0 flex-col lg:min-h-0">
      <div
        role="tablist"
        aria-label="Compare unbacked contender reality with the Sovereign Syndicate"
        className="mb-4 flex shrink-0 gap-2"
      >
        {DIPTYCH_PANELS.map((panel) => {
          const active = focus === panel.id;
          return (
            <button
              key={panel.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setLocked(panel.id)}
              className={`flex-1 cursor-pointer rounded-full border px-4 py-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] transition-colors ${
                active
                  ? 'border-[#CCFF00] bg-[#CCFF00] text-[#0B0B0D]'
                  : 'border-white/15 bg-white/[0.04] text-white/70 hover:border-white/40 hover:text-white'
              }`}
            >
              {panel.tab}
            </button>
          );
        })}
      </div>

      <div className="relative flex min-h-[28rem] flex-1 gap-3 overflow-visible">
        {DIPTYCH_PANELS.map((panel) => {
          const active = focus === panel.id;
          return (
            <article
              key={panel.id}
              onPointerEnter={(event) => {
                if (event.pointerType === 'mouse') setHovered(panel.id);
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === 'mouse') setHovered(null);
              }}
              onClick={() => setLocked(panel.id)}
              className="relative min-w-0 cursor-pointer overflow-hidden rounded-[28px] border border-white/10 bg-[#0F0F11] shadow-2xl"
              style={{
                flexGrow: active ? 1.72 : 0.68,
                flexShrink: 1,
                flexBasis: 0,
                transition: `flex-grow ${duration} ${DIPTYCH_EASE_CSS}`,
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  opacity: active ? 1 : 0.34,
                  transform: active && !reduced ? 'scale(1.07)' : 'scale(1.015)',
                  transition: `opacity ${duration} ${DIPTYCH_EASE_CSS}, transform ${duration} ${DIPTYCH_EASE_CSS}`,
                }}
              >
                <PhotographicPlate
                  src={panel.src}
                  alt={panel.alt}
                  grade={panel.grade}
                  position={panel.position}
                />
              </div>
              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-5">
                <span
                  className={`inline-block rounded-full px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.18em] ${
                    active ? 'bg-[#CCFF00] text-[#0B0B0D]' : 'bg-black/70 text-white/80'
                  }`}
                >
                  {panel.tab}
                </span>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-4 shrink-0 overflow-visible">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activePanel.id}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: reduced ? 0.01 : 0.55, ease: DIPTYCH_EASE }}
            className="rounded-2xl border border-white/10 bg-black/90 p-5 font-sans text-xs leading-relaxed text-neutral-200 shadow-2xl"
          >
            <strong className={`${activePanel.kickerClass} mb-1 block font-mono uppercase tracking-wider`}>
              {activePanel.kicker}
            </strong>
            {activePanel.copy}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function SyndicateApplicationDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const [step, setStep] = useState<ApplicationStep>(1);
  const [industryId, setIndustryId] = useState<IndustryId | null>(null);
  const [portfolioId, setPortfolioId] = useState<PortfolioId | null>(null);
  const [legalName, setLegalName] = useState('');
  const [abn, setAbn] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const industry = INDUSTRIES.find((item) => item.id === industryId) ?? null;
  const portfolio = PORTFOLIOS.find((item) => item.id === portfolioId) ?? null;
  const abnDigits = stripNonDigits(abn);
  const abnReady = isValidAbn(abn);
  const abnTouched = abnDigits.length > 0;
  const canSubmit =
    legalName.trim().length > 1 && abnReady && contactName.trim().length > 1 && contactEmail.includes('@');

  useEffect(() => {
    if (isOpen) return;
    setStep(1);
    setIndustryId(null);
    setPortfolioId(null);
    setLegalName('');
    setAbn('');
    setContactName('');
    setContactEmail('');
    setSubmitting(false);
    setSubmitted(false);
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

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    window.setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 520);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90]">
          <button
            type="button"
            aria-label="Close syndicate application"
            tabIndex={-1}
            onClick={onClose}
            className="absolute inset-0 cursor-default border-0 bg-black/55 p-0 backdrop-blur-md"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute top-0 right-0 z-10 flex h-full w-full max-w-[520px] flex-col overflow-y-auto border-l border-white/10 bg-[#0F0F11] text-white shadow-2xl"
          >
            <div className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-white/10 bg-[#0F0F11]/95 px-6 pt-5 pb-5 backdrop-blur-md sm:px-8 md:px-12">
              <div className="min-w-0 pr-3">
                <p className="m-0 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-[#CCFF00]">
                  Corporate application · 250K tier
                </p>
                <h2 id={titleId} className="m-0 mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  SOVEREIGN 250K ALLOCATION PORTAL · LA 28 & BRISBANE 32
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close portal"
                className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-[#CCFF00] px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#0B0B0D] shadow-[0_0_24px_rgba(204,255,0,0.38)] transition-colors hover:bg-white"
              >
                ✕ CLOSE PORTAL
              </button>
            </div>

            <div className="px-8 pb-20 pt-8 md:px-12 md:pb-24">

            <ol className="mb-8 grid list-none grid-cols-3 gap-2 p-0">
              {(
                [
                  [1, 'Enterprise category'],
                  [2, 'Podium roster'],
                  [3, 'Board application'],
                ] as const
              ).map(([index, label]) => {
                const active = step === index;
                const complete = step > index || submitted;
                return (
                  <li
                    key={index}
                    className={`rounded-xl border px-3 py-2.5 ${
                      active ? 'border-[#CCFF00]/60 bg-[#CCFF00]/10' : 'border-white/10 bg-black/20'
                    }`}
                  >
                    <span
                      className={`block font-mono text-[9px] uppercase tracking-[0.18em] ${
                        active || complete ? 'text-[#CCFF00]' : 'text-white/35'
                      }`}
                    >
                      Step 0{index}
                    </span>
                    <span className="mt-1 block font-mono text-[10px] uppercase tracking-wide text-neutral-200">
                      {label}
                    </span>
                  </li>
                );
              })}
            </ol>

            {submitted ? (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
                <p className="m-0 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#CCFF00]">
                  Application received
                </p>
                <p className="m-0 mt-3 text-sm leading-relaxed text-neutral-200">
                  {legalName.trim()} is queued for Sovereign 250K governance review in {industry?.name ?? 'category'}{' '}
                  across the {portfolio?.name ?? 'runway'} programme. A partnerships lead will reply within one
                  business day with ESG telemetry protocol and licence terms.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col">
                {step === 1 ? (
                  <div>
                    <p className="m-0 mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
                      Step 01. Select your enterprise category
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {INDUSTRIES.map((item) => {
                        const active = industryId === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setIndustryId(item.id)}
                            className={`cursor-pointer rounded-2xl border p-4 text-left transition-colors ${
                              active
                                ? 'border-[#CCFF00] bg-[#CCFF00]/10'
                                : 'border-white/10 bg-black/25 hover:border-white/25'
                            }`}
                          >
                            <span className="block font-mono text-[11px] font-bold uppercase tracking-wide text-white">
                              {item.name}
                            </span>
                            <span className="mt-1 block font-mono text-[10px] uppercase tracking-wide text-white/45">
                              {item.lock}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {step === 2 ? (
                  <div>
                    <p className="m-0 mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
                      Step 02. Curate your Olympic & Paralympic podium roster
                    </p>
                    <div className="space-y-2">
                      {PORTFOLIOS.map((item) => {
                        const active = portfolioId === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setPortfolioId(item.id)}
                            className={`w-full cursor-pointer rounded-2xl border p-5 text-left transition-colors ${
                              active
                                ? 'border-[#CCFF00] bg-[#CCFF00]/10'
                                : 'border-white/10 bg-black/25 hover:border-white/25'
                            }`}
                          >
                            <span className="block font-mono text-[9px] uppercase tracking-[0.18em] text-[#CCFF00]">
                              {item.kicker}
                            </span>
                            <span className="mt-1 block font-display text-xl font-bold tracking-tight text-white">
                              {item.name}
                            </span>
                            <span className="mt-2 block text-xs leading-relaxed text-neutral-200">{item.summary}</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="m-0 mt-4 font-mono text-[10px] uppercase tracking-wide text-white/40">
                      $175000 net to the 5-athlete roster. $37500 to 5 junior clubs. $250000 annual Sovereign allocation.
                    </p>
                  </div>
                ) : null}

                {step === 3 ? (
                  <div className="space-y-4">
                    <p className="m-0 mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
                      Step 03. Submit board application & ABN
                    </p>
                    <div>
                      <label htmlFor={`${titleId}-legal`} className={FIELD_LABEL}>
                        Legal entity
                      </label>
                      <input
                        id={`${titleId}-legal`}
                        required
                        type="text"
                        value={legalName}
                        onChange={(event) => setLegalName(event.target.value)}
                        placeholder="Peninsula Motor Group Pty Ltd"
                        className={FIELD_INPUT}
                      />
                    </div>
                    <div>
                      <label htmlFor={`${titleId}-abn`} className={FIELD_LABEL}>
                        Australian Business Number
                      </label>
                      <input
                        id={`${titleId}-abn`}
                        required
                        inputMode="numeric"
                        autoComplete="off"
                        value={abn}
                        onChange={(event) => setAbn(formatAbn(event.target.value))}
                        placeholder="51 824 753 556"
                        className={FIELD_INPUT}
                      />
                      {abnTouched && !abnReady ? (
                        <p className="m-0 mt-2 font-mono text-[10px] uppercase tracking-wide text-[#FF4444]">
                          {ABN_ERROR_MESSAGE}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <label htmlFor={`${titleId}-director`} className={FIELD_LABEL}>
                        Partnership director
                      </label>
                      <input
                        id={`${titleId}-director`}
                        required
                        type="text"
                        value={contactName}
                        onChange={(event) => setContactName(event.target.value)}
                        placeholder="Alexandra Crowe"
                        className={FIELD_INPUT}
                      />
                    </div>
                    <div>
                      <label htmlFor={`${titleId}-email`} className={FIELD_LABEL}>
                        Executive email
                      </label>
                      <input
                        id={`${titleId}-email`}
                        required
                        type="email"
                        value={contactEmail}
                        onChange={(event) => setContactEmail(event.target.value)}
                        placeholder="name@company.com"
                        className={FIELD_INPUT}
                      />
                    </div>
                  </div>
                ) : null}

                <div className="mt-8 flex gap-3 pt-2">
                  {step > 1 ? (
                    <button
                      type="button"
                      onClick={() => setStep((current) => (current === 1 ? 1 : ((current - 1) as ApplicationStep)))}
                      className="cursor-pointer rounded-full border border-white/10 bg-transparent px-5 py-3.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-white/70 hover:text-white"
                    >
                      {'<- BACK'}
                    </button>
                  ) : null}
                  {step < 3 ? (
                    <button
                      type="button"
                      disabled={step === 1 ? !industryId : !portfolioId}
                      onClick={() => setStep((current) => (current === 3 ? 3 : ((current + 1) as ApplicationStep)))}
                      className="flex-1 cursor-pointer rounded-full border-0 bg-[#CCFF00] px-5 py-3.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-black disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      CONTINUE {'->'}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!canSubmit || submitting}
                      className="flex-1 cursor-pointer rounded-full border-0 bg-[#CCFF00] px-5 py-3.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-black disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {submitting ? 'Initialising review' : 'INITIALISE SOVEREIGN GOVERNANCE REVIEW ->'}
                    </button>
                  )}
                </div>
              </form>
            )}
            </div>
          </aside>
    </div>,
    document.body,
  );
}

/**
 * Sovereign 250K split-screen master block.
 * Sits inside the commercial broadsheet, and also stands alone on the runway route.
 */
export function SovereignSyndicateBoard({ embedded = false }: { embedded?: boolean }) {
  const reduced = useReducedMotion();
  const [isApplicationOpen, setIsApplicationOpen] = useState(false);
  const copyClass = embedded
    ? 'flex flex-col justify-center bg-[#0B0B0D] py-12 lg:sticky lg:top-[74px] lg:h-[calc(100vh-74px)] lg:overflow-y-auto lg:py-8 lg:pr-8'
    : 'flex flex-col justify-center bg-[#0B0B0D] px-5 py-16 md:px-10 lg:sticky lg:top-[74px] lg:h-[calc(100vh-74px)] lg:overflow-y-auto lg:px-12 lg:py-10 xl:px-16';
  const plateClass = embedded
    ? 'relative bg-[#0B0B0D] py-12 lg:sticky lg:top-[74px] lg:h-[calc(100vh-74px)] lg:py-8 lg:pl-3'
    : 'relative bg-[#0B0B0D] p-4 md:p-6 lg:sticky lg:top-[74px] lg:h-[calc(100vh-74px)] lg:p-8';

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
  }, [embedded]);

  return (
    <>
      <style>{`
        #commercial-tiers [data-sovereign-board] {
          border-top: 0 !important;
          padding-top: 0 !important;
        }
        #commercial-tiers .grid:has(#commercial-tiers-heading) {
          border-bottom: 0 !important;
        }
      `}</style>
      <div className="relative z-10 grid w-full grid-cols-1 border-0 lg:min-h-[calc(100vh-74px)] lg:grid-cols-[minmax(0,45%)_minmax(0,55%)]">
        <div className={`${copyClass} min-w-0 border-0`}>
          <span className="bg-[#CCFF00] text-black font-mono font-bold text-[10px] px-3.5 py-1 rounded-full uppercase tracking-wider">
            LA 2028 & BRISBANE 2032 RUNWAY // SOVEREIGN 250K SYNDICATE
          </span>

          <h2
            id="syndicate-heading"
            className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight uppercase text-white leading-[0.98] mt-6 mb-8"
          >
            The podium is funded. The preparation is not<span className="text-[#CCFF00]">.</span>
          </h2>

          <motion.p
            className="text-sm md:text-base text-neutral-300 leading-relaxed font-sans max-w-xl mb-8"
            initial={reduced ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.8, delay: 0.12, ease: EASE_OUT }}
          >
            Australia and New Zealand do not lack world-class Olympic and Paralympic talent. They lack the
            institutional commercial rails to sustain contenders between the 5 AM training block and the stadium
            tunnel. Government grants arrive only after a medal is won. Our $250000 AUD Sovereign Syndicate routes
            institutional brand, ESG, and disability inclusion capital directly into a premier portfolio of Olympic and
            Paralympic podium contenders and grassroots junior clubs on a single tax-deductible ATO RCTI rail.
          </motion.p>

          <ul className="m-0 mb-8 list-none space-y-3 p-0">
            {TELEMETRY.map((line, index) => (
              <motion.li
                key={line}
                className="flex items-center gap-3 font-mono text-[11px] font-medium uppercase tracking-[0.04em] text-white"
                initial={reduced ? false : { opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.55, delay: 0.16 + index * 0.08, ease: EASE_OUT }}
              >
                <span
                  aria-hidden="true"
                  className="inline-block h-1.5 w-1.5 animate-telemetry-ping rounded-full bg-[#CCFF00] shadow-[0_0_10px_rgba(204,255,0,0.8)]"
                />
                {line}
              </motion.li>
            ))}
          </ul>

          <div className="mt-2">
            <button
              type="button"
              onClick={() => setIsApplicationOpen(true)}
              className="w-full sm:w-auto bg-[#CCFF00] hover:bg-[#b8e600] text-[#0F0F11] font-mono font-bold text-xs py-4 px-8 rounded-xl transition-all uppercase tracking-wider cursor-pointer shadow-2xl"
            >
              APPLY FOR SOVEREIGN 250K ALLOCATION {'->'}
            </button>
          </div>
        </div>

        <div className={`${plateClass} min-w-0 overflow-visible`}>
          <EditorialDiptych />
        </div>
      </div>

      <SyndicateApplicationDrawer isOpen={isApplicationOpen} onClose={() => setIsApplicationOpen(false)} />
    </>
  );
}

/**
 * Standalone runway route. On the landing broadsheet the same block is housed
 * inside Commercial Tiers, so this section steps aside rather than repeating it.
 */
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
      className="relative w-full overflow-x-hidden bg-[#0B0B0D] text-white"
    >
      <SovereignSyndicateBoard />
    </section>
  );
};

export default SyndicateRunway;
