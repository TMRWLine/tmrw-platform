import { LandingStackSlot } from './LandingStack';

export function LandingNarrative({
  onSponsor,
  onAthlete,
}: {
  onSponsor: () => void;
  onAthlete: () => void;
}) {
  return (
    <>
      <LandingStackSlot z={20} surface="cotton" id="the-breakdown">
        <section className="landing-chapter landing-chapter-cotton landing-chapter-flush" aria-labelledby="breakdown-heading">
          <p className="landing-kicker landing-kicker-volt font-mono text-xs tracking-widest uppercase font-semibold text-[#D2FF00] bg-black/90 px-2 py-1 inline-block">
            THE BREAKDOWN
          </p>
          <h2 id="breakdown-heading" className="landing-display">
            The Million-Dollar Vanity Trap
          </h2>
          <p className="landing-lede">
            Plastering a logo across a national broadcast jersey looks impressive in an executive boardroom. It does
            not drive a single customer through a local dealership door, a suburban franchise counter, or a regional
            showroom this weekend. Traditional sports marketing burns millions on the top one per cent, while the
            players who command authentic local respect receive nothing.
          </p>
          <div className="landing-compare">
            <article>
              <h3>The Old Way (Legacy Agencies)</h3>
              <ul>
                <li>Nine-month legal cycles for one marquee athlete.</li>
                <li>Passive broadcast exposure that customers tune out.</li>
                <li>Local franchisees see zero benefit from national ad spend.</li>
                <li>Rising players work second jobs and buy their own boots.</li>
              </ul>
            </article>
            <article>
              <h3>The tmrw/. Standard</h3>
              <ul>
                <li>Mobilise an entire regional fleet of players in seconds.</li>
                <li>Unfiltered community clout within 15km of store doors.</li>
                <li>Direct, measurable customer foot traffic through suburban doors.</li>
                <li>Players get real financial backing and professional status.</li>
              </ul>
            </article>
          </div>
        </section>
      </LandingStackSlot>

      <LandingStackSlot z={30} id="for-players">
        <section className="landing-chapter landing-chapter-carbon landing-chapter-flush" aria-labelledby="players-heading">
          <p className="landing-kicker landing-kicker-volt font-mono text-xs tracking-widest uppercase font-semibold text-[#D2FF00]">
            FOR PLAYERS, FIGHTERS &amp; BALLERS
          </p>
          <h2
            id="players-heading"
            className="landing-display-monumental text-5xl md:text-8xl lg:text-9xl font-extrabold uppercase tracking-tight leading-[0.88]"
          >
            STOP PLAYING FOR <span className="font-serif italic font-normal text-[#D2FF00]">EXPOSURE</span>. GET{' '}
            <span className="font-serif italic font-normal text-[#D2FF00]">BACKED</span>.
          </h2>
          <div className="landing-player-layout">
            <p className="landing-lede landing-lede-light">
              You work a trade shift, hit the gym before sunrise, strap your own ankles, and fight for a first-grade
              spot. You carry the pride of your club, your family, and your postcode. It is time you were treated like
              the asset you are.
            </p>
            <AthleteIdentityShowcase onClaim={onAthlete} />
          </div>
        </section>
      </LandingStackSlot>

      <LandingStackSlot z={40} id="for-brands">
        <section
          className="landing-chapter landing-chapter-carbon landing-chapter-flush"
          aria-labelledby="brands-heading"
        >
          <p className="landing-kicker landing-kicker-volt font-mono text-xs tracking-widest uppercase font-semibold text-[#D2FF00]">
            FOR ENTERPRISE BRANDS &amp; RETAIL NETWORKS
          </p>
          <h2
            id="brands-heading"
            className="landing-display-monumental text-5xl md:text-8xl lg:text-9xl font-extrabold uppercase tracking-tight leading-[0.88]"
          >
            OWN THE <span className="font-serif italic font-normal text-[#D2FF00]">POSTCODE</span>. RUN THE{' '}
            <span className="font-serif italic font-normal text-[#D2FF00]">FLEET</span>.
          </h2>
          <p className="landing-lede landing-lede-light">
            Stop wasting budget on internet banners that people scroll past, or stadium sponsorships that your
            regional store managers resent. Deploy verified athlete fleets straight to your store network like digital
            media.
          </p>
          <div className="landing-feature-grid landing-feature-grid-hairline">
            <article>
              <h3>Direct Neighbourhood Clout</h3>
              <p>
                Place your brand directly on the players your local customers actually watch, talk to, and rally behind
                every weekend within a fifteen-kilometre radius of your doors.
              </p>
            </article>
            <article>
              <h3>End the Franchise Civil War</h3>
              <p>
                Give your regional dealer principals and franchise owners marketing support that actually matters: real
                customer foot traffic on Saturday morning driven by hometown champions.
              </p>
            </article>
            <article>
              <h3>One Master Agreement</h3>
              <p>
                Replace hundreds of separate player, agent, and club negotiations with a single corporate master
                contract. Deploy fifty athletes across fifty suburbs before lunchtime.
              </p>
            </article>
            <article>
              <h3>Deterministic Store Attribution</h3>
              <p>
                Track real-time footfall attribution, brand exposure, and equivalent media value directly on your
                corporate console. Complete brand safety with automated regulatory indemnity.
              </p>
            </article>
          </div>
          <button type="button" className="landing-cta-dark landing-cta-on-carbon" onClick={onSponsor}>
            Book an Enterprise Walkthrough →
          </button>
        </section>
      </LandingStackSlot>

      <LandingStackSlot z={50} id="campaign-architecture">
        <section
          className="landing-chapter landing-chapter-carbon landing-chapter-flush"
          aria-labelledby="pathways-heading"
        >
          <p className="landing-kicker landing-kicker-volt font-mono text-xs tracking-widest uppercase font-semibold text-[#D2FF00]">
            CAMPAIGN ARCHITECTURE
          </p>
          <h2 id="pathways-heading" className="landing-display landing-display-light">
            Deploy Roster Fleets with Software Speed
          </h2>
          <div className="catchment-grid landing-tier-grid">
            <article className="catchment-card">
              <div className="catchment-card-head">
                <span className="catchment-card-index text-zinc-400 font-mono">≤ 5 KM CATCHMENT | In-Kind Drops</span>
              </div>
              <h3 className="catchment-card-title" style={{ color: '#FFFFFF' }}>
                Storefront Radius
              </h3>
              <p className="landing-tier-copy">
                Zero platform fee. Put your boots, training apparel, or hardware straight into the kitbags of rising
                players to lock in authentic, ground-level adoption across key sporting hubs.
              </p>
            </article>
            <article className="catchment-card">
              <div className="catchment-card-head">
                <span className="catchment-card-index text-zinc-400 font-mono">5 – 25 KM CLUSTER | Postcode Hubs</span>
              </div>
              <h3 className="catchment-card-title" style={{ color: '#FFFFFF' }}>
                Metro Reach
              </h3>
              <p className="landing-tier-copy">
                $1,000 to $5,000 per store cluster. Concentrated player fleet activation driving verified foot traffic
                and community loyalty within a fifteen-kilometre store radius.
              </p>
            </article>
            <article className="catchment-card">
              <div className="catchment-card-head">
                <span className="catchment-card-index text-zinc-400 font-mono">&gt; 25 KM NETWORK | Run-of-Network</span>
              </div>
              <h3 className="catchment-card-title" style={{ color: '#FFFFFF' }}>
                Regional IP
              </h3>
              <p className="landing-tier-copy">
                Enterprise master commitment delivering scaled multi-league, multi-city player rosters backed by
                automated compliance and live attribution reporting.
              </p>
            </article>
          </div>
        </section>
      </LandingStackSlot>

      <LandingStackSlot z={60}>
        <section className="landing-chapter landing-chapter-carbon landing-chapter-flush landing-close" aria-labelledby="close-heading">
          <h2 id="close-heading" className="landing-display landing-display-light">
            Own Your Suburbs Before the Whistle Blows.
          </h2>
          <p className="landing-lede landing-lede-light">
            The 2026 season is lining up, and the runway to Brisbane 2032 has already begun. Founding brand partners
            lock complete category exclusivity across their designated postcode clusters. Players claim their backing
            today.
          </p>
          <div className="hero-cta-row">
            <button type="button" className="hero-cta-primary" onClick={onAthlete}>
              Join as a Player (Free) →
            </button>
            <button type="button" className="hero-cta-secondary border-grid" onClick={onSponsor}>
              Lock Category Exclusivity for Brands →
            </button>
          </div>
        </section>
      </LandingStackSlot>

      <LandingFooter onHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
    </>
  );
}

function AthleteIdentityShowcase({ onClaim }: { onClaim: () => void }) {
  return (
    <aside className="athlete-showcase" aria-label="Verified athlete identity">
      <div className="athlete-showcase-tokens">
        <span className="font-mono">[STATUS: VERIFIED ROSTER]</span>
        <span className="font-mono">[SPLIT: 70% DIRECT PAYOUT]</span>
        <span className="font-mono">[LEAGUE CLEARANCE: 100%]</span>
      </div>
      <div className="athlete-notify" role="status">
        <div className="athlete-notify-app">
          <strong>Stripe Connect</strong>
          <span>now</span>
        </div>
        <p>Stripe Connect: A$1,250 deposited from Local Dealer Network for Round 04</p>
      </div>
      <button type="button" className="athlete-showcase-cta" onClick={onClaim}>
        CLAIM YOUR BACKING →
      </button>
    </aside>
  );
}

function LandingFooter({ onHome }: { onHome: () => void }) {
  return (
    <footer className="landing-footer landing-footer-brand landing-footer-stack">
      <button type="button" className="landing-footer-mark" onClick={onHome} aria-label="Return to home">
        <div className="flex items-baseline tracking-tight font-sans font-extrabold text-2xl leading-none">
          <span className="text-[#FFFFFF]">tmrw</span>
          <span className="text-[#FFFFFF] animate-pulse drop-shadow-[0_0_8px_rgba(255,255,255,0.85)] mx-[1px]">
            /
          </span>
          <span className="text-[#FFFFFF]">.</span>
        </div>
        <span className="block text-[10px] font-mono tracking-[0.3em] text-zinc-400 mt-1 uppercase leading-none">
          LINE UP YOUR FUTURE
        </span>
      </button>
      <p className="landing-footer-legal">
        © 2026 tmrw/. All rights reserved. Monolithic Carbon Black (#000000) and Knocked-out White (#FFFFFF) brand
        governance strictly enforced. Australian and New Zealand sports infrastructure.
      </p>
    </footer>
  );
}
