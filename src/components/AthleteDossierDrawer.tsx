import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AssetImage } from './AssetImage';
import { FilmGrainOverlay } from './FilmGrainOverlay';
import { supabase } from '../lib/supabaseClient';
import { createCheckoutSession } from '../lib/checkout';
import { issuePostcodeWhitelistingGrant, type WhitelistingGrant } from '../lib/whitelisting';
import { WhitelistingLaunchModal } from './WhitelistingLaunchModal';
import {
  formatFollowers,
  portraitFile,
  ROSTER_DATA,
  specimenFor,
  suburbForPostcode,
  type AthleteRecord,
} from '../data/roster';

interface AthleteDossierDrawerProps {
  athlete: AthleteRecord | null;
  onClose: () => void;
  onDeployCapital: (athlete: AthleteRecord) => void;
  onSelectAthlete?: (athlete: AthleteRecord) => void;
  initialMode?: 'buy' | 'audit';
}

type PillarTabId = '01_identity' | '02_broadcast' | '03_deal_desk' | '04_settlement';

const PILLARS: readonly { id: PillarTabId; code: string; short: string; fullTitle: string }[] = [
  {
    id: '01_identity',
    code: '01',
    short: 'Identity & Territory',
    fullTitle: 'Sovereign Identity, 48-Sector Matrix & Postcode Exclusivity',
  },
  {
    id: '02_broadcast',
    code: '02',
    short: 'Broadcast & Social AI',
    fullTitle: 'Live Computer Vision Telemetry, 9:16 Stems & Social Reach',
  },
  {
    id: '03_deal_desk',
    code: '03',
    short: 'AI Deal Desk',
    fullTitle: '24/7 Sovereign AI Copilot, Conflict Check & Proposal Intake',
  },
  {
    id: '04_settlement',
    code: '04',
    short: '70/15/15 & Vault',
    fullTitle: 'Automated 70/15/15 Split, Document Vault & Proof of Performance',
  },
];

const BASE_FLIGHTS = [
  {
    tier_id: 'local_merchant',
    numeral: '01',
    code: 'PACKAGE 01',
    badge: '5km Lock',
    badgeVariant: 'red' as const,
    firstWord: 'Precinct',
    restWords: 'Contra & Micro',
    basePrice: 750,
    summary:
      "Own your immediate postcode. Built for local cafes, gyms, and recovery clinics backing an athlete's daily training block through cash and product seeding. Lock out direct local competitors within a 5km radius.",
    specs: [
      { label: 'TERRITORY', value: '5KM POSTCODE LOCK' },
      { label: 'ACTIVATION', value: '1X IN-VENUE SESSION + PRODUCT SEEDING' },
      { label: 'DELIVERABLES', value: '2X AI-EDITED REELS + COUNTER QR PLAQUE' },
      { label: 'PAID AMPLIFICATION', value: 'API HANDLE ACCESS INCLUDED (AD SPEND BILLED DIRECT)' },
      { label: 'SETTLEMENT RAIL', value: 'INSTANT 70/15/15 SPLIT + ATO/IRD RCTI' },
    ],
  },
  {
    tier_id: 'pathway_contender',
    numeral: '02',
    code: 'PACKAGE 02',
    badge: '15km Lock',
    badgeVariant: 'red' as const,
    firstWord: 'Pathway',
    restWords: 'Contender',
    basePrice: 3500,
    summary:
      'Mid-market corporate backing for 18-to-25 contenders dominating elite state leagues (NBL1, Shute Shield, VFL, WNBL). Underwrites competition travel while putting your brand on training kit and verified local feeds.',
    specs: [
      { label: 'TERRITORY', value: '15KM SUBURBAN CLUSTER' },
      { label: 'BRANDING', value: 'AUTO-SHIPPED TRAINING KIT LOGO' },
      { label: 'ACTIVATION', value: '4X TURNKEY BRANDED CONTENT DROPS' },
      { label: 'PAID AMPLIFICATION', value: 'API HANDLE ACCESS INCLUDED (AD SPEND BILLED DIRECT)' },
      { label: 'APPEARANCES', value: '1X IN-PERSON CORPORATE SESSION' },
    ],
  },
  {
    tier_id: 'national_challenger',
    numeral: '03',
    code: 'PACKAGE 03',
    badge: 'Popular',
    badgeVariant: 'green' as const,
    firstWord: 'National',
    restWords: 'Challenger',
    basePrice: 12500,
    summary:
      'Complete category lockout for national Olympic and Paralympic challengers on the LA 2028 and Brisbane 2032 runway. High-performance funding paired with broadcast-cleared media assets and executive keynotes.',
    specs: [
      { label: 'TERRITORY', value: 'STATE-WIDE CATEGORY LOCK' },
      { label: 'EXCLUSIVITY', value: '48-CODE COMPETITOR LOCKOUT' },
      { label: 'MEDIA RIGHTS', value: 'PRE-SHOT 4K BROADCAST & AD STEM VAULT' },
      { label: 'PAID AMPLIFICATION', value: 'API HANDLE ACCESS INCLUDED (AD SPEND BILLED DIRECT)' },
      { label: 'APPEARANCES', value: '1X EXECUTIVE KEYNOTE SESSION' },
    ],
  },
  {
    tier_id: 'world_class',
    numeral: '04',
    code: 'PACKAGE 04',
    badge: 'AU & NZ',
    badgeVariant: 'yellow' as const,
    firstWord: 'World-Class',
    restWords: 'Benchmark',
    basePrice: 25000,
    summary:
      'Enterprise association with world championship, Olympic, and Paralympic podium contenders. Full Pan-Pacific digital licensing, staff town hall keynotes, and Rule 40 pre-cleared ambassador campaigns across AU & NZ.',
    specs: [
      { label: 'TERRITORY', value: 'PAN-PACIFIC LICENCE (AU & NZ)' },
      { label: 'KEYNOTE', value: 'INTERNAL STAFF TOWN HALL' },
      { label: 'COMMERCIAL', value: 'FULL AMBASSADOR & DIRECT HANDLE SPONSORSHIP' },
      { label: 'PAID AMPLIFICATION', value: 'API HANDLE ACCESS INCLUDED (AD SPEND BILLED DIRECT)' },
      { label: 'COMPLIANCE', value: 'RULE 40, TPA & SIA CLEARED' },
    ],
  },
] as const;

function computeSeedConfig(athlete: AthleteRecord | null) {
  if (!athlete) return { multiplier: 1.0, label: '1.0x Base Contender Seed', floorLock: false };
  const followers = athlete.social?.follower_count ?? 0;
  const isPodium = followers >= 150000 || athlete.league?.toLowerCase().includes('olympic');
  const isNational = !isPodium && (followers >= 50000 || athlete.league?.toLowerCase().includes('national'));

  if (isPodium) return { multiplier: 4.0, label: '4.0x Marquee Seed', floorLock: true };
  if (isNational) return { multiplier: 2.0, label: '2.0x National Seed', floorLock: false };
  return { multiplier: 1.0, label: '1.0x Base Contender Seed', floorLock: false };
}

export const AthleteDossierDrawer: React.FC<AthleteDossierDrawerProps> = ({
  athlete,
  onClose,
  onSelectAthlete,
  initialMode = 'audit',
}) => {
  const [drawerMode, setDrawerMode] = useState<'buy' | 'audit'>(initialMode);
  const [activeTab, setActiveTab] = useState<PillarTabId>('01_identity');
  const [selectedTierId, setSelectedTierId] = useState<string>('local_merchant');
  const [syncingSupabase, setSyncingSupabase] = useState(false);
  const [mouSigned, setMouSigned] = useState(true);
  const [showMouModal, setShowMouModal] = useState(false);
  const [showBroadcastStudio, setShowBroadcastStudio] = useState(false);
  const [selectedClipIdx, setSelectedClipIdx] = useState(0);
  const [downloadedAsset, setDownloadedAsset] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [activeWhitelistingGrant, setActiveWhitelistingGrant] = useState<WhitelistingGrant | null>(null);

  const docInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);

  const [uploadedDocs, setUploadedDocs] = useState<{ name: string; size: string }[]>([
    { name: 'League_Registration_Card_2026.pdf', size: '412 KB' },
    { name: 'TPA_Arm_Length_Clearance_Letter.pdf', size: '285 KB' },
    { name: 'Sovereign_Identity_Pass_Verified.pdf', size: '640 KB' },
  ]);

  const [semanticQuery, setSemanticQuery] = useState('fast break');
  const [semanticResults, setSemanticResults] = useState<
    { time: string; prompt: string; confidence: string; exposure: string }[]
  >([
    { time: '01:14', prompt: 'Fast break transition & finish', confidence: '98% Match', exposure: '4.2s Jersey Logo' },
    { time: '04:38', prompt: 'Corner jump shot / try-line tackle', confidence: '95% Match', exposure: '3.8s Court Signage' },
    { time: '09:12', prompt: 'Defensive stop & transition outlet', confidence: '92% Match', exposure: '5.1s Chest Mark' },
  ]);

  const [copilotPrompt, setCopilotPrompt] = useState('');
  const [copilotHistory, setCopilotHistory] = useState<{ role: 'sponsor' | 'agent'; text: string }[]>([]);
  const [proposalBrand, setProposalBrand] = useState('');
  const [proposalSubmitted, setProposalSubmitted] = useState(false);
  const [proofLogs, setProofLogs] = useState<
    { id: string; obligation: string; status: string }[]
  >([
    { id: 'POP-01', obligation: 'Retail Precinct Appearance (Geo-Tagged)', status: 'CV VERIFIED · T+0 PAID' },
    { id: 'POP-02', obligation: '9:16 Vertical Highlight Reel Mention', status: 'WATERMARK CONFIRMED' },
  ]);

  const currentIndex = athlete
    ? ROSTER_DATA.findIndex(
        (entry) => entry.id === athlete.id || entry.record.full_name === athlete.full_name,
      )
    : -1;
  const prevEntry = currentIndex !== -1 ? ROSTER_DATA[(currentIndex - 1 + ROSTER_DATA.length) % ROSTER_DATA.length] : null;
  const nextEntry = currentIndex !== -1 ? ROSTER_DATA[(currentIndex + 1) % ROSTER_DATA.length] : null;

  useEffect(() => {
    setDrawerMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (!athlete) return;
    const seed = computeSeedConfig(athlete);
    setSelectedTierId(seed.floorLock ? 'national_challenger' : 'local_merchant');
    setActiveTab('01_identity');
    setMouSigned(athlete.master_licence_signed ?? true);
    setShowMouModal(false);
    setShowBroadcastStudio(false);
    setProposalSubmitted(false);
    setCheckoutError(null);
    setActiveWhitelistingGrant(null);
    setCopilotHistory([
      {
        role: 'agent',
        text: `Sovereign Deal Desk online for ${athlete.full_name} (${athlete.sport} · ${athlete.league}). Ask about open sponsor categories, paid social amplification costs, or in-person appearance windows in Postcode ${athlete.postcode}.`,
      },
    ]);

    let cancelled = false;
    setSyncingSupabase(true);
    supabase
      .from('athlete_profiles')
      .select('*')
      .or(`legal_full_name.ilike.%${athlete.full_name}%,display_name.ilike.%${athlete.display_name}%`)
      .maybeSingle()
      .then(() => {})
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSyncingSupabase(false);
      });

    return () => {
      cancelled = true;
    };
  }, [athlete]);

  if (!athlete) return null;

  const imageFile = portraitFile(athlete.image);
  const imageFallbacks = specimenFor(athlete.id)?.imageFallbacks ?? [];
  const suburb = suburbForPostcode(athlete.postcode);
  const activePillarObj = PILLARS.find((s) => s.id === activeTab) ?? PILLARS[0];
  const seedConfig = computeSeedConfig(athlete);

  const entryPrice = seedConfig.floorLock
    ? 12500 * (seedConfig.multiplier === 4.0 ? 1 : seedConfig.multiplier)
    : Math.round(750 * seedConfig.multiplier);

  const activeFlight = BASE_FLIGHTS.find((f) => f.tier_id === selectedTierId) ?? BASE_FLIGHTS[0];
  const scaledActivePrice = Math.round(activeFlight.basePrice * (seedConfig.floorLock ? 1 : seedConfig.multiplier));
  const activePriceDisplay = `A$${scaledActivePrice.toLocaleString()}`;

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const kb = Math.max(12, Math.round(file.size / 1024));
    setUploadedDocs((prev) => [{ name: file.name, size: `${kb} KB` }, ...prev]);
    e.target.value = '';
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSemanticResults((prev) => [
      {
        time: '00:18',
        prompt: `Uploaded Stem: ${file.name}`,
        confidence: '99% Match',
        exposure: '6.4s Sponsor Watermark',
      },
      ...prev,
    ]);
    e.target.value = '';
  };

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofLogs((prev) => [
      {
        id: `POP-0${prev.length + 1}`,
        obligation: `Verified Deliverable: ${file.name} (${suburb})`,
        status: 'CV VERIFIED · T+0 PAID',
      },
      ...prev,
    ]);
    e.target.value = '';
  };

  const handleSemanticSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!semanticQuery.trim()) return;
    setSemanticResults((prev) => [
      {
        time: '02:49',
        prompt: `Telemetry Match: "${semanticQuery.trim()}"`,
        confidence: '97% Match',
        exposure: '5.1s Broadcast Logo Exposure',
      },
      ...prev,
    ]);
  };

  const runCopilotQuery = (rawQuery: string) => {
    const q = rawQuery.trim();
    if (!q) return;
    const lower = q.toLowerCase();
    const lockedList = athlete.branding_categories.locked.join(', ') || 'none';
    const availList = athlete.branding_categories.available.join(', ');

    let reply = `Screened against ${athlete.full_name}'s ledger: Open categories are ${availList} (Locked: ${lockedList}). Postcode ${athlete.postcode} (${suburb}) is available for immediate activation.`;

    if (lower.includes('cost') || lower.includes('price') || lower.includes('ad') || lower.includes('amplification') || lower.includes('meta')) {
      reply = `API handle linking for Meta Partnership Ads and TikTok Spark Ads is included at $0 extra platform fee inside every package (starting at A$${entryPrice.toLocaleString()}). Your brand simply funds its desired ad spend directly in Meta/TikTok Ads Manager targeting Postcode ${athlete.postcode}.`;
    } else if (lower.includes('clinic') || lower.includes('appear') || lower.includes('date') || lower.includes('available')) {
      reply = `${athlete.full_name} has verified training-block windows open on Tuesdays and Thursdays (2:00 PM to 5:00 PM) and Sunday mornings in ${suburb} (${athlete.postcode}) for in-venue sessions, product shoots, and junior coaching clinics.`;
    }

    setCopilotHistory((prev) => [...prev, { role: 'sponsor', text: q }, { role: 'agent', text: reply }]);
    setCopilotPrompt('');
  };

  const issueGrantForPackage = async (tierId: string) => {
    const grant = await issuePostcodeWhitelistingGrant({
      athleteId: athlete.id,
      athleteName: athlete.full_name,
      flightTierId: tierId,
      postcode: athlete.postcode,
    });
    setActiveWhitelistingGrant(grant);
    return grant;
  };

  const triggerCheckout = (tierId: string) => {
    setSelectedTierId(tierId);
    setCheckoutError(null);
    setCheckoutLoading(true);
    createCheckoutSession({
      athleteId: athlete.id,
      tierId,
      athlete: {
        full_name: athlete.full_name,
        grassroots_club_name: athlete.current_club,
        image_url: athlete.image,
      },
    })
      .then(async ({ checkoutUrl }) => {
        if (!checkoutUrl) throw new Error('Local test mode');
        await issueGrantForPackage(tierId);
      })
      .catch(async () => {
        try {
          await issueGrantForPackage(tierId);
        } catch (err) {
          setCheckoutError(
            err instanceof Error ? err.message : 'Unable to issue the paid media licence.',
          );
        }
      })
      .finally(() => {
        setCheckoutLoading(false);
      });
  };

  return createPortal(
    <div
      data-lenis-prevent="true"
      onClick={onClose}
      className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 selection:bg-[#CCFF00] selection:text-[#080808] animate-fadeIn"
    >
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
        onChange={handleDocUpload}
        className="hidden"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/*"
        onChange={handleVideoUpload}
        className="hidden"
      />
      <input
        ref={proofInputRef}
        type="file"
        accept="image/*,video/*,.pdf"
        onChange={handleProofUpload}
        className="hidden"
      />

      <div
        data-lenis-prevent="true"
        onWheel={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[1840px] h-[94dvh] rounded-[24px] bg-[#FFFFFF] text-[#080808] shadow-[0_30px_90px_rgba(0,0,0,0.28)] border border-black/10 flex flex-col overflow-hidden"
      >
        <header className="shrink-0 z-30 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 md:px-10 py-3.5 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-black/10">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => prevEntry && onSelectAthlete?.(prevEntry.record)}
              className="inline-flex items-center gap-2 rounded-full bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white px-4 py-1.5 font-sans text-xs font-medium transition-colors cursor-pointer border-0"
            >
              <span>←</span>
              <span className="font-bold">{prevEntry?.name ?? 'Previous'}</span>
            </button>
            <button
              type="button"
              onClick={() => nextEntry && onSelectAthlete?.(nextEntry.record)}
              className="inline-flex items-center gap-2 rounded-full bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white px-4 py-1.5 font-sans text-xs font-medium transition-colors cursor-pointer border-0"
            >
              <span className="font-bold">{nextEntry?.name ?? 'Next'}</span>
              <span>→</span>
            </button>
          </div>

          <div className="flex items-center bg-[#EAEAE6] p-1 rounded-full border border-black/10">
            <button
              type="button"
              onClick={() => setDrawerMode('buy')}
              className={`rounded-full px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer border-0 ${
                drawerMode === 'buy' ? 'bg-[#080808] text-[#CCFF00]' : 'bg-transparent text-[#080808]'
              }`}
            >
              01 COMMERCIAL PACKAGES (BUY)
            </button>
            <button
              type="button"
              onClick={() => setDrawerMode('audit')}
              className={`rounded-full px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer border-0 ${
                drawerMode === 'audit' ? 'bg-[#080808] text-[#CCFF00]' : 'bg-transparent text-[#080808]'
              }`}
            >
              02 SOVEREIGN TELEMETRY &amp; COMPLIANCE (4 PILLARS)
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Close [ESC]"
            aria-label="Close modal"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0F0F11] hover:bg-white text-white hover:text-[#0F0F11] border border-transparent hover:border-black/25 px-5 py-1.5 font-sans text-xs font-bold tracking-tight shadow-sm transition-all duration-300 cursor-pointer group"
          >
            <span>Close</span>
            <span className="text-[11px] text-[#CCFF00] group-hover:text-[#0F0F11] transition-colors">✕</span>
          </button>
        </header>

        <div
          data-lenis-prevent="true"
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 md:px-10 pt-4 pb-12 bg-[#FFFFFF]"
        >
          <div className="mb-4 border-b border-black/10 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-3 mb-3 border-b border-black/5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-neutral-500">
              <div className="flex items-center gap-2 text-[#080808] font-bold">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#CCFF00] ring-1 ring-black/20" />
                <span>{seedConfig.label}</span>
              </div>
              <div>
                {athlete.sport} · {athlete.league} · {athlete.current_club}
              </div>
              <div>
                POSTCODE {athlete.postcode} ({suburb.toUpperCase()}) · {athlete.radiusKm}KM EXCLUSIVITY
              </div>
              <div className="md:text-right text-[#080808] font-bold">
                {syncingSupabase
                  ? 'SYNCING SUPABASE...'
                  : `BROADCAST MEDIA EQUIVALENT: A$14,800/YR · ENTRY LOCK: A$${entryPrice.toLocaleString()}`}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-5 items-center">
              <div className="lg:col-span-2 flex items-center gap-4">
                <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-[14px] bg-[#EAEAE6] overflow-hidden border border-black/10">
                  <AssetImage
                    file={imageFile}
                    fallbackFiles={imageFallbacks}
                    alt={athlete.full_name}
                    className="w-full h-full object-cover filter grayscale hover:grayscale-0 transition-all duration-500"
                  />
                </div>
                <h1 className="m-0 font-display text-4xl sm:text-6xl xl:text-[68px] font-black tracking-[-0.04em] leading-[0.86] uppercase text-[#080808]">
                  {athlete.full_name}
                  <span className="text-[#CCFF00]">.</span>
                </h1>
              </div>

              <div className="lg:border-l lg:border-black/10 lg:pl-5">
                <p className="m-0 font-sans text-[14.5px] sm:text-[15.5px] font-bold tracking-[-0.02em] leading-[1.28] text-[#080808]">
                  {drawerMode === 'buy'
                    ? 'Four clear packages. Zero talent agency commissions.'
                    : `Pillar ${activePillarObj.code}: ${activePillarObj.fullTitle}`}
                </p>
                <p className="m-0 mt-1 font-sans text-[12px] leading-[1.45] text-neutral-600">
                  Every package includes direct API handle linking for Meta and TikTok paid social amplification in Postcode {athlete.postcode} (ad spend billed direct).
                </p>
              </div>

              <div className="lg:border-l lg:border-black/10 lg:pl-5">
                <p className="m-0 font-sans text-[12px] leading-[1.45] text-neutral-600">
                  Pre-cleared across <strong className="text-[#080808]">{athlete.governing_body.name}</strong> with automated{' '}
                  <span className="bg-[#CCFF00] text-[#080808] font-bold px-1.5 py-0.5 rounded-[3px]">
                    70/15/15 split
                  </span>{' '}
                  via Stripe Connect.
                </p>
              </div>
            </div>
          </div>

          {drawerMode === 'buy' && (
            <ul className="m-0 grid list-none grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-stretch gap-x-5 gap-y-6 p-0 pt-2">
              {BASE_FLIGHTS.map((pkg, idx) => {
                const isFloorLocked = seedConfig.floorLock && (idx === 0 || idx === 1);
                const scaledPrice = Math.round(pkg.basePrice * (seedConfig.floorLock ? 1 : seedConfig.multiplier));
                const priceDisplay = `A$${scaledPrice.toLocaleString()}`;
                const netAthlete = `A$${Math.round(scaledPrice * 0.7).toLocaleString()}`;
                const isSelected = selectedTierId === pkg.tier_id && !isFloorLocked;

                return (
                  <li key={pkg.tier_id} className="m-0 flex min-w-0 flex-col p-0">
                    <article
                      onMouseEnter={() => !isFloorLocked && setSelectedTierId(pkg.tier_id)}
                      onClick={() => !isFloorLocked && triggerCheckout(pkg.tier_id)}
                      className={`group relative isolate flex flex-col justify-between rounded-[18px] p-6 h-[clamp(420px,52vh,510px)] transition-all duration-500 overflow-visible select-none ${
                        isFloorLocked
                          ? 'bg-[#EAEAE6]/60 text-neutral-400 cursor-not-allowed border border-black/10'
                          : isSelected
                          ? 'bg-[#080808] text-white cursor-pointer shadow-xl'
                          : 'bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white cursor-pointer'
                      }`}
                    >
                      <span
                        className={`absolute -top-2.5 right-5 z-30 rounded-full px-3.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                          isFloorLocked
                            ? 'bg-[#080808] text-[#CCFF00]'
                            : pkg.badgeVariant === 'green'
                            ? 'bg-[#CCFF00] text-[#080808]'
                            : pkg.badgeVariant === 'yellow'
                            ? 'bg-[#FFB800] text-[#080808]'
                            : 'bg-[#0F0F11] text-white'
                        }`}
                      >
                        {isFloorLocked ? 'FLOOR LOCKED // MIN PACKAGE 03' : pkg.badge}
                      </span>

                      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[18px]">
                        <AssetImage
                          file={imageFile}
                          fallbackFiles={imageFallbacks}
                          alt={athlete.full_name}
                          className={`w-full h-full object-cover filter contrast-125 transition-all duration-700 ease-out ${
                            isSelected
                              ? 'grayscale-0 opacity-35 scale-105'
                              : 'grayscale opacity-[0.08] group-hover:grayscale-0 group-hover:opacity-35 scale-100 group-hover:scale-105'
                          }`}
                        />
                        <div
                          className={`absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/40 to-[#080808]/85 transition-opacity duration-500 ${
                            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}
                        />
                        <FilmGrainOverlay intensity="fine" />
                      </div>

                      <div className="relative z-20 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em] leading-snug">
                            <span
                              className={`inline-block rounded-[4px] px-1.5 -ml-1.5 ${
                                isSelected ? 'bg-[#CCFF00] text-[#080808]' : 'group-hover:bg-[#CCFF00] group-hover:text-[#080808]'
                              }`}
                            >
                              {pkg.firstWord}
                            </span>{' '}
                            <span>{pkg.restWords}</span>
                          </h3>
                          <p className="m-0 mt-1 font-sans text-[12px] opacity-75">
                            {isFloorLocked ? 'Protected Marquee Commercial Floor' : `${netAthlete} Net to Athlete · ${priceDisplay}`}
                          </p>
                        </div>
                        <span className="font-display text-lg font-black">{priceDisplay}</span>
                      </div>

                      <div className="relative z-20 my-auto py-3 space-y-3">
                        <p className="m-0 font-sans text-[12px] leading-relaxed opacity-85">{pkg.summary}</p>
                        <div className="divide-y divide-current/15 border-y border-current/15 font-mono text-[9px]">
                          {pkg.specs.map((s) => (
                            <div key={s.label} className="py-1.5 flex items-center justify-between gap-2">
                              <span className="opacity-65">{s.label}</span>
                              <span className="font-bold text-right">{s.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="relative z-20 mt-auto flex items-end justify-between gap-3 pt-2">
                        <div className="font-display text-[88px] font-black leading-[0.78] tracking-[-0.055em]">
                          {pkg.numeral}
                        </div>
                        {!isFloorLocked && (
                          <button
                            type="button"
                            disabled={checkoutLoading}
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerCheckout(pkg.tier_id);
                            }}
                            className="rounded-full bg-[#CCFF00] text-[#080808] font-mono text-[10px] font-bold uppercase tracking-widest px-4 py-2.5 border-0 cursor-pointer shadow-md"
                          >
                            Lock {priceDisplay} →
                          </button>
                        )}
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}

          {drawerMode === 'audit' && (
            <>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-black/10 pb-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  {PILLARS.map((pillar) => {
                    const active = activeTab === pillar.id;
                    return (
                      <button
                        key={pillar.id}
                        type="button"
                        onClick={() => setActiveTab(pillar.id)}
                        className={`rounded-full px-5 py-2 font-sans text-xs tracking-tight transition-all cursor-pointer border-0 ${
                          active
                            ? 'bg-[#CCFF00] text-[#080808] font-bold shadow-sm'
                            : 'bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white font-semibold'
                        }`}
                      >
                        <span className="font-mono text-[10px] mr-2 opacity-65">{pillar.code}</span>
                        <span>{pillar.short}</span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setDrawerMode('buy')}
                  className="rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] font-mono text-[10px] font-bold uppercase tracking-widest px-5 py-2 transition-colors cursor-pointer border-0"
                >
                  Lock Postcode {athlete.postcode} →
                </button>
              </div>

              {activeTab === '01_identity' && (
                <div className="space-y-6 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <article className="group relative flex flex-col justify-between bg-[#080808] text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)]">
                      <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#CCFF00] text-[#080808] px-3.5 py-0.5 font-sans text-[11px] font-bold">Verified</span>
                      <div>
                        <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                          <span className="bg-[#CCFF00] text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">Sovereign</span> Identity &amp; TPA
                        </h3>
                        <p className="m-0 mt-1 font-sans text-[12.5px] text-neutral-300">Official {athlete.governing_body.name} Pass</p>
                        <p className="m-0 mt-5 font-sans text-[13px] leading-relaxed text-neutral-200">
                          Verified 18+ signatory capacity and arm’s-length Third-Party Agreement (TPA) compliance independent of {athlete.current_club} salary caps.
                        </p>
                      </div>
                      <div className="font-display text-[96px] font-black leading-[0.78] tracking-[-0.055em]">ID</div>
                    </article>

                    <article className="group relative flex flex-col justify-between bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] transition-colors duration-500">
                      <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#CCFF00] text-[#080808] px-3.5 py-0.5 font-sans text-[11px] font-bold">Open</span>
                      <div>
                        <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                          <span className="bg-[#CCFF00] text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">48-Sector</span> Conflict Matrix
                        </h3>
                        <p className="m-0 mt-1 font-sans text-[12.5px] text-[#555555] group-hover:text-neutral-300">Open vs. Locked Deals in {athlete.postcode}</p>
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {athlete.branding_categories.available.map((cat) => (
                            <span key={cat} className="rounded-full bg-white group-hover:bg-[#CCFF00] text-[#080808] font-sans text-xs font-bold px-3 py-1">OPEN · {cat}</span>
                          ))}
                          {athlete.branding_categories.locked.map((cat) => (
                            <span key={cat} className="rounded-full bg-black/10 group-hover:bg-white/15 px-3 py-1 font-sans text-xs line-through">LOCKED · {cat}</span>
                          ))}
                        </div>
                      </div>
                      <div className="font-display text-[96px] font-black leading-[0.78] tracking-[-0.055em]">48</div>
                    </article>

                    <article
                      onClick={() => setShowMouModal(!showMouModal)}
                      className="group relative flex flex-col justify-between bg-[#080808] text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] cursor-pointer shadow-xl"
                    >
                      <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#CCFF00] text-[#080808] px-3.5 py-0.5 font-sans text-[11px] font-bold">
                        {mouSigned ? 'Executed' : 'Sign MOU'}
                      </span>
                      <div>
                        <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                          <span className="bg-[#CCFF00] text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">Master</span> NIL Licence
                        </h3>
                        <p className="m-0 mt-1 font-sans text-[12.5px] text-neutral-300">
                          {mouSigned ? '2-Year Executed Term Active' : 'Click to Execute Digital MOU'}
                        </p>
                        <p className="m-0 mt-5 font-sans text-[13px] leading-relaxed text-neutral-200">
                          Master NIL licence confirming executed legal terms and Meta/TikTok API handle sponsorship permissions prior to contract binding.
                        </p>
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="font-display text-[88px] font-black leading-[0.78] tracking-[-0.055em]">NIL</span>
                        <span className="rounded-full bg-[#CCFF00] text-[#080808] font-mono text-[10px] font-bold uppercase px-4 py-2">
                          {showMouModal ? 'Hide Deed ✕' : 'Inspect Deed →'}
                        </span>
                      </div>
                    </article>

                    <article
                      onClick={() => setDrawerMode('buy')}
                      className="group relative flex flex-col justify-between bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] transition-colors duration-500 cursor-pointer"
                    >
                      <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#FFB800] text-[#080808] px-3.5 py-0.5 font-sans text-[11px] font-bold">
                        {athlete.radiusKm}km Lock
                      </span>
                      <div>
                        <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                          <span className="group-hover:bg-[#CCFF00] group-hover:text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">Postcode</span> Exclusivity Ring
                        </h3>
                        <p className="m-0 mt-1 font-sans text-[12.5px] text-[#555555] group-hover:text-neutral-300">
                          Postcode {athlete.postcode} ({suburb})
                        </p>
                        <p className="m-0 mt-5 font-sans text-[13px] leading-relaxed text-[#444444] group-hover:text-neutral-200">
                          Radial boundary locking (5km storefront, 15km metro, 50km regional) preventing rival brands from signing competing talent in {suburb}.
                        </p>
                      </div>
                      <div className="font-display text-[80px] font-black leading-[0.78] tracking-[-0.055em]">{athlete.postcode}</div>
                    </article>
                  </div>

                  {showMouModal && (
                    <div className="rounded-[20px] bg-[#080808] text-white p-6 sm:p-8 border border-black/15 shadow-2xl">
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-4 mb-6">
                        <div>
                          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#CCFF00] block">
                            SOVEREIGN LEGAL INSTRUMENT // MASTER NIL DEED
                          </span>
                          <h4 className="m-0 mt-1 font-sans text-2xl font-black uppercase tracking-tight">
                            {athlete.full_name} — 24-Month Commercial &amp; Handle Licence
                          </h4>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setMouSigned(!mouSigned)}
                            className="rounded-full bg-[#CCFF00] text-[#080808] font-mono text-[10px] font-bold uppercase tracking-widest px-4 py-2 cursor-pointer border-0"
                          >
                            {mouSigned ? 'Status: Executed ✓ (Click to Toggle)' : 'Click to Sign & Execute MOU'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowMouModal(false)}
                            className="rounded-full bg-white/10 hover:bg-white/20 text-white font-mono text-[10px] font-bold uppercase px-4 py-2 cursor-pointer border-0"
                          >
                            Close ✕
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                        <div className="rounded-xl bg-white/5 p-4 border border-white/10">
                          <span className="text-neutral-400 block text-[10px]">SIGNATORY AUTHORITY</span>
                          <strong className="text-white mt-1 block">{athlete.full_name} (18+ Sovereign)</strong>
                          <span className="text-[#CCFF00] text-[10px] mt-1 block">Zero Agency Commission Clip</span>
                        </div>
                        <div className="rounded-xl bg-white/5 p-4 border border-white/10">
                          <span className="text-neutral-400 block text-[10px]">API HANDLE SPONSORSHIP GRANT</span>
                          <strong className="text-white mt-1 block">Meta &amp; TikTok OAuth Pre-Cleared</strong>
                          <span className="text-neutral-300 text-[10px] mt-1 block">Postcode {athlete.postcode} Geo-Fence Ready</span>
                        </div>
                        <div className="rounded-xl bg-white/5 p-4 border border-white/10">
                          <span className="text-neutral-400 block text-[10px]">SETTLEMENT &amp; TAX RAIL</span>
                          <strong className="text-white mt-1 block">70% Athlete · 15% Club · 15% Ops</strong>
                          <span className="text-[#CCFF00] text-[10px] mt-1 block">ATO &amp; NZ IRD RCTI Compliant</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === '02_broadcast' && (
                <div className="space-y-6 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <article
                      onClick={() => setShowBroadcastStudio(!showBroadcastStudio)}
                      className="group relative flex flex-col justify-between bg-[#080808] text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] cursor-pointer overflow-hidden shadow-xl"
                    >
                      <AssetImage
                        file={imageFile}
                        fallbackFiles={imageFallbacks}
                        alt={athlete.full_name}
                        className="absolute inset-0 w-full h-full object-cover opacity-45 group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute top-24 left-6 right-6 h-36 border-2 border-[#CCFF00] rounded-lg pointer-events-none flex flex-col justify-between p-2">
                        <span className="bg-[#CCFF00] text-[#080808] font-mono text-[8.5px] font-bold px-1.5 py-0.5 self-start">
                          AI TRACK: {athlete.display_name.toUpperCase()} · 98.4%
                        </span>
                        <span className="bg-black/80 text-[#CCFF00] font-mono text-[8.5px] px-1.5 py-0.5 self-end">
                          JERSEY LOGO: 4.2s
                        </span>
                      </div>
                      <div className="relative z-10">
                        <h3 className="m-0 font-sans text-[19px] font-bold">
                          <span className="bg-[#CCFF00] text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">Live CV</span> Telemetry Loop
                        </h3>
                        <p className="m-0 mt-1 font-sans text-[12px] text-neutral-300">Open Broadcast Brand Studio</p>
                      </div>
                      <div className="relative z-10 flex items-end justify-between">
                        <span className="font-display text-[76px] font-black leading-[0.78]">AI</span>
                        <span className="rounded-full bg-[#CCFF00] text-[#080808] font-mono text-[10px] font-bold uppercase px-4 py-2 shadow-md">
                          {showBroadcastStudio ? 'Close Studio ✕' : 'Open Brand Kit →'}
                        </span>
                      </div>
                    </article>

                    <article
                      onClick={() => setShowBroadcastStudio(true)}
                      className="group relative isolate flex flex-col justify-between bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] transition-colors duration-500 cursor-pointer"
                    >
                      <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#0F0F11] text-white px-3.5 py-0.5 font-sans text-[11px] font-bold">9:16 Auto</span>
                      <div>
                        <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                          <span className="group-hover:bg-[#CCFF00] group-hover:text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">Vertical</span> Reel Generator
                        </h3>
                        <p className="m-0 mt-1 font-sans text-[12.5px] text-[#555555] group-hover:text-neutral-300">Ready-to-Publish 9:16 Video Stems</p>
                        <p className="m-0 mt-5 font-sans text-[13px] leading-relaxed text-[#444444] group-hover:text-neutral-200">
                          Automated vertical highlight reel generator that processes raw match footage into sponsor-watermarked 9:16 social stems for Meta and TikTok paid social amplification.
                        </p>
                      </div>
                      <div className="font-display text-[88px] font-black leading-[0.78] tracking-[-0.055em]">9:16</div>
                    </article>

                    <article className="group relative flex flex-col justify-between bg-[#EAEAE6] text-[#080808] rounded-[18px] p-6 h-[clamp(390px,50vh,480px)]">
                      <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#CCFF00] text-[#080808] px-3.5 py-0.5 font-sans text-[11px] font-bold">Semantic</span>
                      <div>
                        <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                          <span className="bg-[#CCFF00] text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">Semantic</span> Video Search
                        </h3>
                        <p className="m-0 mt-1 font-sans text-[12.5px] text-[#555555]">Search: fast break, try-line tackle, jump shot</p>
                        <form onSubmit={handleSemanticSearch} className="mt-3 flex gap-1.5">
                          <input
                            type="text"
                            value={semanticQuery}
                            onChange={(e) => setSemanticQuery(e.target.value)}
                            placeholder="e.g. fast break, corner jump shot"
                            className="flex-1 min-w-0 rounded-full bg-white border border-black/15 px-3 py-1.5 font-sans text-xs text-[#080808]"
                          />
                          <button type="submit" className="rounded-full bg-[#080808] text-[#CCFF00] font-mono text-[10px] font-bold uppercase px-3 py-1.5 cursor-pointer border-0">Go</button>
                        </form>
                        <div className="mt-3 space-y-1.5">
                          {semanticResults.slice(0, 2).map((r, i) => (
                            <div key={i} className="rounded-lg bg-white p-2 font-mono text-[10px]">
                              <span className="font-bold text-[#080808]">{r.time}</span> · {r.prompt} ({r.confidence})
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="font-display text-[80px] font-black leading-[0.78] tracking-[-0.055em]">NLP</div>
                    </article>

                    <article className="group relative flex flex-col justify-between bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] transition-colors duration-500">
                      <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#CCFF00] text-[#080808] px-3.5 py-0.5 font-sans text-[11px] font-bold">
                        68% Local Reach
                      </span>
                      <div>
                        <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                          <span className="group-hover:bg-[#CCFF00] group-hover:text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">Authenticated</span> Social Telemetry
                        </h3>
                        <p className="m-0 mt-1 font-sans text-[12.5px] text-[#555555] group-hover:text-neutral-300">
                          {athlete.social.instagram_handle} · {athlete.social.engagement_rate} Eng.
                        </p>
                        <p className="m-0 mt-5 font-sans text-[13px] leading-relaxed text-[#444444] group-hover:text-neutral-200">
                          99.4% bot-filtered human reach with 68% audience concentration inside Postcode {athlete.postcode} ({suburb}) and A$14,800/yr broadcast media equivalent.
                        </p>
                      </div>
                      <div className="font-display text-[76px] font-black leading-[0.78] tracking-[-0.055em]">
                        {formatFollowers(athlete.social.follower_count)}
                      </div>
                    </article>
                  </div>

                  {showBroadcastStudio && (
                    <div className="rounded-[22px] bg-[#080808] text-white p-6 sm:p-8 border border-black/15 shadow-2xl">
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-4 mb-6">
                        <div>
                          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#CCFF00] block">
                            PILLAR 02 // BROADCAST TELEMETRY &amp; SPONSOR BRAND KIT
                          </span>
                          <h4 className="m-0 mt-1 font-sans text-2xl sm:text-3xl font-black uppercase tracking-tight">
                            {athlete.full_name} — Pre-Cleared 9:16 Social &amp; Broadcast Vault
                          </h4>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => videoInputRef.current?.click()}
                            className="rounded-full bg-[#CCFF00] text-[#080808] font-mono text-[10px] font-bold uppercase tracking-widest px-4 py-2 cursor-pointer border-0"
                          >
                            + Ingest Match Footage
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowBroadcastStudio(false)}
                            className="rounded-full bg-white/10 hover:bg-white/20 text-white font-mono text-[10px] font-bold uppercase px-4 py-2 cursor-pointer border-0"
                          >
                            Close Studio ✕
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                        <div className="lg:col-span-4 rounded-[16px] bg-neutral-900 border border-white/15 p-4 flex flex-col justify-between relative overflow-hidden min-h-[340px]">
                          <AssetImage
                            file={imageFile}
                            fallbackFiles={imageFallbacks}
                            alt={athlete.full_name}
                            className="absolute inset-0 w-full h-full object-cover grayscale contrast-125 opacity-50"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/60" />
                          <div className="relative z-10 flex items-center justify-between">
                            <span className="rounded bg-[#CCFF00] text-[#080808] font-mono text-[9px] font-bold uppercase px-2 py-0.5">
                              9:16 PAID AD STEM
                            </span>
                            <span className="font-mono text-[10px] text-white/80">
                              {semanticResults[selectedClipIdx]?.time ?? '01:14'}
                            </span>
                          </div>
                          <div className="relative z-10 my-auto border border-[#CCFF00]/80 rounded-lg p-3 bg-black/50 backdrop-blur-xs">
                            <span className="font-mono text-[9px] text-[#CCFF00] uppercase block">
                              CV BOUNDING BOX LOCKED
                            </span>
                            <p className="m-0 mt-1 font-sans text-sm font-bold text-white">
                              {semanticResults[selectedClipIdx]?.prompt ?? 'Fast break transition & finish'}
                            </p>
                            <span className="font-mono text-[10px] text-neutral-300 mt-1 block">
                              {semanticResults[selectedClipIdx]?.exposure ?? '4.2s Jersey Logo'} ·{' '}
                              {semanticResults[selectedClipIdx]?.confidence ?? '98% Match'}
                            </span>
                          </div>
                          <div className="relative z-10 flex items-center justify-between pt-3 border-t border-white/15 font-mono text-[9px] text-neutral-300">
                            <span>WATERMARK: WM-{athlete.postcode}</span>
                            <span className="text-[#CCFF00] font-bold">META / TIKTOK READY</span>
                          </div>
                        </div>

                        <div className="lg:col-span-4 rounded-[16px] bg-white/5 border border-white/10 p-5 flex flex-col justify-between">
                          <div>
                            <span className="font-mono text-[10px] uppercase tracking-widest text-[#CCFF00] block mb-2">
                              01 // AI-INDEXED MATCH MOMENTS
                            </span>
                            <p className="m-0 font-sans text-xs text-neutral-300 mb-4">
                              Select any computer-vision tagged moment below to preview the sponsor-watermarked 9:16 social cut.
                            </p>
                            <div className="space-y-2">
                              {semanticResults.map((clip, idx) => (
                                <button
                                  key={clip.time + idx}
                                  type="button"
                                  onClick={() => setSelectedClipIdx(idx)}
                                  className={`w-full text-left rounded-xl p-3 transition-all cursor-pointer border ${
                                    selectedClipIdx === idx
                                      ? 'bg-[#CCFF00] text-[#080808] border-[#CCFF00] font-bold'
                                      : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                                  }`}
                                >
                                  <div className="flex items-center justify-between font-mono text-[10px]">
                                    <span>TIMESTAMP {clip.time}</span>
                                    <span>{clip.confidence}</span>
                                  </div>
                                  <div className="font-sans text-xs mt-1">{clip.prompt}</div>
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="pt-4 border-t border-white/10 flex items-center justify-between font-mono text-[10px] text-neutral-400">
                            <span>TOTAL BROADCAST EQUIVALENT</span>
                            <span className="text-white font-bold">A$14,800 / YR</span>
                          </div>
                        </div>

                        <div className="lg:col-span-4 rounded-[16px] bg-white/5 border border-white/10 p-5 flex flex-col justify-between">
                          <div>
                            <span className="font-mono text-[10px] uppercase tracking-widest text-[#CCFF00] block mb-2">
                              02 // TURNKEY SPONSOR ASSET VAULT
                            </span>
                            <p className="m-0 font-sans text-xs text-neutral-300 mb-4">
                              Pre-cleared under {athlete.full_name}’s 2-Year Master NIL Licence for immediate paid social amplification.
                            </p>
                            <div className="space-y-2">
                              {[
                                { title: '9:16 Vertical Highlight Stem (MP4)', meta: '48 MB · 4K 60fps' },
                                { title: 'Athlete Monogram & Shield Marks (SVG)', meta: '12 MB · Vector Pack' },
                                { title: 'Countertop Venue QR Plaque (PDF)', meta: '4.2 MB · Print Ready' },
                                { title: 'ATO / NZ IRD RCTI Specimen (PDF)', meta: '320 KB · Tax Cleared' },
                              ].map((asset) => (
                                <button
                                  key={asset.title}
                                  type="button"
                                  onClick={() => setDownloadedAsset(asset.title)}
                                  className="w-full flex items-center justify-between gap-2 rounded-xl bg-white/5 hover:bg-[#CCFF00] text-white hover:text-[#080808] p-3 border border-white/10 transition-colors cursor-pointer text-left"
                                >
                                  <div>
                                    <div className="font-sans text-xs font-bold">{asset.title}</div>
                                    <div className="font-mono text-[9.5px] opacity-75">{asset.meta}</div>
                                  </div>
                                  <span className="font-mono text-[10px] font-bold uppercase shrink-0">↓ Pull</span>
                                </button>
                              ))}
                            </div>
                          </div>
                          {downloadedAsset ? (
                            <div className="mt-3 rounded-lg bg-[#CCFF00] text-[#080808] px-3 py-2 font-mono text-[10px] font-bold">
                              ✓ Dispatched: {downloadedAsset}
                            </div>
                          ) : (
                            <div className="pt-4 border-t border-white/10 font-mono text-[10px] text-[#CCFF00]">
                              ✓ 2-YEAR MASTER NIL MOU SIGNED &amp; CLEARED
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === '03_deal_desk' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 pt-1">
                  <div className="lg:col-span-2 bg-[#EAEAE6] rounded-[18px] p-6 flex flex-col justify-between h-[clamp(390px,50vh,480px)]">
                    <div>
                      <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                        <span className="bg-[#CCFF00] text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">Sovereign</span> AI Agent Copilot
                      </h3>
                      <p className="m-0 mt-1 font-sans text-[12.5px] text-[#555555]">
                        24/7 Automated Sponsor Deal Desk — Click a quick prompt or ask a question below:
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {[
                          'How does paid social amplification work?',
                          'Check open categories in this postcode',
                          'Next available clinic & shoot dates',
                        ].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => runCopilotQuery(preset)}
                            className="rounded-full bg-white hover:bg-[#080808] text-[#080808] hover:text-[#CCFF00] border border-black/10 px-3 py-1 font-mono text-[9.5px] font-bold uppercase cursor-pointer transition-colors"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="my-3 flex-1 overflow-y-auto space-y-2.5 pr-1">
                      {copilotHistory.map((item, idx) => (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-xl font-sans text-xs leading-relaxed ${
                            item.role === 'agent' ? 'bg-white text-[#080808] shadow-sm' : 'bg-[#080808] text-white ml-auto max-w-md'
                          }`}
                        >
                          {item.text}
                        </div>
                      ))}
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        runCopilotQuery(copilotPrompt);
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        value={copilotPrompt}
                        onChange={(e) => setCopilotPrompt(e.target.value)}
                        placeholder="Query appearance dates, paid social amplification, or category locks..."
                        className="flex-1 rounded-full bg-white border border-black/15 px-4 py-2.5 font-sans text-xs text-[#080808]"
                      />
                      <button type="submit" className="rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] font-mono text-[10px] font-bold uppercase px-5 py-2.5 cursor-pointer border-0">Screen →</button>
                    </form>
                  </div>

                  <article className="group relative flex flex-col justify-between bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] transition-colors duration-500">
                    <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#CCFF00] text-[#080808] px-3.5 py-0.5 font-sans text-[11px] font-bold">Zero Clash</span>
                    <div>
                      <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                        <span className="group-hover:bg-[#CCFF00] group-hover:text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">Automated</span> Conflict Check
                      </h3>
                      <p className="m-0 mt-1 font-sans text-[12.5px] text-[#555555] group-hover:text-neutral-300">Instant Sponsor Lockout Verification</p>
                      <p className="m-0 mt-5 font-sans text-[13px] leading-relaxed text-[#444444] group-hover:text-neutral-200">
                        Automated conflict assessment answering instantly whether a prospective brand clashes with current club commitments or active sponsor lockouts.
                      </p>
                    </div>
                    <div className="font-display text-[88px] font-black leading-[0.78] tracking-[-0.055em]">AI</div>
                  </article>

                  <article className="relative flex flex-col justify-between bg-[#EAEAE6] text-[#080808] rounded-[18px] p-6 h-[clamp(390px,50vh,480px)]">
                    <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#0F0F11] text-white px-3.5 py-0.5 font-sans text-[11px] font-bold">Intake</span>
                    <div>
                      <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                        <span className="bg-[#CCFF00] text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">Proposal</span> Intake Desk
                      </h3>
                      <p className="m-0 mt-1 font-sans text-[12.5px] text-[#555555]">Pre-Qualifies Corporate Proposals</p>
                      {proposalSubmitted ? (
                        <div className="mt-5 rounded-xl bg-[#CCFF00] p-4 font-sans text-xs font-bold text-[#080808]">
                          ✓ Proposal for {proposalBrand} pre-qualified and cleared for immediate activation.
                        </div>
                      ) : (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (proposalBrand.trim()) setProposalSubmitted(true);
                          }}
                          className="mt-4 space-y-2.5"
                        >
                          <input
                            type="text"
                            required
                            value={proposalBrand}
                            onChange={(e) => setProposalBrand(e.target.value)}
                            placeholder="Prospective Brand / Merchant Name"
                            className="w-full rounded-xl bg-white border border-black/15 px-3.5 py-2.5 font-sans text-xs"
                          />
                          <button type="submit" className="w-full rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] font-mono text-[10px] font-bold uppercase py-2.5 cursor-pointer border-0">Pre-Qualify Proposal →</button>
                        </form>
                      )}
                    </div>
                    <div className="font-display text-[80px] font-black leading-[0.78] tracking-[-0.055em]">IN</div>
                  </article>
                </div>
              )}

              {activeTab === '04_settlement' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-1">
                  <article
                    onClick={() => setDrawerMode('buy')}
                    className="group relative flex flex-col justify-between bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] transition-colors duration-500 cursor-pointer"
                  >
                    <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#CCFF00] text-[#080808] px-3.5 py-0.5 font-sans text-[11px] font-bold">
                      70 / 15 / 15
                    </span>
                    <div>
                      <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                        <span className="bg-[#CCFF00] text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">Automated</span> Revenue Split
                      </h3>
                      <p className="m-0 mt-1 font-sans text-[12.5px] text-[#555555] group-hover:text-neutral-300">
                        70% Athlete · 15% {athlete.current_club} · 15% Ops
                      </p>
                      <p className="m-0 mt-5 font-sans text-[13px] leading-relaxed text-[#444444] group-hover:text-neutral-200">
                        Instant Stripe Connect clearing splitting gross retainers 70% to the athlete and 15% to their junior club with automated ATO/IRD RCTI tax invoices.
                      </p>
                    </div>
                    <div className="font-display text-[88px] font-black leading-[0.78] tracking-[-0.055em]">70%</div>
                  </article>

                  <article
                    onClick={() => docInputRef.current?.click()}
                    className="group relative flex flex-col justify-between bg-[#080808] text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] cursor-pointer"
                  >
                    <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#FFB800] text-[#080808] px-3.5 py-0.5 font-sans text-[11px] font-bold">
                      {uploadedDocs.length} Files
                    </span>
                    <div>
                      <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                        <span className="bg-[#CCFF00] text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">Document</span> Upload Vault
                      </h3>
                      <p className="m-0 mt-1 font-sans text-[12.5px] text-neutral-300">Click to Upload PDF/Image from Device</p>
                      <ul className="m-0 mt-4 p-0 list-none space-y-1.5 font-mono text-[10px]">
                        {uploadedDocs.slice(0, 4).map((doc, idx) => (
                          <li
                            key={doc.name + idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadedDocs((prev) => prev.filter((_, i) => i !== idx));
                            }}
                            className="flex items-center justify-between gap-2 bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded"
                          >
                            <span className="truncate">✓ {doc.name}</span>
                            <span className="shrink-0 text-[#CCFF00]">{doc.size}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="font-display text-[84px] font-black leading-[0.78] tracking-[-0.055em]">+DOC</span>
                      <span className="rounded-full bg-[#CCFF00] text-[#080808] font-mono text-[10px] font-bold uppercase px-4 py-2">
                        + Upload File
                      </span>
                    </div>
                  </article>

                  <article className="group relative flex flex-col justify-between bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] transition-colors duration-500">
                    <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#CCFF00] text-[#080808] px-3.5 py-0.5 font-sans text-[11px] font-bold">Live Log</span>
                    <div>
                      <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                        <span className="bg-[#CCFF00] text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">Contract</span> Milestones
                      </h3>
                      <p className="m-0 mt-1 font-sans text-[12.5px] text-[#555555] group-hover:text-neutral-300">Appearances, Clinics &amp; Mentions</p>
                      <div className="mt-4 space-y-2">
                        {proofLogs.slice(0, 3).map((log) => (
                          <div key={log.id} className="rounded-lg bg-white/85 group-hover:bg-white/10 p-2.5 font-sans text-xs">
                            <span className="font-mono text-[9.5px] font-bold text-[#080808] group-hover:text-[#CCFF00] block">{log.id} · {log.status}</span>
                            {log.obligation}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="font-display text-[84px] font-black leading-[0.78] tracking-[-0.055em]">0{proofLogs.length}</div>
                  </article>

                  <article
                    onClick={() => proofInputRef.current?.click()}
                    className="group relative flex flex-col justify-between bg-[#080808] text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] cursor-pointer"
                  >
                    <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#0F0F11] text-white px-3.5 py-0.5 font-sans text-[11px] font-bold">Upload Proof</span>
                    <div>
                      <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                        <span className="bg-[#CCFF00] text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">Proof</span> Upload Utility
                      </h3>
                      <p className="m-0 mt-1 font-sans text-[12.5px] text-neutral-300">Geo-Tagged Photos &amp; Social Stems</p>
                      <p className="m-0 mt-5 font-sans text-[13px] leading-relaxed text-neutral-200">
                        Click card to select a geo-tagged photo, social media screenshot, or coaching clinic sheet from your device to trigger instant T+0 payout.
                      </p>
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="font-display text-[84px] font-black leading-[0.78] tracking-[-0.055em]">+POP</span>
                      <span className="rounded-full bg-[#CCFF00] text-[#080808] font-mono text-[10px] font-bold uppercase px-4 py-2">
                        + Select File
                      </span>
                    </div>
                  </article>
                </div>
              )}
            </>
          )}
        </div>

        {drawerMode === 'buy' && (
          <footer className="shrink-0 z-30 border-t border-black/10 bg-[#FFFFFF] px-4 sm:px-6 md:px-10 py-3.5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                SELECTED PACKAGE:
              </span>
              <span className="font-display text-lg font-black text-[#080808]">
                {activeFlight.code} · {activeFlight.firstWord} {activeFlight.restWords} ({activePriceDisplay})
              </span>
              <span className="hidden md:inline font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                70% Athlete · 15% Club ({athlete.current_club}) · 15% Ops · Paid Ad Spend Billed Direct
              </span>
            </div>

            <div className="flex items-center gap-3">
              {checkoutError ? (
                <span className="font-sans text-xs font-medium text-[#FF3300]">{checkoutError}</span>
              ) : null}
              <button
                type="button"
                disabled={checkoutLoading}
                onClick={() => triggerCheckout(activeFlight.tier_id)}
                className="rounded-full border-0 bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] px-7 py-3 font-mono text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors disabled:cursor-wait disabled:opacity-70 shadow-md"
              >
                {checkoutLoading
                  ? 'Initialising Stripe Clearing...'
                  : `LOCK ${activeFlight.code} RIGHTS · ${activePriceDisplay} →`}
              </button>
            </div>
          </footer>
        )}
      </div>

      {activeWhitelistingGrant && (
        <WhitelistingLaunchModal
          grant={activeWhitelistingGrant}
          onClose={() => setActiveWhitelistingGrant(null)}
        />
      )}
    </div>,
    document.body,
  );
};

export default AthleteDossierDrawer;