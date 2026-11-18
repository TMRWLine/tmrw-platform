function cents(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError('Expected non-negative safe integer cents');
  return value;
}

export function allocateCents(total, weights) {
  cents(total);
  if (!weights.length || weights.some((weight) => !Number.isInteger(weight) || weight < 0) || weights.reduce((a, b) => a + b, 0) !== 10000) {
    throw new RangeError('Split weights must total 10000 basis points');
  }
  const allocations = weights.map((weight) => Number(BigInt(total) * BigInt(weight) / 10000n));
  let remainder = total - allocations.reduce((a, b) => a + b, 0);
  const order = weights.map((weight, index) => ({ index, fraction: BigInt(total) * BigInt(weight) % 10000n }))
    .sort((a, b) => a.fraction === b.fraction ? a.index - b.index : a.fraction > b.fraction ? -1 : 1);
  for (const { index } of order) {
    if (remainder-- <= 0) break;
    allocations[index]++;
  }
  return allocations;
}

export function rctiLine(amountCents, payee = {}, taxInclusive = false) {
  cents(amountCents);
  const gstRegistered = payee.gstRegistered === true;
  // Commercial UI prices are GST-exclusive: add 10% only for registered payees.
  // Legacy rcti_invoices.gst_included rows use taxInclusive=true (GST = gross / 11).
  const divisor = taxInclusive ? 11n : 10n;
  const gstCents = gstRegistered ? Number((BigInt(amountCents) + divisor / 2n) / divisor) : 0;
  const grossCents = taxInclusive ? amountCents : amountCents + gstCents;
  cents(grossCents);
  return { role: payee.role || 'athlete', abn: payee.abn || null, gstRegistered, grossCents, gstCents, netCents: grossCents - gstCents };
}

export function sponsorshipLedger(grossCents, payees = {}, escrowMode = 'upfront_100') {
  const [athlete70Cents, club15Cents, ops15Cents] = allocateCents(grossCents, [7000, 1500, 1500]);
  const rctiLines = ['athlete', 'club', 'platform'].map((role, index) =>
    rctiLine([athlete70Cents, club15Cents, ops15Cents][index], { ...payees[role], role }));
  const gstCents = rctiLines.reduce((sum, line) => sum + line.gstCents, 0);
  const athleteT0AdvanceCents = escrowMode === 'milestone_50_50' ? Math.ceil(athlete70Cents / 2) : athlete70Cents;
  return { grossCents, gstCents, totalPayableCents: cents(grossCents + gstCents), athlete70Cents, club15Cents, ops15Cents,
    athleteT0AdvanceCents, athleteEscrowHoldCents: athlete70Cents - athleteT0AdvanceCents, rctiLines };
}

export function capsuleLedger(items, payees = {}) {
  let grossCents = 0, athleteCents = 0, clubCents = 0, partnerCents = 0, platformCents = 0, productionCents = 0;
  for (const item of items) {
    const unit = cents(Math.round(item.priceAud * 100));
    const cost = cents(Math.round(item.baseCostAud * 100));
    if (!Number.isInteger(item.qty) || item.qty < 1 || cost > unit) throw new RangeError('Invalid capsule item');
    const partnerBps = Math.round((item.collabRoyaltyPct || 0) * 100);
    const athleteBps = partnerBps > 0 ? 5500 : 7000;
    const [athlete, club, partner, platform] = allocateCents(unit - cost, [athleteBps, 1500, partnerBps, 10000 - athleteBps - 1500 - partnerBps]);
    grossCents += unit * item.qty;
    productionCents += cost * item.qty;
    athleteCents += athlete * item.qty;
    clubCents += club * item.qty;
    partnerCents += partner * item.qty;
    platformCents += platform * item.qty;
  }
  cents(grossCents);
  const amounts = { athlete: athleteCents, club: clubCents, partner: partnerCents, platform: platformCents };
  const rctiLines = Object.entries(amounts).map(([role, amount]) => rctiLine(amount, { ...payees[role], role }, true));
  return { grossCents, athleteCents, clubCents, partnerCents, platformCents, productionCents, rctiLines };
}
