import { test } from 'node:test';
import assert from 'node:assert/strict';
import { releaseEscrowMilestoneTranche } from '../src/lib/checkout';
import { fetchWhitelistingGrant } from '../src/api';
import { supabase } from '../src/lib/supabaseClient';

test('explicit demo receipt stays local and returns an illustrative, non-settled result', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('No worker calls in demo'); });
  const result = await releaseEscrowMilestoneTranche({
    transferGroup: 'demo', athleteId: 'a', escrowHoldCents: 100, mode: 'sandbox_demo',
  });
  assert.equal(result.preview, true);
  assert.equal(result.released, false);
  assert.equal(result.releasedAmountCents, 0);
  assert.equal(mock.mock.calls.length, 0);
});

test('403, network failures and unrequested server demo mode never become successful release', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'Approval required' }, { status: 403 }));
  const params = { transferGroup: 'live', athleteId: 'a', escrowHoldCents: 100 };
  await assert.rejects(releaseEscrowMilestoneTranche(params), /approval/);
  mock.mock.mockImplementation(async () => Response.json({ mode: 'sandbox_demo', released: false }));
  await assert.rejects(releaseEscrowMilestoneTranche(params), /approval/);
  mock.mock.mockImplementation(async () => { throw new Error('Network failure'); });
  await assert.rejects(releaseEscrowMilestoneTranche(params), /Network/);
  mock.mock.mockImplementation(async () => Response.json({ released: true, escrowTransferId: 'tr_real' }));
  assert.equal((await releaseEscrowMilestoneTranche(params)).escrowTransferId, 'tr_real');
});

test('typed entitlement helper attaches the current session JWT and handles absent/error states', async (t) => {
  const auth = t.mock.method(supabase.auth, 'getSession', async () => ({ data: { session: { access_token: 'jwt' } } }) as never);
  const mock = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(String(url), '/api/whitelisting/grants?session_id=cs_test_one');
    assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer jwt');
    return Response.json({
      status: 'pending_fulfilment', licenceReference: 'internal-uuid', checkoutSessionId: 'cs_test_one',
      athleteId: 'a', tierId: 't', createdAt: '2026-10-18T00:00:00Z',
    });
  });
  assert.equal((await fetchWhitelistingGrant('cs_test_one')).status, 'pending_fulfilment');
  mock.mock.mockImplementation(async () => Response.json({ error: 'Not authorised' }, { status: 403 }));
  assert.equal((await fetchWhitelistingGrant('cs_test_one')).status, 'error');
  mock.mock.mockImplementation(async () => { throw new Error('Network'); });
  assert.equal((await fetchWhitelistingGrant('cs_test_one')).status, 'error');
  auth.mock.mockImplementation(async () => ({ data: { session: null } }) as never);
  mock.mock.mockImplementation(async (_url, options) => {
    assert.equal(new Headers(options?.headers).has('Authorization'), false);
    return Response.json({
      status: 'pending_fulfilment', licenceReference: null, checkoutSessionId: 'cs_test_one',
      athleteId: 'a', tierId: 't', createdAt: '2026-10-18T00:00:00Z',
    });
  });
  assert.equal((await fetchWhitelistingGrant('cs_test_one')).licenceReference, null);
});
