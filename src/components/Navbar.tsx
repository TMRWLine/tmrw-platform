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
  { id: 'for-players', label: 'For Players' },
  { id: 'for-brands', label: 'For Brands' },
  { id: 'campaign-architecture', label: 'Network' },
  { id: 'the-breakdown', label: 'About' },
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
          className={`nav-cta-primary${rosterActive ? ' is-active' : ''}`}
          onClick={() => {
            onJoinRoster();
            setMobileOpen(false);
          }}
        >
          Join Roster
        </button>
        <button
          type="button"
          className={`nav-cta-ghost${enterpriseActive ? ' is-active' : ''}`}
          onClick={() => {
            onEnterprise();
            setMobileOpen(false);
          }}
        >
          Enterprise Access
        </button>
      </div>
    </nav>
  );
}
