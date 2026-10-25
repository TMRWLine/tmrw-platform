import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AssetImage } from './AssetImage';
import {
  formatFollowers,
  portraitFile,
  specimenFor,
  type AthleteRecord,
} from '../data/roster';

interface AthleteDossierDrawerProps {
  athlete: AthleteRecord | null;
  onClose: () => void;
  /** Hands the athlete to the Capital Deployment Terminal. */
  onDeployCapital: (athlete: AthleteRecord) => void;
}

const SECTION = 'm-0 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#888888]';

const COMMERCIAL_FLIGHTS = [
  { id: '01', name: 'Precinct Contra & Micro', price: '$750 AUD / quarterly', tiers: ['storefront', 'metro', 'regional'] },
  { id: '02', name: 'Pathway Contender', price: '$3,500 AUD / annual', tiers: ['metro', 'regional'] },
  { id: '03', name: 'National Challenger', price: '$12,500 AUD / annual', tiers: ['metro', 'regional'] },
  { id: '04', name: 'World-Class Benchmark', price: '$25,000 AUD / campaign', tiers: ['regional'] },
] as const;

function initialsOf(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.replace(/[^A-Za-z]/g, '')[0] ?? '')
    .join('')
    .toUpperCase();
}

const ComplianceFlag: React.FC<{ label: string; cleared: boolean; clearedLabel: string; openLabel: string }> = ({
  label,
  cleared,
  clearedLabel,
  openLabel,
}) => (
  <div className="rounded-xl border border-black/10 bg-white px-3 py-3">
    <p className="m-0 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#888888]">{label}</p>
    <p className="m-0 mt-1 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-[#080808]">
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${cleared ? 'bg-[#B8FF00] ring-1 ring-[#080808]' : 'bg-[#080808]/25'}`}
      />
      {cleared ? clearedLabel : openLabel}
    </p>
  </div>
);

/**
 * Athlete profile dossier. Slides in from the right when a roster card opens a verified record:
 * identity, social attribution, governing-body clearance, category lockout, and catchment.
 */
export const AthleteDossierDrawer: React.FC<AthleteDossierDrawerProps> = ({
  athlete,
  onClose,
  onDeployCapital,
}) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = athlete !== null;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!athlete) return null;

  const imageFile = portraitFile(athlete.image);
  const imageFallbacks = specimenFor(athlete.id)?.imageFallbacks ?? [];
  const catchmentRows: { label: string; value: string }[] = [
    { label: 'Home Postcode', value: athlete.postcode },
    { label: 'Attribution Radius', value: `${athlete.radiusKm}km Exclusivity` },
    { label: 'Dynamic Valuation', value: athlete.valuation },
    { label: 'Clearance', value: athlete.status },
    { label: 'Settlement Protocol', value: 'T+0 Stripe Connect Escrow' },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        aria-label="Close athlete dossier"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-md border-0 p-0 cursor-default animate-fadeIn"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${athlete.full_name} profile dossier`}
        className="bg-[#F7F7F6] max-w-[540px] border-l border-black/10 w-full fixed right-0 top-0 h-full z-50 p-8 md:p-12 overflow-y-auto shadow-2xl flex flex-col justify-between animate-slideInRight"
      >
        <div>
          <header className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center bg-[#080808] text-[#F7F7F6] font-mono text-[10px] font-bold uppercase px-3 py-1 rounded-full tracking-widest">
              {athlete.agreement_status}
            </span>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex items-center justify-center w-9 h-9 p-0 text-[#080808] hover:bg-black/5 transition-colors cursor-pointer bg-transparent border-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#080808]/40"
            >
              ✕
            </button>
          </header>

          <div className="mt-8 flex items-start gap-4">
            <div
              aria-hidden="true"
              className="shrink-0 w-14 h-14 rounded-xl bg-white border border-black/10 flex items-center justify-center font-display font-extrabold text-[#080808] tracking-tight"
            >
              {initialsOf(athlete.full_name)}
            </div>
            <div className="min-w-0">
              <h2 className="m-0 text-3xl font-extrabold text-[#080808] tracking-tight font-display leading-tight">
                {athlete.full_name}
              </h2>
              <p className="m-0 text-xs text-[#666666] uppercase tracking-wider mt-2 font-mono">{athlete.sport}</p>
              <p className="m-0 text-xs text-[#080808] uppercase tracking-wider mt-1 font-mono">{athlete.current_club}</p>
              <p className="m-0 text-xs text-[#666666] uppercase tracking-wider mt-1 font-mono">{athlete.league}</p>
            </div>
          </div>

          <figure className="relative m-0 mt-8 overflow-hidden rounded-2xl bg-[#080808] aspect-[4/3]">
            <AssetImage
              file={imageFile}
              fallbackFiles={imageFallbacks}
              alt={`${athlete.full_name}, ${athlete.sport}, ${athlete.current_club}`}
              loading="eager"
              className="absolute inset-0 w-full h-full object-cover brightness-[0.95] contrast-[1.08]"
            />
          </figure>

          <section aria-labelledby="dossier-social" className="mt-10">
            <h3 id="dossier-social" className={SECTION}>
              Verified stats
            </h3>
            <dl className="mt-4 m-0 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-black/10 bg-white px-3 py-3 min-w-0">
                <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#888888]">Instagram</dt>
                <dd className="m-0 mt-2 font-mono text-[11px] font-bold text-[#080808] break-all">
                  {athlete.social.instagram_handle}
                </dd>
              </div>
              <div className="rounded-xl border border-black/10 bg-white px-3 py-3">
                <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#888888]">Followers</dt>
                <dd className="m-0 mt-2 font-display font-extrabold text-lg tracking-tight text-[#080808] tabular-nums">
                  {formatFollowers(athlete.social.follower_count)}
                </dd>
              </div>
              <div className="rounded-xl border border-black/10 bg-white px-3 py-3">
                <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#888888]">Engagement</dt>
                <dd className="m-0 mt-2 font-display font-extrabold text-lg tracking-tight text-[#080808] tabular-nums">
                  {athlete.social.engagement_rate}
                </dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="dossier-governing" className="mt-10">
            <h3 id="dossier-governing" className={SECTION}>
              Governing body & TPA compliance
            </h3>
            <p className="m-0 mt-4 font-display font-extrabold text-xl tracking-tight text-[#080808]">
              {athlete.governing_body.name}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <ComplianceFlag
                label="Sanction"
                cleared={athlete.governing_body.sanctioned}
                clearedLabel="Sanctioned"
                openLabel="Unsanctioned"
              />
              <ComplianceFlag
                label="Third-party agreement"
                cleared={athlete.governing_body.tpa_compliant}
                clearedLabel="TPA compliant"
                openLabel="TPA open"
              />
              <ComplianceFlag
                label="Documents"
                cleared={athlete.governing_body.document_verified}
                clearedLabel="Verified"
                openLabel="Unverified"
              />
              <ComplianceFlag
                label="Master licence"
                cleared={athlete.master_licence_signed}
                clearedLabel="Signed"
                openLabel="Unsigned"
              />
            </div>
          </section>

          <section aria-labelledby="dossier-categories" className="mt-10">
            <h3 id="dossier-categories" className={SECTION}>
              Brand category lockout
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-4">
              <div>
                <p className="m-0 mb-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#888888]">Available</p>
                {athlete.branding_categories.available.length > 0 ? (
                  <ul className="m-0 p-0 list-none flex flex-wrap gap-2">
                    {athlete.branding_categories.available.map((category) => (
                      <li
                        key={category}
                        className="m-0 rounded-full bg-black/5 text-[#080808] font-mono text-[10px] uppercase tracking-widest px-3 py-1.5"
                      >
                        {category}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="m-0 font-mono text-[10px] uppercase tracking-widest text-[#888888]">None open</p>
                )}
              </div>
              <div>
                <p className="m-0 mb-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#888888]">Locked</p>
                {athlete.branding_categories.locked.length > 0 ? (
                  <ul className="m-0 p-0 list-none flex flex-wrap gap-2">
                    {athlete.branding_categories.locked.map((category) => (
                      <li
                        key={category}
                        className="m-0 rounded-full bg-transparent text-[#888888] font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 line-through decoration-[#888888]"
                      >
                        {category}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="m-0 font-mono text-[10px] uppercase tracking-widest text-[#888888]">No lockouts</p>
                )}
              </div>
            </div>
          </section>

          <section aria-labelledby="dossier-catchment" className="mt-10">
            <h3 id="dossier-catchment" className={SECTION}>
              Catchment radius
            </h3>
            <table className="mt-4 w-full border-collapse">
              <tbody>
                {catchmentRows.map((row) => (
                  <tr key={row.label} className="border-t border-black/10 last:border-b">
                    <th
                      scope="row"
                      className="py-3 pr-4 text-left font-mono text-[10px] font-bold uppercase tracking-widest text-[#888888] align-top"
                    >
                      {row.label}
                    </th>
                    <td className="py-3 text-right font-mono text-[11px] font-bold uppercase tracking-widest text-[#080808] align-top">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section aria-labelledby="dossier-flights" className="mt-10">
            <h3 id="dossier-flights" className={SECTION}>
              Available commercial flights
            </h3>
            <ul className="m-0 mt-4 list-none divide-y divide-black/10 border-y border-black/10 p-0">
              {COMMERCIAL_FLIGHTS.map((flight) => {
                const open = (flight.tiers as readonly string[]).includes(athlete.tier);
                return (
                  <li key={flight.id} className="flex items-start justify-between gap-4 py-3">
                    <div>
                      <p className="m-0 font-mono text-[10px] uppercase tracking-[0.08em] text-black/40">
                        Flight {flight.id}
                      </p>
                      <p className="m-0 mt-1 font-display text-base font-bold tracking-[-0.02em] text-[#080808]">
                        {flight.name}
                      </p>
                      <p className="m-0 mt-1 font-mono text-[10px] uppercase tracking-[0.06em] text-black/55">
                        {flight.price}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 font-mono text-[9px] font-bold uppercase tracking-widest ${
                        open ? 'text-[#080808] bg-[#CCFF00] px-2 py-1' : 'text-black/35'
                      }`}
                    >
                      {open ? 'Open' : 'Closed'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-black/10">
          <button
            type="button"
            onClick={() => onDeployCapital(athlete)}
            className="w-full py-4 rounded-full bg-[#080808] text-[#F7F7F6] font-bold text-xs uppercase tracking-widest hover:bg-[#B8FF00] hover:text-[#080808] transition-all border-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#080808] focus-visible:ring-offset-2"
          >
            Sponsor Athlete & Lock Catchment →
          </button>
        </div>
      </aside>
    </div>,
    document.body,
  );
};

export default AthleteDossierDrawer;
