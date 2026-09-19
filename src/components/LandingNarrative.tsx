import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { COLLAB_SPLIT, HUNTER_BLIGH_COLLAB_DROPS, SPATIAL_TIERS } from '../types';
import { ReachTermStrip } from './ReachTermStrip';

export function LandingNarrative({
  onSponsor,
  onAthlete,
}: {
  onSponsor: () => void;
  onAthlete: () => void;
}) {
  return (
    <>
      <section className="landing-chapter landing-chapter-cotton" aria-labelledby="chapter-01">
        <p className="landing-kicker font-mono">CHAPTER 01 // CORPORATE &amp; BRAND INFRASTRUCTURE</p>
        <h2 id="chapter-01" className="landing-display">
          Celebrity Jersey Sponsorship Fails Local Retail Networks.
        </h2>
        <p className="landing-telemetry font-mono">
          [POSTGIS SPATIAL PROTOCOL // 100% EXCLUSIVITY // AUDIT READY]
        </p>
        <p className="landing-lede">
          Hyper-local spatial matching, automated Stripe RCTIs, and statutory amateur safeguards —
          without celebrity-jersey waste.
        </p>
        <ReachTermStrip solid className="mb-8" />
        <div className="landing-cols">
          <article>
            <span className="font-mono">01 /</span>
            <h3>Spatial Matching</h3>
            <p>Hyper-local geographic radius targeting against live PostGIS athlete catchments.</p>
          </article>
          <article>
            <span className="font-mono">02 /</span>
            <h3>Automated RCTIs</h3>
            <p>Instant split payments and tax invoices via Stripe Connect settlement rails.</p>
          </article>
          <article>
            <span className="font-mono">03 /</span>
            <h3>Statutory Safeguards</h3>
            <p>Real-time compliance validation for collegiate and amateur talent licences.</p>
          </article>
        </div>
        <button type="button" className="landing-cta-dark" onClick={onSponsor}>
          Launch Enterprise Sponsor Discovery -&gt;
        </button>
      </section>

      <section className="landing-chapter landing-chapter-carbon" aria-labelledby="chapter-02">
        <p className="landing-kicker font-mono landing-kicker-volt">
          CHAPTER 02 // ATHLETE COMMERCIAL ECOSYSTEM
        </p>
        <h2 id="chapter-02" className="landing-display landing-display-light">
          What It Actually Feels Like to Be Backed.
        </h2>
        <p className="landing-lede landing-lede-light">
          Independent merch and NIL valuation with a transparent commercial split.
        </p>
        <div className="landing-merch-card">
          <div className="landing-merch-head">
            <h3>Hunter Bligh · Collab Drops</h3>
            <span className="font-mono">
              {COLLAB_SPLIT.athletePayoutPct}% Athlete / 20% Production / {COLLAB_SPLIT.communityFundPct}% Platform
            </span>
          </div>
          <ul>
            {HUNTER_BLIGH_COLLAB_DROPS.map((drop) => (
              <li key={drop.id}>
                <strong>{drop.title}</strong>
                <em className="font-mono">A${drop.priceAud}</em>
              </li>
            ))}
          </ul>
          <div className="drop-split-row landing-split">
            <div>
              <strong className="drop-split-tag drop-split-tag-cyan">{COLLAB_SPLIT.athletePayoutPct}%</strong>
              <span>Athlete</span>
            </div>
            <div>
              <strong className="drop-split-tag drop-split-tag-white">20%</strong>
              <span>Production</span>
            </div>
            <div>
              <strong className="drop-split-tag drop-split-tag-volt">{COLLAB_SPLIT.communityFundPct}%</strong>
              <span>Platform</span>
            </div>
          </div>
        </div>
        <button type="button" className="landing-cta-volt" onClick={onAthlete}>
          Enter Athlete Portal
          <ArrowRight size={15} />
        </button>
      </section>

      <section className="landing-chapter landing-chapter-carbon landing-chapter-grid" aria-labelledby="chapter-03">
        <p className="landing-kicker font-mono">CHAPTER 03 // CARBON GRID</p>
        <h2 id="chapter-03" className="landing-display landing-display-light">
          Mobilise Postcode Fleets Like Digital Media.
        </h2>
        <p className="landing-lede landing-lede-light">
          Buy reach by radius. Three spatial products, one PostGIS catchment rail.
        </p>
        <div className="catchment-grid landing-tier-grid">
          {SPATIAL_TIERS.map((tier) => (
            <article key={tier.code} className="catchment-card">
              <div className="catchment-card-head">
                <span className="catchment-card-index text-zinc-400 font-mono">
                  {tier.code} {tier.catchment}
                </span>
              </div>
              <h3 className="catchment-card-title text-white font-bold text-xl tracking-tight" style={{ color: '#FFFFFF' }}>
                {tier.title}
              </h3>
              <div className="catchment-card-price font-mono text-white/80">{tier.price}</div>
              <ul className="catchment-card-features">
                {tier.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <button type="button" className="landing-cta-dark landing-cta-on-carbon" onClick={onSponsor}>
          Launch Enterprise Sponsor Discovery -&gt;
        </button>
      </section>

      <LandingFooter />
    </>
  );
}

function LandingFooter() {
  const [clock, setClock] = useState(() => sydneyClock());

  useEffect(() => {
    const id = window.setInterval(() => setClock(sydneyClock()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <footer className="landing-footer font-mono">
      <span>{clock}</span>
      <span>[33.8688° S, 151.2093° E]</span>
      <span className="landing-status">
        <span className="landing-status-node" />
        SYSTEMS OPERATIONAL
      </span>
    </footer>
  );
}

function sydneyClock() {
  return new Date().toLocaleTimeString('en-AU', {
    timeZone: 'Australia/Sydney',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}
