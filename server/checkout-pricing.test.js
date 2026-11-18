import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import app from './index.js';

async function fixture(run) {
  const names = ['STRIPE_SECRET_KEY', 'SUPABASE_URL', 'VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'APP_BASE_URL'];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  process.env.STRIPE_SECRET_KEY = 'test-only-checkout-key';
  process.env.APP_BASE_URL = 'https://fixture.invalid';
  process.env.SUPABASE_URL = 'https://db.fixture.invalid';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-service-role';
  delete process.env.VITE_SUPABASE_URL;
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith('https://db.fixture.invalid/rest/v1/whitelisting_grants?')) return Response.json([]);
    if (String(url) !== 'https://api.stripe.com/v1/checkout/sessions') throw new Error('Unexpected external request');
    calls.push(new URLSearchParams(options.body));
    return Response.json({ id: 'cs_test_fixture', url: 'https://checkout.stripe.invalid/fixture' });
  };
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const post = (body) => originalFetch(`http://127.0.0.1:${server.address().port}/api/checkout/create-session`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  try {
    await run({ post, calls });
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

test('flight prices, currency and splits ignore every buyer-supplied economic override', () => fixture(async ({ post, calls }) => {
  for (const [tierId, cents] of [['local_merchant', 75000], ['pathway_contender', 350000], ['pathway_flight', 350000], ['national_challenger', 1250000], ['world_class', 2500000]]) {
    const response = await post({
      athleteId: '11111111-1111-1111-1111-111111111111', tierId, postcode: '0220',
      priceAud: 1, amount: 1, unit_amount: 1, currency: 'usd', qty: 999, collabRoyaltyPct: 100,
      line_items: [{ quantity: 1, price_data: { unit_amount: 1 } }],
    });
    assert.equal(response.status, 200, tierId);
    const body = calls.at(-1);
    assert.equal(body.get('line_items[0][price_data][unit_amount]'), String(cents));
    assert.equal(body.get('line_items[0][price_data][currency]'), 'aud');
    assert.equal(body.get('line_items[0][quantity]'), '1');
    assert.equal(body.get('metadata[athleteCutCents]'), String(Math.round(cents * 0.7)));
    assert.equal(body.get('metadata[clubCutCents]'), String(Math.round(cents * 0.15)));
  }
}));

test('capsule prices, costs, royalties, identity and product images come only from the server catalogue', () => fixture(async ({ post, calls }) => {
  const response = await post({ capsuleItems: [{
    id: 'drop_mt_2200', qty: 2, size: 'L', priceAud: 1, baseCostAud: -999999,
    collabRoyaltyPct: 100, title: 'forged', athleteName: 'forged', clubName: 'forged',
    collabPartner: 'forged', frontImageUrl: 'https://attacker.invalid/image.png',
  }, { id: 'drop_sb_2095', qty: 1, size: 'M', priceAud: 0.01, baseCostAud: 0, collabRoyaltyPct: 100 }] });
  assert.equal(response.status, 200);
  const body = calls[0];
  assert.equal(body.get('line_items[0][price_data][unit_amount]'), '18000');
  assert.equal(body.get('line_items[0][quantity]'), '2');
  assert.equal(body.get('line_items[1][price_data][unit_amount]'), '9500');
  assert.equal(body.get('metadata[grossCents]'), '45500');
  assert.equal(body.get('metadata[athleteCutCents]'), '19750');
  assert.equal(body.get('metadata[clubCutCents]'), '5100');
  assert.equal(body.get('metadata[partnerCutCents]'), '4050');
  assert.ok(body.get('line_items[0][price_data][product_data][name]').includes('MT-22 Heavyweight Contrast Hood'));
  assert.ok(!body.toString().includes('forged'));
  assert.ok(!body.toString().includes('attacker.invalid'));
}));

test('unknown SKUs, invalid quantities and malformed baskets fail before any provider call', () => fixture(async ({ post, calls }) => {
  for (const capsuleItems of [
    [], null, 'invalid', [{ id: '__proto__', qty: 1 }], [{ id: 'unregistered-custom-drop', qty: 1 }],
    ...[0, -1, 1.5, '1', 101].map((qty) => [{ id: 'drop_mt_2200', qty }]),
    [{ id: 'drop_mt_2200', qty: 1, size: '25x VENUE CURVE (3S·8M·9L·5XL)' }],
    [{ id: 'drop_mt_2200', qty: 1, size: 'invalid' }],
  ]) assert.equal((await post({ capsuleItems })).status, 400);
  assert.equal((await post({ athleteId: 'fixture', tierId: 'unknown', priceAud: 1 })).status, 400);
  assert.equal(calls.length, 0);
}));

test('canonical 25-garment venue packs retain catalogue unit pricing', () => fixture(async ({ post, calls }) => {
  assert.equal((await post({ capsuleItems: [{ id: 'drop_mt_2200', qty: 25, size: '25x VENUE CURVE (3S·8M·9L·5XL)', priceAud: 1 }] })).status, 200);
  assert.equal(calls[0].get('line_items[0][price_data][unit_amount]'), '18000');
  assert.equal(calls[0].get('line_items[0][quantity]'), '25');
}));
