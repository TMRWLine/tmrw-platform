import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';

process.env.STRIPE_SECRET_KEY = '';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_local_test';
process.env.VITE_SUPABASE_URL = '';
const { default: app } = await import('../api/index.js');
const server = app.listen(0);
await new Promise((resolve) => server.once('listening', resolve));
after(() => new Promise((resolve) => server.close(resolve)));
const base = `http://127.0.0.1:${server.address().port}`;
const nativeFetch = globalThis.fetch;
const item = { id: 'drop_sb_2095', qty: 2, priceAud: 100, baseCostAud: 20, collabRoyaltyPct: 0 };
const post = (body) => nativeFetch(`${base}/api/checkout/create-session`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

test('health and unknown API routes preserve JSON responses', async () => {
  assert.deepEqual(await (await nativeFetch(`${base}/health`)).json(), { ok: true, service: 'sponsor-match-proxy' });
  const response = await nativeFetch(`${base}/api/does-not-exist`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'API route not found' });
});

test('tier and capsule checkout work without credentials', async () => {
  const tier = await post({ athleteId: 'demo-athlete', tierId: 'local_merchant' });
  assert.equal(tier.status, 200);
  assert.match((await tier.json()).checkoutUrl, /^\/checkout\/success\?session_id=cs_demo_/);
  const capsule = await post({ capsuleItems: [item] });
  assert.equal(capsule.status, 200);
  const body = await capsule.json();
  assert.equal(body.checkoutUrl, null);
  assert.equal(body.mode, 'sandbox_demo');
  assert.deepEqual(body.splits, { grossAud: 190, athleteAud: 98, clubAud: 21, partnerAud: 0 });
});

test('empty, malformed, and out-of-bounds checkout inputs are rejected', async () => {
  for (const body of [null, {}, [], { capsuleItems: [] }, { capsuleItems: {} },
    { capsuleItems: Array(51).fill(item) }, { capsuleItems: [null] },
    ...[{ qty: 0 }, { qty: 1.5 }, { qty: 101 }, { id: 'unknown' }, { size: 'invalid' }].map((override) => ({ capsuleItems: [{ ...item, ...override }] })),
    { athleteId: 'demo', tierId: '__proto__' }, { athleteId: {}, tierId: 'local_merchant' }]) {
    assert.equal((await post(body)).status, 400, JSON.stringify(body));
  }
});

test('JSON body parser has bounded size and JSON errors', async () => {
  assert.equal((await post({ data: 'x'.repeat(262144) })).status, 413);
  const malformed = await nativeFetch(`${base}/api/checkout/create-session`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
  });
  assert.equal(malformed.status, 400);
  assert.deepEqual(await malformed.json(), { error: 'Invalid JSON body' });
});

test('serverless entry preserves signed raw webhook bytes', async () => {
  const payload = '{ "id": "evt_test", "type": "test.event", "data": { "object": {} } }';
  const stripe = new Stripe('sk_test_local');
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
  const send = (sig) => nativeFetch(`${base}/api/v1/webhooks/stripe`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': sig }, body: payload,
  });
  assert.deepEqual(await (await send(signature)).json(), { received: true });
  assert.equal((await send('invalid')).status, 400);
});

test('Stripe calls use abort signals and sanitize upstream errors', async () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_local';
  process.env.STRIPE_ATHLETE_ACCOUNT_ID = 'acct_local';
  try {
    globalThis.fetch = async (_url, options) => {
      assert.ok(options.signal instanceof AbortSignal);
      return new Response(JSON.stringify({ error: { message: 'sensitive upstream detail' } }), { status: 401 });
    };
    for (const body of [{ athleteId: 'demo', tierId: 'local_merchant' }, { capsuleItems: [item] }]) {
      const response = await post(body);
      assert.equal(response.status, 502);
      assert.doesNotMatch(await response.text(), /sensitive/);
    }
    globalThis.fetch = async () => { throw new Error('sensitive connection detail'); };
    const response = await post({ capsuleItems: [item] });
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: 'Unable to initialise checkout.' });
  } finally {
    globalThis.fetch = nativeFetch;
    process.env.STRIPE_SECRET_KEY = '';
    delete process.env.STRIPE_ATHLETE_ACCOUNT_ID;
  }
});

test('capsule economics are authoritative even when legacy client fields are tampered with', async () => {
  const response = await post({ capsuleItems: [{ ...item, priceAud: 1, baseCostAud: 0, collabRoyaltyPct: 30 }] });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.ledger.grossCents, 19000);
  assert.equal(result.ledger.productionCents, 5000);
  assert.equal(result.ledger.partnerCents, 0);
  assert.equal((await post({ capsuleItems: [{ ...item, id: 'not-published' }] })).status, 400);
});

test('venue packs retain catalogue per-garment prices and require full 25-garment curves', async () => {
  const size = '25x VENUE CURVE (3S·8M·9L·5XL)';
  for (const qty of [25, 50]) {
    const response = await post({ capsuleItems: [{ ...item, size, qty, priceAud: 1, baseCostAud: 0 }] });
    assert.equal(response.status, 200);
    const { ledger } = await response.json();
    assert.equal(ledger.grossCents, qty * 9500);
    assert.equal(ledger.productionCents, qty * 2500);
  }
  assert.equal((await post({ capsuleItems: [{ ...item, size, qty: 1 }] })).status, 400);
});
