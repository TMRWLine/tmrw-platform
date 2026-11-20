import type { capsuleTotals } from '../lib/capsuleCommerce';

export function CapsuleTotals({ totals, currency = 'aud' }: { totals: ReturnType<typeof capsuleTotals>; currency?: string }) {
  const money = (cents: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
  return (
    <dl className="m-0 w-full space-y-2 font-['JetBrains_Mono',monospace] text-xs">
      {[
        ['Subtotal', money(totals.subtotalCents)],
        ['GST (10%)', money(totals.gstCents)],
        ['Shipping', `${money(totals.shippingCents)}${totals.shippingCents === 0 ? ' (not charged)' : ''}`],
        ['Total', money(totals.totalCents)],
      ].map(([label, value]) => (
        <div key={label} className={`flex flex-wrap justify-between gap-3 ${label === 'Total' ? 'border-t border-current/20 pt-2 font-bold' : ''}`}>
          <dt>{label}</dt><dd className="m-0">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
