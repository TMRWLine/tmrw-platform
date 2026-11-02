import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AssetImage } from './AssetImage';
import { FilmGrainOverlay } from './FilmGrainOverlay';
import { supabase } from '../lib/supabaseClient';
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
}

type SystemTabId =
  | '01_identity'
  | '02_conflicts'
  | '03_compliance'
  | '04_media'
  | '05_concierge'
  | '06_escrow'
  | '07_catchment'
  | '08_social'
  | '09_deliverables';

const SYSTEMS: readonly { id: SystemTabId; code: string; title: string; short: string }[] = [
  { id: '01_identity', code: '01', title: 'Athlete Verification & Package Rates', short: 'Verification & Rates' },
  { id: '02_conflicts', code: '02', title: 'Brand Category Availability & Exclusivity', short: 'Category Availability' },
  { id: '03_compliance', code: '03', title: 'League Clearance & Salary Cap Protection', short: 'League Clearance' },
  { id: '04_media', code: '04', title: 'Highlight Studio & Brand Asset Kit', short: 'Highlight & Media Kit' },
  { id: '05_concierge', code: '05', title: 'Instant Campaign & Availability Desk', short: 'Deal Concierge' },
  { id: '06_escrow', code: '06', title: 'Instant 70/15/15 Split & Escrow Vault', short: '70/15/15 Split Vault' },
  { id: '07_catchment', code: '07', title: 'Postcode Exclusivity & Local Territory', short: 'Postcode Territory' },
  { id: '08_social', code: '08', title: 'Verified Local Reach & Audience Impact', short: 'Audience & Reach' },
  { id: '09_deliverables', code: '09', title: 'Campaign Milestones & Proof of Delivery', short: 'Proof of Delivery' },
];

const PROHIBITED_SECTORS = [
  'Sports Betting & Wagering',
  'Vaping & E-Cigarettes',
  'Alcohol & Spirits',
  'Unregulated Supplements',
] as const;

const COMMERCIAL_FLIGHTS = [
  {
    id: '01',
    name: 'Local Storefront Drop',
    price: 'A$750 / quarter',
    split: 'A$525 Athlete · A$112.50 Junior Club · A$112.50 Ops',
    desc: 'Built for local cafes, gyms, and retail precincts backing homegrown talent.',
  },
  {
    id: '02',
    name: 'Pathway Contender',
    price: 'A$3,500 / season',
    split: 'A$2,450 Athlete · A$525 Junior Club · A$525 Ops',
    desc: 'Full-season backing across state-league competition, training kit, and local appearances.',
  },
  {
    id: '03',
    name: 'National Challenger',
    price: 'A$12,500 / annual',
    split: 'A$8,750 Athlete · A$1,875 Junior Club · A$1,875 Ops',
    desc: 'Category ownership and multi-drop campaign rights for national challenger brands.',
  },
  {
    id: '04',
    name: 'Major Podium Campaign',
    price: 'A$25,000 / campaign',
    split: 'A$17,500 Athlete · A$3,750 Junior Club · A$3,750 Ops',
    desc: 'Headline commercial partnership on the runway to LA 28 and Brisbane 32.',
  },
] as const;

function initialsOf(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.replace(/[^A-Za-z]/g, '')[0] ?? '')
    .join('')
    .toUpperCase();
}

export const AthleteDossierDrawer: React.FC<AthleteDossierDrawerProps> = ({
  athlete,
  onClose,
  onDeployCapital,
  onSelectAthlete,
}) => {
  const [activeTab, setActiveTab] = useState<SystemTabId>('01_identity');
  const [liveRow, setLiveRow] = useState<Record<string, any> | null>(null);
  const [syncingSupabase, setSyncingSupabase] = useState(false);
  const [mouSigned, setMouSigned] = useState(false);

  // Media studio interactive state (Daylight Pangram-native, fully scrollable)
  const [selectedMoment, setSelectedMoment] = useState(0);
  const [videoUploadedName, setVideoUploadedName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Deal Concierge interactive state
  const [copilotPrompt, setCopilotPrompt] = useState('');
  const [copilotHistory, setCopilotHistory] = useState<{ role: 'sponsor' | 'agent'; text: string }[]>([]);

  // Document vault & proof of delivery state
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([
    'League_Registration_Clearance_2026.pdf',
    'Arm_Length_TPA_Declaration_Signed.pdf',
  ]);
  const [proofLogs, setProofLogs] = useState<
    { id: string; obligation: string; status: string; timestamp: string }[]
  >([
    { id: 'DEL-01', obligation: 'Local Merchant Precinct Appearance (2 hrs)', status: 'VERIFIED · GEO-TAGGED', timestamp: 'Paid Instant T+0' },
    { id: 'DEL-02', obligation: '9:16 Vertical Match Reel & Partner Tag', status: 'ASSET CONFIRMED', timestamp: 'Paid Instant T+0' },
    { id: 'DEL-03', obligation: 'Junior Club Next-Gen Coaching Clinic', status: 'BOOKED · FUNDS IN ESCROW', timestamp: 'Scheduled' },
  ]);

  const scrollViewportRef = useRef<HTMLDivElement>(null);

  const currentIndex = ROSTER_DATA.findIndex(
    (entry) => entry.id === athlete?.id || entry.record.full_name === athlete?.full_name
  );

  const prevEntry =
    currentIndex !== -1
      ? ROSTER_DATA[(currentIndex - 1 + ROSTER_DATA.length) % ROSTER_DATA.length]
      : null;
  const nextEntry =
    currentIndex !== -1
      ? ROSTER_DATA[(currentIndex + 1) % ROSTER_DATA.length]
      : null;

  const handlePrev = () => {
    if (prevEntry && onSelectAthlete) {
      onSelectAthlete(prevEntry.record);
      scrollViewportRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNext = () => {
    if (nextEntry && onSelectAthlete) {
      onSelectAthlete(nextEntry.record);
      scrollViewportRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (!athlete) return;
    setActiveTab('01_identity');
    setMouSigned(Boolean(athlete.master_licence_signed));
    setVideoUploadedName(null);
    setCopilotHistory([
      {
        role: 'agent',
        text: `Deal Concierge live for ${athlete.full_name} (${athlete.sport} · ${athlete.league}). Packages start at A$750 with exclusive rights in Postcode ${athlete.postcode} (${suburbForPostcode(athlete.postcode)}). Ask about appearance dates, category availability, or campaign deliverables below.`,
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

  useEffect(() => {
    if (!athlete) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [athlete, currentIndex, onClose]);

  if (!athlete) return null;

  const imageFile = portraitFile(athlete.image);
  const imageFallbacks = specimenFor(athlete.id)?.imageFallbacks ?? [];
  const suburb = suburbForPostcode(athlete.postcode);
  const initials = initialsOf(athlete.full_name);

  const highlightMoments = [
    { time: '00:04', title: ` Clutch Play · ${athlete.league} Round 4`, tag: '9:16 Vertical Cut Ready', ready: '98% Match' },
    { time: '00:11', title: `Podium & Tunnel Walk · ${athlete.current_club}`, tag: 'Sponsor Logo Placement Zone', ready: '96% Match' },
    { time: '00:18', title: `Post-Game Mic & Local Precinct Shoutout`, tag: 'Audio + Caption Verified', ready: '94% Match' },
  ];

  const handleCopilotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = copilotPrompt.trim();
    if (!q) return;
    const lockedList = athlete.branding_categories.locked.join(', ') || 'none';
    const availList = athlete.branding_categories.available.join(', ');
    const reply = `Checked ${athlete.full_name}'s live schedule & category ledger: Open categories include ${availList} (Locked: ${lockedList}). Postcode ${athlete.postcode} (${suburb}) is available with ${athlete.radiusKm}km partner exclusivity. Ready to lock a campaign flight with an immediate 70/15/15 split.`;
    setCopilotHistory((prev) => [...prev, { role: 'sponsor', text: q }, { role: 'agent', text: reply }]);
    setCopilotPrompt('');
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-md flex items-center justify-center p-2 sm:p-5 md:p-8 selection:bg-[#CCFF00] selection:text-[#080808] animate-fadeIn"
    >
      {/* Pangram-Matched Daylight Architectural Sheet (Fixed Height + Smooth Internal Scroll) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[1680px] max-h-[92vh] rounded-[24px] bg-[#F7F7F5] text-[#080808] shadow-[0_30px_90px_rgba(0,0,0,0.28)] border border-black/10 flex flex-col overflow-hidden"
      >
        {/* Sticky Top Pangram Navigation Bar: Prev on Left, Red Close Pill in Center, Next on Right */}
        <header className="shrink-0 z-30 flex items-center justify-between gap-4 px-5 sm:px-8 py-4 bg-[#F7F7F5]/95 backdrop-blur-md border-b border-black/10">
          <button
            type="button"
            onClick={handlePrev}
            className="inline-flex items-center gap-2 rounded-full bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white px-4 py-2 font-sans text-xs font-medium tracking-tight transition-colors cursor-pointer border-0"
          >
            <span>←</span>
            <span className="hidden sm:inline text-neutral-500">Prev</span>
            <span className="font-bold">{prevEntry?.name ?? 'Previous'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Close Athlete Dossier [ESC]"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#FF3300] hover:bg-[#080808] text-white px-5 py-1.5 font-sans text-xs font-bold tracking-tight shadow-sm transition-colors cursor-pointer border-0"
          >
            <span>Close</span>
            <span className="text-[11px]">✕</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-2 rounded-full bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white px-4 py-2 font-sans text-xs font-medium tracking-tight transition-colors cursor-pointer border-0"
          >
            <span className="hidden sm:inline text-neutral-500">Next</span>
            <span className="font-bold">{nextEntry?.name ?? 'Next'}</span>
            <span>→</span>
          </button>
        </header>

        {/* Dedicated Internal Scroll Viewport (Never traps or clips content) */}
        <div ref={scrollViewportRef} className="flex-1 overflow-y-auto">
          
          {/* Split Editorial Specimen Header: True Portrait Aspect Ratio on Left, Monumental Type on Right */}
          <div className="bg-[#EAEAE6] border-b border-black/10 p-6 sm:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Left 4 Cols: Unstretched 4:5 Portrait Frame + Giant Initials Specimen */}
              <div className="lg:col-span-4">
                <div className="group relative mx-auto max-w-[340px] lg:max-w-none aspect-[4/5] rounded-[18px] bg-[#080808] overflow-hidden shadow-md border border-black/10">
                  <AssetImage
                    file={imageFile}
                    fallbackFiles={imageFallbacks}
                    alt={athlete.full_name}
                    objectPosition="center top"
                    className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 contrast-115 transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />
                  <FilmGrainOverlay intensity="fine" />

                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                    <span className="rounded-full bg-[#CCFF00] text-[#080808] font-mono text-[10px] font-bold uppercase tracking-widest px-3 py-1">
                      {athlete.status}
                    </span>
                    <span className="rounded-full bg-black/60 text-white backdrop-blur-sm font-mono text-[10px] uppercase tracking-widest px-3 py-1">
                      {athlete.postcode}
                    </span>
                  </div>

                  <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between text-white">
                    <span className="font-display text-7xl font-black leading-[0.8] tracking-[-0.05em]">
                      {initials}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-white/80">
                      Hover for Colour
                    </span>
                  </div>
                </div>
              </div>

              {/* Right 8 Cols: Editorial Specimen Typography & Instant Partner Actions */}
              <div className="lg:col-span-8 flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-600">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#CCFF00] ring-1 ring-black/25" />
                    <span>VERIFIED ATHLETE DOSSIER</span>
                    <span>·</span>
                    <span>{syncingSupabase ? 'SYNCING LIVE LEDGER...' : 'PRE-CLEARED FOR PARTNERSHIPS'}</span>
                  </div>

                  <h1 className="m-0 mt-3 font-display text-5xl sm:text-6xl xl:text-[76px] font-black tracking-[-0.04em] leading-[0.9] text-[#080808]">
                    {athlete.full_name}
                  </h1>

                  <p className="m-0 mt-4 font-sans text-lg sm:text-xl font-medium text-neutral-700 tracking-tight">
                    <span className="bg-[#CCFF00] text-[#080808] font-bold px-2 py-0.5 rounded-[4px]">
                      {athlete.sport}
                    </span>{' '}
                    · {athlete.league} · {athlete.current_club} · {suburb} ({athlete.postcode})
                  </p>
                </div>

                {/* 4-Column Key Telemetry Strip (Matches Main Roster Proportions) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-black/10">
                  <div className="rounded-xl bg-[#F7F7F5] border border-black/8 p-4">
                    <span className="block font-mono text-[9px] uppercase tracking-widest text-neutral-500">Entry Package</span>
                    <span className="mt-1 block font-display text-2xl font-black text-[#080808]">From A$750</span>
                  </div>
                  <div className="rounded-xl bg-[#F7F7F5] border border-black/8 p-4">
                    <span className="block font-mono text-[9px] uppercase tracking-widest text-neutral-500">Market Valuation</span>
                    <span className="mt-1 block font-display text-2xl font-black text-[#080808]">{athlete.valuation}</span>
                  </div>
                  <div className="rounded-xl bg-[#F7F7F5] border border-black/8 p-4">
                    <span className="block font-mono text-[9px] uppercase tracking-widest text-neutral-500">Partner Territory</span>
                    <span className="mt-1 block font-display text-2xl font-black text-[#080808]">{athlete.radiusKm}km Radius</span>
                  </div>
                  <div className="rounded-xl bg-[#F7F7F5] border border-black/8 p-4">
                    <span className="block font-mono text-[9px] uppercase tracking-widest text-neutral-500">Direct Split</span>
                    <span className="mt-1 block font-display text-2xl font-black text-[#080808]">70 / 15 / 15</span>
                  </div>
                </div>

                {/* Primary Partner & Athlete Action Bar */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => onDeployCapital(athlete)}
                    className="rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] font-mono text-xs font-bold uppercase tracking-widest px-7 py-3.5 transition-colors cursor-pointer border-0 shadow-sm"
                  >
                    Fund Flight &amp; Lock Postcode {athlete.postcode} →
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('04_media')}
                    className="rounded-full bg-[#F7F7F5] hover:bg-[#080808] text-[#080808] hover:text-white border border-black/15 font-mono text-xs font-bold uppercase tracking-widest px-6 py-3.5 transition-colors cursor-pointer"
                  >
                    Open Highlight &amp; Media Kit
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* 9-System Architectural Workspace (Daylight Stone & Alabaster Theme) */}
          <div className="p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-8 items-start">
            
            {/* Left Sidebar: 9 Clearinghouse Modules */}
            <aside className="space-y-2">
              <p className="m-0 px-2 pb-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">
                Athlete &amp; Partner Modules (09)
              </p>
              {SYSTEMS.map((sys) => {
                const active = activeTab === sys.id;
                return (
                  <button
                    key={sys.id}
                    type="button"
                    onClick={() => setActiveTab(sys.id)}
                    className={`w-full flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-left font-sans text-[13px] transition-all cursor-pointer border ${
                      active
                        ? 'bg-[#080808] text-white border-[#080808] font-bold shadow-sm'
                        : 'bg-white text-[#080808] border-black/8 hover:border-black/30 font-medium'
                    }`}
                  >
                    <span className="truncate flex items-center gap-2.5">
                      <span
                        className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                          active ? 'bg-[#CCFF00] text-[#080808] font-bold' : 'bg-[#EAEAE6] text-[#080808]'
                        }`}
                      >
                        {sys.code}
                      </span>
                      <span>{sys.short}</span>
                    </span>
                    <span aria-hidden="true" className={active ? 'text-[#CCFF00]' : 'text-neutral-400'}>
                      →
                    </span>
                  </button>
                );
              })}
            </aside>

            {/* Right Main Panel: Active System Content */}
            <main className="rounded-[20px] bg-white border border-black/10 p-6 sm:p-10 shadow-sm">
              
              {/* MODULE 01: Verification & Package Rates */}
              {activeTab === '01_identity' && (
                <div className="space-y-8">
                  <div className="border-b border-black/10 pb-6">
                    <span className="inline-block rounded bg-[#CCFF00] text-[#080808] font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">
                      MODULE 01
                    </span>
                    <h2 className="m-0 mt-2 font-display text-3xl font-black tracking-tight text-[#080808]">
                      Athlete Verification &amp; Commercial Packages
                    </h2>
                    <p className="m-0 mt-2 font-sans text-sm text-neutral-600 max-w-2xl">
                      Direct identity and competition verification. Sponsors deal straight with verified talent and accredited guardians, with transparent fixed-tier pricing and zero hidden agency fees.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-black/10 bg-[#F7F7F5] p-5">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">Identity &amp; Roster Match</span>
                      <p className="m-0 mt-2 font-display text-xl font-black text-[#080808]">100% Direct Match</p>
                      <p className="m-0 mt-1 font-sans text-xs text-neutral-600">
                        Verified against official {athlete.governing_body.name} competition registration. Zero unaccredited middlemen.
                      </p>
                    </div>
                    <div className="rounded-xl border border-black/10 bg-[#F7F7F5] p-5">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">Signatory Protection</span>
                      <p className="m-0 mt-2 font-display text-xl font-black text-[#080808]">
                        {liveRow?.is_minor ? 'Guardian Co-Signed' : 'Direct Adult Signatory'}
                      </p>
                      <p className="m-0 mt-1 font-sans text-xs text-neutral-600">
                        Built-in legal co-signature protection for pathway athletes and commercial sponsors.
                      </p>
                    </div>
                    <div className="rounded-xl border border-black/10 bg-[#F7F7F5] p-5">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">Availability Status</span>
                      <p className="m-0 mt-2 font-display text-xl font-black text-[#080808]">
                        <span className="bg-[#CCFF00] px-2 py-0.5 rounded">{athlete.status}</span>
                      </p>
                      <p className="m-0 mt-1 font-sans text-xs text-neutral-600">
                        Cleared for immediate local merchant campaigns, appearances, and digital content drops.
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="m-0 mb-4 font-mono text-xs font-bold uppercase tracking-widest text-neutral-500">
                      Fixed-Rate Commercial Packages
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {COMMERCIAL_FLIGHTS.map((flight) => (
                        <div
                          key={flight.id}
                          className="rounded-xl border border-black/10 bg-[#F7F7F5] p-6 flex flex-col justify-between gap-4 hover:border-[#080808] transition-colors"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="rounded bg-[#080808] text-white font-mono text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5">
                                Tier {flight.id}
                              </span>
                              <span className="font-display text-lg font-black text-[#080808]">{flight.price}</span>
                            </div>
                            <h4 className="m-0 mt-3 font-display text-xl font-black text-[#080808]">{flight.name}</h4>
                            <p className="m-0 mt-1 font-sans text-xs text-neutral-600">{flight.desc}</p>
                            <p className="m-0 mt-3 font-mono text-[11px] font-bold text-neutral-700">{flight.split}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onDeployCapital(athlete)}
                            className="self-start rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] font-mono text-[10px] font-bold uppercase tracking-widest px-5 py-2.5 transition-colors cursor-pointer border-0"
                          >
                            Select {flight.name} →
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* MODULE 02: Category Availability & Exclusivity */}
              {activeTab === '02_conflicts' && (
                <div className="space-y-8">
                  <div className="border-b border-black/10 pb-6">
                    <span className="inline-block rounded bg-[#CCFF00] text-[#080808] font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">
                      MODULE 02
                    </span>
                    <h2 className="m-0 mt-2 font-display text-3xl font-black tracking-tight text-[#080808]">
                      Brand Category Availability &amp; Exclusivity
                    </h2>
                    <p className="m-0 mt-2 font-sans text-sm text-neutral-600 max-w-2xl">
                      Live category check across 48 industry sectors. When your business locks a category with {athlete.full_name}, competing brands in your sector are locked out for the duration of your flight.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="rounded-xl border border-black/10 bg-[#F7F7F5] p-5">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#080808]">
                        Open Categories (Ready to Lock)
                      </span>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {athlete.branding_categories.available.map((cat) => (
                          <span
                            key={cat}
                            className="rounded-full bg-[#CCFF00] text-[#080808] font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-1.5"
                          >
                            ✓ {cat}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-black/10 bg-[#F7F7F5] p-5">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                        Taken Categories (Active Partner)
                      </span>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {athlete.branding_categories.locked.length > 0 ? (
                          athlete.branding_categories.locked.map((cat) => (
                            <span
                              key={cat}
                              className="rounded-full bg-black/8 text-neutral-500 font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 line-through"
                            >
                              {cat}
                            </span>
                          ))
                        ) : (
                          <span className="font-sans text-xs text-neutral-600">All primary commercial categories are currently open.</span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-black/10 bg-[#F7F7F5] p-5">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#FF3300]">
                        League Integrity Exclusions
                      </span>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {PROHIBITED_SECTORS.map((sector) => (
                          <span
                            key={sector}
                            className="rounded-full bg-[#FF3300]/10 text-[#FF3300] font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-1.5"
                          >
                            ✕ {sector}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MODULE 03: League Clearance & Salary Cap Protection */}
              {activeTab === '03_compliance' && (
                <div className="space-y-8">
                  <div className="border-b border-black/10 pb-6">
                    <span className="inline-block rounded bg-[#CCFF00] text-[#080808] font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">
                      MODULE 03
                    </span>
                    <h2 className="m-0 mt-2 font-display text-3xl font-black tracking-tight text-[#080808]">
                      League Clearance &amp; Salary Cap Protection
                    </h2>
                    <p className="m-0 mt-2 font-sans text-sm text-neutral-600 max-w-2xl">
                      Every deal on tmrw/. is structured as an independent Third-Party Agreement (TPA) at arm's length from {athlete.current_club}, protecting both the athlete's league eligibility and the sponsor's brand reputation.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Governing Body', val: athlete.governing_body.name },
                      { label: 'Third-Party Audit', val: athlete.governing_body.tpa_compliant ? 'ARM’S-LENGTH CLEARED' : 'IN REVIEW' },
                      { label: 'Club Salary Cap', val: 'EXEMPT · NON-WAGE' },
                      { label: 'Master NIL Terms', val: mouSigned ? 'SIGNED & ACTIVE' : 'READY TO SIGN' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl border border-black/10 bg-[#F7F7F5] p-4">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-500">{item.label}</span>
                        <p className="m-0 mt-2 font-mono text-xs font-bold text-[#080808]">{item.val}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-black/10 bg-[#F7F7F5] p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="m-0 font-mono text-xs font-bold uppercase tracking-widest text-[#080808]">
                        Verified Clearance &amp; Registration Vault
                      </h3>
                      <button
                        type="button"
                        onClick={() =>
                          setUploadedDocs((prev) => [
                            ...prev,
                            `Sponsor_TPA_Clearance_${athlete.postcode}_${Date.now().toString().slice(-4)}.pdf`,
                          ])
                        }
                        className="rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] font-mono text-[10px] font-bold uppercase tracking-widest px-4 py-2 transition-colors cursor-pointer border-0"
                      >
                        + Add Clearance Document
                      </button>
                    </div>
                    <ul className="m-0 p-0 list-none divide-y divide-black/10">
                      {uploadedDocs.map((doc) => (
                        <li key={doc} className="py-3 flex items-center justify-between font-mono text-xs">
                          <span className="font-medium text-[#080808]">{doc}</span>
                          <span className="rounded bg-[#CCFF00] text-[#080808] px-2 py-0.5 text-[10px] font-bold uppercase">
                            Verified On-File
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* MODULE 04: Highlight Studio & Brand Asset Kit (Zero Vendor Jargon, 100% Scrollable Daylight UI) */}
              {activeTab === '04_media' && (
                <div className="space-y-8">
                  <div className="border-b border-black/10 pb-6">
                    <span className="inline-block rounded bg-[#CCFF00] text-[#080808] font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">
                      MODULE 04
                    </span>
                    <h2 className="m-0 mt-2 font-display text-3xl font-black tracking-tight text-[#080808]">
                      Highlight Studio &amp; Partner Brand Kit
                    </h2>
                    <p className="m-0 mt-2 font-sans text-sm text-neutral-600 max-w-2xl">
                      Ready-to-post 9:16 vertical match reels, verified athlete monograms, and co-branded watermark assets for local and national partner campaigns.
                    </p>
                  </div>

                  {/* Interactive 9:16 Reel Preview + Moment Selector + Upload */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* 9:16 Vertical Social Reel Preview */}
                    <div className="lg:col-span-5">
                      <div className="relative mx-auto max-w-[280px] aspect-[9/16] rounded-2xl bg-[#080808] overflow-hidden shadow-lg border border-black/15 flex flex-col justify-between p-5 text-white">
                        <AssetImage
                          file={imageFile}
                          fallbackFiles={imageFallbacks}
                          alt={athlete.full_name}
                          className="absolute inset-0 w-full h-full object-cover opacity-75"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/60" />

                        <div className="relative z-10 flex items-center justify-between">
                          <span className="rounded bg-[#CCFF00] text-[#080808] font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5">
                            9:16 REEL READY
                          </span>
                          <span className="font-mono text-[10px] text-white/80">tmrw/.</span>
                        </div>

                        <div className="relative z-10 space-y-2">
                          <span className="font-mono text-[10px] uppercase tracking-widest text-[#CCFF00]">
                            {highlightMoments[selectedMoment]?.time} · {highlightMoments[selectedMoment]?.ready}
                          </span>
                          <p className="m-0 font-display text-xl font-black leading-tight">
                            {highlightMoments[selectedMoment]?.title}
                          </p>
                          <p className="m-0 font-mono text-[10px] text-white/75 uppercase">
                            {athlete.full_name} × Partner Co-Brand Slot
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right 7 Cols: Tagged Match Moments, Raw Footage Dropzone & Co-Branded Asset Pack */}
                    <div className="lg:col-span-7 space-y-6">
                      <div className="rounded-xl border border-black/10 bg-[#F7F7F5] p-5 space-y-3">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                          Tagged Match Highlights (Click to Preview)
                        </span>
                        <div className="space-y-2">
                          {highlightMoments.map((m, idx) => (
                            <button
                              key={m.time}
                              type="button"
                              onClick={() => setSelectedMoment(idx)}
                              className={`w-full text-left rounded-xl p-3.5 transition-all cursor-pointer border flex items-center justify-between gap-3 ${
                                selectedMoment === idx
                                  ? 'bg-[#080808] text-white border-[#080808]'
                                  : 'bg-white text-[#080808] border-black/10 hover:border-black/30'
                              }`}
                            >
                              <div>
                                <span className={`font-mono text-[10px] font-bold ${selectedMoment === idx ? 'text-[#CCFF00]' : 'text-neutral-500'}`}>
                                  {m.time} · {m.tag}
                                </span>
                                <p className="m-0 mt-0.5 font-sans text-xs font-bold">{m.title}</p>
                              </div>
                              <span className="rounded-full bg-[#CCFF00] text-[#080808] font-mono text-[9px] font-bold px-2.5 py-1 shrink-0">
                                {m.ready}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Clean Match Footage Dropzone */}
                      <div className="rounded-xl border border-dashed border-black/25 bg-[#F7F7F5] p-6 text-center">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="video/*"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) setVideoUploadedName(f.name);
                          }}
                          className="hidden"
                        />
                        <p className="m-0 font-sans text-sm font-bold text-[#080808]">
                          {videoUploadedName ? `Loaded: ${videoUploadedName}` : 'Drop new match footage to auto-cut 9:16 sponsor reels'}
                        </p>
                        <p className="m-0 mt-1 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                          MP4 or MOV · Auto-tags jersey exposure &amp; key plays
                        </p>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-4 rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] font-mono text-[10px] font-bold uppercase tracking-widest px-5 py-2 transition-colors cursor-pointer border-0"
                        >
                          {videoUploadedName ? 'Replace Footage' : 'Select Match Video'}
                        </button>
                      </div>

                      {/* Downloadable Partner Brand Pack */}
                      <div className="rounded-xl border border-black/10 bg-[#F7F7F5] p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#080808]">
                            Licensed Partner Asset Pack
                          </span>
                          <span className="font-mono text-[10px] font-bold uppercase text-neutral-500">
                            {mouSigned ? 'UNLOCKED' : 'REQUIRES ACTIVE FLIGHT'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {[
                            { name: '9:16 Highlight Reel (MP4)', size: '48 MB' },
                            { name: `${initials} Athlete Monogram (SVG)`, size: '4 MB' },
                            { name: 'Co-Branded Watermark Stamp', size: '1.2 MB' },
                            { name: 'Local PR & Social Copy Kit', size: '2.4 MB' },
                          ].map((asset) => (
                            <div
                              key={asset.name}
                              className="rounded-lg bg-white border border-black/8 px-3.5 py-2.5 flex items-center justify-between font-mono text-[11px]"
                            >
                              <span className="font-bold text-[#080808] truncate">{asset.name}</span>
                              <span className="text-neutral-500 shrink-0 ml-2">{asset.size}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* MODULE 05: Deal Concierge */}
              {activeTab === '05_concierge' && (
                <div className="space-y-6">
                  <div className="border-b border-black/10 pb-6">
                    <span className="inline-block rounded bg-[#CCFF00] text-[#080808] font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">
                      MODULE 05
                    </span>
                    <h2 className="m-0 mt-2 font-display text-3xl font-black tracking-tight text-[#080808]">
                      Instant Campaign &amp; Availability Desk
                    </h2>
                    <p className="m-0 mt-2 font-sans text-sm text-neutral-600">
                      Check {athlete.full_name}'s appearance availability, training schedule, and category lockouts in real time before locking your flight.
                    </p>
                  </div>

                  <div className="rounded-xl border border-black/10 bg-[#F7F7F5] p-6 space-y-4 max-h-[360px] overflow-y-auto">
                    {copilotHistory.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl font-sans text-sm leading-relaxed ${
                          item.role === 'agent'
                            ? 'bg-white border border-black/10 text-[#080808]'
                            : 'bg-[#080808] text-white font-medium ml-auto max-w-xl'
                        }`}
                      >
                        <span className="block font-mono text-[9px] uppercase tracking-widest opacity-60 mb-1">
                          {item.role === 'agent' ? `TMRW/. CONCIERGE · ${athlete.display_name}` : 'PARTNER ENQUIRY'}
                        </span>
                        {item.text}
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleCopilotSubmit} className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={copilotPrompt}
                      onChange={(e) => setCopilotPrompt(e.target.value)}
                      placeholder={`Ask about ${athlete.full_name}'s availability for a store launch, clinic, or content drop...`}
                      className="flex-1 rounded-full border border-black/20 bg-white px-5 py-3 font-sans text-sm text-[#080808] placeholder:text-neutral-400 focus:outline-none focus:border-[#080808]"
                    />
                    <button
                      type="submit"
                      className="rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] font-mono text-xs font-bold uppercase tracking-widest px-6 py-3 transition-colors cursor-pointer border-0"
                    >
                      Check Availability →
                    </button>
                  </form>
                </div>
              )}

              {/* MODULE 06: 70/15/15 Split & Escrow Vault */}
              {activeTab === '06_escrow' && (
                <div className="space-y-8">
                  <div className="border-b border-black/10 pb-6">
                    <span className="inline-block rounded bg-[#CCFF00] text-[#080808] font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">
                      MODULE 06
                    </span>
                    <h2 className="m-0 mt-2 font-display text-3xl font-black tracking-tight text-[#080808]">
                      Instant 70/15/15 Split &amp; Escrow Vault
                    </h2>
                    <p className="m-0 mt-2 font-sans text-sm text-neutral-600 max-w-2xl">
                      No ninety-day invoice chasing. Partner funds are held safely in Stripe Connect escrow and split automatically the moment campaign deliverables are verified, complete with automated ATO tax invoices (RCTI).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="rounded-xl border-2 border-[#080808] bg-[#CCFF00] p-6">
                      <span className="font-mono text-xs font-bold uppercase text-[#080808]">70% Direct to Athlete</span>
                      <p className="m-0 mt-2 font-display text-5xl font-black text-[#080808]">70%</p>
                      <p className="m-0 mt-2 font-sans text-xs text-[#080808]/80">
                        Paid straight to {athlete.full_name} to fund training, recovery, and competition travel.
                      </p>
                    </div>
                    <div className="rounded-xl border border-black/10 bg-[#F7F7F5] p-6">
                      <span className="font-mono text-xs font-bold uppercase text-[#080808]">15% Grassroots Club</span>
                      <p className="m-0 mt-2 font-display text-5xl font-black text-[#080808]">15%</p>
                      <p className="m-0 mt-2 font-sans text-xs text-neutral-600">
                        Royalty routed automatically to {athlete.current_club} to fund junior pathway development.
                      </p>
                    </div>
                    <div className="rounded-xl border border-black/10 bg-[#F7F7F5] p-6">
                      <span className="font-mono text-xs font-bold uppercase text-neutral-500">15% Platform &amp; Legal</span>
                      <p className="m-0 mt-2 font-display text-5xl font-black text-[#080808]">15%</p>
                      <p className="m-0 mt-2 font-sans text-xs text-neutral-600">
                        Covers Stripe escrow protection, league compliance auditing, media licensing, and automated tax receipts.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* MODULE 07: Postcode Exclusivity & Local Territory */}
              {activeTab === '07_catchment' && (
                <div className="space-y-8">
                  <div className="border-b border-black/10 pb-6">
                    <span className="inline-block rounded bg-[#CCFF00] text-[#080808] font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">
                      MODULE 07
                    </span>
                    <h2 className="m-0 mt-2 font-display text-3xl font-black tracking-tight text-[#080808]">
                      Postcode Exclusivity &amp; Local Territory
                    </h2>
                    <p className="m-0 mt-2 font-sans text-sm text-neutral-600 max-w-2xl">
                      Own your backyard. Partners lock territorial exclusivity around Postcode {athlete.postcode} ({suburb}) and {athlete.current_club} so rival local businesses cannot sign the same athlete.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { ring: '5km Local Precinct Ring', status: 'OPEN TO LOCK', desc: `Exclusive local merchant rights across ${suburb} (${athlete.postcode}).` },
                      { ring: '15km Metro Catchment', status: 'ACTIVE CORRIDOR', desc: `Covers ${athlete.current_club} home ground and surrounding suburbs.` },
                      { ring: '50km Regional Syndicate', status: 'AVAILABLE', desc: 'Full state-league competition corridor and regional broadcast footprint.' },
                    ].map((r) => (
                      <div key={r.ring} className="rounded-xl border border-black/10 bg-[#F7F7F5] p-6">
                        <span className="inline-block rounded bg-[#CCFF00] text-[#080808] font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">
                          {r.status}
                        </span>
                        <h4 className="m-0 mt-3 font-display text-lg font-black text-[#080808]">{r.ring}</h4>
                        <p className="m-0 mt-2 font-sans text-xs text-neutral-600">{r.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MODULE 08: Audience & Local Reach */}
              {activeTab === '08_social' && (
                <div className="space-y-8">
                  <div className="border-b border-black/10 pb-6">
                    <span className="inline-block rounded bg-[#CCFF00] text-[#080808] font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">
                      MODULE 08
                    </span>
                    <h2 className="m-0 mt-2 font-display text-3xl font-black tracking-tight text-[#080808]">
                      Verified Local Reach &amp; Community Impact
                    </h2>
                    <p className="m-0 mt-2 font-sans text-sm text-neutral-600 max-w-2xl">
                      Real community influence measured by local postcode concentration and verified engagement—not inflated global bots.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="rounded-xl border border-black/10 bg-[#F7F7F5] p-5">
                      <span className="font-mono text-[10px] uppercase text-neutral-500">Instagram</span>
                      <p className="m-0 mt-2 font-mono text-sm font-bold text-[#080808]">{athlete.social.instagram_handle}</p>
                    </div>
                    <div className="rounded-xl border border-black/10 bg-[#F7F7F5] p-5">
                      <span className="font-mono text-[10px] uppercase text-neutral-500">Verified Following</span>
                      <p className="m-0 mt-2 font-display text-2xl font-black text-[#080808]">{formatFollowers(athlete.social.follower_count)}</p>
                    </div>
                    <div className="rounded-xl border border-black/10 bg-[#F7F7F5] p-5">
                      <span className="font-mono text-[10px] uppercase text-neutral-500">Engagement Rate</span>
                      <p className="m-0 mt-2 font-display text-2xl font-black text-[#080808]">{athlete.social.engagement_rate}</p>
                    </div>
                    <div className="rounded-xl border border-black/10 bg-[#F7F7F5] p-5">
                      <span className="font-mono text-[10px] uppercase text-neutral-500">Local Catchment Share</span>
                      <p className="m-0 mt-2 font-display text-2xl font-black text-[#080808]">
                        <span className="bg-[#CCFF00] px-2 py-0.5 rounded">68% Local</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* MODULE 09: Campaign Milestones & Proof of Delivery */}
              {activeTab === '09_deliverables' && (
                <div className="space-y-8">
                  <div className="border-b border-black/10 pb-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="inline-block rounded bg-[#CCFF00] text-[#080808] font-mono text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">
                        MODULE 09
                      </span>
                      <h2 className="m-0 mt-2 font-display text-3xl font-black tracking-tight text-[#080808]">
                        Campaign Milestones &amp; Proof of Delivery
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setProofLogs((prev) => [
                          ...prev,
                          {
                            id: `DEL-0${prev.length + 1}`,
                            obligation: 'Partner Content Drop & Postcode Check-In',
                            status: 'VERIFIED · ESCROW RELEASED',
                            timestamp: 'Just now',
                          },
                        ])
                      }
                      className="rounded-full bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808] font-mono text-[10px] font-bold uppercase tracking-widest px-5 py-2.5 transition-colors cursor-pointer border-0"
                    >
                      + Log Completed Deliverable
                    </button>
                  </div>

                  <div className="divide-y divide-black/10 border-y border-black/10">
                    {proofLogs.map((log) => (
                      <div key={log.id} className="py-4 flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <span className="font-mono text-[10px] text-neutral-500">{log.id}</span>
                          <p className="m-0 mt-0.5 font-sans text-sm font-bold text-[#080808]">{log.obligation}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="rounded-full bg-[#CCFF00] text-[#080808] px-3 py-1 font-mono text-[10px] font-bold">
                            {log.status}
                          </span>
                          <span className="font-mono text-xs text-neutral-500">{log.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </main>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default AthleteDossierDrawer;