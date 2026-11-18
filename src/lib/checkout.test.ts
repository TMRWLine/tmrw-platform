import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createCheckoutSession, releaseEscrowMilestoneTranche } from './checkout';

test('checkout requires a successful response containing a checkout URL', async () => {
  const original = globalThis.fetch;
  try {
    for (const [status, body] of [[500, { error: 'Payment unavailable' }], [200, {}], [200, null]] as const) {
      globalThis.fetch = async () => new Response(JSON.stringify(body), { status });
      await assert.rejects(createCheckoutSession({ athleteId: 'athlete', tierId: 'local' }), new RegExp(`HTTP ${status}`));
    }
    globalThis.fetch = async () => { throw new Error('Network unavailable'); };
    await assert.rejects(createCheckoutSession({ athleteId: 'athlete', tierId: 'local' }), /Network unavailable/);
    for (const key of ['url', 'checkoutUrl']) {
      globalThis.fetch = async () => Response.json({ [key]: 'https://checkout.stripe.com/test' });
      assert.equal((await createCheckoutSession({ athleteId: 'athlete', tierId: 'local' })).checkoutUrl, 'https://checkout.stripe.com/test');
    }
  } finally {
    globalThis.fetch = original;
  }
});

test('release requires server confirmation and never writes a failed release', async () => {
  const original = globalThis.fetch;
  const storage = globalThis.localStorage;
  let writes = 0;
  globalThis.localStorage = { getItem: () => '[{"transferGroup":"group"}]', setItem: () => { writes++; } } as unknown as Storage;
  const params = { athleteId: 'athlete', transferGroup: 'group', escrowHoldCents: 100 };
  try {
    for (const [status, body] of [[500, { error: 'Transfer unavailable' }], [200, {}], [200, { released: true }], [200, { released: false, escrowTransferId: 'tr_server' }]] as const) {
      globalThis.fetch = async () => new Response(JSON.stringify(body), { status });
      await assert.rejects(releaseEscrowMilestoneTranche(params), /Unable to release escrow/);
    }
    globalThis.fetch = async () => { throw new Error('Network unavailable'); };
    await assert.rejects(releaseEscrowMilestoneTranche(params), /Network unavailable/);
    assert.equal(writes, 0);
    globalThis.fetch = async () => Response.json({ released: true, escrowTransferId: 'tr_server' });
    assert.equal((await releaseEscrowMilestoneTranche(params)).escrowTransferId, 'tr_server');
    assert.equal(writes, 1);
  } finally {
    globalThis.fetch = original;
    globalThis.localStorage = storage;
  }
});

test('grant errors and empty responses reject instead of returning mock tokens', async () => {
  const source = readFileSync(new URL('./whitelisting.ts', import.meta.url), 'utf8');
  const input = { athleteId: 'athlete', athleteName: 'Athlete', flightTierId: 'local', postcode: '2000' };
  for (const result of [{ data: null, error: { message: 'Grant unavailable' } }, { data: null, error: null }, { data: { id: 'persisted', meta_partnership_token: 'meta_server', tiktok_spark_code: 'spark_server' }, error: null }, { data: { id: 'empty_tokens' }, error: null }, 'network']) {
    const stub = `const supabase = { from: () => ({ insert: () => ({ select: () => ({ maybeSingle: async () => { ${result === 'network' ? 'throw new Error("Network unavailable")' : `return ${JSON.stringify(result)}`} } }) }) }) };`;
    const compiled = ts.transpile(source.replace("import { supabase } from './supabaseClient';", stub), { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext });
    const module = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
    if (typeof result !== 'string' && result.data) {
      const grant = await module.issuePostcodeWhitelistingGrant(input);
      assert.equal(grant.source, 'supabase');
      assert.equal(grant.meta_partnership_token, 'meta_partnership_token' in result.data ? 'meta_server' : '');
    } else {
      await assert.rejects(module.issuePostcodeWhitelistingGrant(input));
    }
  }
});
