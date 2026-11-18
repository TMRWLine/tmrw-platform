import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyCheckoutSession, type CheckoutVerification } from '../src/api';

test('typed verification helper uses the relative endpoint and never throws on failures', async (t) => {
  const paid: CheckoutVerification = {
    verified: true, status: 'paid', amountTotalCents: 100, currency: 'aud',
    ledger: null, athleteId: 'server-athlete', tierId: 'server-tier', transferStatus: 'awaiting_webhook',
  };
  const mock = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(String(url), '/api/checkout/verify?session_id=cs_test_abc123');
    assert.ok(options?.signal instanceof AbortSignal);
    return Response.json(paid);
  });
  assert.deepEqual(await verifyCheckoutSession('cs_test_abc123'), paid);
  for (const result of [
    async () => { throw new TypeError('network'); },
    async () => { throw new DOMException('deadline', 'TimeoutError'); },
    async () => new Response('{}', { status: 502 }),
    async () => new Response('not JSON'),
    async () => Response.json({ verified: true, status: 'pending' }),
    async () => Response.json(null),
  ]) {
    mock.mock.mockImplementation(result);
    const body = await verifyCheckoutSession('cs_test_abc123');
    assert.equal(body.verified, false);
    assert.equal(body.status, 'error');
    assert.equal(body.amountTotalCents, null);
  }
  mock.mock.mockImplementation(async () => Response.json({ ...paid, status: 'demo', verified: false }));
  assert.equal((await verifyCheckoutSession('cs_test_abc123')).status, 'demo');
});
