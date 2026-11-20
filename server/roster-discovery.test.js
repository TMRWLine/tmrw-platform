import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EMPTY_ROSTER_FILTERS,
  matchesRosterDiscovery,
  readRosterDiscovery,
  ROSTER_DATA,
  writeRosterDiscovery,
} from '../src/data/roster.ts';

const catalogue = ROSTER_DATA.map(({ record }) => record);
const match = (record, filters) => matchesRosterDiscovery(record, { ...EMPTY_ROSTER_FILTERS, ...filters });
const search = (filters) => catalogue.filter((record) => match(record, filters));

test('each competition uses explicit league names, not sport, location, or clearance', () => {
  const cases = [
    ['nbl1', 'NBL1 North', 'NCAA Basketball', 'Basketball'],
    ['shute', 'Shute Shield Premier', 'NSW Cup', 'Rugby League'],
    ['vfl', 'Smithy’s VFL', 'VFLW', 'Australian Rules'],
    ['vfl', 'Victorian Football League', 'SANFL', 'Australian Rules'],
    ['qld', 'Hospital Cup', 'Queensland Swimming', 'Swimming'],
    ['qld', 'Queensland Premier Rugby', 'Queensland Premier Cricket', 'Cricket'],
  ];
  for (const [competition, member, nonMember, sport] of cases) {
    const location = { ...catalogue[0], postcode: '4000', current_club: 'Brisbane', shute_shield_compliant: true };
    assert.ok(match({ ...location, league: member }, { competition }), member);
    assert.ok(!match({ ...location, league: nonMember, sport }, { competition }), nonMember);
  }
  assert.deepEqual(search({ competition: 'qld' }), []);
});

test('search includes all catalogue profiles and supports names, club and league aliases', () => {
  assert.deepEqual(search({}), catalogue);
  assert.deepEqual(search({ query: '  THORNE, M.  ' }).map(({ id }) => id), [catalogue[0].id]);
  assert.deepEqual(search({ query: 'Bankstown BRUINS' }).map(({ id }) => id), [catalogue[0].id]);
  assert.ok(search({ query: 'Victorian Football League' }).every(({ league }) => league === 'VFL State League'));
  assert.ok(search({ query: 'Victorian Football League' }).length > 0);
});

test('NBL1 searches distinguish divisions without narrowing the competition filter', () => {
  const competition = 'nbl1';
  const east = search({ competition, query: 'NBL1 East' });
  const south = search({ competition, query: 'NBL1 South' });
  assert.deepEqual(east.map(({ league }) => league), ['NBL1 East', 'NBL1 East']);
  assert.deepEqual(south.map(({ league }) => league), ['NBL1 South']);
  assert.deepEqual(search({ query: 'NBL1 West' }), []);
  assert.deepEqual(search({ query: 'NBL1 Basketball' }), search({ competition }));
});

test('Catchment combines with competition and requires an exact four-digit postcode', () => {
  const expected = search({ catchment: '2200' });
  assert.deepEqual(expected.map(({ postcode }) => postcode), ['2200']);
  assert.deepEqual(search({ catchment: '  BANKSTOWN ', competition: 'nbl1' }), expected);
  assert.deepEqual(search({ catchment: '2200', competition: 'shute' }), []);
  assert.deepEqual(search({ catchment: '22' }), []);
  assert.deepEqual(search({ catchment: '-' }), []);
  assert.deepEqual(search({ query: '2200' }), expected);
  assert.deepEqual(search({ query: 'NBL1 22' }), []);
  assert.ok(match({ ...catalogue[0], postcode: '0800' }, { catchment: '0800' }));
});

test('roster links round-trip filters without changing unrelated URL parameters', () => {
  const filters = { query: 'Marcus Thorne', competition: 'nbl1', catchment: 'Bankstown' };
  const params = writeRosterDiscovery(filters, new URLSearchParams({ athlete: catalogue[0].id }));
  assert.deepEqual(readRosterDiscovery(params), filters);
  assert.equal(writeRosterDiscovery(EMPTY_ROSTER_FILTERS, params).toString(), `athlete=${catalogue[0].id}`);
  assert.deepEqual(readRosterDiscovery(new URLSearchParams({ competition: 'invalid' })), EMPTY_ROSTER_FILTERS);
});
