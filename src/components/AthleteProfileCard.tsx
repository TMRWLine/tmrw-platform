import type { ReactNode } from 'react';
import { Check, Lock, ShieldAlert, X } from 'lucide-react';
import clsx from 'clsx';
import {
  compassPoint,
  formatShare,
  getInitials,
  splitName,
  type AllocationDisplay,
  type ClearanceDisplay,
} from '../lib/athleteDisplay';
import { VoltPeriod } from './EditorialPrimitives';

/**
 * Editorial athlete profile, modelled on the roster bays in the pitch deck.
 * Purely presentational: every value arrives as a prop from the existing queries,
 * and every action arrives as a ready-wired node in `actions`.
 */

const numberFormat = new Intl.NumberFormat('en-NZ');

/** The 23.0 degree kinetic rake, in radians, used to derive every chamfer. */
const BEAM_TAN = Math.tan((23 * Math.PI) / 180);
const BEAM_RUN_PX = 36;
const BEAM_RISE_PX = Number((BEAM_RUN_PX * BEAM_TAN).toFixed(2));

/** Outer shell keeps the full chamfer; the inner face is offset by the 1px hairline. */
const OUTER_CLIP = `polygon(0 0, calc(100% - ${BEAM_RUN_PX}px) 0, 100% ${BEAM_RISE_PX}px, 100% 100%, 0 100%)`;
const INNER_RUN_PX = Number((BEAM_RUN_PX - 0.8).toFixed(2));
const INNER_RISE_PX = Number((BEAM_RISE_PX - 0.34).toFixed(2));
const INNER_CLIP = `polygon(0 0, calc(100% - ${INNER_RUN_PX}px) 0, 100% ${INNER_RISE_PX}px, 100% 100%, 0 100%)`;

export interface AthleteProfileCardProps {
  /** Zero based position in the grid, shown as a bracketed index. */
  index: number;
  name: string;
  sport: string | null;
  club: string | null;
  allocation: AllocationDisplay;
  /** Suburb or town label, where the source query returns one. */
  suburb: string | null;
  postcode: string | null;
  leagueTag: string | null;
  /** PostGIS catchment readout. Absent when the athlete was not found by a radius query. */
  catchment: { distanceKm: number; radiusKm: number; bearingDegrees: number } | null;
  followers: number | null;
  /** Share of the catchment's combined reach, from 0 to 1. */
  reachShare: number | null;
  clearance: ClearanceDisplay;
  highlighted?: boolean;
  /** When supplied, the card becomes focusable and reports hover and focus state. */
  onActiveChange?: (active: boolean) => void;
  actions?: ReactNode;
}

function AllocationStamp({ allocation }: { allocation: AllocationDisplay }) {
  const { state, label } = allocation;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 border border-solid px-2 py-1 font-mono text-stamp uppercase',
        state === 'open' && 'border-volt/50 bg-canvas/85 text-volt',
        state === 'allocated' && 'border-signal-white bg-signal-white text-obsidian',
        state === 'pending' && 'border-edge-strong bg-canvas/70 text-signal-white/80',
      )}
    >
      <span
        aria-hidden="true"
        className={clsx(
          'block h-1.5 w-1.5 rounded-full',
          state === 'open' && 'bg-volt motion-safe:animate-volt-pulse',
          state === 'allocated' && 'bg-obsidian',
          state === 'pending' && 'bg-signal-white/60',
        )}
      />
      <span className="sr-only">Category status: </span>
      {label}
    </span>
  );
}

function SpecRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="!grid grid-cols-[88px_minmax(0,1fr)] items-start gap-3 border-t border-solid border-edge-soft py-2.5">
      <dt className="m-0 pt-px font-mono text-kicker uppercase text-signal-white/50">{label}</dt>
      <dd className="m-0 font-mono text-telemetry uppercase text-signal-white">{children}</dd>
    </div>
  );
}

function ChecklistItem({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className="flex items-center gap-2 font-mono text-kicker uppercase text-signal-white/70">
      {ok ? (
        <Check size={12} aria-hidden="true" className="shrink-0 text-volt" />
      ) : (
        <X size={12} aria-hidden="true" className="shrink-0 text-signal-white/40" />
      )}
      <span>{label}</span>
      <span className="sr-only">{ok ? 'complete' : 'outstanding'}</span>
    </li>
  );
}

export function AthleteProfileCard({
  index,
  name,
  sport,
  club,
  allocation,
  suburb,
  postcode,
  leagueTag,
  catchment,
  followers,
  reachShare,
  clearance,
  highlighted = false,
  onActiveChange,
  actions,
}: AthleteProfileCardProps) {
  const [firstName, restName] = splitName(name);
  const distancePct = catchment ? Math.min((catchment.distanceKm / catchment.radiusKm) * 100, 100) : 0;
  const interactive = onActiveChange != null;
  const locationLabel = [suburb, postcode].filter(Boolean).join(' // ');

  return (
    <article
      aria-label={`${name}, ${sport ?? 'sport unlisted'}`}
      className={clsx(
        'group relative transition-colors duration-150 focus-visible:outline-none',
        highlighted ? 'bg-volt' : 'bg-edge',
      )}
      style={{ clipPath: OUTER_CLIP }}
      tabIndex={interactive ? 0 : undefined}
      onMouseEnter={interactive ? () => onActiveChange(true) : undefined}
      onMouseLeave={interactive ? () => onActiveChange(false) : undefined}
      onFocus={interactive ? () => onActiveChange(true) : undefined}
      onBlur={interactive ? () => onActiveChange(false) : undefined}
    >
      <svg
        aria-hidden="true"
        width={BEAM_RUN_PX}
        height={BEAM_RISE_PX}
        viewBox={`0 0 ${BEAM_RUN_PX} ${BEAM_RISE_PX}`}
        className="absolute right-0 top-0 z-10"
      >
        <line
          x1={0}
          y1={0}
          x2={BEAM_RUN_PX}
          y2={BEAM_RISE_PX}
          strokeWidth={3}
          className={clsx(
            highlighted
              ? 'stroke-volt'
              : clearance.preCleared
                ? 'stroke-cobalt'
                : 'stroke-signal-white/30',
          )}
        />
      </svg>

      <div className="m-px flex h-[calc(100%-2px)] flex-col bg-obsidian text-signal-white" style={{ clipPath: INNER_CLIP }}>
        {/* Photographic well: HUD strip, outlined monogram, stacked name */}
        <div className="relative isolate flex min-h-[270px] flex-col justify-between overflow-hidden bg-canvas p-4 pt-5">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-6 -left-3 z-0 select-none font-display text-[11rem] font-black uppercase leading-none tracking-tightest text-outline"
          >
            {getInitials(name)}
          </span>
          <span
            aria-hidden="true"
            className={clsx(
              'pointer-events-none absolute -top-8 right-14 z-0 block h-[150%] w-px origin-center rotate-beam',
              highlighted ? 'bg-volt' : 'bg-volt/40',
            )}
          />
          <div aria-hidden="true" className="absolute inset-0 z-0 bg-scrim-bay" />

          <div className="relative z-10 flex items-start justify-between gap-3 pr-6">
            <AllocationStamp allocation={allocation} />
            <span className="border border-solid border-edge-soft bg-canvas/70 px-2 py-1 font-mono text-caption uppercase text-signal-white/80">
              {`[ ${String(index + 1).padStart(2, '0')} ]`}
            </span>
          </div>

          <div className="relative z-10 flex flex-col gap-2">
            {locationLabel && (
              <p className="m-0 flex items-center gap-2 font-mono text-kicker font-bold uppercase text-volt">
                <span aria-hidden="true" className="block h-1.5 w-1.5 rounded-full bg-volt" />
                <span>{locationLabel}</span>
              </p>
            )}
            <h3 className="m-0 break-words font-display text-title font-black uppercase text-white">
              {firstName}
              {restName && (
                <>
                  <br />
                  {restName}
                </>
              )}
              <VoltPeriod />
            </h3>
            <p className="m-0 truncate font-mono text-kicker uppercase text-signal-white/65">
              {[sport ?? 'Sport unlisted', club].filter(Boolean).join(' // ')}
            </p>
          </div>
        </div>

        {/* Spec rows */}
        <dl className="m-0 flex flex-col px-4 pb-1 pt-1">
          {catchment && (
            <SpecRow label="Catchment">
              <span className="flex flex-col gap-2">
                <span>{`${catchment.distanceKm.toFixed(1)} KM ${compassPoint(catchment.bearingDegrees)}`}</span>
                <span role="presentation" className="block h-px w-full bg-edge">
                  <span className="block h-px bg-volt" style={{ width: `${distancePct}%` }} />
                </span>
              </span>
            </SpecRow>
          )}
          {suburb && <SpecRow label="Suburb">{suburb}</SpecRow>}
          {postcode && <SpecRow label="Postcode">{postcode}</SpecRow>}
          {leagueTag && (
            <SpecRow label="League">
              <span className="text-volt">{leagueTag}</span>
            </SpecRow>
          )}
          <SpecRow label="Clearance">
            <span className="flex flex-col items-start gap-3">
              {clearance.preCleared ? (
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap bg-cobalt px-2.5 py-1.5 font-mono text-stamp uppercase text-white">
                  <Lock size={11} aria-hidden="true" />
                  Pre-cleared
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap border border-solid border-edge-strong px-2.5 py-1.5 font-mono text-stamp uppercase text-signal-white/70">
                  <ShieldAlert size={11} aria-hidden="true" />
                  Awaiting clearance
                </span>
              )}
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                <ChecklistItem label="Master licence signed" ok={clearance.licenceSigned} />
                <ChecklistItem label="Sport compliance verified" ok={clearance.sportCompliant} />
              </ul>
            </span>
          </SpecRow>
        </dl>

        {/* Reach drawer: two metrics and a full width ratio rule */}
        <div className="mt-auto flex flex-col gap-3 border-t border-solid border-edge bg-canvas px-4 py-4">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="m-0 font-mono text-caption uppercase tracking-stamp text-signal-white/50">Community reach</p>
              <p className="m-0 mt-1 font-display text-metric-sm font-black text-white">
                {followers != null ? numberFormat.format(followers) : 'Unlisted'}
              </p>
            </div>
            <div className="text-right">
              <p className="m-0 whitespace-nowrap font-mono text-caption uppercase tracking-stamp text-signal-white/50">
                Share of catchment
              </p>
              <p className="m-0 mt-1 font-display text-metric-sm font-black text-volt">
                {reachShare != null ? formatShare(reachShare) : 'N/A'}
              </p>
            </div>
          </div>
          <span role="presentation" className="block h-px w-full bg-edge">
            <span className="block h-px bg-volt" style={{ width: `${reachShare != null ? Math.max(reachShare * 100, 2) : 0}%` }} />
          </span>
        </div>

        {actions && <div className="border-t border-solid border-edge bg-canvas p-4 pt-3">{actions}</div>}
      </div>
    </article>
  );
}
