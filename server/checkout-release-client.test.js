import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

test('client releases by session and persists only confirmed server settlement fields', async () => {
  const source = readFileSync(new URL('../src/lib/checkout.ts', import.meta.url), 'utf8');
  const compiled = ts.transpile(source.replace("import { currentAccessToken } from './sessionToken';", 'const currentAccessToken = async () => null;'), { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext });
  const { releaseEscrowMilestoneTranche } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.localStorage;
  let ledger = [{ checkoutSessionId: 'cs_order' }, { checkoutSessionId: 'cs_other' }];
  let calls = 0;
  const confirmed = { released: true, escrowTransferId: 'tr_confirmed', releasedAmountCents: 1234, releasedAt: '2026-01-01T00:00:00.000Z' };
  globalThis.localStorage = { getItem: () => JSON.stringify(ledger), setItem: (_key, value) => { ledger = JSON.parse(value); } };
  const params = { checkoutSessionId: 'cs_order', athleteId: 'athlete' };
  try {
    globalThis.fetch = async (_url, options) => {
      calls++;
      assert.deepEqual(JSON.parse(options.body), params);
      assert.match(options.headers['Idempotency-Key'], /^idemp_release_cs_order_/);
      return Response.json(confirmed);
    };
    await assert.rejects(releaseEscrowMilestoneTranche({ ...params, checkoutSessionId: '' }), /Checkout Session ID is required/);
    assert.equal(calls, 0);
    assert.deepEqual(await releaseEscrowMilestoneTranche(params), confirmed);
    assert.deepEqual(ledger, [{ checkoutSessionId: 'cs_order', escrowReleased: true, finalTransferId: 'tr_confirmed', releasedAmountCents: 1234, releasedAt: confirmed.releasedAt }, { checkoutSessionId: 'cs_other' }]);
    for (const body of [{}, { ...confirmed, released: false }, { ...confirmed, escrowTransferId: '' }, { ...confirmed, releasedAmountCents: undefined }, { ...confirmed, releasedAt: 'invalid' }]) {
      globalThis.fetch = async () => Response.json(body);
      await assert.rejects(releaseEscrowMilestoneTranche(params), /release not confirmed/);
    }
    globalThis.fetch = async (_url, options) => {
      assert.equal(JSON.parse(options.body).escrowHoldCents, 999);
      return Response.json(confirmed);
    };
    assert.deepEqual(await releaseEscrowMilestoneTranche({ ...params, transferGroup: 'TG_group', escrowHoldCents: 999 }), confirmed);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalStorage;
  }
});
