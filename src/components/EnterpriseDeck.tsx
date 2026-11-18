import { X, Check } from 'lucide-react';

/* ---------- Slide 02 — The Institutional Blindspot ---------- */

const BLINDSPOT_ROWS: { dimension: string; legacy: string; tmrw: string }[] = [
  {
    dimension: 'Discovery',
    legacy: 'Manual scouting and word-of-mouth referrals',
    tmrw: 'PostGIS proximity search across the full roster',
  },
  {
    dimension: 'Addressable roster',
    legacy: 'Top 1% of nationally televised athletes',
    tmrw: 'Every registered semi-pro athlete by postcode',
  },
  {
    dimension: 'Deal construction',
    legacy: 'Bespoke legal drafting per agreement',
    tmrw: 'Templated tiers with automated compliance checks',
  },
  {
    dimension: 'Time to activation',
    legacy: '6–12 weeks of agency negotiation',
    tmrw: 'Same-day checkout and licence issuance',
  },
  {
    dimension: 'Compliance',
    legacy: 'Manual review of league and tax obligations',
    tmrw: 'Built-in NRL TPA and Shute Shield cap enforcement',
  },
  {
    dimension: 'Payout rails',
    legacy: 'Invoices reconciled by hand, 60–90 day terms',
    tmrw: 'Stripe Connect split payments with RCTI statements',
  },
  {
    dimension: 'Unit economics',
    legacy: '20–30% agency commission on a handful of deals',
    tmrw: 'Platform fee across a long tail of activations',
  },
];

export function InstitutionalBlindspot() {
  return (
    <section className="deck-section">
      <div className="deck-head">
        <span className="deck-slide-no">Slide 02</span>
        <h2>The Institutional Blindspot</h2>
        <p>
          Legacy representation is built to service the athletes who already have
          national coverage. The regional roster is left commercially unaddressed.
        </p>
      </div>

      <div className="blindspot-table" role="table" aria-label="Legacy talent representation versus tmrw SaaS">
        <div className="blindspot-row blindspot-row-head" role="row">
          <div className="blindspot-cell" role="columnheader">
            Dimension
          </div>
          <div className="blindspot-cell blindspot-legacy" role="columnheader">
            <X size={13} /> Legacy Talent Representation
          </div>
          <div className="blindspot-cell blindspot-tmrw" role="columnheader">
            <Check size={13} /> tmrw/. SaaS
          </div>
        </div>
        {BLINDSPOT_ROWS.map((row) => (
          <div className="blindspot-row" role="row" key={row.dimension}>
            <div className="blindspot-cell blindspot-dimension" role="cell">
              {row.dimension}
            </div>
            <div className="blindspot-cell blindspot-legacy" role="cell">
              {row.legacy}
            </div>
            <div className="blindspot-cell blindspot-tmrw" role="cell">
              {row.tmrw}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Slide 05 — 10-Flow Lifecycle ---------- */

const LIFECYCLE_FLOWS: { title: string; detail: string }[] = [
  { title: 'Onboard', detail: 'Athlete registers with postcode and league identity' },
  { title: 'Verify', detail: 'Identity, age, and competition eligibility checks' },
  { title: 'Geocode', detail: 'Address resolved to a PostGIS geography point' },
  { title: 'Index', detail: 'Match footage ingested and indexed for key events' },
  { title: 'Discover', detail: 'Sponsor searches the roster by catchment radius' },
  { title: 'Select tier', detail: 'Storefront, metro, or regional IP package chosen' },
  { title: 'Comply', detail: 'League caps and third-party agreement rules enforced' },
  { title: 'Licence', detail: 'Master licence issued and IP lock applied' },
  { title: 'Activate', detail: 'Branded vertical assets delivered to the sponsor' },
  { title: 'Settle', detail: 'Split payout executed with RCTI statement issued' },
];

export function LifecycleStrip() {
  return (
    <section className="deck-section">
      <div className="deck-head">
        <span className="deck-slide-no">Slide 05</span>
        <h2>10-Flow Lifecycle</h2>
        <p>Every sponsorship moves through the same instrumented sequence, end to end.</p>
      </div>

      <ol className="lifecycle-strip">
        {LIFECYCLE_FLOWS.map((flow, i) => (
          <li className="lifecycle-step" key={flow.title}>
            <span className="lifecycle-step-no">{String(i + 1).padStart(2, '0')}</span>
            <span className="lifecycle-step-title">{flow.title}</span>
            <span className="lifecycle-step-detail">{flow.detail}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
