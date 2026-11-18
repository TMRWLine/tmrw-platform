import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

test('private athlete claim migration enforces consent and publication choices', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    INSERT INTO auth.users VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
    CREATE TABLE public.athletes(id uuid PRIMARY KEY, name text NOT NULL, sport text, current_club text,
     agreement_status text DEFAULT 'no_agreement', master_licence_signed boolean DEFAULT false,
     profile_data jsonb, postcode text, location text, latitude float, longitude float,
     follower_count integer, nrl_tpa_registered boolean, shute_shield_compliant boolean);
    CREATE TABLE public.sponsors(business_name text, merchant_category text, postcode text);
    INSERT INTO public.sponsors VALUES ('Example sponsor', 'Cafe', '2042');
    `);
    const root = new URL('./migrations/', import.meta.url);
    await db.exec(readFileSync(new URL('20261119_daily_scout_intake.sql', root), 'utf8'));
    await db.exec(readFileSync(new URL('20261120000001_private_athlete_claims.sql', root), 'utf8'));
    const scalar = async sql => Object.values((await db.query(sql)).rows[0])[0];
    assert.equal(await scalar('SELECT count(*)::int FROM public.athletes'), 0);
    assert.equal(await scalar('SELECT count(*)::int FROM public.athlete_leads'), 6);
    const leads = (await db.query('SELECT * FROM public.athlete_leads ORDER BY id')).rows;
    await db.exec('SET ROLE anon');
    await assert.rejects(db.query('SELECT * FROM public.athlete_leads'), /permission denied/);
    await assert.rejects(db.query("SELECT public.publish_consented_lead('" + leads[0].id + "')"), /permission denied/);
    const preview = await scalar("SELECT public.preview_athlete_claim('" + leads[0].claim_token + "')");
    assert.equal(preview.full_name, leads[0].full_name);
    assert.equal(preview.sponsors.length, 1);
    assert.ok(!('claim_token' in preview));
    assert.ok(!('claimed_by' in preview));
    const emptyPreview = await scalar("SELECT public.preview_athlete_claim('" + leads[2].claim_token + "')");
    assert.deepEqual(emptyPreview.sponsors, []);
    await assert.rejects(db.query("SELECT public.preview_athlete_claim('00000000-0000-0000-0000-000000000000')"), /unavailable/);
    console.log('PASS: migration moves six scouts; anon table/helper denied; token preview limits data and supports empty sponsors');
    await db.exec("RESET ROLE; SET request.jwt.claim.sub = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'; SET ROLE authenticated");
    const claim = (lead, dob = '2000-01-01', guardian = null, consent = true, fields = ['sport'], details = { full_name: 'Edited name', sport: 'Basketball', bio: 'Private bio' }) => db.query(
     'SELECT public.claim_athlete_profile($1::uuid,$2::jsonb,$3::text[],$4::date,false,$5::text,true,$6::boolean,true) AS result',
     [lead.claim_token, JSON.stringify(details), fields, dob, guardian, consent]);
    await assert.rejects(claim(leads[0], '2000-01-01', null, false), /consents/);
    await assert.rejects(claim(leads[0], '2030-01-01'), /date of birth/);
    await assert.rejects(claim(leads[0], '2015-01-01'), /Guardian email/);
    await assert.rejects(claim(leads[0], '2000-01-01', null, true, ['guardian_email']), /Unknown public field/);
    assert.equal((await claim(leads[0])).rows[0].result.status, 'consented');
    await assert.rejects(claim(leads[0]), /already claimed/);
    await db.exec('RESET ROLE');
    const published = (await db.query('SELECT * FROM public.athletes')).rows[0];
    assert.equal(published.name, 'Athlete'); assert.equal(published.current_club, null);
    assert.equal(published.master_licence_signed, false);
    assert.deepEqual(published.profile_data, { sport: 'Basketball', intake_status: 'consented' });
    await db.exec('SET ROLE authenticated');
    assert.equal((await claim(leads[1], '2015-01-01', 'parent@example.com')).rows[0].result.status, 'pending_guardian');
    await db.exec('RESET ROLE');
    assert.equal(await scalar('SELECT count(*)::int FROM public.athletes'), 1);
    const guardianToken = await scalar("SELECT guardian_token FROM public.athlete_leads WHERE id = '" + leads[1].id + "'");
    await db.exec('SET ROLE anon');
    await assert.rejects(db.query("SELECT public.consent_claim_guardian('" + guardianToken + "',false)"), /consent required/);
    await db.query("SELECT public.consent_claim_guardian('" + guardianToken + "',true)");
    await assert.rejects(db.query("SELECT public.consent_claim_guardian('" + guardianToken + "',true)"), /unavailable/);
    await db.exec('RESET ROLE');
    assert.equal(await scalar('SELECT count(*)::int FROM public.athletes'), 2);
    console.log('PASS: adult field allowlist, false licence, consent/DOB validation, minor guardian gate and single-use guardian token');
    await db.exec('SET ROLE anon');
    await db.query("SELECT public.decline_athlete_claim('" + leads[0].claim_token + "')");
    await db.query("SELECT public.unsubscribe_athlete_claim('" + leads[1].claim_token + "')");
    await db.exec('RESET ROLE');
    assert.equal(await scalar('SELECT count(*)::int FROM public.athletes'), 0);
    assert.equal(await scalar("SELECT count(*)::int FROM public.athlete_leads WHERE id = '" + leads[0].id + "'"), 0);
    const marker = (await db.query("SELECT * FROM public.athlete_leads WHERE status = 'unsubscribed'")).rows[0];
    for (const f of ['full_name','club','sport','league','claimed_by','guardian_email','guardian_token','date_of_birth']) assert.equal(marker[f], null, f);
    assert.deepEqual(marker.athlete_details, {});
    console.log('PASS: decline deletes record; unsubscribe removes publication and retains no personal fields');
    const clearedDetails = [
      { sport: '', league: '', club: '' },
      { sport: '  ', league: '  ', club: '  ' },
      { sport: null, league: null, club: null },
    ];
    for (const [i, details] of clearedDetails.entries()) {
      await db.exec('SET ROLE authenticated');
      await claim(leads[i + 2], '2000-01-01', null, true, ['sport', 'league', 'club'], details);
      await db.exec('RESET ROLE');
      const stored = (await db.query('SELECT sport, league, club FROM public.athlete_leads WHERE id = $1', [leads[i + 2].id])).rows[0];
      assert.deepEqual(stored, { sport: null, league: null, club: null });
      const row = (await db.query('SELECT sport, current_club, profile_data FROM public.athletes WHERE id = $1', [leads[i + 2].id])).rows[0];
      assert.deepEqual(row, { sport: null, current_club: null, profile_data: { intake_status: 'consented' } });
    }
    await db.exec('SET ROLE authenticated');
    await claim(leads[5], '2015-01-01', 'parent@example.com', true, ['sport', 'league', 'club'], clearedDetails[0]);
    await db.exec('RESET ROLE');
    const clearedGuardianToken = await scalar("SELECT guardian_token FROM public.athlete_leads WHERE id = '" + leads[5].id + "'");
    await db.exec('SET ROLE anon');
    await db.query("SELECT public.consent_claim_guardian('" + clearedGuardianToken + "',true)");
    await db.exec('RESET ROLE');
    const clearedMinor = (await db.query('SELECT sport, current_club, profile_data FROM public.athletes WHERE id = $1', [leads[5].id])).rows[0];
    assert.deepEqual(clearedMinor, { sport: null, current_club: null, profile_data: { intake_status: 'consented' } });
    console.log('PASS: empty, whitespace and null public research fields stay cleared for adult and guardian publication');
  } finally {
    await db.close();
  }
});
