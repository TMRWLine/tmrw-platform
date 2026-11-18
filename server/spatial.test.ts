import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchAthletes, fetchAthletesNearby, fetchAthletesByTier, fetchNearbySponsors, fetchSponsorsByRadius, ROSTER_ORIGIN } from '../src/api';
import { SPATIAL_TIERS } from '../src/types';
import { ROSTER_SPECIMENS } from '../src/data/roster';
import { supabase, isSupabaseConfigured } from '../src/lib/supabaseClient';
import { supabase as duplicate } from '../src/lib/supabase';
import { haversineMeters, withTimeout } from '../src/lib/spatial';

test('offline singleton and bundled spatial queries never use the network', async () => {
  assert.equal(isSupabaseConfigured, false);
  assert.equal(supabase, duplicate);
  const fetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Unexpected network call'); };
  try {
    const { error } = await supabase.from('athletes').select('*');
    assert.equal(error?.code, 'OFFLINE');
    const all = await fetchAthletes();
    assert.equal(all.length, ROSTER_SPECIMENS.length);
    const near = await fetchAthletesNearby(25);
    const wider = await fetchAthletesNearby(50);
    assert.ok(near.length > 0 && near.length < wider.length && wider.length < all.length);
    assert.ok(near.every((row) => row.distance_km! <= 25));
    assert.deepEqual(await fetchAthletesNearby(0), []);
    assert.deepEqual(await fetchAthletesNearby(-1), []);
    assert.deepEqual(await fetchAthletesNearby(50, NaN), []);
    for (const tier of SPATIAL_TIERS) {
      const rows = await fetchAthletesByTier(tier);
      assert.ok(rows.every((row) => row.distance_km! >= tier.minKm && row.distance_km! <= (tier.maxKm ?? Infinity)));
    }
    const response = await fetchNearbySponsors(all[0].id);
    assert.ok(response.athlete);
    assert.ok(response.matches.length > 0);
    assert.ok(response.matches.every((row) => row.distance_meters <= row.target_radius_meters));
    assert.deepEqual((await fetchNearbySponsors(all[0].id, 0)).matches, []);
    assert.deepEqual(await fetchNearbySponsors('unknown'), { athlete: null, matches: [] });
    assert.deepEqual(await fetchNearbySponsors(''), { athlete: null, matches: [] });
    const sponsors = await fetchSponsorsByRadius({ ...response.athlete!, lat: ROSTER_ORIGIN.lat, lng: ROSTER_ORIGIN.lng }, 25);
    assert.ok(sponsors.length > 0);
    assert.ok(sponsors.every((row) => row.distance_km <= 25));
    all[0].name = 'mutated';
    assert.notEqual((await fetchAthletes())[0].name, 'mutated');
  } finally { globalThis.fetch = fetch; }
});

test('haversine uses WGS84 lat/lng and metres', () => {
  assert.equal(haversineMeters(0, 0, 0, 0), 0);
  assert.ok(Math.abs(haversineMeters(0, 0, 0, 1) - 111194.93) < 1);
  assert.ok(Math.abs(haversineMeters(-33.8688, 151.2093, -37.8136, 144.9631) / 1000 - 713.4) < 1);
  assert.equal(haversineMeters(null, 0, 0, 0), Infinity);
  assert.equal(haversineMeters(151, -33, 151, -34), Infinity);
  assert.ok(Number.isFinite(haversineMeters(0, 0, 0, 180)));
});

test('timeout wrapper handles success, empty data, rejection and hung requests', async () => {
  assert.deepEqual(await withTimeout(Promise.resolve([])), []);
  assert.equal(await withTimeout(Promise.resolve('ok')), 'ok');
  await assert.rejects(withTimeout(Promise.reject(new Error('offline'))), /offline/);
  await assert.rejects(withTimeout(new Promise(() => {}), 5), /timed out/);
});
