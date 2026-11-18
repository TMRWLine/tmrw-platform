export interface Payee { role?: string; abn?: string | null; gstRegistered?: boolean }
export interface RctiLine { role: string; abn: string | null; gstRegistered: boolean; grossCents: number; gstCents: number; netCents: number }
export interface SponsorshipLedger {
  grossCents: number; gstCents: number; totalPayableCents: number; athlete70Cents: number; club15Cents: number; ops15Cents: number;
  athleteT0AdvanceCents: number; athleteEscrowHoldCents: number; rctiLines: RctiLine[];
}
export function allocateCents(total: number, weights: number[]): number[];
export function rctiLine(amountCents: number, payee?: Payee, taxInclusive?: boolean): RctiLine;
export function sponsorshipLedger(grossCents: number, payees?: Record<string, Payee>, escrowMode?: 'milestone_50_50' | 'upfront_100'): SponsorshipLedger;
export function capsuleLedger(items: { priceAud: number; baseCostAud: number; qty: number; collabRoyaltyPct?: number }[], payees?: Record<string, Payee>): { grossCents: number; athleteCents: number; clubCents: number; partnerCents: number; platformCents: number; productionCents: number; rctiLines: RctiLine[] };
