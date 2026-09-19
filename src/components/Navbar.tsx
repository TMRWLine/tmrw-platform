import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export type NavView = 'sponsor' | 'athlete' | 'drops';

interface NavbarProps {
  activeView: NavView | null;
  onNavigate: (view: NavView) => void;
}

const NAV_ITEMS: { id: string; view: NavView; label: string }[] = [
  { id: 'sponsor', view: 'sponsor', label: 'Sponsor Access' },
  { id: 'athlete', view: 'athlete', label: 'Athlete Portal' },
  { id: 'drops', view: 'drops', label: 'Collab Drops' },
];

export function Navbar({ activeView, onNavigate }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

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
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={activeView === item.view ? 'active' : ''}
            onClick={() => {
              onNavigate(item.view);
              setMobileOpen(false);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
