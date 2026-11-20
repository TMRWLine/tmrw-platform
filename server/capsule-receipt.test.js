import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import app from './index.js';

async function fixture(run, overrides = {}) {
  const oldKey = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = overrides.key ?? 'sk_test_fixture';
  const originalFetch = globalThis.fetch;
  const calls = [];
  const session = {
    id: 'cs_test_x', livemode: false, payment_status: 'paid', currency: 'aud', amount_total: 19800,
    total_details: { amount_shipping: 0, amount_tax: 0 },
    metadata: { orderType: 'merch_capsule', athleteCutCents: '7425', clubCutCents: '2025', partnerCutCents: '2025', privateField: 'private' },
    customer_email: 'private@example.invalid', payment_intent: 'private', ...overrides.session,
  };
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    assert.equal(options.headers.Authorization, 'Bearer sk_test_fixture');
    if (overrides.throw) throw new Error('provider failed');
    if (overrides.status) return Response.json({ error: { message: 'private provider error' } }, { status: overrides.status });
    if (String(url).endsWith('/cs_test_x')) return Response.json(session);
    assert.equal(String(url), 'https://api.stripe.com/v1/checkout/sessions/cs_test_x/line_items?limit=100');
    return Response.json({ has_more: false, data: [
      { description: 'tmrw/. Hoodie (L)', quantity: 1, amount_total: 18000, privateField: 'private' },
      { description: 'GST (10%)', quantity: 1, amount_total: 1800 },
    ], ...overrides.items });
  };
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const get = (id = 'cs_test_x') => originalFetch(`http://127.0.0.1:${server.address().port}/api/checkout/capsule-session?session_id=${encodeURIComponent(id)}`);
  try { await run({ get, calls }); }
  finally {
    globalThis.fetch = originalFetch;
    if (oldKey === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = oldKey;
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}

test('capsule receipt verifies Stripe and returns only safe amounts, status and split fields', () => fixture(async ({ get, calls }) => {
  const response = await get();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), {
    paymentStatus: 'paid', currency: 'aud',
    lineItems: [{ description: 'tmrw/. Hoodie (L)', quantity: 1, amountCents: 18000 }],
    subtotalCents: 18000, gstCents: 1800, shippingCents: 0, totalCents: 19800,
    splits: { athleteCents: 7425, clubCents: 2025, partnerCents: 2025 },
  });
  assert.equal(calls.length, 2);
}));

for (const status of ['unpaid', 'no_payment_required', 'unexpected']) {
  test(`capsule receipt reports ${status} honestly`, () => fixture(async ({ get }) => {
    assert.equal((await (await get()).json()).paymentStatus, status === 'unexpected' ? 'unknown' : status);
  }, { session: { payment_status: status } }));
}

test('invalid or live session ids never reach Stripe', () => fixture(async ({ get, calls }) => {
  for (const id of ['', 'cs_live_x', '../secret', 'cs_demo_capsule_x']) assert.equal((await get(id)).status, 400);
  assert.equal(calls.length, 0);
}));

for (const session of [{ metadata: { orderType: 'sponsorship_tier' } }, { livemode: true }, { id: 'cs_test_other' }]) {
  test(`wrong capsule session is rejected: ${JSON.stringify(session)}`, () => fixture(async ({ get, calls }) => {
    assert.equal((await get()).status, 404);
    assert.equal(calls.length, 1);
  }, { session }));
}

for (const options of [{ status: 404 }, { status: 401 }, { throw: true }, { items: { has_more: true } }]) {
  test(`capsule receipt handles provider failures: ${JSON.stringify(options)}`, () => fixture(async ({ get }) => {
    const response = await get();
    assert.equal(response.status, options.status === 404 ? 404 : 502);
    assert.ok((await response.json()).error);
  }, options));
}

test('live keys cannot verify capsule payments', () => fixture(async ({ get, calls }) => {
  assert.equal((await get()).status, 503);
  assert.equal(calls.length, 0);
}, { key: 'sk_live_fixture' }));

test('missing Stripe configuration is reported without a provider request', () => fixture(async ({ get, calls }) => {
  delete process.env.STRIPE_SECRET_KEY;
  assert.equal((await get()).status, 503);
  assert.equal(calls.length, 0);
}));

test('an empty unpaid session does not imply a paid order', () => fixture(async ({ get }) => {
  const response = await get();
  assert.equal(response.status, 200);
  const receipt = await response.json();
  assert.equal(receipt.paymentStatus, 'unpaid');
  assert.deepEqual(receipt.lineItems, []);
  assert.equal(receipt.totalCents, 0);
}, { session: { payment_status: 'unpaid', amount_total: 0 }, items: { data: [] } }));
