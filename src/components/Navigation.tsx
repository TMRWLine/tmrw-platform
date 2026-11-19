import React from 'react';
import { BrandLockup } from './BrandLockup';
import { PRIMARY_SECTION_PATHS, THE_ROSTER_PATH, isUnmodifiedLinkClick } from '../lib/routes';

/** Anchor targets on the landing page. `top` scrolls to the page origin. */
export type LandingSectionId =
  | 'top'
  | 'athletes'
  | 'sponsors'
  | 'roster'
  | 'ledger'
  | 'mandate'
  | 'catchment'
  | 'how-it-works'
  | 'commercial-tiers'
  | 'syndicate';

/** DOM ids for Lenis / native smooth-scroll. Hashes match the landing section anchors. */
export const LANDING_SECTION_ELEMENT_ID: Record<Exclude<LandingSectionId, 'top'>, string> = {
  athletes: 'athletes',
  sponsors: 'roster',
  roster: 'roster',
  ledger: 'settlement-ledger',
  mandate: 'mandate',
  catchment: 'catchment',
  'how-it-works': 'how-it-works',
  'commercial-tiers': 'commercial-tiers',
  syndicate: 'syndicate',
};

export function landingSectionElementId(id: Exclude<LandingSectionId, 'top'>): string {
  return LANDING_SECTION_ELEMENT_ID[id];
}

interface NavigationProps {
  /** Root-level overlay state, owned by `App`. Drives `aria-expanded` on the utility icons. */
  isSearchOpen: boolean;
  isMenuOpen: boolean;
  /** Search icon: toggles the search overlay. */
  onToggleSearch: () => void;
  /** Menu icon: toggles the editorial menu overlay. */
  onToggleMenu: () => void;
  onOpenBag: () => void;
  /** Closes every active overlay (search, menu, deploy drawer, portal drawer). */
  onCloseOverlays: () => void;
  /** Optional in-app navigation for links and the logo. */
  onNavigateSection?: (id: LandingSectionId) => void;
  /** Opens the athlete portal drawer. Wired to the Athlete Portal pill. */
  onOpenPortal: () => void;
  /** Light gallery chrome, or the institutional runway canvas. */
  tone?: 'light' | 'dark';
  compact?: boolean;
  activeSection?: LandingSectionId | null;
  activeLocation?: 'location' | 'page';
}

const NAV_LINKS: ReadonlyArray<{ label: string; id: keyof typeof PRIMARY_SECTION_PATHS }> = [
  { label: 'The Roster', id: 'roster' },
  { label: 'How it works', id: 'how-it-works' },
  { label: 'Commercial Tiers', id: 'commercial-tiers' },
  { label: 'LA 28 / Brisbane 32 Runway', id: 'syndicate' },
];

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#080808] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F7F6]';

/** Sharp ink type, no container; a Kinetic Volt signal dot (the lockup's period) reveals on hover. */
const LINK_CLASS =
  'group relative inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold tracking-tight text-[#080808] transition-colors duration-150 cursor-pointer select-none bg-transparent border-0';

/** Utility-cluster icon button: ink glyph with a soft neutral wash on hover. */
const ICON_BUTTON =
  'inline-flex items-center justify-center p-2 rounded-full bg-transparent border-0 text-[#080808] hover:bg-[#080808]/[0.05] transition-all duration-150 cursor-pointer';

/** Shared outline-icon attributes: 20px box, 1.5 stroke, inherits `currentColor`. */
const ICON_SVG = {
  className: 'w-5 h-5',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const;

const SearchIcon: React.FC = () => (
  <svg {...ICON_SVG}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.8-3.8" />
  </svg>
);

const BagIcon: React.FC = () => (
  <svg {...ICON_SVG}>
    <path d="M5.5 8h13l1 12.5h-15z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
  </svg>
);

const MenuIcon: React.FC = () => (
  <svg {...ICON_SVG}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const Navigation: React.FC<NavigationProps> = ({
  isSearchOpen,
  isMenuOpen,
  onToggleSearch,
  onToggleMenu,
  onOpenBag,
  onCloseOverlays,
  onNavigateSection,
  onOpenPortal,
  tone = 'light',
  compact = false,
  activeSection,
  activeLocation = 'page',
}) => {
  const dark = tone === 'dark' && !compact;
  const activeLabel = NAV_LINKS.find(link => link.id === activeSection)?.label;
  const navigateLink = (event: React.MouseEvent<HTMLAnchorElement>, id: LandingSectionId) => {
    if (!onNavigateSection || !isUnmodifiedLinkClick(event)) return;
    event.preventDefault();
    onNavigateSection(id);
  };

  /** Logo: dismiss every overlay, then return to the top of the application (`/`). */
  const goHome = () => {
    onCloseOverlays();
    if (onNavigateSection) {
      // Host router: leaves the sponsor workspace if needed and drives the Lenis scroll to 0.
      onNavigateSection('top');
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const headerClass = compact
    ? 'fixed top-0 left-0 right-0 z-50 h-[60px] bg-[#F7F7F6]/95 backdrop-blur-md border-b border-[#EAEAEA]'
    : dark
    ? 'fixed top-0 left-0 right-0 z-50 h-[74px] bg-[#0A0A0A]/92 backdrop-blur-md border-b border-white/10'
    : 'fixed top-0 left-0 right-0 z-50 h-[74px] bg-[#F7F7F6]/95 backdrop-blur-md border-b border-[#EAEAEA]';
  const linkClass = dark
    ? 'group relative inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold tracking-tight text-white transition-colors duration-150 cursor-pointer select-none bg-transparent border-0'
    : LINK_CLASS;
  const focusRing = dark
    ? 'focus:outline-none focus-visible:ring-2 focus-visible:ring-volt focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]'
    : FOCUS_RING;
  const iconButton = dark
    ? 'inline-flex items-center justify-center p-2 rounded-full bg-transparent border-0 text-white hover:bg-white/10 transition-all duration-150 cursor-pointer'
    : ICON_BUTTON;

  return (
    <header className={`tmrw-navigation ${headerClass}`} data-compact={compact}>
      {/* Grid container: shares the 1600px plumb line of the showcase cards below. */}
      <div className={`max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 w-full h-[74px] flex items-center justify-between ${compact ? '-translate-y-[7px]' : ''} ${compact && activeLabel ? 'max-lg:-translate-y-[13px]' : ''}`}>
        <BrandLockup tone={dark ? 'dark' : 'light'} onClick={goHome} className="nav-brand shrink-0 max-sm:[&>span]:w-[92px]" />

        {/* Centre links */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={PRIMARY_SECTION_PATHS[link.id]}
              aria-current={activeSection === link.id ? activeLocation : undefined}
              onClick={event => navigateLink(event, link.id)}
              className={`${linkClass} ${focusRing} no-underline ${compact && activeSection === link.id ? 'after:absolute after:inset-x-2.5 after:bottom-0 after:h-px after:bg-current' : ''}`}
            >
              <span>{link.label}</span>
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 ease-out ${dark ? 'bg-volt' : 'bg-[#080808]'}`}
              />
            </a>
          ))}
        </nav>

        {/* Right utility cluster */}
        <div className="nav-utilities flex items-center">
          <a
            href={THE_ROSTER_PATH}
            aria-current={activeSection === 'roster' ? activeLocation : undefined}
            onClick={event => navigateLink(event, 'roster')}
            className={`nav-phone-roster hidden shrink-0 items-center justify-center whitespace-nowrap px-1.5 text-xs font-semibold ${dark ? 'text-white' : 'text-[#080808]'} ${focusRing} ${activeSection === 'roster' ? 'underline underline-offset-2' : 'no-underline'}`}
          >
            Roster
          </a>
          <button
            type="button"
            onClick={onOpenPortal}
            aria-label="Athlete Portal"
            aria-haspopup="dialog"
            className={`nav-portal group relative inline-flex items-center gap-1 sm:gap-2 rounded-full px-2 sm:px-4 py-1.5 border transition-all duration-200 mr-1 sm:mr-4 cursor-pointer select-none ${focusRing} ${
              dark
                ? 'border-white/20 bg-white/[0.04] hover:bg-volt hover:border-volt'
                : 'border-[#080808]/20 bg-[#080808]/[0.03] hover:bg-[#080808] hover:border-[#080808]'
            }`}
          >
            {/* Portal dot */}
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className={`relative inline-flex rounded-full h-2 w-2 ${dark ? 'bg-volt group-hover:bg-black' : 'bg-[#080808] group-hover:bg-white'}`} />
            </span>

            {/* Rolling monospace label */}
            <span
              className={`whitespace-nowrap font-mono text-[9px] sm:text-[10px] font-bold tracking-[0.04em] sm:tracking-[0.12em] ${
                dark ? 'text-white group-hover:text-black' : 'text-[#080808] group-hover:text-[#F7F7F6]'
              }`}
            >
              <span className="hidden sm:inline">Athlete </span>Portal
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleSearch}
            aria-label="Search the roster"
            aria-haspopup="dialog"
            aria-expanded={isSearchOpen}
            className={`${iconButton} max-sm:p-1.5 ${focusRing}`}
          >
            <SearchIcon />
          </button>

          <button
            type="button"
            onClick={onOpenBag}
            aria-label="Open bag"
            aria-haspopup="dialog"
            className={`${iconButton} max-sm:p-1.5 sm:ml-1 ${focusRing}`}
          >
            <BagIcon />
          </button>

          <button
            type="button"
            onClick={onToggleMenu}
            aria-label="Open menu"
            aria-haspopup="dialog"
            aria-controls="site-menu"
            aria-expanded={isMenuOpen}
            className={`nav-menu-trigger ${iconButton} max-sm:p-1.5 sm:ml-1 ${focusRing}`}
          >
            <MenuIcon />
            <span className="nav-menu-label hidden text-xs font-semibold">Menu</span>
          </button>
        </div>
      </div>
      {compact && activeLabel && (
        <span key={activeSection} aria-current={activeLocation} className={`absolute bottom-0.5 inset-x-0 text-center text-[10px] leading-none text-[#080808] underline underline-offset-2 lg:hidden ${activeSection === 'roster' ? 'nav-active-roster' : ''}`}>
          {activeLabel}
        </span>
      )}
    </header>
  );
};

export default Navigation;
