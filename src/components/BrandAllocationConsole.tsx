import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Check, Lock, MapPin, ShieldAlert, X } from 'lucide-react';
import clsx from 'clsx';
import { fetchAthletesInRadius, fetchRosterCount } from '../api';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  ALLOCATION_RADII_KM,
  getSportComplianceBadges,
  type AllocationRadiusKm,
  type AthleteInRadius,
} from '../types';

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_POSTCODE = '2026';
const POSTCODE_PATTERN = /^\d{4}$/;
const MAX_RADIUS_KM = ALLOCATION_RADII_KM[ALLOCATION_RADII_KM.length - 1];

/** The 23.0 degree kinetic rake, in radians, used to derive every chamfer. */
const BEAM_TAN = Math.tan((23 * Math.PI) / 180);
const BEAM_RUN_PX = 36;
const BEAM_RISE_PX = Number((BEAM_RUN_PX * BEAM_TAN).toFixed(2));

/** Outer shell keeps the full chamfer; the inner face is offset by the 1px hairline. */
const OUTER_CLIP = `polygon(0 0, calc(100% - ${BEAM_RUN_PX}px) 0, 100% ${BEAM_RISE_PX}px, 100% 100%, 0 100%)`;
const INNER_RUN_PX = Number((BEAM_RUN_PX - 0.8).toFixed(2));
const INNER_RISE_PX = Number((BEAM_RISE_PX - 0.34).toFixed(2));
const INNER_CLIP = `polygon(0 0, calc(100% - ${INNER_RUN_PX}px) 0, 100% ${INNER_RISE_PX}px, 100% 100%, 0 100%)`;

const numberFormat = new Intl.NumberFormat('en-NZ');

type RealtimeState = 'connecting' | 'live' | 'offline';

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

/** An athlete is pre-cleared when the master licence is signed and every sport compliance badge is active. */
export function isPreCleared(athlete: AthleteInRadius): boolean {
  if (!athlete.master_licence_signed) return false;
  return getSportComplianceBadges(athlete.sport, athlete).every((badge) => badge.active);
}

function hasSportCompliance(athlete: AthleteInRadius): boolean {
  return getSportComplianceBadges(athlete.sport, athlete).every((badge) => badge.active);
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** Eases a displayed integer towards its target, and snaps when reduced motion is requested. */
function useCountUp(target: number, durationMs = 650): number {
  const [value, setValue] = useState(target);
  const valueRef = useRef(target);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      valueRef.current = target;
      setValue(target);
      return;
    }

    const from = valueRef.current;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(from + (target - from) * eased);
      valueRef.current = next;
      setValue(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}

/* ------------------------------------------------------------------ */
/* Master mark                                                        */
/* ------------------------------------------------------------------ */

function MasterMark({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="tmrw slash dot"
      className={clsx(
        'inline-flex items-baseline font-mark font-extrabold leading-none tracking-[-0.04em] text-signal-white',
        className,
      )}
    >
      <span aria-hidden="true">tmrw</span>
      <span
        aria-hidden="true"
        className="mx-[0.2em] inline-block h-[0.95em] w-[0.11em] translate-y-[0.08em] rotate-beam bg-volt"
      />
      <span aria-hidden="true" className="inline-block h-[0.16em] w-[0.16em] rounded-full bg-signal-white" />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Live counter                                                       */
/* ------------------------------------------------------------------ */

function Counter({ index, label, value, live }: { index: string; label: string; value: number; live: boolean }) {
  const shown = useCountUp(value);
  return (
    <div className="bg-carbon p-5">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-signal-white/50">
        <span>{`[${index}] ${label}`}</span>
        <span
          aria-hidden="true"
          className={clsx(
            'inline-block h-1.5 w-1.5 rounded-full',
            live ? 'bg-volt motion-safe:animate-volt-pulse' : 'bg-signal-white/30',
          )}
        />
      </div>
      <div
        className="mt-3 font-display text-5xl font-extrabold tracking-[-0.03em] text-signal-white"
        aria-live="polite"
        aria-atomic="true"
      >
        {numberFormat.format(shown)}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Radar                                                              */
/* ------------------------------------------------------------------ */

function Radar({
  athletes,
  radiusKm,
  postcode,
  highlightedId,
}: {
  athletes: AthleteInRadius[];
  radiusKm: AllocationRadiusKm;
  postcode: string;
  highlightedId: string | null;
}) {
  const centre = 100;
  const outer = 90;

  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label={`Radar showing ${athletes.length} broadcast talent within ${radiusKm}km of postcode ${postcode}`}
      className="h-auto w-full max-w-[320px]"
    >
      {ALLOCATION_RADII_KM.map((ring) => {
        const r = (ring / MAX_RADIUS_KM) * outer;
        const active = ring === radiusKm;
        return (
          <g key={ring}>
            <circle
              cx={centre}
              cy={centre}
              r={r}
              fill="none"
              strokeWidth={active ? 1.5 : 1}
              className={active ? 'stroke-volt' : 'stroke-hairline'}
            />
            <text
              x={centre + 3}
              y={centre - r + 9}
              className="fill-signal-white/40 font-mono"
              fontSize="6"
            >
              {`${ring}KM`}
            </text>
          </g>
        );
      })}
      <line x1={centre} y1={centre - outer} x2={centre} y2={centre + outer} strokeWidth={1} className="stroke-hairline" />
      <line x1={centre - outer} y1={centre} x2={centre + outer} y2={centre} strokeWidth={1} className="stroke-hairline" />

      {athletes.map((athlete) => {
        const r = Math.min(athlete.distance_km / MAX_RADIUS_KM, 1) * outer;
        const angle = (athlete.bearing_degrees * Math.PI) / 180;
        const x = centre + r * Math.sin(angle);
        const y = centre - r * Math.cos(angle);
        const cleared = isPreCleared(athlete);
        const highlighted = athlete.id === highlightedId;
        return (
          <g key={athlete.id}>
            {cleared && <circle cx={x} cy={y} r={highlighted ? 7 : 5} fill="none" strokeWidth={1.5} className="stroke-cobalt" />}
            <circle cx={x} cy={y} r={highlighted ? 3.5 : 2.5} className="fill-volt" />
          </g>
        );
      })}

      <rect x={centre - 3} y={centre - 3} width={6} height={6} className="fill-signal-white" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Athlete card                                                       */
/* ------------------------------------------------------------------ */

function ChecklistRow({ label, ok, light }: { label: string; ok: boolean; light: boolean }) {
  return (
    <li
      className={clsx(
        'flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em]',
        light ? 'text-carbon/70' : 'text-signal-white/70',
      )}
    >
      {ok ? (
        <Check size={12} aria-hidden="true" className="text-cobalt" />
      ) : (
        <X size={12} aria-hidden="true" className={light ? 'text-carbon/40' : 'text-signal-white/40'} />
      )}
      <span>{label}</span>
      <span className="sr-only">{ok ? 'complete' : 'outstanding'}</span>
    </li>
  );
}

function AthleteCard({
  athlete,
  radiusKm,
  light,
  highlighted,
  onHighlight,
}: {
  athlete: AthleteInRadius;
  radiusKm: AllocationRadiusKm;
  light: boolean;
  highlighted: boolean;
  onHighlight: (id: string | null) => void;
}) {
  const cleared = isPreCleared(athlete);
  const distancePct = Math.min((athlete.distance_km / radiusKm) * 100, 100);

  return (
    <article
      aria-label={`${athlete.name}, ${athlete.sport ?? 'sport unlisted'}`}
      className={clsx('relative', light ? 'bg-signal-white' : 'bg-hairline')}
      style={{ clipPath: OUTER_CLIP }}
      onMouseEnter={() => onHighlight(athlete.id)}
      onMouseLeave={() => onHighlight(null)}
      onFocus={() => onHighlight(athlete.id)}
      onBlur={() => onHighlight(null)}
      tabIndex={0}
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
          className={cleared ? 'stroke-cobalt' : highlighted ? 'stroke-volt' : 'stroke-signal-white/30'}
        />
      </svg>

      <div
        className={clsx('m-px flex flex-col gap-4 p-5', light ? 'bg-signal-white text-carbon' : 'bg-carbon text-signal-white')}
        style={{ clipPath: INNER_CLIP }}
      >
        <div className="flex items-start gap-3 pr-8">
          <div
            aria-hidden="true"
            className={clsx(
              'flex h-10 w-10 shrink-0 items-center justify-center font-mono text-sm font-medium',
              light ? 'bg-carbon text-signal-white' : 'bg-signal-white text-carbon',
            )}
          >
            {initials(athlete.name)}
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-display text-lg font-extrabold leading-tight tracking-[-0.03em]">{athlete.name}</h3>
            <p className={clsx('truncate text-sm', light ? 'text-carbon/60' : 'text-signal-white/60')}>
              {athlete.sport ?? 'Sport unlisted'}
            </p>
          </div>
        </div>

        <div
          className={clsx(
            'flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.12em]',
            light ? 'text-carbon/70' : 'text-signal-white/70',
          )}
        >
          <span className="inline-flex items-center gap-1">
            <MapPin size={11} aria-hidden="true" />
            {athlete.distance_km.toFixed(1)} KM
          </span>
          {athlete.postcode && <span>{`PC ${athlete.postcode}`}</span>}
          {athlete.follower_count != null && <span>{`${numberFormat.format(athlete.follower_count)} FOLLOWERS`}</span>}
        </div>

        <div
          className={clsx('h-px w-full', light ? 'bg-hairline-light' : 'bg-hairline')}
          role="presentation"
        >
          <div className="h-px bg-volt" style={{ width: `${distancePct}%` }} />
        </div>

        <div className="flex flex-col gap-3">
          {cleared ? (
            <span className="inline-flex w-fit items-center gap-1.5 bg-cobalt px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-signal-white">
              <Lock size={11} aria-hidden="true" />
              PRE-CLEARED
            </span>
          ) : (
            <span
              className={clsx(
                'inline-flex w-fit items-center gap-1.5 border border-solid px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.18em]',
                light ? 'border-carbon/30 text-carbon/70' : 'border-signal-white/30 text-signal-white/70',
              )}
            >
              <ShieldAlert size={11} aria-hidden="true" />
              AWAITING CLEARANCE
            </span>
          )}
          <ul className="flex flex-col gap-1.5">
            <ChecklistRow label="Master licence signed" ok={athlete.master_licence_signed} light={light} />
            <ChecklistRow label="Sport compliance verified" ok={hasSportCompliance(athlete)} light={light} />
          </ul>
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Console                                                            */
/* ------------------------------------------------------------------ */

export function BrandAllocationConsole({ defaultPostcode = DEFAULT_POSTCODE }: { defaultPostcode?: string }) {
  const [postcodeInput, setPostcodeInput] = useState(defaultPostcode);
  const [postcode, setPostcode] = useState(defaultPostcode);
  const [radiusKm, setRadiusKm] = useState<AllocationRadiusKm>(10);
  const [athletes, setAthletes] = useState<AthleteInRadius[]>([]);
  const [rosterTotal, setRosterTotal] = useState(0);
  // The mount effect below fetches immediately when Supabase is configured, so start in the
  // loading state to avoid a one frame flash of the empty state. When Supabase is not
  // configured no fetch runs, so loading stays false and the setup message shows instead.
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [realtime, setRealtime] = useState<RealtimeState>('connecting');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const requestId = useRef(0);

  const load = useCallback(
    async (silent: boolean) => {
      if (!isSupabaseConfigured) return;
      const id = ++requestId.current;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const [rows, total] = await Promise.all([fetchAthletesInRadius(postcode, radiusKm), fetchRosterCount()]);
        if (id !== requestId.current) return;
        setAthletes(rows);
        setRosterTotal(total);
      } catch (e) {
        if (id !== requestId.current) return;
        setError(e instanceof Error ? e.message : 'Failed to load broadcast talent.');
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [postcode, radiusKm],
  );

  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    void load(false);
  }, [load]);

  // Live counters: refresh whenever the athletes table changes.
  useEffect(() => {
    const client = supabase;
    if (!client) {
      setRealtime('offline');
      return;
    }
    const channel = client
      .channel('brand-allocation-athletes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'athletes' }, () => {
        void loadRef.current(true);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRealtime('live');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') setRealtime('offline');
      });
    return () => {
      void client.removeChannel(channel);
    };
  }, []);

  function handlePostcodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = postcodeInput.trim();
    if (!POSTCODE_PATTERN.test(next)) {
      setInputError('Enter a four digit postcode.');
      return;
    }
    setInputError(null);
    setPostcode(next);
  }

  const preClearedCount = useMemo(() => athletes.filter(isPreCleared).length, [athletes]);
  const combinedReach = useMemo(
    () => athletes.reduce((sum, athlete) => sum + (athlete.follower_count ?? 0), 0),
    [athletes],
  );
  const live = realtime === 'live';

  return (
    <section
      aria-labelledby="brand-allocation-heading"
      className="isolate min-h-screen bg-carbon font-sans text-signal-white"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
        {/* Masthead */}
        <header className="flex flex-col gap-6 border-b border-solid border-hairline pb-10">
          <MasterMark className="text-6xl md:text-7xl" />
          <p className="font-descriptor text-2xl font-medium uppercase tracking-[0.04em] text-signal-white md:text-3xl">
            LINE UP YOUR FUTURE
          </p>
          <div className="flex flex-col gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-signal-white/50">
              [ BRAND ALLOCATION TERMINAL ]
            </p>
            <h1
              id="brand-allocation-heading"
              className="font-display text-3xl font-extrabold tracking-[-0.03em] md:text-4xl"
            >
              Brand Allocation Terminal
            </h1>
            <p className="max-w-2xl text-base text-signal-white/70">
              Choose a postcode and a radius to see the broadcast talent your brand can allocate to today. Every athlete
              listed is scored against their master licence and sport compliance status.
            </p>
          </div>
        </header>

        {/* Live counters */}
        <div className="!grid grid-cols-2 gap-px bg-hairline lg:grid-cols-4">
          <Counter index="01" label="BROADCAST TALENT" value={rosterTotal} live={live} />
          <Counter index="02" label="IN RADIUS" value={athletes.length} live={live} />
          <Counter index="03" label="PRE-CLEARED" value={preClearedCount} live={live} />
          <Counter index="04" label="COMBINED REACH" value={combinedReach} live={live} />
        </div>
        <p className="-mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-signal-white/40">
          {live ? 'LIVE FEED CONNECTED' : realtime === 'connecting' ? 'CONNECTING TO LIVE FEED' : 'LIVE FEED OFFLINE'}
        </p>

        {/* Selector and radar */}
        <div className="!grid gap-10 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-8">
            <form onSubmit={handlePostcodeSubmit} noValidate className="flex flex-col gap-3">
              <label
                htmlFor="allocation-postcode"
                className="font-mono text-[10px] uppercase tracking-[0.2em] text-signal-white/50"
              >
                [ ORIGIN POSTCODE ]
              </label>
              <div className="flex flex-wrap items-stretch gap-3">
                <input
                  id="allocation-postcode"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={4}
                  value={postcodeInput}
                  onChange={(e) => setPostcodeInput(e.target.value.replace(/\D/g, ''))}
                  aria-invalid={inputError != null}
                  aria-describedby={inputError ? 'allocation-postcode-error' : undefined}
                  className="w-32 border border-solid border-hairline bg-carbon px-4 py-3 font-mono text-lg tracking-[0.2em] text-signal-white outline-none placeholder:text-signal-white/30 focus:border-volt"
                  placeholder="2026"
                />
                <button
                  type="submit"
                  className="bg-volt px-5 py-3 font-mono text-xs font-medium uppercase tracking-[0.18em] text-carbon transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-white"
                >
                  LOCK POSTCODE
                </button>
              </div>
              {inputError && (
                <p id="allocation-postcode-error" role="alert" className="text-sm text-signal-white">
                  {inputError}
                </p>
              )}
            </form>

            <div className="flex flex-col gap-3">
              <span
                id="allocation-radius-label"
                className="font-mono text-[10px] uppercase tracking-[0.2em] text-signal-white/50"
              >
                [ RADIUS ]
              </span>
              <div role="radiogroup" aria-labelledby="allocation-radius-label" className="flex gap-px bg-hairline">
                {ALLOCATION_RADII_KM.map((km) => {
                  const selected = km === radiusKm;
                  return (
                    <button
                      key={km}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setRadiusKm(km)}
                      className={clsx(
                        'flex-1 px-6 py-3 font-mono text-sm font-medium uppercase tracking-[0.14em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-white',
                        selected ? 'bg-volt text-carbon' : 'bg-carbon text-signal-white hover:bg-hairline',
                      )}
                    >
                      {`${km}KM`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <Radar athletes={athletes} radiusKm={radiusKm} postcode={postcode} highlightedId={highlightedId} />
          </div>
        </div>

        {/* Results */}
        <div className="flex flex-col gap-4" aria-busy={loading}>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-signal-white/50">
            {`[ ROSTER // PC ${postcode} // ${radiusKm}KM ]`}
          </p>

          {!isSupabaseConfigured && (
            <p className="border border-solid border-hairline p-5 text-sm text-signal-white/70">
              Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.
            </p>
          )}

          {error && (
            <div role="alert" className="flex flex-col items-start gap-3 border border-solid border-hairline p-5">
              <p className="text-sm text-signal-white">{error}</p>
              <button
                type="button"
                onClick={() => void load(false)}
                className="border border-solid border-signal-white px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-signal-white hover:bg-signal-white hover:text-carbon"
              >
                RETRY
              </button>
            </div>
          )}

          {loading && !error && isSupabaseConfigured && (
            <div className="!grid gap-px md:grid-cols-2 xl:grid-cols-3" aria-label="Loading broadcast talent">
              {[0, 1, 2].map((n) => (
                <div key={n} className="h-56 bg-hairline motion-safe:animate-pulse" />
              ))}
            </div>
          )}

          {!loading && !error && isSupabaseConfigured && athletes.length === 0 && (
            <p className="border border-solid border-hairline p-5 text-sm text-signal-white/70">
              {`No broadcast talent sit within ${radiusKm}km of postcode ${postcode}, or that postcode is not yet mapped. Widen the radius or try another postcode.`}
            </p>
          )}

          {!loading && !error && athletes.length > 0 && (
            <div className="!grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {athletes.map((athlete, index) => (
                <AthleteCard
                  key={athlete.id}
                  athlete={athlete}
                  radiusKm={radiusKm}
                  light={index % 2 === 1}
                  highlighted={athlete.id === highlightedId}
                  onHighlight={setHighlightedId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default BrandAllocationConsole;
