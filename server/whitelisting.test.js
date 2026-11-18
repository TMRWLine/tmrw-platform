import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { fetchPaidWhitelistingGrant } from '../src/lib/whitelisting.ts';
import app from './index.js';
import { grantPath } from './whitelisting.js';

const table = 'public.whitelisting_grants';
const stripeURL = 'https://api.stripe.com/v1/checkout/sessions';
const sessionId = 'cs_test_fixture1';
const checkoutURL = 'https://checkout.stripe.invalid/fixture';
const dbURL = 'https://db.fixture.invalid/rest/v1/whitelisting_grants';

async function createLedger() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
  `);
  const migration = new URL('../supabase/migrations/20261120000003_create_whitelisting_grants.sql', import.meta.url);
  await db.exec(readFileSync(migration, 'utf8'));
  return db;
}

test('the grants migration denies browser roles and permits only server inserts and reads', async () => {
  const db = await createLedger();
  try {
    assert.deepEqual((await db.query(`
      SELECT relrowsecurity FROM pg_class WHERE oid = '${table}'::regclass
    `)).rows, [{ relrowsecurity: true }]);
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      await assert.rejects(db.query(`SELECT * FROM ${table}`), { code: '42501' });
      await assert.rejects(db.query(`INSERT INTO ${table} DEFAULT VALUES`), { code: '42501' });
      await db.exec('RESET ROLE');
    }
    await db.exec('SET ROLE service_role');
    await assert.rejects(db.query(`DELETE FROM ${table}`), { code: '42501' });
  } finally {
    await db.close();
  }
});

test('sponsorship checkout returns a grant only to the initiating browser after Stripe confirms payment', async () => {
  const db = await createLedger();
  const originalFetch = globalThis.fetch;
  const env = {
    STRIPE_SECRET_KEY: 'fixture-stripe-key',
    SUPABASE_URL: 'https://db.fixture.invalid',
    APP_BASE_URL: 'https://tmrw.fixture.invalid',
    SUPABASE_SERVICE_ROLE_KEY: 'fixture-service-key',
  };
  const previous = Object.fromEntries(Object.keys(env).map(name => [name, process.env[name]]));
  Object.assign(process.env, env);
  const server = createServer(app);
  let stripeSession;
  let storageUnavailable = true;
  let checkoutCalls = 0;
  let lookedUp = 0;
  let lookups = 0;
  let writes = 0;
  const transfers = [];
  const transferGroup = 'TG_fixture';
  globalThis.fetch = async (input, options) => {
    const url = new URL(input);
    if (url.href === stripeURL) {
      checkoutCalls++;
      const params = new URLSearchParams(options.body);
      assert.equal(params.get('success_url'), 'https://tmrw.fixture.invalid/checkout/success?session_id={CHECKOUT_SESSION_ID}&athleteId=chloe-vance&tierId=pathway_flight');
      const metadata = Object.fromEntries([...params].flatMap(([key, value]) => {
        const name = /^metadata\[(.+)\]$/.exec(key)?.[1];
        return name ? [[name, value]] : [];
      }));
      const amount = Number(params.get('line_items[0][price_data][unit_amount]'));
      assert.equal(params.get('payment_intent_data[transfer_group]'), transferGroup);
      assert.equal(metadata.escrowMode, 'milestone_50_50');
      stripeSession = {
        id: sessionId, mode: 'payment', payment_status: 'unpaid', status: 'complete',
        amount_total: amount,
        currency: 'aud', metadata,
        payment_intent: {
          transfer_group: transferGroup,
          latest_charge: { id: 'ch_fixture', status: 'succeeded', paid: true, captured: true, amount, currency: 'aud' },
        },
      };
      return Response.json({ id: sessionId, url: checkoutURL });
    }
    if (url.origin + url.pathname === `${stripeURL}/${sessionId}`) {
      lookedUp++;
      assert.equal(options.headers.Authorization, 'Bearer fixture-stripe-key');
      return Response.json(stripeSession);
    }
    if (url.origin === 'https://api.stripe.com' && url.pathname === '/v1/transfers') {
      if (options.method === 'GET') return Response.json({ data: transfers, has_more: false });
      assert.equal(options.method, 'POST');
      const body = new URLSearchParams(options.body);
      assert.equal(body.get('source_transaction'), 'ch_fixture');
      assert.equal(body.get('transfer_group'), transferGroup);
      assert.equal(body.get('destination'), 'acct_fixture');
      const transfer = {
        id: 'tr_fixture', amount: Number(body.get('amount')), created: 1800000000,
        metadata: { escrowReleaseFor: body.get('metadata[escrowReleaseFor]') },
      };
      transfers.push(transfer);
      return Response.json(transfer);
    }
    if (url.origin === 'https://db.fixture.invalid' && url.pathname === '/rest/v1/athlete_profiles' &&
        url.searchParams.get('select') === 'stripe_account_id') {
      assert.equal(url.searchParams.get('id'), 'eq.chloe-vance');
      assert.equal(options.headers.apikey, 'fixture-service-key');
      return Response.json([{ stripe_account_id: 'acct_fixture' }]);
    }
    if (url.origin + url.pathname !== dbURL) throw new Error('Unexpected outbound request');
    assert.equal(options.headers.apikey, 'fixture-service-key');
    if (storageUnavailable) return Response.json({ code: 'PGRST205' }, { status: 404 });
    if (options.method === 'POST') {
      writes++;
      assert.equal(url.searchParams.get('on_conflict'), 'checkout_session_id');
      assert.equal(options.headers.Prefer, 'resolution=ignore-duplicates,return=minimal');
      const columns = [
        'checkout_session_id', 'athlete_id', 'athlete_name', 'flight_tier_id', 'postcode',
        'radius_km', 'tiktok_spark_code', 'meta_partnership_token', 'issued_at', 'expires_at',
      ];
      const row = JSON.parse(options.body);
      await db.query(`
        INSERT INTO ${table} (${columns.join(',')})
        VALUES (${columns.map((_, i) => '$' + (i + 1)).join(',')})
        ON CONFLICT (checkout_session_id) DO NOTHING
      `, columns.map(column => row[column]));
      return new Response(null, { status: 201 });
    }
    if (url.searchParams.get('limit') === '0') return Response.json([]);
    lookups++;
    const [match] = /^eq\..+$/.exec(url.searchParams.get('checkout_session_id'));
    const result = await db.query(`SELECT * FROM ${table} WHERE checkout_session_id = $1`, [match.slice(3)]);
    return Response.json(result.rows);
  };
  await db.exec('SET ROLE service_role');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const request = (path, body, cookie) => originalFetch(`http://127.0.0.1:${server.address().port}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie && { Cookie: cookie }) },
    body: JSON.stringify(body),
  });
  const start = () => request('/api/checkout/create-session', {
    athleteId: 'chloe-vance', tierId: 'pathway_contender', postcode: '0220',
    escrowMode: 'milestone_50_50', transferGroup,
    athlete: { full_name: 'Chloe Vance' },
  });

  try {
    assert.equal((await start()).status, 503);
    assert.equal(checkoutCalls, 0);
    storageUnavailable = false;
    const checkout = await start();
    assert.equal(checkout.status, 200);
    assert.deepEqual(await checkout.json(), { checkoutUrl: checkoutURL, sessionId, transferGroup });
    const setCookie = checkout.headers.get('Set-Cookie');
    assert.match(setCookie, /HttpOnly; SameSite=Lax|HttpOnly; Secure; SameSite=Lax/);
    assert.ok(setCookie.includes(`Path=${grantPath}`));
    const cookie = setCookie.split(';')[0];
    const cookieSecret = cookie.split('=')[1];
    assert.equal(stripeSession.metadata.grantAccessHash, createHash('sha256').update(cookieSecret).digest('hex'));
    assert.equal((await request(grantPath, { sessionId: 'cs_demo_1' })).status, 400);
    assert.equal((await request(grantPath, { sessionId })).status, 403);
    assert.equal(lookedUp, 0);
    assert.equal((await request(grantPath, { sessionId }, `tmrw_grant_${sessionId}=${'f'.repeat(64)}`)).status, 403);
    assert.equal((await request(grantPath, { sessionId }, cookie)).status, 409);
    assert.equal(lookups, 0);
    assert.equal(writes, 0);
    stripeSession.payment_status = 'paid';
    stripeSession.metadata.orderType = 'merch_capsule';
    assert.equal((await request(grantPath, { sessionId }, cookie)).status, 422);
    assert.equal(writes, 0);
    stripeSession.metadata.orderType = 'sponsorship_tier';
    const results = await Promise.all([1, 2].map(() =>
      request(grantPath, { sessionId, athleteId: 'forged', tierId: 'other', postcode: '9999' }, cookie),
    ));
    for (const result of results) {
      assert.equal(result.status, 200);
      assert.equal(result.headers.get('Cache-Control'), 'no-store');
    }
    const [issued, repeated] = await Promise.all(results.map(result => result.json()));
    assert.deepEqual(repeated, issued);
    assert.equal(issued.checkoutSessionId, sessionId);
    assert.equal(issued.milestoneReleaseAvailable, true);
    assert.equal(issued.amountPaidCents, 350000);
    assert.equal(issued.grant.athleteId, 'chloe-vance');
    assert.equal(issued.grant.athleteName, 'Chloe Vance');
    assert.equal(issued.grant.flightTierId, 'pathway_flight');
    assert.equal(issued.grant.postcode, '0220');
    assert.equal(issued.grant.radiusKm, 15);
    assert.match(issued.grant.meta_partnership_token, /^TMRW-META-/);
    assert.match(issued.grant.tiktok_spark_code, /^TMRW-TT-/);
    assert.equal(Date.parse(issued.grant.expiresAt) - Date.parse(issued.grant.issuedAt), 90 * 24 * 60 * 60 * 1000);
    const [stored] = (await db.query(`SELECT * FROM ${table}`)).rows;
    assert.equal(stored.id, issued.grant.id);
    assert.equal((await db.query(`SELECT count(*)::int AS count FROM ${table}`)).rows[0].count, 1);
    const writesBeforeRefresh = writes;
    assert.deepEqual(await (await request(grantPath, { sessionId }, cookie)).json(), issued);
    assert.equal(writes, writesBeforeRefresh);
    const fixtureFetch = globalThis.fetch;
    globalThis.fetch = (input, options) => {
      if (input !== grantPath) return fixtureFetch(input, options);
      return request(input, JSON.parse(options.body), cookie);
    };
    assert.deepEqual(await fetchPaidWhitelistingGrant(sessionId), issued);
    await assert.rejects(fetchPaidWhitelistingGrant('cs_demo_1'), /No Stripe payment was verified/);

    const releasePath = '/api/checkout/release-escrow';
    const approval = { checkoutSessionId: issued.checkoutSessionId, athleteId: issued.grant.athleteId };
    const release = await request(releasePath, approval, cookie);
    assert.equal(release.status, 200);
    assert.deepEqual(await release.json(), {
      released: true, escrowTransferId: 'tr_fixture', releasedAmountCents: 122500,
      releasedAt: '2027-01-15T08:00:00.000Z', alreadyReleased: false,
    });
    const retry = await request(releasePath, approval, cookie);
    assert.equal(retry.status, 200);
    assert.equal((await retry.json()).alreadyReleased, true);
    assert.equal(transfers.length, 1);

    stripeSession.metadata.escrowMode = 'upfront_100';
    const upfront = await request(grantPath, { sessionId }, cookie);
    assert.equal(upfront.status, 200);
    assert.equal((await upfront.json()).milestoneReleaseAvailable, false);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await db.close();
  }
});
