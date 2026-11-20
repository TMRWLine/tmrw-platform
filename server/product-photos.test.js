import assert from 'node:assert/strict';
import test from 'node:test';
import { getProductPhotos, stepSpinFrame } from '../src/lib/productPhotos.ts';

test('photo sets expose only published angles and order the full turntable loop', () => {
  assert.deepEqual(getProductPhotos('unpublished', {}), {
    front: undefined, back: undefined, detail: undefined, spin: [],
  });
  const partial = getProductPhotos('tee', { tee: { front: true } });
  assert.equal(partial.front, '/products/tee/front.jpg');
  assert.deepEqual(partial.spin, []);

  const complete = getProductPhotos('tee', { tee: { front: true, back: true, detail: true, spin: true } });
  assert.equal(complete.back, '/products/tee/back.jpg');
  assert.equal(complete.detail, '/products/tee/detail-1.jpg');
  assert.equal(complete.spin.length, 36);
  assert.equal(complete.spin[0], '/products/tee/spin/01.jpg');
  assert.equal(complete.spin[18], '/products/tee/spin/19.jpg');
  assert.equal(complete.spin[35], '/products/tee/spin/36.jpg');
});

test('keyboard and drag rotation wrap in both directions', () => {
  assert.equal(stepSpinFrame(35, 1, 36), 0);
  assert.equal(stepSpinFrame(0, -1, 36), 35);
  assert.equal(stepSpinFrame(3, -41, 36), 34);
});
