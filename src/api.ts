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

const API_BASE = '/api';

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
    portrait_url: (r.portrait_url as string | null) ?? null,
    geofence_km: typeof r.geofence_km === 'number' ? r.geofence_km : 15,
    match_reel_url: (r.match_reel_url as string | null) ?? null,
    training_clip_url: (r.training_clip_url as string | null) ?? null,
    performance_logs: Array.isArray(r.performance_logs)
      ? (r.performance_logs as Athlete['performance_logs'])
      : null,
    suburban_views: typeof r.suburban_views === 'number' ? r.suburban_views : null,
    engagement_rate: typeof r.engagement_rate === 'number' ? r.engagement_rate : null,
    community_reach: typeof r.community_reach === 'number' ? r.community_reach : null,
    match_date: (r.match_date as string | null) ?? null,
    nil_clearance: r.nil_clearance == null ? null : Boolean(r.nil_clearance),
    exclusivity_terms: (r.exclusivity_terms as string | null) ?? null,
    payout_athlete_pct: typeof r.payout_athlete_pct === 'number' ? r.payout_athlete_pct : null,
    payout_partner_pct: typeof r.payout_partner_pct === 'number' ? r.payout_partner_pct : null,
    instagram_handle: (r.instagram_handle as string | null) ?? null,
    suburb: (r.suburb as string | null) ?? null,
    stripe_connect_id: (r.stripe_connect_id as string | null) ?? null,
  };
}

export async function fetchAthletes(): Promise<Athlete[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase.from('athletes').select('*').order('created_at', { ascending: true });
  if (error) throw new Error(`Failed to load athletes: ${error.message}`);
  return (data ?? []).map((row) => normalizeAthlete(row as Record<string, unknown>));
}

/** Sydney CBD — default origin for roster proximity and tier queries. */
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
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase.rpc('get_athletes_nearby', {
    store_lat: lat,
    store_lon: lng,
    radius_meters: radiusKm * 1000,
  });

  if (!error) {
    return ((data ?? []) as Record<string, unknown>[]).map((row) => normalizeAthlete(row)).sort(byDistance);
  }

  const all = await fetchAthletes();
  return withDistance(all, lat, lng).filter((a) => (a.distance_km ?? Infinity) <= radiusKm);
}

/**
 * Athletes in a spatial catchment band via `get_athletes_by_tier`, which takes
 * the tier code ('01' | '02' | '03') and filters by distance server-side.
 */
export async function fetchAthletesByTier(
  tier: SpatialTier,
  lat: number = ROSTER_ORIGIN.lat,
  lng: number = ROSTER_ORIGIN.lng
): Promise<Athlete[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase.rpc('get_athletes_by_tier', {
    store_lat: lat,
    store_lon: lng,
    tier_code: tier.code,
  });

  if (error) {
    return withDistance(await fetchAthletes(), lat, lng).filter((a) => {
      const km = a.distance_km;
      if (km == null) return false;
      return km >= tier.minKm && (tier.maxKm == null || km <= tier.maxKm);
    });
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) => normalizeAthlete(row)).sort(byDistance);
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

export async function fetchSponsors(): Promise<MatchedSponsor[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from('sponsors')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Failed to load sponsors: ${error.message}`);
  return (data ?? []).map((s) => ({
    ...(s as MatchedSponsor),
    distance_meters: 0,
    distance_km: 0,
    lat: (s as MatchedSponsor).latitude ?? null,
    lng: (s as MatchedSponsor).longitude ?? null,
  }));
}

export async function fetchAgreements(athleteId?: string): Promise<Agreement[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  let query = supabase
    .from('agreements')
    .select('*')
    .order('created_at', { ascending: false });
  if (athleteId) query = query.eq('athlete_id', athleteId);
  const { data, error } = await query;
  if (error) throw new Error(`Failed to load agreements: ${error.message}`);
  return (data ?? []) as Agreement[];
}

/** Format a monetary amount with the appropriate currency label (AUD or NZD). */
export function formatCurrency(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount == null) return '—';
  const code = currency ?? 'AUD';
  const formatted = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted} ${code}`;
}

export async function fetchNearbySponsors(
  athleteId: string
): Promise<MatchSponsorsResponse> {
  if (!athleteId?.trim()) {
    return { athlete: null, matches: [] };
  }
  try {
    const res = await fetch(
      `${API_BASE}/match-sponsors?athleteId=${encodeURIComponent(athleteId)}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) {
      return { athlete: null, matches: [] };
    }
    const json = (await res.json()) as MatchSponsorsResponse & { error?: string };
    if (json.error) return { athlete: json.athlete ?? null, matches: [] };
    return {
      athlete: json.athlete ?? null,
      matches: Array.isArray(json.matches) ? json.matches : [],
    };
  } catch {
    return { athlete: null, matches: [] };
  }
}

export async function fetchSponsorsByRadius(
  athlete: AthleteLocation,
  radiusKm: number
): Promise<MatchedSponsor[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from('sponsors')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Failed to load sponsors: ${error.message}`);
  const all = (data ?? []) as MatchedSponsor[];
  return all
    .map((s) => ({
      ...s,
      lat: s.latitude ?? null,
      lng: s.longitude ?? null,
      distance_meters: haversineMeters(athlete.lat, athlete.lng, s.latitude, s.longitude),
    }))
    .filter((s) => {
      const km = s.distance_meters / 1000;
      return km <= radiusKm;
    })
    .map((s) => ({
      ...s,
      distance_km: s.distance_meters / 1000,
    }))
    .sort((a, b) => a.distance_km - b.distance_km);
}

function haversineMeters(
  lat1: number | null,
  lng1: number | null,
  lat2: number | null,
  lng2: number | null
): number {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return Infinity;
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------------------------------------------------------------------------
// Prompt-cached outreach generator
// ---------------------------------------------------------------------------

function cacheKey(req: OutreachRequest): string {
  return `${(req.athleteName ?? '').trim().toLowerCase()}::${(req.sportType ?? '').trim().toLowerCase()}::${(req.sponsorCategory ?? '').trim().toLowerCase()}`;
}

// Module-level prompt cache. The pitch is deterministic per (athlete, sport, category)
// triple, so a cache hit returns the identical copy instantly — this is the
// "prompt-cached" behavior the generateContractReview utility is built around.
const promptCache = new Map<string, OutreachResponse>();

function buildPitch(req: OutreachRequest): OutreachResponse {
  const { athleteName, sportType, sponsorCategory } = req;
  const subject = `Partnership opportunity with ${athleteName} — ${sportType}`;

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
    `I'd love a 20-minute call to walk through a proposed package — content cadence,`,
    `in-venue activation, and digital rights — and hear what would matter most to you.`,
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

export async function signMasterLicence(athleteId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  const { error } = await supabase
    .from('athletes')
    .update({ master_licence_signed: true })
    .eq('id', athleteId);
  if (error) throw new Error(`Failed to sign master licence: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Messages (two-way threaded messaging tied to agreements)
// ---------------------------------------------------------------------------

export async function fetchMessages(agreementId: string): Promise<Message[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('agreement_id', agreementId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Failed to load messages: ${error.message}`);
  return (data ?? []) as Message[];
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

export async function fetchCampaigns(): Promise<Campaign[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to load campaigns: ${error.message}`);
  return (data ?? []) as Campaign[];
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
