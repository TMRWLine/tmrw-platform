import express from 'express';
import cors from 'cors';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Load .env / .env.local (Vite doesn't inject env vars into a standalone Node process).
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
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'sponsor-match-proxy' });
});

/**
 * Spatial sponsor-matching endpoint.
 *
 * GET /api/match-sponsors?athleteId=<uuid>
 *
 * Loads the athlete's geography point, then calls the
 * match_sponsors_for_athlete PostGIS RPC (ST_DWithin using each sponsor's own
 * target_radius_meters) and returns ranked matches, closest first.
 *
 * PostgREST doesn't expose ST_DWithin directly, so this proxy is the only
 * place the spatial query can run.
 */
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

    // PostgREST returns 400 if `id` is not a UUID — never forward that to the drawer.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(athleteId)) {
      return res.status(200).json(emptyPayload(athleteId));
    }

    // Step 1: fetch the athlete with select=* so missing optional columns never 400.
    const athleteRes = await fetch(
      `${supabaseRestUrl}/rest/v1/athletes?id=eq.${encodeURIComponent(athleteId)}&select=*`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Accept: 'application/json',
        },
      }
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
      return res.status(200).json(emptyPayload(athlete.id ?? athleteId, {
        name: athlete.name ?? athlete.full_name ?? null,
        postcode: athlete.postcode ?? null,
        follower_count: athlete.follower_count ?? null,
        master_licence_signed: Boolean(athlete.master_licence_signed ?? athlete.ip_lock),
        nrl_tpa_registered: Boolean(athlete.nrl_tpa_registered),
        shute_shield_compliant: Boolean(athlete.shute_shield_compliant),
      }));
    }

    // Step 2: run the spatial match via the PostGIS RPC.
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

    // The RPC now returns latitude/longitude/currency directly; strip the raw
    // geography `location` field and use lat/lng for the frontend map.
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
      full_name: athlete.full_name !== 'Verified athlete'
        ? athlete.full_name
        : (row.full_name || row.name || athlete.full_name),
      grassroots_club_name:
        athlete.grassroots_club_name !== 'Grassroots club'
          ? athlete.grassroots_club_name
          : (row.current_club || row.club_name || athlete.grassroots_club_name),
      image_url: athlete.image_url || row.image_url || row.image || '',
    };
  } catch {
    return athlete;
  }
}

/**
 * POST /api/checkout/create-session
 * Body: { athleteId, tierId, athlete? }
 * Returns { checkoutUrl } for Stripe Checkout, or a local confirmation URL in demo mode.
 */
app.post('/api/checkout/create-session', async (req, res) => {
  try {
    const athleteId = String(req.body?.athleteId ?? '').trim();
    const tierId = String(req.body?.tierId ?? '').trim();
    if (!athleteId || !tierId) {
      return res.status(400).json({ error: 'athleteId and tierId are required' });
    }

    const catalogue = { ...FALLBACK_COMMERCIAL_TIERS, ...loadCommercialTiers() };
    const pkg = catalogue[tierId];
    if (!pkg || !Number.isFinite(pkg.price_aud) || pkg.price_aud <= 0) {
      return res.status(400).json({ error: `Unknown commercial tier: ${tierId}` });
    }

    const origin = appBaseUrl(req);
    const athlete = await hydrateAthleteFromSupabase(resolveCheckoutAthlete(athleteId, req.body));
    const successQuery = `athleteId=${encodeURIComponent(athleteId)}&tierId=${encodeURIComponent(tierId)}`;
    const successUrl = `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}&${successQuery}`;
    const cancelUrl = athleteId
      ? `${process.env.APP_BASE_URL}/#roster?athlete=${athleteId}&drawer=open`
      : `${process.env.APP_BASE_URL}/#commercial-tiers`;
    const productImage = absoluteAssetUrl(athlete.image_url, origin);

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (stripeKey) {
      const body = new URLSearchParams();
      body.set('mode', 'payment');
      body.set('success_url', successUrl);
      body.set('cancel_url', cancelUrl);
      body.set('line_items[0][quantity]', '1');
      body.set('line_items[0][price_data][currency]', 'aud');
      body.set('line_items[0][price_data][unit_amount]', String(Math.round(pkg.price_aud * 100)));
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
      body.set('metadata[athleteId]', athleteId);
      body.set('metadata[tierId]', tierId);

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
          error: session?.error?.message ?? 'Stripe could not create a checkout session.',
        });
      }
      return res.json({ checkoutUrl: session.url });
    }

    return res.json({
      checkoutUrl: `/checkout/success?session_id=cs_demo_${Date.now()}&${successQuery}`,
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message ?? 'Unable to initialise checkout.' });
  }
});

// Serve the built React frontend from dist/ for any non-/api request.
// In dev, Vite handles HMR on :5173 and proxies /api here; in production,
// Express serves both the API and the SPA from a single unified port.
const distDir = join(__dirname, '..', 'dist');
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => res.sendFile(join(distDir, 'index.html')));
} else {
  app.get('*', (_req, res) =>
    res.status(503).json({ error: 'Frontend build not found. Run `npm run build` first.' })
  );
}

app.listen(PORT, () => {
  console.log(`[proxy] sponsor-match unified server listening on http://localhost:${PORT}`);
});
