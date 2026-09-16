import express from 'express';
import cors from 'cors';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Load .env (Vite doesn't inject env vars into a standalone Node process).
const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const envFile = readFileSync(join(__dirname, '..', '.env'), 'utf8');
  for (const line of envFile.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {
  /* .env optional in hosted env */
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

    // Step 1: fetch the athlete's location and new fields.
    const athleteRes = await fetch(
      `${supabaseRestUrl}/rest/v1/athletes?id=eq.${encodeURIComponent(athleteId)}&select=id,name,location,latitude,longitude,postcode,follower_count,master_licence_signed,nrl_tpa_registered,shute_shield_compliant`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Accept: 'application/json',
        },
      }
    );
    if (!athleteRes.ok) {
      return res.status(502).json({ error: `Failed to load athlete (${athleteRes.status})` });
    }
    const athleteRows = await athleteRes.json();
    if (!Array.isArray(athleteRows) || athleteRows.length === 0) {
      return res.status(404).json({ error: 'Athlete not found' });
    }
    const athlete = athleteRows[0];
    if (!athlete.location) {
      return res.status(400).json({ error: 'Athlete has no location set' });
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
