import { after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

process.env.TWELVELABS_API_KEY = '';
process.env.VITE_TWELVELABS_API_KEY = '';
const { default: app } = await import('../api/index.js');
const server = app.listen(0);
await new Promise((resolve) => server.once('listening', resolve));
after(() => new Promise((resolve) => server.close(resolve)));
const base = `http://127.0.0.1:${server.address().port}/api/twelvelabs`;
const nativeFetch = globalThis.fetch;
beforeEach(() => {
  process.env.TWELVELABS_API_KEY = '';
  process.env.VITE_TWELVELABS_API_KEY = '';
});
const post = (path, body) => nativeFetch(base + path, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

test('unconfigured proxy returns clear 503 JSON without upstream calls', async (t) => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected upstream call'); });
  for (const path of ['/status', '/indexes/i/videos/v']) {
    const response = await nativeFetch(base + path);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'TwelveLabs is not configured', configured: false });
  }
  for (const path of ['/indexes', '/search', '/uploads?index_id=i']) {
    assert.equal((await post(path, {})).status, 503);
  }
});

test('fixed proxy operations send server credentials and project only safe fields', async (t) => {
  const key = 'local-test-credential';
  process.env.TWELVELABS_API_KEY = key;
  const paths = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.headers['x-api-key'], key);
    assert.ok(url.startsWith('https://api.twelvelabs.io/v1.3/'));
    paths.push(new URL(url).pathname);
    let body = { _id: 'index_123', api_key: key };
    if (url.endsWith('/uploads')) {
      assert.ok(options.body instanceof FormData);
      assert.equal(options.body.get('index_id'), 'index_123');
      assert.equal(await options.body.get('video_file').text(), 'video');
      assert.equal(options.headers['Content-Type'], undefined);
      body = { _id: 'video_123', api_key: key };
    } else if (url.includes('/videos/')) {
      body = { system_metadata: { ready: true, status: 'ready', secret: key }, secret: key };
    } else if (url.endsWith('/search')) {
      assert.deepEqual(JSON.parse(options.body), { index_id: 'index_123', query: 'try', search_options: ['visual', 'audio'] });
      body = { data: [{ start: 10, end: 12, text: `Sample ${key}`, score: 0.9, secret: key }], secret: key };
    }
    return Response.json(body);
  });
  assert.deepEqual(await (await nativeFetch(base + '/status')).json(), { configured: true });
  assert.deepEqual(await (await post('/indexes', { index_name: 'Athlete footage', api_key: 'ignored' })).json(), { _id: 'index_123' });
  const upload = await nativeFetch(base + '/uploads?index_id=index_123', {
    method: 'POST', headers: { 'Content-Type': 'video/mp4' }, body: 'video',
  });
  assert.deepEqual(await upload.json(), { _id: 'video_123' });
  assert.deepEqual(await (await nativeFetch(base + '/indexes/index_123/videos/video_123')).json(), { system_metadata: { status: 'ready', ready: true } });
  const search = await post('/search', { index_id: 'index_123', query: 'try' });
  const text = await search.text();
  assert.equal(search.status, 200);
  assert.doesNotMatch(text, /local-test-credential|api_key|secret/);
  assert.deepEqual(JSON.parse(text).clips, [{ start: 10, end: 12, text: 'Sample [redacted]', confidence: 0.9 }]);
  assert.equal(paths.length, 4);
});

test('invalid, empty and oversized bodies are rejected before upstream fetch', async (t) => {
  process.env.TWELVELABS_API_KEY = 'local-test-credential';
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected upstream call'); });
  for (const body of [null, {}, [], { index_name: '' }, { index_name: 'x'.repeat(201) }]) {
    assert.equal((await post('/indexes', body)).status, 400);
  }
  for (const body of [{}, { index_id: '../private', query: 'try' }, { index_id: 'i', query: '' }, { index_id: 'i', query: 'x'.repeat(2001) }]) {
    assert.equal((await post('/search', body)).status, 400);
  }
  assert.equal((await post('/indexes', { index_name: 'x'.repeat(65536) })).status, 413);
  for (const [query, body] of [['index_id=../private', 'video'], ['index_id=i', '']]) {
    assert.equal((await nativeFetch(base + '/uploads?' + query, {
      method: 'POST', headers: { 'Content-Type': 'video/mp4' }, body,
    })).status, 400);
  }
  const large = await nativeFetch(base + '/uploads?index_id=i', {
    method: 'POST', headers: { 'Content-Type': 'video/mp4' }, body: Buffer.alloc(4 * 1024 * 1024 + 1),
  });
  assert.equal(large.status, 413);
});

test('upstream failures are sanitised and the 10-second deadline returns 504', async (t) => {
  process.env.TWELVELABS_API_KEY = 'local-test-credential';
  const timeout = AbortSignal.timeout.bind(AbortSignal);
  t.mock.method(AbortSignal, 'timeout', (ms) => {
    assert.equal(ms, 10000);
    return timeout(5);
  });
  const mock = t.mock.method(globalThis, 'fetch', async (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.throwIfAborted();
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  }));
  const response = await post('/indexes', { index_name: 'Footage' });
  assert.equal(response.status, 504);
  assert.deepEqual(await response.json(), { error: 'TwelveLabs request timed out' });
  mock.mock.mockImplementation(async () => new Response('local-test-credential', { status: 401 }));
  const failure = await post('/indexes', { index_name: 'Footage' });
  assert.equal(failure.status, 502);
  assert.deepEqual(await failure.json(), { error: 'TwelveLabs request failed' });
  mock.mock.mockImplementation(async () => Response.json({ debug: 'local-test-credential' }));
  assert.equal((await post('/indexes', { index_name: 'Footage' })).status, 502);
});

test('legacy configuration is server-only and emits a value-free deprecation warning', async (t) => {
  process.env.VITE_TWELVELABS_API_KEY = 'legacy-test-credential';
  const warning = t.mock.method(console, 'warn', () => {});
  const response = await nativeFetch(base + '/status');
  assert.equal(response.status, 200);
  assert.equal(warning.mock.calls.length, 1);
  assert.match(warning.mock.calls[0].arguments[0], /deprecated/);
  assert.doesNotMatch(warning.mock.calls[0].arguments[0], /legacy-test-credential/);
  assert.deepEqual(await response.json(), { configured: true });
});
