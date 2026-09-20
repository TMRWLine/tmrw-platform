import { HeroFluidReveal } from './HeroFluidReveal';

interface HeroProps {
  onSponsorAccess: () => void;
  onAthletePortal: () => void;
  FluidCanvas?: typeof HeroFluidReveal;
}

const HERO_TENNIS =
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=2400&q=90';

export function Hero({ onSponsorAccess, onAthletePortal, FluidCanvas = HeroFluidReveal }: HeroProps) {
  return (
    <section className="hero-section relative min-h-screen overflow-hidden bg-transparent" aria-label="TMRW editorial landing">
      <div className="hero-pane hero-pane-media absolute inset-0 z-0 overflow-hidden">
        <FluidCanvas imageSrc={HERO_TENNIS} />
        <div className="hero-legibility pointer-events-none absolute inset-0 z-[2]" aria-hidden="true" />
      </div>
      <div className="hero-pane hero-pane-copy relative z-10 pt-32 md:pt-40 pb-16 px-8 md:px-16">
        <div className="font-mono text-xs tracking-widest uppercase mb-4 flex items-center gap-2">
          <span className="text-white font-bold">
            tmrw<span className="text-[#D2FF00]">/.</span>
          </span>
          <span className="text-[#D2FF00] font-semibold">// THE SOVEREIGN TALENT NETWORK</span>
        </div>
        <h1 className="hero-headline text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tight leading-[0.88] text-white">
          THE <span className="font-serif italic font-normal text-[#D2FF00]">STADIUMS</span> ARE LOUD. THE{' '}
          <span className="font-serif italic font-normal text-[#D2FF00]">SUBURBS</span> CARRY THE SOUL.
        </h1>
        <p className="text-zinc-400 text-sm md:text-base max-w-xl mt-6 leading-relaxed">
          We connect enterprise capital directly to the athletes, fighters, and ballers who command local culture. Zero
          agency tax. Automated compliance. Real backing before the opening whistle.
        </p>
        <div className="hero-cta-row">
          <button type="button" className="hero-cta-primary" onClick={onAthletePortal}>
            Get Backed as an Athlete →
          </button>
          <button type="button" className="hero-cta-secondary border-grid" onClick={onSponsorAccess}>
            Sponsor Your Suburbs →
          </button>
        </div>
        <div className="inline-flex items-center gap-4 px-4 py-2 border border-white/10 bg-white/[0.02] backdrop-blur-md mt-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D2FF00] animate-pulse" />
          <span className="font-mono text-[10px] tracking-widest text-zinc-300">3,000 VERIFIED ATHLETES</span>
          <span className="text-white/20">//</span>
          <span className="font-mono text-[10px] tracking-widest text-zinc-400">BRISBANE 2032 RUNWAY</span>
          <span className="text-white/20">//</span>
          <span className="font-mono text-[10px] tracking-widest text-[#D2FF00]">ZERO LEGAL FRICTION</span>
        </div>
      </div>
    </section>
  );
}
