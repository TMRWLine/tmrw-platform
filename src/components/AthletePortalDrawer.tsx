import React, { useEffect, useId, useRef, useState } from 'react';
import './AthletePortalDrawer.css';
import { BrandLockup } from './BrandLockup';
import { dispatchOpenCapsuleDrawer } from './CartDrawer';
import { ROSTER_DATA, suburbForPostcode } from '../data/roster';
import type { LiveAthleteOverride } from './AthleteDossierDrawer';
import {
  getActiveAthleteSession,
  maskBsbAndAccount,
  requestAthleteOtp,
  signOutAthleteSession,
  syncAthleteProfileToBackend,
  uploadAthleteAsset,
  verifyAthleteOtpCode,
  type VerifiedSession,
} from '../lib/athleteAuthAndSync';

export type PortalLeague =
  | 'NBL1'
  | 'SHUTE SHIELD'
  | 'VFL'
  | 'A-LEAGUE'
  | 'SUPER RUGBY'
  | 'WNBL'
  | 'NRLW / NSW CUP'
  | 'ATHLETICS AUS';
export type PortalMode = 'authenticate' | 'claim';
export type WizardStep = 1 | 2 | 3 | 4 | 5;

interface PortalSubmission {
  mode: PortalMode;
  identifier: string;
  league: PortalLeague | null;
  postcode: string | null;
}

interface AthletePortalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCapsuleStudio: () => void;
  onContinue: (submission: PortalSubmission) => void;
  onTestBypass?: (sandboxAthlete: unknown) => void;
}

const LEAGUES: ReadonlyArray<PortalLeague> = [
  'NBL1',
  'SHUTE SHIELD',
  'VFL',
  'A-LEAGUE',
  'SUPER RUGBY',
  'WNBL',
  'NRLW / NSW CUP',
  'ATHLETICS AUS',
];

const SPORT_DIRECTORY: ReadonlyArray<{
  sport: string;
  league: string;
  governingBody: string;
  clearanceDoc: string;
  regPrefix: string;
  defaultPosition: string;
  clubSuffix: string;
}> = [
  {
    sport: 'Basketball',
    league: 'NBL1 East · First Grade',
    governingBody: 'Basketball Australia / NBL1 Integrity Unit',
    clearanceDoc: 'BA_NBL1_TPA_Clearance_Certificate_2026.pdf',
    regPrefix: 'BA-NBL1',
    defaultPosition: 'Basketball · First-Grade Starter',
    clubSuffix: 'Basketball Association',
  },
  {
    sport: 'Rugby Union',
    league: 'Shute Shield · First Grade',
    governingBody: 'Rugby Australia / Shute Shield Integrity Directorate',
    clearanceDoc: 'RA_Shute_Shield_TPA_Clearance_2026.pdf',
    regPrefix: 'RA-SS',
    defaultPosition: 'Starting XV · First-Grade Contender',
    clubSuffix: 'RUFC Juniors',
  },
  {
    sport: 'Australian Rules',
    league: 'VFL / AFL State League',
    governingBody: 'AFL / VFL Integrity & TPA Unit',
    clearanceDoc: 'AFL_VFL_Standard_TPA_Deed_2026.pdf',
    regPrefix: 'AFL-VFL',
    defaultPosition: 'Midfield Rotation · First-Grade Contender',
    clubSuffix: 'Junior Football Club',
  },
  {
    sport: 'Football (Soccer)',
    league: 'A-League / NPL First Grade',
    governingBody: 'Football Australia / PFA Commercial Clearance',
    clearanceDoc: 'FA_NPL_Commercial_Clearance_2026.pdf',
    regPrefix: 'FA-NPL',
    defaultPosition: 'Starting XI · Attacking Midfielder',
    clubSuffix: 'United FC Juniors',
  },
  {
    sport: 'Rugby League',
    league: 'NSW Cup / QLD Cup / NRLW',
    governingBody: 'NRL / RLPA Third-Party Agreement Registrar',
    clearanceDoc: 'NRL_RLPA_Arm_Length_TPA_Certificate_2026.pdf',
    regPrefix: 'NRL-TPA',
    defaultPosition: 'First-Grade Squad · Outside Back',
    clubSuffix: 'Junior Rugby League',
  },
  {
    sport: 'Athletics / Track & Field',
    league: 'Athletics Australia · LA 2028 / Brisbane 2032 Runway',
    governingBody: 'Athletics Australia / AOC Commercial Rule 40',
    clearanceDoc: 'AOC_Rule40_Sovereign_NIL_Clearance_2026.pdf',
    regPrefix: 'AA-OLY',
    defaultPosition: 'National Podium Seed · Track & Field',
    clubSuffix: 'Athletics Club',
  },
  {
    sport: 'Surfing / Boardriding',
    league: 'WSL Qualifying Series',
    governingBody: 'Surfing Australia / WSL Integrity Unit',
    clearanceDoc: 'SA_WSL_Boardriders_Clearance_2026.pdf',
    regPrefix: 'WSL-QS',
    defaultPosition: 'QS Contender · Open Division',
    clubSuffix: 'Boardriders Club',
  },
];

const POSTCODE_CLUB_OVERRIDES: Record<string, Record<string, string>> = {
  '2200': {
    Basketball: 'Bankstown Bruins',
    'Rugby Union': 'Bankstown Bulldogs RUFC Juniors',
    'Rugby League': 'Bankstown Sports Giants JRLFC',
  },
  '2026': {
    Basketball: 'Sydney Comets (Eastern Suburbs)',
    'Rugby Union': 'Eastern Suburbs Beasts Juniors (Waverley)',
    'Surfing / Boardriding': 'Bondi Boardriders Club',
  },
  '2034': {
    'Rugby Union': 'Randwick Magic Juniors (Coogee)',
    Basketball: 'Sydney Comets Juniors',
  },
  '2095': {
    'Rugby Union': 'Manly Roos Junior Rugby',
    Basketball: 'Manly Warringah Sea Eagles Basketball',
    'Surfing / Boardriding': 'Queenscliff Boardriders Club',
  },
};

const MODE_TABS: ReadonlyArray<{ mode: PortalMode; label: string }> = [
  { mode: 'authenticate', label: 'SIGN IN' },
  { mode: 'claim', label: 'CLAIM PROFILE' },
];

const ALL_SECTORS = [
  'Apparel',
  'Footwear',
  'Sports Nutrition',
  'Automotive',
  'Banking',
  'Telco',
  'Beverage',
  'QSR',
  'Airlines',
  'Insurance',
  'Recovery & Gym',
  'Luxury & Retail',
] as const;

const FIELD_LABEL =
  'athlete-portal-field-label font-mono text-[9.5px] tracking-[0.18em] text-neutral-500 uppercase block mb-1.5 font-bold';
const FIELD_SHELL =
  'bg-[#EAEAE6] border border-black/10 rounded-xl px-4 py-3 text-sm font-mono text-[#0F0F11] placeholder-neutral-400 outline-none focus-within:border-[#0F0F11] transition-colors w-full flex items-center';
const FIELD_INPUT =
  'bg-transparent text-base sm:text-sm font-mono font-bold text-[#0F0F11] placeholder-neutral-400 outline-none w-full select-text border-0 p-0';
const WIZARD_INPUT =
  'w-full rounded-xl bg-[#F2F2F0] border border-black/10 px-3.5 py-2.5 font-sans text-base sm:text-xs font-semibold text-[#080808] placeholder-neutral-400 focus:bg-white focus:border-[#080808] outline-none transition-colors';

const LIT_OBSIDIAN_BTN =
  'bg-[#0F0F11] text-white font-mono font-bold text-xs py-4 px-7 rounded-xl border border-black/15 transition-all uppercase tracking-wider text-center cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-2px_0_rgba(0,0,0,0.8),0_10px_25px_rgba(0,0,0,0.25),0_0_15px_rgba(204,255,0,0.18)] hover:bg-[#080808] hover:border-[#CCFF00] hover:text-[#CCFF00] active:translate-y-[1px]';

const PROTOCOL_ROWS: ReadonlyArray<{ label: string; value: string }> = [
  { label: 'Identity & Auth', value: 'SMS OTP & League ID Verified' },
  { label: 'Clearing Split', value: '70% Athlete · 15% Club · 15% Ops' },
  { label: 'Media Pipeline', value: '4-Plate Carousel & 9:16 Reel Ready' },
];

export const AthletePortalDrawer: React.FC<AthletePortalDrawerProps> = ({
  isOpen,
  onClose,
  onOpenCapsuleStudio,
}) => {
  const dialogRef = useRef<HTMLElement>(null);
  const baseId = useId();
  const identifierId = `${baseId}-identifier`;
  const leagueId = `${baseId}-league`;
  const postcodeId = `${baseId}-postcode`;
  const panelId = `${baseId}-panel`;

  const [drawerView, setDrawerView] = useState<'entry' | 'wizard'>('entry');
  const [wizardMode, setWizardMode] = useState<'edit_existing' | 'new_signup'>('edit_existing');
  const [step, setStep] = useState<WizardStep>(1);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('marcus-thorne');

  // Auth & OTP Verification State
  const [mode, setMode] = useState<PortalMode>('authenticate');
  const [identifier, setIdentifier] = useState('+61 400 892 104');
  const [league, setLeague] = useState<PortalLeague>('NBL1');
  const [postcode, setPostcode] = useState('2200');
  const [otpChallengeSent, setOtpChallengeSent] = useState(false);
  const [otpCode, setOtpCode] = useState('202632');
  const [authSession, setAuthSession] = useState<VerifiedSession | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Pillar 1: Commercial Overview & Sovereign Identity
  const [fullName, setFullName] = useState('Marcus Thorne');
  const [competitionRegId, setCompetitionRegId] = useState('BA-NBL1-2026-88412');
  const [clearanceBadge, setClearanceBadge] = useState<'open_clearance' | 'syndicate_locked'>('open_clearance');
  const [sport, setSport] = useState('Basketball');
  const [leagueDetail, setLeagueDetail] = useState('NBL1 East');
  const [governingBody, setGoverningBody] = useState('Basketball Australia / NBL1');
  const [suburb, setSuburb] = useState('Bankstown');
  const [secondaryPostcode, setSecondaryPostcode] = useState('2026');
  const [vitalsPosition, setVitalsPosition] = useState('Basketball · First-Grade Starter');
  const [vitalsPhysical, setVitalsPhysical] = useState('193 cm (6\'4") · 88 kg · Age 21');
  const [vitalsStats, setVitalsStats] = useState('19.4 PPG · 6.2 AST · 42% 3PT');
  const [kitSizing, setKitSizing] = useState('TOP: L/XL · SHORT: L · US 12');
  const [availabilityWindows, setAvailabilityWindows] = useState('TUE & THU (2PM–5PM) · SUN AM');
  const [pullQuote, setPullQuote] = useState(
    '"Every 5 AM session in Bankstown is built around taking Bankstown Bruins to the national stage and earning a spot on the LA 2028 runway."',
  );
  const [bio, setBio] = useState(
    'Marcus Thorne is a verified first-grade contender in NBL1 East, developed through Bankstown Bruins in Postcode 2200 (Bankstown). Pre-cleared for local precinct contra, state-wide category lockouts, and direct handle paid social amplification.',
  );
  const [accolade1, setAccolade1] = useState('NBL1 East All-State First Team (2025/26)');
  const [accolade2, setAccolade2] = useState('LA 2028 & Brisbane 2032 National Shortlist');

  // Pillar 6 & 7: 70/15/15 Escrow Settlement & Spatial Catchment
  const [juniorClub, setJuniorClub] = useState('Bankstown Bruins');
  const [clubAbn, setClubAbn] = useState('44 192 847 102');
  const [clubCadence, setClubCadence] = useState<'quarterly_batch' | 'immediate_t0'>('quarterly_batch');
  const [payoutBsbAccount, setPayoutBsbAccount] = useState('062-••• · •••• 8821');
  const [stripeExpressLinked, setStripeExpressLinked] = useState(true);
  const [abnStatus, setAbnStatus] = useState<'abn_gst' | 'supplier_statement'>('abn_gst');
  const [athleteAbn] = useState('83 910 442 190');

  // Pillar 8 & Attachment 1: 4-Plate Photo Carousel, Watch Reel Video & Social Attribution
  const [slide1Studio, setSlide1Studio] = useState('/portraits/marcus_thorne.jpg');
  const [slide2Action, setSlide2Action] = useState('/portraits/marcus_thorne.jpg');
  const [slide3Precinct, setSlide3Precinct] = useState('/portraits/marcus_thorne.jpg');
  const [slide4Training, setSlide4Training] = useState('/portraits/marcus_thorne.jpg');
  const [reelVideoUrl, setReelVideoUrl] = useState('https://assets.tmrw.sport/reels/marcus_thorne_916_reel.mp4');
  const [socialReelImportInput, setSocialReelImportInput] = useState('');
  const [highlightStemFile, setHighlightStemFile] = useState('916_Highlight_Stem_4K.mp4');
  const [monogramSvgFile] = useState('Athlete_Monogram_Shield.svg');
  const [instagramHandle, setInstagramHandle] = useState('@m.thorne');
  const [tiktokHandle, setTiktokHandle] = useState('@marcusthorne_hoops');
  const [followerCount, setFollowerCount] = useState<number>(14200);
  const [engagementRate, setEngagementRate] = useState('6.8%');
  const [localConcentration, setLocalConcentration] = useState('68% IN POSTCODE 2200');

  // Pillar 2 & 3: 48-Sector Conflict Matrix, Governing Body TPA & Document Upload Vault
  const [lockedCategories, setLockedCategories] = useState<string[]>([]);
  const [under18Guardian, setUnder18Guardian] = useState(false);
  const [guardianName, setGuardianName] = useState('David Thorne (Verified Legal Guardian)');
  const [clearanceDocName, setClearanceDocName] = useState('BA_NBL1_TPA_Clearance_Certificate_2026.pdf');

  // Pillar 4, 5 & 9: TwelveLabs AI Video Studio, Sovereign AI Copilot & Proof-of-Performance Ledger
  const [semanticQuery, setSemanticQuery] = useState('fast break · corner jump shot · transition dunk');
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiClips, setAiClips] = useState([
    { time: '00:14', label: 'FAST BREAK', title: 'Coast-to-Coast Transition Finish (9:16 Cut)', exposure: '4.2s Jersey Logo', views: '48.2K Est.' },
    { time: '01:08', label: 'CORNER JUMP SHOT', title: 'Q4 Baseline Dagger 3PT (4K Clean Stem)', exposure: '3.8s Court Signage', views: '31.5K Est.' },
  ]);
  const [copilotPrompt, setCopilotPrompt] = useState(
    'Auto-approve local precinct proposals >= A$750 in Postcode 2200; flag national category lockouts for manual review.',
  );
  const [proofLogs, setProofLogs] = useState([
    { id: 'POP-2200-01', obligation: '1x In-Venue Session + Counter QR Plaque', status: 'GEO-TAG & CV VERIFIED' },
    { id: 'POP-2200-02', obligation: '2x AI-Cut 9:16 Reels (@m.thorne)', status: 'PERMALINK & LOGO AUDITED' },
  ]);

  const [savingSync, setSavingSync] = useState(false);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const isClaim = mode === 'claim';

  // Intelligent Sport, Postcode, Grassroots Club & TPA Compliance Auto-Matcher
  const applySmartSportAndPostcodeMatch = (nextSport: string, nextPostcode: string) => {
    const cleanPcode = nextPostcode.replace(/\D/g, '').slice(0, 4);
    setSport(nextSport);
    setPostcode(cleanPcode);

    const matchedProfile =
      SPORT_DIRECTORY.find(
        (item) =>
          item.sport.toLowerCase() === nextSport.toLowerCase() ||
          nextSport.toLowerCase().includes(item.sport.toLowerCase().split(' ')[0]),
      ) ?? SPORT_DIRECTORY[0];

    setLeagueDetail(matchedProfile.league);
    setGoverningBody(matchedProfile.governingBody);
    setClearanceDocName(matchedProfile.clearanceDoc);
    setVitalsPosition(matchedProfile.defaultPosition);

    if (cleanPcode.length === 4) {
      const resolvedSuburb = suburbForPostcode(cleanPcode);
      setSuburb(resolvedSuburb);
      setLocalConcentration(`72% IN POSTCODE ${cleanPcode}`);
      const specificClub =
        POSTCODE_CLUB_OVERRIDES[cleanPcode]?.[matchedProfile.sport] ??
        `${resolvedSuburb} ${matchedProfile.clubSuffix}`;
      setJuniorClub(specificClub);
      setCompetitionRegId(`${matchedProfile.regPrefix}-2026-${cleanPcode}9`);
    }
  };

  const handleMediaFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void,
    bucket: 'athlete-media' | 'compliance-vault' = 'athlete-media',
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadAthleteAsset(file, bucket, selectedAthleteId);
    if (url) setter(url);
  };

  const handleOneClickSocialReelImport = () => {
    const cleanUrl = socialReelImportInput.trim();
    if (!cleanUrl) return;
    setReelVideoUrl(cleanUrl);
    setHighlightStemFile(`Social_Reel_916_${Date.now().toString().slice(-4)}.mp4`);
    setSocialReelImportInput('');
    setSavedBanner(
      '✓ EXISTING SOCIAL REEL LINKED: 9:16 VERTICAL STREAM & AI ENGINE UPDATED.',
    );
  };

  useEffect(() => {
    if (!isOpen) return;
    const existingSession = getActiveAthleteSession();
    setAuthSession(existingSession);
    setOtpChallengeSent(false);
    setDrawerView('entry');
    setSavedBanner(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || drawerView !== 'wizard') return;
    setSavedBanner(null);

    if (wizardMode === 'new_signup') {
      const pCode = postcode || '2026';
      const initialSport =
        league === 'SHUTE SHIELD' || league === 'SUPER RUGBY'
          ? 'Rugby Union'
          : league === 'VFL'
          ? 'Australian Rules'
          : league === 'A-LEAGUE'
          ? 'Football (Soccer)'
          : league === 'NRLW / NSW CUP'
          ? 'Rugby League'
          : league === 'ATHLETICS AUS'
          ? 'Athletics / Track & Field'
          : 'Basketball';

      setFullName('Xavier Koro');
      applySmartSportAndPostcodeMatch(initialSport, pCode);
      setSecondaryPostcode('2034');
      setVitalsPhysical('189 cm (6\'2") · 96 kg · Age 20');
      setVitalsStats('14 Tries · 92% Tackle Completion');
      setKitSizing('TOP: XL · SHORT: XL · US 12.5');
      setAvailabilityWindows('WED & FRI (1PM–5PM) · SUN AM');
      setInstagramHandle('@xavier.koro');
      setTiktokHandle('@xkoro_official');
      setFollowerCount(64000);
      setEngagementRate('8.4%');
      setPullQuote(
        `"Growing up in ${suburbForPostcode(pCode)}, every session is built around taking our local juniors to the national stage and the 2028 runway."`,
      );
      setBio(
        `Explosive ${league} first-grade contender developed in Postcode ${pCode}. Pre-cleared for local precinct contra, 15km district locks, and Meta/TikTok handle amplification.`,
      );
      setLockedCategories([]);
      setUnder18Guardian(false);
      return;
    }

    const rosterEntry =
      ROSTER_DATA.find((r) => r.id === selectedAthleteId) ?? ROSTER_DATA[0];
    const rec = rosterEntry.record;

    let existingOverride: LiveAthleteOverride | null = null;
    try {
      const raw = localStorage.getItem(`tmrw_override_${rosterEntry.id}`);
      if (raw) existingOverride = JSON.parse(raw) as LiveAthleteOverride;
    } catch {
      existingOverride = null;
    }

    const pCode = existingOverride?.postcode || rec.postcode || '2200';
    setFullName(existingOverride?.full_name || rec.full_name);
    setSport(existingOverride?.sport || rec.sport);
    setLeagueDetail(existingOverride?.league || rec.league);
    setGoverningBody(
      existingOverride?.governing_body || rec.governing_body?.name || 'Basketball NSW / NBL1',
    );
    setPostcode(pCode);
    setSuburb(existingOverride?.suburb || suburbForPostcode(pCode));
    setSecondaryPostcode(existingOverride?.secondary_postcode || '2026');
    setJuniorClub(existingOverride?.junior_club || rec.current_club);
    setInstagramHandle(existingOverride?.instagram_handle || rec.social.instagram_handle);
    setTiktokHandle(existingOverride?.tiktok_handle || '@verified_contender');
    setFollowerCount(existingOverride?.follower_count ?? rec.social.follower_count ?? 14200);
    setEngagementRate(existingOverride?.engagement_rate || rec.social.engagement_rate || '6.8%');
    setLocalConcentration(
      existingOverride?.local_concentration || `68% IN POSTCODE ${pCode}`,
    );
    setVitalsPosition(existingOverride?.vitals_position || `${rec.sport} · First-Grade Starter`);
    setVitalsPhysical(existingOverride?.vitals_physical || '193 cm (6\'4") · 88 kg · Age 21');
    setVitalsStats(existingOverride?.vitals_stats || '19.4 PPG · 6.2 AST · 42% 3PT');
    setKitSizing(existingOverride?.kit_sizing || 'TOP: L/XL · SHORT: L · US 12');
    setAvailabilityWindows(
      existingOverride?.availability_windows || 'TUE & THU (2PM–5PM) · SUN AM',
    );
    setPullQuote(
      existingOverride?.pull_quote ||
        `"Every 5 AM session in ${suburbForPostcode(pCode)} is built around taking ${rec.current_club} to the national stage and earning a spot on the LA 2028 runway."`,
    );
    setBio(
      existingOverride?.bio ||
        rec.bio ||
        `${rec.full_name} is a verified first-grade contender in ${rec.league}, developed through ${rec.current_club} in Postcode ${pCode} (${suburbForPostcode(pCode)}).`,
    );
    setSlide1Studio(
      existingOverride?.portrait_image ||
        existingOverride?.gallery_slides?.[0]?.url ||
        rec.image ||
        '/portraits/marcus_thorne.jpg',
    );
    if (existingOverride?.gallery_slides?.[1]?.url) setSlide2Action(existingOverride.gallery_slides[1].url);
    if (existingOverride?.gallery_slides?.[2]?.url) setSlide3Precinct(existingOverride.gallery_slides[2].url);
    if (existingOverride?.gallery_slides?.[3]?.url) setSlide4Training(existingOverride.gallery_slides[3].url);
    setReelVideoUrl(
      existingOverride?.reel_video_url ||
        'https://assets.tmrw.sport/reels/marcus_thorne_916_reel.mp4',
    );
    setLockedCategories(existingOverride?.locked_categories ?? rec.branding_categories.locked);
    setUnder18Guardian(existingOverride?.under_18_guardian ?? false);
    setGuardianName(existingOverride?.guardian_name || 'Verified Legal Guardian');
    setPayoutBsbAccount(
      maskBsbAndAccount(existingOverride?.payout_bsb_account || '062-140 1094 8821'),
    );
    if (existingOverride?.ai_clips) setAiClips(existingOverride.ai_clips);
    if (existingOverride?.proof_logs) setProofLogs(existingOverride.proof_logs);
  }, [isOpen, drawerView, wizardMode, selectedAthleteId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !window.matchMedia('(max-width: 1023px)').matches) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement;
    const bodyOverflow = document.body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    dialog.focus({ preventScroll: true });

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
      )).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first || !last) {
        event.preventDefault();
        return;
      }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener('keydown', trapFocus);
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = rootOverflow;
      dialog.removeEventListener('keydown', trapFocus);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && window.matchMedia('(max-width: 1023px)').matches) {
      dialogRef.current?.scrollTo({ top: 0 });
      dialogRef.current?.focus({ preventScroll: true });
    }
  }, [isOpen, drawerView, step]);

  if (!isOpen) return null;

  const isPodiumSeed = followerCount >= 150000 || leagueDetail.toLowerCase().includes('olympic');
  const isNationalSeed =
    !isPodiumSeed && (followerCount >= 50000 || leagueDetail.toLowerCase().includes('national'));
  const seedMultiplier = isPodiumSeed ? 4.0 : isNationalSeed ? 2.0 : 1.0;

  const pkg01Gross = Math.round(750 * seedMultiplier);
  const pkg01Athlete70 = Math.round(pkg01Gross * 0.7);
  const pkg01Club15 = (pkg01Gross * 0.15).toFixed(2);

  const handleTriggerOtpOrVerify = async () => {
    setAuthLoading(true);
    if (!otpChallengeSent) {
      await requestAthleteOtp(identifier);
      setOtpChallengeSent(true);
      setAuthLoading(false);
      return;
    }

    const verified = await verifyAthleteOtpCode(identifier, otpCode);
    setAuthLoading(false);
    if (verified) {
      setAuthSession(verified);
      setWizardMode(isClaim ? 'new_signup' : 'edit_existing');
      setStep(1);
      setDrawerView('wizard');
    }
  };

  const toggleSectorLock = (sector: string) => {
    setLockedCategories((prev) =>
      prev.includes(sector) ? prev.filter((s) => s !== sector) : [...prev, sector],
    );
  };

  const runTwelveLabsCut = () => {
    setAiProcessing(true);
    setTimeout(() => {
      setAiClips((prev) => [
        {
          time: '02:41',
          label: semanticQuery.split('·')[0]?.trim().toUpperCase() || 'AI HIGHLIGHT',
          title: `AI Auto-Cut (${fullName})`,
          exposure: '5.1s Jersey & Court Exposure (A$1,420 Media Eq.)',
          views: '62.4K Est.',
        },
        ...prev,
      ]);
      setAiProcessing(false);
    }, 650);
  };

  const handleSaveAndBroadcast = async () => {
    setSavingSync(true);
    const targetId = wizardMode === 'new_signup' ? 'marcus-thorne' : selectedAthleteId;

    const overridePayload: LiveAthleteOverride = {
      full_name: fullName.trim(),
      sport: sport.trim(),
      league: leagueDetail.trim(),
      governing_body: governingBody.trim(),
      postcode: postcode.trim(),
      suburb: suburb.trim(),
      secondary_postcode: secondaryPostcode.trim(),
      under_18_guardian: under18Guardian,
      guardian_name: guardianName.trim(),
      junior_club: juniorClub.trim(),
      payout_bsb_account: maskBsbAndAccount(payoutBsbAccount),
      abn_status:
        abnStatus === 'abn_gst'
          ? `ABN ${athleteAbn} (GST Registered)`
          : 'Statement by a Supplier (Amateur)',
      instagram_handle: instagramHandle.trim(),
      tiktok_handle: tiktokHandle.trim(),
      follower_count: followerCount,
      engagement_rate: engagementRate.trim(),
      local_concentration: localConcentration.trim(),
      availability_windows: availabilityWindows.trim(),
      locked_categories: lockedCategories,
      open_categories: ALL_SECTORS.filter((s) => !lockedCategories.includes(s)),
      mou_signed: true,
      bio: bio.trim(),
      pull_quote: pullQuote.trim(),
      vitals_position: vitalsPosition.trim(),
      vitals_physical: vitalsPhysical.trim(),
      vitals_stats: vitalsStats.trim(),
      kit_sizing: kitSizing.trim(),
      accolades: [
        accolade1.trim(),
        accolade2.trim(),
        `Head Junior Clinic Coach · ${juniorClub.trim()}`,
        `${governingBody.trim()} Integrity & TPA Cleared (${competitionRegId})`,
      ],
      portrait_image: slide1Studio.trim(),
      gallery_slides: [
        { label: '01 Studio', url: slide1Studio.trim() },
        { label: '02 Action', url: slide2Action.trim() },
        { label: '03 Precinct', url: slide3Precinct.trim() },
        { label: '04 Training', url: slide4Training.trim() },
      ],
      reel_video_url: reelVideoUrl.trim(),
      highlight_stem_file: highlightStemFile.trim(),
      monogram_svg_file: monogramSvgFile.trim(),
      ai_clips: aiClips,
      proof_logs: proofLogs,
      last_updated_at: Date.now(),
    };

    const result = await syncAthleteProfileToBackend(targetId, overridePayload);
    setSavingSync(false);

    setSavedBanner(
      `✓ SYNCED (${result.syncedToCloud ? 'SUPABASE CLOUD + LOCAL CACHE' : 'LOCAL CACHE · DEED ' + result.masterDeedHash}): ${fullName.toUpperCase()} IS LIVE ACROSS ROSTER, DOSSIER & ESCROW.`,
    );
  };

  const handleResetToDefault = () => {
    try {
      localStorage.removeItem(`tmrw_override_${selectedAthleteId}`);
      window.dispatchEvent(new Event('tmrw:athlete-updated'));
      setWizardMode('edit_existing');
      setSavedBanner('✓ RESTORED DEFAULT SEED TELEMETRY FOR SELECTED CONTENDER.');
    } catch {
      // ignore
    }
  };

  return (
    <div
      data-lenis-prevent="true"
      onWheel={(e) => e.stopPropagation()}
      className="athlete-portal fixed inset-0 z-[105] selection:bg-[#CCFF00] selection:text-[#0F0F11]"
    >
      <button
        type="button"
        aria-label="Close athlete portal"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-fadeIn border-0 p-0 cursor-default"
      />

      <aside
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Athlete portal"
        data-lenis-prevent="true"
        onWheel={(e) => e.stopPropagation()}
        className={`absolute top-0 right-0 h-dvh w-full ${
          drawerView === 'wizard' ? 'max-w-[1040px]' : 'max-w-[500px]'
        } bg-[#FFFFFF] border-l border-black/10 z-10 flex flex-col justify-between shadow-2xl transition-all duration-500 select-none overflow-hidden`}
      >
        {drawerView === 'entry' && (
          <div
            data-lenis-prevent="true"
            onWheel={(e) => e.stopPropagation()}
            className="athlete-portal-entry flex-1 overflow-y-auto p-6 sm:p-8 md:p-10 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between border-b border-black/10 pb-5">
                <BrandLockup onClick={onClose} />
                <button
                  type="button"
                  onClick={onClose}
                  title="Close [ESC]"
                  aria-label="Close portal"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#0F0F11] hover:bg-white text-white hover:text-[#0F0F11] border border-transparent hover:border-black/25 px-5 py-1.5 font-sans text-xs font-bold tracking-tight shadow-sm transition-all duration-300 cursor-pointer group"
                >
                  <span>Close</span>
                  <span className="text-[11px] text-[#CCFF00] group-hover:text-[#0F0F11] transition-colors">
                    ✕
                  </span>
                </button>
              </div>

              <div
                role="tablist"
                aria-label="Portal access mode"
                className="grid grid-cols-2 p-1 bg-[#EAEAE6] rounded-full my-6 border border-black/10"
              >
                {MODE_TABS.map((tab) => {
                  const active = tab.mode === mode;
                  return (
                    <button
                      key={tab.mode}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        setMode(tab.mode);
                        setOtpChallengeSent(false);
                      }}
                      className={`py-2.5 text-[10px] font-mono font-bold tracking-[0.18em] uppercase rounded-full transition-all duration-200 cursor-pointer border-0 ${
                        active
                          ? 'bg-[#0F0F11] text-[#CCFF00] shadow-sm'
                          : 'bg-transparent text-neutral-600 hover:text-[#0F0F11]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="mb-6 rounded-[24px] bg-[#0F0F11] text-white p-6 sm:p-7 space-y-4 shadow-xl">
                <h2 className="m-0 font-sans font-black text-3xl sm:text-4xl uppercase tracking-[-0.03em] text-white leading-[1.02]">
                  Your career<span className="text-[#CCFF00]">.</span>
                  <br />
                  Your terms<span className="text-[#CCFF00]">.</span>
                </h2>
                <p className="m-0 font-sans text-xs text-neutral-300 leading-relaxed">
                  Zero agency commissions. Lock your postcode, back your junior club with a hardwired{' '}
                  <span className="bg-[#CCFF00] text-[#0F0F11] font-bold px-1.5 py-0.5 rounded-[3px]">
                    70/15/15 split
                  </span>
                  , and access your AI Highlight Cutter.
                </p>
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWizardMode('new_signup');
                      setStep(1);
                      setDrawerView('wizard');
                    }}
                    className="w-full rounded-full bg-[#CCFF00] hover:bg-white text-[#0F0F11] font-mono text-[10px] font-bold uppercase tracking-widest py-3 border-0 cursor-pointer transition-colors shadow-sm"
                  >
                    Bypass → Open 5-Tab Athlete Studio
                  </button>
                </div>
              </div>

              <div role="tabpanel" id={panelId} className="w-full space-y-4 mb-6">
                <div className="w-full">
                  <label htmlFor={identifierId} className={FIELD_LABEL}>
                    Verified Mobile Number or League Registration ID
                  </label>
                  <div className={FIELD_SHELL}>
                    <input
                      id={identifierId}
                      type="tel"
                      inputMode="tel"
                      maxLength={16}
                      placeholder="+61 400 892 104"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className={FIELD_INPUT}
                    />
                  </div>
                </div>

                {isClaim && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor={leagueId} className={FIELD_LABEL}>
                        Televised League
                      </label>
                      <div className={FIELD_SHELL}>
                        <select
                          id={leagueId}
                          value={league}
                          onChange={(e) => setLeague(e.target.value as PortalLeague)}
                          className={`${FIELD_INPUT} cursor-pointer`}
                        >
                          {LEAGUES.map((l) => (
                            <option key={l} value={l}>
                              {l}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor={postcodeId} className={FIELD_LABEL}>
                        Home Postcode
                      </label>
                      <div className={FIELD_SHELL}>
                        <input
                          id={postcodeId}
                          type="text"
                          maxLength={4}
                          value={postcode}
                          onChange={(e) => setPostcode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          className={FIELD_INPUT}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {otpChallengeSent && (
                  <div className="rounded-2xl border-2 border-[#0F0F11] bg-[#F2F2F0] p-4 space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between font-mono text-[9.5px] uppercase">
                      <span className="font-bold text-[#0F0F11]">
                        ● 6-DIGIT SMS SECURITY CODE DISPATCHED
                      </span>
                      <span className="bg-[#CCFF00] text-[#080808] px-2 py-0.5 rounded font-bold">
                        DEMO CODE: 202632
                      </span>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      aria-label="Six-digit security code"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit OTP"
                      className="w-full rounded-xl bg-white border border-black/15 px-4 py-2.5 font-mono text-base font-bold tracking-[0.3em] text-center text-[#080808]"
                    />
                  </div>
                )}
              </div>

              <div className="mb-6 rounded-2xl bg-[#EAEAE6] border border-black/10 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9.5px] font-bold uppercase tracking-widest text-neutral-600">
                    ATHLETE COMMERCE STUDIO
                  </span>
                  <span className="rounded-full bg-[#0F0F11] text-[#CCFF00] px-2 py-0.5 font-mono text-[9px] font-bold">
                    ZERO-INVENTORY
                  </span>
                </div>
                <h4 className="m-0 font-sans text-sm font-black uppercase text-[#0F0F11]">
                  Publish Co-Branded Streetwear
                </h4>
                <p className="m-0 font-sans text-xs text-neutral-600 leading-relaxed">
                  Launch a 72-hour pre-order capsule. 70% net revenue goes to you, 15% to your junior club.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCapsuleStudio();
                    dispatchOpenCapsuleDrawer({
                      initialView: 'creator',
                      athleteName: fullName || 'Marcus Thorne',
                      clubName: juniorClub || 'Bankstown Bruins',
                      postcode: postcode || '2200',
                    });
                  }}
                  className="w-full rounded-full bg-[#0F0F11] hover:bg-[#CCFF00] text-white hover:text-[#0F0F11] font-mono text-[10px] font-bold uppercase tracking-widest py-3 transition-colors cursor-pointer border-0 shadow-xs"
                >
                  + Launch Merch Capsule Studio →
                </button>
              </div>

              <div className="border-t border-b border-black/10 py-4 space-y-2.5 mb-6">
                {PROTOCOL_ROWS.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-4 font-mono text-[10px]">
                    <span className="text-neutral-500 uppercase tracking-wider">{row.label}</span>
                    <span className="text-[#0F0F11] font-bold text-right">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <button
                type="button"
                disabled={authLoading}
                onClick={handleTriggerOtpOrVerify}
                className="w-full rounded-full bg-[#0F0F11] hover:bg-[#CCFF00] text-white hover:text-[#0F0F11] font-mono font-bold text-xs uppercase tracking-widest py-4 transition-colors duration-200 cursor-pointer shadow-md border-0 disabled:opacity-50"
              >
                {authLoading
                  ? 'Verifying Sovereign Token...'
                  : otpChallengeSent
                  ? 'Verify 6-Digit OTP & Unlock Terminal →'
                  : isClaim
                  ? 'Send SMS OTP & Claim Profile →'
                  : 'Send SMS OTP to Open Terminal →'}
              </button>
            </div>
          </div>
        )}

        {drawerView === 'wizard' && (
          <>
            <header className="athlete-portal-header shrink-0 border-b border-black/10 bg-[#FFFFFF] px-5 py-4 sm:px-8 sm:py-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setDrawerView('entry')}
                    className="athlete-portal-back rounded-full bg-[#F2F2F0] hover:bg-[#080808] text-[#080808] hover:text-white px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase border-0 cursor-pointer transition-colors"
                  >
                    ← Back
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9.5px] font-bold uppercase tracking-widest text-neutral-500">
                        SOVEREIGN COMMAND CENTRE
                      </span>
                      {authSession && (
                        <span className="rounded-full bg-[#CCFF00] text-[#080808] px-2 py-0.5 font-mono text-[8.5px] font-bold uppercase">
                          ● RLS SESSION VERIFIED ({authSession.stripeExpressId})
                        </span>
                      )}
                    </div>
                    <h2 className="m-0 font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#080808]">
                      {fullName}
                      <span className="text-[#CCFF00]">.</span>{' '}
                      <span className="font-sans text-xs font-bold text-neutral-500 normal-case">
                        Postcode {postcode} ({suburb}) · 15% Club: {juniorClub}
                      </span>
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {authSession && (
                    <button
                      type="button"
                      onClick={async () => {
                        await signOutAthleteSession();
                        setAuthSession(null);
                        setDrawerView('entry');
                      }}
                      className="rounded-full bg-[#F2F2F0] hover:bg-[#080808] text-[#080808] hover:text-white px-3 py-1.5 font-mono text-[9.5px] font-bold uppercase border-0 cursor-pointer"
                    >
                      Sign Out
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    className="rounded-full bg-[#F2F2F0] hover:bg-[#080808] text-[#080808] hover:text-white px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase border-0 cursor-pointer transition-colors"
                  >
                    Reset Default
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] px-4 py-1.5 font-sans text-xs font-bold border-0 cursor-pointer transition-colors"
                  >
                    Close ✕
                  </button>
                </div>
              </div>

              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-black/10">
                <div className="inline-flex rounded-xl bg-[#F2F2F0] p-1 border border-black/10">
                  <button
                    type="button"
                    onClick={() => setWizardMode('edit_existing')}
                    className={`rounded-lg px-3 py-1 font-sans text-xs font-bold cursor-pointer border-0 transition-colors ${
                      wizardMode === 'edit_existing'
                        ? 'bg-[#080808] text-[#CCFF00]'
                        : 'bg-transparent text-neutral-600'
                    }`}
                  >
                    Edit Existing Contender
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardMode('new_signup')}
                    className={`rounded-lg px-3 py-1 font-sans text-xs font-bold cursor-pointer border-0 transition-colors ${
                      wizardMode === 'new_signup'
                        ? 'bg-[#080808] text-[#CCFF00]'
                        : 'bg-transparent text-neutral-600'
                    }`}
                  >
                    + New Contender Signup
                  </button>
                </div>

                {wizardMode === 'edit_existing' && (
                  <select
                    aria-label="Contender to edit"
                    value={selectedAthleteId}
                    onChange={(e) => setSelectedAthleteId(e.target.value)}
                    className="rounded-xl bg-[#F2F2F0] border border-black/15 px-3 py-1.5 font-sans text-xs font-bold text-[#080808] outline-none"
                  >
                    {ROSTER_DATA.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name} ({entry.record.sport} · Postcode {entry.record.postcode})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 5 Distinct Tabs with Clean Athlete-Centric Headings */}
              <div aria-label="Profile sections" className="athlete-portal-sections mt-3 flex overflow-x-auto sm:grid sm:grid-cols-5 gap-1.5 pb-1">
                {(
                  [
                    [1, '01. Identity & Vitals'],
                    [2, '02. 70/15/15 & Turf'],
                    [3, '03. Photos & 9:16 Reel'],
                    [4, '04. TPA & Doc Vault'],
                    [5, '05. AI Cutter & Deal Rules'],
                  ] as const
                ).map(([idx, label]) => (
                  <button
                    key={idx}
                    type="button"
                    aria-pressed={step === idx}
                    onClick={() => setStep(idx)}
                    className={`shrink-0 rounded-xl border px-3 py-2 text-left cursor-pointer transition-all ${
                      step === idx
                        ? 'border-[#080808] bg-[#080808] text-[#CCFF00]'
                        : 'border-black/10 bg-[#F2F2F0] text-[#080808]'
                    }`}
                  >
                    <span className="block font-sans text-[11px] font-bold whitespace-nowrap truncate">
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </header>

            <div
              data-lenis-prevent="true"
              onWheel={(e) => e.stopPropagation()}
              className="athlete-portal-content flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-5 sm:px-8 space-y-4 bg-[#FFFFFF]"
            >
              {savedBanner && (
                <div className="rounded-2xl bg-[#080808] text-[#CCFF00] p-4 font-mono text-xs font-bold flex items-center justify-between gap-4">
                  <span>{savedBanner}</span>
                  <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 rounded-full bg-[#CCFF00] text-[#080808] px-4 py-1.5 font-mono text-[10px] font-bold uppercase border-0 cursor-pointer"
                  >
                    Inspect on Roster →
                  </button>
                </div>
              )}

              {/* TAB 01: IDENTITY & VITALS */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-[#080808] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px]">
                    <span>
                      <strong className="text-[#CCFF00]">● AUTO-MATCH ENGINE ACTIVE:</strong> Type any Sport or Postcode to auto-populate your League, Junior Club, Governing Body & TPA Deed.
                    </span>
                    <span className="text-neutral-400">
                      {governingBody}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className={FIELD_LABEL}>Contender Legal Full Name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={WIZARD_INPUT}
                      />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>Official League Registration ID (No Proxy)</label>
                      <input
                        type="text"
                        value={competitionRegId}
                        onChange={(e) => setCompetitionRegId(e.target.value)}
                        className={WIZARD_INPUT}
                      />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>Contractual Clearance Status</label>
                      <select
                        value={clearanceBadge}
                        onChange={(e) =>
                          setClearanceBadge(e.target.value as 'open_clearance' | 'syndicate_locked')
                        }
                        className={WIZARD_INPUT}
                      >
                        <option value="open_clearance">✓ Unencumbered Open Clearance</option>
                        <option value="syndicate_locked">● Active Syndicate Locked</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className={FIELD_LABEL}>Sport Discipline (Type Any or Select)</label>
                      <input
                        type="text"
                        list={`${baseId}-sports-list`}
                        value={sport}
                        onChange={(e) => applySmartSportAndPostcodeMatch(e.target.value, postcode)}
                        className={WIZARD_INPUT}
                      />
                      <datalist id={`${baseId}-sports-list`}>
                        {SPORT_DIRECTORY.map((s) => (
                          <option key={s.sport} value={s.sport} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>League (Auto-Matched or Custom)</label>
                      <input
                        type="text"
                        value={leagueDetail}
                        onChange={(e) => setLeagueDetail(e.target.value)}
                        className={WIZARD_INPUT}
                      />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>Position & Grade (Card 01)</label>
                      <input
                        type="text"
                        value={vitalsPosition}
                        onChange={(e) => setVitalsPosition(e.target.value)}
                        className={WIZARD_INPUT}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className={FIELD_LABEL}>Physical Vitals (Height · Weight · Age)</label>
                      <input
                        type="text"
                        value={vitalsPhysical}
                        onChange={(e) => setVitalsPhysical(e.target.value)}
                        className={WIZARD_INPUT}
                      />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>Season Telemetry Stats</label>
                      <input
                        type="text"
                        value={vitalsStats}
                        onChange={(e) => setVitalsStats(e.target.value)}
                        className={WIZARD_INPUT}
                      />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>Product Seeding Sizes (Top / Short / Shoe)</label>
                      <input
                        type="text"
                        value={kitSizing}
                        onChange={(e) => setKitSizing(e.target.value)}
                        className={WIZARD_INPUT}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className={FIELD_LABEL}>Clinic Availability Windows</label>
                      <input
                        type="text"
                        value={availabilityWindows}
                        onChange={(e) => setAvailabilityWindows(e.target.value)}
                        className={WIZARD_INPUT}
                      />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>Verified Honour 01</label>
                      <input
                        type="text"
                        value={accolade1}
                        onChange={(e) => setAccolade1(e.target.value)}
                        className={WIZARD_INPUT}
                      />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>Verified Honour 02</label>
                      <input
                        type="text"
                        value={accolade2}
                        onChange={(e) => setAccolade2(e.target.value)}
                        className={WIZARD_INPUT}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={FIELD_LABEL}>Editorial Pull Quote (Dossier Masthead)</label>
                    <input
                      type="text"
                      value={pullQuote}
                      onChange={(e) => setPullQuote(e.target.value)}
                      className={WIZARD_INPUT}
                    />
                  </div>
                </div>
              )}

              {/* TAB 02: 70/15/15 & TURF */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-[#080808] text-white p-5 space-y-3">
                    <div className="flex items-center justify-between font-mono text-[10px] uppercase">
                      <span className="text-[#CCFF00] font-bold">
                        LIVE 70 / 15 / 15 STRIPE CONNECT ROUTING (PKG 01: A${pkg01Gross})
                      </span>
                      <span className="text-neutral-400">7000 / 1500 / 1500 BPS</span>
                    </div>
                    <div className="athlete-portal-split grid grid-cols-3 gap-3 font-mono text-xs">
                      <div className="rounded-xl bg-white/[0.06] p-3">
                        <span className="block text-[9px] text-neutral-400">70% ATHLETE</span>
                        <strong className="text-lg text-white">A${pkg01Athlete70}</strong>
                        <span className="block text-[9px] text-[#CCFF00] mt-0.5">
                          {maskBsbAndAccount(payoutBsbAccount)}
                        </span>
                      </div>
                      <div className="rounded-xl bg-white/[0.06] p-3">
                        <span className="block text-[9px] text-neutral-400">15% JUNIOR CLUB</span>
                        <strong className="text-lg text-[#CCFF00]">A${pkg01Club15}</strong>
                        <span className="block text-[9px] text-neutral-300 mt-0.5 truncate">
                          {juniorClub}
                        </span>
                      </div>
                      <div className="rounded-xl bg-white/[0.06] p-3">
                        <span className="block text-[9px] text-neutral-400">15% TMRW/. OPS</span>
                        <strong className="text-lg text-white">A${pkg01Club15}</strong>
                        <span className="block text-[9px] text-neutral-400 mt-0.5">Retained T+0</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className={FIELD_LABEL}>Primary Postcode (Auto-Matches Suburb & Club)</label>
                      <input
                        type="text"
                        maxLength={4}
                        value={postcode}
                        onChange={(e) => applySmartSportAndPostcodeMatch(sport, e.target.value)}
                        className={WIZARD_INPUT}
                      />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>Residential / Training Suburb</label>
                      <input
                        type="text"
                        value={suburb}
                        onChange={(e) => setSuburb(e.target.value)}
                        className={WIZARD_INPUT}
                      />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>Dual-Catchment Secondary Postcode (50km)</label>
                      <input
                        type="text"
                        maxLength={4}
                        value={secondaryPostcode}
                        onChange={(e) =>
                          setSecondaryPostcode(e.target.value.replace(/\D/g, '').slice(0, 4))
                        }
                        className={WIZARD_INPUT}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={FIELD_LABEL}>Origin Grassroots Junior Club (Receives 15%)</label>
                      <input
                        type="text"
                        value={juniorClub}
                        onChange={(e) => setJuniorClub(e.target.value)}
                        className={WIZARD_INPUT}
                      />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>Junior Club ABN (For Consolidated Quarterly RCTI)</label>
                      <input
                        type="text"
                        value={clubAbn}
                        onChange={(e) => setClubAbn(e.target.value)}
                        className={WIZARD_INPUT}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-[#F2F2F0] p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="font-mono text-[9px] uppercase text-neutral-500 block">
                        STRIPE CONNECT EXPRESS PAYOUT RAIL (ZERO RAW BANK PII STORED)
                      </span>
                      <strong className="font-sans text-xs text-[#080808]">
                        {stripeExpressLinked
                          ? `✓ KYC & Bank Verified (${maskBsbAndAccount(payoutBsbAccount)})`
                          : 'Connect BSB & Account via Stripe Express OAuth'}
                      </strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStripeExpressLinked(true)}
                      className="rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] px-4 py-1.5 font-mono text-[10px] font-bold uppercase border-0 cursor-pointer transition-colors"
                    >
                      {stripeExpressLinked ? '✓ STRIPE EXPRESS LINKED' : 'LAUNCH STRIPE ONBOARDING →'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={FIELD_LABEL}>ATO / IRD RCTI Tax Status</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setAbnStatus('abn_gst')}
                          className={`rounded-xl border py-2.5 px-3 font-sans text-xs font-bold cursor-pointer ${
                            abnStatus === 'abn_gst'
                              ? 'border-[#080808] bg-[#080808] text-[#CCFF00]'
                              : 'border-black/10 bg-[#F2F2F0] text-neutral-600'
                          }`}
                        >
                          ABN Registered (Pro)
                        </button>
                        <button
                          type="button"
                          onClick={() => setAbnStatus('supplier_statement')}
                          className={`rounded-xl border py-2.5 px-3 font-sans text-xs font-bold cursor-pointer ${
                            abnStatus === 'supplier_statement'
                              ? 'border-[#080808] bg-[#080808] text-[#CCFF00]'
                              : 'border-black/10 bg-[#F2F2F0] text-neutral-600'
                          }`}
                        >
                          Statement by Supplier
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>15% Club Payout Schedule</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setClubCadence('quarterly_batch')}
                          className={`rounded-xl border py-2.5 px-3 font-sans text-xs font-bold cursor-pointer ${
                            clubCadence === 'quarterly_batch'
                              ? 'border-[#080808] bg-[#080808] text-[#CCFF00]'
                              : 'border-black/10 bg-[#F2F2F0] text-neutral-600'
                          }`}
                        >
                          Quarterly Batch Sweep
                        </button>
                        <button
                          type="button"
                          onClick={() => setClubCadence('immediate_t0')}
                          className={`rounded-xl border py-2.5 px-3 font-sans text-xs font-bold cursor-pointer ${
                            clubCadence === 'immediate_t0'
                              ? 'border-[#080808] bg-[#080808] text-[#CCFF00]'
                              : 'border-black/10 bg-[#F2F2F0] text-neutral-600'
                          }`}
                        >
                          Immediate T+0
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 03: PHOTOS & DIRECT VIDEO UPLOAD / SOCIAL SYNC */}
              {step === 3 && (
                <div className="space-y-4">
                  {/* Zero-Upload Existing Social Reel Importer */}
                  <div className="rounded-2xl bg-[#080808] text-white p-5 space-y-3 shadow-md">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-mono text-[9.5px] font-bold uppercase text-[#080808] bg-[#CCFF00] px-2.5 py-0.5 rounded">
                          ZERO-UPLOAD SOCIAL REEL SYNC
                        </span>
                        <h3 className="m-0 mt-1.5 font-sans text-sm font-black text-white">
                          Paste an Existing Instagram Reel, TikTok or YouTube Shorts Link
                        </h3>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="url"
                        value={socialReelImportInput}
                        onChange={(e) => setSocialReelImportInput(e.target.value)}
                        placeholder="https://www.instagram.com/reel/... or https://www.tiktok.com/@..."
                        className="flex-1 rounded-xl bg-white/10 border border-white/15 px-3.5 py-2.5 font-mono text-xs text-white placeholder-neutral-400 outline-none focus:border-[#CCFF00]"
                      />
                      <button
                        type="button"
                        onClick={handleOneClickSocialReelImport}
                        className="shrink-0 rounded-xl bg-[#CCFF00] hover:bg-white text-[#080808] px-5 py-2.5 font-mono text-[10px] font-bold uppercase border-0 cursor-pointer transition-colors"
                      >
                        Sync Existing Reel →
                      </button>
                    </div>
                  </div>

                  {/* 4-Plate Photo Carousel & Direct Video Uploads */}
                  <div className="rounded-2xl border-2 border-[#080808] bg-[#F2F2F0] p-5 space-y-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-mono text-[9.5px] font-bold uppercase text-[#080808] bg-[#CCFF00] px-2.5 py-1 rounded">
                          PLAYER CARD & DOSSIER MEDIA
                        </span>
                        <h3 className="m-0 mt-1.5 font-sans text-base font-black text-[#080808]">
                          4-Plate Profile Photography & 9:16 Highlight Reel
                        </h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-mono text-[9.5px] tracking-[0.18em] text-neutral-500 uppercase font-bold">
                            01 Studio Plate (Primary Card)
                          </label>
                          <label className="rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase cursor-pointer">
                            ↑ Upload
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleMediaFileUpload(e, setSlide1Studio, 'athlete-media')}
                              className="athlete-portal-file-input"
                            />
                          </label>
                        </div>
                        <input
                          type="text"
                          value={slide1Studio}
                          onChange={(e) => setSlide1Studio(e.target.value)}
                          className={WIZARD_INPUT}
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-mono text-[9.5px] tracking-[0.18em] text-neutral-500 uppercase font-bold">
                            02 Action Plate (Slide 2/4)
                          </label>
                          <label className="rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase cursor-pointer">
                            ↑ Upload
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleMediaFileUpload(e, setSlide2Action, 'athlete-media')}
                              className="athlete-portal-file-input"
                            />
                          </label>
                        </div>
                        <input
                          type="text"
                          value={slide2Action}
                          onChange={(e) => setSlide2Action(e.target.value)}
                          className={WIZARD_INPUT}
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-mono text-[9.5px] tracking-[0.18em] text-neutral-500 uppercase font-bold">
                            03 Precinct Plate (Slide 3/4)
                          </label>
                          <label className="rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase cursor-pointer">
                            ↑ Upload
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleMediaFileUpload(e, setSlide3Precinct, 'athlete-media')}
                              className="athlete-portal-file-input"
                            />
                          </label>
                        </div>
                        <input
                          type="text"
                          value={slide3Precinct}
                          onChange={(e) => setSlide3Precinct(e.target.value)}
                          className={WIZARD_INPUT}
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-mono text-[9.5px] tracking-[0.18em] text-neutral-500 uppercase font-bold">
                            04 Training Plate (Slide 4/4)
                          </label>
                          <label className="rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase cursor-pointer">
                            ↑ Upload
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleMediaFileUpload(e, setSlide4Training, 'athlete-media')}
                              className="athlete-portal-file-input"
                            />
                          </label>
                        </div>
                        <input
                          type="text"
                          value={slide4Training}
                          onChange={(e) => setSlide4Training(e.target.value)}
                          className={WIZARD_INPUT}
                        />
                      </div>
                    </div>

                    {/* Direct Video Upload Row with MP4 / MOV Uploader */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-black/10">
                      <div className="sm:col-span-2">
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-mono text-[9.5px] tracking-[0.18em] text-neutral-500 uppercase font-bold">
                            9:16 Vertical Highlight Reel (MP4 Upload or Link)
                          </label>
                          <label className="rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase cursor-pointer">
                            ↑ Upload MP4 / MOV
                            <input
                              type="file"
                              accept="video/mp4,video/quicktime,video/*"
                              onChange={(e) => handleMediaFileUpload(e, setReelVideoUrl, 'athlete-media')}
                              className="athlete-portal-file-input"
                            />
                          </label>
                        </div>
                        <input
                          type="text"
                          value={reelVideoUrl}
                          onChange={(e) => setReelVideoUrl(e.target.value)}
                          placeholder="https://assets.tmrw.sport/reels/..."
                          className={WIZARD_INPUT}
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-mono text-[9.5px] tracking-[0.18em] text-neutral-500 uppercase font-bold">
                            Clean Broadcast Stem
                          </label>
                          <label className="rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase cursor-pointer">
                            ↑ Upload Stem
                            <input
                              type="file"
                              accept="video/mp4,video/quicktime,video/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) setHighlightStemFile(file.name);
                              }}
                              className="athlete-portal-file-input"
                            />
                          </label>
                        </div>
                        <input
                          type="text"
                          value={highlightStemFile}
                          onChange={(e) => setHighlightStemFile(e.target.value)}
                          className={WIZARD_INPUT}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className={FIELD_LABEL}>Instagram Handle (Meta OAuth)</label>
                      <input
                        type="text"
                        value={instagramHandle}
                        onChange={(e) => setInstagramHandle(e.target.value)}
                        className={WIZARD_INPUT}
                      />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>TikTok Handle (Spark OAuth)</label>
                      <input
                        type="text"
                        value={tiktokHandle}
                        onChange={(e) => setTiktokHandle(e.target.value)}
                        className={WIZARD_INPUT}
                      />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>Bot-Filtered Follower Count</label>
                      <input
                        type="number"
                        value={followerCount}
                        onChange={(e) => setFollowerCount(Number(e.target.value) || 0)}
                        className={WIZARD_INPUT}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className={FIELD_LABEL}>Verified Engagement Rate (Card 03)</label>
                      <input
                        type="text"
                        value={engagementRate}
                        onChange={(e) => setEngagementRate(e.target.value)}
                        className={WIZARD_INPUT}
                      />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>Suburban Audience Concentration (Card 03)</label>
                      <input
                        type="text"
                        value={localConcentration}
                        onChange={(e) => setLocalConcentration(e.target.value)}
                        className={WIZARD_INPUT}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 04: TPA & DOC VAULT */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className={FIELD_LABEL}>Auto-Matched Governing Body Alignment (Card 04)</label>
                      <input
                        type="text"
                        value={governingBody}
                        onChange={(e) => setGoverningBody(e.target.value)}
                        className={WIZARD_INPUT}
                      />
                    </div>
                    <div>
                      <label className={FIELD_LABEL}>
                        Auto-Matched Regional TPA Deed (`compliance-vault`)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={clearanceDocName}
                          onChange={(e) => setClearanceDocName(e.target.value)}
                          className={WIZARD_INPUT}
                        />
                        <label className="shrink-0 rounded-xl bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] px-3.5 py-2.5 font-mono text-[10px] font-bold uppercase cursor-pointer">
                          ↑ Upload PDF
                          <input
                            type="file"
                            onChange={(e) =>
                              handleMediaFileUpload(e, setClearanceDocName, 'compliance-vault')
                            }
                            className="athlete-portal-file-input"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={FIELD_LABEL}>
                      48-Sector Conflict Matrix (Hard Exclusions Enforced: No Betting, Vaping, Alcohol)
                    </label>
                    <div className="athlete-portal-sectors grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {ALL_SECTORS.map((sec) => {
                        const isLocked = lockedCategories.includes(sec);
                        return (
                          <button
                            key={sec}
                            type="button"
                            aria-pressed={isLocked}
                            onClick={() => toggleSectorLock(sec)}
                            className={`rounded-xl border p-2.5 text-left cursor-pointer transition-all ${
                              isLocked
                                ? 'border-[#080808] bg-[#080808] text-white'
                                : 'border-black/10 bg-[#F2F2F0] text-[#080808]'
                            }`}
                          >
                            <div className="flex items-center justify-between font-mono text-[9px]">
                              <span className={isLocked ? 'text-[#CCFF00]' : 'text-neutral-500'}>
                                {isLocked ? 'LOCKED' : 'OPEN'}
                              </span>
                              <span>{isLocked ? '✕' : '✓'}</span>
                            </div>
                            <div className="font-sans text-xs font-bold mt-1">{sec}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-[#F2F2F0] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-[9.5px] uppercase text-neutral-500 block">
                          UNDER-18 DUAL-KEY GUARDIAN CO-SIGNATURE
                        </span>
                        <strong className="font-sans text-xs text-[#080808]">
                          Require Legal Guardian Co-Signature on All Deals & Escrow Releases
                        </strong>
                      </div>
                      <button
                        type="button"
                        aria-pressed={under18Guardian}
                        onClick={() => setUnder18Guardian(!under18Guardian)}
                        className={`rounded-full px-4 py-1.5 font-mono text-[10px] font-bold uppercase border-0 cursor-pointer ${
                          under18Guardian
                            ? 'bg-[#CCFF00] text-[#080808]'
                            : 'bg-white text-neutral-600 border border-black/15'
                        }`}
                      >
                        {under18Guardian ? '✓ GUARDIAN CO-SIGN ACTIVE' : '18+ SOVEREIGN ADULT'}
                      </button>
                    </div>

                    {under18Guardian && (
                      <div>
                        <label className={FIELD_LABEL}>Verified Legal Guardian Full Name</label>
                        <input
                          type="text"
                          value={guardianName}
                          onChange={(e) => setGuardianName(e.target.value)}
                          className={WIZARD_INPUT}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 05: AI HIGHLIGHT CUTTER & DEAL RULES (CLEAN HEADINGS) */}
              {step === 5 && (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-[#080808] text-white p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-mono text-[9.5px] uppercase text-[#CCFF00] font-bold block">
                          AI MATCH FOOTAGE CUTTER · AUTO 9:16 REELS
                        </span>
                        <h4 className="m-0 font-sans text-sm font-bold text-white">
                          Type any play or skill to auto-cut vertical clips from match footage
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={runTwelveLabsCut}
                        className="rounded-full bg-[#CCFF00] hover:bg-white text-[#080808] px-4 py-1.5 font-mono text-[10px] font-bold uppercase border-0 cursor-pointer transition-colors"
                      >
                        {aiProcessing ? 'INDEXING MATCH FOOTAGE...' : '+ GENERATE 9:16 AI STEM →'}
                      </button>
                    </div>

                    <div>
                      <label className="font-mono text-[9px] uppercase text-neutral-400 block mb-1">
                        SEMANTIC NATURAL LANGUAGE VIDEO SEARCH PROMPTS
                      </label>
                      <input
                        type="text"
                        value={semanticQuery}
                        onChange={(e) => setSemanticQuery(e.target.value)}
                        className="w-full rounded-xl bg-white/10 border border-white/15 px-3.5 py-2 font-mono text-xs text-white outline-none focus:border-[#CCFF00]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {aiClips.map((clip, idx) => (
                        <div
                          key={`${clip.time}-${idx}`}
                          className="rounded-xl bg-white/[0.06] border border-white/10 p-3 font-mono text-[10px] space-y-1"
                        >
                          <div className="flex items-center justify-between text-[#CCFF00]">
                            <span>[{clip.time}] {clip.label}</span>
                            <span>{clip.views}</span>
                          </div>
                          <div className="font-sans text-xs font-bold text-white">{clip.title}</div>
                          <div className="text-neutral-400">CV Audit: {clip.exposure}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-[#F2F2F0] p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9.5px] uppercase text-[#080808]">
                        AUTOMATED DEAL RULES · MINIMUM FEE & TURF GUARDRAILS
                      </span>
                      <span className="rounded-full bg-[#CCFF00] text-[#080808] px-2.5 py-0.5 font-mono text-[9px] font-bold">
                        ● AGENT ONLINE
                      </span>
                    </div>
                    <input
                      type="text"
                      value={copilotPrompt}
                      onChange={(e) => setCopilotPrompt(e.target.value)}
                      className={WIZARD_INPUT}
                    />
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-[#F2F2F0] p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9.5px] uppercase text-[#080808]">
                        DELIVERABLE TRACKER · INSTANT ESCROW RELEASE
                      </span>
                      <span className="font-mono text-[9px] text-neutral-500">
                        AUTO-TRIGGERS T+0 ESCROW RELEASE
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {proofLogs.map((log) => (
                        <div
                          key={log.id}
                          className="rounded-xl bg-white border border-black/10 px-3.5 py-2 flex items-center justify-between font-mono text-[10px]"
                        >
                          <span>
                            <strong>{log.id}:</strong> {log.obligation}
                          </span>
                          <span className="bg-[#CCFF00] text-[#080808] px-2 py-0.5 rounded font-bold">
                            ✓ {log.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <footer className="athlete-portal-actions shrink-0 border-t border-black/10 bg-[#FFFFFF] px-5 py-4 sm:px-8 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep((s) => (s - 1) as WizardStep)}
                    className="rounded-xl border border-black/15 bg-white hover:bg-[#F2F2F0] text-[#080808] px-4 py-3 font-mono text-xs font-bold uppercase cursor-pointer"
                  >
                    ← Prev
                  </button>
                )}
                {step < 5 && (
                  <button
                    type="button"
                    onClick={() => setStep((s) => (s + 1) as WizardStep)}
                    className="rounded-xl border border-black/15 bg-[#F2F2F0] hover:bg-[#080808] text-[#080808] hover:text-white px-5 py-3 font-mono text-xs font-bold uppercase cursor-pointer transition-colors"
                  >
                    Next Tab (0{step + 1}) →
                  </button>
                )}
              </div>

              <button
                type="button"
                disabled={savingSync}
                onClick={handleSaveAndBroadcast}
                className={`flex-1 sm:flex-initial ${LIT_OBSIDIAN_BTN} disabled:opacity-50`}
              >
                {savingSync
                  ? 'SYNCING TO SUPABASE & LOCAL LEDGER...'
                  : 'SAVE & BROADCAST ALL 9 PILLARS TO ROSTER & ESCROW →'}
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
};

export default AthletePortalDrawer;