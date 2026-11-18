import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  calculateExactSplitLedger,
  createCheckoutSession,
  formatAudFromCents,
  type ClubPayoutCadence,
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
}

const LIT_OBSIDIAN_BTN =
  'bg-[#0F0F11] text-white font-mono font-bold text-xs py-4 px-7 rounded-xl border border-black/15 transition-all uppercase tracking-wider text-center cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-2px_0_rgba(0,0,0,0.8),0_10px_25px_rgba(0,0,0,0.25),0_0_15px_rgba(204,255,0,0.18)] hover:bg-[#080808] hover:border-[#CCFF00] hover:text-[#CCFF00] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-2px_0_rgba(0,0,0,0.9),0_15px_30px_rgba(0,0,0,0.35),0_0_28px_rgba(204,255,0,0.35)] active:translate-y-[1px]';

export const StripeEscrowCheckoutModal: React.FC<StripeEscrowCheckoutModalProps> = ({
  payload,
  onClose,
}) => {
  const [openingCheckout, setOpeningCheckout] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!payload) return;
    setOpeningCheckout(false);
    setErrorMsg(null);
  }, [payload]);

  useEffect(() => {
    if (!payload) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !openingCheckout) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [payload, openingCheckout, onClose]);

  if (!payload) return null;

  const split = calculateExactSplitLedger(
    payload.priceAud,
    payload.postcode,
    payload.athleteId,
  );

  const openStripeCheckout = async () => {
    if (openingCheckout) return;
    setErrorMsg(null);
    setOpeningCheckout(true);
    try {
      const { checkoutUrl, sessionId } = await createCheckoutSession({
        athleteId: payload.athleteId,
        tierId: payload.tierId,
        amountAud: payload.priceAud,
        postcode: payload.postcode,
        athlete: {
          full_name: payload.athleteName,
          grassroots_club_name: payload.clubName,
          image_url: payload.athleteImage,
        },
      });
      if (!checkoutUrl || !/^cs_(test|live)_[a-zA-Z0-9]+$/.test(sessionId)) {
        throw new Error('Secure Stripe Checkout is unavailable.');
      }
      window.location.assign(checkoutUrl);
    } catch (error) {
      setOpeningCheckout(false);
      setErrorMsg(error instanceof Error ? error.message : 'Unable to open Stripe Checkout.');
    }
  };

  return createPortal(
    <div
      data-lenis-prevent="true"
      onWheel={(e) => e.stopPropagation()}
      onClick={() => !openingCheckout && onClose()}
      className="fixed inset-0 z-[110] bg-black/65 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 selection:bg-[#CCFF00] selection:text-[#080808] animate-fadeIn"
    >
      <div
        data-lenis-prevent="true"
        onWheel={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-[630px] max-h-[94dvh] sm:max-h-[92dvh] rounded-t-[24px] sm:rounded-[24px] bg-[#FFFFFF] text-[#080808] border border-black/10 shadow-[0_35px_100px_rgba(0,0,0,0.45)] flex flex-col overflow-hidden"
      >
        <header className="shrink-0 flex items-start justify-between gap-4 border-b border-black/10 bg-[#FFFFFF] px-5 py-4 sm:px-7 sm:py-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 font-sans text-xs tracking-tight">
              <span className="font-display font-black text-sm tracking-[-0.04em] text-[#080808]">
                tmrw<span className="text-[#CCFF00]">/.</span>
              </span>
              <span className="bg-[#CCFF00] text-[#080808] font-bold px-2 py-0.5 rounded-[4px] text-[11px]">
                Sponsorship checkout
              </span>
            </div>
            <h2 className="m-0 mt-2 font-display text-3xl sm:text-4xl font-black uppercase tracking-[-0.03em] leading-none text-[#080808]">
              {formatAudFromCents(split.grossCents)} AUD<span className="text-[#CCFF00]">.</span>{' '}
              <span className="text-neutral-500 font-sans text-sm sm:text-base font-bold normal-case tracking-tight">
                {payload.packageName}
              </span>
            </h2>
            <p className="m-0 mt-1 font-sans text-xs text-neutral-600 truncate">
              Contender: <strong className="text-[#080808]">{payload.athleteName}</strong> · Postcode {payload.postcode} · Club: <strong className="text-[#080808]">{payload.clubName}</strong>
            </p>
          </div>

          <button
            type="button"
            disabled={openingCheckout}
            onClick={onClose}
            className="shrink-0 rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] px-4 py-1.5 font-sans text-xs font-bold border-0 cursor-pointer transition-colors"
          >
            Close ✕
          </button>
        </header>

        <div
          data-lenis-prevent="true"
          onWheel={(e) => e.stopPropagation()}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7 space-y-4 bg-[#FFFFFF]"
        >
          <div className="rounded-2xl border border-black/10 bg-[#F2F2F0] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 font-sans text-xs">
              <span className="font-bold text-[#080808]">
                Estimated distribution<span className="text-[#CCFF00]">.</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 font-mono">
              <div className="rounded-xl bg-[#080808] text-white p-3">
                <span className="block text-[8.5px] text-neutral-400 uppercase">70% ATHLETE (7000 BPS)</span>
                <strong className="text-base sm:text-lg text-white">
                  {formatAudFromCents(split.athlete70Cents)}
                </strong>
              </div>

              <div className="rounded-xl bg-white border border-black/10 p-3 text-[#080808]">
                <span className="block text-[8.5px] text-neutral-500 uppercase">15% CLUB (1500 BPS)</span>
                <strong className="text-base sm:text-lg text-[#080808]">
                  {formatAudFromCents(split.club15Cents)}
                </strong>
              </div>

              <div className="rounded-xl bg-white border border-black/10 p-3 text-[#080808]">
                <span className="block text-[8.5px] text-neutral-500 uppercase">15% TMRW/. OPS</span>
                <strong className="text-base sm:text-lg text-[#080808]">
                  {formatAudFromCents(split.ops15Cents)}
                </strong>
              </div>
            </div>

          </div>

          <p className="m-0 rounded-2xl border border-black/10 bg-[#F2F2F0] p-4 text-xs text-neutral-600">
            Stripe Checkout confirms the final amount and payment methods. It does not confirm a payout schedule.
          </p>

          {errorMsg && (
            <p className="m-0 font-mono text-xs text-[#FF3300] text-center">{errorMsg}</p>
          )}
        </div>

        <footer className="shrink-0 border-t border-black/10 bg-[#FFFFFF] px-5 py-4 sm:px-7">
          <button
            type="button"
            disabled={openingCheckout}
            onClick={() => void openStripeCheckout()}
            className={`w-full ${LIT_OBSIDIAN_BTN} disabled:opacity-40`}
          >
            {openingCheckout ? 'OPENING STRIPE CHECKOUT…' : 'CONTINUE TO STRIPE CHECKOUT →'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
};

export default StripeEscrowCheckoutModal;