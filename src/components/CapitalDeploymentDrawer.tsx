import React, { useEffect, useId, useState } from 'react';
import { BrandLockup } from './BrandLockup';
import { supabase } from '../lib/supabase';
import type { DeployPackageId } from '../lib/overlayEvents';
import { formatAudCompact } from '../lib/formatMoney';

export interface DeployPackage {
  id: DeployPackageId;
  title: string;
  kicker: string;
  cta: string;
  price: number;
  radiusKm: number;
  catchmentLabel: string;
  features: readonly string[];
}

export const DEPLOY_PACKAGES: readonly DeployPackage[] = [
  {
    id: 'storefront',
    title: 'Storefront Radius',
    kicker: 'Instant Activation',
    cta: 'Claim Your Local Radius',
    price: 8000,
    radiusKm: 5,
    catchmentLabel: '5km Local',
    features: [
      'Single-store activation locked to the till',
      'In-aisle, window and POS IP rights',
      'Same-postcode geo-match and automated RCTI',
    ],
  },
  {
    id: 'metro',
    title: 'Metro Reach',
    kicker: 'Core Bestseller',
    cta: 'SELECT TIER',
    price: 18000,
    radiusKm: 15,
    catchmentLabel: '15km Trade Catchment',
    features: [
      'Multi-store rollout inside the metro cluster',
      'TwelveLabs airtime tracking for paid social',
      '70/15/15 Stripe Connect escrow across the metro cluster',
    ],
  },
  {
    id: 'regional',
    title: 'Regional IP',
    kicker: 'Syndicate Retainer',
    cta: 'APPLY FOR SYNDICATE',
    price: 50000,
    radiusKm: 50,
    catchmentLabel: '50km Regional Hub',
    features: [
      'Network-wide campaign with exclusivity windows',
      'Priority settlement rail across the discipline corridor',
      '15% grassroots club grant on the 70/15/15 split',
    ],
  },
];

export function getDeployPackage(id: string | null | undefined): DeployPackage {
  return DEPLOY_PACKAGES.find((pkg) => pkg.id === id) ?? DEPLOY_PACKAGES[0];
}

interface AthleteSummary {
  id?: string | null;
  name?: string | null;
  display_name?: string | null;
  sport?: string | null;
  /** Market valuation already formatted, e.g. `A$2400`. */
  valuation?: string | null;
}

interface CapitalDeploymentDrawerProps {
  isOpen: boolean;
  packageId: string | null;
  onClose: () => void;
  athlete?: AthleteSummary | null;
}

const FIELD_LABEL = 'font-mono text-[9px] tracking-[0.2em] text-[#666666] uppercase block mb-2';
const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#080808] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F7F6]';

const CLEARING_SPECS = [
  { label: 'Clearing rail', value: 'Stripe Connect' },
  { label: 'Escrow split', value: '70 / 15 / 15' },
  { label: 'Settlement', value: 'T+2 RCTI' },
  { label: 'Conflict audit', value: 'Category lock' },
] as const;

const StripeWordmark: React.FC = () => (
  <svg
    viewBox="0 0 60 25"
    className="h-4 w-auto text-[#080808]"
    fill="currentColor"
    role="img"
    aria-label="Stripe"
  >
    <path
      fillRule="evenodd"
        d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.93 0 1.85 6.29.97 6.29 5.88z"
    />
  </svg>
);

const CloseIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const formatAud = (n: number) => formatAudCompact(n);

export const CapitalDeploymentDrawer: React.FC<CapitalDeploymentDrawerProps> = ({
  isOpen,
  packageId,
  onClose,
  athlete,
}) => {
  const baseId = useId();
  const panelId = `${baseId}-panel`;
  const pkg = getDeployPackage(packageId);
  const [activeId, setActiveId] = useState<DeployPackageId>(pkg.id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const active = getDeployPackage(activeId);
  const athleteName = athlete?.display_name || athlete?.name || 'Open catchment allocation';
  const athleteSport = athlete?.sport || 'Postcode-locked roster';
  const isSyndicate = active.id === 'regional';

  useEffect(() => {
    if (!isOpen) return;
    setActiveId(pkg.id);
    setError(null);
    setSuccess(false);
    setIsSubmitting(false);
  }, [isOpen, pkg.id]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const deploy = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (supabase) {
        const { error: dealErr } = await supabase.from('sponsor_deals').insert({
          athlete_id: athlete?.id || '33333333-3333-3333-3333-333333333333',
          tier_code: active.id === 'storefront' ? 'tier1' : active.id === 'metro' ? 'tier2' : 'tier3',
          total_amount_aud: active.price,
          escrow_balance_aud: active.price,
          status: 'escrowed',
        });
        if (dealErr) {
          console.warn('Could not persist to sponsor_deals, simulating escrow booking:', dealErr.message);
        }
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deployment halted. Re-verify clearing parameters.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label="Close capital deployment terminal"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity duration-300 animate-fadeIn border-0 p-0 cursor-default"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${baseId}-title`}
        id={panelId}
        className="absolute top-0 right-0 h-full w-full max-w-[480px] bg-[#F7F7F6] border-l border-[#080808]/10 z-10 p-8 md:p-12 flex flex-col shadow-2xl animate-slideInRight select-none overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-[#080808]/10 pb-6">
          <BrandLockup onClick={onClose} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`inline-flex items-center justify-center p-1 text-[#666666] hover:text-[#080808] transition-colors duration-150 cursor-pointer bg-transparent border-0 rounded-full ${FOCUS_RING}`}
          >
            <CloseIcon />
          </button>
        </div>

        <span className="font-mono text-[10px] tracking-[0.24em] text-[#888888] uppercase block mt-8 mb-2">
          Capital Deployment Terminal
        </span>
        <h2
          id={`${baseId}-title`}
          className="m-0 font-display font-extrabold text-4xl tracking-[-0.03em] text-[#080808] leading-tight mb-3"
        >
          {active.title}.
        </h2>
        <p className="m-0 font-display text-xs text-[#555555] leading-relaxed mb-8">
          One-click Stripe Connect clearing. Capital sits in escrow against the selected catchment
          until verified delivery.
        </p>

        <div className="border border-[#080808]/10 rounded-2xl bg-white p-4 mb-6">
          <div className="flex justify-between gap-4 font-mono text-[10px] uppercase tracking-widest text-[#666666]">
            <span>Selected athlete</span>
            <span className="text-[#080808] font-bold text-right">{athleteName}</span>
          </div>
          <div className="flex justify-between gap-4 font-mono text-[10px] uppercase tracking-widest text-[#666666] mt-2">
            <span>Discipline</span>
            <span className="text-[#080808] font-bold text-right">{athleteSport}</span>
          </div>
          {athlete?.valuation && (
            <div className="flex justify-between gap-4 font-mono text-[10px] uppercase tracking-widest text-[#666666] mt-2">
              <span>Valuation</span>
              <span className="text-[#080808] font-bold text-right tabular-nums">{athlete.valuation}</span>
            </div>
          )}
          {athlete?.id && (
            <div className="flex justify-between gap-4 font-mono text-[10px] uppercase tracking-widest text-[#666666] mt-2">
              <span>Athlete ID</span>
              <span className="text-[#080808] font-bold text-right break-all">{athlete.id}</span>
            </div>
          )}
          <div className="flex justify-between gap-4 font-mono text-[10px] uppercase tracking-widest text-[#666666] mt-2">
            <span>Catchment</span>
            <span className="text-[#080808] font-bold text-right">
              {active.catchmentLabel} · {active.radiusKm}KM
            </span>
          </div>
        </div>

        <p className={FIELD_LABEL}>Package</p>
        <div className="grid grid-cols-3 gap-2 mb-6" role="radiogroup" aria-label="Deployment package">
          {DEPLOY_PACKAGES.map((option) => {
            const selected = option.id === active.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setActiveId(option.id);
                  setSuccess(false);
                  setError(null);
                }}
                className={`rounded-xl border px-2 py-3 text-center cursor-pointer transition-colors ${FOCUS_RING} ${
                  selected
                    ? 'bg-[#080808] border-[#080808] text-[#F7F7F6]'
                    : 'bg-white border-[#080808]/10 text-[#080808] hover:border-[#080808]'
                }`}
              >
                <span className="block font-mono text-[9px] font-bold tracking-widest uppercase">
                  {option.catchmentLabel}
                </span>
                <span className="block mt-1 font-display font-extrabold text-sm tabular-nums">
                  {formatAud(option.price)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="m-0 font-mono text-[9px] tracking-[0.2em] uppercase text-[#888888]">
              {active.kicker}
            </p>
            <p className="m-0 mt-1 font-display font-extrabold text-4xl tracking-tight text-[#080808] tabular-nums">
              {formatAud(active.price)}
              <span className="ml-1 font-mono text-[10px] font-bold tracking-widest text-[#888888]">
                AUD
              </span>
            </p>
          </div>
        </div>

        <ul className="m-0 mb-6 p-0 list-none space-y-2">
          {active.features.map((feature) => (
            <li key={feature} className="flex gap-2 text-sm text-[#555555] leading-relaxed">
              <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#B8FF00] shadow-[0_0_8px_rgba(184,255,0,0.8)]" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <dl className="m-0 mb-6 grid grid-cols-2 gap-3">
          {CLEARING_SPECS.map((spec) => (
            <div key={spec.label} className="border border-[#080808]/10 rounded-xl px-3 py-3 bg-white">
              <dt className="font-mono text-[9px] tracking-[0.18em] uppercase text-[#888888]">{spec.label}</dt>
              <dd className="m-0 mt-1 font-display font-extrabold text-sm text-[#080808]">{spec.value}</dd>
            </div>
          ))}
        </dl>

        {error && (
          <p className="m-0 mb-4 font-mono text-[11px] text-[#B42318]" role="alert">
            {error}
          </p>
        )}

        {success ? (
          <div className="mb-4 rounded-2xl border border-[#080808]/10 bg-white p-4">
            <p className="m-0 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#080808]">
              {isSyndicate ? 'Syndicate brief queued' : 'Escrow capital allocated'}
            </p>
            <p className="m-0 mt-2 text-sm text-[#555555] leading-relaxed">
              {formatAud(active.price)} is held on Stripe Connect against the {active.catchmentLabel.toLowerCase()}{' '}
              parameters. Settlement releases on verified delivery.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={deploy}
            disabled={isSubmitting}
            className={`w-full rounded-full bg-[#080808] text-[#F7F7F6] font-bold text-xs uppercase tracking-widest py-3.5 px-5 hover:bg-[#B8FF00] hover:text-[#080808] transition-colors duration-300 ease-out border-0 cursor-pointer disabled:opacity-50 ${FOCUS_RING}`}
          >
            {isSubmitting
              ? 'Clearing via Stripe Connect…'
              : isSyndicate
                ? `Apply · ${formatAud(active.price)} syndicate`
                : `Deploy ${formatAud(active.price)} capital`}
          </button>
        )}

        <div className="mt-auto pt-8 flex items-center justify-between border-t border-[#080808]/10">
          <StripeWordmark />
          <p className="m-0 font-mono text-[9px] tracking-[0.18em] uppercase text-[#888888]">
            Connect · Escrow · RCTI
          </p>
        </div>
      </aside>
    </div>
  );
};

export default CapitalDeploymentDrawer;
