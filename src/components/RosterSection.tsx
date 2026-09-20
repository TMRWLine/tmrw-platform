import { BadgeCheck, Crosshair, Film, ShieldCheck, User } from 'lucide-react';
import { useState } from 'react';
import type { Athlete } from '../types';
import { athleteDisplayName, athleteInitials } from '../lib/formatName';
import { athleteDossier } from '../lib/athleteDossier';

export function RosterSection({
  athletes,
  loading,
  onPrimary,
  onPerson,
  onFilm,
}: {
  athletes: Athlete[];
  loading: boolean;
  onPrimary: (athlete: Athlete) => void;
  onPerson: (athlete: Athlete) => void;
  onFilm: (athlete: Athlete) => void;
}) {
  if (loading) {
    return (
      <div className="state">
        <div className="spinner" />
        Loading athletes…
      </div>
    );
  }

  return (
    <div className="grid">
      {athletes.filter(Boolean).map((athlete, index) => (
        <AthleteRosterCard
          key={athlete.id ?? `athlete-${index}`}
          athlete={athlete}
          onPrimary={() => onPrimary(athlete)}
          onPerson={() => onPerson(athlete)}
          onFilm={() => onFilm(athlete)}
        />
      ))}
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
  const leagueTag = (athlete?.tier_tag || getLeagueTag(athlete?.sport))?.toLowerCase();
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
        {athlete?.sport && (
          <span className="athlete-tag font-mono uppercase">{athlete.sport}</span>
        )}
        {leagueTag && <span className="athlete-league-badge">{leagueTag}</span>}
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

function getLeagueTag(sport: string | null): string | null {
  if (!sport) return null;
  const s = sport.toLowerCase();
  if (s.includes('basketball')) return '@nbl1';
  if (s.includes('soccer') || s.includes('football')) return '@nplnsw';
  if (s.includes('rugby') && s.includes('union')) return '@shuteshield';
  if (s.includes('rugby') && s.includes('league')) return '@nrl';
  if (s.includes('afl')) return '@vfl';
  if (s.includes('netball')) return '@ssn';
  if (s.includes('cricket')) return '@nswpremier';
  if (s.includes('combat')) return '@csa';
  return null;
}
