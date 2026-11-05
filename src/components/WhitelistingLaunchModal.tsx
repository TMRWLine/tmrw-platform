import React, { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { FilmGrainOverlay } from './FilmGrainOverlay';
import type { WhitelistingGrant } from '../lib/whitelisting';

interface WhitelistingLaunchModalProps {
  grant: WhitelistingGrant;
  onClose: () => void;
}

function formatGrantDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the execCommand path used by older local test benches.
  }

  try {
    const input = document.createElement('textarea');
    input.value = value;
    input.setAttribute('readonly', 'true');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(input);
    return copied;
  } catch {
    return false;
  }
}

export const WhitelistingLaunchModal: React.FC<WhitelistingLaunchModalProps> = ({ grant, onClose }) => {
  const titleId = useId();
  const [copiedSpark, setCopiedSpark] = useState(false);
  const [copiedMeta, setCopiedMeta] = useState(false);
  const [metaLaunched, setMetaLaunched] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleCopySpark = async () => {
    const ok = await copyText(grant.tiktok_spark_code);
    if (!ok) return;
    setCopiedSpark(true);
    window.setTimeout(() => setCopiedSpark(false), 2200);
  };

  const handleCopyMeta = async () => {
    const ok = await copyText(grant.meta_partnership_token);
    if (!ok) return;
    setCopiedMeta(true);
    window.setTimeout(() => setCopiedMeta(false), 2200);
  };

  const handleLaunchMeta = () => {
    const params = new URLSearchParams({
      objective: 'OUTCOME_TRAFFIC',
      geo_radius_km: String(grant.radiusKm),
      postcode: grant.postcode,
      partnership_token: grant.meta_partnership_token,
    });
    window.open(
      `https://adsmanager.facebook.com/adsmanager/manage/campaigns?${params.toString()}`,
      '_blank',
      'noopener,noreferrer',
    );
    setMetaLaunched(true);
  };

  return createPortal(
    <div
      data-lenis-prevent="true"
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
    >
      <button
        type="button"
        aria-label="Close paid media licence"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md border-0 p-0 cursor-default"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="relative z-10 w-full max-w-[920px] max-h-[92dvh] overflow-y-auto rounded-[28px] bg-[#080808] text-white border border-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.45)]"
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
          <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-[#CCFF00]/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-48 w-full bg-gradient-to-t from-black to-transparent" />
          <FilmGrainOverlay intensity="fine" />
        </div>

        <div className="relative z-10 p-6 sm:p-8 md:p-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="m-0 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#CCFF00]">
                tmrw/. · 90-day paid media licence
              </p>
              <h2
                id={titleId}
                className="m-0 mt-3 font-display text-4xl sm:text-5xl md:text-[64px] font-black tracking-[-0.05em] leading-[0.86] uppercase"
              >
                Launch postcode ads
                <span className="text-[#CCFF00]">.</span>
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-10 items-center rounded-full bg-white/10 hover:bg-[#CCFF00] hover:text-[#080808] px-4 font-mono text-[10px] font-bold uppercase tracking-widest border-0 cursor-pointer transition-colors"
            >
              Close ✕
            </button>
          </div>

          <p className="m-0 mt-5 max-w-2xl font-sans text-sm sm:text-[15px] leading-relaxed text-white/70">
            Escrow is recognised. Copy the TikTok Spark Ad Code, then launch Meta postcode ads in one
            click, prioritising every phone inside a {grant.radiusKm}km radius of Postcode {grant.postcode}.
          </p>

          <dl className="m-0 mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
              <dt className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/45">Athlete</dt>
              <dd className="m-0 mt-1 font-sans text-sm font-bold">{grant.athleteName}</dd>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
              <dt className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/45">Catchment</dt>
              <dd className="m-0 mt-1 font-sans text-sm font-bold">
                {grant.postcode} · {grant.radiusKm}km
              </dd>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
              <dt className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/45">Expires</dt>
              <dd className="m-0 mt-1 font-sans text-sm font-bold">{formatGrantDate(grant.expiresAt)}</dd>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
              <dt className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/45">Ledger</dt>
              <dd className="m-0 mt-1 font-sans text-sm font-bold">
                {grant.source === 'supabase' ? 'Supabase live' : 'Local mock'}
              </dd>
            </div>
          </dl>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <article className="relative flex flex-col justify-between rounded-[22px] bg-[#F7F7F6] text-[#080808] p-6 min-h-[280px] overflow-hidden">
              <span className="absolute -top-2.5 right-5 rounded-full bg-[#FF3300] text-white px-3 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider">
                01 Spark
              </span>
              <div>
                <h3 className="m-0 font-sans text-[20px] font-bold tracking-[-0.03em]">
                  <span className="bg-[#CCFF00] px-1.5 -ml-1.5 rounded-[4px]">TikTok</span> Spark Ad Code
                </h3>
                <p className="m-0 mt-2 font-sans text-[13px] leading-relaxed text-[#555555]">
                  Authorise Spark Ads against the athlete’s owned handle. The code stays valid for the
                  90-day licence window.
                </p>
                <code className="mt-5 block break-all rounded-2xl bg-[#080808] text-[#CCFF00] px-4 py-3 font-mono text-[12px] font-bold tracking-wide">
                  {grant.tiktok_spark_code}
                </code>
              </div>
              <button
                type="button"
                onClick={handleCopySpark}
                className="mt-5 w-full rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] font-mono text-[10px] font-bold uppercase tracking-widest py-3.5 border-0 cursor-pointer transition-colors"
              >
                {copiedSpark ? 'Spark code copied' : 'Copy TikTok Spark Ad Code'}
              </button>
            </article>

            <article className="relative flex flex-col justify-between rounded-[22px] bg-[#CCFF00] text-[#080808] p-6 min-h-[280px] overflow-hidden">
              <span className="absolute -top-2.5 right-5 rounded-full bg-[#080808] text-[#CCFF00] px-3 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider">
                02 Meta
              </span>
              <div>
                <h3 className="m-0 font-sans text-[20px] font-bold tracking-[-0.03em]">
                  <span className="bg-white px-1.5 -ml-1.5 rounded-[4px]">Meta</span> Postcode Ads
                </h3>
                <p className="m-0 mt-2 font-sans text-[13px] leading-relaxed text-[#333333]">
                  One click opens Ads Manager with the recognised partnership token, locked to the
                  granted {grant.radiusKm}km trading radius.
                </p>
                <code className="mt-5 block break-all rounded-2xl bg-[#080808] text-white px-4 py-3 font-mono text-[11px] font-bold tracking-wide">
                  {grant.meta_partnership_token}
                </code>
              </div>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleLaunchMeta}
                  className="w-full rounded-full bg-[#080808] hover:bg-white text-white hover:text-[#080808] font-mono text-[10px] font-bold uppercase tracking-widest py-3.5 border-0 cursor-pointer transition-colors"
                >
                  {metaLaunched ? 'Meta postcode ads launched' : 'Launch Meta Postcode Ads'}
                </button>
                <button
                  type="button"
                  onClick={handleCopyMeta}
                  className="w-full rounded-full bg-transparent text-[#080808] font-mono text-[10px] font-bold uppercase tracking-widest py-2 border-0 cursor-pointer"
                >
                  {copiedMeta ? 'Partnership token copied' : 'Copy partnership token'}
                </button>
              </div>
            </article>
          </div>

          {metaLaunched ? (
            <p className="m-0 mt-5 rounded-2xl bg-white/[0.08] border border-[#CCFF00]/40 px-4 py-3 font-sans text-sm text-[#CCFF00]">
              Meta delivery is live and prioritising devices within {grant.radiusKm}km of Postcode{' '}
              {grant.postcode}.
            </p>
          ) : null}

          <p className="m-0 mt-6 font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
            Grant {grant.id} · Flight {grant.flightTierId} · Issued {formatGrantDate(grant.issuedAt)}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default WhitelistingLaunchModal;
