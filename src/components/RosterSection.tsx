import { BadgeCheck, Crosshair, Film, Instagram, Search, ShieldCheck, User } from 'lucide-react';
import { LayoutGroup, motion } from 'motion/react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Athlete } from '../types';
import { athleteDisplayName, athleteInitials } from '../lib/formatName';
import { athleteDossier } from '../lib/athleteDossier';
import { originForPostcode, type GeoPoint } from '../lib/catchmentLandmarks';
import { LEAGUE_FILTERS, type LeagueFilterId } from '../lib/rosterDiscovery';
import { CapitalAllocationTerminal } from './CapitalAllocationTerminal';

type RosterView = 'grid' | 'catchment';

const VIEW_OPTIONS: { id: RosterView; label: string }[] = [
  { id: 'grid', label: 'SPECIMEN GRID' },
  { id: 'catchment', label: 'SPATIAL CATCHMENT' },
];

const EXCLUSIVITY_CATEGORIES = ['AUTOMOTIVE', 'QSR', 'APPAREL', 'BEVERAGE', 'FINANCIAL', 'TELCO'] as const;
const PERIMETER_KM = 15;
const ALLOCATED_SHARE = 42;

export function RosterSection({
  athletes,
  loading,
  query,
  league,
  onQueryChange,
  onLeagueChange,
  onPrimary,
  onOpenProfile,
  onOpenFilm,
  mapSlot,
}: {
  athletes: Athlete[];
  loading: boolean;
  query: string;
  league: LeagueFilterId;
  onQueryChange: (value: string) => void;
  onLeagueChange: (value: LeagueFilterId) => void;
  onPrimary: (athlete: Athlete) => void;
  onOpenProfile: (athlete: Athlete) => void;
  onOpenFilm: (athlete: Athlete) => void;
  mapSlot?: ReactNode;
}) {
  const [view, setView] = useState<RosterView>('grid');
  const [targetPostcode, setTargetPostcode] = useState('');

  const visibleAthletes = useMemo(
    () => athletes.filter((athlete) => athleteInPostcodePerimeter(athlete, targetPostcode)),
    [athletes, targetPostcode]
  );

  useEffect(() => {
    if (view !== 'catchment') return;
    const pulse = window.setTimeout(() => window.dispatchEvent(new Event('resize')), 80);
    return () => window.clearTimeout(pulse);
  }, [view]);

  return (
    <div className="pt-12 md:pt-16">
      <header className="flex flex-col gap-3 pt-0 pb-6">
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#D2FF00] m-0">
          The Postcode Roster // Back the town that backs your business
        </p>
        <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white m-0">
          The Stadiums Are Loud. The Suburbs Carry the Soul.
        </h2>
        <p className="text-sm text-zinc-400 m-0 max-w-2xl">
          Backing the players, fighters, and ballers who run our neighbourhoods within fifteen kilometres of where they
          live, train, and play.
        </p>
      </header>
      <div className="roster-discovery">
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="bg-neutral-900/80 p-1 rounded-lg border border-white/10 inline-flex items-center gap-1"
            role="tablist"
            aria-label="Roster view"
          >
            {VIEW_OPTIONS.map((option) => {
              const active = view === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setView(option.id)}
                  className={
                    active
                      ? 'bg-white/10 text-white shadow-sm rounded-md px-4 py-1.5 text-xs font-mono tracking-wider border-0 cursor-pointer'
                      : 'text-neutral-400 hover:text-white px-4 py-1.5 text-xs font-mono tracking-wider transition-colors bg-transparent border-0 cursor-pointer'
                  }
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <input
            type="search"
            inputMode="numeric"
            value={targetPostcode}
            onChange={(e) => setTargetPostcode(e.target.value)}
            placeholder="ENTER TARGET POSTCODE (E.G. 2026, 4000)..."
            aria-label="Target postcode"
            autoComplete="off"
            className="min-w-[260px] flex-1 bg-neutral-900/60 border border-white/10 rounded-lg px-4 py-2 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
          />
        </div>
        <label className="roster-search" htmlFor="roster-search">
          <Search size={14} />
          <input
            id="roster-search"
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Suburb, postcode, athlete name, or @handle"
            autoComplete="off"
          />
        </label>
        {view === 'grid' ? (
          <LeagueFilterPills league={league} onLeagueChange={onLeagueChange} />
        ) : null}
      </div>
      {view === 'catchment' && mapSlot ? (
        <div className="relative isolate z-10 w-full overflow-hidden mt-4 mb-8 h-[70vh] min-h-[600px]">
          <div className="absolute top-4 left-4 right-4 z-20 pointer-events-auto">
            <div className="inline-flex max-w-full rounded-lg border border-white/15 bg-[#08080A]/80 backdrop-blur-md px-2 py-2">
              <LeagueFilterPills league={league} onLeagueChange={onLeagueChange} />
            </div>
          </div>
          {mapSlot}
        </div>
      ) : null}
      {view === 'grid' && <CapitalAllocationTerminal athletes={visibleAthletes} />}

      {view === 'grid' &&
        (loading ? (
          <div className="state">
            <div className="spinner" />
            Loading athletes…
          </div>
        ) : visibleAthletes.length === 0 ? (
          <div className="state">
            {targetPostcode.trim()
              ? 'No athletes operate within that suburban perimeter.'
              : 'No athletes match that handle, suburb, or league filter.'}
          </div>
        ) : (
          <LayoutGroup>
            <div className="flex flex-wrap gap-4 mt-2">
              {visibleAthletes.map((athlete, index) => (
                <AthleteRosterCard
                  key={athlete.id ?? `athlete-${index}`}
                  athlete={athlete}
                  onPrimary={() => onPrimary(athlete)}
                  onOpenProfile={onOpenProfile}
                  onOpenFilm={onOpenFilm}
                />
              ))}
            </div>
          </LayoutGroup>
        ))}
    </div>
  );
}

function LeagueFilterPills({
  league,
  onLeagueChange,
}: {
  league: LeagueFilterId;
  onLeagueChange: (value: LeagueFilterId) => void;
}) {
  return (
    <LayoutGroup id="league-filter-pills">
      <div className="league-pills relative z-20" role="tablist" aria-label="League filters">
        {LEAGUE_FILTERS.map((pill) => (
          <button
            key={pill.id}
            type="button"
            role="tab"
            aria-selected={league === pill.id}
            className={`league-pill relative overflow-hidden${league === pill.id ? ' is-active' : ''}`}
            style={league === pill.id ? { background: 'transparent' } : undefined}
            onClick={() => onLeagueChange(pill.id)}
          >
            {league === pill.id && (
              <motion.span
                layoutId="activeFilterPill"
                className="absolute inset-0 z-0 bg-[#D2FF00]"
                transition={{ type: 'spring', damping: 26, stiffness: 210 }}
                aria-hidden="true"
              />
            )}
            <span className="relative z-10">{pill.label}</span>
          </button>
        ))}
      </div>
    </LayoutGroup>
  );
}

const ICON_BTN =
  'relative z-30 pointer-events-auto cursor-pointer p-2.5 rounded-lg border border-white/10 bg-white/[0.03] hover:border-[#D2FF00]/50 hover:text-[#D2FF00] text-zinc-300 transition-all';

function AthleteRosterCard({
  athlete,
  onPrimary,
  onOpenProfile,
  onOpenFilm,
}: {
  athlete: Athlete;
  onPrimary: () => void;
  onOpenProfile: (athlete: Athlete) => void;
  onOpenFilm: (athlete: Athlete) => void;
}) {
  const st = statusBadge(athlete?.licence_status ?? athlete?.agreement_status);
  const ipLocked = athlete?.ip_lock === true || athlete?.master_licence_signed === true;
  const name = athleteDisplayName(athlete);
  const club = athlete.current_club ?? athlete.club ?? 'Independent';
  const dossier = athleteDossier(athlete);
  const exclusivity = categoryExclusivity(athlete);
  const [portraitFailed, setPortraitFailed] = useState(false);

  return (
    <motion.div
      layout
      transition={{ type: 'spring', damping: 26, stiffness: 210 }}
      className="athlete-card relative z-10 h-auto min-h-0 opacity-100 grow basis-[320px] max-w-full bg-[#0C0C0E] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors text-white"
      style={{ height: 'auto', backgroundColor: '#0C0C0E' }}
    >
      <div className="athlete-card-top">
        <div className="athlete-avatar relative z-[1] overflow-hidden p-0 opacity-100">
          {!portraitFailed ? (
            <img
              src={dossier.portraitUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setPortraitFailed(true)}
            />
          ) : (
            athlete?.initials || athleteInitials(name)
          )}
        </div>
        <div className="athlete-card-info">
          <p
            className={`font-mono text-[10px] tracking-[0.16em] uppercase m-0 mb-1 ${
              exclusivity.allocated ? 'text-[#D2FF00]' : 'text-neutral-400'
            }`}
          >
            {exclusivity.category}: {exclusivity.allocated ? 'ALLOCATED' : 'OPEN'}
          </p>
          <h3 className="athlete-card-name relative z-[1] text-white opacity-100">{name}</h3>
          <span className="athlete-card-sport relative z-[1] text-zinc-400 opacity-100">{club}</span>
          {dossier.verified && (
            <span className="athlete-tag ip-lock mt-1 inline-flex">
              <BadgeCheck size={11} /> Verified
            </span>
          )}
          <a
            className="athlete-ig"
            href={dossier.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Instagram size={11} /> {dossier.instagramHandle}
          </a>
        </div>
        <span className={`athlete-status ${st.cls}`}>
          {st.cls === 'active' && <span className="status-dot" />}
          {st.label}
        </span>
      </div>
      <div className="athlete-card-tags">
        {athlete?.postcode && (
          <span className="athlete-tag font-mono">
            <Crosshair size={11} /> <span className="tabular-nums">{athlete.postcode}</span>
          </span>
        )}
        <span className="athlete-tag font-mono">{dossier.suburb}</span>
        {athlete?.sport && (
          <span className="athlete-tag font-mono uppercase">{athlete.sport}</span>
        )}
        <span className="athlete-league-badge" title={club}>
          {dossier.clubInitials}
        </span>
        {dossier.leagueHandle && <span className="athlete-league-badge">{dossier.leagueHandle}</span>}
        {ipLocked && (
          <span className="athlete-tag ip-lock">
            <ShieldCheck size={11} /> IP Lock
          </span>
        )}
        {athlete?.nrl_tpa_registered && (
          <span className="athlete-tag">
            <BadgeCheck size={11} /> NRL TPA
          </span>
        )}
        {athlete?.shute_shield_compliant && (
          <span className="athlete-tag">
            <BadgeCheck size={11} /> Shute Shield
          </span>
        )}
      </div>
      <div className="athlete-social-telemetry font-mono tabular-nums">
        <span>{dossier.following.toLocaleString('en-AU')} followers</span>
        <span>{dossier.engagementRate.toFixed(1)}% eng</span>
        <span>+{dossier.audienceVelocityPct}%/wk reach velocity</span>
        <span>{dossier.reachPct}% community reach</span>
      </div>
      <div className="athlete-card-actions">
        <button
          type="button"
          className="athlete-sponsor-btn bg-brand-white text-brand-black rounded-none"
          onClick={onPrimary}
        >
          Sponsor Athlete
        </button>
        <button
          type="button"
          className={ICON_BTN}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onOpenProfile(athlete);
          }}
          aria-label="View profile"
        >
          <User size={16} />
        </button>
        <button
          type="button"
          className={ICON_BTN}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onOpenFilm(athlete);
          }}
          aria-label="Match footage"
        >
          <Film size={16} />
        </button>
      </div>
    </motion.div>
  );
}

function categoryExclusivity(athlete: Athlete): { category: string; allocated: boolean } {
  const seed = hashSeed(athlete.id || athleteDisplayName(athlete));
  return {
    category: EXCLUSIVITY_CATEGORIES[seed % EXCLUSIVITY_CATEGORIES.length],
    allocated: seed % 100 < ALLOCATED_SHARE,
  };
}

function athleteInPostcodePerimeter(athlete: Athlete, raw: string): boolean {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return true;
  const athleteDigits = (athlete.postcode ?? '').replace(/\D/g, '');
  if (athleteDigits.startsWith(digits)) return true;
  if (digits.length < 4) return false;
  return haversineKm(originForPostcode(digits), athleteOrigin(athlete)) <= PERIMETER_KM;
}

function athleteOrigin(athlete: Athlete): GeoPoint {
  if (athlete.latitude != null && athlete.longitude != null) {
    return { lat: athlete.latitude, lng: athlete.longitude };
  }
  return originForPostcode(athlete.postcode);
}

function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function hashSeed(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
}

function statusBadge(status?: string | null): { label: string; cls: string } {
  switch ((status ?? '').toLowerCase().replace(/\s+/g, '_')) {
    case 'active':
      return { label: 'Active', cls: 'active' };
    case 'pending':
      return { label: 'Pending', cls: 'pending' };
    case 'expired':
      return { label: 'Expired', cls: 'warning' };
    default:
      return { label: 'No agreement', cls: '' };
  }
}
