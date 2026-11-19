import assert from 'node:assert/strict';
import test from 'node:test';
import { assetImageSources } from '../src/components/AssetImage.tsx';

test('image fallbacks preserve absolute URLs and try each distinct source only once', () => {
  const remote = 'https://images.unsplash.com/example.jpg';
  assert.deepEqual(assetImageSources('local.jpg', [remote, '/local.jpg', remote, 'last.jpg']), [
    '/local.jpg', remote, '/last.jpg',
  ]);
  assert.deepEqual(assetImageSources(undefined, []), ['/placeholder.jpg']);
});
