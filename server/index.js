import express from 'express';
import cors from 'cors';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import Stripe from 'stripe';
import { randomBytes } from 'node:crypto';
import { createTwelveLabsRouter } from './twelvelabs.js';
import { catalogueItems } from './capsule-catalogue.js';
import { capsuleSplit, capsuleTotals } from '../src/lib/capsuleCommerce.ts';
import {
  checkGrantStorage,
  diagnoseGrantStorage,
  createGrantAccess,
  grantPath,
  hasGrantAccess,
  isGrantPostcode,
  isStripeCheckoutId,
  issuePaidWhitelistingGrant,
  setGrantAccessCookie,
} from './whitelisting.js';
import { requireUser } from './auth.js';
import { supabaseHeaders, supabasePublicKey, supabaseSecretKey } from './supabase-keys.js';

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
        if (session.metadata?.orderType === 'merch_capsule') break;
        try {
          await settleCheckoutSession(session.id);
        } catch (error) {
          return res.status(500).json({ error: error.message || 'Settlement failed' });
        }
        const totalAud = (session.amount_total ?? 0) / 100;
        const gstAud = Number(session.metadata?.gstCents || 0) / 100;
        const exGstAud = session.metadata?.exGstCents === undefined ? totalAud - gstAud : Number(session.metadata.exGstCents) / 100;
        const orderType = session.metadata?.orderType || 'sponsorship_tier';
        const athleteCutCents = Number(session.metadata?.athleteCutCents || 0);
        const clubCutCents = Number(session.metadata?.clubCutCents || 0);
        const partnerCutCents = Number(session.metadata?.partnerCutCents || 0);

        console.log(`[stripe webhook] ✓ Checkout Session Completed: ${session.id}`);
        console.log(
          `[stripe webhook]   Type: ${orderType} | Ex-GST: A$${exGstAud.toFixed(2)} | GST: A$${gstAud.toFixed(2)} | Total: A$${totalAud.toFixed(2)} | Athlete: A$${(athleteCutCents / 100).toFixed(2)} | Club: A$${(clubCutCents / 100).toFixed(2)} | Partner: A$${(partnerCutCents / 100).toFixed(2)}`,
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

app.get('/api/health/grant-storage', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  const result = await diagnoseGrantStorage();
  res.status(result.ok ? 200 : 503).json(result);
});

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
    const supabasePublishableKey = supabasePublicKey();
    if (!supabasePublishableKey) {
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
          ...supabaseHeaders(supabasePublishableKey),
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
        ...supabaseHeaders(supabasePublishableKey),
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
  olympic_1yr_50k: { name: 'LA 2028 Qualifier Partnership', price_aud: 50000 },
  olympic_2yr_110k: { name: 'LA 2028 Games Partnership', price_aud: 110000 },
  olympic_4yr_250k: { name: 'Brisbane 2032 Home Games Quadrennial', price_aud: 250000 },
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
  const supabasePublishableKey = supabasePublicKey();
  if (!supabaseRestUrl || !supabasePublishableKey) return athlete;
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
          ...supabaseHeaders(supabasePublishableKey),
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
      let garmentCostCents = 0;
      let athleteCutCents = 0;
      let clubCutCents = 0;
      let partnerCutCents = 0;

      const body = new URLSearchParams();
      body.set('mode', 'payment');

      items.forEach((entry, idx) => {
        const qty = entry.qty;
        const unitAud = entry.priceAud;
        const baseAud = entry.baseCostAud;
        const hasPartner = Number(entry.collabRoyaltyPct) > 0;
        const athletePct = hasPartner ? 0.55 : 0.7;
        const split = capsuleSplit(unitAud, baseAud, Number(entry.collabRoyaltyPct), qty);

        grossCents += Math.round(unitAud * 100) * qty;
        garmentCostCents += Math.round(baseAud * 100) * qty;
        athleteCutCents += split.athleteCents;
        clubCutCents += split.clubCents;
        partnerCutCents += split.partnerCents;

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

      const totals = capsuleTotals(grossCents);
      body.set(`line_items[${items.length}][quantity]`, '1');
      body.set(`line_items[${items.length}][price_data][currency]`, 'aud');
      body.set(`line_items[${items.length}][price_data][unit_amount]`, String(totals.gstCents));
      body.set(`line_items[${items.length}][price_data][product_data][name]`, 'GST (10%)');

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
      const netCents = grossCents - garmentCostCents;
      const platformCents = netCents - athleteCutCents - clubCutCents - partnerCutCents;
      body.set('metadata[netCents]', String(netCents));
      body.set('metadata[garmentCostCents]', String(garmentCostCents));
      body.set('metadata[platformCutCents]', String(platformCents));

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
          netCents,
          garmentCostCents,
          platformCents,
        },
        totals,
      });
    }

    // BRANCH B: Commercial Sponsorship Tier Checkout
    const clubCadence = req.body?.clubCadence === undefined ? 'quarterly_batch' : req.body.clubCadence;
    if (!['quarterly_batch', 'immediate_t0'].includes(clubCadence)) return res.status(400).json({ error: 'Invalid clubCadence' });
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
      const gstCents = Math.round(unitCents * 0.1);
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
      body.set('line_items[1][quantity]', '1');
      body.set('line_items[1][price_data][currency]', 'aud');
      body.set('line_items[1][price_data][unit_amount]', String(gstCents));
      body.set('line_items[1][price_data][product_data][name]', 'GST (10%)');
      body.set('metadata[exGstCents]', String(unitCents));
      body.set('metadata[gstCents]', String(gstCents));
      body.set('metadata[totalIncGstCents]', String(unitCents + gstCents));
      body.set('metadata[athleteId]', athleteId);
      body.set('metadata[tierId]', tierId);
      body.set('metadata[athleteName]', athlete.full_name.slice(0, 500));
      body.set('metadata[postcode]', postcode);
      body.set('metadata[grantAccessHash]', grantAccess.hash);
      body.set('metadata[athleteCutCents]', String(Math.round(unitCents * 0.7)));
      body.set('metadata[clubCutCents]', String(Math.round(unitCents * 0.15)));
      body.set('metadata[escrowMode]', escrowMode);
      body.set('metadata[clubCadence]', clubCadence);
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

app.get('/api/checkout/capsule-session', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const sessionId = req.query.session_id;
  if (typeof sessionId !== 'string' || !/^cs_(test|live)_[A-Za-z0-9_]{1,200}$/.test(sessionId)) {
    return res.status(400).json({ error: 'A valid Stripe checkout session is required.' });
  }
  const key = process.env.STRIPE_SECRET_KEY;
  const keyMode = key?.match(/^(?:sk|rk)_(test|live)_/)?.[1];
  if (!keyMode) return res.status(503).json({ error: 'Stripe receipt verification is unavailable.' });
  try {
    const headers = { Authorization: `Bearer ${key}` };
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, { headers, signal: AbortSignal.timeout(15000) });
    if (!response.ok) return res.status(response.status === 404 ? 404 : 502).json({ error: 'Unable to verify this checkout session.' });
    const session = await response.json();
    if (session.id !== sessionId || session.livemode !== (keyMode === 'live') || !sessionId.startsWith(`cs_${keyMode}_`) || session.metadata?.orderType !== 'merch_capsule') {
      return res.status(404).json({ error: 'Merchandise session not found.' });
    }
    const itemsResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}/line_items?limit=100`, { headers, signal: AbortSignal.timeout(15000) });
    if (!itemsResponse.ok) throw new Error('Line items unavailable');
    const items = await itemsResponse.json();
    if (!Array.isArray(items.data) || items.has_more) throw new Error('Incomplete line items');
    const cents = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
    const gstItems = items.data.filter(item => item.description === 'GST (10%)');
    const merchandise = items.data.filter(item => item.description !== 'GST (10%)');
    const optionalCents = (name, value) => typeof value === 'string' && /^\d+$/.test(value) && Number.isSafeInteger(Number(value))
      ? { [name]: Number(value) } : {};
    return res.json({
      paymentStatus: ['paid', 'unpaid', 'no_payment_required'].includes(session.payment_status) ? session.payment_status : 'unknown',
      currency: typeof session.currency === 'string' ? session.currency : 'aud',
      lineItems: merchandise.map(item => ({ description: String(item.description ?? 'Merchandise').slice(0, 500), quantity: cents(item.quantity), amountCents: cents(item.amount_total) })),
      subtotalCents: merchandise.reduce((sum, item) => sum + cents(item.amount_total), 0),
      gstCents: gstItems.reduce((sum, item) => sum + cents(item.amount_total), 0) + cents(session.total_details?.amount_tax),
      shippingCents: cents(session.total_details?.amount_shipping),
      totalCents: cents(session.amount_total),
      splits: {
        athleteCents: cents(Number(session.metadata.athleteCutCents)),
        clubCents: cents(Number(session.metadata.clubCutCents)),
        partnerCents: cents(Number(session.metadata.partnerCutCents)),
        ...optionalCents('netCents', session.metadata.netCents),
        ...optionalCents('garmentCostCents', session.metadata.garmentCostCents),
        ...optionalCents('platformCents', session.metadata.platformCutCents),
      },
    });
  } catch {
    return res.status(502).json({ error: 'Unable to verify checkout. Your bag has been kept.' });
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

function payoutError(status, message) {
  return Object.assign(new Error(message), { status });
}

async function retrieveCheckoutOrder(checkoutSessionId) {
  if (!process.env.STRIPE_SECRET_KEY) throw payoutError(503, 'Stripe is not configured');
  if (typeof checkoutSessionId !== 'string' || !/^cs_[A-Za-z0-9_]+$/.test(checkoutSessionId)) throw payoutError(400, 'Valid checkoutSessionId is required');
  try {
    const session = await escrowStripe(`checkout/sessions/${checkoutSessionId}`, { 'expand[]': 'payment_intent.latest_charge' });
    if (session.id !== checkoutSessionId) throw payoutError(404, 'Order not found');
    return session;
  } catch (error) {
    if (error.stripeStatus === 404) throw payoutError(404, 'Order not found');
    throw error;
  }
}

async function authorizeCheckoutOrder(session, req, res) {
  if (!session.metadata?.sponsorUserId) {
    if (!hasGrantAccess(req, session.id, session.metadata?.grantAccessHash)) throw payoutError(403, 'Open the receipt in the browser used to start checkout to approve delivery.');
    return true;
  }
  await requireUser(req, res, () => {});
  if (!req.authUser) return false;
  if (session.metadata.sponsorUserId !== req.authUser.id) throw payoutError(403, 'Order access denied');
  return true;
}

function verifiedCheckoutOrder(session) {
  const m = session.metadata;
  const c = session.payment_intent?.latest_charge;
  const group = session.payment_intent?.transfer_group;
  if (!(session.payment_status === 'paid' && c?.status === 'succeeded' && c.paid === true && c.captured === true && !c.refunded && !c.amount_refunded && !c.disputed && !c.dispute && c.currency === 'aud' &&
    m?.orderType === 'sponsorship_tier' && typeof m.athleteId === 'string' && m.athleteId && typeof group === 'string' && transferGroupPattern.test(group) && Number.isSafeInteger(c.amount) && c.amount > 0)) {
    throw payoutError(404, 'Eligible paid escrow order not found');
  }
  return { id: session.id, metadata: m, charge: c, group };
}

function payoutConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = supabaseSecretKey();
  if (!url || !key) throw payoutError(503, 'payout lookup not configured');
  return { url, headers: supabaseHeaders(key) };
}

async function athletePayoutProfile(athleteId) {
  if (typeof athleteId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(athleteId)) throw payoutError(409, 'Athlete Connect account is not configured');
  const { url, headers } = payoutConfig();
  const response = await fetch(`${url}/rest/v1/athlete_profiles?${new URLSearchParams({ id: `eq.${athleteId}`, select: 'stripe_account_id,current_club' })}`, { headers, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw payoutError(502, 'Unable to look up athlete payout account');
  const profiles = await response.json();
  const profile = profiles[0];
  if (typeof profile?.stripe_account_id !== 'string' || !/^acct_[A-Za-z0-9]+$/.test(profile.stripe_account_id)) throw payoutError(409, 'Athlete Connect account is not configured');
  return profile;
}

function stampedCents(value) {
  return typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : NaN;
}

export async function settleCheckoutSession(checkoutSessionId, authorize = async () => true) {
  const session = await retrieveCheckoutOrder(checkoutSessionId);
  if (!await authorize(session)) return null;
  const { metadata: m, charge, group } = verifiedCheckoutOrder(session);
  const athleteCut = stampedCents(m.athleteCutCents);
  const hold = stampedCents(m.athleteEscrowHoldCents);
  const clubAmount = stampedCents(m.clubCutCents);
  const clubCadence = m.clubCadence === undefined ? 'quarterly_batch' : m.clubCadence;
  const amount = athleteCut - hold;
  if (!(athleteCut > 0 && athleteCut <= Math.round(charge.amount * 0.7) && clubAmount > 0 && clubAmount <= Math.round(charge.amount * 0.15) && Number.isSafeInteger(amount) && amount > 0 &&
    ((m.escrowMode === 'upfront_100' && hold === 0) || (m.escrowMode === 'milestone_50_50' && hold === athleteCut - Math.round(athleteCut * 0.5))) && ['quarterly_batch', 'immediate_t0'].includes(clubCadence))) throw payoutError(409, 'Invalid stamped payout amounts or cadence');
  const paidAt = new Date((charge.created ?? session.created) * 1000);
  if (!Number.isFinite(paidAt.getTime())) throw payoutError(409, 'Order payment date is missing');
  const profile = await athletePayoutProfile(m.athleteId);
  const transfers = await escrowList('transfers', group);
  let transfer = transfers.find((t) => t.metadata?.payoutFor === 'athlete_t0' && t.metadata?.payoutCharge === charge.id);
  const alreadyPaid = Boolean(transfer);
  if (!transfer) transfer = await escrowStripe('transfers', {
    amount: String(amount), currency: 'aud', destination: profile.stripe_account_id, transfer_group: group, source_transaction: charge.id,
    'metadata[payoutFor]': 'athlete_t0', 'metadata[payoutCharge]': charge.id, 'metadata[athleteId]': m.athleteId,
  }, 'POST', `tmrw_athlete_t0_${charge.id}`);
  if (!transfer.id) throw payoutError(502, 'Stripe did not confirm athlete payout');
  const scheduledFor = clubCadence === 'quarterly_batch' ? new Date(paidAt.getFullYear(), (Math.floor(paidAt.getMonth() / 3) + 1) * 3, 0).toISOString() : null;
  const status = clubCadence === 'quarterly_batch' ? 'queued_quarterly' : 'awaiting_club_connect_account';
  const { url, headers } = payoutConfig();
  const clubResponse = await fetch(`${url}/rest/v1/club_payouts?on_conflict=charge_id`, {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify({ checkout_session_id: session.id, charge_id: charge.id, transfer_group: group, athlete_id: m.athleteId, club_name: profile.current_club || null, amount_cents: clubAmount, cadence: clubCadence, status, scheduled_for: scheduledFor, stripe_transfer_id: null }), signal: AbortSignal.timeout(8000),
  });
  if (!clubResponse.ok) throw payoutError(502, 'Unable to record club payout');
  return { settled: true, athleteT0: { transferId: transfer.id, amountCents: transfer.amount, alreadyPaid }, club: { status, amountCents: clubAmount, cadence: clubCadence, scheduledFor } };
}

app.post('/api/checkout/settle', async (req, res) => {
  try {
    const result = await settleCheckoutSession(req.body?.checkoutSessionId, (session) => authorizeCheckoutOrder(session, req, res));
    if (result) return res.json(result);
  } catch (error) {
    return res.status(error.status || 502).json({ error: error.message || 'Unable to settle checkout' });
  }
});

app.post('/api/checkout/release-escrow', async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: 'Stripe is not configured' });
  const { transferGroup, athleteId, checkoutSessionId, escrowHoldCents } = req.body ?? {};
  if ((transferGroup !== undefined && (typeof transferGroup !== 'string' || !transferGroupPattern.test(transferGroup))) || typeof athleteId !== 'string' || !athleteId ||
      typeof checkoutSessionId !== 'string' || !/^cs_[A-Za-z0-9_]+$/.test(checkoutSessionId)) {
    return res.status(400).json({ error: 'Valid checkoutSessionId, athleteId and optional transferGroup are required' });
  }
  try {
    const session = await retrieveCheckoutOrder(checkoutSessionId);
    if (!await authorizeCheckoutOrder(session, req, res)) return;
    const order = verifiedCheckoutOrder(session);
    const group = order.group;
    const m = order.metadata;
    const c = order.charge;
    const amount = Number(m?.athleteEscrowHoldCents);
    if (m.athleteId !== athleteId || (transferGroup !== undefined && group !== transferGroup)) return res.status(404).json({ error: 'Eligible paid escrow order not found' });
    if (m.escrowMode === 'upfront_100') return res.status(409).json({ error: 'Upfront order has no held escrow to release' });
    let exGstCents = c.amount;
    if (m.exGstCents !== undefined || m.gstCents !== undefined) {
      exGstCents = Number(m.exGstCents);
      const gstCents = Number(m.gstCents);
      if (!(typeof m.exGstCents === 'string' && /^[1-9][0-9]*$/.test(m.exGstCents) &&
        typeof m.gstCents === 'string' && /^[0-9]+$/.test(m.gstCents) &&
        Number.isSafeInteger(exGstCents) && Number.isSafeInteger(gstCents) &&
        c.amount === exGstCents + gstCents)) return res.status(404).json({ error: 'Eligible paid escrow order not found' });
    }
    if (!(m.escrowMode === 'milestone_50_50' && typeof m.athleteEscrowHoldCents === 'string' && /^[1-9][0-9]*$/.test(m.athleteEscrowHoldCents) &&
      Number.isSafeInteger(amount) && amount <= escrowHold(exGstCents))) return res.status(404).json({ error: 'Eligible paid escrow order not found' });
    const transfers = await escrowList('transfers', group);
    if (escrowHoldCents !== undefined && escrowHoldCents !== amount) return res.status(409).json({ error: 'Escrow amount does not match the order' });
    const existing = transfers.find((t) => [order.id, order.charge.id].includes(t.metadata?.escrowReleaseFor));
    const success = (transfer, alreadyReleased) => res.json({ released: true, escrowTransferId: transfer.id, releasedAmountCents: transfer.amount, releasedAt: new Date(transfer.created * 1000).toISOString(), alreadyReleased });
    if (existing) return success(existing, true);
    const { stripe_account_id: destination } = await athletePayoutProfile(athleteId);
    const orderId = order.charge.id;
    const transfer = await escrowStripe('transfers', {
      amount: String(amount), currency: 'aud', destination, transfer_group: group, source_transaction: orderId,
      'metadata[escrowReleaseFor]': orderId, 'metadata[athleteId]': athleteId, ...(m.sponsorUserId ? { 'metadata[sponsorUserId]': m.sponsorUserId } : {}),
    }, 'POST', `tmrw_escrow_release_${orderId}`);
    return success(transfer, false);
  } catch (error) {
    return res.status(error.status || 502).json({ error: error.message || 'Unable to release escrow' });
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