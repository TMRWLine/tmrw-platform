import assert from 'node:assert/strict';
import test from 'node:test';
import { readCoverConcept } from '../src/lib/coverConcept.ts';

test('only supported cover opt-ins select a different homepage', () => {
  for (const id of ['a', 'c', 'ac']) assert.equal(readCoverConcept(`?concept=${id}`), id);
  for (const query of ['', '?concept=b', '?concept=unknown', '?other=ac']) {
    assert.equal(readCoverConcept(query), null);
  }
});
