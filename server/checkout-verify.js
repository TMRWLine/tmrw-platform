import { stripeRequest } from './connect.js';
import { sponsorshipLedger } from '../src/lib/commercialLedger.js';

export const checkoutVerification = (status, message) => ({
  verified: false, status, amountTotalCents: null, currency: null, ledger: null,
  athleteId: null, tierId: null, transferStatus: null, ...(message ? { message } : {}),
});

export async function verifyStripeCheckout(sessionId) {
  const session = await stripeRequest(`checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=payment_intent`);
  if (session.id !== sessionId || !Number.isSafeInteger(session.amount_total) || session.amount_total < 0 ||
      !/^[a-z]{3}$/.test(session.currency)) throw new Error('Invalid session response');
  const metadata = session.metadata || {};
  const paid = session.status === 'complete' && session.payment_status === 'paid';
  const status = paid ? 'paid' : session.status === 'expired' ? 'expired'
    : session.status === 'complete' || session.payment_status === 'paid' ? 'pending' : 'unpaid';
  let ledger = null;
  const payees = {};
  if (metadata.orderType === 'sponsorship_tier') {
    if (!/^\d+$/.test(metadata.ledgerGrossCents || '')) throw new Error('Missing sponsorship ledger');
    for (const role of ['athlete', 'club', 'platform']) {
      const record = JSON.parse(metadata[`${role}Payee`] || '{}');
      payees[role] = { gstRegistered: record.gstRegistered === true };
    }
    ledger = sponsorshipLedger(Number(metadata.ledgerGrossCents), payees, metadata.escrowMode);
    if (session.currency !== 'aud' || ledger.totalPayableCents !== session.amount_total) {
      throw new Error('Sponsorship amount mismatch');
    }
  }
  const intent = typeof session.payment_intent === 'object' ? session.payment_intent : null;
  const recorded = ['athlete', 'athleteFinal', 'club', 'partner']
    .some((role) => /^tr_[a-zA-Z0-9]+$/.test(intent?.metadata?.[`${role}TransferId`] || ''));
  return {
    verified: paid, status, amountTotalCents: session.amount_total, currency: session.currency, ledger,
    athleteId: typeof metadata.athleteId === 'string' ? metadata.athleteId : null,
    tierId: typeof metadata.tierId === 'string' ? metadata.tierId : null,
    transferStatus: paid ? recorded ? 'transfers_recorded' : 'awaiting_webhook' : 'not_paid',
  };
}
