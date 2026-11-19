import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import Stripe from 'stripe';
import ts from 'typescript';
import app from './index.js';

const athleteId = '11111111-1111-4111-8111-111111111111';
const proof = 'a'.repeat(64);

async function fixture(run) {
  const values = { STRIPE_SECRET_KEY: 'sk_test_fixture', STRIPE_WEBHOOK_SECRET: 'whsec_fixture', SUPABASE_URL: 'https://fixture.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-service', SUPABASE_ANON_KEY: 'test-anon' };
  const previous = Object.fromEntries(Object.keys(values).map((name) => [name, process.env[name]]));
  Object.assign(process.env, values);
  const metadata = { athleteId, grantAccessHash: createHash('sha256').update(proof).digest('hex'), orderType: 'sponsorship_tier', escrowMode: 'milestone_50_50', athleteCutCents: '52500', athleteEscrowHoldCents: '26250', clubCutCents: '11250', clubCadence: 'quarterly_batch' };
  const charge = { id: 'ch_order', created: Date.parse('2026-12-15T12:00:00Z') / 1000, status: 'succeeded', paid: true, captured: true, currency: 'aud', amount: 75000 };
  const session = { id: 'cs_order', payment_status: 'paid', metadata, payment_intent: { transfer_group: 'TG_order', latest_charge: charge } };
  const state = { session, charge, metadata, account: 'acct_athlete', transfers: [], creates: [], clubRows: new Map(), upserts: 0, retrievals: 0 };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(input instanceof Request ? input.url : input);
    if (url.pathname === '/auth/v1/user') return Response.json({ id: 'sponsor' });
    if (url.pathname === '/rest/v1/athlete_profiles') {
      assert.notEqual(state.metadata.athleteId, 'marcus-thorne', 'slug must not reach Supabase');
      assert.equal(url.searchParams.get('id'), `eq.${athleteId}`);
      assert.equal(options.headers.apikey, 'test-service');
      return Response.json([{ stripe_account_id: state.account, current_club: 'Fixture Club' }]);
    }
    if (url.pathname === '/rest/v1/club_payouts') {
      assert.equal(url.searchParams.get('on_conflict'), 'charge_id');
      assert.match(options.headers.Prefer, /resolution=ignore-duplicates/);
      assert.equal(options.headers.apikey, 'test-service');
      if (state.clubFailure) return Response.json({}, { status: 500 });
      const row = JSON.parse(options.body);
      state.upserts++;
      if (!state.clubRows.has(row.charge_id)) state.clubRows.set(row.charge_id, row);
      return Response.json([state.clubRows.get(row.charge_id)]);
    }
    if (url.pathname === '/rest/v1/whitelisting_grants') return Response.json([]);
    if (url.hostname !== 'api.stripe.com') throw new Error('Unexpected network request');
    if (state.stripeFailure) return Response.json({ error: { message: 'Stripe down' } }, { status: 500 });
    if (url.pathname === '/v1/checkout/sessions/cs_order') { state.retrievals++; return Response.json(session); }
    if (url.pathname === '/v1/checkout/sessions' && options.method === 'POST') {
      state.checkout = new URLSearchParams(options.body);
      return Response.json({ id: 'cs_test_created', url: 'https://checkout.invalid' });
    }
    if (url.pathname === '/v1/transfers' && options.method === 'GET') return Response.json({ data: state.transfers });
    if (url.pathname === '/v1/transfers' && options.method === 'POST') {
      const body = new URLSearchParams(options.body);
      state.creates.push({ body, headers: options.headers });
      const transfer = { id: `tr_${state.creates.length}`, amount: Number(body.get('amount')), created: charge.created, metadata: Object.fromEntries([...body].filter(([key]) => key.startsWith('metadata[')).map(([key, value]) => [key.slice(9, -1), value])) };
      state.transfers.push(transfer);
      return Response.json(transfer);
    }
    throw new Error(`Unexpected request: ${url.pathname}`);
  };
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const post = (body = { checkoutSessionId: 'cs_order' }, route = 'checkout/settle', headers = {}) => originalFetch(`http://127.0.0.1:${server.address().port}/api/${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: `tmrw_grant_cs_order=${proof}`, ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  const webhook = (valid = true) => {
    const payload = JSON.stringify({ id: 'evt_fixture', type: 'checkout.session.completed', data: { object: { id: 'cs_order', metadata: { athleteCutCents: '1' } } } });
    return post(payload, 'v1/webhooks/stripe', { 'stripe-signature': valid ? Stripe.webhooks.generateTestHeaderString({ payload, secret: values.STRIPE_WEBHOOK_SECRET }) : 'invalid' });
  };
  try { await run({ state, post, webhook }); } finally {
    globalThis.fetch = originalFetch;
    for (const [name, value] of Object.entries(previous)) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

test('milestone settlement pays athlete T+0, queues club once and does not collide with escrow release', () => fixture(async ({ state, post }) => {
  const response = await post();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { settled: true, athleteT0: { transferId: 'tr_1', amountCents: 26250, alreadyPaid: false }, club: { status: 'queued_quarterly', amountCents: 11250, cadence: 'quarterly_batch', scheduledFor: new Date(2026, 11, 31).toISOString() } });
  const { body, headers } = state.creates[0];
  assert.equal(body.get('destination'), 'acct_athlete');
  assert.equal(body.get('source_transaction'), 'ch_order');
  assert.equal(body.get('transfer_group'), 'TG_order');
  assert.equal(headers['Idempotency-Key'], 'tmrw_athlete_t0_ch_order');
  assert.equal((await (await post()).json()).athleteT0.alreadyPaid, true);
  assert.equal(state.creates.length, 1);
  assert.equal(state.clubRows.size, 1);
  assert.equal(state.upserts, 2);
  assert.equal(state.clubRows.get('ch_order').club_name, 'Fixture Club');
  assert.equal(state.clubRows.get('ch_order').stripe_transfer_id, null);
  const release = await post({ checkoutSessionId: 'cs_order', athleteId }, 'checkout/release-escrow');
  assert.equal(release.status, 200);
  assert.equal((await release.json()).alreadyReleased, false);
  assert.equal(state.creates.length, 2);
  assert.equal(state.creates[1].body.get('metadata[escrowReleaseFor]'), 'ch_order');
  assert.equal((await (await post()).json()).athleteT0.transferId, 'tr_1');
}));

test('settlement requires initiating browser proof for anonymous orders', () => fixture(async ({ state, post }) => {
  for (const Cookie of ['', `tmrw_grant_cs_order=${'b'.repeat(64)}`]) {
    assert.equal((await post(undefined, 'checkout/settle', { Cookie })).status, 403);
  }
  delete state.metadata.grantAccessHash;
  assert.equal((await post()).status, 403);
  assert.equal(state.creates.length, 0);
  assert.equal(state.clubRows.size, 0);
}));

test('upfront settles full athlete share and records immediate club as awaiting account', () => fixture(async ({ state, post }) => {
  Object.assign(state.metadata, { escrowMode: 'upfront_100', athleteEscrowHoldCents: '0', clubCadence: 'immediate_t0' });
  const response = await post();
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.athleteT0.amountCents, 52500);
  assert.deepEqual(result.club, { status: 'awaiting_club_connect_account', amountCents: 11250, cadence: 'immediate_t0', scheduledFor: null });
  assert.equal(state.clubRows.get('ch_order').status, 'awaiting_club_connect_account');
  assert.equal(state.creates.length, 1);
}));

test('legacy paid orders without club cadence default to quarterly batching', () => fixture(async ({ state, post }) => {
  delete state.metadata.clubCadence;
  const response = await post();
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).club, { status: 'queued_quarterly', amountCents: 11250, cadence: 'quarterly_batch', scheduledFor: new Date(2026, 11, 31).toISOString() });
  assert.equal(state.clubRows.get('ch_order').cadence, 'quarterly_batch');
  assert.equal(state.creates.length, 1);
}));

test('quarterly schedule matches client quarter-end labels including local-time boundaries', () => fixture(async ({ state, post }) => {
  const source = readFileSync(new URL('../src/lib/checkout.ts', import.meta.url), 'utf8');
  const compiled = ts.transpile(source.replace("import { currentAccessToken } from './sessionToken';", 'const currentAccessToken = async () => null;'), { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext });
  const { getNextQuarterSweepLabel } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
  const previousTZ = process.env.TZ;
  try {
    for (const zone of ['UTC', 'Australia/Sydney', 'America/Los_Angeles']) {
      process.env.TZ = zone;
      for (const [month, day] of [[1, 15], [3, 31], [4, 1], [6, 30], [7, 1], [9, 30], [10, 1], [12, 31], [1, 1]]) {
        for (const hour of [0, 23]) {
          const paidAt = new Date(2026, month - 1, day, hour, 59, 59);
          state.charge.created = paidAt.getTime() / 1000;
          state.clubRows.clear();
          const response = await post();
          assert.equal(response.status, 200);
          const result = await response.json();
          const scheduled = new Date(result.club.scheduledFor);
          const labelDate = getNextQuarterSweepLabel(paidAt).split(' (')[0];
          const date = `${scheduled.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][scheduled.getMonth()]} ${scheduled.getFullYear()}`;
          assert.equal(date, labelDate, `${zone}: ${paidAt.toISOString()}`);
          assert.equal(scheduled.getHours(), 0);
          assert.equal(state.clubRows.get('ch_order').scheduled_for, result.club.scheduledFor);
        }
      }
    }
  } finally {
    if (previousTZ === undefined) delete process.env.TZ; else process.env.TZ = previousTZ;
  }
}));

test('signature-verified webhook retrieves the paid order and retries failed club writes safely', () => fixture(async ({ state, webhook }) => {
  assert.equal((await webhook(false)).status, 400);
  assert.equal(state.retrievals, 0);
  state.clubFailure = true;
  assert.equal((await webhook()).status, 500);
  assert.equal(state.creates.length, 1);
  state.clubFailure = false;
  assert.equal((await webhook()).status, 200);
  assert.equal(state.creates.length, 1);
  assert.equal(state.creates[0].body.get('amount'), '26250');
  assert.equal(state.retrievals, 2);
}));

for (const [name, change, status] of [
  ['unpaid', (s) => { s.session.payment_status = 'unpaid'; }, 404],
  ['refunded', (s) => { s.charge.amount_refunded = 1; }, 404],
  ['disputed', (s) => { s.charge.disputed = true; }, 404],
  ['missing athlete account', (s) => { s.account = null; }, 409],
  ['catalogue slug', (s) => { s.metadata.athleteId = 'marcus-thorne'; }, 409],
  ['invalid athlete cut', (s) => { s.metadata.athleteCutCents = '52501'; }, 409],
  ['invalid club cut', (s) => { s.metadata.clubCutCents = '11251'; }, 409],
  ...['', null, 'quarterly', 1].map((cadence) => [`invalid club cadence ${cadence}`, (s) => { s.metadata.clubCadence = cadence; }, 409]),
  ['missing service key', () => { delete process.env.SUPABASE_SERVICE_ROLE_KEY; }, 503],
  ['Stripe failure', (s) => { s.stripeFailure = true; }, 502],
  ['owned order without bearer', (s) => { s.metadata.sponsorUserId = 'sponsor'; }, 401],
  ['missing metadata', (s) => { s.session.metadata = {}; }, 403],
]) test(`settlement refuses ${name}`, () => fixture(async ({ state, post }) => {
  change(state);
  const response = await post();
  assert.equal(response.status, status);
  assert.notEqual((await response.json()).settled, true);
  assert.equal(state.creates.length, 0);
  assert.equal(state.clubRows.size, 0);
}));

test('checkout validates and stamps club cadence on session and payment intent', () => fixture(async ({ state, post }) => {
  const order = { athleteId, tierId: 'local_merchant', postcode: '2000' };
  for (const clubCadence of ['immediate_t0', 'quarterly_batch']) {
    assert.equal((await post({ ...order, clubCadence }, 'checkout/create-session')).status, 200);
    assert.equal(state.checkout.get('metadata[clubCadence]'), clubCadence);
    assert.equal(state.checkout.get('payment_intent_data[metadata][clubCadence]'), clubCadence);
  }
  for (const clubCadence of ['quarterly', '', null, 1]) assert.equal((await post({ ...order, clubCadence }, 'checkout/create-session')).status, 400);
}));

test('club payout migration restricts access and enforces one row per charge', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20261120000004_club_payouts.sql', import.meta.url), 'utf8');
  assert.match(sql, /charge_id text not null unique/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all .* from anon, authenticated/);
  assert.doesNotMatch(sql, /create policy/i);
});
