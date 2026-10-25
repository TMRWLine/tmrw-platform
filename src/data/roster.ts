import type { Athlete as DbAthlete } from '../types';
import { DATABASE_ROSTER, type AthleteRecord } from './rosterData';

/**
 * Sovereign roster specimen. Distinct from the Supabase `Athlete` row in `src/types`.
 * Commercial rights bind to `postcode` inside `radiusKm`.
 * Projected from the verified `DATABASE_ROSTER` records.
 */
export type AgreementStatusLabel = AthleteRecord['agreement_status'];

export type { AthleteRecord };
export { DATABASE_ROSTER };

export interface Athlete {
  id: string;
  name: string;
  initials: string;
  sport: string;
  league: string;
  postcode: string;
  radiusKm: number;
  image: string;
  valuation: string;
  status: string;
  tier: 'storefront' | 'metro' | 'regional';
  agreementStatus: AgreementStatusLabel;
  brandCategories: {
    available: string[];
    locked: string[];
  };
  stats: { label: string; value: string }[];
  bio: string;
  repCredentials: string;
  videoUrl?: string;
  /** Verified database row this card was projected from. */
  record: AthleteRecord;
}

/**
 * The verified rows keep their original image URLs. These stand-ins load only when that
 * URL 404s, so the card still shows athletic photography.
 */
const IMAGE_FALLBACKS: Record<string, readonly string[]> = {
  '33333333-3333-3333-3333-333333333333': [
    'https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&w=800&q=80',
  ],
  '44444444-4444-4444-4444-444444444444': [
    'https://images.unsplash.com/photo-1480099225005-2513c8947aec?auto=format&fit=crop&w=800&q=80',
  ],
  '77777777-7777-7777-7777-777777777777': [
    'https://images.unsplash.com/photo-1486218119243-13883505764c?auto=format&fit=crop&w=800&q=80',
  ],
};

/** Suburb names for roster postcodes, shown on directory rows and map pins. */
export const SUBURB_BY_POSTCODE: Record<string, string> = {
  '2200': 'Bankstown',
  '2006': 'Camperdown',
  '2026': 'Bondi',
  '2042': 'Newtown',
  '2230': 'Cronulla',
  '2107': 'Avalon Beach',
  '3207': 'Port Melbourne',
  '2031': 'Randwick',
  '2165': 'Fairfield',
  '2046': 'Abbotsford',
  '3000': 'Melbourne',
  '2112': 'Ryde',
  '3128': 'Box Hill',
  '3081': 'Heidelberg West',
  '2148': 'Blacktown',
};

export function suburbForPostcode(postcode: string): string {
  return SUBURB_BY_POSTCODE[postcode] ?? `Postcode ${postcode}`;
}

/** WGS84 beacons for the catchment map. Keyed by the database athlete uuid. */
export const ROSTER_COORDINATES: Record<string, { lat: number; lng: number }> = {
  '11111111-1111-1111-1111-111111111111': { lat: -33.9173, lng: 151.035 },
  '22222222-2222-2222-2222-222222222222': { lat: -33.8886, lng: 151.1873 },
  '33333333-3333-3333-3333-333333333333': { lat: -33.8915, lng: 151.2648 },
  '44444444-4444-4444-4444-444444444444': { lat: -33.8988, lng: 151.1794 },
  '55555555-5555-5555-5555-555555555555': { lat: -34.0554, lng: 151.1522 },
  '66666666-6666-6666-6666-666666666666': { lat: -33.6366, lng: 151.329 },
  '77777777-7777-7777-7777-777777777777': { lat: -37.8396, lng: 144.942 },
  '88888888-8888-8888-8888-888888888888': { lat: -33.9145, lng: 151.2415 },
  '99999999-9999-9999-9999-999999999999': { lat: -33.8702, lng: 150.9565 },
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa': { lat: -33.8518, lng: 151.1285 },
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb': { lat: -37.8136, lng: 144.9631 },
  'cccccccc-cccc-cccc-cccc-cccccccccccc': { lat: -33.815, lng: 151.104 },
  'dddddddd-dddd-dddd-dddd-dddddddddddd': { lat: -37.8192, lng: 145.123 },
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee': { lat: -37.756, lng: 145.06 },
  'ffffffff-ffff-ffff-ffff-ffffffffffff': { lat: -33.7661, lng: 150.905 },
};

export function initialsOf(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.replace(/[^A-Za-z]/g, '')[0] ?? '')
    .join('')
    .toUpperCase();
}

/** Short league mark used in the catchment pill, e.g. `@nbl1 // 2026`. */
export function leagueHandle(league: string): string {
  const value = league.toLowerCase();
  if (value.includes('nbl1')) return 'nbl1';
  if (value.includes('shute')) return 'shute';
  if (value.includes('nsw cup')) return 'nswcup';
  if (value.includes('wsl')) return 'wsl';
  if (value.includes('vfl')) return 'vfl';
  if (value.includes('npl')) return 'npl';
  if (value.includes('rowing')) return 'rowing';
  if (value.includes('triathlon')) return 'triathlon';
  if (value.includes('swim')) return 'swimming';
  if (value.includes('athletics') || value.includes('track')) return 'athletics';
  if (value.includes('combat')) return 'csa';
  const token = league.split(/[^A-Za-z0-9]+/).find(Boolean);
  return (token ?? 'roster').toLowerCase();
}

export function catchmentPill(record: Pick<AthleteRecord, 'league' | 'postcode'>): string {
  return `@${leagueHandle(record.league)} // ${record.postcode}`;
}

/** Portrait path accepted by `AssetImage` (local files drop the leading slash). */
export function portraitFile(image: string): string {
  if (/^https?:\/\//i.test(image)) return image;
  return image.replace(/^\//, '');
}

export function valuationAud(value: string): number {
  const n = Number(value.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function formatFollowers(count: number): string {
  return String(Math.trunc(Math.abs(count)));
}

/** Slash lockup for a specimen. No brackets, no thousands separators. */
export function disciplineLockup(league: string, postcode: string): string {
  const code = league.replace(/['’]/g, '').trim().toUpperCase();
  return `${code} // POSTCODE ${postcode}`;
}

const OLYMPIC_PATHWAY = /track|athletics|swim|triathlon|rowing|surf/i;

/** Target horizon shown on roster cells. Olympic codes run to Brisbane 2032. */
export function targetHorizon(athlete: Pick<Athlete, 'sport' | 'tier'>): string {
  if (athlete.tier === 'regional' || OLYMPIC_PATHWAY.test(athlete.sport)) {
    return 'Milestone: Brisbane 2032 Pathway';
  }
  return 'Milestone: National Selection Trials';
}

/** Headline lockup, e.g. "M. Thorne // Basketball // Postcode 2200". */
export function rosterHeadline(athlete: Pick<Athlete, 'name' | 'sport' | 'postcode'>): string {
  return `${athlete.name} // ${athlete.sport} // Postcode ${athlete.postcode}`;
}

function projectAthlete(record: AthleteRecord): Athlete {
  return {
    id: record.id,
    name: record.display_name,
    initials: initialsOf(record.full_name),
    sport: record.sport,
    league: record.league,
    postcode: record.postcode,
    radiusKm: record.radiusKm,
    image: record.image,
    valuation: record.valuation,
    status: record.status,
    tier: record.tier,
    agreementStatus: record.agreement_status,
    brandCategories: {
      available: [...record.branding_categories.available],
      locked: [...record.branding_categories.locked],
    },
    stats: [
      { label: 'Followers', value: formatFollowers(record.social.follower_count) },
      { label: 'Engagement', value: record.social.engagement_rate },
      { label: 'Club', value: record.current_club },
    ],
    bio: `${record.full_name} holds ${record.tier} commercial rights for ${record.current_club} inside postcode ${record.postcode}, ${record.radiusKm}km.`,
    repCredentials: `${record.governing_body.name} // ${record.status}`,
    record,
  };
}

export const ROSTER_DATA: Athlete[] = DATABASE_ROSTER.map(projectAthlete);

const recordById = new Map(DATABASE_ROSTER.map((record) => [record.id, record]));

export function recordFor(id: string): AthleteRecord | null {
  return recordById.get(id) ?? null;
}

export interface RosterSpecimen {
  id: string;
  name: string;
  /** Sport discipline shown under the name. */
  sportLeague: string;
  /** Monospace catchment pill, e.g. `@nbl1 // 2026`. */
  catchmentTag: string;
  /** Preferred file name inside `/public`, or a remote URL. */
  image: string;
  /** Editorial stand-ins tried in order if `image` fails. */
  imageFallbacks: readonly string[];
  imageAlt: string;
  /** Four-digit AU postcode the athlete's rights are locked to. */
  postcode: string;
  /** Governing league badge flags used for the specimen dossier. */
  shuteShieldCompliant: boolean;
  /** Baseline valuation (AUD). Overridden by the live Supabase `market_value_aud` when present. */
  valuation: number;
  /** WGS84 coordinate used by the roster-workspace beacons. */
  lat: number;
  lng: number;
  status: string;
  tier: Athlete['tier'];
  radiusKm: number;
  bio: string;
  stats: readonly { label: string; value: string }[];
  initials: string;
}

export function sportLeagueOf(athlete: Athlete): string {
  return athlete.sport;
}

export function catchmentTagOf(athlete: Athlete): string {
  return catchmentPill(athlete.record);
}

function toSpecimen(athlete: Athlete): RosterSpecimen {
  const coords = ROSTER_COORDINATES[athlete.id] ?? { lat: -33.8915, lng: 151.2767 };
  return {
    id: athlete.id,
    name: athlete.name,
    sportLeague: sportLeagueOf(athlete),
    catchmentTag: catchmentTagOf(athlete),
    image: portraitFile(athlete.image),
    imageFallbacks: IMAGE_FALLBACKS[athlete.id] ?? [],
    imageAlt: `${athlete.record.full_name}, ${athlete.sport}, ${athlete.record.current_club}`,
    postcode: athlete.postcode,
    shuteShieldCompliant: athlete.league.toLowerCase().includes('shute shield'),
    valuation: valuationAud(athlete.valuation),
    lat: coords.lat,
    lng: coords.lng,
    status: athlete.status,
    tier: athlete.tier,
    radiusKm: athlete.radiusKm,
    bio: athlete.bio,
    stats: athlete.stats,
    initials: athlete.initials,
  };
}

export const ROSTER_SPECIMENS: readonly RosterSpecimen[] = ROSTER_DATA.map(toSpecimen);

const specimenById = new Map(ROSTER_SPECIMENS.map((specimen) => [specimen.id, specimen]));

export function specimenFor(id: string): RosterSpecimen | null {
  return specimenById.get(id) ?? null;
}

/** Typed specimen record used when no live Supabase athlete matches, so the dossier always opens. */
function dbAgreementStatus(status: AgreementStatusLabel): DbAthlete['agreement_status'] {
  if (status === 'Syndicate Active') return 'active';
  if (status === 'Category Locked') return 'pending';
  return 'no_agreement';
}

export function specimenToAthlete(specimen: RosterSpecimen): DbAthlete {
  const source = recordFor(specimen.id);
  const rugbyLeague = specimen.sportLeague.toLowerCase().includes('rugby league') || (source?.sport ?? '').toLowerCase() === 'rugby league';
  return {
    id: specimen.id,
    name: source?.display_name ?? specimen.name,
    full_name: source?.full_name ?? specimen.name,
    initials: specimen.initials,
    sport: source?.sport ?? specimen.sportLeague,
    current_club: source?.current_club ?? null,
    agreement_status: dbAgreementStatus(source?.agreement_status ?? 'No agreement'),
    profile_data: { market_value_aud: specimen.valuation },
    location: null,
    postcode: specimen.postcode,
    latitude: specimen.lat,
    longitude: specimen.lng,
    follower_count: source?.social.follower_count ?? null,
    gender: null,
    ip_lock: true,
    master_licence_signed: source?.master_licence_signed ?? false,
    nrl_tpa_registered: rugbyLeague && (source?.governing_body.tpa_compliant ?? false),
    shute_shield_compliant: specimen.shuteShieldCompliant,
    created_at: '2026-01-01T00:00:00.000Z',
  };
}
