import { createHash, randomUUID } from 'node:crypto';
import { sponsorshipLedger, rctiLine } from '../src/lib/commercialLedger.js';

export async function stripeRequest(path, { method = 'GET', body, key } = {}) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method, signal: AbortSignal.timeout(10000),
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}), ...(key ? { 'Idempotency-Key': key } : {}) },
    ...(body ? { body: new URLSearchParams(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error('Stripe request failed');
  return data;
}

export function checkoutKey(req) {
  const supplied = req.get('Idempotency-Key');
  if (supplied && supplied.length > 255) throw new Error('Invalid idempotency key');
  return createHash('sha256').update(supplied || randomUUID()).digest('hex');
}

export function configuredPayees(athlete = {}) {
  const payee = (role, record = {}) => {
    const accountId = record.stripe_account_id || process.env[`STRIPE_${role.toUpperCase()}_ACCOUNT_ID`] || null;
    if (accountId && !/^acct_[a-zA-Z0-9]+$/.test(accountId)) throw new Error('Invalid connected account configuration');
    return {
      accountId,
      abn: String(record.abn || process.env[`${role.toUpperCase()}_ABN`] || '').slice(0, 32) || null,
      gstRegistered: typeof record.gst_registered === 'boolean' ? record.gst_registered : process.env[`${role.toUpperCase()}_GST_REGISTERED`] === 'true',
    };
  };
  return { athlete: payee('athlete', athlete), club: payee('club', athlete.club || {}), platform: payee('platform'), partner: payee('partner') };
}

export function addConnectMetadata(body, ledger, payees, transferGroup, escrowMode = 'upfront_100', clubCadence = 'immediate_t0') {
  body.set('payment_intent_data[transfer_group]', transferGroup);
  const metadata = { transferGroup, escrowMode, clubCadence, ledgerGrossCents: ledger.grossCents, ledgerGstCents: ledger.gstCents };
  metadata.productionCents = ledger.productionCents || 0;
  for (const role of ['athlete', 'club', 'platform', 'partner']) {
    const line = ledger.rctiLines?.find((entry) => entry.role === role);
    const amountCents = line?.grossCents ?? ledger[`${role}Cents`] ?? 0;
    metadata[`${role}Payee`] = JSON.stringify({ ...payees[role], amountCents });
  }
  for (const [key, value] of Object.entries(metadata)) {
    body.set(`metadata[${key}]`, String(value));
  }
}

function parsePayee(metadata, role) {
  const payee = JSON.parse(metadata[`${role}Payee`] || '{}');
  if (!Number.isSafeInteger(payee.amountCents) || payee.amountCents < 0) throw new Error('Invalid signed ledger amount');
  if (payee.accountId && !/^acct_[a-zA-Z0-9]+$/.test(payee.accountId)) throw new Error('Invalid connected account');
  return payee;
}

export async function completeCheckout(session) {
  const metadata = session.metadata || {};
  const grossCents = Number(metadata.ledgerGrossCents || 0);
  const payees = Object.fromEntries(['athlete', 'club', 'platform', 'partner'].map((role) => [role, parsePayee(metadata, role)]));
  const ledger = metadata.orderType === 'merch_capsule'
    ? { grossCents, productionCents: Number(metadata.productionCents || 0), rctiLines: Object.entries(payees).map(([role, payee]) => rctiLine(payee.amountCents, { ...payee, role }, true)) }
    : sponsorshipLedger(grossCents, payees, metadata.escrowMode);
  if (session.payment_status !== 'paid') return { mode: 'pending_payment', ledger, transfers: [] };
  const expectedTotal = metadata.orderType === 'merch_capsule' ? grossCents : ledger.totalPayableCents;
  if (session.currency !== 'aud' || session.amount_total !== expectedTotal) throw new Error('Paid amount does not match ledger');
  const allocatedTotal = Object.values(payees).reduce((sum, payee) => sum + payee.amountCents, 0) + Number(metadata.productionCents || 0);
  if (allocatedTotal !== expectedTotal) throw new Error('Payout amounts do not match paid total');
  if (!process.env.STRIPE_SECRET_KEY || !Object.entries(payees).some(([role, payee]) => role !== 'platform' && payee.accountId)) {
    console.log('[stripe connect] Demo ledger computed; no connected payout accounts or Stripe key configured.');
    return { mode: 'sandbox_demo', ledger, transfers: [] };
  }
  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
  if (!paymentIntentId) throw new Error('Payment intent missing');
  const intent = await stripeRequest(`payment_intents/${encodeURIComponent(paymentIntentId)}`);
  const chargeId = typeof intent.latest_charge === 'string' ? intent.latest_charge : intent.latest_charge?.id;
  if (!chargeId) throw new Error('Source charge missing');
  const transfers = [];
  for (const role of ['athlete', 'club', 'partner']) {
    const payee = payees[role];
    if (!payee.amountCents) continue;
    if (!payee.accountId) {
      console.warn(`[stripe connect] ${role} payout retained: no connected account configured.`);
      continue;
    }
    if (role === 'club' && metadata.clubCadence === 'quarterly_batch') continue;
    const amount = role === 'athlete' && metadata.escrowMode === 'milestone_50_50' ? Math.ceil(payee.amountCents / 2) : payee.amountCents;
    const existingId = intent.metadata?.[`${role}TransferId`];
    if (existingId) {
      transfers.push({ role, id: existingId, amountCents: amount });
      continue;
    }
    const transfer = await stripeRequest('transfers', { method: 'POST', key: `checkout-${session.id}-${role}-t0`, body: {
      amount: String(amount), currency: 'aud', destination: payee.accountId, source_transaction: chargeId,
      transfer_group: metadata.transferGroup, 'metadata[checkoutSessionId]': session.id, 'metadata[role]': role,
    } });
    await stripeRequest(`payment_intents/${encodeURIComponent(paymentIntentId)}`, { method: 'POST', body: {
      [`metadata[${role}TransferId]`]: transfer.id,
      'metadata[checkoutSessionId]': session.id,
    } });
    transfers.push({ role, id: transfer.id, amountCents: amount });
  }
  return { mode: 'stripe_live', ledger, transfers };
}

export async function releaseHeldFunds(sessionId) {
  const session = await stripeRequest(`checkout/sessions/${encodeURIComponent(sessionId)}`);
  if (session.payment_status !== 'paid' || session.metadata?.escrowMode !== 'milestone_50_50') throw new Error('No approved escrow to release');
  const athlete = parsePayee(session.metadata, 'athlete');
  const amount = Math.floor(athlete.amountCents / 2);
  if (!amount || !athlete.accountId) throw new Error('No connected escrow payee');
  const intentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
  const intent = await stripeRequest(`payment_intents/${encodeURIComponent(intentId)}`);
  if (!intent.metadata?.athleteTransferId) throw new Error('Initial tranche has not settled');
  const chargeId = typeof intent.latest_charge === 'string' ? intent.latest_charge : intent.latest_charge?.id;
  const charge = await stripeRequest(`charges/${encodeURIComponent(chargeId)}`);
  if (charge.disputed || charge.refunded) throw new Error('Charge is disputed or refunded');
  if (intent.metadata?.athleteFinalTransferId) {
    return { released: true, escrowTransferId: intent.metadata.athleteFinalTransferId, releasedAmountCents: amount, releasedAt: new Date().toISOString() };
  }
  const transfer = await stripeRequest('transfers', { method: 'POST', key: `checkout-${session.id}-athlete-final`, body: {
    amount: String(amount), currency: 'aud', destination: athlete.accountId,
    source_transaction: chargeId, transfer_group: session.metadata.transferGroup,
  } });
  await stripeRequest(`payment_intents/${encodeURIComponent(intentId)}`, { method: 'POST', body: { 'metadata[athleteFinalTransferId]': transfer.id } });
  return { released: true, escrowTransferId: transfer.id, releasedAmountCents: amount, releasedAt: new Date().toISOString() };
}

export async function reverseDispute(dispute) {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log('[stripe connect] Dispute received in demo mode; no transfers to reverse.');
    return [];
  }
  const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;
  const charge = chargeId ? await stripeRequest(`charges/${encodeURIComponent(chargeId)}`) : null;
  const intentId = typeof charge?.payment_intent === 'string' ? charge.payment_intent : charge?.payment_intent?.id;
  const intent = intentId ? await stripeRequest(`payment_intents/${encodeURIComponent(intentId)}`) : null;
  const metadata = { ...intent?.metadata, ...dispute.metadata };
  const reversals = [];
  for (const role of ['athlete', 'athleteFinal', 'club', 'partner']) {
    const id = metadata[`${role}TransferId`];
    if (!id || !/^tr_[a-zA-Z0-9]+$/.test(id)) continue;
    reversals.push(await stripeRequest(`transfers/${id}/reversals`, { method: 'POST', body: {}, key: `dispute-${dispute.id}-${id}` }));
  }
  if (!reversals.length) console.warn('[stripe connect] No known transfer IDs for dispute; manual review required.');
  return reversals;
}
