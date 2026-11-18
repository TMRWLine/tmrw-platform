import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AssetImage } from './AssetImage';
import { FilmGrainOverlay } from './FilmGrainOverlay';
import { supabase } from '../lib/supabaseClient';
import {
  StripeEscrowCheckoutModal,
  type StripeCheckoutPayload,
} from './StripeEscrowCheckoutModal';
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

export interface LiveAthleteOverride {
  full_name?: string;
  sport?: string;
  league?: string;
  governing_body?: string;
  postcode?: string;
  suburb?: string;
  secondary_postcode?: string;
  under_18_guardian?: boolean;
  guardian_name?: string;
  junior_club?: string;
  payout_bsb_account?: string;
  abn_status?: string;
  instagram_handle?: string;
  tiktok_handle?: string;
  availability_windows?: string;
  locked_categories?: string[];
  open_categories?: string[];
  follower_count?: number;
  engagement_rate?: string;
  local_concentration?: string;
  portrait_image?: string;
  gallery_slides?: { label: string; url: string }[];
  reel_video_url?: string;
  highlight_stem_file?: string;
  monogram_svg_file?: string;
  mou_signed?: boolean;
  bio?: string;
  pull_quote?: string;
  vitals_position?: string;
  vitals_physical?: string;
  vitals_stats?: string;
  kit_sizing?: string;
  accolades?: string[];
  ai_clips?: { time: string; label: string; title: string; exposure: string; views: string }[];
  proof_logs?: { id: string; obligation: string; status: string }[];
  last_updated_at?: number;
}

const BASE_FLIGHTS = [
  {
    tier_id: 'local_merchant',
    numeral: '01',
    code: 'PACKAGE 01',
    shortCode: 'PKG 01',
    badge: '5km Lock',
    badgeVariant: 'black' as const,
    name: 'Precinct Contra & Micro',
    firstWord: 'Precinct',
    restWords: 'Contra & Micro',
    line1: '5km Postcode Lock + In-Venue Session',
    line2: 'Quarterly · A$525 Net to Athlete',
    basePrice: 750,
    summary:
      "Own your immediate postcode. Built for local cafes, gyms, and recovery clinics backing an athlete's daily training block through cash and product seeding. Lock out direct local competitors within a 5km radius.",
    specs: [
      { label: 'TERRITORY', value: '5KM POSTCODE COMPETITOR LOCK' },
      { label: 'ACTIVATION', value: '1X IN-VENUE SESSION + COUNTER QR PLAQUE' },
      { label: 'DELIVERABLES', value: '2X AI-CUT 9:16 REELS (WATERMARKED)' },
      { label: 'HANDLE SPONSORSHIP', value: 'API HANDLE LINKING (AD SPEND DIRECT)' },
    ],
  },
  {
    tier_id: 'pathway_contender',
    numeral: '02',
    code: 'PACKAGE 02',
    shortCode: 'PKG 02',
    badge: '15km Lock',
    badgeVariant: 'black' as const,
    name: 'Pathway Contender',
    firstWord: 'Pathway',
    restWords: 'Contender',
    line1: '15km District Lock + Training Kit Logo',
    line2: 'Annual Backing · A$2,450 Net to Athlete',
    basePrice: 3500,
    summary:
      'Mid-market corporate backing for 18-to-25 contenders dominating televised state leagues (NBL1, Shute Shield, VFL, WNBL). Underwrites competition travel while putting your brand on training kit and verified local feeds.',
    specs: [
      { label: 'TERRITORY', value: '15KM SUBURBAN CLUSTER EXCLUSIVITY' },
      { label: 'BRANDING', value: 'OFFICIAL TRAINING KIT LOGO PLACEMENT' },
      { label: 'ACTIVATION', value: '4X QUARTERLY 9:16 CONTENT DROPS' },
      { label: 'HANDLE SPONSORSHIP', value: 'PAID SOCIAL AMPLIFICATION (15KM)' },
    ],
  },
  {
    tier_id: 'national_challenger',
    numeral: '03',
    code: 'PACKAGE 03',
    shortCode: 'PKG 03',
    badge: 'Popular',
    badgeVariant: 'green' as const,
    name: 'National Challenger',
    firstWord: 'National',
    restWords: 'Challenger',
    line1: 'State-Wide Category Lockout + 4K Media Vault',
    line2: 'Annual Backing · A$8,750 Net to Athlete',
    basePrice: 12500,
    summary:
      'Complete state-wide category lockout for national-level contenders. Block every rival brand across your sector, unlock pre-shot 4K broadcast and 9:16 social video stems, and book an executive keynote.',
    specs: [
      { label: 'TERRITORY', value: 'STATE-WIDE 48-SECTOR CATEGORY LOCK' },
      { label: 'MEDIA RIGHTS', value: 'PRE-SHOT 4K BROADCAST & AD STEM VAULT' },
      { label: 'APPEARANCES', value: '1X EXECUTIVE KEYNOTE OR CLINIC' },
      { label: 'HANDLE SPONSORSHIP', value: 'STATE-WIDE API HANDLE LINKING' },
    ],
  },
  {
    tier_id: 'world_class',
    numeral: '04',
    code: 'PACKAGE 04',
    shortCode: 'PKG 04',
    badge: 'AU & NZ',
    badgeVariant: 'yellow' as const,
    name: 'Trans-Tasman Headline',
    firstWord: 'Trans-Tasman',
    restWords: 'Headline',
    line1: 'Pan-Pacific Licence (AU & NZ) + Keynote',
    line2: 'Headline Partner · A$17,500 Net to Athlete',
    basePrice: 25000,
    summary:
      'Headline single-athlete commercial partnership across Australia and New Zealand. Full trans-Tasman digital likeness licensing, direct handle sponsorship, co-branded merch rights, and internal staff town halls.',
    specs: [
      { label: 'TERRITORY', value: 'TRANS-TASMAN EXCLUSIVITY (AU & NZ)' },
      { label: 'COMMERCIAL', value: 'HEADLINE AMBASSADOR, IP & MERCH CAPSULE' },
      { label: 'KEYNOTE', value: 'INTERNAL STAFF TOWN HALL + VIP ACCESS' },
      { label: 'HANDLE SPONSORSHIP', value: 'AU & NZ PAID SOCIAL AMPLIFICATION' },
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
  const [drawerMode, setDrawerMode] = useState<'buy' | 'audit'>(initialMode === 'buy' ? 'audit' : initialMode);
  const [selectedTierId, setSelectedTierId] = useState<string>('local_merchant');
  const [selectedDossierPillar, setSelectedDossierPillar] = useState<'01' | '02' | '03' | '04'>('01');

  const [vitalsLens, setVitalsLens] = useState<'specs' | 'honours' | 'schedule'>('specs');
  const [catchmentRing, setCatchmentRing] = useState<'5km' | '15km' | '50km'>('15km');
  const [auditedSector, setAuditedSector] = useState<string | null>(null);
  const [auditedPillars, setAuditedPillars] = useState<Record<string, boolean>>({});

  const [downloadedAsset, setDownloadedAsset] = useState<string | null>(null);
  const [stripePayload, setStripePayload] = useState<StripeCheckoutPayload | null>(null);
  const [liveOverride, setLiveOverride] = useState<LiveAthleteOverride | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const isOpen = Boolean(athlete);

  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.querySelector<HTMLButtonElement>('.dossier-close button')?.focus({ preventScroll: true });
    return () => {
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [isOpen]);

  useEffect(() => {
    if (!athlete || stripePayload) return;
    const panel = dialogRef.current;
    if (!panel) return;
    const focusable = () => Array.from(panel.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
    )).filter((element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden');
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first || !last) return;
      if (!panel.contains(document.activeElement) ||
          (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus({ preventScroll: true });
      }
    };
    const containFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !panel.contains(event.target)) {
        panel.querySelector<HTMLButtonElement>('.dossier-close button')?.focus({ preventScroll: true });
      }
    };
    window.addEventListener('keydown', handleKey);
    document.addEventListener('focusin', containFocus);
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.removeEventListener('focusin', containFocus);
    };
  }, [athlete, stripePayload, onClose]);

  const currentIndex = athlete
    ? ROSTER_DATA.findIndex(
        (entry) => entry.id === athlete.id || entry.record.full_name === athlete.full_name,
      )
    : -1;
  const prevEntry = currentIndex !== -1 ? ROSTER_DATA[(currentIndex - 1 + ROSTER_DATA.length) % ROSTER_DATA.length] : null;
  const nextEntry = currentIndex !== -1 ? ROSTER_DATA[(currentIndex + 1) % ROSTER_DATA.length] : null;

  useEffect(() => {
    if (!athlete) return;
    const loadOverride = () => {
      try {
        const raw = localStorage.getItem(`tmrw_override_${athlete.id}`);
        setLiveOverride(raw ? (JSON.parse(raw) as LiveAthleteOverride) : null);
      } catch {
        setLiveOverride(null);
      }
    };
    loadOverride();
    window.addEventListener('tmrw:athlete-updated', loadOverride);
    return () => window.removeEventListener('tmrw:athlete-updated', loadOverride);
  }, [athlete]);

  useEffect(() => {
    if (!athlete) return;
    const seed = computeSeedConfig(athlete);
    setDrawerMode('audit');
    setSelectedTierId(seed.floorLock ? 'national_challenger' : 'local_merchant');
    setSelectedDossierPillar('01');
    setVitalsLens('specs');
    setCatchmentRing('15km');
    setAuditedSector(athlete.branding_categories.available[0] ?? 'Apparel');
    setAuditedPillars({});
    setDownloadedAsset(null);
    setStripePayload(null);

    supabase.auth.getUser().catch(() => {});
  }, [athlete]);

  if (!athlete) return null;

  const displayFullName = liveOverride?.full_name || athlete.full_name;
  const displaySport = liveOverride?.sport || athlete.sport;
  const displayLeague = liveOverride?.league || athlete.league;
  const displayPostcode = liveOverride?.postcode || athlete.postcode;
  const displaySuburb = liveOverride?.suburb || suburbForPostcode(displayPostcode);
  const displaySecondaryPostcode = liveOverride?.secondary_postcode || '2026';
  const displayClub = liveOverride?.junior_club || athlete.current_club;
  const displayIgHandle = liveOverride?.instagram_handle || athlete.social.instagram_handle;
  const displayAvailability =
    liveOverride?.availability_windows || 'Tue & Thu (2pm–5pm) · Sun AM';
  const isUnder18Guardian = liveOverride?.under_18_guardian ?? false;
  const guardianName = liveOverride?.guardian_name || 'Verified Legal Guardian';

  const displayPullQuote =
    liveOverride?.pull_quote ||
    `"Every 5 AM session in ${displaySuburb} is built around taking ${displayClub} to the national stage and earning a spot on the LA 2028 runway."`;

  const displayBio =
    liveOverride?.bio ||
    athlete.bio ||
    `${displayFullName} is a verified first-grade contender in ${displayLeague}, developed through ${displayClub} in Postcode ${displayPostcode} (${displaySuburb}). Pre-cleared for local precinct contra, state-wide category lockouts, and direct handle paid social amplification.`;

  const displayPosition = liveOverride?.vitals_position || `${displaySport} · First-Grade Starter`;
  const displayPhysical = liveOverride?.vitals_physical || `193 cm (6'4") · 88 kg · Age 21`;
  const displayStats = liveOverride?.vitals_stats || `19.4 PPG · 6.2 AST · 42% 3PT`;
  const displayKitSizing = liveOverride?.kit_sizing || `Top: L/XL · Short: L · US 12`;

  const displayAccolades = liveOverride?.accolades || [
    `${displayLeague} All-State First Team (2025/26)`,
    `LA 2028 & Brisbane 2032 National Shortlist`,
    `Head Junior Clinic Coach · ${displayClub}`,
    `${athlete.governing_body.name} Integrity & TPA Cleared`,
  ];

  const lockedCategories = liveOverride?.locked_categories ?? athlete.branding_categories.locked;
  const availableCategories = athlete.branding_categories.available.filter(
    (c) => !lockedCategories.includes(c),
  );

  const specimen = specimenFor(athlete.id);
  const imageFile = portraitFile(specimen?.image ?? athlete.image);
  const imageFallbacks = specimen?.imageFallbacks ?? [];
  const seedConfig = computeSeedConfig(athlete);

  const entryPrice = seedConfig.floorLock
    ? 12500 * (seedConfig.multiplier === 4.0 ? 1 : seedConfig.multiplier)
    : Math.round(750 * seedConfig.multiplier);

  const activeFlight = BASE_FLIGHTS.find((f) => f.tier_id === selectedTierId) ?? BASE_FLIGHTS[0];
  const scaledActivePrice = Math.round(activeFlight.basePrice * (seedConfig.floorLock ? 1 : seedConfig.multiplier));
  const activePriceDisplay = `A$${scaledActivePrice.toLocaleString()}`;
  const athleteNet70 = Math.round(scaledActivePrice * 0.7);

  const catchmentMetrics = {
    '5km': {
      concentration: `78% IN POSTCODE ${displayPostcode}`,
      reach: `${formatFollowers(Math.round((athlete.social.follower_count || 14200) * 0.55))} PRECINCT LOCAL`,
      mediaVal: 'A$6,400 / YR EQUIV',
      packageTier: 'local_merchant',
    },
    '15km': {
      concentration: `68% IN POSTCODE ${displayPostcode}`,
      reach: `${formatFollowers(athlete.social.follower_count || 14200)} DISTRICT REACH`,
      mediaVal: 'A$14,800 / YR EQUIV',
      packageTier: 'pathway_contender',
    },
    '50km': {
      concentration: `92% GREATER METRO (${displayPostcode}/${displaySecondaryPostcode})`,
      reach: `${formatFollowers(Math.round((athlete.social.follower_count || 14200) * 1.85))} METRO AMPLIFIED`,
      mediaVal: 'A$32,500 / YR EQUIV',
      packageTier: 'national_challenger',
    },
  }[catchmentRing];

  const markAudited = (pillar: string) => {
    setAuditedPillars((prev) => ({ ...prev, [pillar]: true }));
  };

  const triggerRealFileDownload = (title: string) => {
    markAudited('02');
    const blob = new Blob(
      [
        `tmrw/. SOVEREIGN CLEARINGHOUSE RECORD\n`,
        `==================================================\n`,
        `Athlete: ${displayFullName} (${displaySport} · ${displayLeague})\n`,
        `Signatory Authority: ${isUnder18Guardian ? `Dual-Key Guardian Co-Signed (${guardianName})` : '18+ Sovereign Signatory'}\n`,
        `Vitals & Sizing: ${displayPhysical} | ${displayKitSizing}\n`,
        `Document / Asset: ${title}\n`,
        `Primary Postcode Lock: ${displayPostcode} (${displaySuburb}) | Secondary Zone: ${displaySecondaryPostcode}\n`,
        `Master NIL Licence Hash: 0x94F${displayPostcode}E\n`,
        `Direct Handle Sponsorship: ${displayIgHandle}\n`,
        `Hardwired 70/15/15 Split: 70% Athlete / 15% ${displayClub} / 15% Platform Ops\n`,
      ],
      { type: 'text/plain;charset=utf-8' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${displayFullName.replace(/\s+/g, '_')}_${title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadedAsset(title);
  };

  const triggerCheckout = (tierId: string) => {
    setSelectedTierId(tierId);
    const flight = BASE_FLIGHTS.find((f) => f.tier_id === tierId) ?? BASE_FLIGHTS[0];
    const priceAud = Math.round(flight.basePrice * (seedConfig.floorLock ? 1 : seedConfig.multiplier));

    setStripePayload({
      athleteId: athlete.id,
      athleteName: displayFullName,
      athleteSport: `${displaySport} · ${displayLeague}`,
      athleteImage: athlete.image,
      clubName: displayClub,
      postcode: displayPostcode,
      tierId: flight.tier_id,
      packageCode: flight.code,
      packageName: flight.name,
      priceAud,
      sectorLabel: auditedSector || availableCategories[0] || 'Apparel',
    });
  };

  return createPortal(
    <div
      data-lenis-prevent="true"
      onClick={onClose}
      className="dossier-backdrop fixed inset-0 z-[80] bg-black/45 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 selection:bg-[#CCFF00] selection:text-[#080808] animate-fadeIn"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${displayFullName} athlete dossier`}
        data-lenis-prevent="true"
        onWheel={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="dossier-panel relative w-full max-w-[1840px] h-[94dvh] rounded-[24px] bg-[#FFFFFF] text-[#080808] shadow-[0_30px_90px_rgba(0,0,0,0.28)] border border-black/10 flex flex-col overflow-hidden"
      >
        <header className="dossier-header shrink-0 z-30 grid grid-cols-3 items-center px-4 sm:px-6 md:px-10 py-3.5 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-black/10">
          <div className="dossier-athlete-switcher flex items-center gap-2">
            <button
              type="button"
              onClick={() => prevEntry && onSelectAthlete?.(prevEntry.record)}
              className="inline-flex items-center gap-2 rounded-full bg-[#F0F0EE] hover:bg-[#080808] text-[#080808] hover:text-white px-4 py-1.5 font-sans text-xs font-medium transition-colors cursor-pointer border-0"
            >
              <span>←</span>
              <span className="font-bold">{prevEntry?.name ?? 'Previous'}</span>
            </button>
            <button
              type="button"
              onClick={() => nextEntry && onSelectAthlete?.(nextEntry.record)}
              className="inline-flex items-center gap-2 rounded-full bg-[#F0F0EE] hover:bg-[#080808] text-[#080808] hover:text-white px-4 py-1.5 font-sans text-xs font-medium transition-colors cursor-pointer border-0"
            >
              <span className="font-bold">{nextEntry?.name ?? 'Next'}</span>
              <span>→</span>
            </button>
          </div>

          <div className="dossier-tabs flex items-center justify-center gap-7 font-sans text-[13px] tracking-tight">
            <button
              type="button"
              onClick={() => setDrawerMode('audit')}
              className={`flex items-center gap-2 border-0 bg-transparent p-0 cursor-pointer transition-colors ${
                drawerMode === 'audit' ? 'text-[#080808] font-bold' : 'text-neutral-500 hover:text-[#080808]'
              }`}
            >
              <svg
                className={`w-4 h-4 shrink-0 ${drawerMode === 'audit' ? 'text-[#080808]' : 'text-neutral-400'}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <line x1="7" y1="9" x2="17" y2="9" />
                <line x1="7" y1="13" x2="13" y2="13" />
              </svg>
              <span
                className={
                  drawerMode === 'audit'
                    ? 'bg-[#CCFF00] text-[#080808] px-2.5 py-0.5 rounded-[4px] font-bold'
                    : ''
                }
              >
                Athlete Dossier
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDrawerMode('buy')}
              className={`flex items-center gap-2 border-0 bg-transparent p-0 cursor-pointer transition-colors ${
                drawerMode === 'buy' ? 'text-[#080808] font-bold' : 'text-neutral-500 hover:text-[#080808]'
              }`}
            >
              <svg
                className={`w-4 h-4 shrink-0 ${drawerMode === 'buy' ? 'text-[#080808]' : 'text-neutral-400'}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
                <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
                <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
                <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
              </svg>
              <span
                className={
                  drawerMode === 'buy'
                    ? 'bg-[#CCFF00] text-[#080808] px-2.5 py-0.5 rounded-[4px] font-bold'
                    : ''
                }
              >
                Commercial Packages
              </span>
            </button>
          </div>

          <div className="dossier-close flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              title="Close [ESC]"
              aria-label="Close modal"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] px-5 py-1.5 font-sans text-xs font-bold tracking-tight transition-colors cursor-pointer border-0"
            >
              <span>Close</span>
              <span className="text-[11px]">✕</span>
            </button>
          </div>
        </header>

        <div
          data-lenis-prevent="true"
          className="dossier-content flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 md:px-10 pt-5 pb-10 bg-[#FFFFFF]"
        >
          <div className="mb-5 border-b border-black/10 pb-4">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-5 items-center">
              <div className="lg:col-span-2 flex items-center gap-4">
                <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-[14px] bg-[#F0F0EE] overflow-hidden border border-black/10">
                  <AssetImage
                    file={imageFile}
                    fallbackFiles={imageFallbacks}
                    alt={displayFullName}
                    className="w-full h-full object-cover filter grayscale hover:grayscale-0 transition-all duration-500"
                  />
                </div>
                <div>
                  <h1 className="m-0 font-display text-4xl sm:text-6xl xl:text-[68px] font-black tracking-[-0.04em] leading-[0.86] uppercase text-[#080808]">
                    {displayFullName}
                    <span className="text-[#CCFF00]">.</span>
                  </h1>
                </div>
              </div>

              <div className="lg:border-l lg:border-black/10 lg:pl-5">
                {drawerMode === 'audit' ? (
                  <>
                    <p className="m-0 font-sans text-[14.5px] sm:text-[15px] font-bold tracking-[-0.02em] leading-[1.28] text-[#080808]">
                      {displayPullQuote}
                    </p>
                    <p className="m-0 mt-1 font-sans text-[12px] leading-[1.45] text-neutral-600 line-clamp-2">
                      {displayBio}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="m-0 font-sans text-[14.5px] sm:text-[15px] font-bold tracking-[-0.02em] leading-[1.28] text-[#080808]">
                      Four clear packages. Zero talent agency commissions.
                    </p>
                    <p className="m-0 mt-1 font-sans text-[12px] leading-[1.45] text-neutral-600">
                      Every package includes automated <strong className="text-[#080808]">API handle linking</strong> so your brand can run geo-fenced Meta and TikTok ads straight through{' '}
                      <strong className="text-[#080808]">{displayFullName}'s</strong> verified handle ({displayIgHandle}).
                    </p>
                  </>
                )}
              </div>

              <div className="lg:border-l lg:border-black/10 lg:pl-5">
                <p className="m-0 font-sans text-[12px] leading-[1.45] text-neutral-600">
                  No ninety-day invoice traps or agency middlemen. Hardwired{' '}
                  <span className="bg-[#CCFF00] text-[#080808] font-bold px-1.5 py-0.5 rounded-[3px]">
                    70/15/15 split
                  </span>{' '}
                  backing <strong className="text-[#080808]">{displayFullName}</strong> and{' '}
                  <strong className="text-[#080808]">{displayClub}</strong> via ATO/IRD tax-deductible RCTI escrow.
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
                const isSelected = selectedTierId === pkg.tier_id && !isFloorLocked;

                return (
                  <li key={pkg.tier_id} className="m-0 flex min-w-0 flex-col p-0">
                    <article
                      onMouseEnter={() => !isFloorLocked && setSelectedTierId(pkg.tier_id)}
                      onClick={() => !isFloorLocked && triggerCheckout(pkg.tier_id)}
                      style={{ borderRadius: '16px', minHeight: '490px' }}
                      className={`dossier-card group relative isolate flex flex-col justify-between p-7 xl:p-8 transition-colors duration-500 overflow-visible select-none ${
                        isFloorLocked
                          ? 'bg-[#F0F0EE]/60 text-neutral-400 cursor-not-allowed border border-black/10'
                          : isSelected
                          ? 'bg-[#080808] text-white cursor-pointer shadow-xl'
                          : 'bg-[#F0F0EE] hover:bg-[#080808] text-[#080808] hover:text-white cursor-pointer'
                      }`}
                    >
                      <span
                        className={`absolute -top-2.5 right-5 z-30 rounded-full px-3.5 py-0.5 font-sans text-[11px] font-bold tracking-tight shadow-xs ${
                          isFloorLocked
                            ? 'bg-[#080808] text-[#CCFF00]'
                            : pkg.badgeVariant === 'green'
                            ? 'bg-[#CCFF00] text-[#080808]'
                            : pkg.badgeVariant === 'yellow'
                            ? 'bg-[#F5B800] text-[#080808]'
                            : 'bg-[#0F0F11] text-white'
                        }`}
                      >
                        {isFloorLocked ? 'Floor Locked' : pkg.badge}
                      </span>

                      <div
                        style={{ borderRadius: '16px' }}
                        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
                      >
                        <AssetImage
                          file={imageFile}
                          fallbackFiles={imageFallbacks}
                          alt={displayFullName}
                          className={`w-full h-full object-cover filter contrast-125 transition-all duration-700 ease-out ${
                            isSelected
                              ? 'grayscale-0 opacity-35 scale-105'
                              : 'grayscale opacity-[0.10] group-hover:grayscale-0 group-hover:opacity-35 scale-100 group-hover:scale-105'
                          }`}
                        />
                        <div
                          className={`absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/40 to-[#080808]/85 transition-opacity duration-500 ${
                            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}
                        />
                        <FilmGrainOverlay intensity="fine" />
                      </div>

                      <div className="package-heading relative z-20 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="m-0 font-sans text-[18px] font-bold tracking-[-0.02em] leading-snug">
                            <span
                              className={`inline-block rounded-[4px] px-1.5 -ml-1.5 transition-colors duration-200 ${
                                isSelected
                                  ? 'bg-[#CCFF00] text-[#080808]'
                                  : 'bg-transparent group-hover:bg-[#CCFF00] group-hover:text-[#080808]'
                              }`}
                            >
                              {pkg.firstWord}
                            </span>{' '}
                            <span>{pkg.restWords}</span>
                          </h3>
                          <p
                            className={`m-0 mt-1 font-sans text-[12.5px] font-normal leading-[1.38] truncate ${
                              isSelected ? 'text-neutral-200' : 'text-[#666666] group-hover:text-neutral-200'
                            }`}
                          >
                            {pkg.line1}
                          </p>
                          <p
                            className={`m-0 font-sans text-[12.5px] font-normal leading-[1.38] truncate ${
                              isSelected ? 'text-neutral-300' : 'text-[#666666] group-hover:text-neutral-300'
                            }`}
                          >
                            {pkg.line2} · {priceDisplay}
                          </p>
                        </div>
                        <span
                          className={`relative z-30 shrink-0 font-display text-lg font-black tracking-tight ${
                            isSelected ? 'text-[#CCFF00]' : 'text-[#080808] group-hover:text-[#CCFF00]'
                          }`}
                        >
                          {priceDisplay}
                        </span>
                      </div>

                      <div className="relative z-20 my-auto py-4 space-y-3">
                        <p
                          className={`m-0 font-sans text-[12.5px] leading-relaxed ${
                            isSelected ? 'text-neutral-200' : 'text-[#444444] group-hover:text-neutral-200'
                          }`}
                        >
                          {pkg.summary}
                        </p>
                        <div
                          className={`divide-y border-y font-mono text-[9.5px] ${
                            isSelected
                              ? 'divide-white/15 border-white/15 text-neutral-300'
                              : 'divide-black/10 border-black/10 text-neutral-600 group-hover:divide-white/15 group-hover:border-white/15 group-hover:text-neutral-300'
                          }`}
                        >
                          {pkg.specs.map((s) => (
                            <div key={s.label} className="py-1.5 flex items-center justify-between gap-2">
                              <span className="opacity-70">{s.label}</span>
                              <span className="font-bold text-right">{s.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="relative z-20 mt-auto pt-4 pb-1">
                        <div
                          className={`dossier-card-number font-display text-[128px] xl:text-[138px] font-black leading-[0.82] tracking-[-0.055em] -ml-1 transition-all duration-300 ${
                            !isFloorLocked
                              ? 'group-hover:opacity-0 group-hover:translate-y-2 group-hover:pointer-events-none'
                              : ''
                          }`}
                        >
                          {pkg.numeral}
                        </div>
                        {!isFloorLocked && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerCheckout(pkg.tier_id);
                            }}
                            className="dossier-card-actions absolute inset-x-0 bottom-0 h-10 rounded-full bg-[#FFFFFF] text-[#080808] shadow-[0_12px_32px_rgba(0,0,0,0.35)] px-2 flex items-center justify-between opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300"
                          >
                            <span className="font-sans text-[11.5px] font-semibold tracking-tight text-[#080808] pl-2.5 truncate">
                              {pkg.shortCode} · {pkg.badge}
                            </span>
                            <span className="h-7 rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] px-3.5 font-sans text-[11.5px] font-bold tracking-tight flex items-center gap-1.5 transition-colors">
                              <span>Lock {priceDisplay}</span>
                              <span className="text-[10px]">→</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}

          {drawerMode === 'audit' && (
            <ul className="m-0 grid list-none grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-stretch gap-x-5 gap-y-6 p-0 pt-2">
              <li className="m-0 flex min-w-0 flex-col p-0">
                <article
                  onMouseEnter={() => setSelectedDossierPillar('01')}
                  style={{ borderRadius: '16px', minHeight: '490px' }}
                  className={`dossier-card group relative isolate flex flex-col justify-between p-7 xl:p-8 transition-colors duration-500 cursor-pointer overflow-visible select-none ${
                    selectedDossierPillar === '01'
                      ? 'bg-[#080808] text-white shadow-xl'
                      : 'bg-[#F0F0EE] hover:bg-[#080808] text-[#080808] hover:text-white'
                  }`}
                >
                  <span
                    className={`absolute -top-2.5 right-5 z-30 rounded-full px-3.5 py-0.5 font-sans text-[11px] font-bold tracking-tight shadow-xs ${
                      auditedPillars['01']
                        ? 'bg-[#CCFF00] text-[#080808]'
                        : 'bg-[#0F0F11] text-white'
                    }`}
                  >
                    {auditedPillars['01'] ? '✓ Specs Audited' : 'Verified Pedigree'}
                  </span>

                  <div
                    style={{ borderRadius: '16px' }}
                    className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
                  >
                    <AssetImage
                      file={imageFile}
                      fallbackFiles={imageFallbacks}
                      alt={displayFullName}
                      className={`w-full h-full object-cover filter contrast-125 transition-all duration-700 ease-out ${
                        selectedDossierPillar === '01'
                          ? 'grayscale-0 opacity-35 scale-105'
                          : 'grayscale opacity-[0.10] group-hover:grayscale-0 group-hover:opacity-35 scale-100 group-hover:scale-105'
                      }`}
                    />
                    <div
                      className={`absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/40 to-[#080808]/85 transition-opacity duration-500 ${
                        selectedDossierPillar === '01' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    />
                    <FilmGrainOverlay intensity="fine" />
                  </div>

                  <div className="relative z-20 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="m-0 font-sans text-[18px] font-bold tracking-[-0.02em] leading-snug">
                        <span
                          className={`inline-block rounded-[4px] px-1.5 -ml-1.5 transition-colors duration-200 ${
                            selectedDossierPillar === '01'
                              ? 'bg-[#CCFF00] text-[#080808]'
                              : 'bg-transparent group-hover:bg-[#CCFF00] group-hover:text-[#080808]'
                          }`}
                        >
                          Vitals
                        </span>{' '}
                        <span>& Seeding Spec</span>
                      </h3>
                      <p
                        className={`m-0 mt-1 font-sans text-[12.5px] font-normal leading-[1.38] truncate ${
                          selectedDossierPillar === '01' ? 'text-neutral-200' : 'text-[#666666] group-hover:text-neutral-200'
                        }`}
                      >
                        {displayPosition} · {displayPhysical}
                      </p>
                      <p
                        className={`m-0 font-sans text-[12.5px] font-normal leading-[1.38] truncate ${
                          selectedDossierPillar === '01' ? 'text-neutral-300' : 'text-[#666666] group-hover:text-neutral-300'
                        }`}
                      >
                        Season Telemetry · {displayStats}
                      </p>
                    </div>
                    <span
                      className={`relative z-30 shrink-0 font-display text-lg font-black tracking-tight ${
                        selectedDossierPillar === '01' ? 'text-[#CCFF00]' : 'text-[#080808] group-hover:text-[#CCFF00]'
                      }`}
                    >
                      BIO
                    </span>
                  </div>

                  <div className="relative z-20 my-auto py-4 space-y-3">
                    <p
                      className={`m-0 font-sans text-[12.5px] leading-relaxed ${
                        selectedDossierPillar === '01' ? 'text-neutral-200' : 'text-[#444444] group-hover:text-neutral-200'
                      }`}
                    >
                      {vitalsLens === 'honours'
                        ? `Verified Honours: ${displayAccolades.join(' · ')}.`
                        : vitalsLens === 'schedule'
                        ? `Pre-cleared for in-venue sessions, local school clinics, and content shoots inside Postcode ${displayPostcode} on ${displayAvailability}.`
                        : `${displayAccolades[0]} · ${displayAccolades[1]}. Ready for product seeding and local precinct appearances.`}
                    </p>
                    <div
                      className={`divide-y border-y font-mono text-[9.5px] uppercase ${
                        selectedDossierPillar === '01'
                          ? 'divide-white/15 border-white/15 text-neutral-300'
                          : 'divide-black/10 border-black/10 text-neutral-600 group-hover:divide-white/15 group-hover:border-white/15 group-hover:text-neutral-300'
                      }`}
                    >
                      {vitalsLens === 'honours' ? (
                        displayAccolades.slice(0, 4).map((acc, i) => (
                          <div key={acc} className="py-1.5 flex items-center justify-between gap-2">
                            <span className="opacity-70">HONOUR 0{i + 1}</span>
                            <span className="font-bold text-right truncate">{acc}</span>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="py-1.5 flex items-center justify-between gap-2">
                            <span className="opacity-70">PHYSICAL VITALS</span>
                            <span className="font-bold text-right">{displayPhysical}</span>
                          </div>
                          <div className="py-1.5 flex items-center justify-between gap-2">
                            <span className="opacity-70">SEEDING SIZES</span>
                            <span className="font-bold text-right">{displayKitSizing}</span>
                          </div>
                          <div className="py-1.5 flex items-center justify-between gap-2">
                            <span className="opacity-70">CLINIC WINDOWS</span>
                            <span className="font-bold text-right">{displayAvailability}</span>
                          </div>
                          <div className="py-1.5 flex items-center justify-between gap-2">
                            <span className="opacity-70">PROOF LEDGER</span>
                            <span className="font-bold text-right">CV & GEO-TAG VERIFIED</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="relative z-20 mt-auto pt-4 pb-1">
                    <div className="dossier-card-number font-display text-[128px] xl:text-[138px] font-black leading-[0.82] tracking-[-0.055em] -ml-1 transition-all duration-300 group-hover:opacity-0 group-hover:translate-y-2 group-hover:pointer-events-none">
                      01
                    </div>
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="dossier-card-actions absolute inset-x-0 bottom-0 h-10 rounded-full bg-[#FFFFFF] text-[#080808] shadow-[0_12px_32px_rgba(0,0,0,0.35)] px-1.5 flex items-center justify-between opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300"
                    >
                      <div className="flex items-center gap-0.5 pl-1">
                        {(['specs', 'honours', 'schedule'] as const).map((lens) => (
                          <button
                            key={lens}
                            type="button"
                            onClick={() => {
                              setVitalsLens(lens);
                              markAudited('01');
                            }}
                            className={`h-7 rounded-full px-2.5 font-sans text-[11px] font-bold capitalize border-0 cursor-pointer transition-colors ${
                              vitalsLens === lens
                                ? 'bg-[#CCFF00] text-[#080808]'
                                : 'bg-transparent text-[#080808]/70 hover:text-[#080808]'
                            }`}
                          >
                            {lens}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setDrawerMode('buy')}
                        className="h-7 rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] px-3 font-sans text-[11px] font-bold tracking-tight flex items-center gap-1 border-0 cursor-pointer transition-colors"
                      >
                        <span>Seed Kit</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                </article>
              </li>

              <li className="m-0 flex min-w-0 flex-col p-0">
                <article
                  onMouseEnter={() => setSelectedDossierPillar('02')}
                  style={{ borderRadius: '16px', minHeight: '490px' }}
                  className={`dossier-card group relative isolate flex flex-col justify-between p-7 xl:p-8 transition-colors duration-500 cursor-pointer overflow-visible select-none ${
                    selectedDossierPillar === '02'
                      ? 'bg-[#080808] text-white shadow-xl'
                      : 'bg-[#F0F0EE] hover:bg-[#080808] text-[#080808] hover:text-white'
                  }`}
                >
                  <span className="absolute -top-2.5 right-5 z-30 rounded-full bg-[#CCFF00] text-[#080808] px-3.5 py-0.5 font-sans text-[11px] font-bold tracking-tight shadow-xs">
                    {auditedPillars['02'] ? '✓ Kit Pulled' : 'Meta & TikTok OAuth'}
                  </span>

                  <div
                    style={{ borderRadius: '16px' }}
                    className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
                  >
                    <AssetImage
                      file={imageFile}
                      fallbackFiles={imageFallbacks}
                      alt={displayFullName}
                      className={`w-full h-full object-cover scale-125 object-top filter contrast-125 transition-all duration-700 ease-out ${
                        selectedDossierPillar === '02'
                          ? 'grayscale-0 opacity-35'
                          : 'grayscale opacity-[0.10] group-hover:grayscale-0 group-hover:opacity-35'
                      }`}
                    />
                    <div
                      className={`absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/40 to-[#080808]/85 transition-opacity duration-500 ${
                        selectedDossierPillar === '02' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    />
                    <FilmGrainOverlay intensity="fine" />
                  </div>

                  <div className="relative z-20 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="m-0 font-sans text-[18px] font-bold tracking-[-0.02em] leading-snug">
                        <span
                          className={`inline-block rounded-[4px] px-1.5 -ml-1.5 transition-colors duration-200 ${
                            selectedDossierPillar === '02'
                              ? 'bg-[#CCFF00] text-[#080808]'
                              : 'bg-transparent group-hover:bg-[#CCFF00] group-hover:text-[#080808]'
                          }`}
                        >
                          Paid Social
                        </span>{' '}
                        <span>& Brand Kit</span>
                      </h3>
                      <p
                        className={`m-0 mt-1 font-sans text-[12.5px] font-normal leading-[1.38] truncate ${
                          selectedDossierPillar === '02' ? 'text-neutral-200' : 'text-[#666666] group-hover:text-neutral-200'
                        }`}
                      >
                        API Handle Linking · {displayIgHandle}
                      </p>
                      <p
                        className={`m-0 font-sans text-[12.5px] font-normal leading-[1.38] truncate ${
                          selectedDossierPillar === '02' ? 'text-neutral-300' : 'text-[#666666] group-hover:text-neutral-300'
                        }`}
                      >
                        4K Video Stems & 5-Year RCTI Tax Archive
                      </p>
                    </div>
                    <span
                      className={`relative z-30 shrink-0 font-display text-lg font-black tracking-tight ${
                        selectedDossierPillar === '02' ? 'text-[#CCFF00]' : 'text-[#080808] group-hover:text-[#CCFF00]'
                      }`}
                    >
                      4K
                    </span>
                  </div>

                  <div className="relative z-20 my-auto py-4 space-y-3">
                    <p
                      className={`m-0 font-sans text-[12.5px] leading-relaxed ${
                        selectedDossierPillar === '02' ? 'text-neutral-200' : 'text-[#444444] group-hover:text-neutral-200'
                      }`}
                    >
                      Run geo-fenced Meta Partnership and TikTok Spark ads straight through {displayFullName}'s verified handle. Click any asset below to pull immediately.
                    </p>
                    <div
                      className={`divide-y border-y font-mono text-[9.5px] uppercase ${
                        selectedDossierPillar === '02'
                          ? 'divide-white/15 border-white/15 text-neutral-300'
                          : 'divide-black/10 border-black/10 text-neutral-600 group-hover:divide-white/15 group-hover:border-white/15 group-hover:text-neutral-300'
                      }`}
                    >
                      {[
                        { label: '9:16 HIGHLIGHT STEM (MP4)', file: '916_Highlight_Stem_4K' },
                        { label: 'ATHLETE MONOGRAM & SHIELD (SVG)', file: 'Athlete_Monogram_Vector_Pack' },
                        { label: 'COUNTERTOP VENUE QR PLAQUE (PDF)', file: 'Venue_Counter_QR_Plaque' },
                        { label: 'ATO / IRD RCTI TAX SPECIMEN', file: 'ATO_IRD_Tax_Invoice_Specimen' },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerRealFileDownload(item.file);
                          }}
                          className="w-full py-1.5 flex items-center justify-between gap-2 bg-transparent border-0 text-current cursor-pointer hover:text-[#CCFF00] text-left font-mono text-[9.5px] uppercase"
                        >
                          <span className="opacity-75 truncate">{item.label}</span>
                          <span className="font-bold shrink-0">
                            {downloadedAsset === item.file ? '✓ PULLED' : '↓ PULL'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative z-20 mt-auto pt-4 pb-1">
                    <div className="dossier-card-number font-display text-[128px] xl:text-[138px] font-black leading-[0.82] tracking-[-0.055em] -ml-1 transition-all duration-300 group-hover:opacity-0 group-hover:translate-y-2 group-hover:pointer-events-none">
                      02
                    </div>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerCheckout(selectedTierId);
                      }}
                      className="dossier-card-actions absolute inset-x-0 bottom-0 h-10 rounded-full bg-[#FFFFFF] text-[#080808] shadow-[0_12px_32px_rgba(0,0,0,0.35)] px-2 flex items-center justify-between opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300"
                    >
                      <span className="font-sans text-[11.5px] font-semibold tracking-tight text-[#080808] pl-2.5 truncate">
                        {downloadedAsset ? `✓ Pulled ${downloadedAsset}` : `OAuth · ${displayIgHandle}`}
                      </span>
                      <span className="h-7 rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] px-3.5 font-sans text-[11.5px] font-bold tracking-tight flex items-center gap-1.5 transition-colors">
                        <span>Unlock OAuth</span>
                        <span className="text-[10px]">→</span>
                      </span>
                    </div>
                  </div>
                </article>
              </li>

              <li className="m-0 flex min-w-0 flex-col p-0">
                <article
                  onMouseEnter={() => setSelectedDossierPillar('03')}
                  style={{ borderRadius: '16px', minHeight: '490px' }}
                  className={`dossier-card group relative isolate flex flex-col justify-between p-7 xl:p-8 transition-colors duration-500 cursor-pointer overflow-visible select-none ${
                    selectedDossierPillar === '03'
                      ? 'bg-[#080808] text-white shadow-xl'
                      : 'bg-[#F0F0EE] hover:bg-[#080808] text-[#080808] hover:text-white'
                  }`}
                >
                  <span
                    className={`absolute -top-2.5 right-5 z-30 rounded-full px-3.5 py-0.5 font-sans text-[11px] font-bold tracking-tight shadow-xs ${
                      auditedPillars['03']
                        ? 'bg-[#CCFF00] text-[#080808]'
                        : 'bg-[#0F0F11] text-white'
                    }`}
                  >
                    {catchmentRing} Turf Lock
                  </span>

                  <div
                    style={{ borderRadius: '16px' }}
                    className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
                  >
                    <AssetImage
                      file={imageFile}
                      fallbackFiles={imageFallbacks}
                      alt={displayFullName}
                      className={`w-full h-full object-cover scale-110 object-bottom filter contrast-125 transition-all duration-700 ease-out ${
                        selectedDossierPillar === '03'
                          ? 'grayscale-0 opacity-35'
                          : 'grayscale opacity-[0.10] group-hover:grayscale-0 group-hover:opacity-35'
                      }`}
                    />
                    <div
                      className={`absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/40 to-[#080808]/85 transition-opacity duration-500 ${
                        selectedDossierPillar === '03' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    />
                    <FilmGrainOverlay intensity="fine" />
                  </div>

                  <div className="relative z-20 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="m-0 font-sans text-[18px] font-bold tracking-[-0.02em] leading-snug">
                        <span
                          className={`inline-block rounded-[4px] px-1.5 -ml-1.5 transition-colors duration-200 ${
                            selectedDossierPillar === '03'
                              ? 'bg-[#CCFF00] text-[#080808]'
                              : 'bg-transparent group-hover:bg-[#CCFF00] group-hover:text-[#080808]'
                          }`}
                        >
                          Audience
                        </span>{' '}
                        <span>& Turf Lock</span>
                      </h3>
                      <p
                        className={`m-0 mt-1 font-sans text-[12.5px] font-normal leading-[1.38] truncate ${
                          selectedDossierPillar === '03' ? 'text-neutral-200' : 'text-[#666666] group-hover:text-neutral-200'
                        }`}
                      >
                        Postcode {displayPostcode} ({displaySuburb})
                      </p>
                      <p
                        className={`m-0 font-sans text-[12.5px] font-normal leading-[1.38] truncate ${
                          selectedDossierPillar === '03' ? 'text-neutral-300' : 'text-[#666666] group-hover:text-neutral-300'
                        }`}
                      >
                        Dual Zone {displaySecondaryPostcode} · {catchmentMetrics.reach}
                      </p>
                    </div>
                    <span
                      className={`relative z-30 shrink-0 font-display text-lg font-black tracking-tight ${
                        selectedDossierPillar === '03' ? 'text-[#CCFF00]' : 'text-[#080808] group-hover:text-[#CCFF00]'
                      }`}
                    >
                      {displayPostcode}
                    </span>
                  </div>

                  <div className="relative z-20 my-auto py-4 space-y-3">
                    <p
                      className={`m-0 font-sans text-[12.5px] leading-relaxed ${
                        selectedDossierPillar === '03' ? 'text-neutral-200' : 'text-[#444444] group-hover:text-neutral-200'
                      }`}
                    >
                      Bot-filtered social telemetry isolating verified human reach and retail foot-traffic concentration inside a {catchmentRing} trading radius of Postcode {displayPostcode}.
                    </p>
                    <div
                      className={`divide-y border-y font-mono text-[9.5px] uppercase ${
                        selectedDossierPillar === '03'
                          ? 'divide-white/15 border-white/15 text-neutral-300'
                          : 'divide-black/10 border-black/10 text-neutral-600 group-hover:divide-white/15 group-hover:border-white/15 group-hover:text-neutral-300'
                      }`}
                    >
                      <div className="py-1.5 flex items-center justify-between gap-2">
                        <span className="opacity-70">HUMAN AUTHENTICITY</span>
                        <span className="font-bold text-right">99.4% VERIFIED HUMAN</span>
                      </div>
                      <div className="py-1.5 flex items-center justify-between gap-2">
                        <span className="opacity-70">ENGAGEMENT RATE</span>
                        <span className="font-bold text-right">{athlete.social.engagement_rate} VERIFIED</span>
                      </div>
                      <div className="py-1.5 flex items-center justify-between gap-2">
                        <span className="opacity-70">LOCAL CONCENTRATION</span>
                        <span className="font-bold text-right">{catchmentMetrics.concentration}</span>
                      </div>
                      <div className="py-1.5 flex items-center justify-between gap-2">
                        <span className="opacity-70">MEDIA EQUIVALENT</span>
                        <span className="font-bold text-right">{catchmentMetrics.mediaVal}</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative z-20 mt-auto pt-4 pb-1">
                    <div className="dossier-card-number font-display text-[128px] xl:text-[138px] font-black leading-[0.82] tracking-[-0.055em] -ml-1 transition-all duration-300 group-hover:opacity-0 group-hover:translate-y-2 group-hover:pointer-events-none">
                      03
                    </div>
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="dossier-card-actions absolute inset-x-0 bottom-0 h-10 rounded-full bg-[#FFFFFF] text-[#080808] shadow-[0_12px_32px_rgba(0,0,0,0.35)] px-1.5 flex items-center justify-between opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300"
                    >
                      <div className="flex items-center gap-0.5 pl-1">
                        {(['5km', '15km', '50km'] as const).map((ring) => (
                          <button
                            key={ring}
                            type="button"
                            onClick={() => {
                              setCatchmentRing(ring);
                              markAudited('03');
                            }}
                            className={`h-7 rounded-full px-2.5 font-sans text-[11px] font-bold border-0 cursor-pointer transition-colors ${
                              catchmentRing === ring
                                ? 'bg-[#CCFF00] text-[#080808]'
                                : 'bg-transparent text-[#080808]/70 hover:text-[#080808]'
                            }`}
                          >
                            {ring}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => triggerCheckout(catchmentMetrics.packageTier)}
                        className="h-7 rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] px-3 font-sans text-[11px] font-bold tracking-tight flex items-center gap-1 border-0 cursor-pointer transition-colors"
                      >
                        <span>Lock {displayPostcode}</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                </article>
              </li>

              <li className="m-0 flex min-w-0 flex-col p-0">
                <article
                  onMouseEnter={() => setSelectedDossierPillar('04')}
                  style={{ borderRadius: '16px', minHeight: '490px' }}
                  className={`dossier-card group relative isolate flex flex-col justify-between p-7 xl:p-8 transition-colors duration-500 cursor-pointer overflow-visible select-none ${
                    selectedDossierPillar === '04'
                      ? 'bg-[#080808] text-white shadow-xl'
                      : 'bg-[#F0F0EE] hover:bg-[#080808] text-[#080808] hover:text-white'
                  }`}
                >
                  <span
                    className={`absolute -top-2.5 right-5 z-30 rounded-full px-3.5 py-0.5 font-sans text-[11px] font-bold tracking-tight shadow-xs ${
                      auditedPillars['04']
                        ? 'bg-[#CCFF00] text-[#080808]'
                        : 'bg-[#F5B800] text-[#080808]'
                    }`}
                  >
                    {auditedPillars['04']
                      ? `✓ ${auditedSector} Cleared`
                      : `${availableCategories.length} Open Sectors`}
                  </span>

                  <div
                    style={{ borderRadius: '16px' }}
                    className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
                  >
                    <AssetImage
                      file={imageFile}
                      fallbackFiles={imageFallbacks}
                      alt={displayFullName}
                      className={`w-full h-full object-cover scale-115 object-center filter contrast-125 transition-all duration-700 ease-out ${
                        selectedDossierPillar === '04'
                          ? 'grayscale-0 opacity-35'
                          : 'grayscale opacity-[0.10] group-hover:grayscale-0 group-hover:opacity-35'
                      }`}
                    />
                    <div
                      className={`absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/40 to-[#080808]/85 transition-opacity duration-500 ${
                        selectedDossierPillar === '04' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    />
                    <FilmGrainOverlay intensity="fine" />
                  </div>

                  <div className="relative z-20 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="m-0 font-sans text-[18px] font-bold tracking-[-0.02em] leading-snug">
                        <span
                          className={`inline-block rounded-[4px] px-1.5 -ml-1.5 transition-colors duration-200 ${
                            selectedDossierPillar === '04'
                              ? 'bg-[#CCFF00] text-[#080808]'
                              : 'bg-transparent group-hover:bg-[#CCFF00] group-hover:text-[#080808]'
                          }`}
                        >
                          Category
                        </span>{' '}
                        <span>& TPA Check</span>
                      </h3>
                      <p
                        className={`m-0 mt-1 font-sans text-[12.5px] font-normal leading-[1.38] truncate ${
                          selectedDossierPillar === '04' ? 'text-neutral-200' : 'text-[#666666] group-hover:text-neutral-200'
                        }`}
                      >
                        {isUnder18Guardian ? `Guardian Co-Signed (${guardianName})` : '18+ Sovereign Signatory'}
                      </p>
                      <p
                        className={`m-0 font-sans text-[12.5px] font-normal leading-[1.38] truncate ${
                          selectedDossierPillar === '04' ? 'text-neutral-300' : 'text-[#666666] group-hover:text-neutral-300'
                        }`}
                      >
                        48-Sector Ledger · 0% Agency Commission
                      </p>
                    </div>
                    <span
                      className={`relative z-30 shrink-0 font-display text-lg font-black tracking-tight ${
                        selectedDossierPillar === '04' ? 'text-[#CCFF00]' : 'text-[#080808] group-hover:text-[#CCFF00]'
                      }`}
                    >
                      48
                    </span>
                  </div>

                  <div className="relative z-20 my-auto py-4 space-y-3">
                    <p
                      className={`m-0 font-sans text-[12.5px] leading-relaxed ${
                        selectedDossierPillar === '04' ? 'text-neutral-200' : 'text-[#444444] group-hover:text-neutral-200'
                      }`}
                    >
                      Arm's-length Third-Party Agreement (TPA) compliant with {athlete.governing_body.name} salary-cap rules. Click any open sector below to run an instant conflict check.
                    </p>
                    <div
                      className={`divide-y border-y font-mono text-[9.5px] uppercase ${
                        selectedDossierPillar === '04'
                          ? 'divide-white/15 border-white/15 text-neutral-300'
                          : 'divide-black/10 border-black/10 text-neutral-600 group-hover:divide-white/15 group-hover:border-white/15 group-hover:text-neutral-300'
                      }`}
                    >
                      <div className="py-1.5 flex items-center justify-between gap-2">
                        <span className="opacity-70">OPEN SECTORS</span>
                        <div className="flex flex-wrap justify-end gap-1">
                          {availableCategories.map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAuditedSector(cat);
                                markAudited('04');
                              }}
                              className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase border-0 cursor-pointer transition-colors ${
                                auditedSector === cat
                                  ? 'bg-[#CCFF00] text-[#080808]'
                                  : 'bg-white/15 text-current hover:bg-[#CCFF00] hover:text-[#080808]'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="py-1.5 flex items-center justify-between gap-2">
                        <span className="opacity-70">LOCKED SECTORS</span>
                        <span className="font-bold text-right truncate">
                          {lockedCategories.length ? lockedCategories.join(', ') : 'NONE'}
                        </span>
                      </div>
                      <div className="py-1.5 flex items-center justify-between gap-2">
                        <span className="opacity-70">MASTER NIL DEED</span>
                        <span className="font-bold text-right">HASH 0x94F{displayPostcode}E</span>
                      </div>
                      <div className="py-1.5 flex items-center justify-between gap-2">
                        <span className="opacity-70">GUARDRAILS</span>
                        <span className="font-bold text-right">NO BETTING / VAPING</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative z-20 mt-auto pt-4 pb-1">
                    <div className="dossier-card-number font-display text-[128px] xl:text-[138px] font-black leading-[0.82] tracking-[-0.055em] -ml-1 transition-all duration-300 group-hover:opacity-0 group-hover:translate-y-2 group-hover:pointer-events-none">
                      04
                    </div>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        markAudited('04');
                        triggerCheckout(selectedTierId);
                      }}
                      className="dossier-card-actions absolute inset-x-0 bottom-0 h-10 rounded-full bg-[#FFFFFF] text-[#080808] shadow-[0_12px_32px_rgba(0,0,0,0.35)] px-2 flex items-center justify-between opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300"
                    >
                      <span className="font-sans text-[11.5px] font-semibold tracking-tight text-[#080808] pl-2.5 truncate">
                        ✓ {auditedSector || availableCategories[0]} Cleared
                      </span>
                      <span className="h-7 rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] px-3.5 font-sans text-[11.5px] font-bold tracking-tight flex items-center gap-1.5 transition-colors">
                        <span>Lock Sector</span>
                        <span className="text-[10px]">→</span>
                      </span>
                    </div>
                  </div>
                </article>
              </li>
            </ul>
          )}
        </div>

        <footer className="dossier-footer shrink-0 z-30 border-t border-black/10 bg-[#FFFFFF] px-4 sm:px-6 md:px-10 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              SELECTED PACKAGE:
            </span>
            <span className="font-display text-lg font-black text-[#080808]">
              {activeFlight.code} · {activeFlight.name} ({activePriceDisplay})
            </span>
            <span className="hidden md:inline font-mono text-[10px] uppercase tracking-wider text-neutral-500">
              70% Athlete (A${athleteNet70.toLocaleString()}) · 15% Club ({displayClub}) · 15% Ops · Direct Handle Sponsorship
            </span>
          </div>

          <div className="flex items-center gap-3">
            {drawerMode === 'audit' ? (
              <button
                type="button"
                onClick={() => setDrawerMode('buy')}
                className="rounded-full border-0 bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] px-7 py-3 font-mono text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors shadow-md"
              >
                VIEW COMMERCIAL PACKAGES · FROM A${entryPrice.toLocaleString()} →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => triggerCheckout(activeFlight.tier_id)}
                className="rounded-full border-0 bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] px-7 py-3 font-mono text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors shadow-md"
              >
                {`LOCK ${activeFlight.code} · ${activePriceDisplay} →`}
              </button>
            )}
          </div>
        </footer>
      </div>

      <StripeEscrowCheckoutModal
        payload={stripePayload}
        onClose={() => setStripePayload(null)}
      />
    </div>,
    document.body,
  );
};

export default AthleteDossierDrawer;