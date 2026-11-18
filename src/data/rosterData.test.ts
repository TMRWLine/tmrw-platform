import assert from 'node:assert/strict';
import test from 'node:test';
import { COMMERCIAL_ROSTER, DATABASE_ROSTER, isCommercialAthlete } from './rosterData';
import { ROSTER_DATA, recordFor } from './roster';
import { eligibleAthletesForPackage } from './mockDeliverables';

test('client roster contains no private scout records', () => {
  assert.ok(DATABASE_ROSTER.length > 0);
  assert.ok(DATABASE_ROSTER.every((record) => !('intake_status' in record) || record.intake_status === 'commercial'));
  assert.equal(new Set(DATABASE_ROSTER.map((record) => record.id)).size, DATABASE_ROSTER.length);
  assert.deepEqual(DATABASE_ROSTER, COMMERCIAL_ROSTER);
});

test('commercial projections retain complete records and handle empty or unknown lookups', () => {
  assert.deepEqual(ROSTER_DATA.map((record) => record.id), COMMERCIAL_ROSTER.map((record) => record.id));
  assert.ok(COMMERCIAL_ROSTER.every(isCommercialAthlete));
  assert.deepEqual([].filter(isCommercialAthlete), []);
  assert.equal(recordFor('unknown-athlete'), null);
  assert.deepEqual(eligibleAthletesForPackage('unknown-package'), []);
});
