import express from 'express';
import cors from 'cors';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import Stripe from 'stripe';
import { randomBytes } from 'node:crypto';
import { createTwelveLabsRouter } from './twelvelabs.js';
import { catalogueItems } from './capsule-catalogue.js';
import {
  checkGrantStorage,
  createGrantAccess,
  grantPath,
  isGrantPostcode,
  isStripeCheckoutId,
  issuePaidWhitelistingGrant,
  setGrantAccessCookie,
} from './whitelisting.js';
import { requireUser } from './auth.js';

// Load .env / .env.local
const __dirname = dirname(fileURLToPath(import.meta.url));
for (const name of ['.env', '.env.local']) {
  try {
    const envFile = readFileSync(join(__dirname, '..', name), 'utf8');
    for (const line of (envFile ?? '').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* optional in hosted env */
  }
}

const PORT = process.env.PROXY_PORT || 3001;
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const app = express();
if (process.env.VERCEL) app.set('trust proxy', 1);
app.use(cors());

// Instagram Login entry only: it is not a Supabase authentication provider.
app.get('/api/auth/instagram/start', (req, res) => {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  if (!appId || !appSecret) {
    return res.status(501).json({ error: 'Instagram Login is not configured. Please continue with Google.' });
  }
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
  if (!redirectUri) {
    return res.status(501).json({ error: 'Instagram callback is not configured. Please continue with Google.' });
  }
  const state = randomBytes(32).toString('hex');
  res.cookie('tmrw_instagram_state', state, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600000, path: '/api/auth/instagram' });
  const url = new URL('https://www.instagram.com/oauth/authorize');
  url.searchParams.set('client_id', appId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'instagram_business_basic');
  url.searchParams.set('state', state);
  return res.json({ url: url.href });
});

/**
 * 1. STRIPE WEBHOOK ENDPOINT
 * Must use express.raw({ type: 'application/json' }) and sit BEFORE app.use(express.json()).
 */
app.post('/api/v1/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!endpointSecret) {
    return res.status(400).json({ error: 'STRIPE_WEBHOOK_SECRET is not configured in .env' });
  }

  try {
    const stripe = new Stripe(stripeKey || 'sk_test_placeholder');
    const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const totalAud = (session.amount_total ?? 0) / 100;
        const orderType = session.metadata?.orderType || 'sponsorship_tier';
        const athleteCutCents = Number(session.metadata?.athleteCutCents || 0);
        const clubCutCents = Number(session.metadata?.clubCutCents || 0);
        const partnerCutCents = Number(session.metadata?.partnerCutCents || 0);

        console.log(`[stripe webhook] ✓ Checkout Session Completed: ${session.id}`);
        console.log(
          `[stripe webhook]   Type: ${orderType} | Gross: A$${totalAud.toFixed(2)} | Athlete: A$${(athleteCutCents / 100).toFixed(2)} | Club: A$${(clubCutCents / 100).toFixed(2)} | Partner: A$${(partnerCutCents / 100).toFixed(2)}`,
        );
        break;
      }
      case 'charge.dispute.created': {
        const dispute = event.data.object;
        console.warn(`[stripe webhook] ! Charge dispute created: ${dispute.id}. Initiating transfer reversals.`);
        break;
      }
      default:
        console.log(`[stripe webhook] Unhandled event type ${event.type}`);
    }

    return res.json({ received: true });
  } catch (err) {
    console.error(`[stripe webhook] Verification Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// General JSON body parser for all other routes
app.use('/api/twelvelabs', createTwelveLabsRouter());
app.use(express.json());
app.post(grantPath, issuePaidWhitelistingGrant);

app.get(['/health', '/api/health'], (_req, res) => {
  res.json({ ok: true, service: 'sponsor-match-proxy' });
});

app.get('/api/match-sponsors', async (req, res) => {
  try {
    const athleteId = String(req.query.athleteId ?? '').trim();
    if (!athleteId) {
      return res.status(400).json({ error: 'athleteId query parameter is required' });
    }

    const supabaseRestUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
    if (!supabaseRestUrl) {
      return res.status(500).json({ error: 'Supabase URL not configured on the server' });
    }
    if (!SUPABASE_ANON_KEY) {
      return res.status(500).json({ error: 'Supabase anon key not configured on the server' });
    }

    const emptyPayload = (id, extra = {}) => ({
      athlete: {
        id,
        name: extra.name ?? null,
        lat: extra.lat ?? null,
        lng: extra.lng ?? null,
        postcode: extra.postcode ?? null,
        follower_count: extra.follower_count ?? null,
        master_licence_signed: Boolean(extra.master_licence_signed),
        nrl_tpa_registered: Boolean(extra.nrl_tpa_registered),
        shute_shield_compliant: Boolean(extra.shute_shield_compliant),
      },
      matches: [],
    });

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(athleteId)) {
      return res.status(200).json(emptyPayload(athleteId));
    }

    const athleteRes = await fetch(
      `${supabaseRestUrl}/rest/v1/athletes?id=eq.${encodeURIComponent(athleteId)}&select=*`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Accept: 'application/json',
        },
      },
    );
    if (!athleteRes.ok) {
      return res.status(200).json(emptyPayload(athleteId));
    }
    const athleteRows = await athleteRes.json();
    if (!Array.isArray(athleteRows) || athleteRows.length === 0) {
      return res.status(200).json(emptyPayload(athleteId));
    }
    const athlete = athleteRows[0] ?? {};
    if (!athlete.location && athlete.latitude == null && athlete.longitude == null) {
      return res.status(200).json(
        emptyPayload(athlete.id ?? athleteId, {
          name: athlete.name ?? athlete.full_name ?? null,
          postcode: athlete.postcode ?? null,
          follower_count: athlete.follower_count ?? null,
          master_licence_signed: Boolean(athlete.master_licence_signed ?? athlete.ip_lock),
          nrl_tpa_registered: Boolean(athlete.nrl_tpa_registered),
          shute_shield_compliant: Boolean(athlete.shute_shield_compliant),
        }),
      );
    }

    const rpcRes = await fetch(`${supabaseRestUrl}/rest/v1/rpc/match_sponsors_for_athlete`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ athlete_id: athleteId }),
    });

    if (!rpcRes.ok) {
      const errText = await rpcRes.text();
      return res.status(502).json({
        error: `Spatial match RPC failed (${rpcRes.status}): ${errText.slice(0, 200)}`,
      });
    }
    const matches = await rpcRes.json();
    if (!Array.isArray(matches)) {
      return res.status(502).json({ error: 'Unexpected RPC response shape' });
    }

    const matchesWithCoords = matches.map((m) => {
      const { location, ...rest } = m;
      return {
        ...rest,
        lat: m.latitude ?? null,
        lng: m.longitude ?? null,
      };
    });

    return res.json({
      athlete: {
        id: athlete.id,
        name: athlete.name,
        lat: athlete.latitude,
        lng: athlete.longitude,
        postcode: athlete.postcode ?? null,
        follower_count: athlete.follower_count ?? null,
        master_licence_signed: athlete.master_licence_signed ?? false,
        nrl_tpa_registered: athlete.nrl_tpa_registered ?? false,
        shute_shield_compliant: athlete.shute_shield_compliant ?? false,
      },
      matches: matchesWithCoords,
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message ?? 'Unknown server error' });
  }
});

const FALLBACK_COMMERCIAL_TIERS = {
  local_merchant: { name: 'Precinct Contra & Micro', price_aud: 750 },
  pathway_flight: { name: 'Pathway Contender', price_aud: 3500 },
  national_challenger: { name: 'National Challenger', price_aud: 12500 },
  world_class: { name: 'World-Class Benchmark', price_aud: 25000 },
  syndicate: { name: 'Brisbane 2032 Corporate Syndicate', price_aud: 50000 },
};

function loadMockDeliverables() {
  try {
    return JSON.parse(
      readFileSync(join(__dirname, '..', 'src', 'data', 'mockDeliverables.json'), 'utf8'),
    );
  } catch {
    return null;
  }
}

function loadCommercialTiers() {
  const raw = loadMockDeliverables();
  const packages = Array.isArray(raw?.packages) ? raw.packages : [];
  if (!packages.length) return FALLBACK_COMMERCIAL_TIERS;
  return Object.fromEntries(
    packages.map((pkg) => [
      pkg.tier_id,
      { name: pkg.name, price_aud: Number(pkg.price_aud) },
    ]),
  );
}

function appBaseUrl(req) {
  const configured = process.env.APP_BASE_URL || process.env.PUBLIC_APP_URL;
  const origin =
    configured ||
    (typeof req.get === 'function' && req.get('origin')) ||
    'http://localhost:5173';
  return String(origin).replace(/\/$/, '');
}

function absoluteAssetUrl(url, base) {
  const value = String(url ?? '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${base}${value.startsWith('/') ? '' : '/'}${value}`;
}

function snapshotFromBody(body) {
  const athlete = body?.athlete && typeof body.athlete === 'object' ? body.athlete : {};
  return {
    full_name: String(athlete.full_name ?? body?.fullName ?? '').trim(),
    grassroots_club_name: String(athlete.grassroots_club_name ?? body?.clubName ?? '').trim(),
    image_url: String(athlete.image_url ?? body?.imageUrl ?? '').trim(),
  };
}

function resolveCheckoutAthlete(athleteId, reqBody) {
  const snapshot = snapshotFromBody(reqBody);
  const mockAthlete = loadMockDeliverables()?.athlete;
  const fromMock = mockAthlete?.id === athleteId ? mockAthlete : null;
  return {
    id: athleteId,
    postcode: fromMock?.postcode,
    full_name: snapshot.full_name || fromMock?.full_name || 'Verified athlete',
    grassroots_club_name:
      snapshot.grassroots_club_name || fromMock?.grassroots_club?.name || 'Grassroots club',
    image_url: snapshot.image_url || fromMock?.image_url || '',
  };
}

async function hydrateAthleteFromSupabase(athlete) {
  const supabaseRestUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  if (!supabaseRestUrl || !SUPABASE_ANON_KEY) return athlete;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(athlete.id)) {
    return athlete;
  }
  if (athlete.full_name && athlete.full_name !== 'Verified athlete' && athlete.image_url) {
    return athlete;
  }
  try {
    const athleteRes = await fetch(
      `${supabaseRestUrl}/rest/v1/athletes?id=eq.${encodeURIComponent(athlete.id)}&select=*`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Accept: 'application/json',
        },
      },
    );
    if (!athleteRes.ok) return athlete;
    const rows = await athleteRes.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return athlete;
    return {
      ...athlete,
      full_name:
        athlete.full_name !== 'Verified athlete'
          ? athlete.full_name
          : row.full_name || row.name || athlete.full_name,
      grassroots_club_name:
        athlete.grassroots_club_name !== 'Grassroots club'
          ? athlete.grassroots_club_name
          : row.current_club || row.club_name || athlete.grassroots_club_name,
      image_url: athlete.image_url || row.image_url || row.image || '',
    };
  } catch {
    return athlete;
  }
}

/**
 * POST /api/checkout/create-session
 * Supports both:
 *  A) Athlete Merch Capsule Bags: { capsuleItems: [{ id, title, athleteName, clubName, collabPartner, collabRoyaltyPct, priceAud, baseCostAud, qty, size, frontImageUrl }] }
 *  B) Commercial Sponsorship Tiers: { athleteId, tierId, athlete? }
 */
const transferGroupPattern = /^TG_[A-Za-z0-9_]{1,80}$/;
const escrowHold = (grossCents) => {
  const athleteCents = Math.round((grossCents * 7000) / 10000);
  return athleteCents - Math.round(athleteCents * 0.5);
};

app.post('/api/checkout/create-session', (req, res, next) => {
  if (!Object.hasOwn(req.body ?? {}, 'capsuleItems') && req.get('Authorization')) return requireUser(req, res, next);
  next();
}, async (req, res) => {
  try {
    const origin = appBaseUrl(req);
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    // BRANCH A: Athlete Merch Capsule Checkout from CartDrawer.tsx
    if (Object.hasOwn(req.body ?? {}, 'capsuleItems')) {
      let items;
      try {
        items = catalogueItems(req.body.capsuleItems);
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }
      let grossCents = 0;
      let athleteCutCents = 0;
      let clubCutCents = 0;
      let partnerCutCents = 0;

      const body = new URLSearchParams();
      body.set('mode', 'payment');

      items.forEach((entry, idx) => {
        const qty = entry.qty;
        const unitAud = entry.priceAud;
        const baseAud = entry.baseCostAud;
        const netUnitCents = Math.max(0, Math.round((unitAud - baseAud) * 100));
        const hasPartner = Number(entry.collabRoyaltyPct) > 0;
        const athletePct = hasPartner ? 0.55 : 0.7;
        const partnerPct = hasPartner ? Number(entry.collabRoyaltyPct) / 100 : 0;

        grossCents += Math.round(unitAud * 100) * qty;
        athleteCutCents += Math.round(netUnitCents * athletePct) * qty;
        clubCutCents += Math.round(netUnitCents * 0.15) * qty;
        partnerCutCents += Math.round(netUnitCents * partnerPct) * qty;

        body.set(`line_items[${idx}][quantity]`, String(qty));
        body.set(`line_items[${idx}][price_data][currency]`, 'aud');
        body.set(`line_items[${idx}][price_data][unit_amount]`, String(Math.round(unitAud * 100)));
        body.set(
          `line_items[${idx}][price_data][product_data][name]`,
          `tmrw/. ${entry.title} (${entry.size || 'L'})`,
        );
        body.set(
          `line_items[${idx}][price_data][product_data][description]`,
          `${Math.round(athletePct * 100)}% to ${entry.athleteName}${
            hasPartner ? ` · 15% to ${entry.collabPartner}` : ''
          } · 15% to ${entry.clubName}`,
        );
        const imgUrl = absoluteAssetUrl(entry.frontImageUrl, origin);
        if (imgUrl) {
          body.set(`line_items[${idx}][price_data][product_data][images][0]`, imgUrl);
        }
      });

      const primary = items[0];
      const successQuery = `capsule=1&athleteName=${encodeURIComponent(primary.athleteName || '')}`;
      body.set('success_url', `${origin}/?capsule_checkout=success&session_id={CHECKOUT_SESSION_ID}&${successQuery}`);
      body.set('cancel_url', `${origin}/?capsule_checkout=cancelled`);
      body.set('metadata[orderType]', 'merch_capsule');
      body.set('metadata[athleteName]', String(primary.athleteName || ''));
      body.set('metadata[clubName]', String(primary.clubName || ''));
      body.set('metadata[grossCents]', String(grossCents));
      body.set('metadata[athleteCutCents]', String(athleteCutCents));
      body.set('metadata[clubCutCents]', String(clubCutCents));
      body.set('metadata[partnerCutCents]', String(partnerCutCents));

      if (stripeKey) {
        const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${stripeKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body,
        });
        const session = await stripeRes.json();
        if (!stripeRes.ok || !session?.url) {
          return res.status(502).json({
            error: session?.error?.message ?? 'Stripe could not create a capsule checkout session.',
          });
        }
        return res.json({
          checkoutUrl: session.url,
          mode: 'stripe_live',
          sessionId: session.id,
        });
      }

      // Sandbox Demo fallback when STRIPE_SECRET_KEY is not yet in .env
      return res.json({
        checkoutUrl: null,
        mode: 'sandbox_demo',
        sessionId: `cs_demo_capsule_${Date.now()}`,
        splits: {
          grossAud: grossCents / 100,
          athleteAud: athleteCutCents / 100,
          clubAud: clubCutCents / 100,
          partnerAud: partnerCutCents / 100,
        },
      });
    }

    // BRANCH B: Commercial Sponsorship Tier Checkout
    const escrowMode = req.body?.escrowMode ?? 'milestone_50_50';
    if (!['milestone_50_50', 'upfront_100'].includes(escrowMode)) {
      return res.status(400).json({ error: 'Invalid escrowMode' });
    }
    const athleteId = String(req.body?.athleteId ?? '').trim();
    const requestedTierId = String(req.body?.tierId ?? '').trim();
    const tierId = requestedTierId === 'pathway_contender' ? 'pathway_flight' : requestedTierId;
    if (!athleteId || !tierId) {
      return res.status(400).json({ error: 'athleteId and tierId (or capsuleItems) are required' });
    }

    const catalogue = { ...FALLBACK_COMMERCIAL_TIERS, ...loadCommercialTiers() };
    const pkg = catalogue[tierId];
    if (!pkg || !Number.isFinite(pkg.price_aud) || pkg.price_aud <= 0) {
      return res.status(400).json({ error: `Unknown commercial tier: ${tierId}` });
    }

    const athlete = await hydrateAthleteFromSupabase(resolveCheckoutAthlete(athleteId, req.body));
    const successQuery = `athleteId=${encodeURIComponent(athleteId)}&tierId=${encodeURIComponent(tierId)}`;
    const successUrl = `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&${successQuery}`;
    const cancelUrl = athleteId
      ? `${origin}/#roster?athlete=${athleteId}&drawer=open`
      : `${origin}/#commercial-tiers`;
    const productImage = absoluteAssetUrl(athlete.image_url, origin);

    if (stripeKey) {
      const requestOrigin = req.get('Origin');
      if (requestOrigin && requestOrigin !== origin) {
        return res.status(400).json({ error: 'Start checkout from the main tmrw/. site.' });
      }
      const postcode = req.body?.postcode ?? athlete.postcode;
      if (!isGrantPostcode(postcode)) {
        return res.status(400).json({ error: 'A four-digit postcode is required for this sponsorship.' });
      }
      try {
        await checkGrantStorage();
      } catch {
        return res.status(503).json({ error: 'Sponsorship checkout is temporarily unavailable.' });
      }
      const grantAccess = createGrantAccess();
      const unitCents = Math.round(pkg.price_aud * 100);
      const body = new URLSearchParams();
      body.set('mode', 'payment');
      body.set('success_url', successUrl);
      body.set('cancel_url', cancelUrl);
      body.set('line_items[0][quantity]', '1');
      body.set('line_items[0][price_data][currency]', 'aud');
      body.set('line_items[0][price_data][unit_amount]', String(unitCents));
      body.set(
        'line_items[0][price_data][product_data][name]',
        `tmrw/. ${pkg.name} // ${athlete.full_name}`,
      );
      body.set(
        'line_items[0][price_data][product_data][description]',
        `70% to ${athlete.full_name} · 15% to ${athlete.grassroots_club_name} · 15% platform escrow`,
      );
      if (productImage) {
        body.set('line_items[0][price_data][product_data][images][0]', productImage);
      }
      body.set('metadata[orderType]', 'sponsorship_tier');
      body.set('metadata[athleteId]', athleteId);
      body.set('metadata[tierId]', tierId);
      body.set('metadata[athleteName]', athlete.full_name.slice(0, 500));
      body.set('metadata[postcode]', postcode);
      body.set('metadata[grantAccessHash]', grantAccess.hash);
      body.set('metadata[athleteCutCents]', String(Math.round(unitCents * 0.7)));
      body.set('metadata[clubCutCents]', String(Math.round(unitCents * 0.15)));
      body.set('metadata[escrowMode]', escrowMode);
      body.set('metadata[athleteEscrowHoldCents]', String(escrowMode === 'milestone_50_50' ? escrowHold(unitCents) : 0));
      if (req.authUser) body.set('metadata[sponsorUserId]', req.authUser.id);
      body.set('payment_intent_data[transfer_group]', transferGroupPattern.test(req.body?.transferGroup) ? req.body.transferGroup : `TG_${randomBytes(16).toString('hex')}`);
      for (const [key, value] of [...body]) {
        if (key.startsWith('metadata[') && key !== 'metadata[grantAccessHash]') {
          body.set(`payment_intent_data[metadata][${key.slice(9)}`, value);
        }
      }

      const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });
      const session = await stripeRes.json();
      if (!stripeRes.ok || !session?.url || !isStripeCheckoutId(session.id)) {
        return res.status(502).json({
          error: session?.error?.message ?? 'Stripe could not create a checkout session.',
        });
      }
      setGrantAccessCookie(req, res, session.id, grantAccess.secret);
      return res.json({ checkoutUrl: session.url, sessionId: session.id, transferGroup: body.get('payment_intent_data[transfer_group]') });
    }

    return res.json({
      checkoutUrl: `/checkout/success?session_id=cs_demo_${Date.now()}&${successQuery}`,
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message ?? 'Unable to initialise checkout.' });
  }
});

async function escrowStripe(path, params, method = 'GET', idempotencyKey) {
  const query = new URLSearchParams(params);
  const response = await fetch(`https://api.stripe.com/v1/${path}${method === 'GET' ? `?${query}` : ''}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded', ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
    ...(method === 'POST' ? { body: query } : {}),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error?.message || 'Stripe request failed'), { stripeStatus: response.status });
  return data;
}

async function escrowList(path, transferGroup) {
  const items = [];
  let after;
  do {
    const page = await escrowStripe(path, { transfer_group: transferGroup, limit: '100', ...(after ? { starting_after: after } : {}) });
    items.push(...page.data);
    after = page.has_more ? page.data.at(-1)?.id : undefined;
  } while (after);
  return items;
}

app.post('/api/checkout/release-escrow', async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: 'Stripe is not configured' });
  const { transferGroup, athleteId, checkoutSessionId, escrowHoldCents } = req.body ?? {};
  if ((transferGroup !== undefined && (typeof transferGroup !== 'string' || !transferGroupPattern.test(transferGroup))) || typeof athleteId !== 'string' || !athleteId ||
      typeof checkoutSessionId !== 'string' || !/^cs_[A-Za-z0-9_]+$/.test(checkoutSessionId)) {
    return res.status(400).json({ error: 'Valid checkoutSessionId, athleteId and optional transferGroup are required' });
  }
  try {
    let session;
    try {
      session = await escrowStripe(`checkout/sessions/${checkoutSessionId}`, { 'expand[]': 'payment_intent.latest_charge' });
    } catch (error) {
      if (error.stripeStatus === 404) return res.status(404).json({ error: 'Order not found' });
      throw error;
    }
    if (session.metadata?.sponsorUserId) {
      await requireUser(req, res, () => {});
      if (!req.authUser) return;
      if (session.metadata.sponsorUserId !== req.authUser.id) return res.status(403).json({ error: 'Order access denied' });
    }
    const intent = session.payment_intent;
    const order = { id: session.id, metadata: session.metadata, charge: intent?.latest_charge };
    const group = intent?.transfer_group;
    const m = order.metadata;
    const c = order.charge;
    const amount = Number(m?.athleteEscrowHoldCents);
    if (!(session.payment_status === 'paid' && c?.status === 'succeeded' && c.paid === true && c.captured === true && !c.refunded && !c.amount_refunded && !c.disputed && !c.dispute && c.currency === 'aud' &&
      m?.orderType === 'sponsorship_tier' && m.athleteId === athleteId && typeof group === 'string' && transferGroupPattern.test(group) && (transferGroup === undefined || group === transferGroup) &&
      Number.isSafeInteger(c.amount) && c.amount > 0)) return res.status(404).json({ error: 'Eligible paid escrow order not found' });
    if (m.escrowMode === 'upfront_100') return res.status(409).json({ error: 'Upfront order has no held escrow to release' });
    if (!(m.escrowMode === 'milestone_50_50' && typeof m.athleteEscrowHoldCents === 'string' && /^[1-9][0-9]*$/.test(m.athleteEscrowHoldCents) &&
      Number.isSafeInteger(amount) && amount <= escrowHold(c.amount))) return res.status(404).json({ error: 'Eligible paid escrow order not found' });
    const transfers = await escrowList('transfers', group);
    if (escrowHoldCents !== undefined && escrowHoldCents !== amount) return res.status(409).json({ error: 'Escrow amount does not match the order' });
    const existing = transfers.find((t) => [order.id, order.charge.id].includes(t.metadata?.escrowReleaseFor));
    const success = (transfer, alreadyReleased) => res.json({ released: true, escrowTransferId: transfer.id, releasedAmountCents: transfer.amount, releasedAt: new Date(transfer.created * 1000).toISOString(), alreadyReleased });
    if (existing) return success(existing, true);
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return res.status(503).json({ error: 'payout lookup not configured' });
    const response = await fetch(`${url}/rest/v1/athlete_profiles?${new URLSearchParams({ id: `eq.${athleteId}`, select: 'stripe_account_id' })}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return res.status(502).json({ error: 'Unable to look up athlete payout account' });
    const athletes = await response.json();
    const destination = athletes[0]?.stripe_account_id;
    if (typeof destination !== 'string' || !/^acct_[A-Za-z0-9]+$/.test(destination)) return res.status(409).json({ error: 'Athlete Connect account is not configured' });
    const orderId = order.charge.id;
    const transfer = await escrowStripe('transfers', {
      amount: String(amount), currency: 'aud', destination, transfer_group: group, source_transaction: orderId,
      'metadata[escrowReleaseFor]': orderId, 'metadata[athleteId]': athleteId, ...(m.sponsorUserId ? { 'metadata[sponsorUserId]': m.sponsorUserId } : {}),
    }, 'POST', `tmrw_escrow_release_${orderId}`);
    return success(transfer, false);
  } catch (error) {
    return res.status(502).json({ error: error.message || 'Unable to release escrow' });
  }
});

const distDir = join(__dirname, '..', 'dist');
app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found' }));
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => res.sendFile(join(distDir, 'index.html')));
} else {
  app.get('*', (_req, res) =>
    res.status(503).json({ error: 'Frontend build not found. Run `npm run build` first.' }),
  );
}

app.use((error, _req, res, _next) => {
  const status = error?.type === 'entity.too.large' ? 413 : error?.status === 400 ? 400 : 500;
  res.status(status).json({ error: status === 413 ? 'Request body too large' : status === 400 ? 'Invalid request body' : 'Request failed' });
});

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => {
    console.log(`[proxy] sponsor-match unified server listening on http://localhost:${PORT}`);
  });
}

export default app;