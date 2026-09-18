import { Loader2, Store, Building2, Network } from 'lucide-react';
import { SPATIAL_TIERS, type SpatialTierCode } from '../types';

const TIER_ICONS: Record<SpatialTierCode, React.ReactNode> = {
  1: <Store size={20} />,
  2: <Building2 size={20} />,
  3: <Network size={20} />,
};

export function SpatialCatchment({
  selected,
  matchCount,
  loading,
  onSelect,
}: {
  selected: SpatialTierCode | null;
  matchCount: number | null;
  loading: boolean;
  onSelect: (code: SpatialTierCode | null) => void;
}) {
  return (
    <div className="catchment-section">
      <div className="catchment-header">
        <div>
          <h2>Spatial Catchment Selector</h2>
          <p>Select a catchment to query athletes by PostGIS distance from Sydney CBD</p>
        </div>
        {selected != null && (
          <div className="catchment-summary">
            {loading ? (
              <>
                <Loader2 size={13} className="spin" /> Querying catchment…
              </>
            ) : (
              <>
                <strong>{matchCount ?? 0}</strong> athletes in band
                <button className="catchment-clear" onClick={() => onSelect(null)}>
                  Clear
                </button>
              </>
            )}
          </div>
        )}
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
              onClick={() => onSelect(isSelected ? null : tier.code)}
            >
              <div className="catchment-card-top">
                <span className="catchment-card-index">{tier.label}</span>
                <span className="catchment-card-icon">{TIER_ICONS[tier.code]}</span>
              </div>
              <div className="catchment-card-catchment">{tier.catchment}</div>
              <div className="catchment-card-title">{tier.title}</div>
              <div className="catchment-card-price">{tier.price}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
