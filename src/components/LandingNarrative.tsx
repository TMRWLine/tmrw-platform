import type { Ref } from 'react';
import { BrandLockup, LandingStackSlot } from './LandingStack';

export function LandingNarrative({
  onSponsor,
  onAthlete,
  horizontalSectionRef,
  horizontalTrackRef,
}: {
  onSponsor: () => void;
  onAthlete: () => void;
  horizontalSectionRef: Ref<HTMLDivElement>;
  horizontalTrackRef: Ref<HTMLDivElement>;
}) {
  return (
    <>
      <LandingStackSlot z={20} id="the-breakdown" padded>
        <section className="landing-chapter landing-chapter-carbon landing-chapter-flush bg-transparent" aria-labelledby="breakdown-heading">
          <div className="font-mono text-xs tracking-widest uppercase mb-4 text-[#D2FF00]">
            // THE ARBITRAGE
          </div>
          <h2
            id="breakdown-heading"
            className="text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tight leading-[0.88] text-white max-w-6xl"
          >
            THE MILLION-DOLLAR VANITY <span className="font-serif italic font-normal text-[#D2FF00]">TRAP.</span>
          </h2>
          <p className="text-base md:text-lg text-zinc-400 max-w-3xl leading-relaxed mt-6">
            A broadcast logo on a national jersey buys boardroom ego. It does not put a single paying customer through
            a suburban dealership, showroom, or retail register this Saturday. Traditional sports agencies burn eight
            figures chasing the top one per cent. We decentralise that capital into the hometown champions your
            customers actually follow, trust, and emulate.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-6xl mt-8">
            <article className="border border-white/10 bg-white/[0.015] backdrop-blur-md p-8 relative overflow-hidden">
              <div className="font-mono text-[11px] tracking-widest text-zinc-500 uppercase pb-4 border-b border-white/10 flex justify-between">
                <span>THE OLD WAY // LEGACY AGENCIES</span>
                <span className="text-zinc-600">[DEPRECATING]</span>
              </div>
              <ul className="space-y-4 pt-6 m-0 list-none p-0">
                {[
                  'Nine-month legal cycles for a single jersey patch.',
                  'Passive broadcast airtime that viewers scroll past.',
                  'Store managers watch central marketing budgets vanish.',
                  'First-graders work shifts and buy their own boots.',
                ].map((item) => (
                  <li key={item} className="text-zinc-400 font-mono text-xs leading-relaxed flex items-start gap-3">
                    <span className="text-zinc-600 shrink-0" aria-hidden="true">
                      —
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
            <article className="border border-[#D2FF00]/30 bg-[#D2FF00]/[0.02] backdrop-blur-md p-8 relative overflow-hidden shadow-[0_0_50px_rgba(210,255,0,0.03)]">
              <div className="font-mono text-[11px] tracking-widest text-[#D2FF00] uppercase pb-4 border-b border-white/10 flex justify-between items-center">
                <span className="font-bold">THE TMRW/. STANDARD</span>
                <span className="text-[10px] text-black bg-[#D2FF00] px-2 py-0.5 font-mono font-bold tracking-wider">
                  ACTIVE DEPLOYMENT
                </span>
              </div>
              <ul className="space-y-4 pt-6 m-0 list-none p-0">
                {[
                  'Deploy fifty verified hometown athletes before kickoff.',
                  'Unfiltered community loyalty within fifteen kilometres of your doors.',
                  'Measurable customer foot traffic on Saturday morning.',
                  'Direct contractual backing and verified commercial status.',
                ].map((item) => (
                  <li key={item} className="text-white font-mono text-xs leading-relaxed flex items-start gap-3">
                    <span
                      className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#D2FF00] shrink-0"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>
      </LandingStackSlot>

      <LandingStackSlot z={30} id="for-players" padded>
        <section className="landing-chapter landing-chapter-carbon landing-chapter-flush bg-transparent" aria-labelledby="players-heading">
          <p className="landing-kicker landing-kicker-volt font-mono text-xs tracking-widest uppercase text-[#D2FF00]">
            SOVEREIGN TALENT
          </p>
          <div className="landing-player-layout">
            <div>
              <h2
                id="players-heading"
                className="landing-display-monumental text-4xl md:text-6xl lg:text-7xl font-extrabold uppercase tracking-tight leading-[0.88]"
              >
                STOP CHASING <span className="font-serif italic font-normal text-[#D2FF00]">HANDOUTS</span>. OWN YOUR{' '}
                <span className="font-serif italic font-normal text-[#D2FF00]">TURF</span>.
              </h2>
              <p className="landing-lede landing-lede-light">
                You pull the early shifts. You strap your own ankles. You win the collisions when nobody is watching.
                You run your neighbourhood. It is time your bank account reflected your cultural leverage.
              </p>
              <button
                type="button"
                onClick={onAthlete}
                className="bg-[#D2FF00] text-black font-mono font-bold text-xs uppercase tracking-widest px-8 py-4 transition-transform hover:scale-[1.02] border-0 cursor-pointer"
              >
                CLAIM YOUR ATHLETE PROFILE →
              </button>
            </div>
            <AthleteTelemetryPanel />
          </div>
        </section>
      </LandingStackSlot>

      <div
        ref={horizontalSectionRef}
        id="horizontal-wrapper"
        className="landing-hslide relative w-full h-screen overflow-hidden bg-transparent"
        style={{ zIndex: 30 }}
      >
        <div ref={horizontalTrackRef} id="horizontal-slider" className="landing-h-track flex w-[200vw] h-full">
          <div
            id="for-brands"
            className="landing-h-panel relative w-screen h-screen flex-shrink-0 overflow-hidden flex flex-col justify-between p-10 md:p-20 pt-[88px] bg-transparent"
          >
            <section className="landing-chapter landing-chapter-carbon landing-h-copy bg-transparent" aria-labelledby="brands-heading">
              <p className="landing-kicker landing-kicker-volt font-mono text-xs tracking-widest uppercase text-[#D2FF00]">
                LOCAL DOMINANCE
              </p>
              <h2
                id="brands-heading"
                className="landing-display-monumental text-4xl md:text-6xl lg:text-7xl font-extrabold uppercase tracking-tight leading-[0.88]"
              >
                OWN THE <span className="font-serif italic font-normal text-[#D2FF00]">POSTCODE</span>. RUN THE{' '}
                <span className="font-serif italic font-normal text-[#D2FF00]">FLEET</span>.
              </h2>
              <p className="landing-lede landing-lede-light">
                Stop setting marketing capital on fire across digital ad networks that customers tune out. Turn suburban
                sports gravity into an unfair retail distribution advantage.
              </p>
              <div className="landing-feature-grid landing-feature-grid-hairline">
                <article>
                  <h3>Hyper-Local Catchment Gravity</h3>
                  <p>
                    Place your brand on the athletes your local customers actually watch, talk to, and rally behind
                    every weekend within a fifteen-kilometre radius of your doors.
                  </p>
                </article>
                <article>
                  <h3>Eliminate Dealer Disconnect</h3>
                  <p>
                    Give regional dealer principals and franchise owners marketing support that actually matters: real
                    Saturday foot traffic driven by hometown champions.
                  </p>
                </article>
                <article>
                  <h3>Single-Signature Execution</h3>
                  <p>
                    Replace hundreds of separate player, agent, and club negotiations with one corporate master
                    contract. Deploy fifty athletes across fifty suburbs before lunchtime.
                  </p>
                </article>
                <article>
                  <h3>Deterministic Attribution</h3>
                  <p>
                    Track real-time footfall, brand exposure, and equivalent media value on the corporate console.
                    Complete brand safety with automated regulatory indemnity.
                  </p>
                </article>
              </div>
              <button type="button" className="landing-cta-dark landing-cta-on-carbon" onClick={onSponsor}>
                Request Enterprise Access →
              </button>
            </section>
          </div>

          <div
            id="campaign-architecture"
            className="landing-h-panel relative w-screen h-screen flex-shrink-0 overflow-hidden flex flex-col justify-between p-10 md:p-20 pt-[88px] bg-transparent"
          >
            <section
              className="landing-chapter landing-chapter-carbon landing-h-copy bg-transparent"
              aria-labelledby="pathways-heading"
            >
              <p className="landing-kicker landing-kicker-volt font-mono text-xs tracking-widest uppercase text-[#D2FF00]">
                ROSTER SPECIFICATIONS
              </p>
              <h2
                id="pathways-heading"
                className="landing-display-monumental text-4xl md:text-6xl lg:text-7xl font-extrabold uppercase tracking-tight leading-[0.88]"
              >
                DEPLOY ROSTER FLEETS WITH{' '}
                <span className="font-serif italic font-normal text-[#D2FF00]">SOFTWARE SPEED</span>.
              </h2>
              <div className="catchment-grid landing-tier-grid">
                <article className="catchment-card">
                  <div className="catchment-card-head">
                    <span className="catchment-card-index text-zinc-400 font-mono">
                      ≤ 5 KM RADIUS | In-Kind Drops
                    </span>
                  </div>
                  <h3 className="catchment-card-title" style={{ color: '#FFFFFF' }}>
                    Storefront Radius
                  </h3>
                  <p className="landing-tier-copy">
                    Zero platform fee. Put boots, training apparel, or hardware straight into the kitbags of rising
                    players to lock authentic, ground-level adoption across key sporting hubs.
                  </p>
                </article>
                <article className="catchment-card">
                  <div className="catchment-card-head">
                    <span className="catchment-card-index text-zinc-400 font-mono">
                      5 – 25 KM CLUSTER | A$2,000 – A$8,000 per Cluster
                    </span>
                  </div>
                  <h3 className="catchment-card-title" style={{ color: '#FFFFFF' }}>
                    Metro Reach
                  </h3>
                  <p className="landing-tier-copy">
                    Concentrated player fleet activation driving verified foot traffic and community loyalty within a
                    fifteen-kilometre store radius.
                  </p>
                </article>
                <article className="catchment-card">
                  <div className="catchment-card-head">
                    <span className="catchment-card-index text-zinc-400 font-mono">
                      &gt; 25 KM NETWORK | Enterprise Commitment
                    </span>
                  </div>
                  <h3 className="catchment-card-title" style={{ color: '#FFFFFF' }}>
                    Regional IP
                  </h3>
                  <p className="landing-tier-copy">
                    Scaled multi-league, multi-city player rosters backed by automated compliance and live attribution
                    reporting.
                  </p>
                </article>
              </div>
            </section>
          </div>
        </div>
      </div>

      <LandingStackSlot z={40} id="closing-conversion" padded>
        <section className="landing-chapter landing-chapter-carbon landing-chapter-flush landing-close bg-transparent" aria-labelledby="close-heading">
          <p className="landing-kicker landing-kicker-volt font-mono text-xs tracking-widest uppercase text-[#D2FF00]">
            THE 2026 RUNWAY
          </p>
          <h2 id="close-heading" className="landing-display landing-display-light">
            Own Your Postcodes Before the Opening Whistle.
          </h2>
          <p className="landing-lede landing-lede-light">
            The season is lining up, and the runway to Brisbane 2032 is live. Founding enterprise partners lock complete
            category exclusivity across their designated regional clusters. Elite talent secures backing today.
          </p>
          <div className="hero-cta-row">
            <button type="button" className="hero-cta-primary" onClick={onAthlete}>
              Join as an Athlete (Free) →
            </button>
            <button type="button" className="hero-cta-secondary border-grid" onClick={onSponsor}>
              Lock Category Exclusivity →
            </button>
          </div>
        </section>
      </LandingStackSlot>

      <LandingFooter onHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
    </>
  );
}

function AthleteTelemetryPanel() {
  return (
    <aside
      className="athlete-telemetry border border-white/10 bg-white/[0.02] backdrop-blur-md p-8 relative overflow-hidden"
      aria-label="Athlete telemetry"
    >
      <div className="athlete-telemetry-head font-mono">
        <span>[SPECIMEN 001 // VERIFIED ROSTER]</span>
        <span className="text-[#D2FF00]">[STATUS: ACTIVE]</span>
      </div>
      <div className="athlete-metric-grid">
        <article>
          <p>Direct Payout Split</p>
          <strong className="text-2xl font-bold text-white font-mono">70% NET DISBURSEMENT</strong>
        </article>
        <article>
          <p>Legal Clearance</p>
          <strong className="text-2xl font-bold text-white font-mono">100% REGULATORY AUDIT</strong>
        </article>
        <article>
          <p>Settlement Speed</p>
          <strong className="text-2xl font-bold text-white font-mono">&lt; 24H VERIFIED DEPLOYMENT</strong>
        </article>
        <article>
          <p>Target Catchment</p>
          <strong className="text-2xl font-bold text-white font-mono">15KM POSTCODE GRAVITY</strong>
        </article>
      </div>
      <p className="text-[11px] text-zinc-400 font-mono pt-4 border-t border-white/10">
        SETTLEMENT: A$1,250.00 // STRIPE CONNECT RAIL // CLEARED FOR MATCH DAY
      </p>
    </aside>
  );
}

function LandingFooter({ onHome }: { onHome: () => void }) {
  return (
    <footer className="landing-footer landing-footer-brand landing-footer-stack">
      <BrandLockup onClick={onHome} size="footer" />
      <p className="landing-footer-legal">
        © 2026 tmrw/. All rights reserved. Sovereign sports commercialisation infrastructure for Australia and New
        Zealand.
      </p>
    </footer>
  );
}
