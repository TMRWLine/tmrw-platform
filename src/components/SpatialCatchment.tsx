import { Check, ChevronDown } from 'lucide-react';
import { SPATIAL_TIERS, type SpatialTierCode } from '../types';

export function SpatialCatchment({
  selected,
  counts,
  onSelect,
  onClear,
}: {
  selected: SpatialTierCode | null;
  counts: Record<SpatialTierCode, number> | null;
  onSelect: (code: SpatialTierCode) => void;
  onClear: () => void;
}) {
  return (
    <section className="catchment-section">
      <div className="catchment-header">
        <div>
          <span className="catchment-eyebrow">02 —— SPONSORSHIP TIERS</span>
          <h2>Buy reach by radius.</h2>
          <p>
            Select a spatial tier to live-filter the roster below by proximity to your store
            network.
          </p>
        </div>
        <button className="catchment-clear" onClick={onClear} disabled={selected == null}>
          Clear tier filter
        </button>
      </div>

      <div className="catchment-grid">
        {SPATIAL_TIERS.map((tier) => {
          const isSelected = selected === tier.code;
          return (
            <button
              key={tier.code}
              type="button"
              className={`catchment-card ${isSelected ? 'selected' : ''}`}
              aria-pressed={isSelected}
              onClick={() => onSelect(tier.code)}
            >
              <div className="catchment-card-head">
                <span className="catchment-card-index">{tier.code}</span>
                <span className="catchment-card-catchment">{tier.catchment}</span>
              </div>

              <h3 className="catchment-card-title">{tier.title}</h3>
              <div className="catchment-card-price">{tier.price}</div>

              <ul className="catchment-card-features">
                {tier.features.map((feature) => (
                  <li key={feature}>
                    <Check size={13} /> {feature}
                  </li>
                ))}
              </ul>

              <div className="catchment-card-foot">
                <span className="catchment-card-range">
                  In range <strong>{counts?.[tier.code] ?? '—'}</strong>
                </span>
                <span className="catchment-card-cta">
                  {isSelected ? (
                    <>
                      Filtering roster <ChevronDown size={13} />
                    </>
                  ) : (
                    'Select tier'
                  )}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
