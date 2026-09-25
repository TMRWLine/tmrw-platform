import { BadgeCheck, Crosshair, Film, Instagram, Search, ShieldCheck, User } from 'lucide-react';
import { LayoutGroup, motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import type { Athlete } from '../types';
import { athleteDisplayName, athleteInitials } from '../lib/formatName';
import { athleteDossier } from '../lib/athleteDossier';
import { LEAGUE_FILTERS, type LeagueFilterId } from '../lib/rosterDiscovery';
import { CapitalAllocationTerminal } from './CapitalAllocationTerminal';

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
  map,
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
  map?: ReactNode;
}) {
  return (
    <div>
      <header className="flex flex-col gap-3 pt-0 pb-0">
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
      <div className="space-y-8 mt-8">
        <div className="roster-discovery !m-0">
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
          <LayoutGroup id="league-filter-pills">
            <div className="league-pills" role="tablist" aria-label="League filters">
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
        </div>
        {map}
        {loading ? (
          <div className="state">
            <div className="spinner" />
            Loading athletes…
          </div>
        ) : athletes.length === 0 ? (
          <div className="state">No athletes match that handle, suburb, or league filter.</div>
        ) : (
          <LayoutGroup>
            <div className="flex flex-wrap gap-3">
              {athletes.map((athlete, index) => (
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
        )}
      </div>
      <div className="mt-8">
        <CapitalAllocationTerminal athletes={athletes} />
      </div>
    </div>
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
  const [portraitFailed, setPortraitFailed] = useState(false);

  return (
    <motion.div
      layout
      initial={false}
      transition={{ type: 'spring', damping: 26, stiffness: 210 }}
      className="athlete-card relative z-10 min-w-[300px] flex-1 basis-[320px] min-h-[280px] opacity-100 bg-[#0C0C0E] border border-white/10 rounded-xl p-5 text-white hover:border-white/20 transition-colors overflow-visible"
      style={{
        height: 'auto',
        minHeight: 280,
        background: '#0C0C0E',
        opacity: 1,
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.1)',
        padding: 20,
      }}
    >
      <div className="athlete-card-top relative z-10">
        <div className="athlete-avatar relative z-10 overflow-hidden p-0">
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
        <div className="athlete-card-info relative z-10">
          <h3 className="athlete-card-name text-white">{name}</h3>
          <span className="athlete-card-sport text-zinc-400">{club}</span>
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
