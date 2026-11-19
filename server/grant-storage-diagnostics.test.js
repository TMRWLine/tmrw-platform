import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import app from './index.js';
import { grantStorageKeyKind, issuePaidWhitelistingGrant } from './whitelisting.js';

const jwt = role => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role, private_claim: 'private-token' })).toString('base64url')}.private-signature`;
const secret = 'sb_secret_private-diagnostics-test-key';
const vars = ['SUPABASE_URL', 'VITE_SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_PUBLISHABLE_KEY', 'STRIPE_SECRET_KEY', 'APP_BASE_URL'];

test('grant storage key kinds are role hints, without returning JWT claims or keys', () => {
  for (const [key, kind] of [[secret, 'sb_secret'], ['sb_publishable_private', 'sb_publishable'],
    [jwt('service_role'), 'jwt-service_role'], [jwt('anon'), 'jwt-anon'], [jwt('authenticated'), 'other'],
    ['bad.payload.signature', 'other'], ['', 'other'], [null, 'other']]) {
    assert.equal(grantStorageKeyKind(key), kind);
  }
});

async function fixture(env, run) {
  const previous = Object.fromEntries(vars.map(name => [name, process.env[name]]));
  for (const name of vars) delete process.env[name];
  Object.assign(process.env, { SUPABASE_URL: 'https://db.fixture.invalid', SUPABASE_SECRET_KEY: secret,
    STRIPE_SECRET_KEY: 'sk_test_private', APP_BASE_URL: 'https://app.fixture.invalid' }, env);
  const nativeFetch = globalThis.fetch;
  const nativeError = console.error;
  const logs = [];
  console.error = (...args) => logs.push(args);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    await run({ logs, request: (path, options) => nativeFetch(`http://127.0.0.1:${server.address().port}${path}`, options) });
  } finally {
    globalThis.fetch = nativeFetch;
    console.error = nativeError;
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}

const failures = [
  { name: 'missing URLs', env: { SUPABASE_URL: '', VITE_SUPABASE_URL: '' }, errorClass: 'ConfigurationError' },
  { name: 'public variable only', env: { SUPABASE_SECRET_KEY: '', SUPABASE_SERVICE_ROLE_KEY: '', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_private' }, errorClass: 'ConfigurationError' },
  { name: 'publishable in secret variable', env: { SUPABASE_SECRET_KEY: 'sb_publishable_private' }, status: 401, code: '42501', warning: true },
  { name: 'anon JWT in secret variable', env: { SUPABASE_SECRET_KEY: jwt('anon') }, status: 401, code: '42501', warning: true },
  { name: 'wrong URL overrides valid VITE URL', env: { SUPABASE_URL: 'https://wrong.fixture.invalid', VITE_SUPABASE_URL: 'https://db.fixture.invalid' }, status: 404 },
  { name: 'invalid key', env: { SUPABASE_SECRET_KEY: 'sb_secret_invalid-private' }, status: 401 },
  { name: 'missing table', status: 404, code: 'PGRST205' },
  { name: 'missing column', status: 400, code: '42703' },
  { name: 'malicious code and message', status: 500, untrustedCode: secret },
  { name: 'non-JSON gateway error', status: 502, text: true },
  { name: 'invalid JSON on success', status: 200, text: true, errorClass: 'SyntaxError' },
  { name: 'timeout', error: () => new DOMException(secret, 'TimeoutError'), errorClass: 'TimeoutError' },
  { name: 'aborted', error: () => new DOMException(secret, 'AbortError'), errorClass: 'AbortError' },
  { name: 'network failure', error: () => new TypeError(secret), errorClass: 'TypeError' },
];

for (const scenario of [{ name: 'healthy' }, { name: 'VITE-only fallback', env: { SUPABASE_URL: '' } },
  { name: 'legacy fallback', env: { SUPABASE_SECRET_KEY: '', SUPABASE_SERVICE_ROLE_KEY: jwt('service_role') } }, ...failures]) {
  test(`grant diagnostic: ${scenario.name}`, () => fixture(scenario.env || {}, async ({ logs, request }) => {
    if (scenario.name === 'VITE-only fallback') process.env.VITE_SUPABASE_URL = 'https://db.fixture.invalid';
    const healthy = !failures.includes(scenario);
    const calls = [];
    globalThis.fetch = async (input, options) => {
      calls.push({ input, options });
      assert.equal(options.method, 'GET');
      assert.equal(new URL(input).searchParams.get('limit'), '0');
      if (scenario.error) throw scenario.error();
      if (scenario.text) return new Response(secret + ' private-row-data TMRW-META-private', { status: scenario.status });
      return Response.json(healthy ? [] : { code: scenario.untrustedCode || scenario.code,
        message: secret + ' private-row-data TMRW-META-private', details: jwt('service_role'), hint: 'private-token' }, { status: scenario.status || 200 });
    };
    const response = await request('/api/health/grant-storage');
    const data = await response.json();
    assert.equal(response.status, healthy ? 200 : 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(Object.keys(data).sort(), ['ok', 'hostname', 'variables', 'keyKind', 'keyWarning', 'httpStatus', 'postgrestCode'].sort());
    assert.equal(data.ok, healthy);
    assert.equal(data.httpStatus, scenario.status || (healthy ? 200 : null));
    assert.equal(data.postgrestCode, scenario.code || null);
    assert.equal(Boolean(data.keyWarning), Boolean(scenario.warning));
    assert.ok(Object.values(data.variables).every(value => typeof value === 'boolean'));
    if (!healthy) {
      assert.equal(logs.length, 1);
      const details = logs[0][1];
      assert.equal(details.operation, 'preflight');
      assert.equal(details.table, 'whitelisting_grants');
      assert.equal(details.errorClass, scenario.errorClass || 'StorageError');
      const checkout = await request('/api/checkout/create-session', { method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: process.env.APP_BASE_URL },
        body: JSON.stringify({ athleteId: 'chloe-vance', tierId: 'local_merchant', postcode: '4171' }) });
      assert.equal(checkout.status, 503);
      assert.deepEqual(await checkout.json(), { error: 'Sponsorship checkout is temporarily unavailable.' });
    } else {
      assert.equal(logs.length, 0);
      assert.equal(calls.length, 1);
      assert.equal(new URL(calls[0].input).hostname, 'db.fixture.invalid');
    }
    const output = JSON.stringify({ data, logs });
    for (const value of [secret, process.env.SUPABASE_SECRET_KEY, process.env.SUPABASE_SERVICE_ROLE_KEY,
      'private-row-data', 'TMRW-META-private', 'private-token', 'private-signature']) {
      if (value) assert.ok(!output.includes(value), 'diagnostics must not include credentials or response payloads');
    }
  }));
}

test('grant write errors log only sanitised storage detail and keep the public response generic', () => fixture({}, async ({ logs }) => {
  const proof = 'a'.repeat(64);
  globalThis.fetch = async (input, options) => {
    if (String(input).startsWith('https://api.stripe.com/')) return Response.json({
      id: 'cs_test_fixture', mode: 'payment', currency: 'aud', amount_total: 100, status: 'complete', payment_status: 'paid',
      metadata: { grantAccessHash: createHash('sha256').update(proof).digest('hex'), orderType: 'sponsorship_tier',
        athleteId: 'chloe-vance', athleteName: 'Private Name', tierId: 'local_merchant', postcode: '4171' },
    });
    if (options.method === 'POST') return Response.json({ code: '42501', message: secret + proof, details: options.body }, { status: 403 });
    return Response.json([]);
  };
  let status, body;
  const res = { set() {}, status(value) { status = value; return this; }, json(value) { body = value; } };
  await issuePaidWhitelistingGrant({ body: { sessionId: 'cs_test_fixture' }, get: () => `tmrw_grant_cs_test_fixture=${proof}` }, res);
  assert.equal(status, 502);
  assert.deepEqual(body, { error: 'The activation grant is temporarily unavailable. Try again without paying again.' });
  assert.equal(logs.length, 1);
  assert.equal(logs[0][1].operation, 'write');
  assert.equal(logs[0][1].httpStatus, 403);
  assert.equal(logs[0][1].postgrestCode, '42501');
  for (const value of [secret, proof, 'Private Name', 'TMRW-TT-', 'TMRW-META-']) assert.ok(!JSON.stringify(logs).includes(value));
}));

test('diagnostics expose only hostname, not URL credentials, path or query', () => fixture({
  SUPABASE_URL: `https://private-user:${secret}@db.fixture.invalid/private-token?token=${secret}`,
}, async ({ request }) => {
  globalThis.fetch = async () => Response.json([]);
  const data = await (await request('/api/health/grant-storage')).json();
  assert.equal(data.hostname, 'db.fixture.invalid');
  for (const value of [secret, 'private-user', 'private-token']) assert.ok(!JSON.stringify(data).includes(value));
}));
