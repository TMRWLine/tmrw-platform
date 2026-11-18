import { after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { sponsorshipLedger } from '../src/lib/commercialLedger.js';
import { addConnectMetadata } from './connect.js';

process.env.STRIPE_SECRET_KEY = '';
const { default: app } = await import('../api/index.js');
const server = app.listen(0);
await new Promise((resolve) => server.once('listening', resolve));
after(() => new Promise((resolve) => server.close(resolve)));
const base = `http://127.0.0.1:${server.address().port}/api/checkout/verify`;
const nativeFetch = globalThis.fetch;
beforeEach(() => { process.env.STRIPE_SECRET_KEY = ''; });
const sessionId = 'cs_test_abc123';
const get = (query = `session_id=${sessionId}`) => nativeFetch(`${base}?${query}`);
const payees = { athlete: { gstRegistered: true }, club: { gstRegistered: false }, platform: { gstRegistered: true } };
const ledger = sponsorshipLedger(10001, payees);

function fixture(overrides = {}) {
  const form = new URLSearchParams();
  addConnectMetadata(form, ledger, payees, 'tmrw_local');
  const metadata = { orderType: 'sponsorship_tier', athleteId: 'athlete-from-stripe', tierId: 'local_merchant' };
  for (const [key, value] of form) if (key.startsWith('metadata[')) metadata[key.slice(9, -1)] = value;
  return {
    id: sessionId, status: 'complete', payment_status: 'paid', amount_total: ledger.totalPayableCents, currency: 'aud',
    metadata, payment_intent: { metadata: { athleteTransferId: 'tr_recorded' } },
    customer_details: { email: 'private@example.test' }, ...overrides,
  };
}

test('invalid checkout identifiers return 400 before Stripe or demo handling', async (t) => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected upstream call'); });
  for (const query of ['', 'session_id=cs_demo_123', 'session_id=cs_test_a/b', 'session_id=cs_live_', 'session_id=cs_test_a_b',
    'session_id=cs_test_a&session_id=cs_test_b', `session_id=cs_test_${'a'.repeat(241)}`]) {
    const response = await get(query);
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.verified, false);
    assert.equal(body.status, 'error');
    assert.equal(body.athleteId, null);
  }
});

test('missing Stripe configuration returns explicit unverified demo state', async (t) => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected upstream call'); });
  const response = await get();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), {
    verified: false, status: 'demo', amountTotalCents: null, currency: null, ledger: null,
    athleteId: null, tierId: null, transferStatus: null,
    message: 'Stripe is not configured · no payment has been verified',
  });
});

test('paid verification uses only retrieved Stripe state, tax metadata and recorded transfer state', async (t) => {
  process.env.STRIPE_SECRET_KEY = 'local-test-only';
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(String(url), `https://api.stripe.com/v1/checkout/sessions/${sessionId}?expand[]=payment_intent`);
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.headers.Authorization, 'Bearer local-test-only');
    return Response.json(fixture());
  });
  const response = await get(`session_id=${sessionId}&athleteId=spoof&tierId=spoof&amount_total=1`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.verified, true);
  assert.equal(body.status, 'paid');
  assert.equal(body.amountTotalCents, ledger.totalPayableCents);
  assert.equal(body.currency, 'aud');
  assert.deepEqual(body.ledger, ledger);
  assert.equal(body.athleteId, 'athlete-from-stripe');
  assert.equal(body.tierId, 'local_merchant');
  assert.equal(body.transferStatus, 'transfers_recorded');
  assert.doesNotMatch(JSON.stringify(body), /private@|local-test-only|acct_|tr_recorded|customer_details/);
});

test('unpaid, pending, expired and webhook-pending states are distinguished', async (t) => {
  process.env.STRIPE_SECRET_KEY = 'local-test-only';
  let state = {};
  t.mock.method(globalThis, 'fetch', async () => Response.json(fixture(state)));
  for (const [status, payment_status, expected] of [
    ['open', 'unpaid', 'unpaid'], ['complete', 'unpaid', 'pending'],
    ['open', 'paid', 'pending'], ['expired', 'unpaid', 'expired'],
  ]) {
    state = { status, payment_status };
    const body = await (await get()).json();
    assert.equal(body.status, expected);
    assert.equal(body.verified, false);
    assert.equal(body.transferStatus, 'not_paid');
  }
  state = { payment_intent: { metadata: {} } };
  assert.equal((await (await get()).json()).transferStatus, 'awaiting_webhook');
  state = { metadata: {} };
  const legacy = await (await get()).json();
  assert.equal(legacy.verified, true);
  assert.equal(legacy.ledger, null);
  assert.equal(legacy.athleteId, null);
});

test('bad amounts, Stripe failures and real signal timeout produce sanitised unverified errors', async (t) => {
  process.env.STRIPE_SECRET_KEY = 'local-test-only';
  let state = fixture({ amount_total: 1 });
  const mock = t.mock.method(globalThis, 'fetch', async () => Response.json(state));
  for (const invalid of [fixture({ amount_total: 1 }), fixture({ currency: 'usd' }), fixture({ id: 'cs_test_wrong' }),
    fixture({ amount_total: 1.5 }), fixture({ metadata: { orderType: 'sponsorship_tier' } })]) {
    state = invalid;
    const response = await get();
    assert.equal(response.status, 502);
    assert.equal((await response.json()).verified, false);
  }
  mock.mock.mockImplementation(async () => new Response('private Stripe detail', { status: 401 }));
  assert.doesNotMatch(await (await get()).text(), /private Stripe detail/);
  const timeout = AbortSignal.timeout.bind(AbortSignal);
  t.mock.method(AbortSignal, 'timeout', (ms) => {
    assert.equal(ms, 10000);
    return timeout(5);
  });
  mock.mock.mockImplementation(async (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.throwIfAborted();
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  }));
  const response = await get();
  assert.equal(response.status, 502);
  assert.equal((await response.json()).status, 'error');
});
