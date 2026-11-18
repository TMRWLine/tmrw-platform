import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allocateCents, sponsorshipLedger, rctiLine, capsuleLedger } from '../src/lib/commercialLedger.js';

test('sponsorship allocations conserve zero, one, odd and large cent amounts', () => {
  for (const total of [0, 1, 2, 3, 11, 101, 75000, 99999999, Number.MAX_SAFE_INTEGER - 1000000]) {
    const ledger = sponsorshipLedger(total, {}, 'milestone_50_50');
    assert.equal(ledger.athlete70Cents + ledger.club15Cents + ledger.ops15Cents, total);
    assert.equal(ledger.athleteT0AdvanceCents + ledger.athleteEscrowHoldCents, ledger.athlete70Cents);
    assert.ok([ledger.athlete70Cents, ledger.club15Cents, ledger.ops15Cents].every(Number.isSafeInteger));
    assert.equal(ledger.gstCents, 0);
  }
  assert.deepEqual(allocateCents(1, [7000, 1500, 1500]), [1, 0, 0]);
  assert.deepEqual(allocateCents(3, [7000, 1500, 1500]), [2, 1, 0]);
});

test('GST-exclusive RCTI is per payee, with no GST for unregistered recipients', () => {
  const ledger = sponsorshipLedger(10001, {
    athlete: { abn: '51824753556', gstRegistered: true }, club: { gstRegistered: false }, platform: { gstRegistered: true },
  });
  assert.equal(ledger.rctiLines[0].abn, '51824753556');
  assert.equal(ledger.rctiLines[0].gstCents, 700);
  assert.equal(ledger.rctiLines[1].gstCents, 0);
  assert.equal(ledger.gstCents, 850);
  assert.equal(ledger.totalPayableCents, 10851);
  for (const line of ledger.rctiLines) assert.equal(line.netCents + line.gstCents, line.grossCents);
});

test('legacy inclusive GST extracts 1/11 and rejects unsafe values', () => {
  assert.deepEqual(rctiLine(1100, { role: 'club', gstRegistered: true }, true), {
    role: 'club', abn: null, gstRegistered: true, grossCents: 1100, gstCents: 100, netCents: 1000,
  });
  assert.equal(rctiLine(1100, {}, true).gstCents, 0);
  for (const value of [-1, 0.1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => sponsorshipLedger(value), RangeError);
  assert.throws(() => allocateCents(100, [7000, 1500]), RangeError);
  assert.throws(() => rctiLine(Number.MAX_SAFE_INTEGER, { gstRegistered: true }), RangeError);
});

test('capsule net-margin splits retain production costs and exact rounding remainder', () => {
  const empty = capsuleLedger([]);
  assert.equal(empty.grossCents, 0);
  assert.ok(empty.rctiLines.every((line) => line.grossCents === 0));
  for (const collabRoyaltyPct of [0, 15, 30]) {
    const ledger = capsuleLedger([{ priceAud: 100.01, baseCostAud: 20, qty: 3, collabRoyaltyPct }]);
    assert.equal(ledger.grossCents, 30003);
    assert.equal(ledger.athleteCents + ledger.clubCents + ledger.partnerCents + ledger.platformCents + ledger.productionCents, ledger.grossCents);
  }
  const collab = capsuleLedger([{ priceAud: 100, baseCostAud: 20, qty: 1, collabRoyaltyPct: 15 }]);
  assert.equal(collab.athleteCents, 4400);
  assert.equal(collab.clubCents, 1200);
  assert.equal(collab.partnerCents, 1200);
  assert.equal(collab.platformCents, 1200);
  assert.throws(() => capsuleLedger([{ priceAud: 1, baseCostAud: 2, qty: 1 }]), RangeError);
});
