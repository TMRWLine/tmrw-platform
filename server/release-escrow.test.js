import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import app from './index.js';

async function fixture(run) {
  const names = ['STRIPE_SECRET_KEY', 'SUPABASE_URL', 'VITE_SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  Object.assign(process.env, { STRIPE_SECRET_KEY: 'test-key', SUPABASE_URL: 'https://fixture.supabase.co', SUPABASE_ANON_KEY: 'test-anon', SUPABASE_SERVICE_ROLE_KEY: 'test-service' });
  const proof = 'a'.repeat(64);
  const metadata = {
    athleteId: 'athlete', tierId: 'local_merchant', orderType: 'sponsorship_tier', escrowMode: 'milestone_50_50',
    athleteEscrowHoldCents: '26250', grantAccessHash: createHash('sha256').update(proof).digest('hex'),
  };
  const charge = { id: 'ch_order', metadata, status: 'succeeded', paid: true, captured: true, amount: 75000, currency: 'aud', transfer_group: 'TG_fixture' };
  const session = { id: 'cs_order', metadata, payment_status: 'paid', payment_intent: { transfer_group: 'TG_fixture', latest_charge: charge } };
  const state = { charge, session, charges: [charge], transfers: [], account: 'acct_athlete', creates: [], checkouts: [] };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(input instanceof Request ? input.url : input);
    if (url.pathname === '/auth/v1/user') {
      const auth = new Headers(options.headers || (input instanceof Request ? input.headers : undefined)).get('Authorization');
      return auth === 'Bearer valid-token' ? Response.json({ id: 'sponsor' }) : Response.json({ message: 'Invalid token' }, { status: 401 });
    }
    if (url.pathname === '/rest/v1/athlete_profiles') {
      assert.equal(url.searchParams.get('id'), 'eq.athlete');
      assert.equal(url.searchParams.get('select'), 'stripe_account_id');
      assert.equal(options.headers.apikey, 'test-service');
      return Response.json(state.noProfile ? [] : [{ stripe_account_id: state.account }]);
    }
    if (url.pathname === '/rest/v1/whitelisting_grants') {
      assert.equal(url.searchParams.get('limit'), '0');
      assert.equal(options.headers.apikey, 'test-service');
      return Response.json([]);
    }
    if (url.hostname !== 'api.stripe.com') throw new Error('Unexpected external request');
    if (state.stripeError) return Response.json({ error: { message: 'Stripe unavailable' } }, { status: 500 });
    if (url.pathname === '/v1/checkout/sessions' && options.method === 'POST') {
      state.checkouts.push(new URLSearchParams(options.body));
      return Response.json({ id: 'cs_test_created', url: 'https://checkout.invalid' });
    }
    if (url.pathname === '/v1/checkout/sessions/cs_order') return state.missingSession ? Response.json({ error: { message: 'No session' } }, { status: 404 }) : Response.json(state.session);
    if (url.pathname === '/v1/transfers' && options.method === 'GET') return Response.json({ data: state.transfers, has_more: false });
    if (url.pathname === '/v1/transfers' && options.method === 'POST') {
      const body = new URLSearchParams(options.body);
      state.creates.push({ body, headers: options.headers });
      const transfer = { id: 'tr_release', amount: Number(body.get('amount')), created: 1800000000, metadata: { escrowReleaseFor: body.get('metadata[escrowReleaseFor]') } };
      state.transfers.push(transfer);
      return Response.json(transfer);
    }
    throw new Error(`Unexpected request: ${url.pathname}`);
  };
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const post = (body = {}, token = 'valid-token', route = 'release-escrow', cookie = `tmrw_grant_cs_order=${proof}`) => originalFetch(`http://127.0.0.1:${server.address().port}/api/checkout/${route}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(cookie ? { Cookie: cookie } : {}), 'Idempotency-Key': 'untrusted' },
    body: JSON.stringify(route === 'release-escrow' ? { checkoutSessionId: 'cs_order', athleteId: 'athlete', ...body } : { postcode: '2000', ...body }),
  });
  try { await run({ state, post }); } finally {
    globalThis.fetch = originalFetch;
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

test('initiating browser proof releases the exact held tranche anonymously and is idempotent', () => fixture(async ({ state, post }) => {
  const response = await post({ escrowHoldCents: 26250 }, null);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { released: true, escrowTransferId: 'tr_release', releasedAmountCents: 26250, releasedAt: '2027-01-15T08:00:00.000Z', alreadyReleased: false });
  const { body, headers } = state.creates[0];
  assert.equal(body.get('amount'), '26250');
  assert.equal(body.get('currency'), 'aud');
  assert.equal(body.get('destination'), 'acct_athlete');
  assert.equal(body.get('source_transaction'), 'ch_order');
  assert.equal(body.get('transfer_group'), 'TG_fixture');
  assert.equal(body.get('metadata[sponsorUserId]'), null);
  assert.equal(headers['Idempotency-Key'], 'tmrw_escrow_release_ch_order');
  const repeat = await post({}, null);
  assert.equal(repeat.status, 200);
  assert.equal((await repeat.json()).alreadyReleased, true);
  assert.equal(state.creates.length, 1);
}));

test('a shared receipt, wrong cookie or legacy anonymous order cannot release escrow', () => fixture(async ({ state, post }) => {
  assert.equal((await post({}, null, 'release-escrow', '')).status, 403);
  assert.equal((await post({}, null, 'release-escrow', `tmrw_grant_cs_order=${'b'.repeat(64)}`)).status, 403);
  delete state.session.metadata.grantAccessHash;
  assert.equal((await post({}, null)).status, 403);
  assert.equal(state.creates.length, 0);
}));

for (const [name, change, status, body = {}, token = 'valid-token'] of [
  ['no token for owned order', (s) => { s.session.metadata.sponsorUserId = 'sponsor'; }, 401, {}, null],
  ['bad token for owned order', (s) => { s.session.metadata.sponsorUserId = 'sponsor'; }, 401, {}, 'invalid'],
  ['other sponsor', (s) => { s.session.metadata.sponsorUserId = 'other'; }, 403, { checkoutSessionId: 'cs_order' }],
  ['no order', (s) => { s.missingSession = true; }, 404],
  ['missing session id', () => {}, 400, { checkoutSessionId: undefined }],
  ['amount mismatch', () => {}, 409, { escrowHoldCents: 1 }],
  ['unpaid session', (s) => { s.session.payment_status = 'unpaid'; }, 404, { checkoutSessionId: 'cs_order' }],
  ['uncaptured', (s) => { s.charge.captured = false; }, 404],
  ['failed charge', (s) => { s.charge.status = 'failed'; }, 404],
  ['refunded', (s) => { s.charge.refunded = true; }, 404],
  ['partially refunded', (s) => { s.charge.amount_refunded = 1; }, 404],
  ['disputed', (s) => { s.charge.disputed = true; }, 404],
  ['upfront', (s) => { s.charge.metadata.escrowMode = 'upfront_100'; s.charge.metadata.athleteEscrowHoldCents = '0'; }, 409],
  ['unpaid upfront', (s) => { s.session.payment_status = 'unpaid'; s.session.metadata.escrowMode = 'upfront_100'; }, 404],
  ['athlete mismatch upfront', (s) => { s.session.metadata.escrowMode = 'upfront_100'; }, 404, { athleteId: 'other' }],
  ['athlete mismatch', () => {}, 404, { athleteId: 'other' }],
  ['missing account', (s) => { s.account = null; }, 409],
  ['missing profile', (s) => { s.noProfile = true; }, 409],
  ['missing payout service key', () => { delete process.env.SUPABASE_SERVICE_ROLE_KEY; }, 503],
  ['missing payout URL', () => { delete process.env.SUPABASE_URL; delete process.env.VITE_SUPABASE_URL; }, 503],
  ['no Stripe key', () => { delete process.env.STRIPE_SECRET_KEY; }, 503],
  ['Stripe error', (s) => { s.stripeError = true; }, 502],
  ['unsafe group', () => {}, 400, { transferGroup: 'unsafe' }],
  ['mismatching group', () => {}, 404, { transferGroup: 'TG_other' }],
  ['insufficient amount', (s) => { s.charge.amount = 1; }, 404],
  ['wrong currency', (s) => { s.charge.currency = 'usd'; }, 404],
  ...[undefined, '', '0', '-1', '1.5', '26251', '9007199254740992'].map((hold) => [`invalid stamped hold ${hold}`, (s) => { s.session.metadata.athleteEscrowHoldCents = hold; }, 404]),
]) test(`release refuses ${name}`, () => fixture(async ({ state, post }) => {
  change(state);
  const response = await post(body, token);
  assert.equal(response.status, status);
  const data = await response.json();
  assert.ok(data.error);
  assert.notEqual(data.released, true);
  if (name === 'Stripe error') assert.equal(data.error, 'Stripe unavailable');
  if (name === 'upfront') assert.equal(data.error, 'Upfront order has no held escrow to release');
  if (name.startsWith('missing payout')) assert.equal(data.error, 'payout lookup not configured');
  assert.equal(state.creates.length, 0);
}));

test('sponsor-owned session permits its verified sponsor', () => fixture(async ({ state, post }) => {
  state.session.metadata.sponsorUserId = 'sponsor';
  const response = await post({ transferGroup: 'TG_fixture' }, 'valid-token', 'release-escrow', '');
  assert.equal(response.status, 200);
  assert.equal(state.creates[0].body.get('metadata[sponsorUserId]'), 'sponsor');
}));

test('release uses the paid historical order hold rather than current catalogue pricing', () => fixture(async ({ state, post }) => {
  state.charge.amount = 60000;
  state.session.metadata.athleteEscrowHoldCents = '21000';
  const response = await post({ escrowHoldCents: 21000 }, null);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).releasedAmountCents, 21000);
  assert.equal(state.creates[0].body.get('amount'), '21000');
}));

test('checkout stamps verified sponsor and copies escrow metadata to the payment intent', () => fixture(async ({ state, post }) => {
  const response = await post({ athleteId: 'athlete', tierId: 'local_merchant', transferGroup: 'TG_fixture', sponsorUserId: 'forged', athleteEscrowHoldCents: 1 }, 'valid-token', 'create-session');
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.sessionId, 'cs_test_created');
  assert.equal(result.transferGroup, 'TG_fixture');
  const body = state.checkouts[0];
  assert.equal(body.get('payment_intent_data[transfer_group]'), 'TG_fixture');
  for (const [key, value] of Object.entries({ sponsorUserId: 'sponsor', escrowMode: 'milestone_50_50', athleteEscrowHoldCents: '26250', athleteId: 'athlete', tierId: 'local_merchant', orderType: 'sponsorship_tier' })) {
    assert.equal(body.get(`metadata[${key}]`), value);
    assert.equal(body.get(`payment_intent_data[metadata][${key}]`), value);
  }
}));

test('checkout permits anonymous upfront orders, generates safe groups and rejects invalid auth/modes', () => fixture(async ({ state, post }) => {
  const order = { athleteId: 'athlete', tierId: 'local_merchant', escrowMode: 'upfront_100', transferGroup: '../unsafe' };
  const response = await post(order, null, 'create-session');
  assert.equal(response.status, 200);
  const result = await response.json();
  const body = state.checkouts[0];
  assert.equal(body.get('metadata[athleteEscrowHoldCents]'), '0');
  assert.equal(body.get('metadata[sponsorUserId]'), null);
  assert.match(body.get('payment_intent_data[transfer_group]'), /^TG_[A-Za-z0-9_]{1,80}$/);
  assert.equal(result.transferGroup, body.get('payment_intent_data[transfer_group]'));
  assert.equal((await post(order, 'invalid', 'create-session')).status, 401);
  assert.equal((await post({ ...order, escrowMode: 'invalid' }, null, 'create-session')).status, 400);
  assert.equal(state.checkouts.length, 1);
}));
