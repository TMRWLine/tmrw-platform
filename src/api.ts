import { currentAccessToken } from './lib/sessionToken';
import type {
  Athlete,
  AthleteLocation,
  MatchedSponsor,
  MatchSponsorsResponse,
  OutreachRequest,
  OutreachResponse,
  Agreement,
  Message,
  SenderType,
  Campaign,
  CampaignApplication,
  AgreementStatus,
  SpatialTier,
  SpatialTierCode,
  CollabDrop,
} from './types';
import { COLLAB_SPLIT, HUNTER_BLIGH_COLLAB_DROPS, SPATIAL_TIERS } from './types';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { parseEwkbPoint } from './lib/postgis';
import { athleteDisplayName } from './lib/formatName';
import { ROSTER_SPECIMENS, specimenToAthlete } from './data/roster';
import { DEMO_SPONSORS } from './data/sponsors';
import { haversineMeters, withTimeout } from './lib/spatial';
import type { SponsorshipLedger } from './lib/commercialLedger';

export type CheckoutVerification = {
  verified: boolean;
  status: 'paid' | 'pending' | 'unpaid' | 'expired' | 'demo' | 'error';
  amountTotalCents: number | null;
  currency: string | null;
  ledger: SponsorshipLedger | null;
  athleteId: string | null;
  tierId: string | null;
  transferStatus?: string | null;
  message?: string;
};

export async function verifyCheckoutSession(sessionId: string): Promise<CheckoutVerification> {
  const error: CheckoutVerification = {
    verified: false, status: 'error', amountTotalCents: null, currency: null,
    ledger: null, athleteId: null, tierId: null, transferStatus: null,
    message: 'Unable to verify checkout payment',
  };
  try {
    const response = await fetch(`/api/checkout/verify?session_id=${encodeURIComponent(sessionId)}`, {
      signal: AbortSignal.timeout(10000), headers: { Accept: 'application/json' }, cache: 'no-store',
    });
    if (!response.ok) return error;
    const data: CheckoutVerification = await response.json();
    if (!['paid', 'pending', 'unpaid', 'expired', 'demo', 'error'].includes(data.status) ||
        typeof data.verified !== 'boolean' || (data.verified && data.status !== 'paid')) return error;
    return data;
  } catch {
    return error;
  }
}

function mapAgreementStatus(raw: unknown): AgreementStatus {
  const s = String(raw ?? '').toLowerCase().replace(/\s+/g, '_');
  if (s === 'active') return 'active';
  if (s === 'pending') return 'pending';
  if (s === 'expired') return 'expired';
  return 'no_agreement';
}

/** Map live PostGIS athlete rows onto the UI Athlete shape. */
export function normalizeAthlete(row: Record<string, unknown> | Athlete | null | undefined): Athlete {
  const r = (row ?? {}) as Record<string, unknown>;
  const coords = parseEwkbPoint(r.location);
  const name = String(r.name ?? r.full_name ?? '').trim();
  return {
    ...(r as unknown as Athlete),
    id: String(r.id ?? ''),
    name,
    full_name: (r.full_name as string | null | undefined) ?? name,
    sport: (r.sport as string | null) ?? null,
    current_club: ((r.current_club ?? r.club) as string | null) ?? null,
    club: (r.club as string | null) ?? null,
    agreement_status: mapAgreementStatus(r.agreement_status ?? r.licence_status),
    licence_status: (r.licence_status as string | null) ?? null,
    profile_data: (r.profile_data as Athlete['profile_data']) ?? null,
    location: (r.location as Athlete['location']) ?? null,
    postcode: (r.postcode as string | null) ?? null,
    latitude: (typeof r.latitude === 'number' ? r.latitude : null) ?? coords?.lat ?? null,
    longitude: (typeof r.longitude === 'number' ? r.longitude : null) ?? coords?.lng ?? null,
    follower_count: typeof r.follower_count === 'number' ? r.follower_count : null,
    gender: (r.gender as string | null) ?? null,
    initials: (r.initials as string | null) ?? null,
    tier_tag: (r.tier_tag as string | null) ?? null,
    distance_km: typeof r.distance_km === 'number' ? r.distance_km : null,
    media_intelligence: (r.media_intelligence as Record<string, unknown> | null) ?? null,
    ip_lock: r.ip_lock == null ? null : Boolean(r.ip_lock),
    master_licence_signed: Boolean(r.master_licence_signed ?? r.ip_lock),
    nrl_tpa_registered: Boolean(r.nrl_tpa_registered),
    shute_shield_compliant: Boolean(r.shute_shield_compliant),
    created_at: String(r.created_at ?? ''),
    updated_at: r.updated_at != null ? String(r.updated_at) : undefined,
  };
}

function fallbackAthletes(): Athlete[] {
  return ROSTER_SPECIMENS.map((specimen) => normalizeAthlete(specimenToAthlete(specimen)));
}

export async function fetchAthletes(): Promise<Athlete[]> {
  if (!isSupabaseConfigured) return fallbackAthletes();
  try {
    const { data, error } = await withTimeout(supabase.from('athletes').select('*').order('created_at', { ascending: true }).abortSignal(AbortSignal.timeout(8000)));
    if (error) throw new Error(`Failed to load athletes: ${error.message}`);
    return (data ?? []).map((row) => normalizeAthlete(row as Record<string, unknown>));
  } catch {
    console.warn('Athletes unavailable; using the bundled roster.');
    return fallbackAthletes();
  }
}

/** Sydney CBD · default origin for roster proximity and tier queries. */
export const ROSTER_ORIGIN = { lat: -33.8688, lng: 151.2093 };

function byDistance(a: Athlete, b: Athlete): number {
  return (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity);
}

function withDistance(rows: Athlete[], lat: number, lng: number): Athlete[] {
  return rows
    .map((a) => ({
      ...a,
      distance_km: haversineMeters(lat, lng, a.latitude, a.longitude) / 1000,
    }))
    .sort(byDistance);
}

/** Athletes within `radiusKm` of a WGS84 point via `get_athletes_nearby`. */
export async function fetchAthletesNearby(
  radiusKm: number,
  lat: number = ROSTER_ORIGIN.lat,
  lng: number = ROSTER_ORIGIN.lng
): Promise<Athlete[]> {
  if (Number.isNaN(radiusKm) || radiusKm < 0) return [];
  if (isSupabaseConfigured) {
    try {
      // SQL expects kilometres and constructs ST_MakePoint(lng, lat).
      const query = Number.isFinite(radiusKm)
        ? supabase.rpc('get_athletes_nearby', { lat, lng, radius_km: radiusKm })
        : supabase.from('athletes').select('*');
      const { data, error } = await withTimeout(query.abortSignal(AbortSignal.timeout(8000)));
      if (error) throw error;
      return withDistance(((data ?? []) as Record<string, unknown>[]).map(normalizeAthlete), lat, lng)
        .filter((row) => Number.isFinite(row.distance_km) && row.distance_km! <= radiusKm);
    } catch {
      console.warn('Spatial query unavailable; using the bundled roster.');
    }
  }
  return withDistance(fallbackAthletes(), lat, lng)
    .filter((row) => Number.isFinite(row.distance_km) && row.distance_km! <= radiusKm);
}

/** No tier RPC exists in migrations; filter the nearby RPC results locally. */
export async function fetchAthletesByTier(
  tier: SpatialTier,
  lat: number = ROSTER_ORIGIN.lat,
  lng: number = ROSTER_ORIGIN.lng
): Promise<Athlete[]> {
  const rows = await fetchAthletesNearby(tier.maxKm ?? Infinity, lat, lng);
  return rows.filter((row) => (row.distance_km ?? -1) >= tier.minKm);
}

/** Live "in range" totals for each catchment band, keyed by tier code. */
export async function fetchCatchmentCounts(
  lat: number = ROSTER_ORIGIN.lat,
  lng: number = ROSTER_ORIGIN.lng
): Promise<Record<SpatialTierCode, number>> {
  const entries = await Promise.all(
    SPATIAL_TIERS.map(async (tier) => {
      const rows = await fetchAthletesByTier(tier, lat, lng);
      return [tier.code, rows.length] as const;
    })
  );
  return Object.fromEntries(entries) as Record<SpatialTierCode, number>;
}

function isHunterBligh(athlete?: Athlete | null): boolean {
  const hay = `${athlete?.name ?? ''} ${athlete?.full_name ?? ''} ${athleteDisplayName(athlete)}`.toLowerCase();
  return hay.includes('bligh');
}

function mockCollabDrops(athlete?: Athlete | null): CollabDrop[] {
  if (!athlete || !isHunterBligh(athlete)) return [];
  return Array.isArray(HUNTER_BLIGH_COLLAB_DROPS) ? HUNTER_BLIGH_COLLAB_DROPS : [];
}

function normalizeCollabDrop(row: Record<string, unknown> | CollabDrop | null | undefined): CollabDrop | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const title = String(r.title ?? '').trim();
  const price = typeof r.priceAud === 'number' ? r.priceAud : Number(r.price_aud);
  if (!title || !Number.isFinite(price)) return null;
  const art = r.art === 'hoodie' || r.art === 'socks' || r.art === 'tee' ? r.art : 'tee';
  const rawSplit = r.split && typeof r.split === 'object' ? (r.split as Record<string, unknown>) : null;
  const split = {
    athletePayoutPct: Number(rawSplit?.athletePayoutPct ?? rawSplit?.athlete_payout_pct) || COLLAB_SPLIT.athletePayoutPct,
    platformFeePct: Number(rawSplit?.platformFeePct ?? rawSplit?.platform_fee_pct) || COLLAB_SPLIT.platformFeePct,
    communityFundPct: Number(rawSplit?.communityFundPct ?? rawSplit?.community_fund_pct) || COLLAB_SPLIT.communityFundPct,
  };
  return {
    id: String(r.id ?? title),
    athleteName: String(r.athleteName ?? r.athlete_name ?? ''),
    title,
    priceAud: price,
    status: r.status === 'preorder' || r.status === 'ready' || r.status === 'limited' ? r.status : 'ready',
    statusLabel: String(r.statusLabel ?? r.status_label ?? 'Active'),
    fulfillment: String(r.fulfillment ?? 'Printful fulfillment'),
    sla: String(r.sla ?? '3–5 business days'),
    inventoryLabel: String(r.inventoryLabel ?? r.inventory_label ?? 'In stock'),
    remaining: typeof r.remaining === 'number' ? r.remaining : null,
    editionSize: typeof r.editionSize === 'number' ? r.editionSize : typeof r.edition_size === 'number' ? r.edition_size : null,
    batchSize: typeof r.batchSize === 'number' && r.batchSize > 0 ? r.batchSize : typeof r.batch_size === 'number' && r.batch_size > 0 ? r.batch_size : 1,
    split,
    art,
  };
}

/**
 * Load collab merch drops for an athlete. Missing tables, 400s, and empty
 * payloads all resolve to an array (mock catalog for Hunter Bligh, otherwise []).
 */
export async function fetchCollabDrops(athlete?: Athlete | null): Promise<CollabDrop[]> {
  const fallback = mockCollabDrops(athlete);
  if (!athlete?.id || !isSupabaseConfigured || !supabase) return fallback;

  try {
    const { data, error } = await supabase
      .from('collab_drops')
      .select('*')
      .eq('athlete_id', athlete.id);

    if (error || data == null) return fallback;
    const rows = Array.isArray(data) ? data : [];
    const mapped = rows
      .map((row) => normalizeCollabDrop(row as Record<string, unknown>))
      .filter((d): d is CollabDrop => d != null);
    return mapped.length > 0 ? mapped : fallback;
  } catch {
    return fallback;
  }
}

function fallbackSponsors(): MatchedSponsor[] {
  return DEMO_SPONSORS.map((row) => ({ ...row }));
}

export async function fetchSponsors(): Promise<MatchedSponsor[]> {
  if (!isSupabaseConfigured) return fallbackSponsors();
  try {
    const { data, error } = await withTimeout(supabase
      .from('sponsors')
      .select('*')
      .order('created_at', { ascending: true }).abortSignal(AbortSignal.timeout(8000)));
    if (error) throw new Error(`Failed to load sponsors: ${error.message}`);
    return (data ?? []).map((s) => ({
      ...(s as MatchedSponsor),
      distance_meters: 0,
      distance_km: 0,
      lat: (s as MatchedSponsor).latitude ?? null,
      lng: (s as MatchedSponsor).longitude ?? null,
    }));
  } catch {
    console.warn('Sponsors unavailable; using bundled demo sponsors.');
    return fallbackSponsors();
  }
}

/**
 * Illustrative deals returned by `fetchAgreements` when the live query fails.
 * Tied to the fallback athlete and sponsor ids.
 */
const FALLBACK_AGREEMENTS: Agreement[] = [
  {
    id: 'fallback-agreement-1',
    athlete_id: 'fallback-1',
    sponsor_id: 'fallback-sponsor-1',
    status: 'active',
    deal_value: 20000,
    gst_amount: 2000,
    total_inc_gst: 22000,
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    exclusivity_category: 'Sporting Goods',
    auto_renew_flag: true,
    terms: 'Season-long category exclusivity across social and match-day content.',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'fallback-agreement-2',
    athlete_id: 'fallback-4',
    sponsor_id: 'fallback-sponsor-3',
    status: 'pending',
    deal_value: 8000,
    gst_amount: 800,
    total_inc_gst: 8800,
    start_date: '2026-03-01',
    end_date: '2026-08-31',
    exclusivity_category: 'Food & Beverage',
    auto_renew_flag: false,
    terms: 'Six-month trial covering in-feed content only.',
    created_at: '2026-02-10T00:00:00.000Z',
    updated_at: '2026-02-10T00:00:00.000Z',
  },
  {
    id: 'fallback-agreement-3',
    athlete_id: 'fallback-7',
    sponsor_id: 'fallback-sponsor-2',
    status: 'active',
    deal_value: 15000,
    gst_amount: 1500,
    total_inc_gst: 16500,
    start_date: '2026-02-01',
    end_date: '2027-01-31',
    exclusivity_category: 'Health & Wellness',
    auto_renew_flag: true,
    terms: 'Twelve-month recovery partnership with quarterly content drops.',
    created_at: '2026-02-01T00:00:00.000Z',
    updated_at: '2026-02-01T00:00:00.000Z',
  },
];

/** Fresh copies. When `athleteId` matches a fallback athlete, only their deals are returned. */
function fallbackAgreements(athleteId?: string): Agreement[] {
  const rows = FALLBACK_AGREEMENTS.map((row) => ({ ...row }));
  if (!athleteId) return rows;
  const matched = rows.filter((row) => row.athlete_id === athleteId);
  return matched.length > 0 ? matched : rows;
}

export async function fetchAgreements(athleteId?: string): Promise<Agreement[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    let query = supabase
      .from('agreements')
      .select('*')
      .order('created_at', { ascending: false });
    if (athleteId) query = query.eq('athlete_id', athleteId);
    const { data, error } = await query;
    if (error) throw new Error(`Failed to load agreements: ${error.message}`);
    return (data ?? []) as Agreement[];
  } catch (e) {
    console.warn('fetchAgreements failed, using fallback agreements.', e);
    return fallbackAgreements(athleteId);
  }
}

/** Format a monetary amount with the appropriate currency label (AUD or NZD). */
export function formatCurrency(amount: number | null | undefined, currency: string | null | undefined, fractionDigits: 0 | 2 = 0): string {
  if (amount == null) return '·';
  const code = currency ?? 'AUD';
  const prefix = code === 'NZD' ? 'NZ$' : code === 'USD' ? 'US$' : 'A$';
  const sign = amount < 0 ? '-' : '';
  return `${sign}${prefix}${Math.abs(amount).toFixed(fractionDigits)} ${code}`;
}

export async function fetchNearbySponsors(
  athleteId: string,
  radiusKm: number = Infinity,
): Promise<MatchSponsorsResponse> {
  if (!athleteId?.trim() || Number.isNaN(radiusKm) || radiusKm < 0) return { athlete: null, matches: [] };
  const bundled = fallbackAthletes().find((row) => row.id === athleteId);
  let row = bundled;
  if (isSupabaseConfigured) {
    try {
      const [{ data, error }, athleteResult] = await withTimeout(Promise.all([
        supabase.rpc('match_sponsors_for_athlete', { athlete_id: athleteId }).abortSignal(AbortSignal.timeout(8000)),
        supabase.from('athletes').select('*').eq('id', athleteId).abortSignal(AbortSignal.timeout(8000)).maybeSingle(),
      ]));
      if (error || athleteResult.error) throw error ?? athleteResult.error;
      row = athleteResult.data ? normalizeAthlete(athleteResult.data) : undefined;
      return {
        athlete: row ? athleteLocation(row) : null,
        matches: ((data ?? []) as MatchedSponsor[]).map((sponsor) => ({
          ...sponsor, lat: sponsor.latitude, lng: sponsor.longitude,
        })).filter((sponsor) => Number.isFinite(sponsor.distance_km) && sponsor.distance_km <= radiusKm),
      };
    } catch {
      console.warn('Sponsor matches unavailable; using bundled demo sponsors.');
    }
  }
  if (!row) return { athlete: null, matches: [] };
  const athlete = athleteLocation(row);
  return {
    athlete,
    matches: sponsorsAtDistance(fallbackSponsors(), athlete, radiusKm)
      .filter((sponsor) => sponsor.distance_meters <= sponsor.target_radius_meters),
  };
}

function athleteLocation(row: Athlete): AthleteLocation {
  return {
    id: row.id, name: row.name, lat: row.latitude, lng: row.longitude,
    postcode: row.postcode, follower_count: row.follower_count,
    master_licence_signed: row.master_licence_signed,
    nrl_tpa_registered: row.nrl_tpa_registered, shute_shield_compliant: row.shute_shield_compliant,
  };
}

function sponsorsAtDistance(rows: MatchedSponsor[], athlete: AthleteLocation, radiusKm: number): MatchedSponsor[] {
  return rows.map((sponsor) => {
    const coords = parseEwkbPoint(sponsor.location);
    const lat = sponsor.latitude ?? coords?.lat ?? null;
    const lng = sponsor.longitude ?? coords?.lng ?? null;
    const distance = haversineMeters(athlete.lat, athlete.lng, lat, lng);
    return { ...sponsor, lat, lng, distance_meters: distance, distance_km: distance / 1000 };
  }).filter((sponsor) => Number.isFinite(sponsor.distance_km) && sponsor.distance_km <= radiusKm)
    .sort((a, b) => a.distance_km - b.distance_km);
}

export async function fetchSponsorsByRadius(
  athlete: AthleteLocation,
  radiusKm: number
): Promise<MatchedSponsor[]> {
  return sponsorsAtDistance(await fetchSponsors(), athlete, radiusKm);
}

// ---------------------------------------------------------------------------
// Prompt-cached outreach generator
// ---------------------------------------------------------------------------

function cacheKey(req: OutreachRequest): string {
  return `${(req.athleteName ?? '').trim().toLowerCase()}::${(req.sportType ?? '').trim().toLowerCase()}::${(req.sponsorCategory ?? '').trim().toLowerCase()}`;
}

// Module-level prompt cache. The pitch is deterministic per (athlete, sport, category)
// triple, so a cache hit returns the identical copy instantly · this is the
// "prompt-cached" behavior the generateContractReview utility is built around.
const promptCache = new Map<string, OutreachResponse>();

function buildPitch(req: OutreachRequest): OutreachResponse {
  const { athleteName, sportType, sponsorCategory } = req;
  const subject = `Partnership opportunity with ${athleteName} · ${sportType}`;

  const copy = [
    `Hi ${sponsorCategory} team,`,
    ``,
    `I'm ${athleteName}, a ${sportType} athlete competing at the national level. I've been`,
    `following ${sponsorCategory} as a category and admire how your brand shows up for athletes`,
    `and fans alike. I'm reaching out because I believe a partnership between us would be a`,
    `strong commercial fit, and I'd like to explore it with you.`,
    ``,
    `Why this makes sense:`,
    `- Audience alignment: my followers skew toward active, performance-minded consumers who`,
    `  are exactly the buyers ${sponsorCategory} brands compete for.`,
    `- Authentic storytelling: I compete week-in, week-out, giving your brand recurring,`,
    `  organic content moments across the season.`,
    `- Category exclusivity available: I'm currently unsponsored in the ${sponsorCategory}`,
    `  space, so you'd own the category outright.`,
    ``,
    `I'd love a 20-minute call to walk through a proposed package · content cadence,`,
    `in-venue activation, and digital rights · and hear what would matter most to you.`,
    `Are you open to a brief intro next week?`,
    ``,
    `Warm regards,`,
    `${athleteName}`,
  ].join('\n');

  return { copy, subject, cached: false };
}

/**
 * Prompt-cached outreach / contract-review generator. Accepts an athlete's name,
 * sport type, and a sponsor's business category, and returns a ready-to-send
 * commercial introduction pitch. Repeated calls with the same inputs are served
 * from the prompt cache.
 */
export async function generateContractReview(
  req: OutreachRequest
): Promise<OutreachResponse> {
  if (!req.athleteName?.trim() || !req.sportType?.trim() || !req.sponsorCategory?.trim()) {
    throw new Error('athleteName, sportType, and sponsorCategory are all required');
  }

  const key = cacheKey(req);
  const cached = promptCache.get(key);
  if (cached) {
    return { ...cached, cached: true };
  }

  await new Promise((r) => setTimeout(r, 450));
  const result = buildPitch(req);
  promptCache.set(key, result);
  return result;
}

export function clearOutreachCache(): void {
  promptCache.clear();
}

export type MasterLicenceMouStatus = 'unsigned' | 'signed' | 'pending_guardian';

export interface MasterLicenceExecution {
  /** `signed` = adult, fully active. `pending_guardian` = minor, awaiting guardian co-signature. */
  status: Exclude<MasterLicenceMouStatus, 'unsigned'>;
  /** Athlete signature timestamp (ISO 8601). */
  signedAt: string;
  /** SHA-256 fingerprint; only issued once the MOU is fully executed (adults). */
  hash: string | null;
  isMinor: boolean;
  guardianEmail: string | null;
}

export interface SignMasterLicenceOptions {
  /** `selectedAthlete.is_minor` as known to the UI. The stored profile value can only widen this to `true`. */
  isMinor?: boolean | null;
  /** Name typed by the signatory; recorded in the audit trail. */
  signatoryName?: string | null;
}

const MASTER_LICENCE_AUDIT_EVENT = 'MASTER_LICENCE_MOU_EXECUTED';
const MASTER_LICENCE_DOCUMENT_VERSION = 'v1.0-2026';

/** SHA-256 hex digest (64 lowercase hex chars) of a UTF-8 string. */
async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Secure hashing is unavailable in this browser context (HTTPS required).');
  }
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Execute the 2-year Master Licence MOU for an athlete profile:
 *  1. stamp `athlete_profiles`:
 *       - adult  -> `signed` + timestamp + SHA-256 fingerprint,
 *       - minor  -> `pending_guardian` + athlete signature timestamp (no fingerprint until guardian co-signs),
 *  2. append a `MASTER_LICENCE_MOU_EXECUTED` row to the immutable `compliance_audit_logs`,
 *  3. adults only: mirror the flag onto the legacy `athletes` table (best-effort).
 * If the audit insert fails, step 1 is reverted so an executed MOU never exists without an audit trail.
 *
 * Minor status is `options.isMinor || athlete_profiles.is_minor`: a stale or tampered client flag can
 * never route a minor through the adult activation path.
 */
export async function signMasterLicence(
  athleteId: string,
  options: SignMasterLicenceOptions = {}
): Promise<MasterLicenceExecution> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be signed in to execute the Master Licence MOU.');

  const { data: existing, error: lookupError } = await supabase
    .from('athlete_profiles')
    .select('master_licence_mou_status, master_licence_signed_at, master_licence_mou_hash, is_minor, guardian_email')
    .eq('id', athleteId)
    .maybeSingle();
  if (lookupError) throw new Error(`Failed to load athlete profile: ${lookupError.message}`);
  if (!existing) {
    throw new Error('No athlete profile found for this athlete, or you do not have permission to sign for them.');
  }

  const isMinor = options.isMinor === true || existing.is_minor === true;
  const guardianEmail: string | null = existing.guardian_email ?? null;
  if (isMinor && !guardianEmail) {
    throw new Error('A guardian email is required before a minor can sign. Add it in the Talent Terminal first.');
  }

  // Idempotent: never re-stamp (and re-hash) an MOU that has already been executed.
  if (
    existing.master_licence_mou_status === 'signed' &&
    existing.master_licence_signed_at &&
    existing.master_licence_mou_hash
  ) {
    return {
      status: 'signed',
      signedAt: existing.master_licence_signed_at,
      hash: existing.master_licence_mou_hash,
      isMinor,
      guardianEmail,
    };
  }
  if (existing.master_licence_mou_status === 'pending_guardian' && existing.master_licence_signed_at) {
    return {
      status: 'pending_guardian',
      signedAt: existing.master_licence_signed_at,
      hash: null,
      isMinor: true,
      guardianEmail,
    };
  }

  const signedAt = new Date().toISOString();
  const status: MasterLicenceExecution['status'] = isMinor ? 'pending_guardian' : 'signed';
  const hash = isMinor
    ? null
    : await sha256Hex(`${MASTER_LICENCE_DOCUMENT_VERSION}|${athleteId}|${user.id}|${signedAt}`);

  const { data: updated, error: updateError } = await supabase
    .from('athlete_profiles')
    .update({
      master_licence_mou_status: status,
      master_licence_signed_at: signedAt,
      master_licence_mou_hash: hash,
    })
    .eq('id', athleteId)
    .select('id')
    .maybeSingle();
  if (updateError) throw new Error(`Failed to sign master licence: ${updateError.message}`);
  if (!updated) throw new Error('Master licence was not recorded. You may not have permission to sign for this athlete.');

  const { error: auditError } = await supabase.from('compliance_audit_logs').insert({
    entity_type: 'athlete_profile',
    record_id: athleteId,
    action: MASTER_LICENCE_AUDIT_EVENT,
    event_type: MASTER_LICENCE_AUDIT_EVENT,
    document_version: MASTER_LICENCE_DOCUMENT_VERSION,
    actor_id: user.id,
    change_payload: {
      athlete_id: athleteId,
      document_version: MASTER_LICENCE_DOCUMENT_VERSION,
      timestamp: signedAt,
      mou_status: status,
      is_minor: isMinor,
      signatory_name: options.signatoryName?.trim() || null,
      master_licence_mou_hash: hash,
    },
  });
  if (auditError) {
    const { error: revertError } = await supabase
      .from('athlete_profiles')
      .update({
        master_licence_mou_status: 'unsigned',
        master_licence_signed_at: null,
        master_licence_mou_hash: null,
      })
      .eq('id', athleteId);
    if (revertError) console.error('Failed to revert MOU after audit log failure:', revertError);
    throw new Error(`Failed to record audit trail, MOU not executed: ${auditError.message}`);
  }

  if (!isMinor) {
    const { error: legacyError } = await supabase
      .from('athletes')
      .update({ master_licence_signed: true })
      .eq('id', athleteId);
    if (legacyError) console.warn('Legacy athletes.master_licence_signed mirror failed:', legacyError.message);
  }

  return { status, signedAt, hash, isMinor, guardianEmail };
}

// ---------------------------------------------------------------------------
// Messages (two-way threaded messaging tied to agreements)
// ---------------------------------------------------------------------------

/**
 * Illustrative thread returned by `fetchMessages` when the live query fails.
 * Copies are stamped with the requested agreement id.
 */
const FALLBACK_MESSAGES: Message[] = [
  {
    id: 'fallback-message-1',
    agreement_id: 'fallback-agreement-1',
    sender_type: 'sponsor',
    content: 'Welcome aboard. We will send the season content calendar by Friday.',
    created_at: '2026-01-02T09:00:00.000Z',
  },
  {
    id: 'fallback-message-2',
    agreement_id: 'fallback-agreement-1',
    sender_type: 'athlete',
    content: 'Thanks · happy to lock the first match-day post for round one.',
    created_at: '2026-01-02T11:30:00.000Z',
  },
  {
    id: 'fallback-message-3',
    agreement_id: 'fallback-agreement-1',
    sender_type: 'platform',
    content: 'Deal is active. Settlement runs on the ex-GST amount at the end of each month.',
    created_at: '2026-01-03T00:00:00.000Z',
  },
];

/** Fresh copies bound to `agreementId` so the thread stays on the requested deal. */
function fallbackMessages(agreementId: string): Message[] {
  const matched = FALLBACK_MESSAGES.filter((row) => row.agreement_id === agreementId);
  const rows = matched.length > 0 ? matched : FALLBACK_MESSAGES;
  return rows.map((row) => ({ ...row, agreement_id: agreementId }));
}

export async function fetchMessages(agreementId: string): Promise<Message[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('agreement_id', agreementId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(`Failed to load messages: ${error.message}`);
    return (data ?? []) as Message[];
  } catch (e) {
    console.warn('fetchMessages failed, using fallback messages.', e);
    return fallbackMessages(agreementId);
  }
}

export async function sendMessage(
  agreementId: string,
  senderType: SenderType,
  content: string
): Promise<Message> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }
  const { data, error } = await supabase
    .from('messages')
    .insert({ agreement_id: agreementId, sender_type: senderType, content })
    .select('*')
    .single();
  if (error) throw new Error(`Failed to send message: ${error.message}`);
  return data as Message;
}

// ---------------------------------------------------------------------------
// Campaigns (sponsor briefs + athlete applications)
// ---------------------------------------------------------------------------

/**
 * Illustrative briefs returned by `fetchCampaigns` when the live query fails.
 */
const FALLBACK_CAMPAIGNS: Campaign[] = [
  {
    id: 'fallback-campaign-1',
    sponsor_id: 'fallback-sponsor-1',
    title: 'Storefront Season Kickoff',
    description: 'Local athletes within 5 km for a four-week in-store activation.',
    budget_aud: 8000,
    radius_km: 5,
    sport_category: 'Rugby League',
    status: 'active',
    created_at: '2026-02-01T00:00:00.000Z',
    updated_at: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'fallback-campaign-2',
    sponsor_id: 'fallback-sponsor-2',
    title: 'Metro Recovery Series',
    description: 'Quarterly wellness content from athletes inside a 25 km catchment.',
    budget_aud: 15000,
    radius_km: 25,
    sport_category: 'Cricket',
    status: 'draft',
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: '2026-03-01T00:00:00.000Z',
  },
];

/** Fresh copies on every call, so callers can never mutate the shared fallback. */
function fallbackCampaigns(): Campaign[] {
  return FALLBACK_CAMPAIGNS.map((row) => ({ ...row }));
}

export async function fetchCampaigns(): Promise<Campaign[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Failed to load campaigns: ${error.message}`);
    return (data ?? []) as Campaign[];
  } catch (e) {
    console.warn('fetchCampaigns failed, using fallback campaigns.', e);
    return fallbackCampaigns();
  }
}

export async function createCampaign(
  campaign: Omit<Campaign, 'id' | 'created_at' | 'updated_at'>
): Promise<Campaign> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }
  const { data, error } = await supabase
    .from('campaigns')
    .insert(campaign)
    .select('*')
    .single();
  if (error) throw new Error(`Failed to create campaign: ${error.message}`);
  return data as Campaign;
}

export async function fetchApplications(campaignId: string): Promise<CampaignApplication[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from('campaign_applications')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to load applications: ${error.message}`);
  return (data ?? []) as CampaignApplication[];
}

export async function applyToCampaign(
  campaignId: string,
  athleteId: string,
  pitch: string
): Promise<CampaignApplication> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }
  const { data, error } = await supabase
    .from('campaign_applications')
    .insert({ campaign_id: campaignId, athlete_id: athleteId, pitch })
    .select('*')
    .single();
  if (error) throw new Error(`Failed to apply: ${error.message}`);
  return data as CampaignApplication;
}

export { createCheckoutSession, CHECKOUT_SUCCESS_PATH } from './lib/checkout';

export type WhitelistingEntitlement = {
  status: 'pending_fulfilment' | 'active' | 'revoked' | 'not_found' | 'not_configured' | 'error';
  /** Internal UUID reference only, not a Meta/TikTok authorisation or delivery token. */
  licenceReference: string | null;
  checkoutSessionId: string;
  athleteId: string | null;
  tierId: string | null;
  createdAt: string | null;
  message?: string;
};

export async function fetchWhitelistingGrant(sessionId: string): Promise<WhitelistingEntitlement> {
  const empty: WhitelistingEntitlement = {
    status: 'error', licenceReference: null, checkoutSessionId: sessionId,
    athleteId: null, tierId: null, createdAt: null,
  };
  try {
    const signal = AbortSignal.timeout(10000);
    const token = await currentAccessToken(signal);
    const response = await fetch(`/api/whitelisting/grants?session_id=${encodeURIComponent(sessionId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}, signal,
    });
    const result = await response.json();
    if (!response.ok && result.status !== 'not_configured') return { ...empty, message: 'Unable to retrieve entitlement' };
    return result as WhitelistingEntitlement;
  } catch {
    return { ...empty, message: 'Unable to retrieve entitlement' };
  }
}
