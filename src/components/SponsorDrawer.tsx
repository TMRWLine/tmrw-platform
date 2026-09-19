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
import type { Athlete, AthleteLocation, CollabDrop, MatchedSponsor, SponsorshipTierKey } from '../types';
import { COLLAB_SPLIT, HUNTER_BLIGH_COLLAB_DROPS, SPONSORSHIP_PACKAGES } from '../types';
import { athleteDisplayName, athleteInitials } from '../lib/formatName';
import { fetchCollabDrops, fetchNearbySponsors, formatCurrency } from '../api';
import MapView from '../MapView';

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
        <rect width="80" height="80" fill="#009FDA" />
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

function seedCollabDrops(athlete?: Athlete | null): CollabDrop[] {
  const name = athleteDisplayName(athlete);
  const hay = `${athlete?.name ?? ''} ${athlete?.full_name ?? ''} ${name}`.toLowerCase();
  return hay.includes('bligh') ? [...HUNTER_BLIGH_COLLAB_DROPS] : [];
}

/** Melbourne CBD — PostGIS catchment origin for store postcode 3000. */
const POSTCODE_3000 = { lat: -37.8136, lng: 144.9631, postcode: '3000' };

function destinationPoint(lat: number, lng: number, km: number, bearingDeg: number) {
  const R = 6371;
  const br = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(km / R) + Math.cos(lat1) * Math.sin(km / R) * Math.cos(br)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(br) * Math.sin(km / R) * Math.cos(lat1),
      Math.cos(km / R) - Math.sin(lat1) * Math.sin(lat2)
    );
  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
}

function mockPartner(
  id: string,
  business_name: string,
  merchant_category: string,
  km: number,
  bearing: number
): MatchedSponsor {
  const pos = destinationPoint(POSTCODE_3000.lat, POSTCODE_3000.lng, km, bearing);
  return {
    id,
    business_name,
    merchant_category,
    budget_allocation: 12000,
    contact_email: null,
    target_radius_meters: 1500,
    location: null,
    postcode: POSTCODE_3000.postcode,
    latitude: pos.lat,
    longitude: pos.lng,
    currency: 'AUD',
    created_at: '',
    updated_at: '',
    distance_meters: Math.round(km * 1000),
    distance_km: km,
    lat: pos.lat,
    lng: pos.lng,
  };
}

const MOCK_VERIFIED_PARTNERS: MatchedSponsor[] = [
  mockPartner('mock-fitzroy-athletics', 'Fitzroy Athletics Club', 'Apparel & Training', 1.2, 45),
  mockPartner('mock-swanston-recovery', 'Swanston Street Recovery Lab', 'Health & Performance', 2.1, 5),
  mockPartner('mock-city-sports-clinic', 'Melbourne City Sports Clinic', 'Physiotherapy', 3.4, 250),
];

function formatKmAway(km: number | null | undefined): string {
  if (km == null || !Number.isFinite(km)) return 'Nearby';
  return `${km.toFixed(1)} km away`;
}

function athleteCatchmentLocation(athlete: Athlete, name: string): AthleteLocation {
  return {
    id: athlete.id,
    name,
    lat: POSTCODE_3000.lat,
    lng: POSTCODE_3000.lng,
    postcode: POSTCODE_3000.postcode,
    follower_count: athlete.follower_count,
    master_licence_signed: athlete.master_licence_signed,
    nrl_tpa_registered: athlete.nrl_tpa_registered,
    shute_shield_compliant: athlete.shute_shield_compliant,
  };
}

export function SponsorDrawer({
  athlete,
  submitting,
  error,
  confirmed,
  onConfirm,
  onClose,
}: {
  athlete: Athlete;
  submitting: boolean;
  error: string | null;
  confirmed: boolean;
  onConfirm: (tier: SponsorshipTierKey, postcode: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<DrawerTab>('tiers');
  const [tier, setTier] = useState<SponsorshipTierKey>('TIER_2');
  const [postcode, setPostcode] = useState(athlete?.postcode ?? '2000');
  const [authorizingId, setAuthorizingId] = useState<string | null>(null);
  const [settlement, setSettlement] = useState<DropSettlement | null>(null);
  const [drops, setDrops] = useState<CollabDrop[]>(() => seedCollabDrops(athlete));
  const [showMatch, setShowMatch] = useState(false);
  const [matching, setMatching] = useState(false);
  const [matchSponsors, setMatchSponsors] = useState<MatchedSponsor[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const pkg = SPONSORSHIP_PACKAGES.find((p) => p.key === tier) ?? SPONSORSHIP_PACKAGES[1];
  const name = athleteDisplayName(athlete);
  const catchment = athleteCatchmentLocation(athlete, name);

  useEffect(() => {
    const seed = seedCollabDrops(athlete);
    setDrops(seed);
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchCollabDrops(athlete);
        if (cancelled) return;
        setDrops(Array.isArray(rows) && rows.length > 0 ? rows : seed);
      } catch {
        if (!cancelled) setDrops(seed);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [athlete?.id, athlete?.name, athlete?.full_name]);

  async function openNearbyMatch() {
    setShowMatch(true);
    setMatching(true);
    setSelectedPartnerId(null);
    try {
      const res = await fetchNearbySponsors(athlete.id);
      const live = Array.isArray(res.matches) ? res.matches.filter((s) => s.lat != null && s.lng != null) : [];
      setMatchSponsors(live.length > 0 ? live : MOCK_VERIFIED_PARTNERS);
    } catch {
      setMatchSponsors(MOCK_VERIFIED_PARTNERS);
    } finally {
      setMatching(false);
    }
  }

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
      <div className="sponsor-drawer-overlay" onClick={onClose} />
      <aside className="sponsor-drawer border-grid bg-brand-zinc text-brand-white rounded-none" role="dialog" aria-label="Sponsor athlete checkout">
        <div className="sponsor-drawer-head">
          <div className="athlete-avatar">{athlete?.initials || athleteInitials(name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="font-serif text-brand-white">{name}</h2>
            <div className="sub font-mono">
              {(athlete?.sport ?? 'Athlete').toUpperCase()}
              {athlete?.postcode ? ` · ${athlete.postcode}` : ''}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close checkout">
            <X size={16} />
          </button>
        </div>

        <div className="sponsor-drawer-tabs" role="tablist" aria-label="Sponsorship surfaces">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'tiers'}
            className={tab === 'tiers' ? 'active' : ''}
            onClick={() => {
              setTab('tiers');
              setShowMatch(false);
            }}
          >
            <Layers size={13} /> Commercial Sponsorship
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'drops'}
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
              <button className="sponsor-btn-confirm rounded-none bg-brand-white text-brand-black" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : tab === 'tiers' && showMatch ? (
          <div className="sponsor-drawer-body">
            <div className="sponsor-match-head">
              <div>
                <span className="sponsor-drawer-label">Map &amp; match</span>
            <h3 className="font-serif text-brand-white">PostGIS catchment · postcode 3000</h3>
                <p>Athlete radius overlay with verified local sponsor pins.</p>
              </div>
              <button type="button" className="sponsor-btn-nearby rounded-none bg-brand-cobalt text-brand-white" onClick={() => setShowMatch(false)}>
                Back to tiers
              </button>
            </div>
            <div className="sponsor-match-metrics font-mono border-grid text-brand-volt">
              3 Verified Partners · 5.8k Weekly Postcode Impressions · 100% Exclusivity Available
            </div>

            {matching ? (
              <div className="state">
                <div className="spinner" />
                Running spatial match…
              </div>
            ) : (
              <>
                <div className="relative isolate h-[320px] w-full overflow-hidden rounded-none border border-brand-zinc">
                  <MapView
                    athlete={catchment}
                    sponsors={matchSponsors}
                    catchmentMeters={5000}
                    className="relative h-full w-full overflow-hidden"
                    selectedSponsorId={selectedPartnerId}
                    onSelectSponsor={setSelectedPartnerId}
                  />
                </div>
                <span className="sponsor-drawer-label">Local partners</span>
                <ul className="sponsor-match-list">
                  {matchSponsors.map((s) => {
                    const selected = selectedPartnerId === s.id;
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          className={`sponsor-match-card ${selected ? 'selected' : ''}`}
                          aria-pressed={selected}
                          onClick={() => setSelectedPartnerId(s.id)}
                        >
                          <div className="sponsor-match-card-copy">
                            <strong>{s.business_name}</strong>
                            <span>{s.merchant_category ?? 'Sponsor'}</span>
                            <em>{formatKmAway(s.distance_km)}</em>
                          </div>
                          <span className="sponsor-match-select">Select as Activation Partner</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
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
                    className={`sponsor-tier-option rounded-none border-grid ${tier === p.key ? 'selected' : ''}`}
                    aria-pressed={tier === p.key}
                    onClick={() => setTier(p.key)}
                    disabled={submitting}
                  >
                    <div className="sponsor-tier-option-top">
                      <span className="sponsor-tier-option-label">{p.label}</span>
                      <span className="sponsor-tier-option-price font-mono">{p.priceLabel}</span>
                    </div>
                    <div className="sponsor-tier-option-title text-white font-bold text-xl tracking-tight">
                      {p.title}
                    </div>
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
                className="sponsor-btn-confirm rounded-none bg-brand-white text-brand-black"
                onClick={() => onConfirm(tier, postcode.trim() || '2000')}
                disabled={submitting}
              >
                {submitting ? <Loader2 size={14} className="spin" /> : <ShieldCheck size={14} />}
                {submitting ? 'Booking…' : `Confirm ${pkg.label}`}
              </button>
              <button
                className="sponsor-btn-nearby rounded-none bg-brand-cobalt text-brand-white"
                onClick={() => void openNearbyMatch()}
                disabled={submitting}
              >
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
                No active merchandise drops configured for this athlete.
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
                    <div className="drop-art clip-blade-23">{merchArt(drop.art)}</div>
                    <div className="drop-card-meta">
                      <span className={`drop-status drop-status-${drop.status}`}>{drop.statusLabel}</span>
                      <h3>{drop.title}</h3>
                      <div className="drop-price font-mono">A${drop.priceAud}</div>
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
                    <span className="sponsor-drawer-label">Transparent commercial split</span>
                    <div className="drop-split-row">
                      <div>
                        <strong className="drop-split-tag drop-split-tag-cyan">{split.athletePayoutPct}%</strong>
                        <span>Athlete Payout</span>
                      </div>
                      <div>
                        <strong className="drop-split-tag drop-split-tag-white">{split.platformFeePct}%</strong>
                        <span>Platform Fee</span>
                      </div>
                      <div>
                        <strong className="drop-split-tag drop-split-tag-volt">{split.communityFundPct}%</strong>
                        <span>Grassroots Community Sports Fund</span>
                      </div>
                    </div>
                    <div className="drop-batch-note">
                      Batch {drop.batchSize} units · {formatCurrency(gross, 'AUD')} ex GST
                    </div>
                  </div>

                  <button
                    className="athlete-sponsor-btn drop-authorize rounded-none bg-brand-white text-brand-black"
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
                <p className="drop-settlement-event font-mono">
                  Webhook {settlement.stripeEventId} · {settlement.batchSize} × {settlement.dropTitle}
                </p>
                <ul className="drop-settlement-log font-mono">
                  {settlement.transfers.map((t) => (
                    <li key={t.transferId}>
                      {t.transferId} → {t.destination} · {formatCurrency(t.amount, 'AUD')}
                    </li>
                  ))}
                </ul>
                <div className="drop-invoice">
                  <div className="ledger-head">
                    <Receipt size={16} />
                    <h3>RCTI tax invoice</h3>
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
