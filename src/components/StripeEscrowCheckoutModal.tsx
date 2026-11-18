import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from '../lib/useDialogFocus';
import { ABN_ERROR_MESSAGE, isValidAbn, stripNonDigits } from '../lib/validation';
import {
  calculateExactSplitLedger,
  createCheckoutSession,
  formatAudFromCents,
  type ClubPayoutCadence,
  type SplitLedgerBreakdown,
} from '../lib/checkout';

export interface StripeCheckoutPayload {
  athleteId: string;
  athleteName: string;
  athleteSport: string;
  athleteImage: string;
  clubName: string;
  postcode: string;
  tierId: string;
  packageCode: string;
  packageName: string;
  priceAud: number;
  sectorLabel?: string;
}

export interface StripeEscrowReceipt {
  splitLedger?: SplitLedgerBreakdown;
  mode?: 'stripe_live' | 'sandbox_demo';
  sessionId?: string;
  txId: string;
  transferGroup: string;
  chargeId: string;
  platformRetainedId: string;
  athleteTransferId: string;
  clubTransferId: string;
  clubCadence: ClubPayoutCadence;
  nextQuarterSweepDate: string;
  idempotencyKey: string;
  legalName: string;
  abn: string;
  email: string;
  paymentMethod: string;
  escrowMode: 'milestone_50_50' | 'upfront_100';
  paidAt: string;
}

interface StripeEscrowCheckoutModalProps {
  payload: StripeCheckoutPayload | null;
  onClose: () => void;
  onSuccess: (receipt: StripeEscrowReceipt) => void;
}

type PaymentMethodTab = 'apple_pay' | 'payto_becs' | 'card';
type ClearingStage = 'idle' | 'initialising';

const LIT_OBSIDIAN_BTN =
  'bg-[#080808] text-[#F7F7F6] font-mono font-bold text-xs py-4 px-7 rounded-xl border border-[#080808]/15 transition-all uppercase tracking-wider text-center cursor-pointer shadow-[inset_0_1px_0_rgba(247,247,246,0.25),inset_0_-2px_0_rgba(8,8,8,0.8),0_10px_25px_rgba(8,8,8,0.25),0_0_15px_rgba(204,255,0,0.18)] hover:bg-[#080808] hover:border-[#CCFF00] hover:text-[#CCFF00] hover:shadow-[inset_0_1px_0_rgba(247,247,246,0.4),inset_0_-2px_0_rgba(8,8,8,0.9),0_15px_30px_rgba(8,8,8,0.35),0_0_28px_rgba(204,255,0,0.35)] active:translate-y-[1px]';

function formatAbn(raw: string): string {
  const digits = stripNonDigits(raw).slice(0, 11);
  const parts = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 8), digits.slice(8, 11)].filter(Boolean);
  return parts.join(' ');
}

function sanitizeInput(raw: string): string {
  return raw.replace(/[<>]/g, '');
}

export const StripeEscrowCheckoutModal: React.FC<StripeEscrowCheckoutModalProps> = ({
  payload,
  onClose,
  onSuccess,
}) => {
  const [method, setMethod] = useState<PaymentMethodTab>('apple_pay');
  const [escrowMode, setEscrowMode] = useState<'milestone_50_50' | 'upfront_100'>('upfront_100');
  const [clubCadence, setClubCadence] = useState<ClubPayoutCadence>('immediate_t0');

  const [legalName, setLegalName] = useState('Peninsula Motor Group Pty Ltd');
  const [abn, setAbn] = useState('51 824 753 556');
  const [email, setEmail] = useState('finance@corporatepartner.com.au');

  const [clearingStage, setClearingStage] = useState<ClearingStage>('idle');
  const dialogRef = useDialogFocus(Boolean(payload), () => { if (clearingStage === 'idle') onClose(); });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!payload) return;
    setClearingStage('idle');
    setErrorMsg(null);
    setClubCadence('immediate_t0');
    if (payload.priceAud >= 50000) {
      setMethod('payto_becs');
    } else {
      setMethod('apple_pay');
    }
  }, [payload]);

  if (!payload) return null;

  const split = calculateExactSplitLedger(
    payload.priceAud,
    payload.postcode,
    payload.athleteId,
    escrowMode,
  );

  const abnReady = isValidAbn(abn);
  const abnDigits = stripNonDigits(abn);
  const canAuthorise = legalName.trim().length > 1 && abnReady && email.includes('@');

  const initialiseCheckout = async () => {
    if (clearingStage !== 'idle') return;
    if (!canAuthorise) {
      setErrorMsg(ABN_ERROR_MESSAGE);
      return;
    }
    setErrorMsg(null);

    setClearingStage('initialising');
    let sessionResult;
    try {
      sessionResult = await createCheckoutSession({
        athleteId: payload.athleteId,
        tierId: payload.tierId,
        amountAud: payload.priceAud,
        postcode: payload.postcode,
        sponsorLegalName: sanitizeInput(legalName.trim()),
        sponsorAbn: abn,
        sponsorEmail: sanitizeInput(email.trim()),
        escrowMode,
        clubCadence,
        athlete: {
          full_name: payload.athleteName,
          grassroots_club_name: payload.clubName,
          image_url: payload.athleteImage,
        },
      });
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Unable to initialise checkout');
      setClearingStage('idle');
      return;
    }
    if (sessionResult.mode === 'stripe_live') {
      if (sessionResult.checkoutUrl) window.location.assign(sessionResult.checkoutUrl);
      else {
        setErrorMsg('Secure checkout is unavailable. Please try again.');
        setClearingStage('idle');
      }
      return;
    }
    const txId = `DEMO-${payload.postcode}-${Date.now()}`;
    const receipt: StripeEscrowReceipt = {
      splitLedger: sessionResult.splitLedger,
      mode: sessionResult.mode,
      sessionId: sessionResult.sessionId,
      txId,
      transferGroup: sessionResult.transferGroup,
      chargeId: sessionResult?.chargeId ?? `py_${txId}`,
      platformRetainedId: sessionResult?.platformRetainedId ?? `fee_tmrw_t0_${txId}`,
      athleteTransferId: sessionResult?.athleteTransferId ?? `tr_ath_${txId}`,
      clubTransferId: sessionResult?.clubTransferId ?? `q_batch_club_${txId}`,
      clubCadence,
      nextQuarterSweepDate: split.nextQuarterSweepDate,
      idempotencyKey: sessionResult?.idempotencyKey ?? `idemp_${txId}`,
      legalName: sanitizeInput(legalName.trim()),
      abn,
      email: sanitizeInput(email.trim()),
      paymentMethod: `${method} preference · sandbox preview only`,
      escrowMode,
      paidAt: new Date().toISOString(),
    };

    try {
      const existing = JSON.parse(localStorage.getItem('tmrw_escrow_ledger') || '[]');
      existing.unshift({ ...receipt, payload, split: sessionResult.splitLedger });
      localStorage.setItem('tmrw_escrow_ledger', JSON.stringify(existing.slice(0, 30)));
    } catch {
      // ignore storage quota errors
    }

    setClearingStage('idle');
    onSuccess(receipt);
  };

  return createPortal(
    <div
      data-lenis-prevent="true"
      onWheel={(e) => e.stopPropagation()}
      onClick={(event) => { event.stopPropagation(); if (clearingStage === 'idle') onClose(); }}
      className="fixed inset-0 z-[110] bg-[#080808]/65 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 selection:bg-[#CCFF00] selection:text-[#080808] animate-fadeIn"
    >
      <div
        ref={dialogRef} role="dialog" aria-modal="true" aria-label="Secure sponsorship checkout" tabIndex={-1}
        data-lenis-prevent="true"
        onWheel={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-[630px] max-h-[94dvh] sm:max-h-[92dvh] rounded-t-[24px] sm:rounded-[24px] bg-[#F7F7F6] text-[#080808] border border-[#080808]/10 shadow-[0_35px_100px_rgba(8,8,8,0.45)] flex flex-col overflow-hidden"
      >
        <header className="shrink-0 flex items-start justify-between gap-4 border-b border-[#080808]/10 bg-[#F7F7F6] px-5 py-4 sm:px-7 sm:py-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 font-sans text-xs tracking-tight">
              <span className="font-display font-black text-sm tracking-[-0.04em] text-[#080808]">
                tmrw<span className="text-[#CCFF00]">/.</span>
              </span>
              <span className="bg-[#CCFF00] text-[#080808] font-bold px-2 py-0.5 rounded-[4px] text-[11px]">
                70/15/15 Separate Charges & Transfers
              </span>
              <span className="text-[#080808] font-mono text-[10px] uppercase">
                {split.transferGroup}
              </span>
            </div>
            <h2 className="m-0 mt-2 font-display text-3xl sm:text-4xl font-black uppercase tracking-[-0.03em] leading-none text-[#080808]">
              {formatAudFromCents(split.grossCents)} AUD<span className="text-[#CCFF00]">.</span>{' '}
              <span className="text-[#080808] font-sans text-sm sm:text-base font-bold normal-case tracking-tight">
                {payload.packageName}
              </span>
            </h2>
            <p className="m-0 mt-1 font-sans text-xs text-[#080808] truncate">
              Contender: <strong className="text-[#080808]">{payload.athleteName}</strong> · Postcode {payload.postcode} · Club: <strong className="text-[#080808]">{payload.clubName}</strong>
            </p>
          </div>

          <button
            type="button"
            disabled={clearingStage !== 'idle'}
            onClick={onClose}
            className="shrink-0 rounded-full bg-[#080808] hover:bg-[#CCFF00] text-[#F7F7F6] hover:text-[#080808] px-4 py-1.5 font-sans text-xs font-bold border-0 cursor-pointer transition-colors"
          >
            Close ✕
          </button>
        </header>

        <div
          data-lenis-prevent="true"
          onWheel={(e) => e.stopPropagation()}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7 space-y-4 bg-[#F7F7F6]"
        >
          {/* 1. 7000 / 1500 / 1500 BPS 3-PARTY SETTLEMENT SCHEDULE */}
          <div className="rounded-2xl border border-[#080808]/10 bg-[#F7F7F6] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 font-sans text-xs">
              <span className="font-bold text-[#080808]">
                3-Party Settlement Schedule (`source_transaction` Locked)<span className="text-[#CCFF00]">.</span>
              </span>
              <span className="font-mono text-[10px] text-[#080808] uppercase">
                +{formatAudFromCents(split.gstCents)} GST · registered payees only
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 font-mono">
              <div className="rounded-xl bg-[#080808] text-[#F7F7F6] p-3">
                <span className="block text-[8.5px] text-[#F7F7F6] uppercase">70% ATHLETE (7000 BPS)</span>
                <strong className="text-base sm:text-lg text-[#F7F7F6]">
                  {formatAudFromCents(split.athlete70Cents)}
                </strong>
                <span className="block text-[8px] text-[#CCFF00] mt-0.5">
                  {escrowMode === 'milestone_50_50'
                    ? `${formatAudFromCents(split.athleteT0AdvanceCents)} T+0 / 50% Escrow`
                    : '100% T+0 Direct'}
                </span>
              </div>

              <div className="rounded-xl bg-[#F7F7F6] border border-[#080808]/10 p-3 text-[#080808]">
                <span className="block text-[8.5px] text-[#080808] uppercase">15% CLUB (1500 BPS)</span>
                <strong className="text-base sm:text-lg text-[#080808]">
                  {formatAudFromCents(split.club15Cents)}
                </strong>
                <span className="block text-[8px] text-[#080808] font-bold mt-0.5 truncate">
                  {clubCadence === 'quarterly_batch'
                    ? `Batch: ${split.nextQuarterSweepDate}`
                    : `T+0 Direct · ${payload.clubName}`}
                </span>
              </div>

              <div className="rounded-xl bg-[#F7F7F6] border border-[#080808]/10 p-3 text-[#080808]">
                <span className="block text-[8.5px] text-[#080808] uppercase">15% TMRW/. OPS</span>
                <strong className="text-base sm:text-lg text-[#080808]">
                  {formatAudFromCents(split.ops15Cents)}
                </strong>
                <span className="block text-[8px] text-[#080808] bg-[#CCFF00] px-1 rounded inline-block font-bold mt-0.5">
                  RETAINED T+0 IN PLATFORM
                </span>
              </div>
            </div>

            {/* Athlete Milestone Escrow Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEscrowMode('milestone_50_50')}
                className={`rounded-xl border p-2.5 text-left cursor-pointer transition-all ${
                  escrowMode === 'milestone_50_50'
                    ? 'border-[#080808] bg-[#080808] text-[#F7F7F6] shadow-sm'
                    : 'border-[#080808]/10 bg-[#F7F7F6] text-[#080808] hover:border-[#080808]/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="bg-[#CCFF00] text-[#080808] font-sans text-[10px] font-bold px-1.5 py-0.5 rounded-[3px]">
                    01. Athlete 50/50 Escrow
                  </span>
                  <span className="font-mono text-[10px] text-[#CCFF00]">
                    {escrowMode === 'milestone_50_50' ? '●' : '○'}
                  </span>
                </div>
                <span
                  className={`block font-sans text-[11px] mt-1 leading-snug ${
                    escrowMode === 'milestone_50_50' ? 'text-[#F7F7F6]' : 'text-[#080808]'
                  }`}
                >
                  {formatAudFromCents(split.athleteT0AdvanceCents)} T+0; {formatAudFromCents(split.athleteEscrowHoldCents)} on deliverable sign-off.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setEscrowMode('upfront_100')}
                className={`rounded-xl border p-2.5 text-left cursor-pointer transition-all ${
                  escrowMode === 'upfront_100'
                    ? 'border-[#080808] bg-[#080808] text-[#F7F7F6] shadow-sm'
                    : 'border-[#080808]/10 bg-[#F7F7F6] text-[#080808] hover:border-[#080808]/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-sans text-[10px] font-bold ${
                      escrowMode === 'upfront_100' ? 'text-[#CCFF00]' : 'text-[#080808]'
                    }`}
                  >
                    02. Athlete 100% Upfront
                  </span>
                  <span className="font-mono text-[10px]">
                    {escrowMode === 'upfront_100' ? '●' : '○'}
                  </span>
                </div>
                <span
                  className={`block font-sans text-[11px] mt-1 leading-snug ${
                    escrowMode === 'upfront_100' ? 'text-[#F7F7F6]' : 'text-[#080808]'
                  }`}
                >
                  Full {formatAudFromCents(split.athlete70Cents)} settled T+0 to athlete Express account.
                </span>
              </button>
            </div>

            {/* Grassroots Junior Club Quarterly Batch vs Immediate T+0 Selector */}
            <div className="pt-1 border-t border-[#080808]/10 flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[9px] uppercase text-[#080808] font-bold">
                15% JUNIOR CLUB PAYOUT RAIL ({payload.clubName.toUpperCase()}):
              </span>
              <div className="inline-flex rounded-lg bg-[#F7F7F6] border border-[#080808]/10 p-0.5">
                <button
                  type="button"
                  onClick={() => setClubCadence('quarterly_batch')}
                  className={`rounded-md px-2.5 py-1 font-mono text-[9px] font-bold uppercase border-0 cursor-pointer transition-colors ${
                    clubCadence === 'quarterly_batch'
                      ? 'bg-[#080808] text-[#CCFF00]'
                      : 'bg-transparent text-[#080808] hover:text-[#080808]'
                  }`}
                >
                  Quarterly Batch ({split.nextQuarterSweepDate})
                </button>
                <button
                  type="button"
                  onClick={() => setClubCadence('immediate_t0')}
                  className={`rounded-md px-2.5 py-1 font-mono text-[9px] font-bold uppercase border-0 cursor-pointer transition-colors ${
                    clubCadence === 'immediate_t0'
                      ? 'bg-[#080808] text-[#CCFF00]'
                      : 'bg-transparent text-[#080808] hover:text-[#080808]'
                  }`}
                >
                  Immediate T+0
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[9px] uppercase tracking-wider text-[#080808] block mb-1">
                Sponsor Legal Entity (For ATO/IRD RCTI)
              </label>
              <input
                type="text"
                required
                maxLength={120}
                value={legalName}
                onChange={(e) => setLegalName(sanitizeInput(e.target.value))}
                className="w-full rounded-xl bg-[#F7F7F6] border border-[#080808]/10 px-3.5 py-2.5 font-sans text-xs font-medium text-[#080808] focus:bg-[#F7F7F6] focus:border-[#080808] outline-none"
              />
            </div>
            <div>
              <label className="font-mono text-[9px] uppercase tracking-wider text-[#080808] block mb-1">
                Australian Business Number (ABN)
              </label>
              <input
                type="text"
                required
                inputMode="numeric"
                value={abn}
                onChange={(e) => setAbn(formatAbn(e.target.value))}
                className="w-full rounded-xl bg-[#F7F7F6] border border-[#080808]/10 px-3.5 py-2.5 font-mono text-xs font-bold text-[#080808] focus:bg-[#F7F7F6] focus:border-[#080808] outline-none"
              />
              {abnDigits.length > 0 && !abnReady && (
                <span className="block mt-1 font-mono text-[9px] text-[#080808]">{ABN_ERROR_MESSAGE}</span>
              )}
            </div>
          </div>

          <div>
            <label className="font-mono text-[9px] uppercase tracking-wider text-[#080808] block mb-1">
              Corporate Email (Checkout Contact)
            </label>
            <input
              type="email"
              required
              maxLength={120}
              value={email}
              onChange={(e) => setEmail(sanitizeInput(e.target.value))}
              className="w-full rounded-xl bg-[#F7F7F6] border border-[#080808]/10 px-3.5 py-2.5 font-sans text-xs font-medium text-[#080808] focus:bg-[#F7F7F6] focus:border-[#080808] outline-none"
            />
          </div>

          <div>
            <p className="font-mono text-[9px] uppercase tracking-wider">Payment preference · availability confirmed on Stripe</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(
                [
                  ['apple_pay', ' Apple Pay / Link'],
                  ['payto_becs', 'Bank Payment'],
                  ['card', 'Corporate Card'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMethod(id)}
                  aria-pressed={method === id}
                  disabled={clearingStage !== 'idle'}
                  className={`rounded-xl border py-2.5 px-2 font-sans text-xs font-bold cursor-pointer transition-all ${
                    method === id
                      ? 'border-[#080808] bg-[#080808] text-[#F7F7F6]'
                      : 'border-[#080808]/10 bg-[#F7F7F6] text-[#080808] hover:text-[#080808]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="border border-[#080808]/15 p-4 text-sm leading-relaxed">
              Payment details are entered only on Stripe's hosted checkout. Available wallets,
              cards and bank payment methods depend on your device, currency and Stripe configuration.
              Do not enter card numbers, security codes or bank account details on this page.
              If checkout is not configured, only a labelled sandbox allocation preview opens.
            </div>
          </div>

          {clearingStage !== 'idle' && (
            <p role="status" className="font-mono text-xs" aria-live="polite">
              Initialising secure checkout. No settlement has been confirmed.
            </p>
          )}

          {errorMsg && (
            <p role="alert" className="m-0 font-mono text-xs text-[#080808] text-center">{errorMsg}</p>
          )}
        </div>

        <footer className="shrink-0 border-t border-[#080808]/10 bg-[#F7F7F6] px-5 py-4 sm:px-7">
          <button
            type="button"
            disabled={!canAuthorise || clearingStage !== 'idle'}
            onClick={initialiseCheckout}
            className={`w-full ${LIT_OBSIDIAN_BTN} disabled:opacity-40`}
          >
            {clearingStage !== 'idle'
              ? 'INITIALISING SECURE CHECKOUT...'
              : 'CONTINUE TO SECURE CHECKOUT →'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
};

export default StripeEscrowCheckoutModal;