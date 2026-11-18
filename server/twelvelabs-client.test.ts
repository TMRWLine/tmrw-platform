import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createIndex, isTwelveLabsConfigured, uploadVideo, waitForIndexReady, detectKeyEvents, ingestMatchFootage } from '../src/lib/twelvelabs';

import { supabase } from '../src/lib/supabaseClient';

beforeEach((t) => {
  t.mock.method(supabase.auth, 'getSession', async () => ({ data: { session: { access_token: 'user-session' } }, error: null }) as never);
});

test('client uses relative proxy URLs and the current JWT, never the upstream credential', async (t) => {
  const urls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.ok(String(url).startsWith('/api/twelvelabs/'));
    assert.ok(options?.signal instanceof AbortSignal);
    assert.equal(new Headers(options?.headers).has('x-api-key'), false);
    assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer user-session');
    urls.push(String(url));
    if (String(url).endsWith('/status')) return Response.json({ configured: true });
    if (String(url).endsWith('/search')) return Response.json({ clips: [] });
    if (String(url).includes('/videos/')) return Response.json({ system_metadata: { ready: true } });
    return Response.json({ _id: 'id_123' });
  });
  assert.equal(await isTwelveLabsConfigured(), true);
  assert.equal(await createIndex('footage'), 'id_123');
  assert.equal(await uploadVideo('i', new File(['video'], 'test.mp4', { type: 'video/mp4' })), 'id_123');
  await waitForIndexReady('i', 'v');
  assert.deepEqual(await detectKeyEvents('i', 'v', 'rugby'), []);
  assert.ok(urls.includes('/api/twelvelabs/uploads?index_id=i'));
});

test('unavailable configuration and timed-out requests retain the sample fallback path', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'TwelveLabs is not configured' }, { status: 503 }));
  assert.equal(await isTwelveLabsConfigured(), false);
  await assert.rejects(createIndex('footage'), /using sample data/);
  mock.mock.mockImplementation(async () => { throw new DOMException('timeout', 'TimeoutError'); });
  assert.equal(await isTwelveLabsConfigured(), false);
  await assert.rejects(createIndex('footage'), { name: 'TimeoutError' });
  await assert.rejects(uploadVideo('i', new File([], 'empty.mp4')), /up to 4 MiB/);
  await assert.rejects(uploadVideo('i', new File(['x'], 'not-video.txt', { type: 'text/plain' })), /up to 4 MiB/);
});

test('empty, invalid and oversized files are rejected before creating any index', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Must not fetch'); });
  for (const file of [new File([], 'empty.mp4', { type: 'video/mp4' }), new File(['x'], 'bad.txt', { type: 'text/plain' }), new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'large.mp4', { type: 'video/mp4' })]) {
    await assert.rejects(ingestMatchFootage(file, { id: 'athlete' } as never), /up to 4 MiB/);
  }
  assert.equal(mock.mock.calls.length, 0);
});

test('polling retries 503 then succeeds, but fails fast on permanent 4xx', async (t) => {
  let polls = 0;
  const mock = t.mock.method(globalThis, 'fetch', async () => ++polls === 1
    ? new Response(null, { status: 503 }) : Response.json({ system_metadata: { ready: true } }));
  await waitForIndexReady('i', 'v', undefined, 2000);
  assert.equal(polls, 2);
  mock.mock.mockImplementation(async () => new Response(null, { status: 401 }));
  await assert.rejects(waitForIndexReady('i', 'v'), /Permanent/);
});

test('search uses at most two concurrent prompts and retains partial success, including empty results', async (t) => {
  let active = 0, maximum = 0;
  const mock = t.mock.method(globalThis, 'fetch', async (_url, options) => {
    active++; maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active--;
    return JSON.parse(String(options?.body)).query.includes('try')
      ? Response.json({ clips: [{ start: 1, end: 3, text: 'try', confidence: 0.9 }] })
      : new Response(null, { status: 503 });
  });
  assert.equal((await detectKeyEvents('i', 'v', 'rugby')).length, 1);
  assert.equal(maximum, 2);
  mock.mock.mockImplementation(async () => Response.json({ clips: [] }));
  assert.deepEqual(await detectKeyEvents('i', 'v', 'rugby'), []);
  mock.mock.mockImplementation(async () => new Response(null, { status: 503 }));
  await assert.rejects(detectKeyEvents('i', 'v', 'rugby'), /sample/);
});

test('missing session and proxy 401/503 preserve honest sample fallback', async (t) => {
  const mock = t.mock.method(supabase.auth, 'getSession', async () => ({ data: { session: null }, error: null }) as never);
  const calls = t.mock.method(globalThis, 'fetch', async () => Response.json({}, { status: 401 }));
  assert.equal(await isTwelveLabsConfigured(), false);
  await assert.rejects(createIndex('test'), /sample/);
  assert.equal(calls.mock.calls.length, 0);
  mock.mock.mockImplementation(async () => ({ data: { session: { access_token: 'jwt' } }, error: null }) as never);
  for (const status of [401, 503]) {
    calls.mock.mockImplementation(async () => new Response(null, { status }));
    await assert.rejects(createIndex('test'), /sample/);
  }
});
