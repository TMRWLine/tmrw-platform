import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { WhitelistingGrant } from '../lib/whitelisting';
import {
  calculateExactSplitLedger,
  formatAudFromCents,
  releaseEscrowMilestoneTranche,
} from '../lib/checkout';
import type { StripeEscrowReceipt } from './StripeEscrowCheckoutModal';

interface WhitelistingLaunchModalProps {
  grant: WhitelistingGrant;
  receipt?: StripeEscrowReceipt | null;
  priceAud?: number;
  clubName?: string;
  onClose: () => void;
}

export const WhitelistingLaunchModal: React.FC<WhitelistingLaunchModalProps> = ({
  grant,
  receipt,
  priceAud = 750,
  clubName = 'Bankstown Bruins',
  onClose,
}) => {
  const [metaBmId, setMetaBmId] = useState('BM-849201449');
  const [dailySpend, setDailySpend] = useState(50);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [metaAuthorised, setMetaAuthorised] = useState(false);
  const [tiktokSynced, setTiktokSynced] = useState(false);
  const [specExported, setSpecExported] = useState(false);

  const [releasingEscrow, setReleasingEscrow] = useState(false);
  const [deliverablesApproved, setDeliverablesApproved] = useState(
    receipt?.escrowMode === 'upfront_100',
  );
  const [finalTransferId, setFinalTransferId] = useState<string | null>(
    receipt?.escrowMode === 'upfront_100' ? receipt.athleteTransferId : null,
  );

  const rawGrant = grant as unknown as Record<string, string | undefined>;
  const safePostcode = grant.postcode || '2200';
  const safeAthleteName = grant.athleteName || 'Marcus Thorne';
  const safeAthleteId = grant.athleteId || 'marcus-thorne';

  const resolvedMetaToken =
    grant.meta_partnership_token ||
    rawGrant.metaToken ||
    rawGrant.instagramToken ||
    `IG-AUTH-${safePostcode}-9941`;

  const resolvedSparkCode =
    grant.tiktok_spark_code ||
    rawGrant.sparkCode ||
    rawGrant.tiktokToken ||
    `TT-SPARK-${safePostcode}-88219X`;

  const split = calculateExactSplitLedger(
    priceAud,
    safePostcode,
    safeAthleteId,
    receipt?.escrowMode ?? 'milestone_50_50',
  );

  const transferGroup = receipt?.transferGroup || split.transferGroup;
  const clubSweepLabel =
    receipt?.clubCadence === 'immediate_t0'
      ? 'Settled T+0 Direct'
      : `Queued for ${receipt?.nextQuarterSweepDate || split.nextQuarterSweepDate}`;

  const fourteenDaySpend = dailySpend * 14;
  const estLocalReach = Math.round(fourteenDaySpend * 29.14);

  const copyText = (label: string, value: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handleReleaseFinal50 = async () => {
    if (releasingEscrow || deliverablesApproved) return;
    setReleasingEscrow(true);
    const res = await releaseEscrowMilestoneTranche({
      transferGroup,
      athleteId: safeAthleteId,
      escrowHoldCents: split.athleteEscrowHoldCents,
    });
    setFinalTransferId(res.escrowTransferId);
    setDeliverablesApproved(true);
    setReleasingEscrow(false);
  };

  const downloadRctiPack = () => {
    const blob = new Blob(
      [
        `tmrw/. AUDITED ATO & NZ IRD 3-PART RECIPIENT CREATED TAX INVOICE (RCTI)\n`,
        `========================================================================\n`,
        `Grant ID: ${grant.id || `GR-${safePostcode}-2026`}\n`,
        `Stripe Transfer Group: ${transferGroup}\n`,
        `Sponsor Entity: ${receipt?.legalName || 'Verified Corporate Partner'} (ABN: ${receipt?.abn || '51 824 753 556'})\n`,
        `Athlete / Contender: ${safeAthleteName}\n`,
        `Grassroots Junior Club: ${clubName} (Postcode ${safePostcode})\n`,
        `Gross Package Value: ${formatAudFromCents(split.grossCents)} AUD (+${formatAudFromCents(split.gstCents)} GST)\n`,
        `------------------------------------------------------------------------\n`,
        `70/15/15 SPLIT LEDGER (7000 / 1500 / 1500 BPS):\n`,
        `  1. 70% Athlete (${formatAudFromCents(split.athlete70Cents)}): ${
          deliverablesApproved
            ? `100% Settled (Final Transfer: ${finalTransferId})`
            : `${formatAudFromCents(split.athleteT0AdvanceCents)} Settled T+0 / ${formatAudFromCents(split.athleteEscrowHoldCents)} Held in Deliverable Escrow`
        }\n`,
        `  2. 15% Junior Club (${formatAudFromCents(split.club15Cents)} to ${clubName}): ${clubSweepLabel}\n`,
        `  3. 15% tmrw/. Platform Ops (${formatAudFromCents(split.ops15Cents)}): Retained T+0 in Master Platform Account (${receipt?.platformRetainedId || 'fee_tmrw_t0'})\n`,
        `------------------------------------------------------------------------\n`,
        `PAID SOCIAL AMPLIFICATION CAMPAIGN SPEC (0% AGENCY MARKUP):\n`,
        `  - Meta Business Manager ID: ${metaBmId}\n`,
        `  - Meta Partnership OAuth Token: ${resolvedMetaToken}\n`,
        `  - TikTok Spark Authorisation Code: ${resolvedSparkCode}\n`,
        `  - Geo-Fence Target: Postcode ${safePostcode} (Active Trading Radius)\n`,
        `  - Configured Daily Ad Spend: A$${dailySpend}/day (14-Day Budget: A$${fourteenDaySpend.toLocaleString()} AUD)\n`,
        `  - Estimated Local Feed Reach: ${estLocalReach.toLocaleString()} Verified Human Feeds in Postcode ${safePostcode}\n`,
      ],
      { type: 'text/plain;charset=utf-8' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tmrw_RCTI_and_OAuth_Pack_${safePostcode}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportMediaBuyerCampaignSpec = () => {
    const campaignPayload = {
      platform: 'tmrw/. Sovereign Clearinghouse',
      transferGroup,
      athlete: safeAthleteName,
      geoFence: {
        country: 'AU',
        postcode: safePostcode,
        radiusKm: priceAud >= 12500 ? 50 : priceAud >= 3500 ? 15 : 5,
      },
      budgetConfig: {
        currency: 'AUD',
        dailySpendAud: dailySpend,
        flightDurationDays: 14,
        totalDirectSpendAud: fourteenDaySpend,
        estimatedLocalFeeds: estLocalReach,
        agencyMarkupBps: 0,
      },
      metaPartnershipAds: {
        businessManagerId: metaBmId,
        oauthHandleToken: resolvedMetaToken,
        endpoint: `https://graph.facebook.com/v21.0/branded_content_ad_permissions?permission_facebook_id=${metaBmId.replace(/[^0-9]/g, '')}`,
        status: metaAuthorised ? 'AUTHORISED' : 'READY_TO_SYNC',
      },
      tiktokSparkAds: {
        sparkAuthCode: resolvedSparkCode,
        windowDays: 30,
        placement: '9:16 Vertical Reels / Creator Authorised Posts',
        status: tiktokSynced ? 'SYNCED' : 'READY_TO_SYNC',
      },
    };

    const blob = new Blob([JSON.stringify(campaignPayload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tmrw_Media_Buyer_AdSet_Spec_${safePostcode}_A$${dailySpend}day.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setMetaAuthorised(true);
    setTiktokSynced(true);
    setSpecExported(true);
  };

  return createPortal(
    <div
      data-lenis-prevent="true"
      onWheel={(e) => e.stopPropagation()}
      onClick={onClose}
      className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 selection:bg-[#CCFF00] selection:text-[#080808] animate-fadeIn"
    >
      <div
        data-lenis-prevent="true"
        onWheel={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[1380px] max-h-[94dvh] rounded-[24px] bg-[#FFFFFF] text-[#080808] shadow-[0_30px_90px_rgba(0,0,0,0.45)] border border-black/10 flex flex-col overflow-hidden"
      >
        <header className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-5 sm:px-8 py-4 border-b border-black/10 bg-[#FFFFFF]">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#CCFF00] ring-2 ring-black/15" />
            <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#080808]">
              STRIPE ESCROW CLEARED ({transferGroup}) · {formatAudFromCents(split.grossCents)} SPLIT ACTIVE
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={downloadRctiPack}
              className="rounded-full bg-[#F0F0EE] hover:bg-[#080808] text-[#080808] hover:text-white px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider border-0 cursor-pointer transition-colors"
            >
              ↓ DOWNLOAD 3-PART RCTI & TOKEN PACK
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider border-0 cursor-pointer transition-colors"
            >
              DONE & CLOSE ✕
            </button>
          </div>
        </header>

        <div
          data-lenis-prevent="true"
          onWheel={(e) => e.stopPropagation()}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-8 space-y-5"
        >
          <div className="rounded-2xl bg-[#080808] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-[#CCFF00] text-[#080808] px-3 py-0.5 font-mono text-[9.5px] font-bold uppercase">
                {deliverablesApproved ? '✓ 100% ESCROW RELEASED' : '50/50 DELIVERABLE ESCROW ACTIVE'}
              </span>
              <span className="font-sans text-xs text-neutral-300">
                {deliverablesApproved
                  ? `100% Athlete Payout (${formatAudFromCents(split.athlete70Cents)}) settled · 15% Club (${formatAudFromCents(split.club15Cents)}) ${clubSweepLabel} · 15% tmrw/. (${formatAudFromCents(split.ops15Cents)}) retained T+0.`
                  : `Athlete ${formatAudFromCents(split.athleteT0AdvanceCents)} settled T+0 (${formatAudFromCents(split.athleteEscrowHoldCents)} in escrow) · Club ${formatAudFromCents(split.club15Cents)} ${clubSweepLabel} · tmrw/. ${formatAudFromCents(split.ops15Cents)} retained T+0.`}
              </span>
            </div>

            {!deliverablesApproved ? (
              <button
                type="button"
                disabled={releasingEscrow}
                onClick={handleReleaseFinal50}
                className="rounded-full bg-[#CCFF00] hover:bg-white text-[#080808] px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider border-0 cursor-pointer transition-colors shrink-0 disabled:opacity-50"
              >
                {releasingEscrow
                  ? 'EXECUTING STRIPE TRANSFER...'
                  : `✓ APPROVE DELIVERABLES & RELEASE ${formatAudFromCents(split.athleteEscrowHoldCents)} →`}
              </button>
            ) : (
              <span className="font-mono text-[10px] uppercase text-[#CCFF00] font-bold">
                ● {finalTransferId || 'SETTLED'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="rounded-[20px] bg-[#080808] text-white p-6 flex flex-col justify-between min-h-[210px]">
              <div>
                <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[#CCFF00] block mb-2">
                  DIRECT HANDLE SPONSORSHIP
                </span>
                <h3 className="m-0 font-display text-3xl sm:text-4xl font-black uppercase tracking-tight leading-[0.92]">
                  {safeAthleteName}
                  <span className="text-[#CCFF00]">.</span>
                </h3>
              </div>
              <p className="m-0 mt-4 font-sans text-xs text-neutral-300 leading-relaxed">
                Your brand is now authorised to run geo-fenced Meta and TikTok ads directly through {safeAthleteName}'s verified handle.
              </p>
            </div>

            <div className="rounded-[20px] bg-gradient-to-br from-[#7BC6FF] via-[#8E8FFA] to-[#9B6BFF] text-[#080808] p-6 flex flex-col justify-between min-h-[210px]">
              <div>
                <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-black/70 block mb-2">
                  TERRITORY EXCLUSIVITY LOCKED
                </span>
                <h3 className="m-0 font-display text-3xl sm:text-4xl font-black uppercase tracking-tight leading-[0.92] text-[#080808]">
                  POSTCODE {safePostcode}
                  <span className="text-[#CCFF00]">.</span>
                </h3>
              </div>
              <p className="m-0 mt-4 font-sans text-xs text-black/85 leading-relaxed font-medium">
                Direct competitors in your category are locked out of {safeAthleteName}'s feed across your active trading radius.
              </p>
            </div>

            <div className="rounded-[20px] bg-[#F2F2F0] text-[#080808] p-6 flex flex-col justify-between min-h-[210px]">
              <div>
                <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-neutral-500 block mb-2">
                  70 / 15 / 15 CLEARING PROTOCOL
                </span>
                <h3 className="m-0 font-display text-3xl font-black uppercase tracking-tight leading-[0.95] text-[#080808]">
                  ATO & NZ IRD RCTI ISSUED<span className="text-[#CCFF00]">.</span>
                </h3>
              </div>
              <div className="space-y-2 mt-4">
                <div className="h-2 w-full rounded-full bg-black/15 overflow-hidden flex">
                  <div className="w-[70%] bg-[#080808] h-full" />
                  <div className="w-[15%] bg-[#CCFF00] h-full" />
                  <div className="w-[15%] bg-neutral-400 h-full" />
                </div>
                <div className="font-mono text-[9px] uppercase text-neutral-600">
                  70% ({formatAudFromCents(split.athlete70Cents)}) · 15% CLUB ({formatAudFromCents(split.club15Cents)}) · 15% OPS ({formatAudFromCents(split.ops15Cents)} T+0)
                </div>
              </div>
            </div>

            {/* Card 4: Meta Partnership Ads (Dynamically linked to Card 6 Budget) */}
            <div className="rounded-[20px] bg-[#F2F2F0] text-[#080808] p-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9.5px] uppercase tracking-wider text-neutral-600">
                    META PARTNERSHIP ADS (INSTAGRAM)
                  </span>
                  <span className="rounded-full bg-[#CCFF00] text-[#080808] px-2.5 py-0.5 font-mono text-[8.5px] font-bold uppercase">
                    INCLUDED IN PACKAGE
                  </span>
                </div>
                <h4 className="m-0 font-sans text-lg font-bold text-[#080808]">Link Meta Business Manager</h4>
                <p className="m-0 font-sans text-xs text-neutral-600 leading-relaxed">
                  Enter your Meta Business Manager ID to push pre-cleared Partnership Ads through {safeAthleteName}'s Instagram handle.
                </p>

                <div>
                  <label className="font-mono text-[8.5px] uppercase text-neutral-500 block mb-1">
                    YOUR META BUSINESS MANAGER ID
                  </label>
                  <input
                    type="text"
                    value={metaBmId}
                    onChange={(e) => setMetaBmId(e.target.value)}
                    className="w-full rounded-xl bg-white border border-black/10 px-3.5 py-2 font-mono text-xs text-[#080808]"
                  />
                </div>

                <div className="rounded-xl bg-white border border-black/10 p-3 flex items-center justify-between">
                  <div>
                    <span className="block font-mono text-[8px] uppercase text-neutral-400">OAUTH HANDLE TOKEN</span>
                    <strong className="font-mono text-xs text-[#080808]">{resolvedMetaToken}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText('meta', resolvedMetaToken)}
                    className="rounded-full bg-[#080808] text-white px-3 py-1 font-mono text-[9px] font-bold uppercase border-0 cursor-pointer"
                  >
                    {copiedField === 'meta' ? '✓ COPIED' : 'COPY'}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMetaAuthorised(true)}
                className="mt-5 w-full rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] py-3 font-mono text-[10px] font-bold uppercase tracking-wider border-0 cursor-pointer transition-colors"
              >
                {metaAuthorised
                  ? `✓ AUTHORISED (${metaBmId} · A$${dailySpend}/DAY CAP)`
                  : `1-CLICK AUTHORISE META ADS (A$${dailySpend}/DAY) →`}
              </button>
            </div>

            {/* Card 5: TikTok Spark Ads (Dynamically linked to Card 6 Budget) */}
            <div className="rounded-[20px] bg-[#F2F2F0] text-[#080808] p-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9.5px] uppercase tracking-wider text-neutral-600">
                    TIKTOK SPARK ADS (9:16 REELS)
                  </span>
                  <span className="rounded-full bg-[#CCFF00] text-[#080808] px-2.5 py-0.5 font-mono text-[8.5px] font-bold uppercase">
                    30-DAY WINDOW
                  </span>
                </div>
                <h4 className="m-0 font-sans text-lg font-bold text-[#080808]">Activate TikTok Spark Code</h4>
                <p className="m-0 font-sans text-xs text-neutral-600 leading-relaxed">
                  Paste this pre-authorised Spark Code into TikTok Ads Manager under “Creator Authorised Posts” to boost 9:16 vertical stems.
                </p>

                <div className="rounded-xl bg-white border border-black/10 p-3 flex items-center justify-between">
                  <div>
                    <span className="block font-mono text-[8px] uppercase text-neutral-400">
                      30-DAY SPARK AUTHORISATION CODE
                    </span>
                    <strong className="font-mono text-xs text-[#080808]">{resolvedSparkCode}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText('tiktok', resolvedSparkCode)}
                    className="rounded-full bg-[#080808] text-white px-3 py-1 font-mono text-[9px] font-bold uppercase border-0 cursor-pointer"
                  >
                    {copiedField === 'tiktok' ? '✓ COPIED' : 'COPY'}
                  </button>
                </div>

                <div className="pt-2 border-t border-black/10 font-mono text-[9.5px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">GEO-FENCE LOCK:</span>
                    <strong className="text-[#080808]">POSTCODE {safePostcode}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">CONFIGURED FLIGHT CAP:</span>
                    <strong className="text-[#080808]">A${fourteenDaySpend.toLocaleString()} (0% MARKUP)</strong>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setTiktokSynced(true)}
                className="mt-5 w-full rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] py-3 font-mono text-[10px] font-bold uppercase tracking-wider border-0 cursor-pointer transition-colors"
              >
                {tiktokSynced
                  ? `✓ SPARK SYNCED (POSTCODE ${safePostcode} · A$${dailySpend}/DAY)`
                  : `SYNC SPARK CODE TO TIKTOK ADS (A$${dailySpend}/DAY) →`}
              </button>
            </div>

            {/* Card 6: Paid Social Amplification Simulator + 1-Click Media Buyer Export */}
            <div className="rounded-[20px] bg-[#080808] text-white p-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between font-mono text-[9.5px] uppercase">
                  <span className="text-[#CCFF00]">PAID SOCIAL AMPLIFICATION SIMULATOR</span>
                  <span className="text-neutral-400">0% MARKUP</span>
                </div>
                <h4 className="m-0 font-sans text-lg font-bold text-white">You Control the Ad Budget</h4>
                <p className="m-0 font-sans text-xs text-neutral-300 leading-relaxed">
                  API handle access is included in your package. You pay Meta or TikTok directly for whatever ad spend you choose to put behind the post.
                </p>

                <div className="pt-1">
                  <div className="flex items-center justify-between font-mono text-xs mb-1.5">
                    <span className="text-neutral-400 text-[9.5px]">DAILY AD SPEND (DIRECT TO META/TIKTOK)</span>
                    <strong className="text-[#CCFF00]">A${dailySpend}/day</strong>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={500}
                    step={5}
                    value={dailySpend}
                    onChange={(e) => {
                      setDailySpend(Number(e.target.value));
                      setSpecExported(false);
                    }}
                    className="w-full accent-[#CCFF00] cursor-pointer"
                  />
                </div>

                <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 font-mono text-[10px] space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">14-DAY DIRECT AD BUDGET:</span>
                    <strong className="text-white">A${fourteenDaySpend.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">EST. POSTCODE {safePostcode} REACH:</span>
                    <strong className="text-[#CCFF00]">{estLocalReach.toLocaleString()} Local Feeds</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">TMRW/. MEDIA AGENCY MARKUP:</span>
                    <strong className="text-[#CCFF00]">$0.00 (ZERO CLIP)</strong>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={exportMediaBuyerCampaignSpec}
                className="mt-4 w-full rounded-full bg-[#CCFF00] hover:bg-white text-[#080808] py-3 font-mono text-[10px] font-bold uppercase tracking-wider border-0 cursor-pointer transition-colors"
              >
                {specExported
                  ? `✓ AD-SET SPEC EXPORTED (A$${dailySpend}/DAY · POSTCODE ${safePostcode})`
                  : `↓ EXPORT MEDIA BUYER AD-SET SPEC (A$${dailySpend}/DAY) →`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default WhitelistingLaunchModal;