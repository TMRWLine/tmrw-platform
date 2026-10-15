import React from 'react';

interface CoverHeroProps {
  onAthletePortal?: () => void;
  onSponsorAccess?: () => void;
  onSection?: (section: string) => void;
}

export const CoverHero: React.FC<CoverHeroProps> = ({
  onAthletePortal,
  onSponsorAccess,
  onSection,
}) => {
  return (
    <section className="relative w-full h-screen bg-[#060709] overflow-hidden select-none">
      {/* Stadium Photographic Plate */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img
          src="/coverpage.jpg"
          alt="Stadium Atmosphere"
          className="w-full h-full object-cover object-[center_34%]"
          style={{ filter: 'contrast(125%) saturate(145%) brightness(92%)' }}
        />
        
        {/* Halogen Floodlight Bloom */}
        <div className="absolute top-0 inset-x-0 h-[420px] bg-gradient-to-b from-amber-500/25 via-amber-900/10 to-transparent pointer-events-none mix-blend-screen z-10" />

        {/* Inky Optical Text Pocket */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_50%_35%,_rgba(6,7,9,0.92)_0%,_rgba(6,7,9,0.45)_55%,_transparent_80%)] pointer-events-none z-10" />

        {/* Tactile 35mm Film Grain Emulsion */}
        <div
          className="absolute inset-0 pointer-events-none z-20 opacity-20 mix-blend-screen"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
          }}
        />
      </div>

      {/* Vertical Broadsheet Touchlines */}
      <div className="absolute top-0 bottom-0 left-[14%] w-[1px] bg-white/30 pointer-events-none z-30" />
      <div className="absolute top-0 bottom-0 right-[14%] w-[1px] bg-white/30 pointer-events-none z-30" />

      {/* Top Masthead */}
      <header className="absolute top-0 inset-x-0 px-8 lg:px-12 py-6 flex items-center justify-between z-40">
        <div className="flex flex-col">
          <div className="flex items-baseline font-black tracking-[-0.04em] text-white text-2xl leading-none">
            tmrw<span className="text-[#D2FF00]">/</span><span className="inline-block w-1.5 h-1.5 rounded-full bg-[#D2FF00] ml-0.5" />
          </div>
          <span className="font-mono text-[9px] tracking-[0.28em] text-white/80 uppercase mt-1.5 font-semibold">
            LINE UP YOUR FUTURE
          </span>
        </div>

        {/* Dead-Centred Navigation Capsule */}
        <nav className="absolute left-1/2 -translate-x-1/2 top-6">
          <div className="flex items-center gap-6 px-6 py-2 rounded-full bg-black/60 border border-white/20 backdrop-blur-md">
            <span onClick={() => onSection?.('roster')} className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/80 hover:text-white cursor-pointer transition-colors">01 // ROSTER</span>
            <span onClick={() => onSection?.('enterprise')} className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/80 hover:text-white cursor-pointer transition-colors">02 // ENTERPRISE</span>
            <span onClick={() => onSection?.('infrastructure')} className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/80 hover:text-white cursor-pointer transition-colors">03 // INFRASTRUCTURE</span>
            <span onClick={() => onSection?.('manifesto')} className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/80 hover:text-white cursor-pointer transition-colors">04 // MANIFESTO</span>
          </div>
        </nav>

        <div className="w-24 pointer-events-none" />
      </header>

      {/* Monolithic Broadsheet Typography */}
      <div className="absolute top-[14%] inset-x-0 z-30 max-w-4xl mx-auto text-center px-4 flex flex-col items-center pointer-events-none">
        <h1 className="whitespace-nowrap font-extrabold tracking-[-0.04em] leading-none uppercase text-white text-[clamp(2rem,3.8vw,3.65rem)]">
          YOU OWN THE GAME<span className="inline-block text-[#D2FF00] drop-shadow-[0_0_14px_#D2FF00]">.</span>
        </h1>
        <h2 className="whitespace-nowrap font-extrabold tracking-[-0.04em] leading-none uppercase text-white text-[clamp(2rem,3.8vw,3.65rem)] mt-2">
          NOW OWN THE BAG<span className="inline-block text-[#D2FF00] drop-shadow-[0_0_14px_#D2FF00]">.</span>
        </h2>
        <p className="max-w-lg mx-auto text-center mt-5 text-[14px] leading-relaxed text-white font-medium font-sans drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
          The sovereign commercial network for suburban sport. Local businesses secure exclusive 15km retail territory. Representative athletes clear guaranteed match fees before kickoff.
        </p>
      </div>

      {/* 22-Metre Pitch Geometry & Docked Actions */}
      <div className="absolute top-[74%] inset-x-0 -translate-y-1/2 z-30">
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[1px] bg-white/70 shadow-[0_0_12px_rgba(255,255,255,0.6)]" />

        {/* Pitch Reticles */}
        <div className="absolute left-[14%] top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#060709] px-2 py-0.5 border border-white/20 rounded z-10">
          <span className="text-[#D2FF00] font-mono text-[11px] leading-none">+</span>
          <span className="font-mono text-[8px] tracking-[0.24em] text-white">22M // MARK</span>
        </div>
        <div className="absolute right-[14%] top-1/2 -translate-y-1/2 translate-x-1/2 flex items-center gap-2 bg-[#060709] px-2 py-0.5 border border-white/20 rounded z-10">
          <span className="font-mono text-[8px] tracking-[0.24em] text-white">22M // MARK</span>
          <span className="text-[#D2FF00] font-mono text-[11px] leading-none">+</span>
        </div>

        {/* Action Triggers */}
        <div className="relative flex items-center justify-center gap-4 z-20 pointer-events-auto">
          <button
            onClick={onAthletePortal}
            className="bg-white text-[#060709] font-mono text-[11px] uppercase tracking-[0.16em] px-8 py-3.5 rounded-full hover:bg-[#D2FF00] hover:text-[#060709] transition-all duration-200 active:scale-[0.98] shadow-[0_0_30px_rgba(255,255,255,0.35)] font-semibold"
          >
            Get Backed as an Athlete -&gt;
          </button>
          <button
            onClick={onSponsorAccess}
            className="border border-white/40 bg-black/60 text-white font-mono text-[11px] uppercase tracking-[0.16em] px-8 py-3.5 rounded-full hover:bg-white/15 transition-all duration-200 active:scale-[0.98] backdrop-blur-md font-semibold"
          >
            Sponsor Your Suburbs -&gt;
          </button>
        </div>
      </div>

      {/* Pinned Baseline Rule */}
      <footer className="absolute bottom-0 inset-x-0 px-8 lg:px-12 py-4 border-t border-white/15 flex items-center justify-between z-40 bg-gradient-to-t from-[#060709] to-transparent">
        <span className="font-mono text-[10px] tracking-[0.2em] text-white animate-pulse font-semibold">
          [ SCROLL ↓ ]
        </span>
        <span className="font-mono text-[9px] tracking-[0.2em] text-white font-medium">
          BRISBANE 2032 RUNWAY // REGULATORY BYLAWS CLEARED // AUSTRALIA &amp; NEW ZEALAND EST. 2026
        </span>
      </footer>
    </section>
  );
};

export default CoverHero;