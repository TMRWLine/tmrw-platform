import { supabase } from './supabaseClient';

export type WhitelistingRadiusKm = 5 | 15 | 50;

export interface WhitelistingGrant {
  id: string;
  athleteId: string;
  athleteName: string;
  flightTierId: string;
  postcode: string;
  radiusKm: WhitelistingRadiusKm;
  tiktok_spark_code: string;
  meta_partnership_token: string;
  issuedAt: string;
  expiresAt: string;
  source: 'supabase' | 'mock';
}

export interface IssueWhitelistingGrantInput {
  athleteId: string;
  athleteName: string;
  flightTierId: string;
  postcode: string;
  radiusKm?: number;
}

const GRANT_TERM_DAYS = 90;
const ALLOWED_RADII: readonly WhitelistingRadiusKm[] = [5, 15, 50];

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `grant-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function randomSegment(length = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes =
    typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'
      ? crypto.getRandomValues(new Uint8Array(length))
      : Array.from({ length }, (_, index) => (Date.now() + index * 17) % 256);
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
}

export function radiusForFlightTier(flightTierId: string): WhitelistingRadiusKm {
  const id = flightTierId.toLowerCase();
  if (id.includes('pathway') || id.includes('15') || id === 'metro') return 15;
  if (
    id.includes('national') ||
    id.includes('challenger') ||
    id.includes('world') ||
    id.includes('50') ||
    id === 'regional'
  ) {
    return 50;
  }
  return 5;
}

export function normaliseWhitelistingRadius(radius?: number, flightTierId?: string): WhitelistingRadiusKm {
  if (radius === 5 || radius === 15 || radius === 50) return radius;
  if (typeof radius === 'number' && Number.isFinite(radius)) {
    if (radius <= 5) return 5;
    if (radius <= 15) return 15;
    return 50;
  }
  return flightTierId ? radiusForFlightTier(flightTierId) : 5;
}

function expiryIso(from: Date): string {
  const expires = new Date(from.getTime());
  expires.setUTCDate(expires.getUTCDate() + GRANT_TERM_DAYS);
  return expires.toISOString();
}

function buildTokens(postcode: string, radiusKm: WhitelistingRadiusKm) {
  const stamp = Date.now().toString(36).toUpperCase();
  return {
    tiktok_spark_code: `TT-SPARK-${postcode}-${radiusKm}K-${randomSegment(7)}`,
    meta_partnership_token: `META-PA-${postcode}-${radiusKm}K-${stamp}-${randomSegment(8)}`,
  };
}

function toGrant(
  row: Partial<WhitelistingGrant> & {
    athlete_id?: string;
    athlete_name?: string;
    flight_tier_id?: string;
    radius_km?: number;
    issued_at?: string;
    expires_at?: string;
  },
  fallback: Omit<WhitelistingGrant, 'source'>,
  source: WhitelistingGrant['source'],
): WhitelistingGrant {
  const radiusKm = normaliseWhitelistingRadius(row.radiusKm ?? row.radius_km, fallback.flightTierId);
  return {
    id: row.id ?? fallback.id,
    athleteId: row.athleteId ?? row.athlete_id ?? fallback.athleteId,
    athleteName: row.athleteName ?? row.athlete_name ?? fallback.athleteName,
    flightTierId: row.flightTierId ?? row.flight_tier_id ?? fallback.flightTierId,
    postcode: row.postcode ?? fallback.postcode,
    radiusKm: ALLOWED_RADII.includes(radiusKm) ? radiusKm : fallback.radiusKm,
    tiktok_spark_code: row.tiktok_spark_code ?? fallback.tiktok_spark_code,
    meta_partnership_token: row.meta_partnership_token ?? fallback.meta_partnership_token,
    issuedAt: row.issuedAt ?? row.issued_at ?? fallback.issuedAt,
    expiresAt: row.expiresAt ?? row.expires_at ?? fallback.expiresAt,
    source,
  };
}

/**
 * Issues a 90-day postcode paid-media licence for TikTok Spark Ads and Meta
 * Partnership Ads, scoped to a 5km, 15km, or 50km catchment. Persists to
 * Supabase when the ledger is available, otherwise returns a local mock grant.
 */
export async function issuePostcodeWhitelistingGrant(
  input: IssueWhitelistingGrantInput,
): Promise<WhitelistingGrant> {
  const radiusKm = normaliseWhitelistingRadius(input.radiusKm, input.flightTierId);
  const issuedAtDate = new Date();
  const tokens = buildTokens(input.postcode, radiusKm);
  const fallback: Omit<WhitelistingGrant, 'source'> = {
    id: createId(),
    athleteId: input.athleteId,
    athleteName: input.athleteName,
    flightTierId: input.flightTierId,
    postcode: input.postcode,
    radiusKm,
    tiktok_spark_code: tokens.tiktok_spark_code,
    meta_partnership_token: tokens.meta_partnership_token,
    issuedAt: issuedAtDate.toISOString(),
    expiresAt: expiryIso(issuedAtDate),
  };

  try {
    const { data, error } = await supabase
      .from('whitelisting_grants')
      .insert({
        athlete_id: input.athleteId,
        athlete_name: input.athleteName,
        flight_tier_id: input.flightTierId,
        postcode: input.postcode,
        radius_km: radiusKm,
        tiktok_spark_code: tokens.tiktok_spark_code,
        meta_partnership_token: tokens.meta_partnership_token,
        issued_at: fallback.issuedAt,
        expires_at: fallback.expiresAt,
      })
      .select(
        'id, athlete_id, athlete_name, flight_tier_id, postcode, radius_km, tiktok_spark_code, meta_partnership_token, issued_at, expires_at',
      )
      .maybeSingle();

    if (!error) {
      return toGrant(data ?? {}, fallback, 'supabase');
    }
  } catch {
    // Local test benches and missing ledgers fall through to a mock grant.
  }

  return { ...fallback, source: 'mock' };
}
