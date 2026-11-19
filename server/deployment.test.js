import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import Stripe from 'stripe';
import handler from '../api/[...path].js';
import app from './index.js';

async function withServer(run) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await run((path, options) => fetch(`http://127.0.0.1:${server.address().port}${path}`, options));
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

test('Vercel exports the Express handler, health works, and missing API routes never return SPA HTML', () => withServer(async (request) => {
  assert.equal(handler, app);
  assert.equal(typeof handler, 'function');
  const health = await request('/api/health');
  assert.equal(health.status, 200);
  assert.equal((await health.json()).ok, true);
  const missing = await request('/api/not-a-route');
  assert.equal(missing.status, 404);
  assert.match(missing.headers.get('content-type'), /application\/json/);
}));

test('Vercel keeps API paths out of the SPA rewrite and includes the runtime catalogue', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url)));
  const pattern = new RegExp(`^${config.rewrites[0].source}$`);
  assert.ok(pattern.test('/'));
  assert.ok(pattern.test('/checkout/success'));
  assert.ok(!pattern.test('/api/checkout/create-session'));
  assert.ok(!pattern.test('/api/auth/instagram/start'));
  assert.ok(!pattern.test('/api'));
  assert.equal(config.buildCommand, 'npm run build');
  assert.equal(config.outputDirectory, 'dist');
  const path = config.functions['api/**/*.js'].includeFiles;
  const catalogue = JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url)));
  assert.ok(Array.isArray(catalogue.packages) && catalogue.packages.length > 0);
  assert.ok(catalogue.packages.every((entry) => typeof entry.tier_id === 'string' && Number.isFinite(entry.price_aud)));
});

test('Vercel applies anti-framing, HTTPS and a scoped script policy to pages and API responses', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url)));
  const { source, headers } = config.headers[0];
  const path = new RegExp(`^${source}$`);
  for (const route of ['/', '/the-roster', '/api/health']) assert.ok(path.test(route));
  const values = Object.fromEntries(headers.map(({ key, value }) => [key, value]));
  const directives = Object.fromEntries(values['Content-Security-Policy'].split(';').map(directive => {
    const [key, ...sources] = directive.trim().split(/\s+/);
    return [key, sources];
  }));
  assert.deepEqual(directives['frame-ancestors'], ["'none'"]);
  assert.deepEqual(directives['object-src'], ["'none'"]);
  assert.deepEqual(directives['script-src'], ["'self'", 'https://vercel.live']);
  assert.ok(directives['connect-src'].includes('https://*.supabase.co'));
  assert.match(values['Strict-Transport-Security'], /max-age=31536000/);
  assert.equal(values['X-Content-Type-Options'], 'nosniff');
  assert.equal(values['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.match(values['Permissions-Policy'], /geolocation=\(\)/);
});

test('Instagram OAuth starts through the Vercel handler or returns a JSON configuration error', () => withServer(async (request) => {
  const names = ['INSTAGRAM_APP_ID', 'INSTAGRAM_APP_SECRET', 'INSTAGRAM_REDIRECT_URI'];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  for (const name of names) delete process.env[name];
  try {
    const missingApp = await request('/api/auth/instagram/start');
    assert.equal(missingApp.status, 501);
    assert.match((await missingApp.json()).error, /not configured/);
    process.env.INSTAGRAM_APP_ID = 'fixture-app-id';
    process.env.INSTAGRAM_APP_SECRET = 'fixture-app-secret';
    const missingCallback = await request('/api/auth/instagram/start');
    assert.equal(missingCallback.status, 501);
    assert.match((await missingCallback.json()).error, /callback is not configured/);
    process.env.INSTAGRAM_REDIRECT_URI = 'https://fixture.invalid/api/auth/instagram/callback';
    const started = await request('/api/auth/instagram/start?token=fixture-token');
    assert.equal(started.status, 200);
    const body = await started.json();
    const url = new URL(body.url);
    assert.equal(url.origin, 'https://www.instagram.com');
    assert.equal(url.pathname, '/oauth/authorize');
    assert.equal(url.searchParams.get('client_id'), 'fixture-app-id');
    assert.equal(url.searchParams.get('redirect_uri'), process.env.INSTAGRAM_REDIRECT_URI);
    assert.equal(url.searchParams.get('response_type'), 'code');
    assert.equal(url.searchParams.get('scope'), 'instagram_business_basic');
    const state = url.searchParams.get('state');
    assert.match(state, /^[a-f0-9]{64}$/);
    assert.ok(!JSON.stringify(body).includes(process.env.INSTAGRAM_APP_SECRET));
    const cookie = started.headers.get('set-cookie');
    assert.ok(cookie.includes('tmrw_instagram_state=' + state));
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /SameSite=Lax/);
    assert.match(cookie, /Path=\/api\/auth\/instagram/);
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
}));

test('all four current Marcus packages initialise demo checkout with resolvable receipt identifiers', () => withServer(async (request) => {
  const names = ['STRIPE_SECRET_KEY', 'VITE_SUPABASE_URL', 'SUPABASE_URL'];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  for (const name of names) delete process.env[name];
  try {
    for (const tierId of ['local_merchant', 'pathway_contender', 'national_challenger', 'world_class']) {
      const response = await request('/api/checkout/create-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteId: '11111111-1111-1111-1111-111111111111', tierId }),
      });
      assert.equal(response.status, 200, tierId);
      const body = await response.json();
      assert.match(body.checkoutUrl, /session_id=cs_demo_/);
      const canonicalId = tierId === 'pathway_contender' ? 'pathway_flight' : tierId;
      const receiptId = new URL(body.checkoutUrl, 'https://fixture.invalid').searchParams.get('tierId');
      assert.equal(receiptId, canonicalId);
      const catalogue = JSON.parse(readFileSync(new URL('../src/data/mockDeliverables.json', import.meta.url)));
      const receiptPackage = catalogue.packages.find((entry) => entry.tier_id === receiptId);
      assert.ok(receiptPackage);
      if (tierId === 'pathway_contender') assert.equal(receiptPackage.price_aud, 3500);
    }
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
}));

test('Stripe webhook receives its exact raw bytes through the deployed handler', () => withServer(async (request) => {
  const previous = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = 'test-only-webhook-signing-fixture';
  try {
    const payload = JSON.stringify({ id: 'evt_fixture', type: 'fixture.test', data: { object: {} } });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
    const response = await request('/api/v1/webhooks/stripe', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': signature }, body: payload,
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { received: true });
  } finally {
    if (previous === undefined) delete process.env.STRIPE_WEBHOOK_SECRET; else process.env.STRIPE_WEBHOOK_SECRET = previous;
  }
}));
