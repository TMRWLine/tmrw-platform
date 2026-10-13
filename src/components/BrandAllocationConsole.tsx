import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import clsx from 'clsx';
import { fetchAthletesInRadius, fetchRosterCount } from '../api';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  getAllocationDisplay,
  getClearance,
  getLeagueTag,
  getReachShare,
} from '../lib/athleteDisplay';
import {
  ALLOCATION_RADII_KM,
  getSportComplianceBadges,
  type AllocationRadiusKm,
  type AthleteInRadius,
} from '../types';
import { AthleteProfileCard } from './AthleteProfileCard';
import { Kicker, RegFrame, StadiumBackdrop, VoltPeriod } from './EditorialPrimitives';

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_POSTCODE = '2026';
const POSTCODE_PATTERN = /^\d{4}$/;
const MAX_RADIUS_KM = ALLOCATION_RADII_KM[ALLOCATION_RADII_KM.length - 1];

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
      <span aria-hidden="true" className="inline-block h-[0.16em] w-[0.16em] rounded-full bg-volt" />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Live counter                                                       */
/* ------------------------------------------------------------------ */

/** Deck style metric: oversized numeral, ruled mono label, one plain sentence beneath. */
function Counter({
  index,
  label,
  description,
  value,
  live,
}: {
  index: string;
  label: string;
  description: string;
  value: number;
  live: boolean;
}) {
  const shown = useCountUp(value);
  return (
    <div className="flex flex-col border-solid border-obsidian/15 py-8 max-md:[&:not(:first-child)]:border-t md:px-8 md:py-10 md:odd:border-r md:odd:pl-0 md:even:pr-0 md:[&:nth-child(n+3)]:border-t">
      <div
        className="m-0 font-display text-metric uppercase text-obsidian"
        aria-live="polite"
        aria-atomic="true"
      >
        {numberFormat.format(shown)}
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-solid border-obsidian pt-3 font-mono text-kicker font-bold uppercase text-obsidian">
        <span>{`[${index}] ${label}`}</span>
        <span
          aria-hidden="true"
          className={clsx(
            'inline-block h-2 w-2 rounded-full ring-1 ring-obsidian',
            live ? 'bg-volt motion-safe:animate-volt-pulse' : 'bg-obsidian/25',
          )}
        />
      </div>
      <p className="m-0 mt-2 max-w-sm text-sm leading-relaxed text-obsidian/70">{description}</p>
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
              className={active ? 'stroke-volt' : 'stroke-edge'}
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
      <line x1={centre} y1={centre - outer} x2={centre} y2={centre + outer} strokeWidth={1} className="stroke-edge" />
      <line x1={centre - outer} y1={centre} x2={centre + outer} y2={centre} strokeWidth={1} className="stroke-edge" />

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
/* Console                                                            */
/* ------------------------------------------------------------------ */

export function BrandAllocationConsole({ defaultPostcode = DEFAULT_POSTCODE }: { defaultPostcode?: string }) {
  const [postcodeInput, setPostcodeInput] = useState(defaultPostcode);
  const [postcode, setPostcode] = useState(defaultPostcode);
  const [radiusKm, setRadiusKm] = useState<AllocationRadiusKm>(10);
  const [athletes, setAthletes] = useState<AthleteInRadius[]>([]);
  const [rosterTotal, setRosterTotal] = useState(0);
  // The first fetch is always pending on mount, so start loading and let `load` clear it.
  // This keeps `loading` a pure fetch state, independent of the configuration flag.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [realtime, setRealtime] = useState<RealtimeState>('connecting');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const requestId = useRef(0);

  const load = useCallback(
    async (silent: boolean) => {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }
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

  const resultsHeading = !isSupabaseConfigured
    ? 'Roster offline'
    : loading || error
      ? 'Scanning the catchment'
      : `${athletes.length} ${athletes.length === 1 ? 'athlete' : 'athletes'} inside ${radiusKm}km`;

  return (
    <section
      aria-labelledby="brand-allocation-heading"
      className="isolate min-h-screen bg-canvas font-sans text-signal-white"
    >
      {/* Hero: dark stadium frame */}
      <div className="relative overflow-hidden bg-canvas">
        <StadiumBackdrop />
        <div className="relative mx-auto max-w-6xl px-6 py-10 md:py-14">
          <RegFrame className="flex min-h-[640px] flex-col justify-between px-6 py-8 md:min-h-[720px] md:px-12 md:py-10">
            <header className="flex items-start justify-between gap-6 border-b border-solid border-edge pb-5">
              <div className="flex flex-col gap-2">
                <MasterMark className="text-4xl md:text-5xl" />
                <p className="m-0 font-descriptor text-sm font-medium uppercase tracking-[0.3em] text-signal-white/85">
                  Line up your future
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5 text-right font-mono text-kicker uppercase text-signal-white/70">
                <span>[ Brand allocation terminal ]</span>
                <span className="hidden sm:inline">Australia &amp; New Zealand // Est 2026</span>
              </div>
            </header>

            <div className="flex flex-col gap-6 py-12">
              <Kicker tone="volt" pulse>
                Postcode allocation // live roster
              </Kicker>
              <h1 id="brand-allocation-heading" className="m-0 font-display text-display-xl uppercase text-white">
                Brand
                <br />
                Allocation
                <br />
                Terminal
                <VoltPeriod />
              </h1>
              <p className="m-0 max-w-xl text-lede text-signal-white/80">
                Choose a postcode and a radius to see the broadcast talent your brand can allocate to today. Every
                athlete listed is scored against their master licence and sport compliance status.
              </p>
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-solid border-edge pt-4 font-mono text-kicker uppercase text-signal-white/70">
              <span>{`[ PC ${postcode} // ${radiusKm}KM ]`}</span>
              <span className="flex items-center gap-2 font-bold text-volt">
                <span
                  aria-hidden="true"
                  className={clsx(
                    'block h-1.5 w-1.5 rounded-full',
                    live ? 'bg-volt motion-safe:animate-volt-pulse' : 'bg-signal-white/30',
                  )}
                />
                {live ? 'LIVE FEED CONNECTED' : realtime === 'connecting' ? 'CONNECTING TO LIVE FEED' : 'LIVE FEED OFFLINE'}
              </span>
            </footer>
          </RegFrame>
        </div>
      </div>

      {/* Metrics: chalk ledger band, as on the deck's evidence slides */}
      <div className="bg-chalk text-obsidian">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <Kicker tone="ink" className="mb-8">
            [ The numbers // live allocation ]
          </Kicker>
          <div className="!grid grid-cols-1 border-y border-solid border-obsidian md:grid-cols-2">
            <Counter
              index="01"
              label="BROADCAST TALENT"
              description="Athletes registered on the roster, live from the platform."
              value={rosterTotal}
              live={live}
            />
            <Counter
              index="02"
              label="IN RADIUS"
              description="Athletes sitting inside the locked postcode catchment."
              value={athletes.length}
              live={live}
            />
            <Counter
              index="03"
              label="PRE-CLEARED"
              description="Master licence signed and sport compliance verified, ready to back today."
              value={preClearedCount}
              live={live}
            />
            <Counter
              index="04"
              label="COMBINED REACH"
              description="Followers across every athlete inside the catchment."
              value={combinedReach}
              live={live}
            />
          </div>
        </div>
      </div>

      {/* Discovery: postcode, radius and roster */}
      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-16">
        <div className="!grid gap-10 lg:grid-cols-[1fr_380px]">
          <div className="flex flex-col gap-10">
            <h2 className="m-0 font-display text-headline uppercase text-white">
              Lock the postcode. Set the radius
              <VoltPeriod />
            </h2>

            <form onSubmit={handlePostcodeSubmit} noValidate className="flex flex-col gap-3">
              <label
                htmlFor="allocation-postcode"
                className="font-mono text-kicker uppercase text-signal-white/50"
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
                  className="w-40 rounded-none border border-solid border-edge-strong bg-canvas px-4 py-3.5 font-mono text-2xl tracking-[0.2em] text-signal-white outline-none placeholder:text-signal-white/30 focus:border-volt"
                  placeholder="2026"
                />
                <button
                  type="submit"
                  className="cursor-pointer rounded-none border-0 bg-volt px-7 py-3.5 font-mono text-xs font-bold uppercase tracking-telemetry text-canvas transition-all duration-150 hover:bg-volt-bright hover:shadow-volt-halo focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-white"
                >
                  LOCK POSTCODE
                </button>
              </div>
              {inputError && (
                <p id="allocation-postcode-error" role="alert" className="m-0 text-sm text-signal-white">
                  {inputError}
                </p>
              )}
            </form>

            <div className="flex flex-col gap-3">
              <span id="allocation-radius-label" className="font-mono text-kicker uppercase text-signal-white/50">
                [ RADIUS ]
              </span>
              <div role="radiogroup" aria-labelledby="allocation-radius-label" className="flex gap-px border border-solid border-edge bg-edge">
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
                        'flex-1 cursor-pointer rounded-none border-0 px-6 py-4 font-mono text-sm font-bold uppercase tracking-telemetry transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-white',
                        selected ? 'bg-volt text-canvas' : 'bg-canvas text-signal-white hover:bg-obsidian hover:text-volt',
                      )}
                    >
                      {`${km}KM`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col self-start border border-solid border-edge bg-obsidian">
            <div className="flex justify-center p-6">
              <Radar athletes={athletes} radiusKm={radiusKm} postcode={postcode} highlightedId={highlightedId} />
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-solid border-edge bg-canvas px-4 py-3 font-mono text-kicker uppercase text-signal-white/80">
              <span>{`[ RADAR // PC ${postcode} ]`}</span>
              <span className="font-bold text-volt">{`${athletes.length} IN ${radiusKm}KM`}</span>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex flex-col gap-8" aria-busy={loading}>
          <div className="flex flex-col gap-4 border-t border-solid border-edge pt-8">
            <Kicker>{`[ ROSTER // PC ${postcode} // ${radiusKm}KM ]`}</Kicker>
            <h2 className="m-0 font-display text-headline uppercase text-white">
              {resultsHeading}
              <VoltPeriod />
            </h2>
          </div>

          {!isSupabaseConfigured && (
            <p className="m-0 border border-solid border-edge bg-obsidian p-5 text-sm text-signal-white/70">
              Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.
            </p>
          )}

          {error && (
            <div role="alert" className="flex flex-col items-start gap-3 border border-solid border-edge bg-obsidian p-5">
              <p className="m-0 text-sm text-signal-white">{error}</p>
              <button
                type="button"
                onClick={() => void load(false)}
                className="cursor-pointer rounded-none border border-solid border-signal-white bg-transparent px-4 py-2 font-mono text-xs uppercase tracking-telemetry text-signal-white hover:bg-signal-white hover:text-canvas"
              >
                RETRY
              </button>
            </div>
          )}

          {loading && !error && isSupabaseConfigured && (
            <div className="!grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading broadcast talent">
              {[0, 1, 2].map((n) => (
                <div key={n} className="h-[560px] border border-solid border-edge bg-obsidian motion-safe:animate-pulse" />
              ))}
            </div>
          )}

          {!loading && !error && isSupabaseConfigured && athletes.length === 0 && (
            <p className="m-0 border border-solid border-edge bg-obsidian p-5 text-sm text-signal-white/70">
              {`No broadcast talent sit within ${radiusKm}km of postcode ${postcode}, or that postcode is not yet mapped. Widen the radius or try another postcode.`}
            </p>
          )}

          {!loading && !error && athletes.length > 0 && (
            <div className="!grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
              {athletes.map((athlete, index) => (
                <AthleteProfileCard
                  key={athlete.id}
                  index={index}
                  name={athlete.name}
                  sport={athlete.sport}
                  club={athlete.current_club}
                  allocation={getAllocationDisplay(athlete.agreement_status)}
                  suburb={null}
                  postcode={athlete.postcode}
                  leagueTag={getLeagueTag(athlete.sport)}
                  catchment={{
                    distanceKm: athlete.distance_km,
                    radiusKm,
                    bearingDegrees: athlete.bearing_degrees,
                  }}
                  followers={athlete.follower_count}
                  reachShare={getReachShare(athlete.follower_count, combinedReach)}
                  clearance={getClearance(athlete)}
                  highlighted={athlete.id === highlightedId}
                  onActiveChange={(active) => setHighlightedId(active ? athlete.id : null)}
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
