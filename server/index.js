import express from 'express';
import cors from 'cors';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import Stripe from 'stripe';
import { createTwelveLabsRouter } from './twelvelabs.js';
import { capsuleLedger, sponsorshipLedger } from '../src/lib/commercialLedger.js';
import { addConnectMetadata, checkoutKey, configuredPayees, completeCheckout, reverseDispute, releaseHeldFunds } from './connect.js';

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

const PORT = Number(process.env.PROXY_PORT || process.env.PORT || 3001);
const REQUEST_TIMEOUT_MS = 10000;
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export const app = express();
app.use(cors());

/**
 * 1. STRIPE WEBHOOK ENDPOINT
 * Must use express.raw({ type: 'application/json' }) and sit BEFORE app.use(express.json()).
 */
app.post('/api/v1/webhooks/stripe', express.raw({ type: 'application/json', limit: '256kb' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!endpointSecret) {
    return res.status(400).json({ error: 'STRIPE_WEBHOOK_SECRET is not configured in .env' });
  }

  let event;
  try {
    const stripe = new Stripe(stripeKey || 'sk_test_placeholder');
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch {
    console.error('[stripe webhook] Signature verification failed');
    return res.status(400).send('Webhook Error: Signature verification failed');
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object;
        if (!session.metadata?.ledgerGrossCents) {
          console.warn('[stripe connect] Legacy session has no payout ledger; manual review required.');
          return res.json({ received: true });
        }
        const result = await completeCheckout(session);
        return res.json({ received: true, ...result });
      }
      case 'charge.dispute.created': {
        const reversals = await reverseDispute(event.data.object);
        return res.json({ received: true, reversals });
      }
      default:
        console.log(`[stripe webhook] Unhandled event type ${event.type}`);
    }

    return res.json({ received: true });
  } catch {
    console.error('[stripe webhook] Payout processing failed; Stripe should retry the event.');
    return res.status(500).json({ error: 'Unable to process Stripe event' });
  }
});

// General JSON body parser for all other routes
app.use('/api/twelvelabs', createTwelveLabsRouter());
app.use(express.json({ limit: '256kb' }));

app.get('/health', (_req, res) => {
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
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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
      return res.status(502).json({
        error: `Spatial match RPC failed (${rpcRes.status})`,
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
    return res.status(500).json({ error: 'Unable to match sponsors.' });
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
    full_name: snapshot.full_name || fromMock?.full_name || 'Verified athlete',
    grassroots_club_name:
      snapshot.grassroots_club_name || fromMock?.grassroots_club?.name || 'Grassroots club',
    image_url: snapshot.image_url || fromMock?.image_url || '',
  };
}

async function hydrateAthleteFromSupabase(athlete) {
  const supabaseRestUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const serverKey = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
  if (!supabaseRestUrl || !serverKey) return athlete;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(athlete.id)) {
    return athlete;
  }
  try {
    const athleteRes = await fetch(
      `${supabaseRestUrl}/rest/v1/athlete_profiles?id=eq.${encodeURIComponent(athlete.id)}&select=*`,
      {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          apikey: serverKey,
          Authorization: `Bearer ${serverKey}`,
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
      stripe_account_id: row.stripe_account_id,
      abn: row.abn,
      gst_registered: row.gst_registered,
      club: row.club || row.metadata?.club,
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
app.post('/api/checkout/create-session', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'A checkout request body is required' });
    }
    const origin = appBaseUrl(req);
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const idempotencyKey = checkoutKey(req);
    const transferGroup = `tmrw_${idempotencyKey}`;

    if ('capsuleItems' in req.body) {
      const items = req.body.capsuleItems;
      if (!Array.isArray(items) || items.length < 1 || items.length > 50) {
        return res.status(400).json({ error: 'capsuleItems must contain between 1 and 50 items' });
      }
      const validItems = items.every((entry) => {
        if (!entry || typeof entry !== 'object') return false;
        const { qty, priceAud, baseCostAud, collabRoyaltyPct = 0 } = entry;
        return Number.isInteger(qty) && qty >= 1 && qty <= 100 &&
          Number.isFinite(priceAud) && priceAud >= 1 && priceAud <= 100000 &&
          Number.isFinite(baseCostAud) && baseCostAud >= 0 && baseCostAud <= priceAud &&
          Number.isFinite(collabRoyaltyPct) && collabRoyaltyPct >= 0 && collabRoyaltyPct <= 30;
      });
      const totalCents = items.reduce((total, entry) =>
        total + Math.round(entry?.priceAud * 100) * entry?.qty, 0);
      if (!validItems || !Number.isSafeInteger(totalCents) || totalCents > 99999999) {
        return res.status(400).json({ error: 'Invalid capsule quantity, price, base cost, royalty, or order total' });
      }
    }

    // BRANCH A: Athlete Merch Capsule Checkout from CartDrawer.tsx
    if (Array.isArray(req.body?.capsuleItems) && req.body.capsuleItems.length > 0) {
      const items = req.body.capsuleItems;
      const payees = configuredPayees();
      const ledger = capsuleLedger(items, payees);
      const { grossCents, athleteCents: athleteCutCents, clubCents: clubCutCents, partnerCents: partnerCutCents } = ledger;

      const body = new URLSearchParams();
      body.set('mode', 'payment');

      items.forEach((entry, idx) => {
        const qty = entry.qty;
        const unitAud = entry.priceAud;
        const hasPartner = Number(entry.collabRoyaltyPct) > 0;
        const athletePct = hasPartner ? 0.55 : 0.7;

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
      addConnectMetadata(body, ledger, payees, transferGroup);

      if (stripeKey && (payees.athlete.accountId || payees.club.accountId || payees.partner.accountId)) {
        const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          method: 'POST',
          headers: {
            'Idempotency-Key': `session-${idempotencyKey}`,
            Authorization: `Bearer ${stripeKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body,
        });
        const session = await stripeRes.json();
        if (!stripeRes.ok || !session?.url) {
          return res.status(502).json({
            error: 'Stripe could not create a capsule checkout session.',
          });
        }
        return res.json({
          checkoutUrl: session.url,
          mode: 'stripe_live',
          sessionId: session.id,
          ledger, transferGroup,
        });
      }

      // Sandbox Demo fallback when STRIPE_SECRET_KEY is not yet in .env
      console.info('[stripe connect] Capsule demo ledger computed; Stripe key or connected payout accounts are missing.');
      return res.json({
        checkoutUrl: null,
        mode: 'sandbox_demo',
        sessionId: `cs_demo_capsule_${Date.now()}`,
        ledger, transferGroup,
        splits: {
          grossAud: grossCents / 100,
          athleteAud: athleteCutCents / 100,
          clubAud: clubCutCents / 100,
          partnerAud: partnerCutCents / 100,
        },
      });
    }

    // BRANCH B: Commercial Sponsorship Tier Checkout
    const athleteId = String(req.body?.athleteId ?? '').trim();
    const tierId = String(req.body?.tierId ?? '').trim();
    if (typeof req.body.athleteId !== 'string' || typeof req.body.tierId !== 'string' ||
        !athleteId || !tierId || athleteId.length > 200 || tierId.length > 100) {
      return res.status(400).json({ error: 'athleteId and tierId (or capsuleItems) are required' });
    }

    const catalogue = { ...FALLBACK_COMMERCIAL_TIERS, ...loadCommercialTiers() };
    const pkg = Object.hasOwn(catalogue, tierId) ? catalogue[tierId] : null;
    if (!pkg || !Number.isFinite(pkg.price_aud) || pkg.price_aud <= 0 || pkg.price_aud > 100000) {
      return res.status(400).json({ error: `Unknown commercial tier: ${tierId}` });
    }

    const athlete = await hydrateAthleteFromSupabase(resolveCheckoutAthlete(athleteId, req.body));
    const payees = configuredPayees(athlete);
    const escrowMode = req.body.escrowMode === 'milestone_50_50' ? 'milestone_50_50' : 'upfront_100';
    const clubCadence = req.body.clubCadence === 'quarterly_batch' ? 'quarterly_batch' : 'immediate_t0';
    const ledger = sponsorshipLedger(Math.round(pkg.price_aud * 100), payees, escrowMode);
    const splitLedger = { ...ledger, transferGroup };
    const successQuery = `athleteId=${encodeURIComponent(athleteId)}&tierId=${encodeURIComponent(tierId)}`;
    const successUrl = `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&${successQuery}`;
    const cancelUrl = athleteId
      ? `${origin}/#roster?athlete=${athleteId}&drawer=open`
      : `${origin}/#commercial-tiers`;
    const productImage = absoluteAssetUrl(athlete.image_url, origin);

    if (stripeKey && (payees.athlete.accountId || payees.club.accountId)) {
      const unitCents = ledger.totalPayableCents;
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
      body.set('metadata[athleteCutCents]', String(ledger.athlete70Cents));
      body.set('metadata[clubCutCents]', String(ledger.club15Cents));
      addConnectMetadata(body, ledger, payees, transferGroup, escrowMode, clubCadence);

      const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        method: 'POST',
        headers: {
          'Idempotency-Key': `session-${idempotencyKey}`,
          Authorization: `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });
      const session = await stripeRes.json();
      if (!stripeRes.ok || !session?.url) {
        return res.status(502).json({
          error: 'Stripe could not create a checkout session.',
        });
      }
      return res.json({ checkoutUrl: session.url, splitLedger, ledger, transferGroup, sessionId: session.id });
    }

    console.info('[stripe connect] Sponsorship demo ledger computed; Stripe key or connected payout accounts are missing.');
    return res.json({
      checkoutUrl: `/checkout/success?session_id=cs_demo_${Date.now()}&${successQuery}`,
      splitLedger, ledger, transferGroup, mode: 'sandbox_demo',
    });
  } catch (err) {
    return res.status(500).json({ error: 'Unable to initialise checkout.' });
  }
});

app.post('/api/checkout/release-escrow', async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.json({ released: false, mode: 'sandbox_demo' });
  }
  const token = process.env.ESCROW_RELEASE_TOKEN;
  if (!token || req.get('Authorization') !== `Bearer ${token}`) {
    return res.status(403).json({ error: 'Verified milestone approval is required' });
  }
  if (typeof req.body?.sessionId !== 'string' || !/^cs_[a-zA-Z0-9_]+$/.test(req.body.sessionId)) {
    return res.status(400).json({ error: 'A checkout sessionId is required' });
  }
  try {
    return res.json(await releaseHeldFunds(req.body.sessionId));
  } catch {
    return res.status(502).json({ error: 'Unable to release escrow' });
  }
});

const distDir = join(__dirname, '..', 'dist');
app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found' }));
app.use((err, _req, res, _next) => {
  const status = err.type === 'entity.too.large' ? 413 : err.type === 'entity.parse.failed' ? 400 : 500;
  res.status(status).json({ error: status === 413 ? 'Request body too large' : status === 400 ? 'Invalid JSON body' : 'Internal server error' });
});
if (!process.env.VERCEL && existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => res.sendFile(join(distDir, 'index.html')));
} else {
  app.get('*', (_req, res) =>
    res.status(503).json({ error: 'Frontend build not found. Run `npm run build` first.' }),
  );
}

export function startServer(port = PORT) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.error('[proxy] Invalid PORT/PROXY_PORT: expected an integer between 0 and 65535. Server not started.');
    process.exitCode = 1;
    return null;
  }
  const server = app.listen(port, () => {
    console.log(`[proxy] sponsor-match unified server listening on http://localhost:${server.address().port}`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[proxy] Port ${port} is already in use. Server not started; stop the existing server or set PROXY_PORT/PORT to another port.`);
    } else {
      console.error(`[proxy] Unable to listen on port ${port} (${err.code || 'unknown error'}). Server not started.`);
      process.exitCode = 1;
    }
  });
  return server;
}

if (!process.env.VERCEL && process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer();
}

export default app;