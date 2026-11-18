import { useState } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle, ShieldCheck, MapPin } from 'lucide-react';
import type { Athlete, SponsorshipTierKey } from '../types';
import { SPONSORSHIP_PACKAGES } from '../types';
import { athleteInitials, displayName } from '../lib/formatName';

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
  const [tier, setTier] = useState<SponsorshipTierKey>('TIER_2');
  const [postcode, setPostcode] = useState(athlete?.postcode ?? '2000');
  const pkg = SPONSORSHIP_PACKAGES.find((p) => p.key === tier) ?? SPONSORSHIP_PACKAGES[1];

  return (
    <>
      <div className="panel-overlay" onClick={onClose} />
      <aside className="sponsor-drawer" role="dialog" aria-label="Sponsor athlete checkout">
        <div className="sponsor-drawer-head">
          <div className="athlete-avatar">{athlete?.initials || athleteInitials(athlete?.name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2>{displayName(athlete?.name)}</h2>
            <div className="sub">
              {(athlete?.sport ?? 'Athlete').toUpperCase()}
              {athlete?.postcode ? ` · ${athlete.postcode}` : ''}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close checkout">
            <X size={16} />
          </button>
        </div>

        {confirmed ? (
          <div className="sponsor-drawer-body">
            <div className="sponsor-confirmed">
              <CheckCircle2 size={28} />
              <h3>Sponsorship booked</h3>
              <p>
                {pkg.title} activation registered for {displayName(athlete?.name)}. The licence
                badge is now <strong>ACTIVE</strong>.
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
        ) : (
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
        )}
      </aside>
    </>
  );
}
