export const VENUE_SIZE = '25x VENUE CURVE (3S·8M·9L·5XL)';
export const BAG_STORAGE_KEY = 'tmrw_capsule_bag_v1';
export const PENDING_BAG_STORAGE_PREFIX = 'tmrw_capsule_checkout_v1_';
export const BAG_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function formatCapsuleMoney(cents: number, currency = 'aud') {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: currency.toUpperCase() })
    .formatToParts(cents / 100)
    .map(part => part.type === 'currency' && currency.toUpperCase() === 'AUD' ? 'A$' : part.value)
    .join('');
}

export function capsuleSplit(priceAud: number, baseCostAud: number, royaltyPct = 0, qty = 1) {
  const netUnitCents = Math.max(0, Math.round((priceAud - baseCostAud) * 100));
  return {
    athleteCents: Math.round(netUnitCents * (royaltyPct > 0 ? 0.55 : 0.7)) * qty,
    clubCents: Math.round(netUnitCents * 0.15) * qty,
    partnerCents: Math.round(netUnitCents * (royaltyPct > 0 ? royaltyPct / 100 : 0)) * qty,
  };
}

export function capsuleTotals(subtotalCents: number) {
  const gstCents = Math.round(subtotalCents * 0.1);
  return { subtotalCents, gstCents, shippingCents: 0, totalCents: subtotalCents + gstCents };
}

type Product = { id: string };
export type BagLine<T> = { item: T; qty: number; size: string };

export function restoreBag<T extends Product>(raw: string | null, catalogue: readonly T[], now = Date.now()): BagLine<T>[] {
  try {
    const saved = JSON.parse(raw ?? 'null');
    if (saved?.version !== 1 || !Number.isFinite(saved.expiresAt) || saved.expiresAt <= now || !Array.isArray(saved.lines)) return [];
    const lines: BagLine<T>[] = [];
    for (const line of saved.lines) {
      const item = catalogue.find(product => product.id === line?.id);
      if (!item || !['S', 'M', 'L', 'XL', VENUE_SIZE].includes(line.size) || !Number.isFinite(line.qty)) continue;
      const step = line.size === VENUE_SIZE ? 25 : 1;
      const qty = Math.min(100, Math.max(step, Math.floor(line.qty / step) * step));
      const existing = lines.find(entry => entry.item.id === item.id && entry.size === line.size);
      if (existing) existing.qty = Math.min(100, existing.qty + qty);
      else lines.push({ item, qty, size: line.size });
    }
    return lines;
  } catch {
    return [];
  }
}

export function serialiseBag<T extends Product>(lines: BagLine<T>[], now = Date.now()) {
  return JSON.stringify({ version: 1, expiresAt: now + BAG_TTL_MS, lines: lines.map(({ item, qty, size }) => ({ id: item.id, qty, size })) });
}

export function settlePaidBag<T extends Product>(rawBag: string | null, rawCheckout: string | null, catalogue: readonly T[], now = Date.now()) {
  const current = restoreBag(rawBag, catalogue, now);
  let checkout;
  try { checkout = JSON.parse(rawCheckout ?? 'null'); } catch { checkout = null; }
  const valid = checkout?.version === 1 && Number.isFinite(checkout.expiresAt) && checkout.expiresAt > now && Array.isArray(checkout.lines);
  const purchased = valid ? restoreBag(rawCheckout, catalogue, now) : [];
  const lines = valid && checkout.settled === true ? current : valid ? current.flatMap(line => {
    const bought = purchased.find(entry => entry.item.id === line.item.id && entry.size === line.size);
    const qty = line.qty - (bought?.qty ?? 0);
    return qty > 0 ? [{ ...line, qty }] : [];
  }) : [];
  return { lines, checkout: JSON.stringify({ version: 1, expiresAt: now + BAG_TTL_MS, lines: [], settled: true }) };
}

export type CapsuleReturn = { status: 'success' | 'cancelled'; sessionId: string };

export function readCapsuleReturn(search: string): CapsuleReturn | null {
  const params = new URLSearchParams(search);
  const status = params.get('capsule_checkout');
  return status === 'success' || status === 'cancelled' ? { status, sessionId: params.get('session_id') ?? '' } : null;
}

export interface CapsuleReceipt {
  paymentStatus: 'paid' | 'unpaid' | 'no_payment_required' | 'unknown';
  currency: string;
  lineItems: { description: string; quantity: number; amountCents: number }[];
  subtotalCents: number;
  gstCents: number;
  shippingCents: number;
  totalCents: number;
  splits: { athleteCents: number; clubCents: number; partnerCents: number; netCents?: number; garmentCostCents?: number; platformCents?: number };
}

export function formatCapsuleSplit(splits: CapsuleReceipt['splits'], subtotalCents: number, currency = 'aud', example = false) {
  const money = (cents: number) => formatCapsuleMoney(cents, currency);
  const complete = splits.netCents !== undefined && splits.garmentCostCents !== undefined && splits.platformCents !== undefined;
  const heading = complete
    ? `${example ? 'Example split' : 'Split'} of ${money(splits.netCents!)} net (${money(subtotalCents)} ex-GST less ${money(splits.garmentCostCents!)} garment cost)`
    : `${example ? 'Example ex-GST' : 'Ex-GST'} net allocations`;
  return `${heading}: ${[
    `athlete ${money(splits.athleteCents)}`,
    ...(splits.partnerCents > 0 ? [`collaborator ${money(splits.partnerCents)}`] : []),
    `club ${money(splits.clubCents)}`,
    ...(splits.platformCents !== undefined ? [`tmrw/. ${money(splits.platformCents)}`] : []),
  ].join(' · ')}`;
}
