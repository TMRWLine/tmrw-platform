import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createServer } from 'node:http';
import handler from '../api/index.js';
import app from './index.js';

test('Vercel dispatches every API depth to Express without changing the SPA fallback', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.deepEqual(config.rewrites, [
    { source: '/api(/.*)?', destination: '/api/index' },
    { source: '/((?!api(?:/|$)).*)', destination: '/index.html' },
  ]);
  assert.deepEqual(readdirSync(new URL('../api/', import.meta.url)), ['index.js']);
  assert.equal(handler, app);
  const api = new RegExp(`^${config.rewrites[0].source}$`);
  const spa = new RegExp(`^${config.rewrites[1].source}$`);
  for (const path of ['/api', '/api/', '/api/health', '/api/auth/instagram/start', '/api/a/b/c/d', '/api/a/b/']) {
    assert.equal(api.test(path), true, path);
    assert.equal(spa.test(path), false, path);
  }
  for (const path of ['/', '/the-roster', '/checkout/success', '/apiary']) {
    assert.equal(api.test(path), false, path);
    assert.equal(spa.test(path), true, path);
  }
});

test('the Vercel entry handles nested GETs, POST bodies and unknown API paths', async () => {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const health = await fetch(`${base}/api/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { ok: true, service: 'sponsor-match-proxy' });

    const status = await fetch(`${base}/api/twelvelabs/status`);
    const configured = Boolean(process.env.TWELVELABS_API_KEY?.trim());
    assert.equal(status.status, configured ? 200 : 503);
    assert.deepEqual(await status.json(), configured
      ? { configured: true }
      : { error: 'TwelveLabs is not configured', configured: false });

    const grant = await fetch(`${base}/api/checkout/whitelisting-grant`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    assert.equal(grant.status, 400);
    assert.deepEqual(await grant.json(), { error: 'A Stripe Checkout session is required.' });

    const emptyBag = await fetch(`${base}/api/checkout/create-session`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ capsuleItems: [] }),
    });
    assert.equal(emptyBag.status, 400);
    assert.deepEqual(await emptyBag.json(), { error: 'Invalid capsule items' });

    const malformed = await fetch(`${base}/api/checkout/create-session`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
    });
    assert.equal(malformed.status, 400);
    assert.deepEqual(await malformed.json(), { error: 'Invalid request body' });

    for (const path of ['/api', '/api/', '/api/unknown/deep/path']) {
      const unknown = await fetch(base + path);
      assert.equal(unknown.status, 404, path);
      assert.deepEqual(await unknown.json(), { error: 'API route not found' });
    }
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
