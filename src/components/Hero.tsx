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
    <section className="hero-section relative h-screen min-h-screen max-h-screen overflow-hidden bg-transparent pointer-events-none" aria-label="TMRW editorial landing">
      <div className="hero-pane-media absolute inset-0 w-full h-full pointer-events-auto z-0">
        <FluidCanvas imageSrc={HERO_TENNIS} />
        <div className="hero-legibility pointer-events-none absolute inset-0 z-[2]" aria-hidden="true" />
      </div>
      <div className="hero-pane hero-pane-copy relative z-10 w-full h-screen min-h-screen max-h-screen overflow-hidden flex flex-col justify-start pt-32 md:pt-40 pb-12 px-8 md:px-16 bg-transparent pointer-events-none">
        <div>
          <div className="font-mono text-xs tracking-widest uppercase mb-4 flex items-center gap-2">
            <span className="text-white font-bold">
              tmrw<span className="text-[#D2FF00]">/.</span>
            </span>
            <span className="text-[#D2FF00] font-semibold">// THE SOVEREIGN TALENT NETWORK</span>
          </div>
          <h1 className="hero-headline text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tight !leading-[0.88] text-white">
            THE <span className="font-serif italic font-normal text-[#D2FF00]">STADIUMS</span> ARE LOUD. THE{' '}
            <span className="font-serif italic font-normal text-[#D2FF00]">SUBURBS</span> CARRY THE SOUL.
          </h1>
          <p className="text-zinc-400 text-sm md:text-base max-w-xl mt-6 leading-relaxed">
            We connect enterprise capital directly to the athletes, fighters, and ballers who command local culture.
            Automated compliance. Direct deployment. Real backing before the opening whistle.
          </p>
          <div className="hero-cta-row flex-nowrap pointer-events-auto">
            <button type="button" className="hero-cta-primary pointer-events-auto" onClick={onAthletePortal}>
              Get Backed as an Athlete →
            </button>
            <button type="button" className="hero-cta-secondary border-grid pointer-events-auto" onClick={onSponsorAccess}>
              Sponsor Your Suburbs →
            </button>
          </div>
          <p className="mt-8 font-mono text-[10px] tracking-[0.18em] uppercase text-zinc-500 m-0">
            Statutory compliance engine active // Automated amateur eligibility protection
          </p>
        </div>
      </div>
    </section>
  );
}
