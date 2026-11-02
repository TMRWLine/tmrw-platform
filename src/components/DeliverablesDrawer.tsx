import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createCheckoutSession } from '../lib/checkout';
import { formatAud, formatAudCompact } from '../lib/formatMoney';
import {
  PACKAGE_TAB_LABEL,
  mockDeliverables,
  type CommercialAthlete,
  type CommercialPackage,
} from '../data/mockDeliverables';

interface DeliverablesDrawerProps {
  isOpen: boolean;
  athlete: CommercialAthlete;
  onClose: () => void;
  initialTierId?: string;
  onBook?: (pkg: CommercialPackage) => void;
}

const PACKAGES = mockDeliverables.packages;

function resolveTier(tierId: string | undefined): string {
  if (tierId && PACKAGES.some((pkg) => pkg.tier_id === tierId)) return tierId;
  return PACKAGES[0]?.tier_id ?? 'local_merchant';
}

const CheckIcon: React.FC = () => (
  <svg
    viewBox="0 0 16 16"
    className="mt-0.5 h-4 w-4 shrink-0 text-[#080808] bg-[#CCFF00] rounded-full p-0.5"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
  </svg>
);

function plainAud(amount: number): string {
  return Number.isInteger(amount) ? formatAudCompact(amount) : formatAud(amount);
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
  onBook,
}) => {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [tierId, setTierId] = useState(() => resolveTier(initialTierId));
  const [lodgedTierId, setLodgedTierId] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setLodgedTierId(null);
      setCheckoutLoading(false);
      setCheckoutError(null);
      return;
    }
    setTierId(resolveTier(initialTierId));
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

  const active = PACKAGES.find((pkg) => pkg.tier_id === tierId) ?? PACKAGES[0];
  if (!active) return null;

  const split = active.split_breakdown;
  const locality = clubLocality(athlete);

  return createPortal(
    <div className="fixed inset-0 z-[90] selection:bg-[#CCFF00] selection:text-[#080808]">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close commercial deliverables"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 border-0 bg-black/45 backdrop-blur-sm p-0 cursor-default animate-fadeIn"
      />

      {/* Pangram-Matched Daylight Architectural Slide-Over Sheet with Guaranteed Flex Scrolling */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute top-0 right-0 flex h-full w-full max-w-[560px] flex-col border-l border-black/10 bg-[#F7F7F5] text-[#080808] shadow-[0_25px_80px_rgba(0,0,0,0.28)] animate-slideInRight overflow-hidden"
      >
        {/* Sticky Top Header */}
        <header className="shrink-0 z-20 flex items-center justify-between gap-4 px-6 py-4 md:px-8 border-b border-black/10 bg-[#F7F7F5]/95 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-[#CCFF00] ring-1 ring-black/25" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#080808]">
              COMMERCIAL FLIGHT LICENSING
            </span>
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#FF3300] hover:bg-[#080808] text-white px-4 py-1.5 font-sans text-xs font-bold tracking-tight transition-colors cursor-pointer border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#080808]"
          >
            <span>Close</span>
            <span className="text-[11px]">✕</span>
          </button>
        </header>

        {/* Scrollable Content Body (Guarantees zero cutoffs on any screen height) */}
        <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8 md:py-8 space-y-6">
          
          {/* Athlete Specimen Header Block */}
          <div className="rounded-[18px] bg-[#EAEAE6] border border-black/8 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <span className="inline-block rounded bg-[#CCFF00] text-[#080808] font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5">
                  {athlete.sport}
                </span>
                <h2
                  id={titleId}
                  className="m-0 mt-2.5 font-display text-3xl sm:text-4xl font-black tracking-[-0.03em] leading-none text-[#080808]"
                >
                  {athlete.full_name}
                </h2>
                <p className="m-0 mt-2 font-sans text-xs font-medium text-neutral-600">
                  {athlete.integrity_status} · Postcode {athlete.postcode} Exclusivity
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className="block font-mono text-[9px] uppercase tracking-widest text-neutral-500">
                  Postcode
                </span>
                <span className="font-display text-2xl font-black text-[#080808]">
                  {athlete.postcode}
                </span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-black/10 flex items-center justify-between gap-4 text-xs">
              <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                15% Club Royalty Beneficiary
              </span>
              <span className="font-sans font-bold text-[#080808] text-right">
                {athlete.grassroots_club.name}
                {locality ? <span className="font-normal text-neutral-500"> ({locality})</span> : null}
              </span>
            </div>
          </div>

          {/* 4-Tier Segmented Selector */}
          <div>
            <p className="m-0 mb-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">
              Select Commercial Flight Tier
            </p>
            <div
              role="tablist"
              aria-label="Commercial tiers"
              className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#EAEAE6] p-1.5 rounded-2xl border border-black/8"
            >
              {PACKAGES.map((pkg) => {
                const selected = pkg.tier_id === active.tier_id;
                return (
                  <button
                    key={pkg.tier_id}
                    type="button"
                    role="tab"
                    id={`tier-tab-${pkg.tier_id}`}
                    aria-selected={selected}
                    aria-controls={`tier-panel-${pkg.tier_id}`}
                    onClick={() => setTierId(pkg.tier_id)}
                    className={`min-w-0 rounded-xl px-3 py-2.5 font-sans text-xs font-bold tracking-tight cursor-pointer transition-all border-0 focus:outline-none ${
                      selected
                        ? 'bg-[#080808] text-white shadow-sm'
                        : 'bg-transparent text-neutral-600 hover:text-[#080808]'
                    }`}
                  >
                    {PACKAGE_TAB_LABEL[pkg.tier_id] ?? pkg.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Tier Specification Card */}
          <div
            role="tabpanel"
            id={`tier-panel-${active.tier_id}`}
            aria-labelledby={`tier-tab-${active.tier_id}`}
            className="rounded-[20px] bg-white border border-black/10 p-6 sm:p-7 space-y-6 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 pb-5">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                  {active.billing_type}
                </span>
                <h3 className="m-0 mt-1 font-display text-2xl font-black tracking-tight text-[#080808]">
                  {active.name}
                </h3>
              </div>

              <div className="text-right">
                <p className="m-0 font-display text-4xl sm:text-5xl font-black tracking-[-0.04em] text-[#080808] tabular-nums leading-none">
                  {active.price_display}
                </p>
                {active.contra_eligible ? (
                  <span className="mt-2 inline-block rounded-full bg-[#CCFF00] px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-[#080808]">
                    Contra Eligible · {active.contra_allowance_percent}%
                  </span>
                ) : null}
              </div>
            </div>

            <p className="m-0 font-sans text-sm leading-relaxed text-neutral-600">
              {active.summary}
            </p>

            {/* Included Partner Deliverables */}
            <div>
              <p className="m-0 mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                Included Partner Deliverables
              </p>
              <ul className="m-0 list-none space-y-2.5 p-0">
                {active.deliverables.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 rounded-xl bg-[#F7F7F5] border border-black/5 px-4 py-3 font-sans text-sm font-medium text-[#080808]"
                  >
                    <CheckIcon />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* High-Contrast Carbon Black 70/15/15 Split Vault */}
            <div className="rounded-2xl bg-[#080808] text-white p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#CCFF00]">
                  Instant 70 / 15 / 15 Escrow Split
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">
                  ATO Tax Invoice Included
                </span>
              </div>

              <div
                className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/15"
                role="img"
                aria-label={`Athlete ${split.athlete_percent} percent, junior club ${split.club_percent} percent, platform ${split.platform_percent} percent`}
              >
                <span className="h-full bg-[#CCFF00]" style={{ width: `${split.athlete_percent}%` }} />
                <span className="h-full bg-white" style={{ width: `${split.club_percent}%` }} />
                <span className="h-full bg-white/40" style={{ width: `${split.platform_percent}%` }} />
              </div>

              <dl className="m-0 grid grid-cols-3 gap-3 pt-1">
                <div>
                  <dt className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#CCFF00]">
                    Athlete {split.athlete_percent}%
                  </dt>
                  <dd className="m-0 mt-1 font-display text-lg font-black tabular-nums text-white">
                    {plainAud(split.athlete_amount)}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[9px] font-bold uppercase tracking-wider text-white/80">
                    Junior Club {split.club_percent}%
                  </dt>
                  <dd className="m-0 mt-1 font-display text-lg font-black tabular-nums text-white">
                    {plainAud(split.club_amount)}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[9px] font-bold uppercase tracking-wider text-white/50">
                    Ops &amp; Legal {split.platform_percent}%
                  </dt>
                  <dd className="m-0 mt-1 font-display text-lg font-black tabular-nums text-white">
                    {plainAud(split.platform_amount)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Sticky Bottom Checkout Action Bar */}
        <div className="shrink-0 z-20 border-t border-black/10 bg-[#F7F7F5] px-6 py-5 md:px-8">
          <button
            type="button"
            disabled={checkoutLoading}
            onClick={() => {
              onBook?.(active);
              setLodgedTierId(active.tier_id);
              setCheckoutError(null);
              setCheckoutLoading(true);
              void createCheckoutSession({
                athleteId: athlete.id,
                tierId: active.tier_id,
                athlete: {
                  full_name: athlete.full_name,
                  grassroots_club_name: athlete.grassroots_club.name,
                  image_url: athlete.image_url,
                },
              })
                .then(({ checkoutUrl }) => {
                  window.location.assign(checkoutUrl);
                })
                .catch((error: unknown) => {
                  setCheckoutLoading(false);
                  setCheckoutError(
                    error instanceof Error ? error.message : 'Unable to initialise secure checkout.',
                  );
                });
            }}
            className="w-full rounded-full border-0 bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] py-4 font-mono text-xs font-bold uppercase tracking-[0.18em] cursor-pointer transition-colors disabled:cursor-wait disabled:opacity-70 shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#080808]"
          >
            {checkoutLoading ? 'Initialising Secure Checkout...' : `${active.cta_label} · ${active.price_display} →`}
          </button>

          {checkoutError ? (
            <p className="m-0 mt-3 text-center font-sans text-xs font-medium text-[#FF3300]">
              {checkoutError}
            </p>
          ) : lodgedTierId === active.tier_id && !checkoutLoading ? (
            <p className="m-0 mt-3 text-center font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#080808]">
              {active.price_display} reserved for {athlete.display_name}
            </p>
          ) : null}
        </div>
      </aside>
    </div>,
    document.body,
  );
};

export default DeliverablesDrawer;