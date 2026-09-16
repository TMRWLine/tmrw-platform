import { Package, MapPin, Globe } from 'lucide-react';

export type TierKey = 'tier1' | 'tier2' | 'tier3';

interface SponsorshipTiersProps {
  selected: TierKey;
  onSelect: (tier: TierKey) => void;
}

const TIERS: {
  key: TierKey;
  icon: React.ReactNode;
  tier: string;
  title: string;
  desc: string;
  tags: string[];
}[] = [
  {
    key: 'tier1',
    icon: <Package size={20} />,
    tier: 'Tier 1',
    title: 'In-Kind / Product',
    desc: 'Gear, nutrition, and equipment distribution for local athletes.',
    tags: ['Gear', 'Nutrition', 'Equipment'],
  },
  {
    key: 'tier2',
    icon: <MapPin size={20} />,
    tier: 'Tier 2',
    title: 'Regional Postcode',
    desc: '$1,000–$5,000 targeted activation within a 25km–50km radius.',
    tags: ['$1K–$5K', '25–50km radius', 'Postcode targeted'],
  },
  {
    key: 'tier3',
    icon: <Globe size={20} />,
    tier: 'Tier 3',
    title: 'Run-of-Network',
    desc: 'Enterprise corporate commitments across full league rosters.',
    tags: ['@nbl1', '@nplnsw', '@shuteshield'],
  },
];

export function SponsorshipTiers({ selected, onSelect }: SponsorshipTiersProps) {
  return (
    <div className="tiers-section">
      <div className="tiers-header">
        <h2>Sponsorship Tiers</h2>
        <p>Select a tier to filter activation scope</p>
      </div>
      <div className="tiers-grid">
        {TIERS.map((tier) => (
          <div
            key={tier.key}
            className={`tier-card ${selected === tier.key ? 'selected' : ''}`}
            onClick={() => onSelect(tier.key)}
          >
            <div className="tier-card-header">
              <div className="tier-card-icon">{tier.icon}</div>
              <div>
                <div className="tier-card-tier">{tier.tier}</div>
                <div className="tier-card-title">{tier.title}</div>
              </div>
            </div>
            <p className="tier-card-desc">{tier.desc}</p>
            <div className="tier-card-tags">
              {tier.tags.map((tag) => (
                <span key={tag} className="tier-card-tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
