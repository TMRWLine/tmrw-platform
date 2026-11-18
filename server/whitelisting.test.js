import { after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { addConnectMetadata } from './connect.js';
import { sponsorshipLedger } from '../src/lib/commercialLedger.js';

process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_entitlement_test';
process.env.SUPABASE_URL = 'https://auth.example';
process.env.SUPABASE_ANON_KEY = 'public-test-key';
const { default: app } = await import('../api/index.js');
const server = app.listen(0);
await new Promise((resolve) => server.once('listening', resolve));
after(() => new Promise((resolve) => server.close(resolve)));
const base = `http://127.0.0.1:${server.address().port}`;
const nativeFetch = globalThis.fetch;
const buyer = '11111111-1111-4111-8111-111111111111';
let rows;
let inserts;
let transfers;

beforeEach((t) => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-test-only';
  rows = new Map();
  inserts = 0;
  transfers = 0;
  t.mock.method(globalThis, 'fetch', async (input, options = {}) => {
    const url = new URL(input);
    assert.ok(options.signal instanceof AbortSignal);
    if (url.pathname === '/auth/v1/user') {
      const token = new Headers(options.headers).get('Authorization');
      if (token === 'Bearer invalid') return Response.json({ message: 'Invalid user' }, { status: 401 });
      return Response.json({
        id: token === 'Bearer buyer' ? buyer : '22222222-2222-4222-8222-222222222222',
        app_metadata: { role: token === 'Bearer admin' ? 'admin' : 'user' },
      });
    }
    if (url.hostname === 'api.stripe.com') {
      if (url.pathname.endsWith('/transfers')) { transfers++; return Response.json({ id: 'tr_mock' }); }
      return Response.json({ id: 'pi_mock', latest_charge: 'ch_mock', metadata: {} });
    }
    assert.equal(url.pathname, '/rest/v1/paid_whitelisting_entitlements');
    assert.equal(new Headers(options.headers).get('apikey'), 'server-test-only');
    if (options.method === 'POST') {
      assert.equal(url.searchParams.get('on_conflict'), 'checkout_session_id');
      assert.match(options.headers.Prefer, /resolution=ignore-duplicates/);
      const row = JSON.parse(options.body);
      assert.equal(row.status, 'pending_fulfilment');
      assert.equal(Object.keys(row).some((key) => /token/i.test(key)), false);
      if (rows.has(row.checkout_session_id)) return Response.json([]);
      inserts++;
      const stored = { ...row, id: '33333333-3333-4333-8333-333333333333', created_at: '2026-10-18T00:00:00Z' };
      rows.set(row.checkout_session_id, stored);
      return Response.json([stored]);
    }
    const row = rows.get(url.searchParams.get('checkout_session_id')?.slice(3));
    return Response.json(row ? [row] : []);
  });
});

function fixture(accountId) {
  const ledger = sponsorshipLedger(75000);
  const body = new URLSearchParams();
  addConnectMetadata(body, ledger, { athlete: { accountId }, club: {}, platform: {}, partner: {} }, 'tmrw_test');
  const metadata = Object.fromEntries([...body].filter(([key]) => key.startsWith('metadata['))
    .map(([key, value]) => [key.slice(9, -1), value]));
  return {
    id: 'cs_test_entitlement', status: 'complete', payment_status: 'paid', currency: 'aud',
    amount_total: ledger.totalPayableCents, payment_intent: 'pi_mock',
    metadata: { ...metadata, orderType: 'sponsorship_tier', whitelisting: 'true', buyerId: buyer, athleteId: 'athlete', tierId: 'local_merchant' },
  };
}

async function webhook(session, signature = true) {
  const payload = JSON.stringify({ type: 'checkout.session.completed', data: { object: session } });
  const sig = new Stripe('sk_test_mock').webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
  return nativeFetch(base + '/api/v1/webhooks/stripe', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': signature ? sig : 'invalid' }, body: payload,
  });
}
const get = (token, id = 'cs_test_entitlement') => nativeFetch(base + '/api/whitelisting/grants?session_id=' + id, {
  headers: token ? { Authorization: `Bearer ${token}` } : {},
});

test('signed paid webhook records one pending entitlement across duplicate delivery', async () => {
  const session = fixture();
  const first = await webhook(session);
  assert.equal(first.status, 200);
  const result = await first.json();
  assert.equal(result.entitlement.status, 'pending_fulfilment');
  assert.match(result.entitlement.licenceReference, /^[a-f0-9-]{36}$/);
  assert.equal((await webhook(session)).status, 200);
  assert.equal(inserts, 1);
  assert.equal(rows.size, 1);
  assert.equal((await (await get('buyer')).json()).status, 'pending_fulfilment');
  rows.get(session.id).status = 'revoked';
  assert.equal((await (await webhook(session)).json()).entitlement.status, 'revoked');
});

test('public grant GET exposes only capability-safe fields; only the verified buyer sees the reference', async () => {
  await webhook(fixture());
  const anonymous = await get();
  assert.equal(anonymous.status, 200);
  assert.equal(anonymous.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await anonymous.json(), {
    status: 'pending_fulfilment', licenceReference: null, checkoutSessionId: 'cs_test_entitlement',
    athleteId: 'athlete', tierId: 'local_merchant', createdAt: '2026-10-18T00:00:00Z',
  });
  assert.equal((await get('invalid')).status, 401);
  const other = await get('other');
  assert.equal(other.status, 200);
  assert.equal((await other.json()).licenceReference, null);
  assert.equal((await (await get('admin')).json()).licenceReference, null);
  assert.match((await (await get('buyer')).json()).licenceReference, /^33333333/);
  assert.equal((await get('buyer', '../bad')).status, 400);
  assert.equal((await get(undefined, 'cs_demo')).status, 400);
  assert.equal((await get(undefined, 'cs_test_bad_extra')).status, 400);
  assert.equal((await (await get('buyer', 'cs_test_missing')).json()).status, 'not_found');
});



test('no entitlement for invalid signature, unpaid, incomplete or unmarked sessions', async () => {
  assert.equal((await webhook(fixture(), false)).status, 400);
  const unpaid = fixture(); unpaid.payment_status = 'unpaid';
  await webhook(unpaid);
  const incomplete = fixture(); incomplete.status = 'open';
  await webhook(incomplete);
  const unmarked = fixture(); delete unmarked.metadata.whitelisting;
  await webhook(unmarked);
  assert.equal(inserts, 0);
});

test('missing service role reports not-configured without preventing transfers', async () => {
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const response = await webhook(fixture('acct_athlete'));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.entitlement.status, 'not_configured');
  assert.equal(result.mode, 'stripe_live');
  assert.equal(transfers, 1);
  const read = await get('buyer');
  assert.equal(read.status, 503);
  assert.equal((await read.json()).status, 'not_configured');
});

test('checkout uses verified buyer metadata and never a buyer id supplied in the body', async () => {
  globalThis.fetch = async (input, options) => {
    if (String(input).includes('/auth/v1/user')) return Response.json({ id: buyer });
    const values = Object.fromEntries(options.body);
    assert.equal(values['metadata[buyerId]'], buyer);
    assert.equal(values['metadata[whitelisting]'], 'true');
    assert.equal(values['metadata[athleteId]'], 'athlete');
    return Response.json({ id: 'cs_test_created', url: 'https://checkout.stripe.com/test' });
  };
  process.env.STRIPE_ATHLETE_ACCOUNT_ID = 'acct_athlete';
  try {
    const create = (token) => nativeFetch(base + '/api/checkout/create-session', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer buyer' } : {}) },
      body: JSON.stringify({ athleteId: 'athlete', tierId: 'local_merchant', whitelisting: true, buyerId: 'attacker' }),
    });
    assert.equal((await create(false)).status, 401);
    assert.equal((await create(true)).status, 200);
  } finally { delete process.env.STRIPE_ATHLETE_ACCOUNT_ID; }
});

test('storage failures are sanitised and webhook failures are retriable', async () => {
  globalThis.fetch = async () => new Response('private database details', { status: 500 });
  const read = await get();
  assert.equal(read.status, 502);
  assert.doesNotMatch(await read.text(), /private database/);
  const write = await webhook(fixture());
  assert.equal(write.status, 500);
  assert.doesNotMatch(await write.text(), /private database/);
  assert.equal(inserts, 0);
});

test('public entitlement lookups are rate limited', async () => {
  let limited = false;
  for (let i = 0; i < 65; i++) {
    const response = await get();
    if (response.status === 429) {
      limited = true;
      assert.ok(Number(response.headers.get('Retry-After')) > 0);
    }
  }
  assert.equal(limited, true);
});

test('one trusted proxy separates anonymous client limits and authenticated limits use user identity', async () => {
  const trustProxy = app.get('trust proxy');
  assert.equal(trustProxy, false);
  app.set('trust proxy', 1);
  try {
  const read = (ip, token) => nativeFetch(base + '/api/whitelisting/grants?session_id=cs_test_missing', {
    headers: { 'X-Forwarded-For': ip, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  for (let i = 0; i < 60; i++) assert.equal((await read('192.0.2.10')).status, 200);
  assert.equal((await read('192.0.2.10')).status, 429);
  assert.equal((await read('192.0.2.11')).status, 200);
  for (let i = 0; i < 65; i++) await read('192.0.2.12', 'buyer');
  assert.equal((await read('192.0.2.13', 'buyer')).status, 429);
  assert.equal((await read('192.0.2.14', 'other')).status, 200);
  } finally { app.set('trust proxy', trustProxy); }
});

test('invalid bearer tokens are IP-throttled before Supabase verification', async (t) => {
  const trustProxy = app.get('trust proxy');
  app.set('trust proxy', 1);
  let verifications = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    verifications++;
    return Response.json({ message: 'Invalid user' }, { status: 401 });
  });
  const read = () => nativeFetch(base + '/api/whitelisting/grants?session_id=cs_test_missing', {
    headers: { 'X-Forwarded-For': '192.0.2.20', Authorization: 'Bearer invalid' },
  });
  try {
    for (let i = 0; i < 60; i++) assert.equal((await read()).status, 401);
    const response = await read();
    assert.equal(response.status, 429);
    assert.ok(Number(response.headers.get('Retry-After')) > 0);
    assert.equal(verifications, 60);
  } finally { app.set('trust proxy', trustProxy); }
});
