import assert from 'node:assert/strict';
import test from 'node:test';
import { athleteInitials } from './formatName';

test('athlete initials preserve supplementary Unicode characters', () => {
  assert.equal(athleteInitials('𠮷 Smith'), '𠮷S');
  assert.equal(athleteInitials('Alex 𠮷'), 'A𠮷');
  assert.equal(athleteInitials('Alex Example Third'), 'AE');
  assert.equal(athleteInitials('  Alex  Example  '), 'AE');
  assert.equal(athleteInitials('Alex\u00a0Example'), 'AE');
  assert.equal(athleteInitials('Alex\tExample'), 'AE');
  assert.equal(athleteInitials('\u00a0𠮷\u00a0Smith\u00a0'), '𠮷S');
  assert.equal(athleteInitials(null), '?');
});
