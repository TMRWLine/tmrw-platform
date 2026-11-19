import React, { useEffect, useState } from 'react';
import { BrandLockup } from '../../components/BrandLockup';
import { CHECKOUT_SUCCESS_PATH, releaseEscrowMilestoneTranche } from '../../lib/checkout';
import { formatAud } from '../../lib/formatMoney';
import { fetchPaidWhitelistingGrant, type PaidWhitelistingGrant } from '../../lib/whitelisting';
import { resolveReceiptAthlete, type ReceiptAthlete } from './receiptAthlete';
import { resolveReceiptPackage, type ReceiptPackage } from './receiptPackage';

export { CHECKOUT_SUCCESS_PATH };

const MILESTONES = [
  { id: 'payment', label: 'Payment confirmed', detail: 'Stripe confirmed payment for this checkout.', done: true },
  {
    id: 'integrity',
    label: 'Integrity clearance',
    detail: 'Confirm the applicable integrity and governing body requirements before activation.',
    done: false,
  },
  { id: 'content', label: 'Content Scheduled', detail: 'Production window locks after brand kit confirmation.', done: false },
] as const;

function dealReference(sessionId: string | null, athleteId: string, tierId: string): string {
  const sessionTail = (sessionId ?? 'DEMO').replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase();
  const athleteTail = athleteId.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase();
  const tierTail = tierId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
  return `TMRW-${tierTail || 'TIER'}-${athleteTail || 'ATH'}-${sessionTail || 'ESCROW'}`;
}

function downloadRcti(args: {
  reference: string;
  athlete: ReceiptAthlete;
  pkg: ReceiptPackage;
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
    <p class="meta">tmrw/. · RCTI specimen</p>
    <h1>${reference}</h1>
    <p>This specimen illustrates the planned settlement. It is not a tax invoice.</p>
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
    <p class="note">Stripe payment confirmation does not confirm escrow or disbursements.</p>
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

function Milestone({ label, detail, done, live, children }: {
  label: string;
  detail: string;
  done: boolean;
  live?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-4">
      <span
        aria-hidden="true"
        className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold ${
          done ? 'bg-volt text-[#0F0F11]' : 'border border-neutral-200 text-[#666666]'
        }`}
      >
        {done ? '✓' : ''}
      </span>
      <div>
        <p className="m-0 font-semibold text-[#0F0F11]">{label}</p>
        <p aria-live={live ? 'polite' : undefined} className="m-0 mt-1 text-sm text-[#666666]">{detail}</p>
        {children}
      </div>
    </li>
  );
}

function MilestoneRelease({ checkoutSessionId, athleteId }: { checkoutSessionId: string; athleteId: string }) {
  const [pending, setPending] = useState(false);
  const [released, setReleased] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function approveDelivery() {
    if (pending || released !== null) return;
    setPending(true);
    setError(null);
    try {
      const result = await releaseEscrowMilestoneTranche({ checkoutSessionId, athleteId });
      setReleased(result.releasedAmountCents);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Stripe did not confirm the release.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Milestone
      label="Athlete milestone release"
      detail={released === null
        ? 'Approve delivery before releasing the held athlete payment.'
        : `Stripe confirmed ${formatAud(released / 100)} released to the athlete.`}
      done={released !== null}
      live
    >
      {released === null && (
        <div className="mt-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => void approveDelivery()}
            className="rounded-full border-0 bg-volt px-6 py-3.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#0F0F11] cursor-pointer hover:bg-volt disabled:opacity-50"
          >
            {pending ? 'Confirming release…' : 'Approve deliverables & release'}
          </button>
          {error && <p role="alert" className="mt-3 text-sm text-[#0F0F11]">{error}</p>}
        </div>
      )}
    </Milestone>
  );
}

export const CheckoutSuccessPage: React.FC = () => {
  const sessionId = new URLSearchParams(window.location.search).get('session_id') ?? '';
  const [paid, setPaid] = useState<PaidWhitelistingGrant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    setPaid(null);
    void fetchPaidWhitelistingGrant(sessionId, controller.signal).then(
      (result) => { if (!controller.signal.aborted) setPaid(result); },
      (reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : 'The receipt is temporarily unavailable.');
        }
      },
    );
    return () => controller.abort();
  }, [sessionId, attempt]);

  const grant = paid?.grant;
  const athlete = grant ? resolveReceiptAthlete(grant.athleteId, grant.flightTierId) : null;
  const pkg = grant ? resolveReceiptPackage(grant.flightTierId) : null;
  const split = pkg?.split_breakdown;
  const reference = paid ? dealReference(paid.checkoutSessionId, paid.grant.athleteId, paid.grant.flightTierId) : '';
  const locality = [athlete?.grassroots_club.suburb ?? '', athlete?.grassroots_club.state ?? '']
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
          Checkout receipt
        </p>
        <h1 className="m-0 mt-3 font-display font-extrabold text-4xl md:text-5xl tracking-tight text-[#0F0F11]">
          {paid ? 'Stripe confirmed your payment.' : error ? 'Receipt not available yet.' : 'Checking your payment…'}
        </h1>
        {!paid || !grant ? (
          <div className="mt-4" role="status">
            <p className="m-0 text-sm text-[#666666]">{error ?? 'Waiting for Stripe and the activation ledger.'}</p>
            {error && /^cs_(test|live)_/.test(sessionId) && (
              <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-4 rounded-full bg-volt px-5 py-2 text-sm font-bold">
                Check again
              </button>
            )}
          </div>
        ) : (
          <>

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
              {pkg?.name ?? grant.flightTierId} · {formatAud(paid.amountPaidCents / 100)} paid
            </dd>
          </div>
          <div className="bg-white border border-neutral-200 shadow-sm rounded-xl p-6">
            <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">
              Athlete
            </dt>
            <dd className="m-0 mt-2 font-display font-extrabold text-xl tracking-tight text-[#0F0F11]">
              {grant.athleteName}
            </dd>
            {athlete && <p className="m-0 mt-1 text-sm text-[#666666]">{athlete.display_name} · {athlete.sport}</p>}
          </div>
          <div className="bg-white border border-neutral-200 shadow-sm rounded-xl p-6">
            <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">
              Grassroots club
            </dt>
            <dd className="m-0 mt-2 font-display font-extrabold text-xl tracking-tight text-[#0F0F11]">
              {athlete?.grassroots_club.name ?? 'Not listed'}
            </dd>
            {locality ? <p className="m-0 mt-1 text-sm text-[#666666]">{locality}</p> : null}
          </div>
        </dl>

        <section className="mt-8 rounded-xl border border-neutral-200 bg-white p-6 md:p-8">
          <h2 className="m-0 font-display text-2xl font-extrabold">Paid-media activation grant</h2>
          <p className="mt-3 text-sm text-[#666666]">
            Postcode {grant.postcode} · {grant.radiusKm} km · Expires {new Date(grant.expiresAt).toLocaleDateString('en-AU')}
          </p>
          <p className="text-sm text-[#666666]">
            These tmrw/. references confirm your grant. Meta and TikTok authorisation must be arranged separately.
          </p>
          <dl className="m-0 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-bold">Meta grant reference</dt>
              <dd className="m-0 break-all font-mono text-sm">{grant.meta_partnership_token}</dd>
            </div>
            <div>
              <dt className="text-sm font-bold">TikTok grant reference</dt>
              <dd className="m-0 break-all font-mono text-sm">{grant.tiktok_spark_code}</dd>
            </div>
          </dl>
        </section>

        {split && (
        <section className="mt-8 bg-white border border-neutral-200 shadow-sm rounded-xl p-6 md:p-8">
          <h2 className="m-0 font-display font-extrabold text-2xl tracking-tight text-[#0F0F11]">
            Planned 70/15/15 distribution
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
        )}

        <section className="mt-8 bg-white border border-neutral-200 shadow-sm rounded-xl p-6 md:p-8">
          <h2 className="m-0 font-display font-extrabold text-2xl tracking-tight text-[#0F0F11]">
            Contract milestones
          </h2>
          <ol className="m-0 mt-6 p-0 list-none space-y-4">
            {MILESTONES.map((item) => (
              <Milestone key={item.id} label={item.label} detail={item.detail} done={item.done} />
            ))}
            {paid.milestoneReleaseAvailable && (
              <MilestoneRelease key={paid.checkoutSessionId} checkoutSessionId={paid.checkoutSessionId} athleteId={grant.athleteId} />
            )}
          </ol>
        </section>

        {athlete && pkg && (
        <section className="mt-8 bg-white border border-neutral-200 shadow-sm rounded-xl p-6 md:p-8">
          <p className="m-0 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">
            Settlement specimen
          </p>
          <h2 className="m-0 mt-2 font-display font-extrabold text-2xl tracking-tight text-[#0F0F11]">
            RCTI specimen
          </h2>
          <p className="m-0 mt-3 text-sm leading-relaxed text-[#666666]">
            Preview the planned settlement. This is not a tax invoice.
          </p>
          <button
            type="button"
            onClick={() => downloadRcti({ reference, athlete, pkg })}
            className="mt-6 rounded-full border-0 bg-volt px-6 py-3.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#0F0F11] cursor-pointer hover:bg-volt focus:outline-none focus-visible:ring-2 focus-visible:ring-volt focus-visible:ring-offset-2"
          >
            Download RCTI specimen
          </button>
        </section>
        )}
          </>
        )}

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
