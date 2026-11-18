import { currentAccessToken } from './sessionToken';

export const CHECKOUT_SUCCESS_PATH = '/checkout/success';

export interface CheckoutAthleteSnapshot {
  full_name?: string;
  grassroots_club_name?: string;
  image_url?: string;
}

export type ClubPayoutCadence = 'quarterly_batch' | 'immediate_t0';

export interface SplitLedgerBreakdown {
  grossCents: number;
  gstCents: number;
  totalPayableCents: number;
  athlete70Cents: number;
  athleteT0AdvanceCents: number;
  athleteEscrowHoldCents: number;
  club15Cents: number;
  ops15Cents: number;
  transferGroup: string;
  nextQuarterSweepDate: string;
}

export interface CheckoutSessionRequest {
  athleteId: string;
  tierId: string;
  amountAud?: number;
  postcode?: string;
  sponsorLegalName?: string;
  sponsorAbn?: string;
  sponsorEmail?: string;
  escrowMode?: 'milestone_50_50' | 'upfront_100';
  clubCadence?: ClubPayoutCadence;
  athlete?: CheckoutAthleteSnapshot;
}

export interface CheckoutSessionResponse {
  checkoutUrl: string | null;
  sessionId?: string;
  idempotencyKey: string;
  transferGroup: string;
  chargeId: string;
  platformRetainedId: string;
  athleteTransferId: string;
  clubTransferId: string;
  escrowTransferId: string | null;
  splitLedger: SplitLedgerBreakdown;
}

export interface EscrowReleaseResult {
  released: boolean;
  escrowTransferId: string;
  releasedAmountCents: number;
  releasedAt: string;
}

export type CreateCheckoutParams = CheckoutSessionRequest;
export type CheckoutSessionResult = CheckoutSessionResponse;

/**
 * Returns the next Australian/NZ financial quarter-end settlement date
 * (31 Mar, 30 Jun, 30 Sep, or 31 Dec) for consolidated Grassroots Club RCTI sweeps.
 */
export function getNextQuarterSweepLabel(now = new Date()): string {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  if (month <= 2) return `31 Mar ${year} (Q1 Sweep)`;
  if (month <= 5) return `30 Jun ${year} (EOFYS Sweep)`;
  if (month <= 8) return `30 Sep ${year} (Q3 Sweep)`;
  return `31 Dec ${year} (Q4 Sweep)`;
}

/**
 * Computes exact cent-level 7000 / 1500 / 1500 basis-point splits with zero rounding drift.
 */
export function calculateExactSplitLedger(
  amountAud: number,
  postcode = '2000',
  athleteId = 'athlete',
  escrowMode: 'milestone_50_50' | 'upfront_100' = 'milestone_50_50',
): SplitLedgerBreakdown {
  const grossCents = Math.round(amountAud * 100);
  const gstCents = Math.round(grossCents * 0.1);
  const totalPayableCents = grossCents + gstCents;

  const athlete70Cents = Math.round((grossCents * 7000) / 10000);
  const club15Cents = Math.round((grossCents * 1500) / 10000);
  const ops15Cents = grossCents - athlete70Cents - club15Cents;

  const athleteT0AdvanceCents =
    escrowMode === 'milestone_50_50' ? Math.round(athlete70Cents * 0.5) : athlete70Cents;
  const athleteEscrowHoldCents = athlete70Cents - athleteT0AdvanceCents;

  const cleanSlug = athleteId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || 'ATH';
  const transferGroup = `TG_2026_${postcode}_${cleanSlug}`;

  return {
    grossCents,
    gstCents,
    totalPayableCents,
    athlete70Cents,
    athleteT0AdvanceCents,
    athleteEscrowHoldCents,
    club15Cents,
    ops15Cents,
    transferGroup,
    nextQuarterSweepDate: getNextQuarterSweepLabel(),
  };
}

export function formatAudFromCents(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars)
    ? `A$${dollars.toLocaleString()}`
    : `A$${dollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function generateIdempotencyKey(athleteId: string, tierId: string): string {
  const timeBucket = Math.floor(Date.now() / 60000);
  const randomSuffix =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `idemp_tmrw_${athleteId}_${tierId}_${timeBucket}_${randomSuffix}`;
}

export async function createCheckoutSession(
  payload: CheckoutSessionRequest,
): Promise<CheckoutSessionResponse> {
  const idempotencyKey = generateIdempotencyKey(payload.athleteId, payload.tierId);
  const splitLedger = calculateExactSplitLedger(
    payload.amountAud ?? 750,
    payload.postcode ?? '2000',
    payload.athleteId,
    payload.escrowMode ?? 'milestone_50_50',
  );

  const suffix = idempotencyKey.slice(-8).toUpperCase();
  const chargeId = `py_2026_${suffix}`;
  const platformRetainedId = `fee_tmrw_t0_${suffix}`;
  const athleteTransferId = `tr_ath_t0_${suffix}`;
  const clubTransferId =
    payload.clubCadence === 'immediate_t0'
      ? `tr_club_t0_${suffix}`
      : `q_batch_club_${suffix}`;
  const escrowTransferId =
    payload.escrowMode === 'upfront_100' ? null : `tr_ath_escrow_hold_${suffix}`;

  try {
    const token = await currentAccessToken(AbortSignal.timeout(8000));
    const response = await fetch('/api/checkout/create-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        ...payload,
        idempotencyKey,
        transferGroup: splitLedger.transferGroup,
        splitLedger,
      }),
    });

    const data = (await response.json().catch(() => null)) as
      | { checkoutUrl?: string; url?: string; sessionId?: string; transferGroup?: string }
      | null;

    if (response.ok && (data?.checkoutUrl || data?.url)) {
      return {
        checkoutUrl: data.checkoutUrl ?? data.url ?? null,
        sessionId: data.sessionId,
        idempotencyKey,
        transferGroup: data.transferGroup ?? splitLedger.transferGroup,
        chargeId,
        platformRetainedId,
        athleteTransferId,
        clubTransferId,
        escrowTransferId,
        splitLedger,
      };
    }
    throw new Error(`Unable to initialise secure checkout (HTTP ${response.status}): ${data && 'error' in data ? String(data.error) : 'checkout URL not supplied.'}`);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Unable to initialise secure checkout. Check your connection and try again.');
  }
}

export async function releaseEscrowMilestoneTranche(params: {
  checkoutSessionId?: string;
  transferGroup: string;
  athleteId: string;
  escrowHoldCents: number;
}): Promise<EscrowReleaseResult> {
  if (!params.checkoutSessionId) throw new Error('Unable to release escrow: a real Checkout Session ID is required.');
  const token = await currentAccessToken(AbortSignal.timeout(8000));
  const releaseKey = `idemp_release_${params.transferGroup}_${Date.now()}`;
  const response = await fetch('/api/checkout/release-escrow', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': releaseKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(params),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.released !== true || typeof data?.escrowTransferId !== 'string' || !data.escrowTransferId.trim()) {
    throw new Error(`Unable to release escrow (HTTP ${response.status}): ${data?.error || 'release not confirmed.'}`);
  }
  const escrowTransferId = data.escrowTransferId;

  try {
    const ledger = JSON.parse(localStorage.getItem('tmrw_escrow_ledger') || '[]');
    const updated = ledger.map((item: Record<string, unknown>) =>
      item.transferGroup === params.transferGroup
        ? { ...item, escrowReleased: true, finalTransferId: escrowTransferId }
        : item,
    );
    localStorage.setItem('tmrw_escrow_ledger', JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }

  return {
    released: true,
    escrowTransferId,
    releasedAmountCents: params.escrowHoldCents,
    releasedAt: new Date().toISOString(),
  };
}