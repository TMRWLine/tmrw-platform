import type { Athlete } from '../types';
import { athleteDisplayName } from './formatName';

export type LeagueFilterId = 'all' | 'nbl1' | 'shute' | 'nswrl' | 'cricket';

export const LEAGUE_FILTERS: { id: LeagueFilterId; label: string }[] = [
  { id: 'all', label: '@ALL' },
  { id: 'nbl1', label: '@NBL1' },
  { id: 'shute', label: 'SHUTE SHIELD' },
  { id: 'nswrl', label: 'NSWRL / QRL' },
  { id: 'cricket', label: 'PREMIER CRICKET' },
];

const POSTCODE_SUBURB: Record<string, string> = {
  '2000': 'Sydney',
  '2010': 'Surry Hills',
  '2020': 'Bondi',
  '2030': 'Randwick',
  '2040': 'Marrickville',
  '2042': 'Newtown',
  '2060': 'North Sydney',
  '2088': 'Mosman',
  '2090': 'Crows Nest',
  '2145': 'Westmead',
  '2150': 'Parramatta',
  '2300': 'Newcastle',
  '2500': 'Wollongong',
  '2600': 'Canberra',
  '3000': 'Melbourne',
  '3065': 'Fitzroy',
  '3121': 'Richmond',
  '3182': 'St Kilda',
  '4000': 'Brisbane',
  '5000': 'Adelaide',
  '6000': 'Perth',
};

export function suburbForPostcode(postcode: string | null | undefined): string {
  if (!postcode) return 'Metro catchment';
  return POSTCODE_SUBURB[postcode] ?? `Postcode ${postcode}`;
}

export function normalizeHandle(raw: string | null | undefined): string {
  const slug = (raw ?? '').trim().replace(/^@+/, '').toLowerCase();
  return slug ? `@${slug}` : '';
}

export function instagramUrl(handle: string): string {
  return `https://instagram.com/${handle.replace(/^@/, '')}`;
}

export function deriveInstagramHandle(athlete: Athlete, name: string, sport: string, club: string): string {
  const stored = normalizeHandle(athlete.instagram_handle);
  if (stored) return stored;
  const parts = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  const slug = parts.join('.') || 'athlete';
  const s = sport.toLowerCase();
  if (s.includes('basket')) {
    const clubNorm = club.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (clubNorm && clubNorm !== 'independent') return `@${clubNorm.slice(0, 10)}ball_nbl1`;
    return `@${parts.join('') || 'baller'}_nbl1`;
  }
  return `@${slug}`;
}

export function athleteLeagueId(athlete: Athlete): LeagueFilterId | 'other' {
  const tag = (athlete.tier_tag ?? '').toLowerCase();
  const sport = (athlete.sport ?? '').toLowerCase();
  const hay = `${tag} ${sport}`;
  if (hay.includes('nbl1') || sport.includes('basket')) return 'nbl1';
  if (hay.includes('shute') || (sport.includes('rugby') && sport.includes('union'))) return 'shute';
  if (hay.includes('nswrl') || hay.includes('qrl') || (sport.includes('rugby') && sport.includes('league'))) {
    return 'nswrl';
  }
  if (hay.includes('cricket') || hay.includes('premier')) return 'cricket';
  return 'other';
}

export function leagueHandleForAthlete(athlete: Athlete): string {
  switch (athleteLeagueId(athlete)) {
    case 'nbl1':
      return '@nbl1';
    case 'shute':
      return '@shuteshield';
    case 'nswrl':
      return '@nswrl';
    case 'cricket':
      return '@premiercricket';
    default:
      return '';
  }
}

export function matchesRosterQuery(athlete: Athlete, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const name = athleteDisplayName(athlete);
  const sport = athlete.sport ?? '';
  const club = athlete.current_club ?? athlete.club ?? 'Independent';
  const handle = deriveInstagramHandle(athlete, name, sport, club).toLowerCase();
  const league = leagueHandleForAthlete(athlete).toLowerCase();
  const suburb = (athlete.suburb || suburbForPostcode(athlete.postcode)).toLowerCase();
  const postcode = (athlete.postcode ?? '').toLowerCase();
  if (q.startsWith('@')) {
    if (q === '@') return true;
    return handle.includes(q) || league.includes(q) || handle.replace('@', '').includes(q.slice(1));
  }
  return name.toLowerCase().includes(q) || suburb.includes(q) || postcode.includes(q) || handle.includes(q);
}

export function filterRoster(
  athletes: Athlete[],
  query: string,
  league: LeagueFilterId
): Athlete[] {
  return athletes.filter((athlete) => {
    if (!athlete) return false;
    if (league !== 'all' && athleteLeagueId(athlete) !== league) return false;
    return matchesRosterQuery(athlete, query);
  });
}
