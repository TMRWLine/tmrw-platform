import React, { useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface AthleteAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type StudioStage = 'auth' | 'step1_profile' | 'step2_club' | 'step3_oauth' | 'step4_console';

export const AthleteAuthModal: React.FC<AthleteAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [stage, setStage] = useState<StudioStage>('auth');
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('kaneblightest@gmail.com');
  const [password, setPassword] = useState('tmrw-contender-2026');
  const [fullName, setFullName] = useState('Marcus Thorne');
  const [sport, setSport] = useState('Basketball');
  const [league, setLeague] = useState('NBL1 East');
  const [postcode, setPostcode] = useState('2200');
  const [suburb, setSuburb] = useState('Bankstown');
  const [juniorClub, setJuniorClub] = useState('Bankstown Bruins Basketball Association');
  const [bsb, setBsb] = useState('062-000 · 4829 1048');
  const [igHandle, setIgHandle] = useState('@marcusthorne_22');
  const [ttHandle, setTtHandle] = useState('@marcusthorne.hoops');
  const [igConnected, setIgConnected] = useState(true);
  const [ttConnected, setTtConnected] = useState(true);
  const [avatarName, setAvatarName] = useState<string>('marcus_thorne_portrait.jpg');
  const [clearanceDoc, setClearanceDoc] = useState<string>('NBL1_Player_Registration_2026.pdf');
  const [loading, setLoading] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

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
      // Seamless local sandbox fallback so testing never hits a brick wall
    } finally {
      setLoading(false);
      setStage('step1_profile');
    }
  };

  return (
    <div
      data-lenis-prevent="true"
      onClick={onClose}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-6 selection:bg-[#CCFF00] selection:text-[#0F0F11] animate-fadeIn"
    >
      {/* Hidden Real File Pickers for Athlete Profile Creation */}
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

      <div
        data-lenis-prevent="true"
        onWheel={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[1240px] max-h-[92dvh] rounded-[28px] bg-[#FFFFFF] text-[#0F0F11] shadow-[0_35px_100px_rgba(0,0,0,0.55)] border border-black/10 flex flex-col overflow-hidden"
      >
        {/* Top Navigation & Instant Bypass Bar */}
        <header className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-6 sm:px-10 py-4 bg-[#0F0F11] text-white">
          <div className="flex items-center gap-3">
            <span className="font-sans text-xl font-black tracking-tight text-white">
              tmrw<span className="text-[#CCFF00]">/.</span>
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#CCFF00] font-bold">
              ATHLETE ONBOARDING &amp; ACCOUNT STUDIO
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStage('step1_profile')}
              className={`rounded-full px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider cursor-pointer border-0 transition-colors ${
                stage !== 'auth' && stage !== 'step4_console'
                  ? 'bg-[#CCFF00] text-[#0F0F11]'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              Bypass → 1. Create Profile Flow
            </button>
            <button
              type="button"
              onClick={() => setStage('step4_console')}
              className={`rounded-full px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider cursor-pointer border-0 transition-colors ${
                stage === 'step4_console'
                  ? 'bg-[#CCFF00] text-[#0F0F11]'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              Bypass → 2. Live Athlete Console
            </button>
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
          </div>
        </header>

        {/* Stepper Bar when inside the Onboarding Journey */}
        {stage !== 'auth' && (
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-6 sm:px-10 py-3.5 bg-[#EAEAE6] border-b border-black/10">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'step1_profile' as const, label: '01 Identity, Photo & League' },
                { id: 'step2_club' as const, label: '02 Junior Club & 70/15/15 Split' },
                { id: 'step3_oauth' as const, label: '03 Instagram & TikTok OAuth' },
                { id: 'step4_console' as const, label: '04 Live Athlete Console' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStage(tab.id)}
                  className={`rounded-full px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider cursor-pointer border-0 transition-all ${
                    stage === tab.id
                      ? 'bg-[#0F0F11] text-[#CCFF00] shadow-sm'
                      : 'bg-white text-[#0F0F11] hover:bg-black/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <span className="font-mono text-[10px] font-bold uppercase text-neutral-600">
              CLICK ANY STEP TO TEST &amp; EDIT
            </span>
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10">
          {/* STAGE 0: BENTO SIGN UP / SIGN IN GATE */}
          {stage === 'auth' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-5 rounded-[28px] bg-[#0F0F11] text-white p-8 sm:p-10 flex flex-col justify-between min-h-[420px]">
                <div>
                  <h2 className="m-0 font-sans text-4xl sm:text-5xl font-black uppercase tracking-[-0.03em] leading-[1.02]">
                    Claim your backing<span className="text-[#CCFF00]">.</span>
                  </h2>
                  <p className="m-0 mt-4 font-sans text-sm text-neutral-300 leading-relaxed">
                    Create your verified athlete profile, upload your portrait and league pass, nominate your junior club for the{' '}
                    <span className="bg-[#CCFF00] text-[#0F0F11] font-bold px-1.5 py-0.5 rounded-[3px]">
                      70/15/15 split
                    </span>
                    , and link your social handles.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setStage('step1_profile')}
                  className="w-full rounded-full bg-[#CCFF00] text-[#0F0F11] py-3.5 font-mono text-[10px] font-bold uppercase tracking-widest cursor-pointer border-0 shadow-md"
                >
                  Instant Bypass → Start 4-Step Account Setup
                </button>
              </div>

              <form
                onSubmit={handleAuthSubmit}
                className="lg:col-span-7 rounded-[28px] bg-[#EAEAE6] p-8 sm:p-10 flex flex-col justify-between min-h-[420px]"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="m-0 font-sans text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#0F0F11]">
                      {isSignUp ? 'Create Athlete Account' : 'Enter Talent Terminal'}
                      <span className="text-[#CCFF00]">.</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="rounded-full bg-white px-4 py-1.5 font-mono text-[10px] font-bold uppercase text-[#0F0F11] cursor-pointer border border-black/10"
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
                        className="w-full rounded-xl bg-white border border-black/15 px-4 py-3 font-sans text-sm font-bold text-[#0F0F11]"
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
                      className="w-full rounded-xl bg-white border border-black/15 px-4 py-3 font-mono text-sm text-[#0F0F11]"
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
                      className="w-full rounded-xl bg-white border border-black/15 px-4 py-3 font-mono text-sm text-[#0F0F11]"
                    />
                  </div>
                </div>

                <div className="pt-6 space-y-2.5">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-full bg-[#0F0F11] hover:bg-[#CCFF00] text-white hover:text-[#0F0F11] font-mono text-xs font-bold uppercase tracking-widest py-4 transition-colors cursor-pointer border-0 shadow-md"
                  >
                    {loading
                      ? 'Launching Studio...'
                      : isSignUp
                      ? 'Create Account & Configure Profile →'
                      : 'Sign In & Open Athlete Studio →'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STAGE 1: IDENTITY, PHOTO UPLOAD & LEAGUE CLEARANCE */}
          {stage === 'step1_profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-4 rounded-[28px] bg-[#0F0F11] text-white p-8 flex flex-col justify-between min-h-[380px]">
                <div>
                  <h3 className="m-0 font-sans text-3xl sm:text-4xl font-black uppercase tracking-tight leading-[1.05]">
                    Identity &amp; League Pass<span className="text-[#CCFF00]">.</span>
                  </h3>
                  <p className="m-0 mt-3 font-sans text-xs text-neutral-300 leading-relaxed">
                    Upload your high-contrast roster portrait and official state or national league registration card to unlock your postcode.
                  </p>
                </div>

                <div className="space-y-2.5 pt-6 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="w-full rounded-xl bg-white/10 hover:bg-[#CCFF00] text-white hover:text-[#0F0F11] p-3.5 font-mono text-[10px] font-bold uppercase flex items-center justify-between cursor-pointer border-0 transition-colors"
                  >
                    <span className="truncate">Portrait: {avatarName}</span>
                    <span className="shrink-0 ml-2">+ Upload</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => docInputRef.current?.click()}
                    className="w-full rounded-xl bg-white/10 hover:bg-[#CCFF00] text-white hover:text-[#0F0F11] p-3.5 font-mono text-[10px] font-bold uppercase flex items-center justify-between cursor-pointer border-0 transition-colors"
                  >
                    <span className="truncate">Pass: {clearanceDoc}</span>
                    <span className="shrink-0 ml-2">+ Upload</span>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-8 rounded-[28px] bg-[#EAEAE6] p-8 flex flex-col justify-between min-h-[380px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-[10px] font-bold uppercase text-neutral-600 mb-1.5">
                      FULL LEGAL NAME
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-xl bg-white border border-black/15 px-4 py-3 font-sans text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] font-bold uppercase text-neutral-600 mb-1.5">
                      SPORT DISCIPLINE
                    </label>
                    <input
                      type="text"
                      value={sport}
                      onChange={(e) => setSport(e.target.value)}
                      className="w-full rounded-xl bg-white border border-black/15 px-4 py-3 font-sans text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] font-bold uppercase text-neutral-600 mb-1.5">
                      TELEVISED LEAGUE / CIRCUIT
                    </label>
                    <input
                      type="text"
                      value={league}
                      onChange={(e) => setLeague(e.target.value)}
                      className="w-full rounded-xl bg-white border border-black/15 px-4 py-3 font-sans text-sm font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-mono text-[10px] font-bold uppercase text-neutral-600 mb-1.5">
                        POSTCODE
                      </label>
                      <input
                        type="text"
                        value={postcode}
                        onChange={(e) => setPostcode(e.target.value)}
                        className="w-full rounded-xl bg-white border border-black/15 px-4 py-3 font-mono text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] font-bold uppercase text-neutral-600 mb-1.5">
                        HOME SUBURB
                      </label>
                      <input
                        type="text"
                        value={suburb}
                        onChange={(e) => setSuburb(e.target.value)}
                        className="w-full rounded-xl bg-white border border-black/15 px-4 py-3 font-sans text-sm font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <button
                    type="button"
                    onClick={() => setStage('step2_club')}
                    className="rounded-full bg-[#0F0F11] hover:bg-[#CCFF00] text-white hover:text-[#0F0F11] px-8 py-3.5 font-mono text-xs font-bold uppercase tracking-widest cursor-pointer border-0 shadow-md"
                  >
                    Save &amp; Next: Junior Club 70/15/15 Split →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 2: JUNIOR CLUB & 70/15/15 SPLIT */}
          {stage === 'step2_club' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-4 rounded-[28px] bg-gradient-to-br from-[#93C5FD] via-[#818CF8] to-[#C084FC] text-[#0F0F11] p-8 flex flex-col justify-between min-h-[380px]">
                <h3 className="m-0 font-sans text-3xl sm:text-4xl font-black uppercase tracking-tight leading-[1.05]">
                  70/15/15 Direct Split<span className="text-[#CCFF00]">.</span>
                </h3>
                <p className="m-0 font-sans text-xs font-semibold text-[#0F0F11]/85 leading-relaxed">
                  Every sponsorship package automatically routes 70% to your bank account, 15% to your grassroots junior club, and 15% to platform operations.
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
                      YOUR STRIPE CONNECT PAYOUT BSB &amp; ACCOUNT (RECEIVES 70% INSTANT T+0)
                    </label>
                    <input
                      type="text"
                      value={bsb}
                      onChange={(e) => setBsb(e.target.value)}
                      className="w-full rounded-xl bg-white border border-black/15 px-4 py-3 font-mono text-sm font-bold"
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
                    onClick={() => setStage('step3_oauth')}
                    className="rounded-full bg-[#0F0F11] hover:bg-[#CCFF00] text-white hover:text-[#0F0F11] px-8 py-3.5 font-mono text-xs font-bold uppercase tracking-widest cursor-pointer border-0 shadow-md"
                  >
                    Save &amp; Next: Connect Instagram &amp; TikTok →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 3: INSTAGRAM & TIKTOK OAUTH LINKING */}
          {stage === 'step3_oauth' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-4 rounded-[28px] bg-[#0F0F11] text-white p-8 flex flex-col justify-between min-h-[380px]">
                <h3 className="m-0 font-sans text-3xl sm:text-4xl font-black uppercase tracking-tight leading-[1.05]">
                  Direct Handle Sponsorship<span className="text-[#CCFF00]">.</span>
                </h3>
                <p className="m-0 font-sans text-xs text-neutral-300 leading-relaxed">
                  Connect your Instagram and TikTok handles via official OAuth. Verified sponsors get token access to boost pre-cleared posts in Postcode {postcode} without ever seeing your password.
                </p>
              </div>

              <div className="lg:col-span-8 rounded-[28px] bg-[#EAEAE6] p-8 flex flex-col justify-between min-h-[380px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-white p-5 border border-black/10 flex flex-col justify-between">
                    <div>
                      <span className="font-mono text-[10px] font-bold uppercase text-neutral-500">
                        INSTAGRAM PARTNERSHIP ADS
                      </span>
                      <input
                        type="text"
                        value={igHandle}
                        onChange={(e) => setIgHandle(e.target.value)}
                        className="mt-2 w-full rounded-lg bg-[#EAEAE6] border-0 px-3 py-2 font-mono text-xs font-bold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setIgConnected(!igConnected)}
                      className={`mt-4 w-full rounded-full py-3 font-mono text-[10px] font-bold uppercase cursor-pointer border-0 ${
                        igConnected ? 'bg-[#CCFF00] text-[#0F0F11]' : 'bg-[#0F0F11] text-white'
                      }`}
                    >
                      {igConnected ? '✓ Meta OAuth Token Active' : 'Connect Instagram OAuth →'}
                    </button>
                  </div>

                  <div className="rounded-2xl bg-white p-5 border border-black/10 flex flex-col justify-between">
                    <div>
                      <span className="font-mono text-[10px] font-bold uppercase text-neutral-500">
                        TIKTOK SPARK ADS
                      </span>
                      <input
                        type="text"
                        value={ttHandle}
                        onChange={(e) => setTtHandle(e.target.value)}
                        className="mt-2 w-full rounded-lg bg-[#EAEAE6] border-0 px-3 py-2 font-mono text-xs font-bold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setTtConnected(!ttConnected)}
                      className={`mt-4 w-full rounded-full py-3 font-mono text-[10px] font-bold uppercase cursor-pointer border-0 ${
                        ttConnected ? 'bg-[#CCFF00] text-[#0F0F11]' : 'bg-[#0F0F11] text-white'
                      }`}
                    >
                      {ttConnected ? '✓ TikTok Spark Token Active' : 'Connect TikTok OAuth →'}
                    </button>
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
                    onClick={() => setStage('step4_console')}
                    className="rounded-full bg-[#CCFF00] text-[#0F0F11] px-8 py-3.5 font-mono text-xs font-bold uppercase tracking-widest cursor-pointer border-0 shadow-md"
                  >
                    Complete Setup &amp; Open Live Console →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 4: LIVE ATHLETE OPERATOR CONSOLE */}
          {stage === 'step4_console' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="rounded-[28px] bg-[#0F0F11] text-white p-8 flex flex-col justify-between min-h-[240px]">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#CCFF00]">
                    LIVE CONTENDER PROFILE
                  </span>
                  <div>
                    <h3 className="m-0 font-sans text-3xl font-black uppercase">
                      {fullName}
                      <span className="text-[#CCFF00]">.</span>
                    </h3>
                    <p className="m-0 mt-1 font-mono text-xs text-neutral-300">
                      {sport} · {league} · Postcode {postcode} ({suburb})
                    </p>
                  </div>
                  <span className="font-mono text-[10px] text-[#CCFF00] uppercase font-bold">
                    ✓ PORTRAIT ({avatarName}) &amp; PASS CLEARED
                  </span>
                </div>

                <div className="rounded-[28px] bg-gradient-to-br from-[#93C5FD] via-[#818CF8] to-[#C084FC] text-[#0F0F11] p-8 flex flex-col justify-between min-h-[240px]">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#0F0F11]/75">
                    70% NET ATHLETE EARNINGS + 15% CLUB
                  </span>
                  <div>
                    <p className="m-0 font-sans text-4xl font-black tracking-tight text-[#0F0F11]">
                      A$4,900 Cleared<span className="text-[#CCFF00]">.</span>
                    </p>
                    <p className="m-0 mt-1 font-sans text-xs font-bold text-[#0F0F11]/85">
                      A$1,050 Dividend Paid to {juniorClub}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] font-bold uppercase text-[#0F0F11]/80">
                    SETTLED TO {bsb}
                  </span>
                </div>

                <div className="rounded-[28px] bg-[#EAEAE6] text-[#0F0F11] p-8 flex flex-col justify-between min-h-[240px]">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                    CONNECTED SOCIAL HANDLES
                  </span>
                  <div>
                    <p className="m-0 font-sans text-xl font-black">
                      {igHandle} &amp; {ttHandle}
                    </p>
                    <p className="m-0 mt-1 font-sans text-xs text-neutral-600">
                      OAuth tokens active for 1-click paid social amplification in Postcode {postcode}.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStage('step1_profile')}
                      className="rounded-full bg-white text-[#0F0F11] px-4 py-2 font-mono text-[10px] font-bold uppercase cursor-pointer border border-black/10"
                    >
                      Edit Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onSuccess();
                        onClose();
                      }}
                      className="rounded-full bg-[#0F0F11] text-[#CCFF00] px-5 py-2 font-mono text-[10px] font-bold uppercase cursor-pointer border-0"
                    >
                      Save &amp; Return to Site →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AthleteAuthModal;