import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import app from './index.js';
import { supabaseHeaders, supabasePublicKey, supabaseSecretKey } from './supabase-keys.js';

const publishable = 'sb_publishable_fixture';
const secret = 'sb_secret_fixture';
const dbOrigin = 'https://db.fixture.invalid';
const athleteId = 'ea99acbc-c057-49e8-992e-98ec82e994a0';
const sessionId = 'cs_test_newkeys1';
const legacyNames = ['SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
const env = {
  VITE_SUPABASE_URL: dbOrigin,
  SUPABASE_URL: dbOrigin,
  VITE_SUPABASE_PUBLISHABLE_KEY: publishable,
  SUPABASE_SECRET_KEY: secret,
  STRIPE_SECRET_KEY: 'fixture-stripe-key',
  APP_BASE_URL: 'https://tmrw.fixture.invalid',
};

async function withNewKeysOnly(handle, run) {
  const names = [...legacyNames, 'SUPABASE_PUBLISHABLE_KEY', ...Object.keys(env)];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  for (const name of [...legacyNames, 'SUPABASE_PUBLISHABLE_KEY']) delete process.env[name];
  Object.assign(process.env, env);
  const originalFetch = globalThis.fetch;
  const supabaseCalls = [];
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(input);
    if (url.origin === dbOrigin) {
      const headers = new Headers(options.headers);
      assert.ok(!headers.has('authorization'), `${url.pathname} must not send an API key as a Bearer token`);
      supabaseCalls.push({ url, method: options.method || 'GET', apikey: headers.get('apikey') });
    }
    return handle(url, options);
  };
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const call = (path, init) => originalFetch(`http://127.0.0.1:${server.address().port}${path}`, init);
  try {
    await run({ call, supabaseCalls });
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

test('key helpers prefer publishable/secret keys and only send legacy JWTs as Bearer tokens', () => {
  const names = ['SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY', ...legacyNames];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  try {
    Object.assign(process.env, { SUPABASE_ANON_KEY: 'legacy.anon.jwt', SUPABASE_SERVICE_ROLE_KEY: 'legacy.service.jwt' });
    delete process.env.SUPABASE_PUBLISHABLE_KEY;
    delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
    assert.equal(supabasePublicKey(), 'legacy.anon.jwt');
    assert.equal(supabaseSecretKey(), 'legacy.service.jwt');
    assert.deepEqual(supabaseHeaders('legacy.service.jwt'), { apikey: 'legacy.service.jwt', Authorization: 'Bearer legacy.service.jwt' });
    Object.assign(process.env, { VITE_SUPABASE_PUBLISHABLE_KEY: publishable, SUPABASE_SECRET_KEY: secret });
    assert.equal(supabasePublicKey(), publishable);
    assert.equal(supabaseSecretKey(), secret);
    assert.deepEqual(supabaseHeaders(publishable), { apikey: publishable });
    assert.deepEqual(supabaseHeaders(secret), { apikey: secret });
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});

test('athlete reads use only the publishable key', () => withNewKeysOnly(
  (url) => {
    assert.equal(url.pathname, '/rest/v1/athletes');
    return Response.json([{ id: athleteId, name: 'Fixture Athlete', postcode: '2000' }]);
  },
  async ({ call, supabaseCalls }) => {
    const response = await call(`/api/match-sponsors?athleteId=${athleteId}`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).athlete.name, 'Fixture Athlete');
    assert.deepEqual(supabaseCalls.map(({ url, apikey }) => [url.pathname, apikey]), [['/rest/v1/athletes', publishable]]);
  },
));

test('checkout preflight and grant writes use only the secret key', () => {
  const grants = [];
  let stripeSession;
  return withNewKeysOnly(
    async (url, options) => {
      if (url.href === 'https://api.stripe.com/v1/checkout/sessions') {
        const metadata = Object.fromEntries([...new URLSearchParams(options.body)].flatMap(([key, value]) => {
          const name = /^metadata\[(.+)\]$/.exec(key)?.[1];
          return name ? [[name, value]] : [];
        }));
        stripeSession = { id: sessionId, mode: 'payment', status: 'complete', payment_status: 'paid', currency: 'aud', amount_total: 350000, metadata };
        return Response.json({ id: sessionId, url: 'https://checkout.stripe.invalid/fixture' });
      }
      if (url.href === `https://api.stripe.com/v1/checkout/sessions/${sessionId}`) return Response.json(stripeSession);
      if (url.origin === dbOrigin && url.pathname === '/rest/v1/athletes') return Response.json([]);
      assert.equal(url.origin + url.pathname, `${dbOrigin}/rest/v1/whitelisting_grants`);
      if (options.method === 'POST') {
        grants.push({ id: 'grant-fixture', ...JSON.parse(options.body) });
        return new Response(null, { status: 201 });
      }
      return Response.json(url.searchParams.get('limit') === '0' ? [] : grants);
    },
    async ({ call, supabaseCalls }) => {
      const post = (path, body, cookie) => call(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(cookie && { Cookie: cookie }) },
        body: JSON.stringify(body),
      });
      const checkout = await post('/api/checkout/create-session', {
        athleteId, tierId: 'pathway_contender', postcode: '0220',
        athlete: { full_name: 'Chloe Vance', image_url: '/fixture.png' },
      });
      assert.equal(checkout.status, 200);
      const preflight = supabaseCalls.find(({ url }) => url.pathname === '/rest/v1/whitelisting_grants');
      assert.equal(preflight.url.searchParams.get('limit'), '0');
      assert.equal(preflight.apikey, secret);

      const cookie = checkout.headers.get('Set-Cookie').split(';')[0];
      const grant = await post('/api/checkout/whitelisting-grant', { sessionId }, cookie);
      assert.equal(grant.status, 200);
      assert.equal((await grant.json()).grant.postcode, '0220');
      assert.equal(grants.length, 1);
      const grantCalls = supabaseCalls.filter(({ url }) => url.pathname === '/rest/v1/whitelisting_grants');
      assert.ok(grantCalls.some(({ method }) => method === 'POST'));
      assert.ok(grantCalls.every(({ apikey }) => apikey === secret));
      assert.ok(supabaseCalls.filter(({ url }) => url.pathname === '/rest/v1/athletes').every(({ apikey }) => apikey === publishable));
    },
  );
});
