import React, { useRef, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { LiveAthleteOverride } from './AthleteDossierDrawer';

interface AthleteAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  athleteId?: string;
}

type StudioStage =
  | 'auth'
  | 'step1_profile'
  | 'step2_club'
  | 'step3_oauth'
  | 'step4_ai_media'
  | 'step5_console';

const ALL_SECTORS = [
  'Apparel',
  'Footwear',
  'Sports Nutrition',
  'Automotive',
  'QSR & Cafes',
  'Gym & Recovery',
  'Telecommunications',
  'Banking & Fintech',
];

export const AthleteAuthModal: React.FC<AthleteAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  athleteId = 'marcus_thorne',
}) => {
  const [stage, setStage] = useState<StudioStage>('auth');
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [fullName, setFullName] = useState('Marcus Thorne');
  const [sport, setSport] = useState('Basketball');
  const [league, setLeague] = useState('NBL1 East');
  const [postcode, setPostcode] = useState('2200');
  const [suburb, setSuburb] = useState('Bankstown');
  const [secondaryPostcode, setSecondaryPostcode] = useState('2026');
  const [under18, setUnder18] = useState(false);
  const [guardianName, setGuardianName] = useState('Verified Legal Guardian');
  const [bio, setBio] = useState(
    'Marcus Thorne is a verified first-grade contender in NBL1 East, developed through Bankstown Bruins in Postcode 2200 (Bankstown). Pre-cleared for local precinct contra, state-wide category lockouts, and direct handle paid social amplification.'
  );
  const [pullQuote, setPullQuote] = useState(
    '"Every 5 AM session in Bankstown is built around taking Bankstown Bruins to the national stage and earning a spot on the LA 2028 runway."'
  );
  const [position, setPosition] = useState('Point Guard · First-Grade Starter');
  const [physical, setPhysical] = useState("193 cm (6'4\") · 88 kg · Age 21");
  const [stats, setStats] = useState('19.4 PPG · 6.2 AST · 42% 3PT');
  const [kitSizing, setKitSizing] = useState('Top: L/XL · Short: L · US 12');

  const [juniorClub, setJuniorClub] = useState('Bankstown Bruins Basketball Association');
  const [bsb, setBsb] = useState('062-000 · 4829 1048');
  const [abnStatus, setAbnStatus] = useState('ABN 48 129 401 992 · GST & RCTI Registered');

  const [igHandle, setIgHandle] = useState('@m.thorne');
  const [ttHandle, setTtHandle] = useState('@marcusthorne.hoops');
  const [igConnected, setIgConnected] = useState(true);
  const [ttConnected, setTtConnected] = useState(true);
  const [availability, setAvailability] = useState('Tue & Thu (2pm–5pm) · Sun AM');
  const [lockedCategories, setLockedCategories] = useState<string[]>(['Automotive']);

  const [aiStudioTab, setAiStudioTab] = useState<'generator' | 'semantic'>('generator');
  const [generatingReels, setGeneratingReels] = useState(false);
  const [semanticPrompt, setSemanticPrompt] = useState('fast break');
  const [aiClips, setAiClips] = useState<
    { time: string; label: string; title: string; exposure: string; views: string }[]
  >([
    {
      time: '01:14',
      label: 'Fast Break',
      title: 'Fast break transition & above-the-rim finish',
      exposure: '4.2s Jersey Logo Exposure',
      views: '42.8K Local Views',
    },
    {
      time: '04:38',
      label: 'Clutch 3PT',
      title: 'Clutch 4th-quarter corner three & sideline roar',
      exposure: '3.8s Court & Chest Signage',
      views: '31.4K Local Views',
    },
    {
      time: '09:12',
      label: '5AM Block',
      title: '5 AM strength & conditioning block in local precinct',
      exposure: '6.1s Training Kit Placement',
      views: '28.9K Local Views',
    },
  ]);

  const [avatarName, setAvatarName] = useState<string>('marcus_thorne_portrait.jpg');
  const [clearanceDoc, setClearanceDoc] = useState<string>('NBL1_Player_Registration_2026.pdf');
  const [proofLogs, setProofLogs] = useState<{ id: string; obligation: string; status: string }[]>([
    { id: 'POP-01', obligation: 'Precinct Appearance (Geo-Tagged 2200)', status: 'CV VERIFIED · T+0 PAID' },
    { id: 'POP-02', obligation: '9:16 Highlight Reel Sponsor Watermark', status: 'WATERMARK CONFIRMED' },
  ]);
  const [incomingProposals, setIncomingProposals] = useState<
    { id: string; brandName: string; sector: string; postcode: string; timestamp: string }[]
  >([]);
  const [loading, setLoading] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    try {
      const existing = localStorage.getItem(`tmrw_override_${athleteId}`);
      if (existing) {
        const parsed = JSON.parse(existing) as LiveAthleteOverride;
        if (parsed.full_name) setFullName(parsed.full_name);
        if (parsed.sport) setSport(parsed.sport);
        if (parsed.league) setLeague(parsed.league);
        if (parsed.postcode) setPostcode(parsed.postcode);
        if (parsed.suburb) setSuburb(parsed.suburb);
        if (parsed.secondary_postcode) setSecondaryPostcode(parsed.secondary_postcode);
        if (parsed.junior_club) setJuniorClub(parsed.junior_club);
        if (parsed.instagram_handle) setIgHandle(parsed.instagram_handle);
        if (parsed.tiktok_handle) setTtHandle(parsed.tiktok_handle);
        if (parsed.bio) setBio(parsed.bio);
        if (parsed.pull_quote) setPullQuote(parsed.pull_quote);
        if (parsed.vitals_position) setPosition(parsed.vitals_position);
        if (parsed.vitals_physical) setPhysical(parsed.vitals_physical);
        if (parsed.vitals_stats) setStats(parsed.vitals_stats);
        if (parsed.kit_sizing) setKitSizing(parsed.kit_sizing);
        if (parsed.availability_windows) setAvailability(parsed.availability_windows);
        if (parsed.under_18_guardian !== undefined) setUnder18(parsed.under_18_guardian);
        if (parsed.guardian_name) setGuardianName(parsed.guardian_name);
        if (parsed.locked_categories) setLockedCategories(parsed.locked_categories);
        if (parsed.ai_clips?.length) setAiClips(parsed.ai_clips);
      }
      const propsRaw = localStorage.getItem('tmrw_prequalified_proposals');
      if (propsRaw) {
        setIncomingProposals(JSON.parse(propsRaw));
      }
    } catch {
      // ignore
    }
  }, [isOpen, athleteId]);

  const saveToLocalStorage = (customClips = aiClips) => {
    const payload: LiveAthleteOverride = {
      full_name: fullName,
      sport,
      league,
      postcode,
      suburb,
      secondary_postcode: secondaryPostcode,
      junior_club: juniorClub,
      payout_bsb_account: bsb,
      abn_status: abnStatus,
      instagram_handle: igHandle,
      tiktok_handle: ttHandle,
      bio,
      pull_quote: pullQuote,
      vitals_position: position,
      vitals_physical: physical,
      vitals_stats: stats,
      kit_sizing: kitSizing,
      availability_windows: availability,
      under_18_guardian: under18,
      guardian_name: guardianName,
      locked_categories: lockedCategories,
      mou_signed: true,
      ai_clips: customClips,
      proof_logs: proofLogs,
    };
    localStorage.setItem(`tmrw_override_${athleteId}`, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('tmrw:athlete-updated'));
  };

  if (!isOpen) return null;

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        await supabase.auth.signUp({
          email,
          password,
          options: { data: { role: 'athlete', full_name: fullName } },
        });
      } else {
        await supabase.auth.signInWithPassword({ email, password });
      }
    } catch {
      // Sandbox fallback
    } finally {
      setLoading(false);
      setStage('step1_profile');
    }
  };

  const handleGenerateAiReels = () => {
    setGeneratingReels(true);
    setTimeout(() => {
      const generated = [
        {
          time: '00:42',
          label: 'AI Cut 01',
          title: `TwelveLabs 9:16 Cut · ${sport} Transition & Finish`,
          exposure: '5.4s Jersey Logo Lock (99.1% CV)',
          views: '54.2K Projected Reach',
        },
        ...aiClips,
      ];
      setAiClips(generated);
      saveToLocalStorage(generated);
      setGeneratingReels(false);
    }, 600);
  };

  const handleSemanticSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!semanticPrompt.trim()) return;
    const matched = [
      {
        time: '02:19',
        label: semanticPrompt.slice(0, 10),
        title: `Semantic Match: "${semanticPrompt.trim()}"`,
        exposure: '4.9s Broadcast Signage Lock',
        views: '38.4K Local Views',
      },
      ...aiClips,
    ];
    setAiClips(matched);
    saveToLocalStorage(matched);
  };

  const toggleCategoryLock = (sector: string) => {
    setLockedCategories((prev) =>
      prev.includes(sector) ? prev.filter((s) => s !== sector) : [...prev, sector],
    );
  };

  const handleCompleteAndReturn = () => {
    saveToLocalStorage();
    onSuccess();
    onClose();
  };

  return (
    <div
      data-lenis-prevent="true"
      onClick={onClose}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-6 selection:bg-[#CCFF00] selection:text-[#080808] animate-fadeIn"
    >
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setAvatarName(f.name);
        }}
        className="hidden"
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,image/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setClearanceDoc(f.name);
        }}
        className="hidden"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            const next = [
              {
                time: '00:15',
                label: 'Uploaded',
                title: `Raw Match Stem: ${f.name}`,
                exposure: '6.2s Sponsor Frame Verified',
                views: 'Ready for Meta/TikTok Boost',
              },
              ...aiClips,
            ];
            setAiClips(next);
            saveToLocalStorage(next);
          }
        }}
        className="hidden"
      />
      <input
        ref={proofInputRef}
        type="file"
        accept="image/*,video/*,.pdf"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            setProofLogs((prev) => [
              {
                id: `POP-0${prev.length + 1}`,
                obligation: `Geo-Tagged Deliverable: ${f.name} (Postcode ${postcode})`,
                status: 'CV VERIFIED · T+0 RELEASED',
              },
              ...prev,
            ]);
          }
        }}
        className="hidden"
      />

      <div
        data-lenis-prevent="true"
        onWheel={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[1320px] max-h-[92dvh] rounded-[28px] bg-[#F7F7F6] text-[#080808] shadow-[0_35px_100px_rgba(0,0,0,0.55)] border border-black/10 flex flex-col overflow-hidden"
      >
        <header className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-6 sm:px-10 py-4 bg-[#080808] text-white">
          <div className="flex items-center gap-3">
            <span className="font-sans text-xl font-black tracking-tight text-white">
              tmrw<span className="text-[#CCFF00]">/.</span>
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#CCFF00] font-bold">
              ATHLETE ONBOARDING, AI MEDIA STUDIO & COMPLIANCE CONSOLE
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStage('step1_profile')}
              className={`rounded-full px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider cursor-pointer border-0 transition-colors ${
                stage !== 'auth' && stage !== 'step4_ai_media' && stage !== 'step5_console'
                  ? 'bg-[#CCFF00] text-[#080808]'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              1. Profile & Vitals
            </button>
            <button
              type="button"
              onClick={() => setStage('step4_ai_media')}
              className={`rounded-full px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider cursor-pointer border-0 transition-colors ${
                stage === 'step4_ai_media'
                  ? 'bg-[#CCFF00] text-[#080808]'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              2. AI Media Studio (TwelveLabs)
            </button>
            <button
              type="button"
              onClick={() => setStage('step5_console')}
              className={`rounded-full px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider cursor-pointer border-0 transition-colors ${
                stage === 'step5_console'
                  ? 'bg-[#CCFF00] text-[#080808]'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              3. Live Athlete Console
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close [ESC]"
              aria-label="Close modal"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#080808] hover:bg-white text-white hover:text-[#080808] border border-white/20 px-5 py-1.5 font-sans text-xs font-bold tracking-tight transition-all cursor-pointer group"
            >
              <span>Close</span>
              <span className="text-[11px] text-[#CCFF00] group-hover:text-[#080808]">✕</span>
            </button>
          </div>
        </header>

        {stage !== 'auth' && (
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-6 sm:px-10 py-3 bg-[#EAEAE6] border-b border-black/10">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'step1_profile' as const, label: '01 Identity, Guardian & Vitals' },
                { id: 'step2_club' as const, label: '02 70/15/15 Split & RCTI Tax' },
                { id: 'step3_oauth' as const, label: '03 OAuth & 48-Sector Locks' },
                { id: 'step4_ai_media' as const, label: '04 AI Media Studio (TwelveLabs)' },
                { id: 'step5_console' as const, label: '05 Live Console & Proof (+POP)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStage(tab.id)}
                  className={`rounded-full px-3.5 py-1.5 font-mono text-[9.5px] font-bold uppercase tracking-wider cursor-pointer border-0 transition-all ${
                    stage === tab.id
                      ? 'bg-[#080808] text-[#CCFF00] shadow-sm'
                      : 'bg-white text-[#080808] hover:bg-black/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <span className="font-mono text-[9.5px] font-bold uppercase text-neutral-600">
              ALL EDITS SYNC LIVE TO PUBLIC DOSSIER
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 sm:p-10">
          {stage === 'auth' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-5 rounded-[28px] bg-[#080808] text-white p-8 sm:p-10 flex flex-col justify-between min-h-[420px]">
                <div>
                  <h2 className="m-0 font-sans text-4xl sm:text-5xl font-black uppercase tracking-[-0.03em] leading-[1.02]">
                    Claim your backing<span className="text-[#CCFF00]">.</span>
                  </h2>
                  <p className="m-0 mt-4 font-sans text-sm text-neutral-300 leading-relaxed">
                    Verify your league registration, configure your{' '}
                    <span className="bg-[#CCFF00] text-[#080808] font-bold px-1.5 py-0.5 rounded-[3px]">
                      70/15/15 split
                    </span>
                    , generate 9:16 reels in the TwelveLabs AI Media Studio, and manage T+0 escrow payouts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStage('step1_profile')}
                  className="w-full rounded-full bg-[#CCFF00] text-[#080808] py-3.5 font-mono text-[10px] font-bold uppercase tracking-widest cursor-pointer border-0 shadow-md"
                >
                  Instant Bypass → Open 5-Step Athlete Studio
                </button>
              </div>

              <form
                onSubmit={handleAuthSubmit}
                className="lg:col-span-7 rounded-[28px] bg-[#EAEAE6] p-8 sm:p-10 flex flex-col justify-between min-h-[420px]"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="m-0 font-sans text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#080808]">
                      {isSignUp ? 'Create Athlete Account' : 'Enter Talent Terminal'}
                      <span className="text-[#CCFF00]">.</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="rounded-full bg-white px-4 py-1.5 font-mono text-[10px] font-bold uppercase text-[#080808] cursor-pointer border border-black/10"
                    >
                      {isSignUp ? 'Have an account? Sign In' : 'New Contender? Sign Up'}
                    </button>
                  </div>

                  {isSignUp && (
                    <div>
                      <label className="block font-mono text-[10px] uppercase tracking-wider text-neutral-600 font-bold mb-1.5">
                        Full Legal Name
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full rounded-xl bg-white border border-black/15 px-4 py-3 font-sans text-sm font-bold text-[#080808]"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-neutral-600 font-bold mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl bg-white border border-black/15 px-4 py-3 font-mono text-sm text-[#080808]"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-neutral-600 font-bold mb-1.5">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl bg-white border border-black/15 px-4 py-3 font-mono text-sm text-[#080808]"
                    />
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] font-mono text-xs font-bold uppercase tracking-widest py-4 transition-colors cursor-pointer border-0 shadow-md"
                  >
                    {loading ? 'Launching Studio...' : 'Enter Athlete Studio →'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {stage === 'step1_profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-4 rounded-[28px] bg-[#080808] text-white p-8 flex flex-col justify-between">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#CCFF00] block mb-2">
                    PILLARS 01, 03 & 07 // IDENTITY & CATCHMENT
                  </span>
                  <h3 className="m-0 font-sans text-3xl font-black uppercase tracking-tight">
                    Sovereign Identity & Vitals<span className="text-[#CCFF00]">.</span>
                  </h3>
                  <p className="m-0 mt-3 font-sans text-xs text-neutral-300 leading-relaxed">
                    Match your official league registration against your ID, configure Dual-Catchment postcodes, and set product seeding sizes.
                  </p>

                  <div className="mt-5 pt-4 border-t border-white/10">
                    <label className="flex items-center gap-2.5 font-mono text-[10px] uppercase text-[#CCFF00] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={under18}
                        onChange={(e) => setUnder18(e.target.checked)}
                        className="accent-[#CCFF00]"
                      />
                      <span>Under-18 Pathway Athlete (Guardian Co-Sign)</span>
                    </label>
                    {under18 && (
                      <input
                        type="text"
                        value={guardianName}
                        onChange={(e) => setGuardianName(e.target.value)}
                        placeholder="Legal Guardian Full Name"
                        className="mt-2 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 font-sans text-xs text-white"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2.5 pt-6 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="w-full rounded-xl bg-white/10 hover:bg-[#CCFF00] text-white hover:text-[#080808] p-3.5 font-mono text-[10px] font-bold uppercase flex items-center justify-between cursor-pointer border-0 transition-colors"
                  >
                    <span className="truncate">Portrait: {avatarName}</span>
                    <span className="shrink-0 ml-2">+ Upload</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => docInputRef.current?.click()}
                    className="w-full rounded-xl bg-white/10 hover:bg-[#CCFF00] text-white hover:text-[#080808] p-3.5 font-mono text-[10px] font-bold uppercase flex items-center justify-between cursor-pointer border-0 transition-colors"
                  >
                    <span className="truncate">League Pass: {clearanceDoc}</span>
                    <span className="shrink-0 ml-2">+ Upload</span>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-8 rounded-[28px] bg-[#EAEAE6] p-8 flex flex-col justify-between">
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-mono text-[10px] font-bold uppercase text-neutral-600 mb-1">FULL LEGAL NAME</label>
                      <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-xl bg-white border border-black/15 px-3.5 py-2 font-sans text-xs font-bold" />
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] font-bold uppercase text-neutral-600 mb-1">SPORT DISCIPLINE</label>
                      <input type="text" value={sport} onChange={(e) => setSport(e.target.value)} className="w-full rounded-xl bg-white border border-black/15 px-3.5 py-2 font-sans text-xs font-bold" />
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] font-bold uppercase text-neutral-600 mb-1">TELEVISED LEAGUE</label>
                      <input type="text" value={league} onChange={(e) => setLeague(e.target.value)} className="w-full rounded-xl bg-white border border-black/15 px-3.5 py-2 font-sans text-xs font-bold" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-mono text-[10px] font-bold uppercase text-neutral-600 mb-1">HOME POSTCODE</label>
                      <input type="text" value={postcode} onChange={(e) => setPostcode(e.target.value)} className="w-full rounded-xl bg-white border border-black/15 px-3.5 py-2 font-mono text-xs font-bold" />
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] font-bold uppercase text-neutral-600 mb-1">HOME SUBURB</label>
                      <input type="text" value={suburb} onChange={(e) => setSuburb(e.target.value)} className="w-full rounded-xl bg-white border border-black/15 px-3.5 py-2 font-sans text-xs font-bold" />
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] font-bold uppercase text-neutral-600 mb-1">DUAL-CATCHMENT POSTCODE</label>
                      <input type="text" value={secondaryPostcode} onChange={(e) => setSecondaryPostcode(e.target.value)} className="w-full rounded-xl bg-white border border-black/15 px-3.5 py-2 font-mono text-xs font-bold" />
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] font-bold uppercase text-neutral-600 mb-1">EDITORIAL PULL QUOTE</label>
                    <input type="text" value={pullQuote} onChange={(e) => setPullQuote(e.target.value)} className="w-full rounded-xl bg-white border border-black/15 px-3.5 py-2 font-sans text-xs italic font-semibold" />
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] font-bold uppercase text-neutral-600 mb-1">ATHLETE BIO (STORY)</label>
                    <textarea rows={2} value={bio} onChange={(e) => setBio(e.target.value)} className="w-full rounded-xl bg-white border border-black/15 px-3.5 py-2 font-sans text-xs" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-mono text-[10px] font-bold uppercase text-neutral-600 mb-1">PHYSICAL VITALS</label>
                      <input type="text" value={physical} onChange={(e) => setPhysical(e.target.value)} className="w-full rounded-xl bg-white border border-black/15 px-3.5 py-2 font-sans text-xs" />
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] font-bold uppercase text-neutral-600 mb-1">SEASON STATS</label>
                      <input type="text" value={stats} onChange={(e) => setStats(e.target.value)} className="w-full rounded-xl bg-white border border-black/15 px-3.5 py-2 font-sans text-xs" />
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] font-bold uppercase text-neutral-600 mb-1">PRODUCT SEEDING SIZES</label>
                      <input type="text" value={kitSizing} onChange={(e) => setKitSizing(e.target.value)} className="w-full rounded-xl bg-white border border-black/15 px-3.5 py-2 font-sans text-xs" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-5">
                  <button
                    type="button"
                    onClick={() => {
                      saveToLocalStorage();
                      setStage('step2_club');
                    }}
                    className="rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] px-8 py-3.5 font-mono text-xs font-bold uppercase tracking-widest cursor-pointer border-0 shadow-md"
                  >
                    Save & Next: 70/15/15 Split & Tax →
                  </button>
                </div>
              </div>
            </div>
          )}

          {stage === 'step2_club' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-4 rounded-[28px] bg-gradient-to-br from-[#F7F7F6] via-[#CCFF00] to-[#F7F7F6] text-[#080808] p-8 flex flex-col justify-between min-h-[380px]">
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#080808]/75 block mb-2">
                    PILLAR 06 // ESCROW & RCTI RAILS
                  </span>
                  <h3 className="m-0 font-sans text-3xl sm:text-4xl font-black uppercase tracking-tight leading-[1.05]">
                    70/15/15 Direct Split<span className="text-[#CCFF00]">.</span>
                  </h3>
                </div>
                <p className="m-0 font-sans text-xs font-semibold text-[#080808]/85 leading-relaxed">
                  Every sponsorship package automatically routes 70% to your bank account, 15% to your grassroots junior club, and 15% to platform operations with automated ATO/IRD Recipient Created Tax Invoices (RCTIs).
                </p>
              </div>

              <div className="lg:col-span-8 rounded-[28px] bg-[#EAEAE6] p-8 flex flex-col justify-between min-h-[380px]">
                <div className="space-y-4">
                  <div>
                    <label className="block font-mono text-[10px] font-bold uppercase text-neutral-600 mb-1.5">
                      NOMINATED GRASSROOTS JUNIOR CLUB (RECEIVES 15% DIVIDEND)
                    </label>
                    <input
                      type="text"
                      value={juniorClub}
                      onChange={(e) => setJuniorClub(e.target.value)}
                      className="w-full rounded-xl bg-white border border-black/15 px-4 py-3 font-sans text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] font-bold uppercase text-neutral-600 mb-1.5">
                      STRIPE CONNECT PAYOUT BSB & ACCOUNT (RECEIVES 70% INSTANT T+0)
                    </label>
                    <input
                      type="text"
                      value={bsb}
                      onChange={(e) => setBsb(e.target.value)}
                      className="w-full rounded-xl bg-white border border-black/15 px-4 py-3 font-mono text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] font-bold uppercase text-neutral-600 mb-1.5">
                      ATO / NZ IRD RCTI TAX CLEARANCE STATUS
                    </label>
                    <input
                      type="text"
                      value={abnStatus}
                      onChange={(e) => setAbnStatus(e.target.value)}
                      className="w-full rounded-xl bg-white border border-black/15 px-4 py-3 font-mono text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-6">
                  <button
                    type="button"
                    onClick={() => setStage('step1_profile')}
                    className="rounded-full bg-white px-6 py-3 font-mono text-xs font-bold uppercase cursor-pointer border border-black/10"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      saveToLocalStorage();
                      setStage('step3_oauth');
                    }}
                    className="rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] px-8 py-3.5 font-mono text-xs font-bold uppercase tracking-widest cursor-pointer border-0 shadow-md"
                  >
                    Save & Next: OAuth & Conflict Matrix →
                  </button>
                </div>
              </div>
            </div>
          )}

          {stage === 'step3_oauth' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-4 rounded-[28px] bg-[#080808] text-white p-8 flex flex-col justify-between min-h-[380px]">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#CCFF00] block mb-2">
                    PILLARS 02, 05 & 08 // OAUTH & CONFLICTS
                  </span>
                  <h3 className="m-0 font-sans text-3xl font-black uppercase tracking-tight">
                    Handles & 48-Sector Locks<span className="text-[#CCFF00]">.</span>
                  </h3>
                </div>
                <p className="m-0 font-sans text-xs text-neutral-300 leading-relaxed">
                  Connect Instagram and TikTok for paid social amplification, tag any categories already locked by existing sponsors, and set your weekly clinic/appearance windows for the AI Deal Desk.
                </p>
              </div>

              <div className="lg:col-span-8 rounded-[28px] bg-[#EAEAE6] p-8 flex flex-col justify-between min-h-[380px]">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-white p-4 border border-black/10">
                      <span className="font-mono text-[10px] font-bold uppercase text-neutral-500">
                        INSTAGRAM PARTNERSHIP ADS
                      </span>
                      <input
                        type="text"
                        value={igHandle}
                        onChange={(e) => setIgHandle(e.target.value)}
                        className="mt-1.5 w-full rounded-lg bg-[#EAEAE6] border-0 px-3 py-2 font-mono text-xs font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => setIgConnected(!igConnected)}
                        className={`mt-2.5 w-full rounded-full py-2 font-mono text-[10px] font-bold uppercase cursor-pointer border-0 ${
                          igConnected ? 'bg-[#CCFF00] text-[#080808]' : 'bg-[#080808] text-white'
                        }`}
                      >
                        {igConnected ? '✓ Meta OAuth Active' : 'Connect Instagram →'}
                      </button>
                    </div>

                    <div className="rounded-2xl bg-white p-4 border border-black/10">
                      <span className="font-mono text-[10px] font-bold uppercase text-neutral-500">
                        TIKTOK SPARK ADS
                      </span>
                      <input
                        type="text"
                        value={ttHandle}
                        onChange={(e) => setTtHandle(e.target.value)}
                        className="mt-1.5 w-full rounded-lg bg-[#EAEAE6] border-0 px-3 py-2 font-mono text-xs font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => setTtConnected(!ttConnected)}
                        className={`mt-2.5 w-full rounded-full py-2 font-mono text-[10px] font-bold uppercase cursor-pointer border-0 ${
                          ttConnected ? 'bg-[#CCFF00] text-[#080808]' : 'bg-[#080808] text-white'
                        }`}
                      >
                        {ttConnected ? '✓ TikTok Spark Active' : 'Connect TikTok →'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] font-bold uppercase text-neutral-600 mb-1.5">
                      TOGGLE EXISTING SPONSOR LOCKOUTS (48-SECTOR CONFLICT MATRIX)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_SECTORS.map((sec) => {
                        const isLocked = lockedCategories.includes(sec);
                        return (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => toggleCategoryLock(sec)}
                            className={`rounded-full px-3 py-1.5 font-mono text-[10px] font-bold uppercase cursor-pointer border transition-colors ${
                              isLocked
                                ? 'bg-[#080808] text-[#CCFF00] border-[#080808]'
                                : 'bg-white text-[#080808] border-black/10 hover:bg-[#CCFF00]'
                            }`}
                          >
                            {isLocked ? `LOCKED · ${sec}` : `OPEN · ${sec}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] font-bold uppercase text-neutral-600 mb-1">
                      WEEKLY TRAINING & APPEARANCE WINDOWS (TRAINS SOVEREIGN AI COPILOT)
                    </label>
                    <input
                      type="text"
                      value={availability}
                      onChange={(e) => setAvailability(e.target.value)}
                      className="w-full rounded-xl bg-white border border-black/15 px-4 py-2.5 font-sans text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-6">
                  <button
                    type="button"
                    onClick={() => setStage('step2_club')}
                    className="rounded-full bg-white px-6 py-3 font-mono text-xs font-bold uppercase cursor-pointer border border-black/10"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      saveToLocalStorage();
                      setStage('step4_ai_media');
                    }}
                    className="rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] px-8 py-3.5 font-mono text-xs font-bold uppercase tracking-widest cursor-pointer border-0 shadow-md"
                  >
                    Save & Next: AI Media Studio →
                  </button>
                </div>
              </div>
            </div>
          )}

          {stage === 'step4_ai_media' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-4 rounded-[28px] bg-[#080808] text-white p-8 flex flex-col justify-between min-h-[400px]">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#CCFF00] block mb-2">
                    PILLAR 04 // TWELVELABS VIDEO INTELLIGENCE
                  </span>
                  <h3 className="m-0 font-sans text-3xl font-black uppercase tracking-tight">
                    AI Media Studio<span className="text-[#CCFF00]">.</span>
                  </h3>
                  <p className="m-0 mt-3 font-sans text-xs text-neutral-300 leading-relaxed">
                    Generate 9:16 vertical highlight reels from raw match footage, audit sponsor logo screen time via computer vision, and publish clips directly to your public Dossier card.
                  </p>
                </div>

                <div className="space-y-2.5 pt-6 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full rounded-xl bg-white/10 hover:bg-[#CCFF00] text-white hover:text-[#080808] p-3.5 font-mono text-[10px] font-bold uppercase flex items-center justify-between cursor-pointer border-0 transition-colors"
                  >
                    <span>+ Upload Raw Match Footage (MP4)</span>
                    <span>↑</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateAiReels}
                    disabled={generatingReels}
                    className="w-full rounded-full bg-[#CCFF00] text-[#080808] py-3.5 font-mono text-[10px] font-bold uppercase tracking-widest cursor-pointer border-0 shadow-md"
                  >
                    {generatingReels ? 'Generating 9:16 AI Reels...' : '▷ Generate AI 9:16 Reels'}
                  </button>
                </div>
              </div>

              <div className="lg:col-span-8 rounded-[28px] bg-[#080808] text-white p-8 flex flex-col justify-between min-h-[400px] border border-black/15">
                <div>
                  <div className="flex items-center justify-between border-b border-white/15 pb-3 mb-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAiStudioTab('generator')}
                        className={`rounded-full px-4 py-1.5 font-mono text-[10px] font-bold uppercase cursor-pointer border-0 ${
                          aiStudioTab === 'generator' ? 'bg-[#CCFF00] text-[#080808]' : 'bg-white/10 text-white'
                        }`}
                      >
                        🎞 AI Highlight Generator
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiStudioTab('semantic')}
                        className={`rounded-full px-4 py-1.5 font-mono text-[10px] font-bold uppercase cursor-pointer border-0 ${
                          aiStudioTab === 'semantic' ? 'bg-[#CCFF00] text-[#080808]' : 'bg-white/10 text-white'
                        }`}
                      >
                        ⌕ Semantic Sponsor Search
                      </button>
                    </div>
                    <span className="font-mono text-[10px] text-[#CCFF00] uppercase">
                      {aiClips.length} ACTIVE STEMS ON CARD
                    </span>
                  </div>

                  {aiStudioTab === 'semantic' && (
                    <form onSubmit={handleSemanticSearch} className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={semanticPrompt}
                        onChange={(e) => setSemanticPrompt(e.target.value)}
                        placeholder="Search match action (e.g. fast break, try-line tackle, corner jump shot)..."
                        className="flex-1 rounded-full bg-white/10 border border-white/20 px-4 py-2 font-sans text-xs text-white"
                      />
                      <button
                        type="submit"
                        className="rounded-full bg-[#CCFF00] text-[#080808] font-mono text-[10px] font-bold uppercase px-5 py-2 border-0 cursor-pointer"
                      >
                        Index Clip →
                      </button>
                    </form>
                  )}

                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {aiClips.map((clip, idx) => (
                      <div
                        key={clip.time + idx}
                        className="rounded-xl bg-white/5 border border-white/10 p-3.5 flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="font-mono text-[9.5px] text-[#CCFF00] uppercase">
                            ▶ {clip.time} · {clip.label} · {clip.exposure}
                          </div>
                          <div className="font-sans text-xs font-bold text-white mt-0.5">{clip.title}</div>
                        </div>
                        <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-[9px] text-neutral-300 shrink-0">
                          {clip.views}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between pt-6 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setStage('step3_oauth')}
                    className="rounded-full bg-white/10 text-white px-6 py-3 font-mono text-xs font-bold uppercase cursor-pointer border-0"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      saveToLocalStorage();
                      setStage('step5_console');
                    }}
                    className="rounded-full bg-[#CCFF00] text-[#080808] px-8 py-3.5 font-mono text-xs font-bold uppercase tracking-widest cursor-pointer border-0 shadow-md"
                  >
                    Publish Reels & Open Live Console →
                  </button>
                </div>
              </div>
            </div>
          )}

          {stage === 'step5_console' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="rounded-[28px] bg-[#080808] text-white p-8 flex flex-col justify-between min-h-[250px]">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#CCFF00]">
                    LIVE CONTENDER PROFILE
                  </span>
                  <div>
                    <h3 className="m-0 font-sans text-3xl font-black uppercase">
                      {fullName}
                      <span className="text-[#CCFF00]">.</span>
                    </h3>
                    <p className="m-0 mt-1 font-mono text-xs text-neutral-300">
                      {sport} · {league} · Postcodes {postcode} & {secondaryPostcode}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] text-[#CCFF00] uppercase font-bold">
                    ✓ {aiClips.length} REELS & PASS CLEARED
                  </span>
                </div>

                <div className="rounded-[28px] bg-gradient-to-br from-[#F7F7F6] via-[#CCFF00] to-[#F7F7F6] text-[#080808] p-8 flex flex-col justify-between min-h-[250px]">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#080808]/75">
                    70% NET ATHLETE EARNINGS + 15% CLUB
                  </span>
                  <div>
                    <p className="m-0 font-sans text-4xl font-black tracking-tight text-[#080808]">
                      A$4,900 Cleared<span className="text-[#CCFF00]">.</span>
                    </p>
                    <p className="m-0 mt-1 font-sans text-xs font-bold text-[#080808]/85">
                      A$1,050 Dividend Paid to {juniorClub}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] font-bold uppercase text-[#080808]/80">
                    SETTLED TO {bsb}
                  </span>
                </div>

                <div className="rounded-[28px] bg-[#EAEAE6] text-[#080808] p-8 flex flex-col justify-between min-h-[250px]">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                    PILLAR 09 // PROOF OF PERFORMANCE (+POP)
                  </span>
                  <div className="space-y-1.5 my-2">
                    {proofLogs.slice(0, 2).map((log) => (
                      <div key={log.id} className="rounded-xl bg-white p-2.5 font-mono text-[9.5px]">
                        <strong className="text-[#080808]">{log.id}:</strong> {log.obligation} ·{' '}
                        <span className="bg-[#CCFF00] px-1.5 py-0.5 rounded font-bold">{log.status}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => proofInputRef.current?.click()}
                      className="rounded-full bg-white text-[#080808] px-4 py-2 font-mono text-[10px] font-bold uppercase cursor-pointer border border-black/10"
                    >
                      + Upload Proof (T+0)
                    </button>
                    <button
                      type="button"
                      onClick={handleCompleteAndReturn}
                      className="rounded-full bg-[#080808] text-[#CCFF00] px-5 py-2 font-mono text-[10px] font-bold uppercase cursor-pointer border-0 shadow-md"
                    >
                      Save & Return to Site →
                    </button>
                  </div>
                </div>
              </div>

              {incomingProposals.length > 0 && (
                <div className="rounded-[24px] bg-[#080808] text-white p-6 border border-black/15">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#CCFF00] block mb-2">
                    PRE-QUALIFIED SPONSOR PROPOSALS FROM DOSSIER DEAL DESK
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {incomingProposals.slice(0, 3).map((prop) => (
                      <div key={prop.id} className="rounded-xl bg-white/10 p-3.5 font-mono text-xs">
                        <div className="text-[#CCFF00] font-bold">{prop.brandName}</div>
                        <div className="text-[10px] text-neutral-300 mt-1">
                          Sector: {prop.sector} · Postcode {prop.postcode} · {prop.timestamp}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AthleteAuthModal;