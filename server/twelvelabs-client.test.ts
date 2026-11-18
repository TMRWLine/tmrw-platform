import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createIndex, isTwelveLabsConfigured, uploadVideo, waitForIndexReady, detectKeyEvents } from '../src/lib/twelvelabs';

test('client uses relative proxy URLs and no credential headers', async (t) => {
  const urls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.ok(String(url).startsWith('/api/twelvelabs/'));
    assert.ok(options?.signal instanceof AbortSignal);
    assert.equal(new Headers(options?.headers).has('x-api-key'), false);
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
