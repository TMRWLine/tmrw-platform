import { ArrowRight, TrendingUp, ShieldCheck, MapPin, Clapperboard } from 'lucide-react';

interface HeroProps {
  onExplore: () => void;
  onMediaStudio: () => void;
}

export function Hero({ onExplore, onMediaStudio }: HeroProps) {
  return (
    <section className="hero-section">
      <div className="hero-grid">
        {/* Left Column — 58% */}
        <div className="hero-content-col">
          <div className="hero-eyebrow">
            <span>[ POSTCODE HERO MARKETPLACE // PROTOCOL ]</span>
          </div>

          <h1 className="hero-headline">
            Programmatic Sports Infrastructure for Enterprise Brands
          </h1>

          <p className="hero-value-statement">
            Deploy targeted in-kind and monetary sponsorship across regional athlete rosters
            by postcode with automated compliance and split-payout execution.
          </p>

          <div className="hero-kpi-row">
            <div className="hero-kpi-card">
              <TrendingUp size={16} className="hero-kpi-icon" />
              <div className="hero-kpi-value">$8.4M</div>
              <div className="hero-kpi-label">Pipeline Value</div>
            </div>
            <div className="hero-kpi-card">
              <ShieldCheck size={16} className="hero-kpi-icon" />
              <div className="hero-kpi-value">11</div>
              <div className="hero-kpi-label">Signed Master Licences</div>
            </div>
            <div className="hero-kpi-card">
              <MapPin size={16} className="hero-kpi-icon" />
              <div className="hero-kpi-value">18 km</div>
              <div className="hero-kpi-label">Average Proximity Match</div>
            </div>
          </div>

          <div className="hero-cta-row">
            <button className="hero-cta-primary" onClick={onExplore}>
              Explore Athlete Roster
              <ArrowRight size={15} />
            </button>
            <button className="hero-cta-secondary" onClick={onMediaStudio}>
              <Clapperboard size={14} />
              AI Media Studio
            </button>
          </div>
        </div>

        {/* Right Column — 42% — 23° Kinetic Image Mask */}
        <div className="hero-image-col">
          <div className="hero-kinetic-frame">
            <img
              className="hero-kinetic-image"
              src="https://images.pexels.com/photos/4761359/pexels-photo-4761359.jpeg?auto=compress&cs=tinysrgb&w=1200"
              alt="Sprinter in kinetic motion"
              loading="eager"
            />
            <div className="hero-kinetic-overlay" />
          </div>
          <div className="hero-angle-marker">23.0° RAKE</div>
        </div>
      </div>
    </section>
  );
}
