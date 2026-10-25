/** Architectural money: A$ prefix, no grouping separators. */

export function formatAud(amount: number, fractionDigits = 2): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}A$${Math.abs(amount).toFixed(fractionDigits)}`;
}

export function formatAudCompact(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}A$${Math.round(Math.abs(amount))}`;
}

export function stripMoneyCommas(value: string): string {
  return value.replace(/,/g, '');
}
