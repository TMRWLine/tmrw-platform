import React, { useEffect, useMemo, useState, useRef } from 'react';
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
type DisciplineFilter = 'all' | 'track' | 'rowing' | 'basketball' | 'combat' | 'swimming' | 'endurance' | 'surfing' | 'triathlon' | 'rugby' | 'soccer' | 'boxing' | 'crossfit';

const DISCIPLINES: readonly { id: DisciplineFilter; label: string }[] = [
  { id: 'all', label: 'All Sports' },
  { id: 'basketball', label: 'Basketball' },
  { id: 'track', label: 'Track & Field' },
  { id: 'rowing', label: 'Rowing' },
  { id: 'combat', label: 'Combat Sports' },
  { id: 'swimming', label: 'Swimming' },
  { id: 'endurance', label: 'Endurance' },
  { id: 'surfing', label: 'Surfing' },
  { id: 'triathlon', label: 'Triathlon' },
  { id: 'rugby', label: 'Rugby League' },
  { id: 'soccer', label: 'Soccer' },
  { id: 'boxing', label: 'Boxing' },
  { id: 'crossfit', label: 'CrossFit' },
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
  if (filter === 'combat') return value.includes('combat') || value.includes('wrestling');
  if (filter === 'swimming') return value.includes('swim');
  if (filter === 'surfing') return value.includes('surf');
  if (filter === 'triathlon') return value.includes('triathlon');
  if (filter === 'rugby') return value.includes('rugby') || value.includes('league');
  if (filter === 'soccer') return value.includes('soccer') || value.includes('football');
  if (filter === 'boxing') return value.includes('boxing');
  if (filter === 'crossfit') return value.includes('crossfit');
  return true;
}

function athleteIdFromLocation(): string | null {
  const hash = window.location.hash;
  if (hash.startsWith('#roster') || hash.startsWith('#the-roster')) {
    const query = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
    const fromHash = new URLSearchParams(query).get('athlete');
    if (fromHash) return fromHash;
  }
  return new URLSearchParams(window.location.search).get('athlete');
}

const normalise = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

function matchLive(name: string, athletes: readonly DbAthlete[]): DbAthlete | null {
  const target = normalise(name);
  return athletes.find((a) => normalise(a.full_name) === target || normalise(a.name) === target) ?? null;
}

interface RosterPageProps {
  onSponsorAthlete?: (athlete: DbAthlete | null) => void;
  onOpenMediaStudio?: (athlete: DbAthlete | null) => void;
  focusAthleteId?: string | null;
  onFocusAthlete?: (id: string | null) => void;
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
  const [, setActiveRing] = useState<CatchmentRingId>('15km');
  const [capitalPackageId, setCapitalPackageId] = useState<string | null>(null);
  const [tier, setTier] = useState<TierFilter>('all');
  const [discipline, setDiscipline] = useState<DisciplineFilter>('all');
  const [tempDiscipline, setTempDiscipline] = useState<DisciplineFilter>('all');
  const [preferredPackageId, setPreferredPackageId] = useState<string | null>(null);
  const [tierNotice, setTierNotice] = useState<string | null>(null);
  
  const [activeDropdown, setActiveDropdown] = useState<'filters' | 'sort' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [activeSort, setActiveSort] = useState<'recent' | 'popular' | 'az' | 'za'>('recent');
  const [tempSort, setTempSort] = useState<'recent' | 'popular' | 'az' | 'za'>('recent');

  const [highlightedCardId, setHighlightedCardId] = useState<string>(ROSTER_DATA[0]?.id ?? '');

  const [activeDossier, setActiveDossier] = useState<AthleteRecord | null>(null);
  const [deployAthlete, setDeployAthlete] = useState<AthleteRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeAthlete, setActiveAthlete] = useState(mockDeliverables.athlete);
  const [drawerTierId, setDrawerTierId] = useState(mockDeliverables.packages[0].tier_id);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAthletes()
      .then((rows) => {
        if (!cancelled) setLive(rows);
      })
      .catch(() => {});
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
    return cards.filter((card) => {
      if (!athleteMatchesFilter(card.athlete.tier, tier)) return false;
      if (!athleteMatchesDiscipline(card.athlete.sport, discipline)) return false;
      return true;
    });
  }, [cards, tier, discipline]);

  const sortedCards = useMemo(() => {
    const copy = [...matchedCards];
    if (activeSort === 'az') {
      copy.sort((a, b) => a.athlete.name.localeCompare(b.athlete.name));
    } else if (activeSort === 'za') {
      copy.sort((a, b) => b.athlete.name.localeCompare(a.athlete.name));
    } else if (activeSort === 'popular') {
      copy.sort((a, b) => b.valuation - a.valuation);
    }
    return copy;
  }, [matchedCards, activeSort]);

  const visibleCards = useMemo(
    () => (focusAthleteId ? sortedCards.filter((card) => card.athlete.id === focusAthleteId) : sortedCards),
    [focusAthleteId, sortedCards],
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

  const focusedName = focusAthleteId ? specimenFor(focusAthleteId)?.name : null;
  const catalogueCount = focusAthleteId || tier !== 'all' || discipline !== 'all' ? visibleCards.length : ROSTER_DATA.length;

  type RosterCard = (typeof visibleCards)[number];
  const renderSpecimen = (card: RosterCard, index: number) => {
    const { athlete, specimen, liveAthlete, record } = card;
    if (!specimen || !record) return null;
    const flight = rosterFlightPresentation(athlete.tier, tier, athlete.league);

    const badge =
      index === 0 || index === 1 || index === 2 || index === 4 || index === 5
        ? 'New'
        : index === 3
        ? 'Update'
        : undefined;
    const badgeVariant = index === 3 ? 'yellow' : 'red';

    return (
      <AthleteCard
        layout="card"
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
        isHighlighted={highlightedCardId === athlete.id}
        onActivate={() => setHighlightedCardId(athlete.id)}
        image={{
          file: specimen.image,
          fallbackFiles: specimen.imageFallbacks,
          alt: specimen.imageAlt,
        }}
        badge={badge}
        badgeVariant={badgeVariant}
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
        className="w-full bg-[#FFFFFF] text-[#080808] pt-2 pb-16 scroll-mt-[64px]"
      >
        {/* Anchor target for #the-roster and #roster */}
        <div id="the-roster" className="scroll-mt-[64px]" />
        <div
          id="roster"
          className="mx-auto max-w-[1840px] px-4 sm:px-6 md:px-10 w-full bg-[#FFFFFF] scroll-mt-[64px]"
        >
          
          {/* Calibrated Single-Viewport Magazine Masthead (Fits Masthead + Toolbar + Full Row 1 in 100vh) */}
          <div className="mb-4 border-t border-b border-black/10 py-3.5 md:py-4">
            {/* Top Editorial Meta Strip aligned to 4-Column Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 pb-3 mb-3 border-b border-black/5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-neutral-500">
              <div className="flex items-center gap-2 text-[#080808] font-bold">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#CCFF00] ring-1 ring-black/20" />
                <span>INDEX 01 · VERIFIED NIL ROSTER</span>
              </div>
              <div>SEASON 26/27 · LA28 &amp; BRISBANE 32 RUNWAY</div>
              <div className="hidden md:block">SETTLEMENT · 70% ATHLETE · 15% CLUB · 15% OPS</div>
              <div className="text-right text-[#080808] font-bold">PRE-CLEARED FOR IMMEDIATE DEPLOYMENT</div>
            </div>

            {/* 4-Column Editorial Grid Aligned Directly to the 4 Athlete Cards Below */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-5 items-center">
              {/* Col 1 & 2: Monumental Masthead Title */}
              <div className="lg:col-span-2">
                <h2
                  id="roster-heading"
                  className="m-0 font-display text-5xl sm:text-6xl xl:text-[74px] font-black tracking-[-0.04em] leading-[0.86] uppercase text-[#080808]"
                >
                  THE ROSTER<span className="text-[#CCFF00]">.</span>
                </h2>
              </div>

              {/* Col 3: Primary Lead Deck */}
              <div className="lg:border-l lg:border-black/10 lg:pl-5">
                <p className="m-0 font-sans text-[14.5px] sm:text-[15.5px] font-bold tracking-[-0.02em] leading-[1.28] text-[#080808]">
                  Algorithms don’t win premierships. Followers don’t fund the runway.
                </p>
                <p className="m-0 mt-1 font-sans text-[12px] leading-[1.45] text-neutral-600">
                  <strong className="text-[#080808] font-semibold">tmrw/.</strong> backs the next generation of icons with direct commercial capital from local businesses and major brands before the whistle blows.
                </p>
              </div>

              {/* Col 4: Commercial Mechanics & Partner Trust */}
              <div className="lg:border-l lg:border-black/10 lg:pl-5">
                <p className="m-0 font-sans text-[12px] leading-[1.45] text-neutral-600">
                  No ninety-day invoice traps or agency middlemen. Every package locks exclusive postcode rights for partners and triggers an instant <span className="bg-[#CCFF00] text-[#080808] font-bold px-1.5 py-0.5 rounded-[3px]">70/15/15 split</span> between the athlete, their junior club, and clearinghouse operations.
                </p>
              </div>
            </div>
          </div>

          {focusAthleteId ? (
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <p className="m-0 font-sans text-xs text-neutral-500">
                Filtered to {focusedName ?? 'one athlete'}.
              </p>
              <button
                type="button"
                onClick={() => onFocusAthlete?.(null)}
                className="rounded-full border border-neutral-200 bg-white px-4 py-1 font-sans text-xs font-medium text-neutral-700 transition-colors hover:border-black hover:text-black cursor-pointer"
              >
                Clear beacon filter
              </button>
            </div>
          ) : null}

          {/* Exact Pangram 4-Column Spread Toolbar */}
          <div ref={dropdownRef} className="relative grid grid-cols-1 md:grid-cols-4 items-center mb-4 gap-5">
            
            {/* Col 1: Our athlete library */}
            <div>
              <span className="font-sans font-bold text-[14px] text-[#080808] tracking-tight">
                Our athlete library
              </span>
            </div>

            {/* Col 2: Showing count */}
            <div>
              <span className="font-sans text-[12.5px] font-normal text-[#080808] tracking-tight">
                Showing {catalogueCount} of {ROSTER_DATA.length} athletes
              </span>
            </div>

            {/* Col 3: Card view & List view */}
            <div className="flex items-center gap-7 font-sans text-[12.5px] font-medium tracking-tight">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-2 border-0 bg-transparent p-0 cursor-pointer transition-colors ${
                  viewMode === 'grid' ? 'text-[#080808] font-bold' : 'text-neutral-500 hover:text-black'
                }`}
              >
                <svg
                  className={`w-5 h-5 shrink-0 ${viewMode === 'grid' ? 'text-[#CCFF00]' : 'text-neutral-400'}`}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  stroke="#080808"
                  strokeWidth={viewMode === 'grid' ? '1.2' : '0'}
                >
                  <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
                  <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
                  <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
                  <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
                </svg>
                <span
                  className={
                    viewMode === 'grid'
                      ? 'bg-[#CCFF00] text-[#080808] px-2 py-0.5 rounded-[4px] font-bold'
                      : ''
                  }
                >
                  Card view
                </span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('directory')}
                className={`flex items-center gap-2 border-0 bg-transparent p-0 cursor-pointer transition-colors ${
                  viewMode === 'directory' ? 'text-[#080808] font-bold' : 'text-[#080808] hover:text-neutral-600'
                }`}
              >
                <svg className="w-5 h-5 text-[#080808] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
                <span
                  className={
                    viewMode === 'directory'
                      ? 'bg-[#CCFF00] text-[#080808] px-2 py-0.5 rounded-[4px] font-bold'
                      : ''
                  }
                >
                  List view
                </span>
              </button>
            </div>

            {/* Col 4: Filters & Recent first */}
            <div className="flex items-center justify-end gap-8 font-sans text-[12.5px] font-normal">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setTempDiscipline(discipline);
                    setActiveDropdown(activeDropdown === 'filters' ? null : 'filters');
                  }}
                  className="flex items-center gap-2 text-[#080808] hover:text-neutral-600 cursor-pointer border-0 bg-transparent p-0"
                >
                  <span>Filters</span>
                  <svg className="w-4 h-4 text-[#080808]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="8" x2="21" y2="8"></line>
                    <line x1="3" y1="16" x2="21" y2="16"></line>
                    <circle cx="9" cy="8" r="2.5" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.8"></circle>
                    <circle cx="15" cy="16" r="2.5" fill="#FFFFFF" stroke="currentColor" strokeWidth="1.8"></circle>
                  </svg>
                </button>

                {activeDropdown === 'filters' && (
                  <div className="absolute right-0 mt-3 w-80 bg-white border border-black/10 rounded-2xl p-5 shadow-2xl z-50">
                    <div className="grid grid-cols-2 gap-2 mb-6 max-h-64 overflow-y-auto pr-1">
                      {DISCIPLINES.map((item) => {
                        const isSelected = tempDiscipline === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setTempDiscipline(item.id)}
                            className={`rounded-full px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-black text-white border-black'
                                : 'bg-neutral-100 text-neutral-700 border-transparent hover:bg-neutral-200'
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDiscipline(tempDiscipline);
                        setActiveDropdown(null);
                      }}
                      className="w-full rounded-full bg-[#CCFF00] hover:bg-black hover:text-white text-black font-mono font-bold text-xs uppercase tracking-widest py-3 transition-colors cursor-pointer shadow-sm"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setTempSort(activeSort);
                    setActiveDropdown(activeDropdown === 'sort' ? null : 'sort');
                  }}
                  className="flex items-center gap-2 text-[#080808] hover:text-neutral-600 cursor-pointer border-0 bg-transparent p-0"
                >
                  <span>{activeSort === 'recent' ? 'Recent first' : activeSort === 'popular' ? 'Most popular first' : activeSort === 'az' ? 'Alphabetical A-Z' : 'Alphabetical Z-A'}</span>
                  <svg className="w-4 h-4 text-[#080808]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 4v16m0 0l-3.5-3.5M7 20l3.5-3.5"></path>
                    <path d="M17 20V4m0 0l-3.5 3.5M17 4l3.5 3.5"></path>
                  </svg>
                </button>

                {activeDropdown === 'sort' && (
                  <div className="absolute right-0 mt-3 w-56 bg-white border border-black/10 rounded-2xl p-2 shadow-2xl z-50">
                    {[
                      { id: 'recent', label: 'Recent first' },
                      { id: 'popular', label: 'Most popular first' },
                      { id: 'az', label: 'Alphabetical A-Z' },
                      { id: 'za', label: 'Alphabetical Z-A' },
                    ].map((sortOption) => {
                      const isSelected = tempSort === sortOption.id;
                      return (
                        <button
                          key={sortOption.id}
                          type="button"
                          onClick={() => setTempSort(sortOption.id as any)}
                          className={`w-full text-left rounded-xl px-4 py-2.5 font-mono text-xs tracking-wider transition-colors cursor-pointer border-0 ${
                            isSelected ? 'bg-black text-white font-bold' : 'bg-transparent text-neutral-700 hover:bg-neutral-100'
                          }`}
                        >
                          {sortOption.label}
                        </button>
                      );
                    })}
                    <div className="pt-2 border-t border-neutral-100 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSort(tempSort);
                          setActiveDropdown(null);
                        }}
                        className="w-full rounded-xl bg-[#CCFF00] hover:bg-black hover:text-white text-black font-mono font-bold text-[11px] uppercase tracking-widest py-2.5 transition-colors cursor-pointer shadow-sm"
                      >
                        Apply Sort
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {tierNotice ? (
            <div
              role="status"
              className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[#CCFF00] bg-[#CCFF00]/15 px-5 py-2.5"
            >
              <p className="m-0 font-mono text-[11px] leading-relaxed text-[#080808]">
                Showing athletes pre-cleared for {tierNotice}. Select an athlete to fund this flight.
              </p>
              <button
                type="button"
                onClick={() => applyRosterFilter('all')}
                className="shrink-0 self-start rounded-full border border-[#080808]/15 bg-white px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[#080808] cursor-pointer hover:border-[#080808]"
              >
                Clear filter
              </button>
            </div>
          ) : null}

          <div
            id="roster-view-panel"
            role="tabpanel"
            aria-labelledby={`roster-tab-${viewMode}`}
            key={viewMode}
            className="roster-view bg-[#FFFFFF]"
          >
            {visibleCards.length === 0 ? (
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
                            {disciplineLockup(athlete.league, athlete.postcode).replace(/\/\//g, '·')}
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
              <ul className="m-0 grid list-none grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-stretch gap-x-5 gap-y-6 p-0 pt-2">
                {visibleCards.map((card, index) => (
                  <li key={card.athlete.id} className="m-0 flex min-w-0 flex-col p-0">
                    {renderSpecimen(card, index)}
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
        onSelectAthlete={(athlete) => {
          setHighlightedCardId(athlete.id);
          setActiveDossier(athlete);
        }}
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

export const ROSTER_COUNT = ROSTER_SPECIMENS.length;