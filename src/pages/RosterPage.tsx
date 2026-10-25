import React, { useEffect, useMemo, useState } from 'react';
import { fetchAthletes } from '../api';
import type { Athlete as DbAthlete } from '../types';
import {
  disciplineLockup,
  rosterHeadline,
  ROSTER_DATA,
  ROSTER_SPECIMENS,
  specimenFor,
  specimenToAthlete,
  suburbForPostcode,
  targetHorizon,
  type Athlete,
  type AthleteRecord,
} from '../data/roster';
import { AthleteCard } from '../components/AthleteCard';
import { AthleteDossierDrawer } from '../components/AthleteDossierDrawer';
import { CapitalDeploymentDrawer } from '../components/CapitalDeploymentDrawer';
import { DeliverablesDrawer } from '../components/DeliverablesDrawer';
import {
  RosterCatchmentMap,
  ringForPackage,
  type CatchmentRingId,
} from '../components/RosterCatchmentMap';
import {
  getCommercialPackage,
  mockDeliverables,
  packageIdForRosterTier,
  rosterFilterForPackage,
  rosterFlightPresentation,
  ROSTER_FILTER_TO_PACKAGE,
  toCommercialAthlete,
} from '../data/mockDeliverables';
import { clearRosterFilter, FILTER_ROSTER_TIER_EVENT, peekRosterFilter, type RosterFilterDetail } from '../lib/overlayEvents';

export type { Athlete };
export { ROSTER_DATA };

type ViewMode = 'grid' | 'directory' | 'map';
type TierFilter = 'all' | Athlete['tier'] | 'national';
type DisciplineFilter = 'all' | 'track' | 'rowing' | 'basketball' | 'combat' | 'swimming';

const VIEWS: readonly { id: ViewMode; label: string }[] = [
  { id: 'grid', label: 'Grid' },
  { id: 'directory', label: 'Directory' },
  { id: 'map', label: 'Map' },
];

const DISCIPLINES: readonly { id: DisciplineFilter; label: string }[] = [
  { id: 'all', label: 'All Disciplines' },
  { id: 'track', label: 'Track & Field' },
  { id: 'rowing', label: 'Rowing' },
  { id: 'basketball', label: 'Basketball' },
  { id: 'combat', label: 'Combat Sports' },
  { id: 'swimming', label: 'Swimming' },
];

function athleteMatchesFilter(athleteTier: Athlete['tier'], filter: TierFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'national') return athleteTier === 'metro';
  return athleteTier === filter;
}

function athleteMatchesDiscipline(sport: string, filter: DisciplineFilter): boolean {
  if (filter === 'all') return true;
  const value = sport.toLowerCase();
  if (filter === 'track') return value.includes('track') || value.includes('athletics');
  if (filter === 'rowing') return value.includes('rowing');
  if (filter === 'basketball') return value.includes('basketball');
  if (filter === 'combat') return value.includes('combat') || value.includes('boxing');
  if (filter === 'swimming') return value.includes('swim');
  return true;
}

function countForDiscipline(filter: DisciplineFilter): number {
  return ROSTER_DATA.filter((athlete) => athleteMatchesDiscipline(athlete.sport, filter)).length;
}

function athleteIdFromLocation(): string | null {
  const hash = window.location.hash;
  if (hash.startsWith('#roster')) {
    const query = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
    const fromHash = new URLSearchParams(query).get('athlete');
    if (fromHash) return fromHash;
  }
  return new URLSearchParams(window.location.search).get('athlete');
}

const normalise = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

const MANIFESTO =
  'We do not trade in social vanity or manufactured reach. tmrw/. clears direct, verified commercial rights for the emerging athletes who carry postcodes, grassroots clubs, and national podium campaigns on their backs. Every dollar is escrowed and settled across our audited 70/15/15 protocol.';

/** Finds the live Supabase athlete behind a specimen card by name. */
function matchLive(name: string, athletes: readonly DbAthlete[]): DbAthlete | null {
  const target = normalise(name);
  return athletes.find((a) => normalise(a.full_name) === target || normalise(a.name) === target) ?? null;
}

interface RosterPageProps {
  /**
   * Retained for callers that still pass a sponsor callback. The card pill opens the
   * Capital Deployment Terminal directly, pre-loaded with the athlete id and valuation.
   */
  onSponsorAthlete?: (athlete: DbAthlete | null) => void;
  /** Film reel button. Receives the live athlete when resolved, otherwise `null`. */
  onOpenMediaStudio?: (athlete: DbAthlete | null) => void;
  /** Beacon filter. When set, grid and directory keep only that specimen. */
  focusAthleteId?: string | null;
  onFocusAthlete?: (id: string | null) => void;
  /** Opens the map on a catchment ring and the capital drawer. */
  requestedPackage?: string | null;
  onPackageHandled?: () => void;
}

export const RosterPage: React.FC<RosterPageProps> = ({
  onOpenMediaStudio,
  focusAthleteId = null,
  onFocusAthlete,
  requestedPackage = null,
  onPackageHandled,
}) => {
  const [live, setLive] = useState<DbAthlete[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeRing, setActiveRing] = useState<CatchmentRingId>('15km');
  const [capitalPackageId, setCapitalPackageId] = useState<string | null>(null);
  const [tier, setTier] = useState<TierFilter>('all');
  const [discipline, setDiscipline] = useState<DisciplineFilter>('all');
  const [preferredPackageId, setPreferredPackageId] = useState<string | null>(null);
  const [tierNotice, setTierNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeDossier, setActiveDossier] = useState<AthleteRecord | null>(null);
  const [deployAthlete, setDeployAthlete] = useState<AthleteRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeAthlete, setActiveAthlete] = useState(mockDeliverables.athlete);
  const [drawerTierId, setDrawerTierId] = useState(mockDeliverables.packages[0].tier_id);

  useEffect(() => {
    let cancelled = false;
    fetchAthletes()
      .then((rows) => {
        if (!cancelled) setLive(rows);
      })
      .catch(() => {
        // Specimen valuations remain the baseline when the backend is unreachable.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = useMemo(
    () =>
      ROSTER_DATA.map((athlete) => {
        const specimen = specimenFor(athlete.id);
        const liveAthlete = matchLive(athlete.name, live);
        const liveValue = liveAthlete?.profile_data?.market_value_aud;
        const baseline = specimen?.valuation ?? 0;
        return {
          athlete,
          specimen,
          liveAthlete,
          record: liveAthlete ?? (specimen ? specimenToAthlete(specimen) : null),
          valuation: typeof liveValue === 'number' && liveValue > 0 ? liveValue : baseline,
        };
      }).filter((card) => card.specimen && card.record),
    [live],
  );

  const matchedCards = useMemo(() => {
    const q = normalise(query);
    return cards.filter((card) => {
      if (!athleteMatchesFilter(card.athlete.tier, tier)) return false;
      if (!athleteMatchesDiscipline(card.athlete.sport, discipline)) return false;
      if (!q) return true;
      const haystack = normalise(
        [
          card.athlete.name,
          card.athlete.record.full_name,
          card.athlete.record.current_club,
          card.athlete.record.social.instagram_handle,
          card.athlete.sport,
          card.athlete.league,
          card.athlete.postcode,
          card.athlete.status,
          card.athlete.agreementStatus,
          card.athlete.repCredentials,
          card.athlete.bio,
          ...card.athlete.brandCategories.available,
          ...card.athlete.brandCategories.locked,
          ...card.athlete.stats.map((stat) => `${stat.label} ${stat.value}`),
        ].join(' '),
      );
      return haystack.includes(q);
    });
  }, [cards, query, tier, discipline]);

  const visibleCards = useMemo(
    () => (focusAthleteId ? matchedCards.filter((card) => card.athlete.id === focusAthleteId) : matchedCards),
    [focusAthleteId, matchedCards],
  );

  const mapSpecimens = useMemo(
    () => matchedCards.flatMap((card) => (card.specimen ? [card.specimen] : [])),
    [matchedCards],
  );

  const applyRosterFilter = (filter: TierFilter) => {
    setTier(filter);
    setPreferredPackageId(filter === 'all' ? null : (ROSTER_FILTER_TO_PACKAGE[filter] ?? null));
    setTierNotice(null);
  };

  const openCommercialDrawer = (record: AthleteRecord, packageId?: string) => {
    setActiveAthlete(toCommercialAthlete(record));
    setDrawerTierId(packageId ?? preferredPackageId ?? packageIdForRosterTier(record.tier));
    setIsDrawerOpen(true);
  };

  useEffect(() => {
    const applyFilter = (detail: RosterFilterDetail | undefined) => {
      const tierId = detail?.tierId;
      const filter = tierId ? rosterFilterForPackage(tierId) : null;
      if (!filter || !tierId) return;
      setTier(filter);
      setPreferredPackageId(ROSTER_FILTER_TO_PACKAGE[filter] ?? tierId);
      const pkg = getCommercialPackage(tierId);
      setTierNotice(detail?.label ?? pkg?.name ?? 'this flight');
    };
    applyFilter(peekRosterFilter() ?? undefined);
    const clearTimer = window.setTimeout(() => clearRosterFilter(), 0);
    const onFilter = (event: Event) => {
      applyFilter((event as CustomEvent<RosterFilterDetail>).detail);
    };
    window.addEventListener(FILTER_ROSTER_TIER_EVENT, onFilter);
    return () => {
      window.clearTimeout(clearTimer);
      window.removeEventListener(FILTER_ROSTER_TIER_EVENT, onFilter);
    };
  }, []);

  useEffect(() => {
    const openFromLocation = () => {
      const athleteId = athleteIdFromLocation();
      if (!athleteId) return;
      if (athleteId === mockDeliverables.athlete.id) {
        setActiveAthlete(mockDeliverables.athlete);
        setDrawerTierId(preferredPackageId ?? mockDeliverables.packages[0].tier_id);
        setIsDrawerOpen(true);
        return;
      }
      const match = ROSTER_DATA.find((entry) => entry.id === athleteId);
      if (match) openCommercialDrawer(match.record);
    };
    openFromLocation();
    window.addEventListener('hashchange', openFromLocation);
    return () => window.removeEventListener('hashchange', openFromLocation);
    // preferredPackageId is read at click-time; hash return should open even if it changes later.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!requestedPackage) return;
    setViewMode('map');
    setActiveRing(ringForPackage(requestedPackage));
    setCapitalPackageId(requestedPackage);
    setDeployAthlete(null);
    onPackageHandled?.();
  }, [requestedPackage, onPackageHandled]);

  const onOpenDossier = (athlete: AthleteRecord) => setActiveDossier(athlete);

  const onViewKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const index = VIEWS.findIndex((view) => view.id === viewMode);
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const next = VIEWS[(index + delta + VIEWS.length) % VIEWS.length];
    setViewMode(next.id);
  };

  const focusedName = focusAthleteId ? specimenFor(focusAthleteId)?.name : null;

  const catalogueCount = focusAthleteId || query || tier !== 'all' || discipline !== 'all' ? visibleCards.length : ROSTER_DATA.length;
  const telemetry = `Showing ${catalogueCount} pre-cleared athletes across 8 codes / Postcodes 2000 to 4217 / AUD escrow active`;

  type RosterCard = (typeof visibleCards)[number];
  const renderSpecimen = (card: RosterCard, layout: 'hero' | 'specimen' | 'cell') => {
    const { athlete, specimen, liveAthlete, record } = card;
    if (!specimen || !record) return null;
    const flight = rosterFlightPresentation(athlete.tier, tier, athlete.league);
    return (
      <AthleteCard
        layout={layout}
        name={athlete.name}
        initials={athlete.initials}
        sportLeague={athlete.sport}
        catchmentTag={disciplineLockup(athlete.league, athlete.postcode)}
        headline={rosterHeadline(athlete)}
        milestone={targetHorizon(athlete)}
        tierLockup={flight.lockup}
        tierTag={flight.tag}
        splitLine={flight.split}
        statusLabel={athlete.status}
        image={{
          file: specimen.image,
          fallbackFiles: specimen.imageFallbacks,
          alt: specimen.imageAlt,
        }}
        athlete={athlete.record}
        onSelect={() => onOpenDossier(athlete.record)}
        onSponsor={() => openCommercialDrawer(athlete.record, flight.tierId)}
        onOpenDossier={onOpenDossier}
        onMediaStudio={() => onOpenMediaStudio?.(liveAthlete ?? specimenToAthlete(specimen))}
      />
    );
  };

  return (
    <>
      <section
        id="athletes"
        aria-labelledby="roster-heading"
        className="w-full bg-white text-black scroll-mt-[74px]"
      >
        <div id="roster" className="mx-auto max-w-[1600px] scroll-mt-[74px] px-4 py-16 sm:px-6 md:px-8 md:py-24">
        <div className="mb-10 flex flex-col gap-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <h2
              id="roster-heading"
              className="m-0 font-display text-4xl font-bold tracking-[-0.03em] leading-[0.95] text-black md:text-5xl"
            >
              Verified talent directory
            </h2>
            <p className="m-0 text-sm font-mono uppercase tracking-[0.08em] text-black/45 md:max-w-xs md:text-right">
              Pure athletic equity. Pre-cleared for live commerce.
            </p>
          </div>
          <p className="m-0 max-w-3xl text-sm leading-relaxed text-black/65 md:text-base">{MANIFESTO}</p>
          {focusAthleteId ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="m-0 font-mono text-[11px] uppercase tracking-wider text-neutral-500">
                Filtered to {focusedName ?? 'one athlete'}.
              </p>
              <button
                type="button"
                onClick={() => onFocusAthlete?.(null)}
                className="rounded-full border border-neutral-200 bg-white px-4 py-1.5 font-mono text-[10px] font-medium uppercase tracking-widest text-neutral-700 transition-colors hover:border-black hover:text-black cursor-pointer"
              >
                Clear beacon filter
              </button>
            </div>
          ) : null}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="m-0 inline-flex max-w-full items-center rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-neutral-600">
              {telemetry}
            </p>
            <div
              role="tablist"
              aria-label="Roster view"
              onKeyDown={onViewKeyDown}
              className="inline-flex shrink-0 items-center self-start rounded-full bg-neutral-200/80 p-1 shadow-[inset_0_1px_2px_rgba(15,15,17,0.08)]"
            >
              {VIEWS.map((view) => {
                const active = viewMode === view.id;
                return (
                  <button
                    key={view.id}
                    id={`roster-tab-${view.id}`}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-controls="roster-view-panel"
                    tabIndex={active ? 0 : -1}
                    onClick={() => setViewMode(view.id)}
                    className={`rounded-full px-4 py-1.5 text-xs font-mono transition-all cursor-pointer border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F0F11] focus-visible:ring-offset-2 ${
                      active
                        ? 'bg-white text-neutral-900 shadow-sm'
                        : 'bg-transparent text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    {view.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {tierNotice ? (
          <div
            role="status"
            className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[#CCFF00] bg-[#CCFF00]/15 px-5 py-3"
          >
            <p className="m-0 font-mono text-[11px] leading-relaxed text-[#080808]">
              Showing athletes pre-cleared for {tierNotice}. Select an athlete to fund this flight.
            </p>
            <button
              type="button"
              onClick={() => applyRosterFilter('all')}
              className="shrink-0 self-start rounded-full border border-[#080808]/15 bg-white px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[#080808] cursor-pointer hover:border-[#080808]"
            >
              Clear filter
            </button>
          </div>
        ) : null}

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Discipline">
            {DISCIPLINES.map((item) => {
              const active = discipline === item.id;
              const count = countForDiscipline(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setDiscipline(item.id)}
                  className={`rounded-full px-4 py-1.5 font-mono text-[10px] font-medium uppercase tracking-widest border cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F0F11] focus-visible:ring-offset-2 ${
                    active
                      ? 'bg-[#CCFF00] text-black border-[#CCFF00]'
                      : 'bg-white border-black/10 text-black/70 hover:border-black'
                  }`}
                >
                  {item.label}
                  <span className="ml-2 tabular-nums">{count}</span>
                </button>
              );
            })}
          </div>
          <label className="block w-full lg:w-80">
            <span className="sr-only">Search the verified roster</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, sport, league or postcode"
              className="w-full bg-white border border-[#080808]/15 rounded-full px-4 py-2 font-mono text-[11px] text-[#080808] placeholder:text-[#888888] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#080808]"
            />
          </label>
        </div>

        <div
          id="roster-view-panel"
          role="tabpanel"
          aria-labelledby={`roster-tab-${viewMode}`}
          key={viewMode}
          className="roster-view"
        >
          {viewMode === 'map' ? (
            <div>
              <p className="m-0 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                Local Merchant & Contra Tier
              </p>
              <h3 className="m-0 mt-3 max-w-3xl font-display text-4xl font-extrabold tracking-tight text-[#080808] md:text-5xl">
                Real loyalty never leaves the suburb.
              </h3>
              <p className="m-0 mt-4 max-w-2xl text-sm leading-relaxed text-neutral-600 md:text-base">
                A stadium billboard is seen by thousands who live 50km away and will never visit your store.
                An emerging athlete lives, trains, and commands genuine community loyalty within 15 minutes of your front counter. Back them with cash or equipment contra, and own exclusive commercial endorsement across your local postcode.
              </p>
              <div className="mt-8">
                <RosterCatchmentMap
                  activeRing={activeRing}
                  specimens={mapSpecimens}
                  focusAthleteId={focusAthleteId}
                  onSelectAthlete={(id) => onFocusAthlete?.(focusAthleteId === id ? null : id)}
                  onChangeRing={setActiveRing}
                />
              </div>
            </div>
          ) : visibleCards.length === 0 ? (
            <p className="m-0 font-mono text-xs uppercase tracking-widest text-[#666666]">
              No verified athletes match this filter.
            </p>
          ) : viewMode === 'directory' ? (
            <div className="border-t border-neutral-200">
              <div className="hidden border-b border-neutral-200 py-3 md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,1.15fr)_minmax(0,0.95fr)_auto] md:items-center md:gap-4">
                {['Specimen / Name', 'Discipline', 'League / Level', 'Postcode Catchment', 'Tier Status', 'Action CTA'].map(
                  (heading) => (
                    <span
                      key={heading}
                      className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-500"
                    >
                      {heading}
                    </span>
                  ),
                )}
              </div>
              <ul className="m-0 list-none p-0">
                {visibleCards.map(({ athlete, specimen }) =>
                  specimen ? (
                    <li
                      key={athlete.id}
                      className="grid grid-cols-1 gap-3 border-b border-neutral-200 py-5 md:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,1.15fr)_minmax(0,0.95fr)_auto] md:items-center md:gap-4 md:py-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white font-display text-sm font-extrabold tracking-tight text-[#080808]">
                          {athlete.initials}
                        </span>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => onOpenDossier(athlete.record)}
                            className="m-0 border-0 bg-transparent p-0 text-left font-display text-2xl font-extrabold tracking-tight text-[#080808] cursor-pointer hover:text-black"
                          >
                            {athlete.name}
                          </button>
                          <p className="m-0 mt-0.5 truncate font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                            {athlete.record.full_name}
                          </p>
                        </div>
                      </div>
                      <p className="m-0 font-display text-base tracking-tight text-[#080808]">{athlete.sport}</p>
                      <div>
                        <p className="m-0 text-sm text-[#080808]">{athlete.league}</p>
                        <p className="m-0 mt-0.5 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                          {athlete.record.current_club}
                        </p>
                      </div>
                      <div>
                        <p className="m-0 font-mono text-xs uppercase tracking-wider text-[#0F0F11]">
                          {disciplineLockup(athlete.league, athlete.postcode)}
                        </p>
                        <p className="m-0 mt-0.5 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                          {suburbForPostcode(athlete.postcode)}
                        </p>
                      </div>
                      <div>
                        <p className="m-0 font-mono text-[10px] font-bold uppercase tracking-wider text-[#0F0F11]">
                          {rosterFlightPresentation(athlete.tier, tier, athlete.league).lockup}
                        </p>
                        <p className="m-0 mt-1 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                          {rosterFlightPresentation(athlete.tier, tier, athlete.league).tag}
                        </p>
                        <p className="m-0 mt-1 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                          {rosterFlightPresentation(athlete.tier, tier, athlete.league).split}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          openCommercialDrawer(
                            athlete.record,
                            rosterFlightPresentation(athlete.tier, tier, athlete.league).tierId,
                          )
                        }
                        className="justify-self-start rounded-full border-0 bg-[#0F0F11] px-4 py-2 font-mono text-[10px] font-medium uppercase tracking-widest text-white transition-colors hover:bg-[#CCFF00] hover:text-black cursor-pointer md:justify-self-end"
                      >
                        View commercial deliverables
                      </button>
                    </li>
                  ) : null,
                )}
              </ul>
            </div>
          ) : (
            <ul className="m-0 grid list-none grid-cols-1 items-stretch p-0 md:grid-cols-2 lg:grid-cols-3">
              {visibleCards.map((card) => (
                <li key={card.athlete.id} className="m-0 flex min-w-0 flex-col p-0">
                  {renderSpecimen(card, 'cell')}
                </li>
              ))}
            </ul>
          )}
        </div>
        </div>
      </section>

      <AthleteDossierDrawer
        athlete={activeDossier}
        onClose={() => setActiveDossier(null)}
        onDeployCapital={(athlete) => {
          setActiveDossier(null);
          setDeployAthlete(athlete);
          setCapitalPackageId(athlete.tier);
        }}
      />
      {isDrawerOpen ? (
        <DeliverablesDrawer
          key={`${activeAthlete.id}-${drawerTierId}`}
          isOpen
          athlete={activeAthlete}
          initialTierId={drawerTierId}
          onClose={() => setIsDrawerOpen(false)}
        />
      ) : null}
      <CapitalDeploymentDrawer
        key={capitalPackageId ?? 'closed'}
        isOpen={capitalPackageId !== null}
        packageId={capitalPackageId}
        athlete={
          deployAthlete
            ? {
                id: deployAthlete.id,
                name: deployAthlete.full_name,
                display_name: deployAthlete.display_name,
                sport: deployAthlete.sport,
                valuation: deployAthlete.valuation,
              }
            : null
        }
        onClose={() => {
          setCapitalPackageId(null);
          setDeployAthlete(null);
        }}
      />
    </>
  );
};

export default RosterPage;

/** Kept so map callers can read the same count the workspace renders. */
export const ROSTER_COUNT = ROSTER_SPECIMENS.length;
