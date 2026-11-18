import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { COMMERCIAL_ROSTER, DATABASE_ROSTER, isCommercialAthlete } from './rosterData';
import { ROSTER_DATA, ROSTER_SPECIMENS, recordFor } from './roster';
import { eligibleAthletesForPackage } from './mockDeliverables';

test('scout intake has unique identities and matching SQL source evidence', () => {
  const migration = readFileSync(new URL('../../supabase/migrations/20261119_daily_scout_intake.sql', import.meta.url), 'utf8')
    .replace(/\s+/g, ' ');
  const scouts = DATABASE_ROSTER.filter((record) => record.intake_status === 'scouted');
  assert.equal(scouts.length, 6);
  assert.equal(new Set(DATABASE_ROSTER.map((record) => record.id)).size, DATABASE_ROSTER.length);
  assert.equal(new Set(DATABASE_ROSTER.map((record) => record.full_name.toLowerCase())).size, DATABASE_ROSTER.length);
  for (const scout of scouts) {
    assert.equal(new URL(scout.verification_source_url).protocol, 'https:');
    const sqlFields = [scout.full_name, scout.sport, scout.current_club, scout.league, scout.verification_source_url]
      .map((value) => `'${value.replace(/'/g, "''")}'`);
    assert.ok(migration.includes(`('${scout.id}'::uuid, ${sqlFields.join(', ')})`), scout.full_name);
    for (const value of [scout.postcode, scout.radiusKm, scout.image, scout.valuation, scout.tier,
      scout.legal_full_name, scout.agreement_status, scout.master_licence_signed, scout.branding_categories,
      ...Object.values(scout.social), scout.governing_body.sanctioned,
      scout.governing_body.tpa_compliant, scout.governing_body.document_verified]) {
      assert.equal(value, null);
    }
    assert.equal(recordFor(scout.id), null);
    assert.ok(!ROSTER_DATA.some((record) => record.id === scout.id));
    assert.ok(!ROSTER_SPECIMENS.some((record) => record.id === scout.id));
    assert.ok(!eligibleAthletesForPackage('local_merchant').some((record) => record.id === scout.id));
  }
});

test('commercial projections retain complete records and handle empty or unknown lookups', () => {
  assert.deepEqual(ROSTER_DATA.map((record) => record.id), COMMERCIAL_ROSTER.map((record) => record.id));
  assert.ok(COMMERCIAL_ROSTER.every(isCommercialAthlete));
  assert.deepEqual([].filter(isCommercialAthlete), []);
  assert.equal(recordFor('unknown-athlete'), null);
  assert.deepEqual(eligibleAthletesForPackage('unknown-package'), []);
});
