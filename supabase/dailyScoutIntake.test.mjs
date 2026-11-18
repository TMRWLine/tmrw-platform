import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

test('daily scout intake is private, deduplicated and does not publish athletes', async () => {
  const db = new PGlite();
  const root = new URL('./migrations/', import.meta.url);
  const intake = readFileSync(new URL('20261120000002_20261119_daily_scout_intake.sql', root), 'utf8');
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
      CREATE TABLE public.athletes(id uuid PRIMARY KEY, name text, sport text, current_club text,
        agreement_status text, master_licence_signed boolean, profile_data jsonb, postcode text,
        location text, latitude float, longitude float, follower_count integer,
        nrl_tpa_registered boolean, shute_shield_compliant boolean);
      CREATE TABLE public.sponsors(business_name text, merchant_category text, postcode text);
    `);
    await db.exec(readFileSync(new URL('20261120000001_private_athlete_claims.sql', root), 'utf8'));
    await db.exec(intake);
    const leads = (await db.query('SELECT * FROM public.athlete_leads')).rows;
    assert.equal(leads.length, 3);
    assert.equal(new Set(leads.map(lead => lead.claim_token)).size, 3);
    for (const lead of leads) {
      assert.match(lead.claim_token, /^[a-f0-9-]{36}$/);
      assert.equal(lead.status, 'private');
      assert.equal(lead.is_minor, false);
      assert.ok(lead.where_found.includes(lead.verification_source_url));
      assert.equal(lead.athlete_details.engagement_rate, null);
      assert.equal(lead.athlete_details.follower_count, null);
      assert.deepEqual(lead.public_fields, []);
    }
    await db.exec(intake);
    assert.equal((await db.query('SELECT * FROM public.athlete_leads')).rows.length, 3);
    assert.equal((await db.query('SELECT * FROM public.athletes')).rows.length, 0);
    assert.equal((await db.query("SELECT relrowsecurity FROM pg_class WHERE oid = 'public.athlete_leads'::regclass")).rows[0].relrowsecurity, true);
    assert.equal((await db.query("SELECT * FROM pg_policies WHERE tablename = 'athlete_leads'")).rows.length, 0);
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      await assert.rejects(db.query('SELECT * FROM public.athlete_leads'), /permission denied/);
      await assert.rejects(db.query("INSERT INTO public.athlete_leads(full_name) VALUES ('Denied')"), /permission denied/);
      await db.exec('RESET ROLE');
    }
    await db.exec(`DELETE FROM public.athlete_leads;
      INSERT INTO public.athletes(id, name) VALUES (gen_random_uuid(), ' Luca Slade ');
      INSERT INTO public.athlete_leads(full_name) VALUES ('Zak Taibi');`);
    await db.exec(intake);
    assert.deepEqual((await db.query('SELECT full_name FROM public.athlete_leads ORDER BY full_name')).rows.map(row => row.full_name), ["Sophia Lafaiali'i", 'Zak Taibi']);
    console.log('PASS: three private scouts; unique tokens; null metrics; no publication; replay/roster/alias dedupe; RLS and role denial');
  } finally {
    await db.close();
  }
});
