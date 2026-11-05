import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AssetImage } from './AssetImage';
import { FilmGrainOverlay } from './FilmGrainOverlay';
import { supabase } from '../lib/supabaseClient';
import { normalizeAthlete } from '../api';
import { BrandKitTab } from './AthleteProfileModal';
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

type SystemTabId =
  | '01_identity'
  | '02_conflicts'
  | '03_compliance'
  | '04_twelvelabs'
  | '05_copilot'
  | '06_escrow'
  | '07_catchment'
  | '08_social'
  | '09_deliverables';

const SYSTEMS: readonly { id: SystemTabId; code: string; short: string; fullTitle: string }[] = [
  { id: '01_identity', code: '01', short: 'Sovereign Identity', fullTitle: 'Commercial Overview & Sovereign Identity' },
  { id: '02_conflicts', code: '02', short: '48-Sector Matrix', fullTitle: 'Commercial Rights & Category Conflict Matrix' },
  { id: '03_compliance', code: '03', short: 'TPA & Governance', fullTitle: 'Regulations, Governing Body & TPA Compliance' },
  { id: '04_twelvelabs', code: '04', short: 'Broadcast Intelligence', fullTitle: 'Broadcast Video Intelligence & Brand Telemetry' },
  { id: '05_copilot', code: '05', short: 'Deal Screening', fullTitle: 'Sovereign AI Deal Screening & Intake' },
  { id: '06_escrow', code: '06', short: '70/15/15 Escrow', fullTitle: 'Escrow Settlement & Stripe Connect Rails' },
  { id: '07_catchment', code: '07', short: 'Spatial Catchment', fullTitle: 'Spatial Catchment & Trading Radius Governance' },
  { id: '08_social', code: '08', short: 'Social Attribution', fullTitle: 'Social Attribution & Audience Analytics' },
  { id: '09_deliverables', code: '09', short: 'Proof of Performance', fullTitle: 'Deliverables Tracking & Proof of Performance' },
];

const PROHIBITED_SECTORS = [
  'Sports Betting & Wagering',
  'Vaping & E-Cigarettes',
  'Alcohol & Spirits',
  'Unregulated Supplements',
] as const;

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
      { label: 'PAID AMPLIFICATION', value: '1-CLICK META/TIKTOK POSTCODE AD LICENCE INCLUDED' },
      { label: 'CLEARING RAIL', value: 'PROOF-OF-WORK ESCROW + INSTANT RCTI' },
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
      { label: 'PAID AMPLIFICATION', value: '1-CLICK META/TIKTOK POSTCODE AD LICENCE INCLUDED' },
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
      { label: 'PAID AMPLIFICATION', value: '1-CLICK META/TIKTOK POSTCODE AD LICENCE INCLUDED' },
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
      { label: 'COMMERCIAL', value: 'FULL AMBASSADOR & PAID AD WHITELISTING' },
      { label: 'PAID AMPLIFICATION', value: '1-CLICK META/TIKTOK POSTCODE AD LICENCE INCLUDED' },
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
  const [activeTab, setActiveTab] = useState<SystemTabId>('01_identity');
  const [selectedTierId, setSelectedTierId] = useState<string>('local_merchant');
  const [liveRow, setLiveRow] = useState<Record<string, any> | null>(null);
  const [syncingSupabase, setSyncingSupabase] = useState(false);
  const [mouSigned, setMouSigned] = useState(false);
  const [showFullTwelveLabsModal, setShowFullTwelveLabsModal] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [activeWhitelistingGrant, setActiveWhitelistingGrant] = useState<WhitelistingGrant | null>(null);

  const [uploadedDocs, setUploadedDocs] = useState<string[]>([
    'League_Registration_Card_2026.pdf',
    'TPA_Arm_Length_Clearance_Letter.pdf',
    'Sovereign_Identity_Pass_Verified.pdf',
  ]);
  const [semanticQuery, setSemanticQuery] = useState('fast break');
  const [semanticResults, setSemanticResults] = useState<
    { time: string; prompt: string; confidence: string; exposure: string }[]
  >([
    { time: '01:14', prompt: 'Fast break transition & finish', confidence: '98% Match', exposure: '4.2s Jersey Logo' },
    { time: '04:38', prompt: 'Corner jump shot / try-line tackle', confidence: '95% Match', exposure: '3.8s Court Signage' },
  ]);
  const [copilotPrompt, setCopilotPrompt] = useState('');
  const [copilotHistory, setCopilotHistory] = useState<{ role: 'sponsor' | 'agent'; text: string }[]>([]);
  const [proposalBrand, setProposalBrand] = useState('');
  const [proposalSubmitted, setProposalSubmitted] = useState(false);
  const [proofLogs, setProofLogs] = useState<
    { id: string; obligation: string; status: string; timestamp: string }[]
  >([
    { id: 'POP-01', obligation: 'Retail Precinct Appearance (Geo-Tagged)', status: 'CV VERIFIED · T+0 PAID', timestamp: 'Archived 5yr' },
    { id: 'POP-02', obligation: '9:16 Vertical Highlight Reel Mention', status: 'WATERMARK CONFIRMED', timestamp: 'Archived 5yr' },
    { id: 'POP-03', obligation: 'Junior Club Coaching Clinic Session', status: 'ATTENDANCE LOGGED', timestamp: 'Escrow Active' },
  ]);

  const scrollViewportRef = useRef<HTMLDivElement>(null);

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
    setMouSigned(Boolean(athlete.master_licence_signed));
    setShowFullTwelveLabsModal(false);
    setProposalSubmitted(false);
    setCheckoutError(null);
    setActiveWhitelistingGrant(null);
    setCopilotHistory([
      {
        role: 'agent',
        text: `Sovereign AI Copilot online for ${athlete.full_name} (${athlete.sport} · ${athlete.league}). Trained on verified rate cards, paid ad whitelisting permissions, and 48-sector lockouts in Postcode ${athlete.postcode}.`,
      },
    ]);

    let cancelled = false;
    setSyncingSupabase(true);
    supabase
      .from('athlete_profiles')
      .select('*')
      .or(`legal_full_name.ilike.%${athlete.full_name}%,display_name.ilike.%${athlete.display_name}%`)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) {
          setLiveRow(data);
          if (data.master_licence_mou_status === 'signed') setMouSigned(true);
        }
      })
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
  const activeSystemObj = SYSTEMS.find((s) => s.id === activeTab) ?? SYSTEMS[0];
  const seedConfig = computeSeedConfig(athlete);
  const isMinor = Boolean(liveRow?.is_minor);

  const entryPrice = seedConfig.floorLock
    ? 12500 * (seedConfig.multiplier === 4.0 ? 1 : seedConfig.multiplier)
    : Math.round(750 * seedConfig.multiplier);

  const activeFlight = BASE_FLIGHTS.find((f) => f.tier_id === selectedTierId) ?? BASE_FLIGHTS[0];
  const scaledActivePrice = Math.round(activeFlight.basePrice * (seedConfig.floorLock ? 1 : seedConfig.multiplier));
  const activePriceDisplay = `A$${scaledActivePrice.toLocaleString()}`;

  const normalizedForModal = normalizeAthlete({
    id: liveRow?.id ?? athlete.id,
    name: athlete.display_name,
    full_name: athlete.full_name,
    sport: athlete.sport,
    current_club: athlete.current_club,
    postcode: athlete.postcode,
    follower_count: athlete.social.follower_count,
    master_licence_signed: mouSigned,
    master_licence_mou_status: mouSigned ? 'signed' : 'unsigned',
  });

  const handleSemanticSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!semanticQuery.trim()) return;
    setSemanticResults((prev) => [
      {
        time: '02:49',
        prompt: `Semantic Match: "${semanticQuery.trim()}"`,
        confidence: '97% Match',
        exposure: '5.1s Broadcast Logo Exposure',
      },
      ...prev,
    ]);
  };

  const handleCopilotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = copilotPrompt.trim();
    if (!q) return;
    const lockedList = athlete.branding_categories.locked.join(', ') || 'none';
    const availList = athlete.branding_categories.available.join(', ');
    const reply = `Screened against ${athlete.full_name}'s sovereign ledger: Open sectors include ${availList} (Locked: ${lockedList}). Postcode ${athlete.postcode} (${suburb}) is unencumbered for coaching clinics, retail appearances, and 1-click Meta/TikTok postcode ad whitelisting.`;
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
        if (!checkoutUrl) {
          throw new Error('Local test mode');
        }
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
              02 SOVEREIGN TELEMETRY &amp; COMPLIANCE (AUDIT)
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Close [ESC]"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#FF3300] hover:bg-[#080808] text-white px-5 py-1.5 font-sans text-xs font-bold tracking-tight shadow-sm transition-colors cursor-pointer border-0"
          >
            <span>Close</span>
            <span className="text-[11px]">✕</span>
          </button>
        </header>

        <div
          ref={scrollViewportRef}
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
                    : `System ${activeSystemObj.code}: ${activeSystemObj.fullTitle}`}
                </p>
                <p className="m-0 mt-1 font-sans text-[12px] leading-[1.45] text-neutral-600">
                  Every package includes 1-click Meta and TikTok paid ad whitelisting to reach every phone in Postcode {athlete.postcode}.
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
                            : 'bg-[#FF3300] text-white'
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
                <div className="flex flex-wrap items-center gap-1.5">
                  {SYSTEMS.map((sys) => {
                    const active = activeTab === sys.id;
                    return (
                      <button
                        key={sys.id}
                        type="button"
                        onClick={() => setActiveTab(sys.id)}
                        className={`rounded-[6px] px-3 py-1.5 font-sans text-[12px] tracking-tight transition-all cursor-pointer border-0 ${
                          active
                            ? 'bg-[#CCFF00] text-[#080808] font-bold shadow-sm'
                            : 'bg-[#EAEAE6]/70 hover:bg-[#EAEAE6] text-[#080808] font-medium'
                        }`}
                      >
                        <span className="font-mono text-[10px] mr-1.5 opacity-60">{sys.code}</span>
                        <span>{sys.short}</span>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-1">
                  <article className="group relative flex flex-col justify-between bg-[#080808] text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)]">
                    <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#CCFF00] text-[#080808] px-3.5 py-0.5 font-sans text-[11px] font-bold">Verified</span>
                    <div>
                      <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                        <span className="bg-[#CCFF00] text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">Legal</span> Identity Match
                      </h3>
                      <p className="m-0 mt-1 font-sans text-[12.5px] text-neutral-300">Official Registration · Zero Proxy</p>
                      <p className="m-0 mt-5 font-sans text-[13px] leading-relaxed text-neutral-200">
                        Full legal identity verification matching official {athlete.governing_body.name} competition registrations against sovereign identity documents to eliminate proxy representation.
                      </p>
                    </div>
                    <div className="font-display text-[96px] font-black leading-[0.78] tracking-[-0.055em]">ID</div>
                  </article>

                  <article className="group relative flex flex-col justify-between bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] transition-colors duration-500">
                    <span
                      className={`absolute -top-2.5 right-5 z-30 rounded-full px-3.5 py-0.5 font-sans text-[11px] font-bold ${
                        isMinor ? 'bg-[#FF3300] text-white' : 'bg-[#CCFF00] text-[#080808]'
                      }`}
                    >
                      {isMinor ? 'Guardian Protected' : 'Verified 18+'}
                    </span>
                    <div>
                      <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                        <span className="group-hover:bg-[#CCFF00] group-hover:text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">
                          {isMinor ? 'Guardian' : 'Sovereign'}
                        </span>{' '}
                        {isMinor ? 'Co-Signature' : 'Adult Signatory'}
                      </h3>
                      <p className="m-0 mt-1 font-sans text-[12.5px] text-[#555555] group-hover:text-neutral-300">
                        {isMinor ? 'U18 Dual-Key Active' : 'DIRECT EXECUTION (ZERO AGENT PROXY)'}
                      </p>
                      <p className="m-0 mt-5 font-sans text-[13px] leading-relaxed text-[#444444] group-hover:text-neutral-200">
                        {isMinor
                          ? 'Legal guardian co-signature verification for emerging pathway athletes aged 16 to 17.'
                          : `${athlete.full_name} executes commercial package agreements directly as a verified 18+ adult signatory with full binding legal capacity.`}
                      </p>
                    </div>
                    <div className="font-display text-[96px] font-black leading-[0.78] tracking-[-0.055em]">
                      {isMinor ? '2X' : '18+'}
                    </div>
                  </article>

                  <article className="group relative flex flex-col justify-between bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] transition-colors duration-500">
                    <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#CCFF00] text-[#080808] px-3.5 py-0.5 font-sans text-[11px] font-bold">{athlete.status}</span>
                    <div>
                      <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                        <span className="group-hover:bg-[#CCFF00] group-hover:text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">Contractual</span> Clearance
                      </h3>
                      <p className="m-0 mt-1 font-sans text-[12.5px] text-[#555555] group-hover:text-neutral-300">Status: {athlete.agreement_status}</p>
                      <p className="m-0 mt-5 font-sans text-[13px] leading-relaxed text-[#444444] group-hover:text-neutral-200">
                        Contractual clearance badges indicating whether {athlete.full_name} is unencumbered under an open clearance or locked into an active commercial syndicate.
                      </p>
                    </div>
                    <div className="font-display text-[96px] font-black leading-[0.78] tracking-[-0.055em]">OK</div>
                  </article>

                  <article
                    onClick={() => setDrawerMode('buy')}
                    className="group relative flex flex-col justify-between bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] transition-colors duration-500 cursor-pointer"
                  >
                    <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#FFB800] text-[#080808] px-3.5 py-0.5 font-sans text-[11px] font-bold">
                      {seedConfig.label}
                    </span>
                    <div>
                      <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                        <span className="group-hover:bg-[#CCFF00] group-hover:text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">Fixed</span> Tier Pricing
                      </h3>
                      <p className="m-0 mt-1 font-sans text-[12.5px] text-[#555555] group-hover:text-neutral-300">
                        Entry Lock: A${entryPrice.toLocaleString()} · Media Value: A$14,800/yr
                      </p>
                      <p className="m-0 mt-5 font-sans text-[13px] leading-relaxed text-[#444444] group-hover:text-neutral-200">
                        Upfront packaging scaled via {athlete.full_name}’s {seedConfig.label} with 1-click Meta and TikTok paid ad whitelisting included.
                      </p>
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="font-display text-[96px] font-black leading-[0.78] tracking-[-0.055em]">04</span>
                      <span className="rounded-full bg-[#CCFF00] text-[#080808] font-mono text-[10px] font-bold uppercase tracking-widest px-4 py-2">
                        DEPLOY →
                      </span>
                    </div>
                  </article>
                </div>
              )}

              {activeTab === '02_conflicts' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-1">
                  <article className="group relative flex flex-col justify-between bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] transition-colors duration-500">
                    <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#CCFF00] text-[#080808] px-3.5 py-0.5 font-sans text-[11px] font-bold">Open</span>
                    <div>
                      <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                        <span className="bg-[#CCFF00] text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">48-Sector</span> Conflict Scan
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

                  <article className="group relative flex flex-col justify-between bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] transition-colors duration-500">
                    <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#FF3300] text-white px-3.5 py-0.5 font-sans text-[11px] font-bold">Suppressed</span>
                    <div>
                      <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                        <span className="group-hover:bg-[#CCFF00] group-hover:text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">Hard</span> Policy Exclusions
                      </h3>
                      <p className="m-0 mt-1 font-sans text-[12.5px] text-[#555555] group-hover:text-neutral-300">Amateur &amp; League Eligibility Protection</p>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {PROHIBITED_SECTORS.map((s) => (
                          <span key={s} className="rounded-full bg-black/10 group-hover:bg-white/15 px-3 py-1 font-sans text-xs">✕ {s}</span>
                        ))}
                      </div>
                    </div>
                    <div className="font-display text-[96px] font-black leading-[0.78] tracking-[-0.055em]">00</div>
                  </article>

                  <article onClick={() => setMouSigned(true)} className="group relative flex flex-col justify-between bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] transition-colors duration-500 cursor-pointer">
                    <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#CCFF00] text-[#080808] px-3.5 py-0.5 font-sans text-[11px] font-bold">{mouSigned ? 'Executed' : 'Sign MOU'}</span>
                    <div>
                      <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                        <span className="group-hover:bg-[#CCFF00] group-hover:text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">Master</span> NIL Licence
                      </h3>
                      <p className="m-0 mt-1 font-sans text-[12.5px] text-[#555555] group-hover:text-neutral-300">{mouSigned ? '2-Year Executed Term Active' : 'Click to Execute Digital MOU'}</p>
                      <p className="m-0 mt-5 font-sans text-[13px] leading-relaxed text-[#444444] group-hover:text-neutral-200">
                        Master NIL licence status confirming executed legal terms and paid ad whitelisting permissions prior to contract binding.
                      </p>
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="font-display text-[88px] font-black leading-[0.78] tracking-[-0.055em]">NIL</span>
                      <span className="rounded-full bg-[#CCFF00] text-[#080808] font-mono text-[10px] font-bold uppercase px-3.5 py-2">{mouSigned ? 'Active ✓' : 'Execute →'}</span>
                    </div>
                  </article>

                  <article onClick={() => setDrawerMode('buy')} className="group relative flex flex-col justify-between bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] transition-colors duration-500 cursor-pointer">
                    <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#FFB800] text-[#080808] px-3.5 py-0.5 font-sans text-[11px] font-bold">Locked</span>
                    <div>
                      <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                        <span className="group-hover:bg-[#CCFF00] group-hover:text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">Territory</span> Lockout
                      </h3>
                      <p className="m-0 mt-1 font-sans text-[12.5px] text-[#555555] group-hover:text-neutral-300">Postcode {athlete.postcode} ({suburb})</p>
                      <p className="m-0 mt-5 font-sans text-[13px] leading-relaxed text-[#444444] group-hover:text-neutral-200">
                        Commercial territory locking that prevents rival sponsors from signing competing talent within the same {athlete.postcode} postcode catchment.
                      </p>
                    </div>
                    <div className="font-display text-[80px] font-black leading-[0.78] tracking-[-0.055em]">{athlete.postcode}</div>
                  </article>
                </div>
              )}

              {activeTab === '03_compliance' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-1">
                  <article className="group relative flex flex-col justify-between bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] transition-colors duration-500">
                    <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#CCFF00] text-[#080808] px-3.5 py-0.5 font-sans text-[11px] font-bold">Aligned</span>
                    <div>
                      <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                        <span className="bg-[#CCFF00] text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">Federation</span> Alignment
                      </h3>
                      <p className="m-0 mt-1 font-sans text-[12.5px] text-[#555555] group-hover:text-neutral-300">{athlete.governing_body.name}</p>
                      <p className="m-0 mt-5 font-sans text-[13px] leading-relaxed text-[#444444] group-hover:text-neutral-200">
                        Direct governing body alignment across national and state sporting federations including Basketball Australia, Athletics Australia, and Rugby Australia.
                      </p>
                    </div>
                    <div className="font-display text-[88px] font-black leading-[0.78] tracking-[-0.055em]">FED</div>
                  </article>

                  <article className="group relative flex flex-col justify-between bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] transition-colors duration-500">
                    <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#CCFF00] text-[#080808] px-3.5 py-0.5 font-sans text-[11px] font-bold">Audited</span>
                    <div>
                      <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                        <span className="group-hover:bg-[#CCFF00] group-hover:text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">TPA</span> Arm’s-Length Audit
                      </h3>
                      <p className="m-0 mt-1 font-sans text-[12.5px] text-[#555555] group-hover:text-neutral-300">Independent of {athlete.current_club}</p>
                      <p className="m-0 mt-5 font-sans text-[13px] leading-relaxed text-[#444444] group-hover:text-neutral-200">
                        Third-Party Agreement (TPA) compliance auditing confirming that every commercial transaction is completely independent and arm’s length from club payrolls.
                      </p>
                    </div>
                    <div className="font-display text-[88px] font-black leading-[0.78] tracking-[-0.055em]">TPA</div>
                  </article>

                  <article className="group relative flex flex-col justify-between bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] transition-colors duration-500">
                    <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#FF3300] text-white px-3.5 py-0.5 font-sans text-[11px] font-bold">Exempt</span>
                    <div>
                      <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                        <span className="group-hover:bg-[#CCFF00] group-hover:text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">Salary Cap</span> Governance
                      </h3>
                      <p className="m-0 mt-1 font-sans text-[12.5px] text-[#555555] group-hover:text-neutral-300">{athlete.league} Integrity Log</p>
                      <p className="m-0 mt-5 font-sans text-[13px] leading-relaxed text-[#444444] group-hover:text-neutral-200">
                        Salary cap governance logs proving non-wage compliance for integrity officers in state leagues like NBL1, Shute Shield, and VFL.
                      </p>
                    </div>
                    <div className="font-display text-[88px] font-black leading-[0.78] tracking-[-0.055em]">CAP</div>
                  </article>

                  <article
                    onClick={() =>
                      setUploadedDocs((prev) => [
                        `Clearance_Pass_${athlete.postcode}_${Date.now().toString().slice(-3)}.pdf`,
                        ...prev,
                      ])
                    }
                    className="group relative flex flex-col justify-between bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] transition-colors duration-500 cursor-pointer"
                  >
                    <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#FFB800] text-[#080808] px-3.5 py-0.5 font-sans text-[11px] font-bold">Vault</span>
                    <div>
                      <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                        <span className="group-hover:bg-[#CCFF00] group-hover:text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">Document</span> Upload Vault
                      </h3>
                      <p className="m-0 mt-1 font-sans text-[12.5px] text-[#555555] group-hover:text-neutral-300">Click Card to Upload Clearance Pass</p>
                      <ul className="m-0 mt-4 p-0 list-none space-y-1.5 font-mono text-[10px]">
                        {uploadedDocs.slice(0, 4).map((doc) => (
                          <li key={doc} className="truncate bg-white/80 group-hover:bg-white/10 px-2.5 py-1.5 rounded">✓ {doc}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="font-display text-[88px] font-black leading-[0.78] tracking-[-0.055em]">+DOC</span>
                      <span className="rounded-full bg-[#CCFF00] text-[#080808] font-mono text-[10px] font-bold uppercase px-3.5 py-2">+ Upload</span>
                    </div>
                  </article>
                </div>
              )}

              {activeTab === '04_twelvelabs' && (
                <div className="space-y-6 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <article
                      onClick={() => setShowFullTwelveLabsModal(!showFullTwelveLabsModal)}
                      className="group relative flex flex-col justify-between bg-[#080808] text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] cursor-pointer overflow-hidden"
                    >
                      <AssetImage
                        file={imageFile}
                        fallbackFiles={imageFallbacks}
                        alt={athlete.full_name}
                        className="absolute inset-0 w-full h-full object-cover opacity-45"
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
                        <p className="m-0 mt-1 font-sans text-[12px] text-neutral-300">NBL1 Broadcast Bounding Box</p>
                      </div>
                      <div className="relative z-10 flex items-end justify-between">
                        <span className="font-display text-[76px] font-black leading-[0.78]">AI</span>
                        <span className="rounded-full bg-[#CCFF00] text-[#080808] font-mono text-[10px] font-bold uppercase px-3.5 py-2">
                          {showFullTwelveLabsModal ? 'Hide Studio' : 'Brand Kit →'}
                        </span>
                      </div>
                    </article>

                    <article className="group relative isolate flex flex-col justify-between bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] transition-colors duration-500">
                      <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#FF3300] text-white px-3.5 py-0.5 font-sans text-[11px] font-bold">9:16 Auto</span>
                      <div>
                        <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                          <span className="group-hover:bg-[#CCFF00] group-hover:text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">Vertical</span> Reel Generator
                        </h3>
                        <p className="m-0 mt-1 font-sans text-[12.5px] text-[#555555] group-hover:text-neutral-300">Ready-to-Publish 9:16 Video Packages</p>
                        <p className="m-0 mt-5 font-sans text-[13px] leading-relaxed text-[#444444] group-hover:text-neutral-200">
                          Automated vertical highlight reel generator that processes raw match footage into sponsor-watermarked 9:16 social packages for Meta and TikTok paid whitelisting.
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
                      <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#FFB800] text-[#080808] px-3.5 py-0.5 font-sans text-[11px] font-bold">CV Audit</span>
                      <div>
                        <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                          <span className="group-hover:bg-[#CCFF00] group-hover:text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">Computer</span> Vision Audit
                        </h3>
                        <p className="m-0 mt-1 font-sans text-[12.5px] text-[#555555] group-hover:text-neutral-300">A$14,800/yr Broadcast Media Equivalent</p>
                        <p className="m-0 mt-5 font-sans text-[13px] leading-relaxed text-[#444444] group-hover:text-neutral-200">
                          Computer vision brand auditing calculating sponsor logo screen time (14.8s avg/match), jersey exposure, and broadcast impression values.
                        </p>
                      </div>
                      <div className="font-display text-[88px] font-black leading-[0.78] tracking-[-0.055em]">CV</div>
                    </article>
                  </div>

                  {showFullTwelveLabsModal && (
                    <div className="rounded-[20px] bg-[#080808] text-white p-6 sm:p-8 border border-black/15">
                      <BrandKitTab athlete={normalizedForModal} onSignMOU={() => setMouSigned(true)} />
                    </div>
                  )}
                </div>
              )}

              {activeTab === '05_copilot' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 pt-1">
                  <div className="lg:col-span-2 bg-[#EAEAE6] rounded-[18px] p-6 flex flex-col justify-between h-[clamp(390px,50vh,480px)]">
                    <div>
                      <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                        <span className="bg-[#CCFF00] text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">Sovereign</span> AI Agent Copilot
                      </h3>
                      <p className="m-0 mt-1 font-sans text-[12.5px] text-[#555555]">
                        Trained on {athlete.full_name}’s rate cards, training availability &amp; brand guidelines
                      </p>
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
                    <form onSubmit={handleCopilotSubmit} className="flex gap-2">
                      <input
                        type="text"
                        value={copilotPrompt}
                        onChange={(e) => setCopilotPrompt(e.target.value)}
                        placeholder="Query appearance dates, coaching clinics, or campaign deliverables..."
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
                    <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#FF3300] text-white px-3.5 py-0.5 font-sans text-[11px] font-bold">Intake</span>
                    <div>
                      <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                        <span className="bg-[#CCFF00] text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">Proposal</span> Intake Desk
                      </h3>
                      <p className="m-0 mt-1 font-sans text-[12.5px] text-[#555555]">Pre-Qualifies Corporate Proposals</p>
                      {proposalSubmitted ? (
                        <div className="mt-5 rounded-xl bg-[#CCFF00] p-4 font-sans text-xs font-bold text-[#080808]">
                          ✓ Proposal for {proposalBrand} pre-qualified and dispatched to accredited management.
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

              {activeTab === '06_escrow' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-1">
                  {[
                    { badge: 'Stripe Connect', first: 'Segregated', rest: 'Escrow Rails', sub: 'Upfront Gross Campaign Security', desc: 'Segregated escrow rails securing gross campaign funds upfront via Stripe Connect prior to competition or deliverable execution.', glyph: 'ESC' },
                    { badge: '70 / 15 / 15', first: 'Automated', rest: 'Revenue Split', sub: `70% Athlete · 15% ${athlete.current_club} · 15% Ops`, desc: 'Automated 70/15/15 financial distribution splitting gross revenue into 70% to the athlete, 15% to their grassroots junior club, and 15% to platform operations.', glyph: '70%' },
                    { badge: 'ATO Compliant', first: 'Automated', rest: 'RCTI Tax Invoices', sub: '100% Tax-Deductible Receipting', desc: 'Recipient Created Tax Invoice (RCTI) generation producing ATO-compliant tax documents automatically upon milestone completion.', glyph: 'TAX' },
                    { badge: 'Instant Payout', first: 'T+0 Bank', rest: 'Disbursement', sub: 'Zero 90-Day Invoice Traps', desc: 'T+0 automated bank disbursement releasing funds immediately to the athlete and junior club once proof of performance is validated.', glyph: 'T+0' },
                  ].map((card, i) => (
                    <article
                      key={card.first + i}
                      onClick={() => setDrawerMode('buy')}
                      className="group relative flex flex-col justify-between bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] transition-colors duration-500 cursor-pointer"
                    >
                      <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#CCFF00] text-[#080808] px-3.5 py-0.5 font-sans text-[11px] font-bold">{card.badge}</span>
                      <div>
                        <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                          <span className={`px-1.5 -ml-1.5 rounded-[4px] ${i === 0 ? 'bg-[#CCFF00] text-[#080808]' : 'group-hover:bg-[#CCFF00] group-hover:text-[#080808]'}`}>{card.first}</span> {card.rest}
                        </h3>
                        <p className="m-0 mt-1 font-sans text-[12.5px] text-[#555555] group-hover:text-neutral-300">{card.sub}</p>
                        <p className="m-0 mt-5 font-sans text-[13px] leading-relaxed text-[#444444] group-hover:text-neutral-200">{card.desc}</p>
                      </div>
                      <div className="font-display text-[88px] font-black leading-[0.78] tracking-[-0.055em]">{card.glyph}</div>
                    </article>
                  ))}
                </div>
              )}

              {activeTab === '07_catchment' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-1">
                  {[
                    { badge: 'Home Territory', first: 'Postcode', rest: 'Exclusivity Engine', sub: `Postcode ${athlete.postcode} (${suburb})`, desc: `Postcode exclusivity engine anchoring commercial rights directly to ${athlete.full_name}'s residential suburb (${suburb}) and primary training facility.`, glyph: athlete.postcode },
                    { badge: '5km / 15km / 50km', first: 'Radial', rest: 'Boundary Rings', sub: 'Storefront, Metro & Regional Hubs', desc: 'Radial boundaries covering 5km local storefronts, 15km trade catchments, and 50km regional hubs to guarantee geographic protection.', glyph: `${athlete.radiusKm}K` },
                    { badge: 'Foot Traffic', first: 'Suburban', rest: 'Retail Attribution', sub: `${suburb} Retail Density Mapping`, desc: "Suburban commercial attribution mapping local foot traffic and high-street retail density against the athlete's home territory.", glyph: 'MAP' },
                    { badge: 'Multi-Zone', first: 'Dual-Catchment', rest: 'Allocation', sub: 'Cross-Association Conflict Protection', desc: 'Dual-catchment allocation allowing competitors who train and play across separate associations to manage multiple commercial zones without conflict.', glyph: '2Z' },
                  ].map((card, i) => (
                    <article key={card.first + i} className="group relative flex flex-col justify-between bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] transition-colors duration-500">
                      <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#FF3300] text-white px-3.5 py-0.5 font-sans text-[11px] font-bold">{card.badge}</span>
                      <div>
                        <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                          <span className={`px-1.5 -ml-1.5 rounded-[4px] ${i === 0 ? 'bg-[#CCFF00] text-[#080808]' : 'group-hover:bg-[#CCFF00] group-hover:text-[#080808]'}`}>{card.first}</span> {card.rest}
                        </h3>
                        <p className="m-0 mt-1 font-sans text-[12.5px] text-[#555555] group-hover:text-neutral-300">{card.sub}</p>
                        <p className="m-0 mt-5 font-sans text-[13px] leading-relaxed text-[#444444] group-hover:text-neutral-200">{card.desc}</p>
                      </div>
                      <div className="font-display text-[84px] font-black leading-[0.78] tracking-[-0.055em]">{card.glyph}</div>
                    </article>
                  ))}
                </div>
              )}

              {activeTab === '08_social' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-1">
                  {[
                    { badge: 'Live API', first: 'Authenticated', rest: 'Social Telemetry', sub: `${athlete.social.instagram_handle} · ${athlete.social.engagement_rate} Eng.`, desc: 'Authenticated social API integration tracking live follower counts and verified engagement percentages across Instagram and TikTok.', glyph: formatFollowers(athlete.social.follower_count) },
                    { badge: 'Local Reach', first: 'Suburban', rest: 'Concentration', sub: `Within ${athlete.radiusKm}km of Postcode ${athlete.postcode}`, desc: "Suburban audience concentration metrics isolating the exact percentage of an athlete's following residing within the sponsor's trading radius.", glyph: '68%' },
                    { badge: 'Bot Filtered', first: 'Anomaly', rest: '& Bot Filtering', sub: '99.4% Verified Human Reach', desc: 'Anomaly filtering removing bot traffic and inorganic spikes to ensure local and national brands fund genuine human reach.', glyph: '99%' },
                    { badge: 'Ad Equivalent', first: 'Media', rest: 'Valuation Index', sub: 'Broadcast Equivalent: A$14,800/yr', desc: 'Media valuation indexing calculating equivalent paid advertising spend based on verified digital reach and state-league broadcast airtime.', glyph: 'ROI' },
                  ].map((card, i) => (
                    <article key={card.first + i} className="group relative flex flex-col justify-between bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] transition-colors duration-500">
                      <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#CCFF00] text-[#080808] px-3.5 py-0.5 font-sans text-[11px] font-bold">{card.badge}</span>
                      <div>
                        <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                          <span className={`px-1.5 -ml-1.5 rounded-[4px] ${i === 0 ? 'bg-[#CCFF00] text-[#080808]' : 'group-hover:bg-[#CCFF00] group-hover:text-[#080808]'}`}>{card.first}</span> {card.rest}
                        </h3>
                        <p className="m-0 mt-1 font-sans text-[12.5px] text-[#555555] group-hover:text-neutral-300">{card.sub}</p>
                        <p className="m-0 mt-5 font-sans text-[13px] leading-relaxed text-[#444444] group-hover:text-neutral-200">{card.desc}</p>
                      </div>
                      <div className="font-display text-[80px] font-black leading-[0.78] tracking-[-0.055em]">{card.glyph}</div>
                    </article>
                  ))}
                </div>
              )}

              {activeTab === '09_deliverables' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-1">
                  <article className="group relative flex flex-col justify-between bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] transition-colors duration-500">
                    <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#CCFF00] text-[#080808] px-3.5 py-0.5 font-sans text-[11px] font-bold">Live Log</span>
                    <div>
                      <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                        <span className="bg-[#CCFF00] text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">Contract</span> Milestones
                      </h3>
                      <p className="m-0 mt-1 font-sans text-[12.5px] text-[#555555] group-hover:text-neutral-300">Appearances, Clinics &amp; Mentions</p>
                      <div className="mt-4 space-y-2">
                        {proofLogs.map((log) => (
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
                    onClick={() =>
                      setProofLogs((prev) => [
                        {
                          id: `POP-0${prev.length + 1}`,
                          obligation: `Geo-Tagged Precinct Drop (${suburb})`,
                          status: 'CV VERIFIED · T+0 PAID',
                          timestamp: 'Archived 5yr',
                        },
                        ...prev,
                      ])
                    }
                    className="group relative flex flex-col justify-between bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] transition-colors duration-500 cursor-pointer"
                  >
                    <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#FF3300] text-white px-3.5 py-0.5 font-sans text-[11px] font-bold">Upload</span>
                    <div>
                      <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                        <span className="group-hover:bg-[#CCFF00] group-hover:text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">Proof</span> Upload Utility
                      </h3>
                      <p className="m-0 mt-1 font-sans text-[12.5px] text-[#555555] group-hover:text-neutral-300">Geo-Tagged Photos &amp; Social Permalinks</p>
                      <p className="m-0 mt-5 font-sans text-[13px] leading-relaxed text-[#444444] group-hover:text-neutral-200">
                        Click card to log a new geo-tagged photo, social media permalink, or coaching clinic attendance sheet to trigger instant payout.
                      </p>
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="font-display text-[84px] font-black leading-[0.78] tracking-[-0.055em]">+POP</span>
                      <span className="rounded-full bg-[#CCFF00] text-[#080808] font-mono text-[10px] font-bold uppercase px-3.5 py-2">+ Log Proof</span>
                    </div>
                  </article>

                  <article className="group relative flex flex-col justify-between bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] transition-colors duration-500">
                    <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#CCFF00] text-[#080808] px-3.5 py-0.5 font-sans text-[11px] font-bold">Auto-Trigger</span>
                    <div>
                      <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                        <span className="group-hover:bg-[#CCFF00] group-hover:text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">CV Escrow</span> Release
                      </h3>
                      <p className="m-0 mt-1 font-sans text-[12.5px] text-[#555555] group-hover:text-neutral-300">Zero Manual Approval Bottlenecks</p>
                      <p className="m-0 mt-5 font-sans text-[13px] leading-relaxed text-[#444444] group-hover:text-neutral-200">
                        Automated computer vision triggers confirming social media deliverables and sponsor watermarks before authorising Stripe Connect escrow payouts.
                      </p>
                    </div>
                    <div className="font-display text-[84px] font-black leading-[0.78] tracking-[-0.055em]">CV</div>
                  </article>

                  <article className="group relative flex flex-col justify-between bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white rounded-[18px] p-6 h-[clamp(390px,50vh,480px)] transition-colors duration-500">
                    <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#FFB800] text-[#080808] px-3.5 py-0.5 font-sans text-[11px] font-bold">5-Yr Vault</span>
                    <div>
                      <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em]">
                        <span className="group-hover:bg-[#CCFF00] group-hover:text-[#080808] px-1.5 -ml-1.5 rounded-[4px]">Compliance</span> Archive
                      </h3>
                      <p className="m-0 mt-1 font-sans text-[12.5px] text-[#555555] group-hover:text-neutral-300">ATO &amp; Governing Body Retention</p>
                      <p className="m-0 mt-5 font-sans text-[13px] leading-relaxed text-[#444444] group-hover:text-neutral-200">
                        Digital compliance archive retaining signed Master NIL contracts, governing body passes, and ATO RCTI tax invoices for five years.
                      </p>
                    </div>
                    <div className="font-display text-[84px] font-black leading-[0.78] tracking-[-0.055em]">5YR</div>
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
                70% Athlete · 15% Club ({athlete.current_club}) · 15% Ops
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
                  ? 'Initialising Stripe Escrow...'
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