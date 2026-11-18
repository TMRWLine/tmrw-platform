import test from 'node:test';
import assert from 'node:assert/strict';
import { mockDeliverables } from '../src/data/mockDeliverables.ts';
import { resolveReceiptPackage } from '../src/pages/checkout/receiptPackage.ts';

test('Olympic checkout receipts use the correct packages, prices and 70/15/15 splits', () => {
  for (const [tierId, name, price, display, athlete, club, platform] of [
    ['olympic_1yr_50k', 'LA 2028 Qualifier Partnership', 50000, 'A$50,000', 35000, 7500, 7500],
    ['olympic_2yr_110k', 'LA 2028 Games Partnership', 110000, 'A$110,000', 77000, 16500, 16500],
    ['olympic_4yr_250k', 'Brisbane 2032 Home Games Quadrennial', 250000, 'A$250,000', 175000, 37500, 37500],
  ]) {
    assert.deepEqual(resolveReceiptPackage(tierId), {
      tier_id: tierId,
      name,
      price_aud: price,
      price_display: display,
      split_breakdown: {
        athlete_amount: athlete, athlete_percent: 70,
        club_amount: club, club_percent: 15,
        platform_amount: platform, platform_percent: 15,
      },
    });
  }
});

test('existing receipt packages and the unknown-tier fallback are unchanged', () => {
  for (const pkg of mockDeliverables.packages) {
    assert.equal(resolveReceiptPackage(pkg.tier_id), pkg);
  }
  assert.equal(resolveReceiptPackage('unknown'), mockDeliverables.packages[0]);
  assert.equal(resolveReceiptPackage(null), mockDeliverables.packages[0]);
});
