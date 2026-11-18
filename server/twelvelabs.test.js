import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createServer } from 'node:http';
import { createTwelveLabsRouter } from './twelvelabs.js';

const KEY = 'test-only-private-provider-canary';
const originalFetch = globalThis.fetch;

async function fixture(run, options = {}) {
  const names = ['TWELVELABS_API_KEY', 'VITE_TWELVELABS_API_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  process.env.TWELVELABS_API_KEY = KEY;
  process.env.SUPABASE_URL = 'https://fixture.invalid';
  process.env.SUPABASE_ANON_KEY = 'test-only-public-anon';
  delete process.env.VITE_TWELVELABS_API_KEY;
  const calls = [];
  const auth = [];
  let validUser = true;
  let respond = () => Response.json({ _id: 'index_1', private_field: KEY });
  globalThis.fetch = async (url, init) => {
    const href = String(url);
    if (href.startsWith('https://fixture.invalid/auth/v1/user')) {
      auth.push(init);
      return validUser ? Response.json({ id: 'user_1' }) : Response.json({ error: KEY }, { status: 401 });
    }
    if (href.startsWith('https://api.twelvelabs.io/v1.3/')) {
      calls.push({ url: href, init });
      return respond();
    }
    return originalFetch(url, init);
  };
  const app = express();
  app.use('/api/twelvelabs', createTwelveLabsRouter(options));
  app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: 'Rejected body' }));
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const request = (path, init = {}) => originalFetch(`http://127.0.0.1:${server.address().port}/api/twelvelabs${path}`, init);
  const post = (path, body = { index_name: 'fixture' }, headers = {}) => request(path, {
    method: 'POST', headers: { Authorization: 'Bearer test-user', 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
  });
  try {
    await run({ request, post, calls, auth, invalidUser: () => { validUser = false; }, respond: (fn) => { respond = fn; } });
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

test('missing server configuration and legacy browser configuration never spend provider credit', () => fixture(async ({ post, calls }) => {
  delete process.env.TWELVELABS_API_KEY;
  process.env.VITE_TWELVELABS_API_KEY = KEY;
  const response = await post('/indexes');
  assert.equal(response.status, 503);
  assert.equal((await response.json()).configured, false);
  assert.equal(calls.length, 0);
}));

test('anonymous and invalid bearer tokens cannot reach the provider', () => fixture(async ({ request, post, invalidUser, calls }) => {
  assert.equal((await request('/status')).status, 200);
  assert.equal((await request('/indexes', { method: 'POST' })).status, 401);
  invalidUser();
  const response = await post('/indexes');
  assert.equal(response.status, 401);
  assert.ok(!(await response.text()).includes(KEY));
  assert.equal(calls.length, 0);
}));

test('verified requests use only the server key, fixed origin, safe projections and no redirects', () => fixture(async ({ post, calls }) => {
  const response = await post('/indexes', { index_name: ' fixture ', models: [{ model_name: 'untrusted' }] }, { 'x-api-key': 'caller-controlled' });
  assert.deepEqual(await response.json(), { _id: 'index_1' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.twelvelabs.io/v1.3/indexes');
  assert.equal(calls[0].init.headers['x-api-key'], KEY);
  assert.equal(calls[0].init.redirect, 'error');
  assert.equal(JSON.parse(calls[0].init.body).models[0].model_name, 'marengo2.7');
  assert.ok(calls[0].init.signal instanceof AbortSignal);
}));

test('invalid paths, identifiers and input sizes do not reach the upstream', () => fixture(async ({ request, post, calls }) => {
  assert.equal((await post('/indexes', { index_name: '' })).status, 400);
  assert.equal((await post('/search', { index_id: '../host', query: 'find' })).status, 400);
  assert.equal((await request('/indexes/bad.id/videos/video_1', { headers: { Authorization: 'Bearer test-user' } })).status, 400);
  assert.equal((await post('/indexes', { index_name: 'x'.repeat(70000) })).status, 413);
  assert.equal(calls.length, 0);
}));

test('small video uploads are rebuilt as multipart server-side and oversized uploads are rejected', () => fixture(async ({ request, calls }) => {
  const upload = (bytes) => request('/uploads?index_id=index_1', {
    method: 'POST', headers: { Authorization: 'Bearer test-user', 'Content-Type': 'video/mp4' }, body: bytes,
  });
  assert.equal((await upload(Buffer.from('fixture'))).status, 200);
  assert.equal(calls[0].init.body.get('index_id'), 'index_1');
  assert.equal(calls[0].init.body.get('video_file').size, 7);
  assert.equal((await upload(Buffer.alloc(4 * 1024 * 1024 + 1))).status, 413);
  assert.equal(calls.length, 1);
}));

test('provider errors, timeouts, malformed and oversized bodies never expose its credential', () => fixture(async ({ post, respond }) => {
  for (const [make, status] of [
    [() => new Response(KEY, { status: 401 }), 502],
    [() => { throw new DOMException(KEY, 'TimeoutError'); }, 504],
    [() => { throw new TypeError(KEY); }, 502],
    [() => new Response(KEY), 502],
    [() => new Response('x'.repeat(2 * 1024 * 1024 + 1)), 502],
    [() => new Response('{}', { headers: { 'content-length': String(3 * 1024 * 1024) } }), 502],
  ]) {
    respond(make);
    const response = await post('/indexes');
    assert.equal(response.status, status);
    assert.ok(!(await response.text()).includes(KEY));
  }
}));

test('search output is bounded and removes credentials even from otherwise allowed strings', () => fixture(async ({ post, respond }) => {
  respond(() => Response.json({ clips: Array.from({ length: 1005 }, () => ({ start: 1, end: 2, text: KEY, private: KEY })) }));
  const response = await post('/search', { index_id: 'index_1', query: 'goal' });
  const body = await response.text();
  assert.ok(!body.includes(KEY));
  const data = JSON.parse(body);
  assert.equal(data.clips.length, 1000);
  assert.equal(data.clips[0].text, '[redacted]');
  assert.equal(data.clips[0].private, undefined);
}));

test('untrusted forwarding headers cannot evade pre-authentication throttling', () => fixture(async ({ post, invalidUser, auth, calls }) => {
  invalidUser();
  for (let i = 0; i < 2; i++) assert.equal((await post('/indexes', {}, { 'X-Forwarded-For': `192.0.2.${i}` })).status, 401);
  const response = await post('/indexes', {}, { 'X-Forwarded-For': '192.0.2.99' });
  assert.equal(response.status, 429);
  assert.ok(Number(response.headers.get('retry-after')) > 0);
  assert.equal(auth.length, 2);
  assert.equal(calls.length, 0);
}, { clientLimit: 2 }));

test('a shared provider budget bounds authenticated upstream traffic', () => fixture(async ({ post, calls }) => {
  assert.equal((await post('/indexes')).status, 200);
  assert.equal((await post('/indexes')).status, 200);
  assert.equal((await post('/indexes')).status, 429);
  assert.equal(calls.length, 2);
}, { providerLimit: 2 }));
