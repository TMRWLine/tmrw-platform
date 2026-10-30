import React, { useState } from 'react';
import { PAGE_SHELL } from './CoverHero';

interface Contender {
  id: string;
  name: string;
  category: string;
  x: number;
  y: number;
  role: string;
  valuation: string;
  stats: string;
}

interface LocationPreset {
  name: string;
  suburb: string;
  code: string;
  contenders: Contender[];
}

const PRESETS: Record<string, LocationPreset> = {
  'Bondi 2026 (Active)': {
    name: 'Bondi 2026 (Active)',
    suburb: 'Sydney Eastern Suburbs / Bondi Sector',
    code: '2026',
    contenders: [
      { id: '1', name: 'H. Bligh', category: 'Core', x: 48, y: 52, role: 'Wrestling / Grappling Lead', valuation: '$750 / MONTH', stats: 'Verified 72h baseline · Peak output active' },
      { id: '2', name: 'S. Blake', category: 'Contender', x: 55, y: 45, role: 'Sprint & Endurance Specialist', valuation: '$600 / MONTH', stats: 'Dune interval benchmark verified' },
      { id: '3', name: 'L. Hart', category: 'Contender', x: 42, y: 48, role: 'Strength & Conditioning', valuation: '$500 / MONTH', stats: '16kg kettlebell protocols logged' },
      { id: '4', name: 'T. Vale', category: 'Contender', x: 38, y: 58, role: 'Combat Sports Prospect', valuation: '$450 / MONTH', stats: 'Junior cohort progression active' },
      { id: '5', name: 'N. Crowe', category: 'Contender', x: 50, y: 62, role: 'Middleweight Contender', valuation: '$650 / MONTH', stats: 'Regional ranking tier 1' },
      { id: '6', name: 'A. Keene', category: 'Contender', x: 58, y: 56, role: 'Open Weight Specialist', valuation: '$550 / MONTH', stats: 'Cross-discipline compliance clear' },
    ]
  },
  'Richmond 3121': {
    name: 'Richmond 3121',
    suburb: 'Melbourne Inner East / Yarra Sector',
    code: '3121',
    contenders: [
      { id: '7', name: 'M. Vance', category: 'Core', x: 48, y: 50, role: 'Midfield Engine', valuation: '$800 / MONTH', stats: 'GPS tracking and load monitoring active' },
      { id: '8', name: 'K. Smith', category: 'Contender', x: 60, y: 42, role: 'Key Position Prospect', valuation: '$600 / MONTH', stats: 'Draft combine metrics verified' },
      { id: '9', name: 'J. Doe', category: 'Contender', x: 40, y: 58, role: 'Agility Specialist', valuation: '$450 / MONTH', stats: 'Speed matrix benchmark clear' },
    ]
  },
  'Burleigh Heads 4220': {
    name: 'Burleigh Heads 4220',
    suburb: 'Gold Coast Seaboard / Coastal Sector',
    code: '4220',
    contenders: [
      { id: '10', name: 'B. Slater', category: 'Core', x: 50, y: 50, role: 'Elite Waterman', valuation: '$900 / MONTH', stats: 'Ocean swell conditioning benchmark' },
      { id: '11', name: 'C. Wright', category: 'Contender', x: 55, y: 45, role: 'Coastal Prospect', valuation: '$650 / MONTH', stats: 'Board analytics and telemetry linked' },
    ]
  },
  'Ponsonby 1011': {
    name: 'Ponsonby 1011',
    suburb: 'Auckland Central / Waitemata Sector',
    code: '1011',
    contenders: [
      { id: '12', name: 'J. Savage', category: 'Core', x: 48, y: 52, role: 'Rugby League Enforcer', valuation: '$850 / MONTH', stats: 'Contact load and collision metrics verified' },
      { id: '13', name: 'R. Kahu', category: 'Contender', x: 52, y: 48, role: 'Backline Playmaker', valuation: '$550 / MONTH', stats: 'Passing efficiency index tier 1' },
    ]
  }
};

export function RadialCatchment() {
  const [activeScale, setActiveScale] = useState<'5KM' | '15KM' | '50KM'>('5KM');
  const [selectedPresetKey, setSelectedPresetKey] = useState('Bondi 2026 (Active)');
  const [selectedContenderId, setSelectedContenderId] = useState<string>('1');
  const [isPostcodeMenuOpen, setIsPostcodeMenuOpen] = useState(false);
  const [isClaimDrawerOpen, setIsClaimDrawerOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const currentPreset = PRESETS[selectedPresetKey] || PRESETS['Bondi 2026 (Active)'];
  const selectedContender = currentPreset.contenders.find(c => c.id === selectedContenderId) || currentPreset.contenders[0];

  const territoryOptions = [
    { key: 'Bondi 2026 (Active)', label: '2026 · BONDI', code: '2026' },
    { key: 'Richmond 3121', label: '3121 · RICHMOND', code: '3121' },
    { key: 'Burleigh Heads 4220', label: '4220 · BURLEIGH HEADS', code: '4220' },
    { key: 'Ponsonby 1011', label: '1011 · PONSONBY', code: '1011' },
  ];

  return (
    <section className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 pt-14 md:pt-16">
      {/* Editorial Masthead: Two-Column Asymmetric Header */}
      <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-8 lg:gap-12 mb-8">
        {/* Left Column: Display Headline with Kinetic Volt Full Stop */}
        <div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[0.92] uppercase text-black font-sans">
            REAL LOYALTY NEVER LEAVES THE SUBURB<span className="text-[#B8FF00]">.</span>
          </h2>
        </div>

        {/* Right Column: Editorial Narrative (bottom-aligned on desktop) */}
        <div className="lg:self-end">
          <p className="text-sm sm:text-base text-neutral-600 leading-relaxed font-sans">
            Billboards talk to drivers passing through who will never step inside your doors. Real support starts five minutes from your counter. tmrw/<span className="text-[#B8FF00]">.</span> locks in exclusive postcode backing for local businesses, ensuring secure deals, fast payouts directly to emerging talent, and a clean split for their grassroots clubs.
          </p>
        </div>
      </div>

      {/* Functional Utility Strip with Interactive Dropdown */}
      <div className="border-y border-neutral-200 py-3 my-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative">
        {/* Left: Interactive Postcode Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsPostcodeMenuOpen(!isPostcodeMenuOpen)}
            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
          >
            <span className="w-2 h-2 rounded-full bg-[#B8FF00] inline-block animate-pulse"></span>
            <span className="text-xs font-mono tracking-wider text-black font-bold uppercase">
              POSTCODE {currentPreset.code} // {currentPreset.name.split(' ')[0].toUpperCase()}
            </span>
            <svg
              className={`w-3.5 h-3.5 text-neutral-500 transition-transform ${isPostcodeMenuOpen ? 'rotate-180' : ''}`}
              fill="none"
              strokeWidth="2"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isPostcodeMenuOpen && (
            <div className="absolute top-full left-0 mt-2 bg-white border border-neutral-200 shadow-xl rounded-lg overflow-hidden z-50 min-w-[220px]">
              {territoryOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => {
                    setSelectedPresetKey(option.key);
                    setSelectedContenderId(PRESETS[option.key].contenders[0].id);
                    setIsPostcodeMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 text-xs font-mono tracking-wider transition-colors ${
                    selectedPresetKey === option.key
                      ? 'bg-[#B8FF00] text-black font-bold'
                      : 'text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Centre: Live Status Metadata */}
        <div className="text-[11px] font-mono tracking-wider text-neutral-500 uppercase">
          SHOWING {currentPreset.contenders.length} VERIFIED CONTENDERS · TERRITORIAL TITLE OPEN
        </div>

        {/* Right: Obsidian Capsule Control Dock */}
        <div className="inline-flex items-center p-1 bg-[#121212] rounded-full border border-neutral-800">
          {(['5KM', '15KM', '50KM'] as const).map((scale) => {
            const labelMap = { 
              '5KM': '5KM LOCAL', 
              '15KM': '15KM CATCHMENT', 
              '50KM': '50KM REGIONAL' 
            };
            const isActive = activeScale === scale;
            return (
              <button
                key={scale}
                onClick={() => setActiveScale(scale)}
                className={`px-3 py-1 text-xs transition-all rounded-full ${
                  isActive 
                    ? 'bg-[#B8FF00] text-black font-bold' 
                    : 'text-neutral-400 hover:text-white font-mono'
                }`}
              >
                {labelMap[scale]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Map Viewport Container */}
      <div className="relative h-[520px] bg-zinc-950 rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl flex items-center justify-center mt-2 mb-10 w-full">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20"></div>

          <div className="absolute inset-0 flex items-center justify-between px-12 pointer-events-none select-none opacity-10">
            <span className="text-7xl font-bold tracking-tighter text-white">POSTCODE {currentPreset.code}</span>
            <span className="text-7xl font-bold tracking-tighter text-white">{currentPreset.name.split(' ')[0].toUpperCase()}</span>
          </div>

          <div className="absolute w-96 h-96 rounded-full border-2 border-dashed border-[#CCFF00]/40 bg-[#CCFF00]/5 flex items-center justify-center animate-pulse pointer-events-none">
            <div className="absolute top-2 bg-zinc-900/90 border border-zinc-700 text-[#CCFF00] text-[10px] px-2 py-0.5 rounded tracking-widest">
              {activeScale} CATCHMENT ZONE
            </div>
          </div>

          {currentPreset.contenders.map((contender) => {
            const isSelected = contender.id === selectedContenderId;
            return (
              <div
                key={contender.id}
                onClick={() => setSelectedContenderId(contender.id)}
                className="absolute cursor-pointer group transition-transform hover:scale-125"
                style={{ left: `${contender.x}%`, top: `${contender.y}%` }}
              >
                <div className={`w-3.5 h-3.5 rounded-full border-2 border-black ${isSelected ? 'bg-[#CCFF00] shadow-[0_0_20px_#CCFF00]' : 'bg-white'}`}></div>
                <div className="absolute left-5 -top-1 bg-zinc-900/95 border border-zinc-700 text-white text-[10px] px-2.5 py-1 tracking-wider whitespace-nowrap shadow-xl">
                  <span className="text-[#CCFF00] font-bold mr-1.5">{contender.name}</span>
                  <span className="text-zinc-400">({contender.category})</span>
                </div>
              </div>
            );
          })}

          <div className="absolute top-6 left-6 text-[10px] text-zinc-400 tracking-widest font-mono bg-zinc-900/80 px-3 py-1 rounded-full backdrop-blur-sm pointer-events-none border border-zinc-800">
            NW · GEOGRAPHIC MAP ENGINE
          </div>
          <div className="absolute top-6 right-6 text-[10px] text-zinc-400 tracking-widest font-mono bg-zinc-900/80 px-3 py-1 rounded-full backdrop-blur-sm pointer-events-none border border-zinc-800">
            NE · {selectedPresetKey}
          </div>
      </div>

      {/* Three-Column Editorial Broadsheet Ledger */}
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 mt-12 mb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 w-full pt-8 border-t border-neutral-200 lg:divide-x lg:divide-neutral-200">
          
          {/* Column 1: Territorial Footprint */}
          <div className="lg:pr-12">
            <div className="text-6xl sm:text-7xl font-black tracking-tighter text-black leading-none mb-4">
              5KM
            </div>
            <h3 className="text-xl font-black uppercase text-black mb-3">
              THE ENGINE IS SUBURBAN.
            </h3>
            <p className="text-sm text-neutral-600 leading-relaxed font-sans mb-4">
              Medals are celebrated on network television, but athletic careers are built in local gyms, pools, and regional sheds. Locking in exclusive rights across your postcode directs commercial backing straight to emerging contenders while keeping competitors out of your business category.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="inline-block bg-[#B8FF00] text-black font-mono text-[11px] font-bold px-2.5 py-0.5 uppercase">
                CATEGORY LOCKED
              </span>
              <span className="inline-block bg-[#B8FF00] text-black font-mono text-[11px] font-bold px-2.5 py-0.5 uppercase">
                FOOT TRAFFIC RADIUS
              </span>
              <span className="inline-block bg-[#B8FF00] text-black font-mono text-[11px] font-bold px-2.5 py-0.5 uppercase">
                30-DAY ROLLING TERM
              </span>
            </div>
          </div>

          {/* Column 2: Verified Contender */}
          <div className="lg:px-12">
            <div className="text-5xl sm:text-6xl font-black tracking-tight text-black leading-none mb-3">
              H. BLIGH
            </div>
            
            {/* Credential Lockup with Live Pulse */}
            <div className="flex items-center gap-2 mb-6">
              <span className="w-2 h-2 rounded-full bg-[#B8FF00] animate-pulse" />
              <span className="text-xs font-mono tracking-wider uppercase text-neutral-800 font-semibold">
                AUSTRALIAN SQUAD · FREESTYLE 74KG
              </span>
            </div>
            
            {/* Editorial Specification Blocks */}
            <div className="divide-y divide-neutral-200">
              {/* Block 1: Commercial Category Exclusivity */}
              <div className="py-4">
                <div className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase mb-1">
                  COMMERCIAL CATEGORY EXCLUSIVITY
                </div>
                <div className="text-lg font-bold text-black tracking-tight">
                  Specialty Coffee & Casual Dining
                </div>
              </div>
              
              {/* Block 2: Protected Postcode Footprint */}
              <div className="py-4">
                <div className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase mb-1">
                  PROTECTED POSTCODE FOOTPRINT
                </div>
                <div className="text-sm font-semibold text-neutral-800">
                  Bondi 2026 // 5km Radius
                </div>
              </div>
              
              {/* Block 3: Local Club Revenue Share */}
              <div className="py-4">
                <div className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase mb-1">
                  LOCAL CLUB REVENUE SHARE (15%)
                </div>
                <div className="text-sm font-semibold text-neutral-800">
                  City of Sydney Wrestling Club
                </div>
              </div>
            </div>
            
            {/* Baseline Audit Stamp */}
            <div className="mt-6 text-[10px] font-mono tracking-wider text-neutral-400 uppercase">
              ATO & ASC TPA COMPLIANT · ESCROW AUDITED 2026
            </div>
          </div>

          {/* Column 3: Commercial Clearing Protocol */}
          <div className="lg:pl-12">
            <div className="flex items-end gap-2 mb-4">
              <span className="text-6xl sm:text-7xl font-black tracking-tighter text-black leading-none">
                $750
              </span>
              <span className="text-xs font-mono text-neutral-400 uppercase pb-2">
                / MONTH
              </span>
            </div>
            <p className="text-sm text-neutral-600 leading-relaxed font-sans mb-4">
              Direct monthly backing with zero agency overhead. Your business secures category rights across the 5km zone, verified endorsement, and immediate brand integration across the local sporting circuit.
            </p>
            
            {/* Multi-Segment Visual Split Bar */}
            <div className="h-1.5 w-full bg-neutral-200 flex mb-3 overflow-hidden rounded-none">
              <div className="bg-black" style={{ width: '70%' }}></div>
              <div className="bg-neutral-400" style={{ width: '15%' }}></div>
              <div className="bg-[#B8FF00]" style={{ width: '15%' }}></div>
            </div>

            {/* Settlement Breakdown Table */}
            <div className="space-y-2 text-xs font-mono mb-6">
              <div className="flex justify-between items-baseline">
                <span className="text-neutral-500 uppercase tracking-wider">CONTENDER (70%)</span>
                <span className="text-black font-bold">$525.00</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-neutral-500 uppercase tracking-wider">JUNIOR CLUB (15%)</span>
                <span className="text-black font-bold">$112.50</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-neutral-500 uppercase tracking-wider">PLATFORM ESCROW (15%)</span>
                <span className="text-black font-bold">$112.50</span>
              </div>
            </div>

            {/* Action CTA Button */}
            <button 
              onClick={() => setIsClaimDrawerOpen(true)}
              className="w-full bg-[#B8FF00] hover:bg-black hover:text-[#B8FF00] text-black font-bold uppercase tracking-wider py-4 text-xs font-mono transition-all duration-150 border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none mt-6"
            >
              CLAIM EXCLUSIVE POSTCODE RIGHTS →
            </button>
          </div>

        </div>
      </div>

      {/* Interactive Slide-Out Checkout Drawer */}
      {isClaimDrawerOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
            onClick={() => {
              setIsClaimDrawerOpen(false);
              setIsProcessing(false);
              setIsConfirmed(false);
            }}
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 right-0 max-w-lg w-full bg-white z-50 shadow-2xl p-8 md:p-10 flex flex-col justify-between border-l border-neutral-200 overflow-y-auto">
            {!isConfirmed ? (
              <>
                {/* Header */}
                <div>
                  <div className="flex items-start justify-between mb-8">
                    <div className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase">
                      POSTCODE 2026 // COMMERCIAL TITLE
                    </div>
                    <button
                      onClick={() => {
                        setIsClaimDrawerOpen(false);
                        setIsProcessing(false);
                        setIsConfirmed(false);
                      }}
                      className="text-xs font-mono tracking-wider text-black hover:text-neutral-500 transition-colors uppercase"
                    >
                      [CLOSE]
                    </button>
                  </div>

                  {/* Body */}
                  <div className="space-y-6">
                    <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-black leading-none mb-2">
                      SECURE EXCLUSIVE RIGHTS
                    </h3>

                    {/* Claim Details */}
                    <div className="space-y-3 py-6 border-y border-neutral-200">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-mono text-neutral-500 uppercase tracking-wider">Athlete</span>
                        <span className="text-sm font-bold text-black">H. Bligh</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-mono text-neutral-500 uppercase tracking-wider">Category</span>
                        <span className="text-sm font-bold text-black text-right">Specialty Coffee & Casual Dining</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-mono text-neutral-500 uppercase tracking-wider">Monthly Commitment</span>
                        <span className="text-sm font-bold text-black">$750/mo</span>
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-4 pt-2">
                      <div>
                        <label className="block text-xs font-mono tracking-wider text-neutral-500 uppercase mb-2">
                          Business Trading Name
                        </label>
                        <input
                          type="text"
                          placeholder="Enter registered business name"
                          className="w-full px-4 py-3 border border-neutral-300 focus:border-black focus:outline-none text-sm font-sans transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-mono tracking-wider text-neutral-500 uppercase mb-2">
                          Contact Email
                        </label>
                        <input
                          type="email"
                          placeholder="your@business.com.au"
                          className="w-full px-4 py-3 border border-neutral-300 focus:border-black focus:outline-none text-sm font-sans transition-colors"
                        />
                      </div>
                    </div>

                    {/* Legal Notice */}
                    <p className="text-xs text-neutral-500 leading-relaxed pt-4">
                      By proceeding, you acknowledge that all commercial agreements are cleared through third-party institutional escrow, subject to ATO and ASC TPA compliance verification, and governed by the tmrw/<span className="text-[#B8FF00]">.</span> Commercial Clearing Protocol.
                    </p>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="pt-6 mt-6 border-t border-neutral-200">
                  <button 
                    onClick={() => {
                      setIsProcessing(true);
                      setTimeout(() => {
                        setIsProcessing(false);
                        setIsConfirmed(true);
                      }, 600);
                    }}
                    disabled={isProcessing}
                    className="w-full bg-[#B8FF00] hover:bg-black hover:text-[#B8FF00] text-black font-bold uppercase tracking-wider py-4 text-sm font-mono transition-all duration-150 border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'INITIALISING ESCROW CLEARANCE...' : 'PROCEED TO AUDITED ESCROW →'}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Confirmation View */}
                <div>
                  <div className="flex items-start justify-between mb-8">
                    <div className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase">
                      POSTCODE 2026 // COMMERCIAL TITLE
                    </div>
                    <button
                      onClick={() => {
                        setIsClaimDrawerOpen(false);
                        setIsProcessing(false);
                        setIsConfirmed(false);
                      }}
                      className="text-xs font-mono tracking-wider text-black hover:text-neutral-500 transition-colors uppercase"
                    >
                      [CLOSE]
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Confirmation Header */}
                    <h3 className="text-3xl font-black tracking-tight text-black leading-none mb-2">
                      ESCROW TITLE SECURED.
                    </h3>

                    {/* Monospace Tag */}
                    <div className="inline-block bg-[#B8FF00] text-black text-xs font-mono px-3 py-1.5 uppercase tracking-wider font-bold">
                      PARCEL 01 // BONDI 2026 LOCKED
                    </div>

                    {/* Summary Receipt */}
                    <div className="space-y-4 py-6 border-y border-neutral-200 mt-6">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-mono text-neutral-500 uppercase tracking-wider">Monthly Clearing</span>
                        <span className="text-xl font-black text-black">$750.00 AUD/MO</span>
                      </div>
                      
                      <div className="space-y-2 pt-4 border-t border-neutral-200">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs font-mono text-neutral-600 uppercase tracking-wider">H. Bligh (70%)</span>
                          <span className="text-sm font-bold text-black">$525.00</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs font-mono text-neutral-600 uppercase tracking-wider">City of Sydney Wrestling (15%)</span>
                          <span className="text-sm font-bold text-black">$112.50</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs font-mono text-neutral-600 uppercase tracking-wider">Platform Escrow (15%)</span>
                          <span className="text-sm font-bold text-black">$112.50</span>
                        </div>
                      </div>
                    </div>

                    {/* Confirmation Notice */}
                    <p className="text-sm text-neutral-600 leading-relaxed">
                      Your exclusive territorial claim has been registered and queued for institutional escrow verification. You will receive full onboarding documentation and ATO compliance guidance within 48 hours.
                    </p>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="pt-6 mt-6 border-t border-neutral-200">
                  <button 
                    onClick={() => {
                      setIsClaimDrawerOpen(false);
                      setIsProcessing(false);
                      setIsConfirmed(false);
                    }}
                    className="w-full bg-black text-white font-bold uppercase tracking-wider py-4 text-sm font-mono transition-all duration-150 border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-neutral-800 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  >
                    RETURN TO MAP
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
