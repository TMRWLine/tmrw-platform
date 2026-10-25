import data from './mockDeliverables.json';
import { DATABASE_ROSTER, type AthleteRecord } from './rosterData';

export interface GrassrootsClub {
  name: string;
  suburb: string;
  state: string;
}

export interface CommercialAthlete {
  id: string;
  display_name: string;
  full_name: string;
  sport: string;
  league: string;
  current_club: string;
  grassroots_club: GrassrootsClub;
  postcode: string;
  integrity_status: string;
  image_url: string;
}

export interface SplitBreakdown {
  athlete_amount: number;
  athlete_percent: number;
  club_amount: number;
  club_percent: number;
  platform_amount: number;
  platform_percent: number;
}

export interface CommercialPackage {
  tier_id: string;
  name: string;
  price_aud: number;
  price_display: string;
  price_range: string;
  billing_type: string;
  catchment_label: string;
  contra_eligible: boolean;
  contra_allowance_percent: number;
  summary: string;
  deliverables: string[];
  split_breakdown: SplitBreakdown;
  cta_label: string;
}

export interface MockDeliverables {
  athlete: CommercialAthlete;
  packages: CommercialPackage[];
}

export const mockDeliverables = data as MockDeliverables;

/** Short tab labels for the four standardised commercial tiers. */
export const PACKAGE_TAB_LABEL: Record<string, string> = {
  local_merchant: 'Local',
  pathway_flight: 'Pathway',
  national_challenger: 'Challenger',
  world_class: 'World',
  syndicate: '2032',
};

export function getCommercialPackage(tierId: string | null | undefined): CommercialPackage | undefined {
  return mockDeliverables.packages.find((pkg) => pkg.tier_id === tierId);
}

const ROSTER_TIER_TO_PACKAGE: Record<AthleteRecord['tier'], string> = {
  storefront: 'local_merchant',
  metro: 'pathway_flight',
  regional: 'syndicate',
};

/** Commercial catalogue → roster catchment chip. Challenger shares the metro pool. */
export const PACKAGE_TO_ROSTER_FILTER: Record<string, 'storefront' | 'metro' | 'national' | 'regional'> = {
  local_merchant: 'storefront',
  pathway_flight: 'metro',
  national_challenger: 'national',
  world_class: 'regional',
  syndicate: 'regional',
};

export const ROSTER_FILTER_TO_PACKAGE: Record<string, string> = {
  storefront: 'local_merchant',
  metro: 'pathway_flight',
  national: 'national_challenger',
  regional: 'syndicate',
};

export function packageIdForRosterTier(tier: AthleteRecord['tier']): string {
  return ROSTER_TIER_TO_PACKAGE[tier];
}

export interface RosterFlightPresentation {
  tierId: string;
  lockup: string;
  tag: string;
  split: string;
}

const FLIGHT_CARD_COPY: Record<string, Pick<RosterFlightPresentation, 'tierId' | 'lockup' | 'split'>> = {
  local_merchant: {
    tierId: 'local_merchant',
    lockup: 'LOCAL MERCHANT // A$750 AUD',
    split: '70/15/15 SPLIT: A$525 / A$112.50 / A$112.50',
  },
  pathway_flight: {
    tierId: 'pathway_flight',
    lockup: 'PATHWAY FLIGHT // A$3500 AUD',
    split: '70/15/15 SPLIT: A$2450 / A$525 / A$525',
  },
  national_challenger: {
    tierId: 'national_challenger',
    lockup: 'CHALLENGER FLIGHT // A$12500 AUD',
    split: '70/15/15 SPLIT: A$8750 / A$1875 / A$1875',
  },
  syndicate: {
    tierId: 'syndicate',
    lockup: 'BRISBANE 2032 SYNDICATE // A$50000 AUD',
    split: 'ENTERPRISE PORTFOLIO ALLOCATION',
  },
};

/**
 * Verified commercial flight for a roster card.
 * Challenger is the national package over the metro pool. Every other athlete
 * keeps the tier stored on the verified record.
 */
export function rosterFlightPresentation(
  tier: AthleteRecord['tier'],
  filter: string,
  league: string,
): RosterFlightPresentation {
  const tierId =
    tier === 'storefront'
      ? 'local_merchant'
      : tier === 'regional'
        ? 'syndicate'
        : filter === 'national'
          ? 'national_challenger'
          : 'pathway_flight';
  const copy = FLIGHT_CARD_COPY[tierId];
  const designation = league.replace(/['’]/g, '').trim().toUpperCase();
  const stateLeague = designation.includes('LEAGUE') ? designation : `${designation} // STATE LEAGUE`;
  const tag =
    tierId === 'local_merchant'
      ? '15KM CATCHMENT'
      : tierId === 'pathway_flight'
        ? stateLeague
        : tierId === 'national_challenger'
          ? 'CATEGORY EXCLUSIVITY'
          : 'OLYMPIC SQUAD';
  return { ...copy, tag };
}

export function rosterFilterForPackage(tierId: string): 'storefront' | 'metro' | 'national' | 'regional' | null {
  return PACKAGE_TO_ROSTER_FILTER[tierId] ?? null;
}

const ELIGIBLE_SLICE: Record<string, number> = {
  local_merchant: 0,
  pathway_flight: 0,
  national_challenger: 3,
  world_class: 0,
  syndicate: 0,
};

/** Three verified athletes already cleared for a commercial flight. */
export function eligibleAthletesForPackage(tierId: string, count = 3): AthleteRecord[] {
  const filter = rosterFilterForPackage(tierId);
  if (!filter) return [];
  const pool = DATABASE_ROSTER.filter((record) =>
    filter === 'national' ? record.tier === 'metro' : record.tier === filter,
  );
  const offset = ELIGIBLE_SLICE[tierId] ?? 0;
  const sliced = pool.slice(offset, offset + count);
  return sliced.length < count ? pool.slice(0, count) : sliced;
}

/**
 * Projects a verified roster row onto the commercial-athlete shape the drawer renders.
 * Packages stay on the standardised mock catalogue. Grassroots detail falls back to the
 * specimen club when the row has no separate junior-club record.
 */
export function toCommercialAthlete(record: AthleteRecord): CommercialAthlete {
  const base = mockDeliverables.athlete;
  const image = record.image;
  const imageUrl =
    image.startsWith('http') || image.startsWith('/') ? image : `/${image}`;

  return {
    id: record.id,
    display_name: record.display_name,
    full_name: record.full_name,
    sport: record.sport,
    league: record.league,
    current_club: record.current_club,
    grassroots_club: {
      name: record.current_club,
      suburb: '',
      state: '',
    },
    postcode: record.postcode,
    integrity_status: base.integrity_status,
    image_url: imageUrl,
  };
}
