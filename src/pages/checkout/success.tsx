import React, { useMemo } from 'react';
import { BrandLockup } from '../../components/BrandLockup';
import {
  getCommercialPackage,
  mockDeliverables,
  toCommercialAthlete,
  type CommercialAthlete,
  type CommercialPackage,
} from '../../data/mockDeliverables';
import { CHECKOUT_SUCCESS_PATH } from '../../lib/checkout';
import { formatAud } from '../../lib/formatMoney';
import { ROSTER_DATA } from '../../data/roster';

export { CHECKOUT_SUCCESS_PATH };

const MILESTONES = [
  { id: 'escrow', label: 'Escrow Funded', detail: 'Stripe Connect is holding the flight in escrow.', done: true },
  {
    id: 'integrity',
    label: 'Sport Integrity Australia Cleared',
    detail: 'Athlete pre-cleared against SIA guidelines and NSO bylaws.',
    done: true,
  },
  { id: 'content', label: 'Content Scheduled', detail: 'Production window locks after brand kit confirmation.', done: false },
  { id: 'release', label: 'Final Release', detail: '70/15/15 disbursement on verified delivery.', done: false },
] as const;

function resolveAthlete(athleteId: string | null): CommercialAthlete {
  if (athleteId && athleteId === mockDeliverables.athlete.id) {
    return mockDeliverables.athlete;
  }
  const roster = athleteId ? ROSTER_DATA.find((entry) => entry.id === athleteId) : undefined;
  if (roster) return toCommercialAthlete(roster.record);
  return mockDeliverables.athlete;
}

function dealReference(sessionId: string | null, athleteId: string, tierId: string): string {
  const sessionTail = (sessionId ?? 'DEMO').replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase();
  const athleteTail = athleteId.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase();
  const tierTail = tierId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
  return `TMRW-${tierTail || 'TIER'}-${athleteTail || 'ATH'}-${sessionTail || 'ESCROW'}`;
}

function downloadRcti(args: {
  reference: string;
  athlete: CommercialAthlete;
  pkg: CommercialPackage;
}) {
  const { reference, athlete, pkg } = args;
  const gst = Math.round(pkg.price_aud * 0.1 * 100) / 100;
  const totalIncGst = Math.round((pkg.price_aud + gst) * 100) / 100;
  const issued = new Date().toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const locality = [athlete.grassroots_club.suburb, athlete.grassroots_club.state]
    .filter((part) => part.trim().length > 0)
    .join(', ');

  const html = `<!DOCTYPE html>
<html lang="en-AU">
<head>
  <meta charset="utf-8" />
  <title>RCTI ${reference}</title>
  <style>
    body { font-family: Inter, Helvetica, Arial, sans-serif; color: #0F0F11; background: #F8F9FA; padding: 48px; }
    main { max-width: 640px; margin: 0 auto; background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 40px; }
    h1 { font-size: 22px; margin: 0 0 8px; }
    p, dt, dd { font-size: 13px; line-height: 1.5; }
    .meta { color: #666; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; }
    dl { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
    dt { color: #666; margin: 0; } dd { margin: 4px 0 0; font-weight: 700; }
    .note { margin-top: 28px; font-size: 11px; color: #666; }
  </style>
</head>
<body>
  <main>
    <p class="meta">tmrw/. · Recipient Created Tax Invoice</p>
    <h1>${reference}</h1>
    <p>ATO Income Tax Assessment Act 1997 s 153-50. Recipient-created tax invoice issued by tmrw/. as the recipient of a taxable supply from the athlete supplier.</p>
    <dl>
      <div><dt>Issued</dt><dd>${issued}</dd></div>
      <div><dt>Supplier (athlete)</dt><dd>${athlete.full_name}</dd></div>
      <div><dt>Grassroots club</dt><dd>${athlete.grassroots_club.name}${locality ? ` · ${locality}` : ''}</dd></div>
      <div><dt>Flight</dt><dd>${pkg.name} · ${pkg.price_display} ex GST</dd></div>
      <div><dt>GST (10%)</dt><dd>${formatAud(gst)}</dd></div>
      <div><dt>Total inc. GST</dt><dd>${formatAud(totalIncGst)}</dd></div>
      <div><dt>Athlete 70%</dt><dd>${formatAud(pkg.split_breakdown.athlete_amount)}</dd></div>
      <div><dt>Club 15%</dt><dd>${formatAud(pkg.split_breakdown.club_amount)}</dd></div>
      <div><dt>Platform 15%</dt><dd>${formatAud(pkg.split_breakdown.platform_amount)}</dd></div>
    </dl>
    <p class="note">Escrow held on Stripe Connect. Disbursement follows verified delivery. This document is a specimen RCTI for the funded flight and should be retained for BAS and audit.</p>
  </main>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

export const CheckoutSuccessPage: React.FC = () => {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const sessionId = params.get('session_id');
  const athleteId = params.get('athleteId');
  const tierId = params.get('tierId');

  const athlete = resolveAthlete(athleteId);
  const pkg = getCommercialPackage(tierId) ?? mockDeliverables.packages[0];
  const split = pkg.split_breakdown;
  const reference = dealReference(sessionId, athlete.id, pkg.tier_id);
  const locality = [athlete.grassroots_club.suburb, athlete.grassroots_club.state]
    .filter((part) => part.trim().length > 0)
    .join(', ');

  return (
    <div className="min-h-screen w-full bg-[#F8F9FA] text-[#0F0F11] font-sans">
      <header className="border-b border-[#EAEAEA] bg-[#F8F9FA]">
        <div className="max-w-[960px] mx-auto px-4 md:px-8 h-[74px] flex items-center">
          <BrandLockup tone="light" onClick={() => window.location.assign('/')} />
        </div>
      </header>

      <main className="max-w-[960px] mx-auto px-4 md:px-8 py-12 md:py-16">
        <p className="m-0 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#666666]">
          Escrow confirmation
        </p>
        <h1 className="m-0 mt-3 font-display font-extrabold text-4xl md:text-5xl tracking-tight text-[#0F0F11]">
          Capital is in escrow. The flight is live.
        </h1>
        <p className="m-0 mt-4 max-w-2xl text-sm md:text-base leading-relaxed text-[#666666]">
          Stripe has funded this deal. Sport Integrity Australia clearance is already on file.
          Content scheduling and final 70/15/15 release follow verified delivery.
        </p>

        <dl className="m-0 mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-neutral-200 shadow-sm rounded-xl p-6">
            <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">
              Deal reference
            </dt>
            <dd className="m-0 mt-2 font-mono text-sm font-bold tracking-wide text-[#0F0F11]">{reference}</dd>
          </div>
          <div className="bg-white border border-neutral-200 shadow-sm rounded-xl p-6">
            <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">
              Flight
            </dt>
            <dd className="m-0 mt-2 font-display font-extrabold text-xl tracking-tight text-[#0F0F11]">
              {pkg.name} · {pkg.price_display}
            </dd>
          </div>
          <div className="bg-white border border-neutral-200 shadow-sm rounded-xl p-6">
            <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">
              Athlete
            </dt>
            <dd className="m-0 mt-2 font-display font-extrabold text-xl tracking-tight text-[#0F0F11]">
              {athlete.full_name}
            </dd>
            <p className="m-0 mt-1 text-sm text-[#666666]">
              {athlete.display_name} · {athlete.sport}
            </p>
          </div>
          <div className="bg-white border border-neutral-200 shadow-sm rounded-xl p-6">
            <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">
              Grassroots club
            </dt>
            <dd className="m-0 mt-2 font-display font-extrabold text-xl tracking-tight text-[#0F0F11]">
              {athlete.grassroots_club.name}
            </dd>
            {locality ? <p className="m-0 mt-1 text-sm text-[#666666]">{locality}</p> : null}
          </div>
        </dl>

        <section className="mt-8 bg-white border border-neutral-200 shadow-sm rounded-xl p-6 md:p-8">
          <h2 className="m-0 font-display font-extrabold text-2xl tracking-tight text-[#0F0F11]">
            70/15/15 distribution
          </h2>
          <div
            className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-neutral-200"
            role="img"
            aria-label={`Athlete ${split.athlete_percent} percent, junior club ${split.club_percent} percent, platform ${split.platform_percent} percent`}
          >
            <span className="h-full bg-[#0F0F11]" style={{ width: `${split.athlete_percent}%` }} />
            <span className="h-full bg-[#666666]" style={{ width: `${split.club_percent}%` }} />
            <span className="h-full bg-neutral-300" style={{ width: `${split.platform_percent}%` }} />
          </div>
          <dl className="m-0 mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#666666]">
                Athlete {split.athlete_percent}%
              </dt>
              <dd className="m-0 mt-1 font-display font-extrabold text-2xl tabular-nums text-[#0F0F11]">
                {formatAud(split.athlete_amount)}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#666666]">
                Club {split.club_percent}%
              </dt>
              <dd className="m-0 mt-1 font-display font-extrabold text-2xl tabular-nums text-[#0F0F11]">
                {formatAud(split.club_amount)}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#666666]">
                Platform {split.platform_percent}%
              </dt>
              <dd className="m-0 mt-1 font-display font-extrabold text-2xl tabular-nums text-[#0F0F11]">
                {formatAud(split.platform_amount)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="mt-8 bg-white border border-neutral-200 shadow-sm rounded-xl p-6 md:p-8">
          <h2 className="m-0 font-display font-extrabold text-2xl tracking-tight text-[#0F0F11]">
            Contract milestones
          </h2>
          <ol className="m-0 mt-6 p-0 list-none space-y-4">
            {MILESTONES.map((item) => (
              <li key={item.id} className="flex items-start gap-4">
                <span
                  aria-hidden="true"
                  className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold ${
                    item.done ? 'bg-[#CCFF00] text-[#0F0F11]' : 'border border-neutral-200 text-[#666666]'
                  }`}
                >
                  {item.done ? '✓' : ''}
                </span>
                <div>
                  <p className="m-0 font-semibold text-[#0F0F11]">{item.label}</p>
                  <p className="m-0 mt-1 text-sm text-[#666666]">{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-8 bg-white border border-neutral-200 shadow-sm rounded-xl p-6 md:p-8">
          <p className="m-0 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">
            Tax invoice
          </p>
          <h2 className="m-0 mt-2 font-display font-extrabold text-2xl tracking-tight text-[#0F0F11]">
            ATO Section 153-50 RCTI
          </h2>
          <p className="m-0 mt-3 text-sm leading-relaxed text-[#666666]">
            Recipient Created Tax Invoice issued by tmrw/. for this escrowed flight. Compliant with
            Income Tax Assessment Act 1997 s 153-50. Retain for BAS and audit.
          </p>
          <button
            type="button"
            onClick={() => downloadRcti({ reference, athlete, pkg })}
            className="mt-6 rounded-full border-0 bg-[#CCFF00] px-6 py-3.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#0F0F11] cursor-pointer hover:bg-[#dfff66] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00] focus-visible:ring-offset-2"
          >
            Download RCTI receipt
          </button>
        </section>

        <p className="m-0 mt-10">
          <a
            href="/#roster"
            className="inline-flex items-center font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#0F0F11] no-underline hover:text-[#666666]"
          >
            Return to the athlete roster →
          </a>
        </p>
      </main>
    </div>
  );
};

export default CheckoutSuccessPage;
