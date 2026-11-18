import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { sponsorshipLedger } from '../src/lib/commercialLedger.js';
import { addConnectMetadata } from './connect.js';

process.env.STRIPE_SECRET_KEY = 'sk_test_mock_only';
process.env.STRIPE_ATHLETE_ACCOUNT_ID = 'acct_athlete';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock_only';
process.env.ESCROW_RELEASE_TOKEN = 'local_approval_only';
process.env.VITE_SUPABASE_URL = '';
const { default: app } = await import('./index.js');
const server = app.listen(0);
await new Promise((resolve) => server.once('listening', resolve));
after(() => new Promise((resolve) => server.close(resolve)));
const base = `http://127.0.0.1:${server.address().port}`;
const nativeFetch = globalThis.fetch;
const stripe = new Stripe('sk_test_mock_only');
const calls = [];
let intentMetadata = {};
let session;
let failTransfer = false;
const payees = { athlete: { accountId: 'acct_athlete', gstRegistered: true }, club: { accountId: 'acct_club', gstRegistered: false } };

function fixture(escrowMode = 'upfront_100', clubCadence = 'immediate_t0') {
  const ledger = sponsorshipLedger(10001, payees, escrowMode);
  const body = new URLSearchParams();
  addConnectMetadata(body, ledger, payees, 'tmrw_test', escrowMode, clubCadence);
  const metadata = { orderType: 'sponsorship_tier' };
  for (const [key, value] of body) if (key.startsWith('metadata[')) metadata[key.slice(9, -1)] = value;
  return { id: 'cs_test_mock', currency: 'aud', payment_status: 'paid', amount_total: ledger.totalPayableCents, payment_intent: 'pi_mock', metadata };
}

async function webhook(type, object) {
  const payload = JSON.stringify({ id: 'evt_mock', type, data: { object } });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
  return nativeFetch(`${base}/api/v1/webhooks/stripe`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': signature }, body: payload });
}

function mockStripe() {
  calls.length = 0;
  intentMetadata = {};
  globalThis.fetch = async (url, options) => {
    assert.ok(options.signal instanceof AbortSignal);
    assert.match(String(url), /^https:\/\/api.stripe.com\/v1\//);
    const path = String(url).split('/v1/')[1];
    const body = options.body ? Object.fromEntries(options.body) : {};
    calls.push({ path, body, key: options.headers['Idempotency-Key'] });
    let result;
    if (path === 'transfers') {
      if (failTransfer) { failTransfer = false; return new Response('{}', { status: 500 }); }
      result = { id: options.headers['Idempotency-Key'].endsWith('-final') ? 'tr_final' : body.destination === 'acct_athlete' ? 'tr_athlete' : 'tr_club' };
    } else if (path.endsWith('/reversals')) result = { id: 'trr_mock' };
    else if (path.startsWith('checkout/sessions/')) result = session;
    else if (path.startsWith('charges/')) result = { payment_intent: 'pi_mock', disputed: false, refunded: false };
    else if (path === 'payment_intents/pi_mock') {
      for (const [key, value] of Object.entries(body)) if (key.startsWith('metadata[')) intentMetadata[key.slice(9, -1)] = value;
      result = { latest_charge: 'ch_mock', metadata: intentMetadata };
    } else throw new Error(`Unexpected mock path: ${path}`);
    return new Response(JSON.stringify(result), { status: 200 });
  };
}

test('signed completed webhook routes 70/15/15, GST and stable idempotent transfers', async () => {
  mockStripe();
  try {
    session = fixture();
    for (let i = 0; i < 2; i++) {
      const response = await webhook('checkout.session.completed', session);
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.ledger.gstCents, 700);
      assert.deepEqual(result.transfers.map((transfer) => transfer.amountCents), [7701, 1500]);
    }
    const transfers = calls.filter((call) => call.path === 'transfers');
    assert.equal(new Set(transfers.map((call) => call.key)).size, 2);
    assert.ok(transfers.every((call) => call.body.source_transaction === 'ch_mock' && call.body.transfer_group === 'tmrw_test'));
    assert.equal(intentMetadata.athleteTransferId, 'tr_athlete');
    const dispute = await webhook('charge.dispute.created', { id: 'dp_mock', charge: 'ch_mock' });
    assert.equal(dispute.status, 200);
    assert.equal((await dispute.json()).reversals.length, 2);
    assert.ok(calls.filter((call) => call.path.endsWith('/reversals')).every((call) => call.key.startsWith('dispute-dp_mock-')));
  } finally { globalThis.fetch = nativeFetch; }
});

test('pending payments, demo accounts, invalid totals and failed transfers are handled safely', async () => {
  mockStripe();
  try {
    session = fixture();
    let response = await webhook('checkout.session.completed', { ...session, payment_status: 'unpaid' });
    assert.equal((await response.json()).mode, 'pending_payment');
    assert.equal(calls.length, 0);
    response = await webhook('checkout.session.completed', { ...session, amount_total: 1 });
    assert.equal(response.status, 500);
    assert.equal(calls.length, 0);
    failTransfer = true;
    response = await webhook('checkout.session.completed', session);
    assert.equal(response.status, 500);
    response = await webhook('checkout.session.completed', session);
    assert.equal(response.status, 200);
    const keys = calls.filter((call) => call.path === 'transfers').map((call) => call.key);
    assert.equal(keys[0], keys[1]);
    process.env.STRIPE_SECRET_KEY = '';
    response = await webhook('checkout.session.completed', session);
    assert.equal((await response.json()).mode, 'sandbox_demo');
  } finally { process.env.STRIPE_SECRET_KEY = 'sk_test_mock_only'; globalThis.fetch = nativeFetch; }
});

test('milestone release requires approval and reverses both athlete tranches on dispute', async () => {
  mockStripe();
  try {
    session = fixture('milestone_50_50', 'quarterly_batch');
    const initial = await webhook('checkout.session.completed', session);
    assert.equal((await initial.json()).transfers[0].amountCents, 3851);
    const release = (authorised) => nativeFetch(`${base}/api/checkout/release-escrow`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(authorised ? { Authorization: 'Bearer local_approval_only' } : {}) }, body: JSON.stringify({ sessionId: session.id, escrowHoldCents: 1 }),
    });
    assert.equal((await release(false)).status, 403);
    const response = await release(true);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).releasedAmountCents, 3850);
    assert.equal(intentMetadata.athleteFinalTransferId, 'tr_final');
    const dispute = await webhook('charge.dispute.created', { id: 'dp_mock', charge: 'ch_mock' });
    assert.equal((await dispute.json()).reversals.length, 2);
  } finally { globalThis.fetch = nativeFetch; }
});

test('checkout sets transfer group, uses server prices and rejects client payout destinations', async () => {
  mockStripe();
  try {
    globalThis.fetch = async (_url, options) => {
      const body = Object.fromEntries(options.body);
      assert.match(body['payment_intent_data[transfer_group]'], /^tmrw_/);
      assert.equal(body['line_items[0][price_data][unit_amount]'], '75000');
      assert.ok(options.headers['Idempotency-Key']);
      assert.doesNotMatch(JSON.stringify(body), /acct_attacker/);
      return new Response(JSON.stringify({ id: 'cs_test_mock', url: 'https://checkout.stripe.com/mock' }));
    };
    const response = await nativeFetch(`${base}/api/checkout/create-session`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'test_checkout' }, body: JSON.stringify({ athleteId: 'demo', tierId: 'local_merchant', amountAud: 1, athlete: { stripe_account_id: 'acct_attacker' } }) });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).ledger.grossCents, 75000);
  } finally { globalThis.fetch = nativeFetch; }
});
