import React, { useState } from 'react';

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedContenderId, setSelectedContenderId] = useState<string>('1');

  const currentPreset = PRESETS[selectedPresetKey] || PRESETS['Bondi 2026 (Active)'];
  const selectedContender = currentPreset.contenders.find(c => c.id === selectedContenderId) || currentPreset.contenders[0];

  return (
    <section className="w-full text-zinc-900 py-12 px-6 font-mono">
      {/* Control & Preset Bar */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-3 w-full md:w-auto relative">
          <input
            type="text"
            placeholder="Search postcode or suburb"
            className="bg-white border border-zinc-300 px-4 py-2.5 text-xs tracking-wider text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-black transition-colors w-64 shadow-sm"
          />
          
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="bg-white border border-zinc-300 px-4 py-2.5 text-xs tracking-wider text-zinc-900 flex items-center justify-between w-56 hover:border-black transition-colors shadow-sm"
            >
              <span className="font-medium">{selectedPresetKey}</span>
              <span className="text-[10px] text-zinc-500">▼</span>
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-zinc-900 border border-zinc-700 shadow-2xl z-50 text-white text-xs">
                {Object.keys(PRESETS).map((key) => (
                  <div
                    key={key}
                    onClick={() => {
                      setSelectedPresetKey(key);
                      setIsDropdownOpen(false);
                      setSelectedContenderId(PRESETS[key].contenders[0].id);
                    }}
                    className="px-4 py-2.5 hover:bg-zinc-800 cursor-pointer tracking-wider transition-colors"
                  >
                    {key}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Refined Scale & Geographic Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-transparent border border-transparent text-zinc-500 px-3 py-2 text-[11px] font-medium tracking-widest uppercase">
            GEOGRAPHIC
          </div>

          <div className="flex items-center gap-1.5">
            {(['5KM', '15KM', '50KM'] as const).map((scale) => {
              const labelMap = { 
                '5KM': '5KM LOCAL', 
                '15KM': '15KM DISTRICT', 
                '50KM': '50KM REGIONAL' 
              };
              const isActive = activeScale === scale;
              return (
                <button
                  key={scale}
                  onClick={() => setActiveScale(scale)}
                  className={`px-3.5 py-2 text-[11px] tracking-wider transition-all border ${
                    isActive 
                      ? 'bg-[#CCFF00] text-zinc-950 border-[#CCFF00] font-bold shadow-sm' 
                      : 'bg-white text-zinc-600 border-zinc-300 hover:border-zinc-900 hover:text-zinc-900'
                  }`}
                >
                  {labelMap[scale]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Status Line */}
      <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs text-zinc-500 mb-4 tracking-wider">
        <span className="w-2 h-2 rounded-full bg-[#CCFF00] inline-block animate-pulse"></span>
        <span className="text-zinc-900 font-semibold">LIVE</span>
        <span>· SHOWING {currentPreset.contenders.length} VERIFIED CONTENDERS</span>
        <span>· TERRITORIAL TITLE OPEN</span>
      </div>

      {/* Map Viewport Container */}
      <div className="max-w-7xl mx-auto relative h-[520px] bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl flex items-center justify-center mb-6">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20"></div>

        {/* Large Background Watermark Typography */}
        <div className="absolute inset-0 flex items-center justify-between px-12 pointer-events-none select-none opacity-10">
          <span className="text-7xl font-bold tracking-tighter text-white">POSTCODE {currentPreset.code}</span>
          <span className="text-7xl font-bold tracking-tighter text-white">{currentPreset.name.split(' ')[0].toUpperCase()}</span>
        </div>

        {/* Concentric Catchment Ring */}
        <div className="absolute w-96 h-96 rounded-full border-2 border-dashed border-[#CCFF00]/40 bg-[#CCFF00]/5 flex items-center justify-center animate-pulse pointer-events-none">
          <div className="absolute top-2 bg-zinc-900/90 border border-zinc-700 text-[#CCFF00] text-[10px] px-2 py-0.5 rounded tracking-widest">
            {activeScale} CATCHMENT ZONE
          </div>
        </div>

        {/* Contender Pins */}
        {currentPreset.contenders.map((contender) => {
          const isSelected = contender.id === selectedContenderId;
          return (
            <div
              key={contender.id}
              onClick={() => setSelectedContenderId(contender.id)}
              className="absolute cursor-pointer group transition-transform hover:scale-110"
              style={{ left: `${contender.x}%`, top: `${contender.y}%` }}
            >
              <div className={`w-3.5 h-3.5 rounded-full border-2 border-black ${isSelected ? 'bg-[#CCFF00] shadow-[0_0_15px_#CCFF00]' : 'bg-white'}`}></div>
              <div className="absolute left-5 -top-1 bg-zinc-900/95 border border-zinc-700 text-white text-[10px] px-2.5 py-1 tracking-wider whitespace-nowrap shadow-xl">
                <span className="text-[#CCFF00] font-bold mr-1.5">{contender.name}</span>
                <span className="text-zinc-400">({contender.category})</span>
              </div>
            </div>
          );
        })}

        {/* Corner Telemetry Readouts */}
        <div className="absolute top-6 left-6 text-[10px] text-zinc-400 tracking-widest font-mono bg-zinc-900/80 px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
          NW · GEOGRAPHIC MAP ENGINE
        </div>
        <div className="absolute top-6 right-6 text-[10px] text-zinc-400 tracking-widest font-mono bg-zinc-900/80 px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
          NE · {selectedPresetKey}
        </div>
      </div>

      {/* Exact Day-Before Matching Cards Under The Map */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Box: Dark Forest / Deep Green Card with Commercial Provenance Copy */}
        <div className="bg-[#0b2916] text-white p-8 rounded-3xl border border-zinc-800 font-mono flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div>
            <div className="flex justify-between items-center mb-6 text-[11px] tracking-widest text-zinc-400 uppercase">
              <span className="bg-[#CCFF00] text-zinc-950 font-bold px-2.5 py-1 rounded text-[10px]">TERRITORIAL TITLE</span>
              <span className="text-zinc-400">ZERO TALENT AGENCY COMMISSIONS</span>
              <span className="text-zinc-400 text-[10px]">FOLIO · {currentPreset.code}</span>
            </div>
            
            <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-4 leading-tight uppercase font-sans">
              Commercial provenance is not national. It is suburban.
            </h3>

            <p className="text-xs text-zinc-300 leading-relaxed tracking-wide mb-6">
              Global federations claim contenders once they hit the podium. Suburban communities fund them in the dark. An emerging athlete commands absolute commercial loyalty across the five-kilometre radius of concrete where they live, train, and eat. tmrw/. clears first-right commercial title for your postcode before the world arrives. One brand per category. Direct to athlete under audited 70/15/15 escrow.
            </p>
          </div>

          <div className="flex justify-between items-end pt-4 border-t border-emerald-900/60 text-[10px] text-zinc-400 tracking-widest">
            <div>
              ACTIVE REGION · POSTCODE {currentPreset.code}
            </div>
            <div className="w-12 h-12 rounded-full bg-[#CCFF00] text-zinc-950 flex flex-col items-center justify-center font-bold text-[9px] leading-tight shadow-lg">
              <span>AUDITED</span>
              <span>70/15/15</span>
              <span>ESCROW</span>
            </div>
          </div>
        </div>

        {/* Right Box: White Card with Exact Header and Metadata */}
        <div className="bg-white text-zinc-900 p-8 rounded-3xl border border-zinc-200 font-mono flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex justify-between items-center mb-6 text-[11px] tracking-widest text-zinc-500 uppercase border-b border-zinc-100 pb-3">
              <span>PARCEL {selectedContender.id.padStart(2, '0')} · {selectedPresetKey.split(' ')[0].toUpperCase()} {currentPreset.code}</span>
              <span className="bg-[#CCFF00] text-zinc-950 font-bold px-2.5 py-1 rounded text-[10px]">AVAILABLE FOR CLAIM</span>
            </div>

            <div className="mb-6">
              <h3 className="text-2xl font-bold text-zinc-900 uppercase font-sans tracking-tight">{selectedContender.name}</h3>
              <p className="text-xs text-zinc-500 tracking-wider mt-1">{selectedContender.role.toUpperCase()}</p>
            </div>

            <div className="space-y-4 text-xs tracking-wide mb-6">
              <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                <span className="text-zinc-500">TERRITORIAL SCALE</span>
                <span className="font-bold text-zinc-900">5KM CONCRETE FOOTPRINT</span>
              </div>
              <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                <span className="text-zinc-500">CATEGORY EXCLUSIVITY</span>
                <span className="font-bold text-zinc-900">SPECIALTY COFFEE & BEVERAGE · OPEN</span>
              </div>
              <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                <span className="text-zinc-500">GRASSROOTS DIVIDEND</span>
                <span className="font-bold text-zinc-900">15% TO CITY OF SYDNEY BASKETBALL ASSN</span>
              </div>
              <div className="flex justify-between items-baseline pt-2">
                <div>
                  <span className="text-[10px] text-zinc-400 block tracking-widest uppercase">MONTHLY COMMERCIAL RETAINER</span>
                  <span className="text-2xl font-bold text-zinc-900 mt-0.5 block">{selectedContender.valuation}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-400 block tracking-widest uppercase">AUDITED CLEARING SCHEDULE</span>
                  <span className="text-[11px] font-semibold text-zinc-700">$525 ATHLETE · $112.50 CLUB · $112.50 ESCROW</span>
                </div>
              </div>
            </div>
          </div>

          <button className="w-full bg-zinc-950 text-white py-3.5 rounded-xl text-xs tracking-widest font-bold hover:bg-zinc-800 transition-colors shadow-md">
            CLAIM EXCLUSIVE POSTCODE RIGHTS →
          </button>
        </div>
      </div>
    </section>
  );
}
