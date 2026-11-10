import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { WhitelistingGrant } from '../lib/whitelisting';

interface WhitelistingLaunchModalProps {
  grant: WhitelistingGrant;
  onClose: () => void;
}

export const WhitelistingLaunchModal: React.FC<WhitelistingLaunchModalProps> = ({
  grant,
  onClose,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [metaConnecting, setMetaConnecting] = useState(false);
  const [metaConnected, setMetaConnected] = useState(false);
  const [tiktokConnecting, setTiktokConnecting] = useState(false);
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [dailyAdBudget, setDailyAdBudget] = useState(50);
  const [businessManagerId, setBusinessManagerId] = useState('BM-849201449');
  const [receiptDownloaded, setReceiptDownloaded] = useState(false);

  const copyToClipboard = (label: string, value: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopiedField(label);
    window.setTimeout(() => setCopiedField(null), 2000);
  };

  const triggerMetaOAuth = () => {
    setMetaConnecting(true);
    window.setTimeout(() => {
      setMetaConnecting(false);
      setMetaConnected(true);
    }, 650);
  };

  const triggerTiktokOAuth = () => {
    setTiktokConnecting(true);
    window.setTimeout(() => {
      setTiktokConnecting(false);
      setTiktokConnected(true);
    }, 650);
  };

  const estimatedFourteenDayReach = Math.round(dailyAdBudget * 14 * 42);

  return createPortal(
    <div
      data-lenis-prevent="true"
      onClick={onClose}
      className="fixed inset-0 z-[95] bg-black/65 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 selection:bg-[#CCFF00] selection:text-[#0F0F11] animate-fadeIn"
    >
      <div
        data-lenis-prevent="true"
        onWheel={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[1380px] max-h-[92dvh] rounded-[28px] bg-[#FFFFFF] text-[#0F0F11] shadow-[0_35px_100px_rgba(0,0,0,0.45)] border border-black/10 flex flex-col overflow-hidden"
      >
        <header className="shrink-0 flex flex-wrap items-center justify-between gap-4 px-6 sm:px-10 py-5 bg-[#FFFFFF] border-b border-black/10">
          <div className="flex items-center gap-3">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#CCFF00] ring-4 ring-[#CCFF00]/30" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#0F0F11]">
              COMMERCIAL RIGHTS CLEARED · API HANDLE LINKING ACTIVE
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setReceiptDownloaded(true)}
              className="rounded-full bg-[#EAEAE6] hover:bg-[#CCFF00] text-[#0F0F11] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer border-0"
            >
              {receiptDownloaded ? '✓ RCTI & Token Pack Pulled' : '↓ Download RCTI & Token Pack'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-[#0F0F11] hover:bg-[#CCFF00] text-white hover:text-[#0F0F11] px-5 py-2 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer border-0"
            >
              Done &amp; Close ✕
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 sm:px-10 py-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
            <div className="rounded-[24px] bg-[#0F0F11] p-8 text-white flex flex-col justify-between min-h-[240px]">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#CCFF00] block mb-3">
                  DIRECT HANDLE SPONSORSHIP
                </span>
                <h2 className="m-0 font-sans text-3xl sm:text-4xl font-black uppercase tracking-[-0.03em] leading-[1.02]">
                  {grant.athleteName}
                  <span className="text-[#CCFF00]">.</span>
                </h2>
              </div>
              <p className="m-0 font-sans text-xs text-neutral-300 leading-relaxed pt-4 border-t border-white/10">
                Your brand is now authorised to run geo-fenced Meta and TikTok ads directly through {grant.athleteName}’s verified handle.
              </p>
            </div>

            <div className="rounded-[24px] bg-gradient-to-br from-[#93C5FD] via-[#818CF8] to-[#C084FC] p-8 text-[#0F0F11] flex flex-col justify-between min-h-[240px]">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#0F0F11]/70 block mb-3">
                  TERRITORY EXCLUSIVITY LOCKED
                </span>
                <h3 className="m-0 font-sans text-3xl sm:text-4xl font-black uppercase tracking-[-0.03em] leading-[1.02]">
                  Postcode {grant.postcode}
                  <span className="text-[#CCFF00]">.</span>
                </h3>
              </div>
              <p className="m-0 font-sans text-xs font-semibold text-[#0F0F11]/85 leading-relaxed pt-4 border-t border-black/10">
                Direct competitors in your category are locked out of {grant.athleteName}’s feed across your active trading radius.
              </p>
            </div>

            <div className="rounded-[24px] bg-[#EAEAE6] p-8 text-[#0F0F11] flex flex-col justify-between min-h-[240px]">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500 block mb-3">
                  70 / 15 / 15 CLEARING PROTOCOL
                </span>
                <p className="m-0 font-sans text-2xl sm:text-3xl font-black uppercase tracking-tight leading-none">
                  ATO &amp; NZ IRD RCTI Issued<span className="text-[#CCFF00]">.</span>
                </p>
              </div>
              <div className="space-y-2 pt-4 border-t border-black/10">
                <div className="flex h-2.5 w-full rounded-full overflow-hidden">
                  <span className="w-[70%] bg-[#0F0F11]" />
                  <span className="w-[15%] bg-neutral-400" />
                  <span className="w-[15%] bg-[#CCFF00]" />
                </div>
                <p className="m-0 font-mono text-[10px] uppercase tracking-wider text-neutral-600">
                  70% Athlete · 15% Junior Club · 15% Platform Ops
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            <div className="lg:col-span-4 rounded-[22px] bg-[#EAEAE6] p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-600">
                    META PARTNERSHIP ADS (INSTAGRAM)
                  </span>
                  <span className="rounded-full bg-[#CCFF00] text-[#0F0F11] font-mono text-[9.5px] font-bold uppercase px-2.5 py-0.5">
                    Included in Package
                  </span>
                </div>
                <h4 className="m-0 font-sans text-xl font-black tracking-tight text-[#0F0F11]">
                  Link Meta Business Manager
                </h4>
                <p className="m-0 mt-2 font-sans text-xs text-neutral-600 leading-relaxed">
                  Enter your Meta Business Manager ID to push pre-cleared Partnership Ads through {grant.athleteName}’s Instagram handle.
                </p>

                <div className="mt-4 space-y-2">
                  <label className="block font-mono text-[9.5px] font-bold uppercase tracking-wider text-neutral-500">
                    YOUR META BUSINESS MANAGER ID
                  </label>
                  <input
                    type="text"
                    value={businessManagerId}
                    onChange={(e) => setBusinessManagerId(e.target.value)}
                    className="w-full rounded-xl bg-white border border-black/15 px-3.5 py-2.5 font-mono text-xs text-[#0F0F11]"
                  />
                </div>

                <div className="mt-3 rounded-xl bg-white p-3 border border-black/10 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono text-[9px] uppercase text-neutral-400 block">
                      OAUTH HANDLE TOKEN
                    </span>
                    <span className="font-mono text-xs font-bold text-[#0F0F11] truncate block">
                      {grant.grantId || `IG-AUTH-${grant.postcode}-9941`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard('meta', grant.grantId || `IG-AUTH-${grant.postcode}-9941`)
                    }
                    className="rounded-lg bg-[#0F0F11] text-[#CCFF00] font-mono text-[9.5px] font-bold uppercase px-3 py-1.5 cursor-pointer border-0 shrink-0"
                  >
                    {copiedField === 'meta' ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={triggerMetaOAuth}
                className={`mt-5 w-full rounded-full py-3 font-mono text-[10px] font-bold uppercase tracking-widest cursor-pointer border-0 transition-colors ${
                  metaConnected
                    ? 'bg-[#CCFF00] text-[#0F0F11]'
                    : 'bg-[#0F0F11] hover:bg-[#CCFF00] text-white hover:text-[#0F0F11]'
                }`}
              >
                {metaConnecting
                  ? 'Handshaking with Meta Graph API...'
                  : metaConnected
                  ? `✓ OAuth Linked to ${businessManagerId}`
                  : '1-Click Authorise Meta Ads Manager →'}
              </button>
            </div>

            <div className="lg:col-span-4 rounded-[22px] bg-[#EAEAE6] p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-600">
                    TIKTOK SPARK ADS (9:16 REELS)
                  </span>
                  <span className="rounded-full bg-[#CCFF00] text-[#0F0F11] font-mono text-[9.5px] font-bold uppercase px-2.5 py-0.5">
                    30-Day Window
                  </span>
                </div>
                <h4 className="m-0 font-sans text-xl font-black tracking-tight text-[#0F0F11]">
                  Activate TikTok Spark Code
                </h4>
                <p className="m-0 mt-2 font-sans text-xs text-neutral-600 leading-relaxed">
                  Paste this pre-authorised Spark Code into TikTok Ads Manager under “Creator Authorised Posts” to boost 9:16 vertical stems.
                </p>

                <div className="mt-4 rounded-xl bg-white p-3.5 border border-black/10 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono text-[9px] uppercase text-neutral-400 block">
                      30-DAY SPARK AUTHORISATION CODE
                    </span>
                    <span className="font-mono text-xs font-bold text-[#0F0F11] truncate block">
                      {`TT-SPARK-${grant.postcode}-88219X`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard('tiktok', `TT-SPARK-${grant.postcode}-88219X`)
                    }
                    className="rounded-lg bg-[#0F0F11] text-[#CCFF00] font-mono text-[9.5px] font-bold uppercase px-3 py-1.5 cursor-pointer border-0 shrink-0"
                  >
                    {copiedField === 'tiktok' ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>

                <div className="mt-3 rounded-xl bg-white/70 p-3 font-mono text-[10px] text-neutral-700 space-y-1">
                  <div className="flex justify-between">
                    <span>GEO-FENCE LOCK:</span>
                    <strong className="text-[#0F0F11]">POSTCODE {grant.postcode}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>HANDLE FEE:</span>
                    <strong className="text-[#0F0F11]">$0.00 (INCLUDED)</strong>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={triggerTiktokOAuth}
                className={`mt-5 w-full rounded-full py-3 font-mono text-[10px] font-bold uppercase tracking-widest cursor-pointer border-0 transition-colors ${
                  tiktokConnected
                    ? 'bg-[#CCFF00] text-[#0F0F11]'
                    : 'bg-[#0F0F11] hover:bg-[#CCFF00] text-white hover:text-[#0F0F11]'
                }`}
              >
                {tiktokConnecting
                  ? 'Verifying Spark Stem Token...'
                  : tiktokConnected
                  ? '✓ TikTok Spark Stem Synced'
                  : 'Sync Spark Code to TikTok Ads →'}
              </button>
            </div>

            <div className="lg:col-span-4 rounded-[22px] bg-[#0F0F11] text-white p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#CCFF00]">
                    PAID SOCIAL AMPLIFICATION SIMULATOR
                  </span>
                  <span className="font-mono text-[9.5px] text-neutral-400 uppercase">
                    0% MARKUP
                  </span>
                </div>
                <h4 className="m-0 font-sans text-xl font-black tracking-tight text-white">
                  You Control the Ad Budget
                </h4>
                <p className="m-0 mt-2 font-sans text-xs text-neutral-300 leading-relaxed">
                  API handle access is included in your package. You pay Meta or TikTok directly for whatever ad spend you choose to put behind the post.
                </p>

                <div className="mt-5">
                  <div className="flex items-center justify-between font-mono text-xs mb-2">
                    <span className="text-neutral-400">DAILY AD SPEND (DIRECT TO META/TIKTOK)</span>
                    <strong className="text-[#CCFF00] text-sm">A${dailyAdBudget}/day</strong>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={250}
                    step={5}
                    value={dailyAdBudget}
                    onChange={(e) => setDailyAdBudget(Number(e.target.value))}
                    className="w-full accent-[#CCFF00] cursor-pointer"
                  />
                </div>

                <div className="mt-4 rounded-xl bg-white/5 border border-white/10 p-3.5 space-y-1.5 font-mono text-[10.5px]">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">14-DAY DIRECT AD BUDGET:</span>
                    <strong className="text-white">A${(dailyAdBudget * 14).toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">EST. POSTCODE {grant.postcode} REACH:</span>
                    <strong className="text-[#CCFF00]">
                      {estimatedFourteenDayReach.toLocaleString()} Local Feeds
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">TMRW/. MEDIA AGENCY MARKUP:</span>
                    <strong className="text-[#CCFF00]">$0.00 (ZERO CLIP)</strong>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between font-mono text-[10px] text-neutral-400">
                <span>100% TAX DEDUCTIBLE</span>
                <span className="text-white font-bold">ATO / IRD CLEARED</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default WhitelistingLaunchModal;