import { useEffect, useState } from 'react';
import {
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  MapPin,
  Store,
  Layers,
  Truck,
  Receipt,
  Zap,
} from 'lucide-react';
import type { Athlete, CollabDrop, SponsorshipTierKey } from '../types';
import { COLLAB_SPLIT, SPONSORSHIP_PACKAGES } from '../types';
import { athleteDisplayName, athleteInitials } from '../lib/formatName';
import { fetchCollabDrops, formatCurrency } from '../api';

type DrawerTab = 'tiers' | 'drops';

export interface DropSettlement {
  dropId: string;
  dropTitle: string;
  batchSize: number;
  grossExGst: number;
  gst: number;
  totalIncGst: number;
  athletePayout: number;
  platformFee: number;
  communityFund: number;
  stripeEventId: string;
  transfers: { destination: string; amount: number; transferId: string }[];
  invoice: {
    number: string;
    issuedAt: string;
    abn: string;
    rcti: string;
    gstRate: string;
    buyer: string;
    supplier: string;
  };
}

function merchArt(kind: CollabDrop['art'] | string | undefined) {
  if (kind === 'hoodie') {
    return (
      <svg className="drop-art-svg" viewBox="0 0 80 80" aria-hidden="true">
        <rect width="80" height="80" fill="#111" />
        <path d="M18 28h10l6-10h12l6 10h10v34H18V28z" fill="#FBFBF9" />
        <path d="M28 28v8h24v-8" fill="none" stroke="#111" strokeWidth="2" />
        <text x="40" y="52" textAnchor="middle" fill="#111" fontSize="7" fontWeight="700">
          2026
        </text>
      </svg>
    );
  }
  if (kind === 'socks') {
    return (
      <svg className="drop-art-svg" viewBox="0 0 80 80" aria-hidden="true">
        <rect width="80" height="80" fill="#10B981" />
        <path d="M30 16h12v28c0 10-6 16-14 16s-14-6-14-16V28h8v16c0 4 2 7 6 7s6-3 6-7V16z" fill="#FBFBF9" />
        <path d="M50 16h12v28c0 10-6 16-14 16" fill="none" stroke="#FBFBF9" strokeWidth="4" />
      </svg>
    );
  }
  return (
    <svg className="drop-art-svg" viewBox="0 0 80 80" aria-hidden="true">
      <rect width="80" height="80" fill="#1A1A1A" />
      <path d="M22 26h36l4 8v28H18V34l4-8z" fill="#FBFBF9" />
      <circle cx="40" cy="44" r="8" fill="none" stroke="#111" strokeWidth="2" />
    </svg>
  );
}

function simulateSettlement(drop: CollabDrop, athleteName: string): DropSettlement {
  const grossExGst = drop.priceAud * drop.batchSize;
  const split = drop.split ?? COLLAB_SPLIT;
  const gst = Math.round(grossExGst * 0.1 * 100) / 100;
  const totalIncGst = grossExGst + gst;
  const athletePayout = Math.round(grossExGst * (split.athletePayoutPct / 100) * 100) / 100;
  const platformFee = Math.round(grossExGst * (split.platformFeePct / 100) * 100) / 100;
  const communityFund = Math.round(grossExGst * (split.communityFundPct / 100) * 100) / 100;
  const nonce = Math.random().toString(36).slice(2, 10);
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return {
    dropId: drop.id,
    dropTitle: drop.title,
    batchSize: drop.batchSize,
    grossExGst,
    gst,
    totalIncGst,
    athletePayout,
    platformFee,
    communityFund,
    stripeEventId: `evt_3Pq${nonce}Z6J`,
    transfers: [
      { destination: 'acct_athlete_connect', amount: athletePayout, transferId: `tr_ath_${nonce}` },
      { destination: 'acct_tmrw_platform', amount: platformFee, transferId: `tr_plt_${nonce}` },
      { destination: 'acct_community_fund', amount: communityFund, transferId: `tr_cfd_${nonce}` },
    ],
    invoice: {
      number: `INV-TMRW-${day}-${nonce.slice(0, 4).toUpperCase()}`,
      issuedAt: new Date().toISOString(),
      abn: '12 345 678 901',
      rcti: `RCTI-${day}-${nonce.slice(0, 4).toUpperCase()}`,
      gstRate: '10%',
      buyer: 'Enterprise Brand Pty Ltd',
      supplier: `${athleteName} via tmrw/. Marketplace`,
    },
  };
}

export function SponsorDrawer({
  athlete,
  submitting,
  error,
  confirmed,
  onConfirm,
  onClose,
  onFindNearby,
}: {
  athlete: Athlete;
  submitting: boolean;
  error: string | null;
  confirmed: boolean;
  onConfirm: (tier: SponsorshipTierKey, postcode: string) => void;
  onClose: () => void;
  onFindNearby: () => void;
}) {
  const [tab, setTab] = useState<DrawerTab>('tiers');
  const [tier, setTier] = useState<SponsorshipTierKey>('TIER_2');
  const [postcode, setPostcode] = useState(athlete?.postcode ?? '2000');
  const [authorizingId, setAuthorizingId] = useState<string | null>(null);
  const [settlement, setSettlement] = useState<DropSettlement | null>(null);
  const [drops, setDrops] = useState<CollabDrop[]>([]);
  const pkg = SPONSORSHIP_PACKAGES.find((p) => p.key === tier) ?? SPONSORSHIP_PACKAGES[1];
  const name = athleteDisplayName(athlete);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchCollabDrops(athlete);
        if (!cancelled) setDrops(Array.isArray(rows) ? rows : []);
      } catch {
        if (!cancelled) setDrops([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [athlete?.id, athlete?.name, athlete?.full_name]);

  async function authorizeDrop(drop: CollabDrop) {
    if (authorizingId) return;
    setAuthorizingId(drop.id);
    setSettlement(null);
    await new Promise((r) => setTimeout(r, 900));
    setSettlement(simulateSettlement(drop, name));
    setAuthorizingId(null);
  }

  return (
    <>
      <div className="panel-overlay" onClick={onClose} />
      <aside className="sponsor-drawer" role="dialog" aria-label="Sponsor athlete checkout">
        <div className="sponsor-drawer-head">
          <div className="athlete-avatar">{athlete?.initials || athleteInitials(name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2>{name}</h2>
            <div className="sub">
              {(athlete?.sport ?? 'Athlete').toUpperCase()}
              {athlete?.postcode ? ` · ${athlete.postcode}` : ''}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close checkout">
            <X size={16} />
          </button>
        </div>

        <div className="sponsor-drawer-tabs">
          <button
            type="button"
            className={tab === 'tiers' ? 'active' : ''}
            onClick={() => setTab('tiers')}
          >
            <Layers size={13} /> Commercial Tiers
          </button>
          <button
            type="button"
            className={tab === 'drops' ? 'active' : ''}
            onClick={() => setTab('drops')}
          >
            <Store size={13} /> Collab Drops
          </button>
        </div>

        {confirmed && tab === 'tiers' ? (
          <div className="sponsor-drawer-body">
            <div className="sponsor-confirmed">
              <CheckCircle2 size={28} />
              <h3>Sponsorship booked</h3>
              <p>
                {pkg.title} activation registered for {name}. The licence badge is now{' '}
                <strong>ACTIVE</strong>.
              </p>
              <span className="badge success">
                <ShieldCheck size={12} /> Licence active
              </span>
            </div>
            <div className="sponsor-drawer-actions">
              <button className="btn btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : tab === 'tiers' ? (
          <div className="sponsor-drawer-body">
            <div className="sponsor-drawer-section">
              <span className="sponsor-drawer-label">Select sponsorship tier</span>
              <div className="sponsor-tier-list">
                {SPONSORSHIP_PACKAGES.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    className={`sponsor-tier-option ${tier === p.key ? 'selected' : ''}`}
                    aria-pressed={tier === p.key}
                    onClick={() => setTier(p.key)}
                    disabled={submitting}
                  >
                    <div className="sponsor-tier-option-top">
                      <span className="sponsor-tier-option-label">{p.label}</span>
                      <span className="sponsor-tier-option-price">{p.priceLabel}</span>
                    </div>
                    <div className="sponsor-tier-option-title">{p.title}</div>
                    <p className="sponsor-tier-option-blurb">{p.blurb}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="sponsor-drawer-section">
              <label className="sponsor-drawer-label" htmlFor="store-postcode">
                Store postcode
              </label>
              <input
                id="store-postcode"
                className="sponsor-drawer-input"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                inputMode="numeric"
                maxLength={4}
                disabled={submitting}
              />
            </div>

            <div className="sponsor-drawer-total">
              <span>Activation total</span>
              <strong>{pkg.priceLabel}</strong>
            </div>

            {error && (
              <div className="msg-error">
                <AlertCircle size={13} /> {error}
              </div>
            )}

            <div className="sponsor-drawer-actions">
              <button
                className="btn btn-primary"
                onClick={() => onConfirm(tier, postcode.trim() || '2000')}
                disabled={submitting}
              >
                {submitting ? <Loader2 size={14} className="spin" /> : <ShieldCheck size={14} />}
                {submitting ? 'Booking…' : `Confirm ${pkg.label}`}
              </button>
              <button className="btn btn-ghost" onClick={onFindNearby} disabled={submitting}>
                <MapPin size={14} /> Nearby sponsors
              </button>
            </div>
          </div>
        ) : (
          <div className="sponsor-drawer-body">
            <p className="drop-intro">
              Programmatic merchandise store for {name}. Batch authorization fires a Stripe Connect
              split and issues RCTI tax metadata.
            </p>

            {drops.length === 0 && (
              <div className="drop-empty">
                No active merchandise drops configured for this athlete
              </div>
            )}

            {(drops ?? []).filter(Boolean).map((drop) => {
              const busy = authorizingId === drop.id;
              const done = settlement?.dropId === drop.id;
              const gross = (drop.priceAud ?? 0) * (drop.batchSize || 1);
              const split = drop.split ?? COLLAB_SPLIT;
              return (
                <article key={drop.id} className={`drop-card ${done ? 'authorized' : ''}`}>
                  <div className="drop-card-top">
                    <div className="drop-art">{merchArt(drop.art)}</div>
                    <div className="drop-card-meta">
                      <span className={`drop-status drop-status-${drop.status}`}>{drop.statusLabel}</span>
                      <h3>{drop.title}</h3>
                      <div className="drop-price">{formatCurrency(drop.priceAud, 'AUD')}</div>
                    </div>
                  </div>

                  <div className="drop-chips">
                    <span className="athlete-tag">{drop.inventoryLabel}</span>
                    <span className="athlete-tag">
                      <Truck size={11} /> {drop.sla}
                    </span>
                    <span className="athlete-tag">{drop.fulfillment}</span>
                    {drop.editionSize != null && drop.remaining != null && (
                      <span className="athlete-tag">
                        {drop.remaining} / {drop.editionSize} remaining
                      </span>
                    )}
                  </div>

                  <div className="drop-split">
                    <span className="sponsor-drawer-label">Split telemetry</span>
                    <div className="drop-split-row">
                      <div>
                        <strong>{split.athletePayoutPct}%</strong>
                        <span>Athlete Payout</span>
                      </div>
                      <div>
                        <strong>{split.platformFeePct}%</strong>
                        <span>Platform Fee</span>
                      </div>
                      <div>
                        <strong>{split.communityFundPct}%</strong>
                        <span>Community Fund</span>
                      </div>
                    </div>
                    <div className="drop-batch-note">
                      Batch {drop.batchSize} units · {formatCurrency(gross, 'AUD')} ex GST
                    </div>
                  </div>

                  <button
                    className="athlete-sponsor-btn drop-authorize"
                    onClick={() => authorizeDrop(drop)}
                    disabled={busy || authorizingId != null}
                  >
                    {busy ? (
                      <>
                        <Loader2 size={14} className="spin" /> Authorizing…
                      </>
                    ) : (
                      <>
                        <Zap size={14} /> Authorize Batch Drop
                      </>
                    )}
                  </button>
                </article>
              );
            })}

            {settlement && (
              <div className="drop-settlement" role="status">
                <div className="ledger-head">
                  <Zap size={16} />
                  <h3>Stripe Connect split transfer</h3>
                </div>
                <p className="drop-settlement-event">
                  Webhook {settlement.stripeEventId} · {settlement.batchSize} × {settlement.dropTitle}
                </p>
                <ul className="drop-settlement-log">
                  {settlement.transfers.map((t) => (
                    <li key={t.transferId}>
                      {t.transferId} → {t.destination} · {formatCurrency(t.amount, 'AUD')}
                    </li>
                  ))}
                </ul>
                <div className="drop-invoice">
                  <div className="ledger-head">
                    <Receipt size={16} />
                    <h3>Enterprise tax invoice</h3>
                  </div>
                  <dl className="drop-invoice-grid">
                    <div>
                      <dt>Invoice</dt>
                      <dd>{settlement.invoice.number}</dd>
                    </div>
                    <div>
                      <dt>RCTI</dt>
                      <dd>{settlement.invoice.rcti}</dd>
                    </div>
                    <div>
                      <dt>ABN</dt>
                      <dd>{settlement.invoice.abn}</dd>
                    </div>
                    <div>
                      <dt>GST</dt>
                      <dd>
                        {settlement.invoice.gstRate} · {formatCurrency(settlement.gst, 'AUD')}
                      </dd>
                    </div>
                    <div>
                      <dt>Ex GST</dt>
                      <dd>{formatCurrency(settlement.grossExGst, 'AUD')}</dd>
                    </div>
                    <div>
                      <dt>Inc GST</dt>
                      <dd>{formatCurrency(settlement.totalIncGst, 'AUD')}</dd>
                    </div>
                    <div>
                      <dt>Buyer</dt>
                      <dd>{settlement.invoice.buyer}</dd>
                    </div>
                    <div>
                      <dt>Supplier</dt>
                      <dd>{settlement.invoice.supplier}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
