import { BadgeCheck, Crosshair, Film, Instagram, Search, ShieldCheck, User } from 'lucide-react';
import { useState } from 'react';
import type { Athlete } from '../types';
import { athleteDisplayName, athleteInitials } from '../lib/formatName';
import { athleteDossier } from '../lib/athleteDossier';
import { LEAGUE_FILTERS, type LeagueFilterId } from '../lib/rosterDiscovery';

export function RosterSection({
  athletes,
  loading,
  query,
  league,
  onQueryChange,
  onLeagueChange,
  onPrimary,
  onPerson,
  onFilm,
}: {
  athletes: Athlete[];
  loading: boolean;
  query: string;
  league: LeagueFilterId;
  onQueryChange: (value: string) => void;
  onLeagueChange: (value: LeagueFilterId) => void;
  onPrimary: (athlete: Athlete) => void;
  onPerson: (athlete: Athlete) => void;
  onFilm: (athlete: Athlete) => void;
}) {
  return (
    <div>
      <div className="roster-discovery">
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
        <div className="league-pills" role="tablist" aria-label="League filters">
          {LEAGUE_FILTERS.map((pill) => (
            <button
              key={pill.id}
              type="button"
              role="tab"
              aria-selected={league === pill.id}
              className={`league-pill${league === pill.id ? ' is-active' : ''}`}
              onClick={() => onLeagueChange(pill.id)}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="state">
          <div className="spinner" />
          Loading athletes…
        </div>
      ) : athletes.length === 0 ? (
        <div className="state">No athletes match that handle, suburb, or league filter.</div>
      ) : (
        <div className="grid">
          {athletes.map((athlete, index) => (
            <AthleteRosterCard
              key={athlete.id ?? `athlete-${index}`}
              athlete={athlete}
              onPrimary={() => onPrimary(athlete)}
              onPerson={() => onPerson(athlete)}
              onFilm={() => onFilm(athlete)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AthleteRosterCard({
  athlete,
  onPrimary,
  onPerson,
  onFilm,
}: {
  athlete: Athlete;
  onPrimary: () => void;
  onPerson: () => void;
  onFilm: () => void;
}) {
  const st = statusBadge(athlete?.licence_status ?? athlete?.agreement_status);
  const ipLocked = athlete?.ip_lock === true || athlete?.master_licence_signed === true;
  const name = athleteDisplayName(athlete);
  const club = athlete.current_club ?? athlete.club ?? 'Independent';
  const dossier = athleteDossier(athlete);
  const [portraitFailed, setPortraitFailed] = useState(false);

  return (
    <div className="athlete-card border-grid">
      <div className="athlete-card-top">
        <div className="athlete-avatar overflow-hidden p-0">
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
          <h3 className="athlete-card-name">{name}</h3>
          <span className="athlete-card-sport">{club}</span>
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
            <Crosshair size={11} /> {athlete.postcode}
          </span>
        )}
        <span className="athlete-tag font-mono">{dossier.suburb}</span>
        {athlete?.sport && (
          <span className="athlete-tag font-mono uppercase">{athlete.sport}</span>
        )}
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
      <div className="athlete-social-telemetry font-mono">
        <span>{dossier.engagementRate.toFixed(1)}% eng</span>
        <span>{(dossier.communityReach / 1000).toFixed(1)}k reach</span>
        <span>{dossier.following.toLocaleString('en-AU')} following</span>
      </div>
      <div className="athlete-card-actions">
        <button
          type="button"
          className="athlete-sponsor-btn bg-brand-white text-brand-black rounded-none"
          onClick={onPrimary}
        >
          Sponsor Athlete
        </button>
        <button type="button" className="athlete-icon-btn" onClick={onPerson} aria-label="View profile">
          <User size={16} />
        </button>
        <button type="button" className="athlete-icon-btn" onClick={onFilm} aria-label="Match footage">
          <Film size={16} />
        </button>
      </div>
    </div>
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
