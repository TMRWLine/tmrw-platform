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
  /** Tier selected when the drawer opens. Falls back to the first package. */
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
    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#CCFF00]"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
  </svg>
);

const CloseIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M6 6l12 12M18 6L6 18" />
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

/**
 * Commercial package terminal. Slides in from the right over a roster card and
 * switches the four standardised tiers without leaving the directory.
 */
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
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label="Close commercial deliverables"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 border-0 bg-black/60 p-0 cursor-default animate-fadeIn"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute top-0 right-0 flex h-full w-full max-w-[520px] flex-col border-l border-white/10 bg-[#0F0F11] text-[#F7F7F6] shadow-2xl animate-slideInRight"
      >
        <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8 md:py-8">
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="m-0 font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#CCFF00]">
                Commercial deliverables
              </p>
              <h2
                id={titleId}
                className="m-0 mt-3 font-display text-3xl font-extrabold tracking-tight text-white"
              >
                {athlete.full_name}
              </h2>
              <p className="m-0 mt-1 font-mono text-[11px] uppercase tracking-widest text-white/55">
                {athlete.display_name} · {athlete.sport}
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 text-white/70 hover:bg-white/10 hover:text-white cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00]"
            >
              <CloseIcon />
            </button>
          </header>

          <dl className="m-0 mt-6 grid grid-cols-1 gap-4 border-y border-white/10 py-4">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
                Postcode
              </dt>
              <dd className="m-0 font-mono text-sm font-bold text-white">{athlete.postcode}</dd>
            </div>
            <div>
              <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
                Integrity
              </dt>
              <dd className="m-0 mt-1 flex items-center gap-2 text-sm font-semibold text-white">
                <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#CCFF00]" />
                {athlete.integrity_status}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
                Grassroots club beneficiary
              </dt>
              <dd className="m-0 mt-1 text-sm font-semibold text-white">
                {athlete.grassroots_club.name}
                {locality ? (
                  <span className="block font-normal text-white/55">{locality}</span>
                ) : null}
              </dd>
            </div>
          </dl>

          <div role="tablist" aria-label="Commercial tiers" className="mt-6 grid grid-cols-2 gap-2">
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
                  className={`min-w-0 flex-1 rounded-full border px-2 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.14em] cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00] ${
                    selected
                      ? 'border-[#CCFF00] bg-[#CCFF00] text-[#0F0F11]'
                      : 'border-white/10 bg-transparent text-white/60 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {PACKAGE_TAB_LABEL[pkg.tier_id] ?? pkg.name}
                </button>
              );
            })}
          </div>

          <div
            role="tabpanel"
            id={`tier-panel-${active.tier_id}`}
            aria-labelledby={`tier-tab-${active.tier_id}`}
            className="mt-6"
          >
            <p className="m-0 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
              {active.billing_type}
            </p>
            <p className="m-0 mt-2 font-display text-5xl font-extrabold tracking-tight text-white tabular-nums">
              {active.price_display}
            </p>
            <h3 className="m-0 mt-3 font-display text-xl font-extrabold tracking-tight text-white">
              {active.name}
            </h3>
            <p className="m-0 mt-2 text-sm leading-relaxed text-white/60">{active.summary}</p>
            {active.contra_eligible ? (
              <p className="m-0 mt-3 inline-flex rounded-full border border-[#CCFF00]/40 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[#CCFF00]">
                Contra eligible · {active.contra_allowance_percent}%
              </p>
            ) : null}

            <ul className="m-0 mt-6 list-none space-y-3 p-0">
              {active.deliverables.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-white/85">
                  <CheckIcon />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <p className="m-0 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                Distribution
              </p>
              <div
                className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-white/10"
                role="img"
                aria-label={`Athlete ${split.athlete_percent} percent, junior club ${split.club_percent} percent, platform ${split.platform_percent} percent`}
              >
                <span className="h-full bg-[#CCFF00]" style={{ width: `${split.athlete_percent}%` }} />
                <span className="h-full bg-white/80" style={{ width: `${split.club_percent}%` }} />
                <span className="h-full bg-white/35" style={{ width: `${split.platform_percent}%` }} />
              </div>
              <dl className="m-0 mt-4 grid grid-cols-3 gap-3">
                <div>
                  <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#CCFF00]">
                    Athlete {split.athlete_percent}%
                  </dt>
                  <dd className="m-0 mt-1 font-mono text-xs font-bold tabular-nums text-white">
                    {plainAud(split.athlete_amount)}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-white/70">
                    Junior Club {split.club_percent}%
                  </dt>
                  <dd className="m-0 mt-1 font-mono text-xs font-bold tabular-nums text-white">
                    {plainAud(split.club_amount)}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-white/45">
                    Platform {split.platform_percent}%
                  </dt>
                  <dd className="m-0 mt-1 font-mono text-xs font-bold tabular-nums text-white">
                    {plainAud(split.platform_amount)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-white/10 px-6 py-5 md:px-8">
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
            className="w-full rounded-full border-0 bg-[#CCFF00] py-3.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#0F0F11] cursor-pointer transition-colors hover:bg-[#dfff66] disabled:cursor-wait disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0F11]"
          >
            {checkoutLoading ? 'Initialising Secure Checkout...' : active.cta_label}
          </button>
          {checkoutError ? (
            <p className="m-0 mt-3 text-center text-xs leading-relaxed text-[#ff8a8a]">{checkoutError}</p>
          ) : lodgedTierId === active.tier_id && !checkoutLoading ? (
            <p className="m-0 mt-3 text-center font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#CCFF00]">
              {active.price_display} held for {athlete.display_name}
            </p>
          ) : null}
        </div>
      </aside>
    </div>,
    document.body,
  );
};

export default DeliverablesDrawer;
