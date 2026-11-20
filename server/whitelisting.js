import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { supabaseHeaders, supabaseSecretKey } from './supabase-keys.js';

export const grantPath = '/api/checkout/whitelisting-grant';
const termDays = 90;
const grantFields = 'id,athlete_id,athlete_name,flight_tier_id,postcode,radius_km,tiktok_spark_code,meta_partnership_token,issued_at,expires_at';

export const isStripeCheckoutId = (id) => typeof id === 'string' && /^cs_(test|live)_[a-zA-Z0-9]{1,240}$/.test(id);
export const isGrantPostcode = (postcode) => typeof postcode === 'string' && /^[0-9]{4}$/.test(postcode);
const digest = (value) => createHash('sha256').update(value).digest('hex');
const cookieName = (sessionId) => `tmrw_grant_${sessionId}`;

export function createGrantAccess() {
  const secret = randomBytes(32).toString('hex');
  return { secret, hash: digest(secret) };
}

export function setGrantAccessCookie(req, res, sessionId, secret) {
  res.cookie(cookieName(sessionId), secret, {
    path: '/api/checkout',
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure || process.env.NODE_ENV === 'production',
    maxAge: (termDays + 1) * 86400000,
  });
}

function grantCookie(req, sessionId) {
  const prefix = `${cookieName(sessionId)}=`;
  const entry = (req.get('Cookie') || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
  const secret = entry?.slice(prefix.length);
  return /^[a-f0-9]{64}$/.test(secret || '') ? secret : null;
}

export function hasGrantAccess(req, sessionId, hash) {
  const secret = grantCookie(req, sessionId);
  return secret !== null && typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash) &&
    timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(digest(secret), 'hex'));
}

function radiusForTier(tierId) {
  if (tierId.includes('pathway') || tierId.includes('15') || tierId === 'metro') return 15;
  if (/national|challenger|world|50/.test(tierId) || tierId === 'regional') return 50;
  return 5;
}

export function grantStorageKeyKind(key = '') {
  if (typeof key !== 'string') return 'other';
  if (key.startsWith('sb_secret_')) return 'sb_secret';
  if (key.startsWith('sb_publishable_')) return 'sb_publishable';
  try {
    const parts = key.split('.');
    if (parts.length === 3) {
      const { role } = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      if (role === 'service_role' || role === 'anon') return `jwt-${role}`;
    }
  } catch { /* not a recognised role hint */ }
  return 'other';
}

function storageConfiguration() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = supabaseSecretKey();
  let hostname = null;
  try {
    const parsed = new URL(url);
    const containsKey = [process.env.SUPABASE_SECRET_KEY, process.env.SUPABASE_SERVICE_ROLE_KEY]
      .some(value => value && parsed.hostname.includes(value.toLowerCase()));
    if (['http:', 'https:'].includes(parsed.protocol) && !containsKey) hostname = parsed.hostname;
  } catch { /* invalid or missing URL */ }
  return { url, key, hostname };
}

class GrantStorageError extends Error {
  constructor(details) {
    super(details.message);
    this.details = details;
  }
}

function storageFailure(operation, status, code, errorClass = 'StorageError') {
  const messages = {
    '42501': 'Permission denied for grant storage',
    '42703': 'A required grant storage column does not exist',
    PGRST205: 'The grant storage table is not in the schema cache',
    ConfigurationError: 'Whitelisting storage is not configured',
    TimeoutError: 'Grant storage request timed out',
    AbortError: 'Grant storage request was aborted',
    TypeError: 'Grant storage URL or network request failed',
    SyntaxError: 'Grant storage returned invalid JSON',
    PersistenceError: 'The activation grant was not persisted',
  };
  const details = { operation, table: 'whitelisting_grants', httpStatus: status, postgrestCode: code,
    message: messages[code] || messages[errorClass] || 'Grant storage request failed', errorClass };
  console.error('Grant storage failure', details);
  return new GrantStorageError(details);
}

function grantStorage() {
  return async (params, body) => {
    const operation = body ? 'write' : params.limit === 0 ? 'preflight' : 'read';
    const { url, key } = storageConfiguration();
    let status = null;
    try {
      if (!url || !key) throw storageFailure(operation, null, null, 'ConfigurationError');
      const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/whitelisting_grants?${new URLSearchParams(params)}`, {
        method: body ? 'POST' : 'GET',
        headers: {
          ...supabaseHeaders(key),
          ...(body && {
            'Content-Type': 'application/json',
            Prefer: 'resolution=ignore-duplicates,return=minimal',
          }),
        },
        signal: AbortSignal.timeout(8000),
        body: body ? JSON.stringify(body) : undefined,
      });
      status = response.status;
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const code = /^(?:[0-9A-Z]{5}|PGRST\d{3})$/.test(payload?.code) ? payload.code : null;
        throw storageFailure(operation, status, code);
      }
      if (operation === 'preflight') {
        await response.json();
        return { httpStatus: status, postgrestCode: null };
      }
      return body ? undefined : await response.json();
    } catch (error) {
      if (error instanceof GrantStorageError) throw error;
      const errorClass = ['TimeoutError', 'AbortError', 'TypeError', 'SyntaxError'].includes(error?.name) ? error.name : 'Error';
      throw storageFailure(operation, status, null, errorClass);
    }
  };
}

export async function checkGrantStorage() {
  return grantStorage()({ select: `checkout_session_id,${grantFields}`, limit: 0 });
}

export async function diagnoseGrantStorage() {
  const { key, hostname } = storageConfiguration();
  const keyKind = grantStorageKeyKind(key);
  const variables = Object.fromEntries(['SUPABASE_URL', 'VITE_SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY'].map(name => [name, Boolean(process.env[name])]));
  const result = { ok: false, hostname, variables, keyKind,
    keyWarning: ['sb_publishable', 'jwt-anon'].includes(keyKind) ? 'The server secret variable contains a publishable or anon key.' : null,
    httpStatus: null, postgrestCode: null };
  try {
    Object.assign(result, await checkGrantStorage(), { ok: true });
  } catch (error) {
    result.httpStatus = error.details?.httpStatus ?? null;
    result.postgrestCode = error.details?.postgrestCode ?? null;
  }
  return result;
}

export async function issuePaidWhitelistingGrant(req, res) {
  res.set('Cache-Control', 'no-store');
  const sessionId = req.body?.sessionId;
  if (!isStripeCheckoutId(sessionId)) return res.status(400).json({ error: 'A Stripe Checkout session is required.' });
  const noAccess = () => res.status(403).json({ error: 'Open this receipt in the browser used to start checkout.' });
  if (!grantCookie(req, sessionId)) return noAccess();

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(503).json({ error: 'Stripe payment verification is unavailable.' });
  try {
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${stripeKey}` },
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 404) return noAccess();
    if (!response.ok) throw new Error('Stripe session lookup failed');
    const session = await response.json();
    const metadata = session.metadata ?? {};
    if (session.id !== sessionId || !hasGrantAccess(req, sessionId, metadata.grantAccessHash)) return noAccess();
    if (metadata.orderType !== 'sponsorship_tier' || session.mode !== 'payment' ||
        session.currency !== 'aud' || !Number.isSafeInteger(session.amount_total) || session.amount_total <= 0 ||
        !metadata.athleteId || !metadata.athleteName || !metadata.tierId || !isGrantPostcode(metadata.postcode)) {
      return res.status(422).json({ error: 'This checkout does not qualify for an activation grant.' });
    }
    if (session.status !== 'complete' || session.payment_status !== 'paid') {
      return res.status(409).json({ error: 'Stripe has not confirmed payment for this checkout.' });
    }

    const records = grantStorage();
    const query = { checkout_session_id: `eq.${sessionId}`, select: grantFields, limit: 1 };
    let [grant] = await records(query);
    if (!grant) {
      const issued = new Date();
      const expires = new Date(issued);
      expires.setUTCDate(expires.getUTCDate() + termDays);
      await records({ on_conflict: 'checkout_session_id' }, {
        checkout_session_id: sessionId,
        athlete_id: metadata.athleteId,
        athlete_name: metadata.athleteName,
        flight_tier_id: metadata.tierId,
        postcode: metadata.postcode,
        radius_km: radiusForTier(metadata.tierId),
        tiktok_spark_code: `TMRW-TT-${randomBytes(18).toString('base64url')}`,
        meta_partnership_token: `TMRW-META-${randomBytes(18).toString('base64url')}`,
        issued_at: issued.toISOString(),
        expires_at: expires.toISOString(),
      });
      [grant] = await records(query);
    }
    if (!grant) throw storageFailure('write', null, null, 'PersistenceError');

    const holdCents = Number(metadata.athleteEscrowHoldCents);
    return res.json({
      checkoutSessionId: session.id,
      milestoneReleaseAvailable: metadata.escrowMode === 'milestone_50_50' &&
        Number.isSafeInteger(holdCents) && holdCents > 0,
      grant: {
        id: grant.id,
        athleteId: grant.athlete_id,
        athleteName: grant.athlete_name,
        flightTierId: grant.flight_tier_id,
        postcode: grant.postcode,
        radiusKm: grant.radius_km,
        tiktok_spark_code: grant.tiktok_spark_code,
        meta_partnership_token: grant.meta_partnership_token,
        issuedAt: grant.issued_at,
        expiresAt: grant.expires_at,
      },
      amountPaidCents: session.amount_total,
    });
  } catch {
    return res.status(502).json({ error: 'The activation grant is temporarily unavailable. Try again without paying again.' });
  }
}
