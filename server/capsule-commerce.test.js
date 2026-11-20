import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import app from './index.js';
import { BAG_TTL_MS, VENUE_SIZE, capsuleSplit, capsuleTotals, restoreBag, serialiseBag, readCapsuleReturn } from '../src/lib/capsuleCommerce.ts';

const catalogue = [{ id: 'drop_mt_2200', priceAud: 180 }, { id: 'drop_sb_2095', priceAud: 95 }];
const saved = lines => JSON.stringify({ version: 1, expiresAt: 1000 + BAG_TTL_MS, lines });

test('bag round trips identity, quantity and size using current catalogue economics', () => {
  const lines = [{ item: { ...catalogue[0], priceAud: 1 }, qty: 2, size: 'L' }, { item: catalogue[1], qty: 25, size: VENUE_SIZE }];
  assert.deepEqual(restoreBag(serialiseBag(lines, 1000), catalogue, 1001), [
    { item: catalogue[0], qty: 2, size: 'L' }, { item: catalogue[1], qty: 25, size: VENUE_SIZE },
  ]);
  assert.ok(!serialiseBag(lines, 1000).includes('priceAud'));
});

test('empty, expired, malformed and wrong-version bag data are discarded', () => {
  for (const raw of [null, '', '{', 'null', '{}', JSON.stringify({ version: 2, expiresAt: 99999, lines: [] }), saved([])]) {
    assert.deepEqual(restoreBag(raw, catalogue, 1001), []);
  }
  assert.deepEqual(restoreBag(saved([{ id: catalogue[0].id, size: 'L', qty: 1 }]), catalogue, 1000 + BAG_TTL_MS), []);
});

test('bag drops stale SKUs and sizes, clamps units and packs, and merges duplicate lines', () => {
  assert.deepEqual(restoreBag(saved([
    { id: 'missing', size: 'L', qty: 1 }, { id: catalogue[0].id, size: 'XXL', qty: 1 },
    { id: catalogue[0].id, size: 'S', qty: -3 }, { id: catalogue[0].id, size: 'M', qty: 1000 },
    { id: catalogue[0].id, size: 'L', qty: 1.8 }, { id: catalogue[0].id, size: 'L', qty: 2 },
    { id: catalogue[1].id, size: VENUE_SIZE, qty: 49 }, { id: catalogue[1].id, size: 'M', qty: '2' },
  ]), catalogue, 1001), [
    { item: catalogue[0], size: 'S', qty: 1 }, { item: catalogue[0], size: 'M', qty: 100 },
    { item: catalogue[0], size: 'L', qty: 3 }, { item: catalogue[1], size: VENUE_SIZE, qty: 25 },
  ]);
  assert.deepEqual(restoreBag(saved([{ id: catalogue[1].id, size: VENUE_SIZE, qty: 1 }]), catalogue, 1001)[0].qty, 25);
});

test('capsule returns accept success/cancelled without assuming payment', () => {
  assert.deepEqual(readCapsuleReturn('?capsule_checkout=success&session_id=cs_test_x'), { status: 'success', sessionId: 'cs_test_x' });
  assert.deepEqual(readCapsuleReturn('?capsule_checkout=cancelled'), { status: 'cancelled', sessionId: '' });
  assert.equal(readCapsuleReturn('?capsule_checkout=paid'), null);
  assert.equal(readCapsuleReturn(''), null);
});

test('client and server share cent rounding for both garments, fan/pack and partner/no-partner', async () => {
  const source = readFileSync(new URL('../src/components/CartDrawer.tsx', import.meta.url), 'utf8');
  assert.match(source, /capsuleSplit\(drop.priceAud, drop.baseCostAud, drop.collabRoyaltyPct/);
  assert.match(source, /capsuleSplit\(Number\(newPrice\), activeChassis.baseCostAud/);
  for (const [price, cost] of [[180, 45], [95, 25]]) {
    for (const qty of [1, 25]) for (const royalty of [0, 15]) {
      const net = Math.round((price - cost) * 100);
      assert.deepEqual(capsuleSplit(price, cost, royalty, qty), {
        athleteCents: Math.round(net * (royalty ? 0.55 : 0.7)) * qty,
        clubCents: Math.round(net * 0.15) * qty,
        partnerCents: Math.round(net * royalty / 100) * qty,
      });
    }
  }
  const oldKey = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = 'sk_test_fixture';
  const originalFetch = globalThis.fetch;
  const bodies = [];
  globalThis.fetch = async (_url, options) => {
    bodies.push(new URLSearchParams(options.body));
    return Response.json({ id: 'cs_test_fixture', url: 'https://checkout.stripe.invalid/fixture' });
  };
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    for (const [id, price, cost, royalty] of [['drop_mt_2200', 180, 45, 15], ['drop_sb_2095', 95, 25, 0]]) {
      for (const qty of [1, 25]) {
        const response = await originalFetch(`http://127.0.0.1:${server.address().port}/api/checkout/create-session`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ capsuleItems: [{ id, qty, size: qty === 25 ? VENUE_SIZE : 'L' }] }),
        });
        assert.equal(response.status, 200);
        const client = capsuleSplit(price, cost, royalty, qty);
        const body = bodies.at(-1);
        assert.equal(Number(body.get('metadata[athleteCutCents]')), client.athleteCents);
        assert.equal(Number(body.get('metadata[clubCutCents]')), client.clubCents);
        assert.equal(Number(body.get('metadata[partnerCutCents]')), client.partnerCents);
        assert.equal(Number(body.get('line_items[1][price_data][unit_amount]')), capsuleTotals(price * 100 * qty).gstCents);
      }
    }
    process.env.STRIPE_SECRET_KEY = 'sk_live_fixture';
    const response = await originalFetch(`http://127.0.0.1:${server.address().port}/api/checkout/create-session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ capsuleItems: [{ id: 'drop_mt_2200', qty: 1 }] }) });
    assert.equal(response.status, 503);
    assert.equal(bodies.length, 4);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldKey === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = oldKey;
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
