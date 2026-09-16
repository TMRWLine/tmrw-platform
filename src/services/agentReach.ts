/**
 * Agent Reach — backend service worker shell (mock).
 *
 * Automates athlete handle discovery and profile enrichment across
 * Australasian league social accounts, plus nearby-merchant sponsor
 * prospecting by postcode. All handlers return mock data with a small
 * artificial delay to simulate real network I/O.
 */

export type LeagueHandle =
  | '@shuteshield'
  | '@nbl1'
  | '@nplnsw'
  | '@nplvic'
  | '@premiercricketnsw';

export interface DiscoveredAthlete {
  handle: string;
  league: LeagueHandle;
  displayName: string;
  sport: string;
  profileUrl: string;
}

export interface EnrichedProfile {
  handle: string;
  displayName: string;
  followerCount: number;
  postcode: string;
  suburb: string;
  state: string;
  country: string;
  bio: string;
}

export interface LocalSponsorProspect {
  businessName: string;
  category: 'gym' | 'auto' | 'physio' | 'food' | 'apparel';
  postcode: string;
  suburb: string;
  streetAddress: string;
  phone: string | null;
  estimatedBudget: number;
}

const LEAGUE_ATHLETES: Record<LeagueHandle, DiscoveredAthlete[]> = {
  '@shuteshield': [
    { handle: '@hunter_bligh', league: '@shuteshield', displayName: 'Hunter Bligh', sport: 'Rugby Union', profileUrl: 'https://instagram.com/hunter_bligh' },
    { handle: '@james_tupou', league: '@shuteshield', displayName: 'James Tupou', sport: 'Rugby Union', profileUrl: 'https://instagram.com/james_tupou' },
    { handle: '@liam_donnelly', league: '@shuteshield', displayName: 'Liam Donnelly', sport: 'Rugby Union', profileUrl: 'https://instagram.com/liam_donnelly' },
  ],
  '@nbl1': [
    { handle: '@marcus_creek', league: '@nbl1', displayName: 'Marcus Creek', sport: 'Basketball', profileUrl: 'https://instagram.com/marcus_creek' },
    { handle: '@tyrell_holland', league: '@nbl1', displayName: 'Tyrell Holland', sport: 'Basketball', profileUrl: 'https://instagram.com/tyrell_holland' },
  ],
  '@nplnsw': [
    { handle: '@diego_ferreira', league: '@nplnsw', displayName: 'Diego Ferreira', sport: 'Football', profileUrl: 'https://instagram.com/diego_ferreira' },
    { handle: '@samuel_okafor', league: '@nplnsw', displayName: 'Samuel Okafor', sport: 'Football', profileUrl: 'https://instagram.com/samuel_okafor' },
  ],
  '@nplvic': [
    { handle: '@andrew_petrov', league: '@nplvic', displayName: 'Andrew Petrov', sport: 'Football', profileUrl: 'https://instagram.com/andrew_petrov' },
    { handle: '@chris_zammit', league: '@nplvic', displayName: 'Chris Zammit', sport: 'Football', profileUrl: 'https://instagram.com/chris_zammit' },
  ],
  '@premiercricketnsw': [
    { handle: '@aarav_mehta', league: '@premiercricketnsw', displayName: 'Aarav Mehta', sport: 'Cricket', profileUrl: 'https://instagram.com/aarav_mehta' },
    { handle: '@brad_hodge', league: '@premiercricketnsw', displayName: 'Brad Hodge', sport: 'Cricket', profileUrl: 'https://instagram.com/brad_hodge' },
  ],
};

const ENRICHED_PROFILES: Record<string, EnrichedProfile> = {
  '@hunter_bligh': {
    handle: '@hunter_bligh', displayName: 'Hunter Bligh', followerCount: 12400,
    postcode: '3065', suburb: 'Fitzroy', state: 'VIC', country: 'Australia',
    bio: 'Shute Shield flanker · Melbourne-based · open to partnerships',
  },
  '@james_tupou': {
    handle: '@james_tupou', displayName: 'James Tupou', followerCount: 8900,
    postcode: '2000', suburb: 'Sydney', state: 'NSW', country: 'Australia',
    bio: 'Front-rower · Sydney Rays · community coach',
  },
  '@marcus_creek': {
    handle: '@marcus_creek', displayName: 'Marcus Creek', followerCount: 21000,
    postcode: '4000', suburb: 'Brisbane', state: 'QLD', country: 'Australia',
    bio: 'NBL1 guard · Brisbane-based · fitness enthusiast',
  },
  '@diego_ferreira': {
    handle: '@diego_ferreira', displayName: 'Diego Ferreira', followerCount: 15600,
    postcode: '2150', suburb: 'Parramatta', state: 'NSW', country: 'Australia',
    bio: 'NPL NSW striker · goal machine · brand-friendly',
  },
};

const LOCAL_SPONSOR_PROSPECTS: LocalSponsorProspect[] = [
  { businessName: 'Fitzroy Athletic Club', category: 'gym', postcode: '3065', suburb: 'Fitzroy', streetAddress: '123 Brunswick St', phone: '(03) 9417 2200', estimatedBudget: 25000 },
  { businessName: 'Richmond Auto Group', category: 'auto', postcode: '3121', suburb: 'Richmond', streetAddress: '45 Swan St', phone: '(03) 9421 8800', estimatedBudget: 40000 },
  { businessName: 'Collingwood Physiotherapy', category: 'physio', postcode: '3066', suburb: 'Collingwood', streetAddress: '78 Smith St', phone: '(03) 9419 9100', estimatedBudget: 18000 },
  { businessName: 'South Melbourne Cafe', category: 'food', postcode: '3205', suburb: 'South Melbourne', streetAddress: '210 Clarendon St', phone: '(03) 9690 4400', estimatedBudget: 12000 },
  { businessName: 'Melbourne Performance Apparel', category: 'apparel', postcode: '3000', suburb: 'Melbourne', streetAddress: '12 Flinders Ln', phone: null, estimatedBudget: 35000 },
  { businessName: 'Bondi Fitness Studio', category: 'gym', postcode: '2020', suburb: 'Bondi', streetAddress: '34 Hall St', phone: '(02) 9365 1100', estimatedBudget: 22000 },
  { businessName: 'Surry Hills Automotive', category: 'auto', postcode: '2010', suburb: 'Surry Hills', streetAddress: '90 Crown St', phone: '(02) 9211 3300', estimatedBudget: 30000 },
  { businessName: 'Randwick Physio & Recovery', category: 'physio', postcode: '2030', suburb: 'Randwick', streetAddress: '15 Belmore Rd', phone: '(02) 9399 7700', estimatedBudget: 16000 },
];

const POSTCODE_PREFIX_MAP: Record<string, string> = {
  '2': 'NSW', '3': 'VIC', '4': 'QLD', '5': 'SA', '6': 'WA', '7': 'TAS', '0': 'NT', '1': 'ACT',
};

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeHandle(h: string): LeagueHandle | null {
  const trimmed = h.trim().toLowerCase();
  const valid: LeagueHandle[] = ['@shuteshield', '@nbl1', '@nplnsw', '@nplvic', '@premiercricketnsw'];
  return valid.find((v) => v === trimmed) ?? null;
}

/**
 * Extracts athlete handles from a league's social account.
 * Simulates scraping tagged posts and follower lists.
 */
export async function fetchLeagueTaggedAthletes(
  leagueHandle: string
): Promise<DiscoveredAthlete[]> {
  const handle = normalizeHandle(leagueHandle);
  if (!handle) {
    throw new Error(`Unknown league handle: ${leagueHandle}. Supported: @shuteshield, @nbl1, @nplnsw, @nplvic, @premiercricketnsw`);
  }
  await delay(400);
  return LEAGUE_ATHLETES[handle] ?? [];
}

/**
 * Enriches an athlete's social profile with follower counts and location data.
 * Simulates pulling metrics from the platform's public profile API.
 */
export async function enrichAthleteProfile(
  handle: string
): Promise<EnrichedProfile> {
  const normalized = handle.trim().toLowerCase();
  await delay(350);
  const profile = ENRICHED_PROFILES[normalized];
  if (!profile) {
    throw new Error(`No enriched profile data available for handle: ${handle}`);
  }
  return profile;
}

/**
 * Scrapes nearby merchants (gyms, auto, physios, food, apparel) by postcode.
 * Simulates a local business directory lookup within a 10 km radius.
 */
export async function discoverLocalSponsors(
  postcode: string
): Promise<LocalSponsorProspect[]> {
  const pc = postcode.trim();
  if (!/^\d{4}$/.test(pc)) {
    throw new Error(`Invalid Australian postcode: ${postcode}. Expected 4 digits.`);
  }
  await delay(500);
  const statePrefix = POSTCODE_PREFIX_MAP[pc[0]] ?? '';
  return LOCAL_SPONSOR_PROSPECTS.filter((p) => {
    if (p.postcode === pc) return true;
    return p.postcode.startsWith(pc[0]);
  }).filter((p) => statePrefix === '' || p.postcode.startsWith(pc[0]));
}
