import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export type NavView = 'sponsor' | 'athlete' | 'drops';
export type LandingSectionId = 'the-breakdown' | 'for-players' | 'for-brands' | 'campaign-architecture';

interface NavbarProps {
  activeView: NavView | null;
  onSection: (id: LandingSectionId) => void;
  onJoinRoster: () => void;
  onEnterprise: () => void;
}

const SECTION_LINKS: { id: LandingSectionId; label: string }[] = [
  { id: 'for-players', label: 'Roster' },
  { id: 'for-brands', label: 'Enterprise' },
  { id: 'campaign-architecture', label: 'Infrastructure' },
  { id: 'the-breakdown', label: 'Manifesto' },
];

export function Navbar({ activeView, onSection, onJoinRoster, onEnterprise }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const rosterActive = activeView === 'athlete' || activeView === 'drops';
  const enterpriseActive = activeView === 'sponsor';

  return (
    <nav className="nav-links-wrap" aria-label="Primary">
      <button
        className="nav-mobile-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation"
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>
      <div className={`nav-links ${mobileOpen ? 'open' : ''}`}>
        {SECTION_LINKS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="pointer-events-auto"
            onClick={() => {
              onSection(item.id);
              setMobileOpen(false);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="nav-actions">
        <button
          type="button"
          className={`nav-cta-primary px-5 py-2.5 pointer-events-auto${rosterActive ? ' is-active' : ''}`}
          onClick={() => {
            onJoinRoster();
            setMobileOpen(false);
          }}
        >
          Claim Backing
        </button>
        <button
          type="button"
          className={`nav-cta-ghost border-white/20 text-white px-5 py-2.5 pointer-events-auto${enterpriseActive ? ' is-active' : ''}`}
          onClick={() => {
            onEnterprise();
            setMobileOpen(false);
          }}
        >
          Deploy Capital
        </button>
      </div>
    </nav>
  );
}
