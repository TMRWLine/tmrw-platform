import { useEffect, useState } from 'react';
import { HeroFluidReveal } from './HeroFluidReveal';

interface HeroProps {
  onSponsorAccess: () => void;
  onAthletePortal: () => void;
  FluidCanvas?: typeof HeroFluidReveal;
}

const HERO_ATHLETE_SLIDES = [
  {
    url: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=1600&q=85',
    caption: 'ALI // COMBAT PRECISION',
  },
  {
    url: 'https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&w=1600&q=85',
    caption: 'JORDAN & KOBE // COURT DYNASTY',
  },
  {
    url: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1600&q=85',
    caption: 'FEDERER // SERVICE VECTOR',
  },
  {
    url: 'https://images.unsplash.com/photo-1632245889029-e406faaa34cd?auto=format&fit=crop&w=1600&q=85',
    caption: 'HAMILTON // APEX VELOCITY',
  },
  {
    url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1600&q=85',
    caption: 'JORDAN // VERTICAL ELEVATION',
  },
];

export function Hero({ onSponsorAccess, onAthletePortal, FluidCanvas = HeroFluidReveal }: HeroProps) {
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setCycle((i) => (i + 1) % HERO_ATHLETE_SLIDES.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  const active = HERO_ATHLETE_SLIDES[cycle];

  return (
    <section
      className="hero-section"
      aria-label="TMRW editorial landing"
      style={{ ['--rake-offset' as string]: 'calc(100vh * 0.424475)' }}
    >
      <div className="hero-pane hero-pane-copy">
        <div className="font-mono text-xs tracking-widest uppercase mb-4 flex items-center gap-2">
          <span className="text-white font-bold">tmrw/.</span>
          <span className="text-[#D2FF00] font-semibold">// THE NEW STANDARD</span>
        </div>
        <h1 className="hero-headline tracking-tight">The Stadiums Are Loud. The Suburbs Carry the Soul.</h1>
        <p className="hero-subhead">
          The operating system connecting national brands directly to the players, fighters, and ballers who run
          our neighbourhoods.
        </p>
        <div className="hero-cta-row">
          <button type="button" className="hero-cta-primary" onClick={onAthletePortal}>
            Get Backed as a Player →
          </button>
          <button type="button" className="hero-cta-secondary border-grid" onClick={onSponsorAccess}>
            Sponsor Your Suburbs →
          </button>
        </div>
        <p className="hero-trust text-zinc-400 text-xs font-mono">
          Free forever for players. Zero agency drag for brands. Three thousand verified athletes ready across
          Australia and New Zealand.
        </p>
      </div>
      <div
        className="hero-pane hero-pane-media relative overflow-hidden"
        style={{
          clipPath: 'polygon(calc(15% + var(--rake-offset, 42.4vh)) 0, 100% 0, 100% 100%, 15% 100%)',
        }}
      >
        <FluidCanvas topImageSrc={active.url} bottomImageSrc={active.url} caption={active.caption} />
      </div>
    </section>
  );
}
