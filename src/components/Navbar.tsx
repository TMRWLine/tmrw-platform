import { useState } from 'react';
import { Menu, X, LogIn } from 'lucide-react';

export type NavView = 'roster' | 'campaign' | 'media' | 'admin';

interface NavbarProps {
  activeView: NavView;
  onNavigate: (view: NavView) => void;
  onOpenAdmin: () => void;
}

const NAV_ITEMS: { key: NavView; label: string }[] = [
  { key: 'roster', label: 'Roster Explorer' },
  { key: 'campaign', label: 'Campaign Manager' },
  { key: 'media', label: 'AI Media Studio' },
  { key: 'admin', label: 'Admin Control' },
];

export function Navbar({ activeView, onNavigate, onOpenAdmin }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="nav-links-wrap" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <div className="compliance-badge-nav">
        <span className="dot" />
        <span>SOC2 COMPLIANT // TPA COMPLIANCE ENGINE ACTIVE</span>
      </div>
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
            key={item.key}
            className={activeView === item.key ? 'active' : ''}
            onClick={() => {
              if (item.key === 'admin') {
                onOpenAdmin();
              } else {
                onNavigate(item.key);
              }
              setMobileOpen(false);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <button className="signin-cta" aria-label="Corporate Sign In">
        <LogIn size={14} />
        <span>Corporate Sign In</span>
      </button>
    </nav>
  );
}
