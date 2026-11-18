import express from 'express';
import { authenticatedUser } from './auth.js';

const validSessionId = (id) => typeof id === 'string' && /^cs_(?:test_|live_)[a-zA-Z0-9]{1,240}$/.test(id);
const validUuid = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export const entitlementStorageConfigured = () => Boolean((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) && process.env.SUPABASE_SERVICE_ROLE_KEY);
const state = (sessionId, row, status = 'not_found') => ({
  status: row?.status || status,
  licenceReference: row?.id || null,
  checkoutSessionId: sessionId,
  athleteId: row?.athlete_id || null,
  tierId: row?.tier_id || null,
  createdAt: row?.created_at || null,
});

async function records(path = '', options = {}) {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL).replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const response = await fetch(`${url}/rest/v1/paid_whitelisting_entitlements${path}`, {
    ...options, signal: AbortSignal.timeout(8000),
    headers: {
      apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=representation', ...options.headers,
    },
  });
  if (!response.ok) throw new Error('Unable to persist or retrieve whitelisting entitlement');
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('Invalid entitlement response');
  return rows;
}

// Verified payment creates an entitlement, not evidence of Meta/TikTok authorisation or delivery.
// Only a future real platform fulfilment process may activate it; no platform tokens are issued here.
export async function recordPaidEntitlement(session) {
  const metadata = session.metadata || {};
  if (metadata.whitelisting !== 'true') return null;
  if (session.status !== 'complete' || session.payment_status !== 'paid') return null;
  if (!entitlementStorageConfigured()) {
    console.warn('[whitelisting] Paid entitlement storage is not configured.');
    throw new Error('Paid entitlement storage is not configured');
  }
  if (!validSessionId(session.id) || !validUuid(metadata.buyerId) || !metadata.athleteId || !metadata.tierId) {
    throw new Error('Missing verified whitelisting metadata');
  }
  const rows = await records('?on_conflict=checkout_session_id', {
    method: 'POST',
    body: JSON.stringify({
      checkout_session_id: session.id, buyer_id: metadata.buyerId,
      athlete_id: metadata.athleteId, tier_id: metadata.tierId, status: 'pending_fulfilment',
    }),
  });
  const row = rows[0] || (await records(`?checkout_session_id=eq.${encodeURIComponent(session.id)}&select=*`))[0];
  if (!row) throw new Error('Entitlement was not persisted');
  return state(session.id, row);
}

export function createWhitelistingRouter() {
  const router = express.Router();
  const usage = new Map();
  router.get('/grants', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const now = Date.now();
    for (const [key, entry] of usage) if (entry.until <= now) usage.delete(key);
    const limited = (key) => {
      const entry = usage.get(key) || { count: 0, until: now + 60000 };
      usage.set(key, entry);
      if (++entry.count <= 60) return false;
      res.set('Retry-After', String(Math.ceil((entry.until - now) / 1000)));
      res.status(429).json({ error: 'Entitlement lookup rate limit exceeded' });
      return true;
    };
    if (limited(`ip:${req.ip}`)) return;
    let user = null;
    if (req.get('Authorization')) {
      const authentication = await authenticatedUser(req);
      if (!authentication.user) return res.status(authentication.status).json({ error: authentication.error });
      user = authentication.user;
    }
    if (user && limited(`user:${user.id}`)) return;
    const sessionId = req.query.session_id;
    if (!validSessionId(sessionId)) return res.status(400).json({ error: 'A valid checkout session id is required' });
    if (!entitlementStorageConfigured()) return res.status(503).json(state(sessionId, null, 'not_configured'));
    try {
      const row = (await records(`?checkout_session_id=eq.${encodeURIComponent(sessionId)}&select=*`))[0];
      const result = state(sessionId, row);
      if (!user || row?.buyer_id !== user.id) result.licenceReference = null;
      return res.json(result);
    } catch {
      return res.status(502).json({ error: 'Unable to retrieve entitlement' });
    }
  });
  return router;
}
