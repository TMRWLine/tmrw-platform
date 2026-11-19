import React from 'react';
import { BrandLockup } from './BrandLockup';
import { PRIMARY_LINKS, isPlainLinkActivation } from '../lib/routes';

export const SITE_MENU_ID = 'site-menu';
export const SITE_MENU_TRIGGER_ID = 'site-menu-trigger';

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
  currentPath: string;
  /** Search icon: toggles the search overlay. */
  onToggleSearch: () => void;
  /** Menu icon: toggles the editorial menu overlay. */
  onToggleMenu: () => void;
  /** Closes every active overlay (search, menu, deploy drawer, portal drawer). */
  onCloseOverlays: () => void;
  /**
   * Optional router for section links and the logo. The host owns smooth-scroll (Lenis), so it can
   * land precisely under the fixed bar. Falls back to a native smooth scroll.
   */
  onNavigateSection?: (id: LandingSectionId) => void;
  /** Opens the athlete portal drawer. Wired to the Athlete Portal pill. */
  onOpenPortal: () => void;
  /** Light gallery chrome, or the institutional runway canvas. */
  tone?: 'light' | 'dark';
}

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#080808] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F7F6]';

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

const MenuIcon: React.FC = () => (
  <svg {...ICON_SVG}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const Navigation: React.FC<NavigationProps> = ({
  isSearchOpen,
  isMenuOpen,
  currentPath,
  onToggleSearch,
  onToggleMenu,
  onCloseOverlays,
  onNavigateSection,
  onOpenPortal,
  tone = 'light',
}) => {
  const dark = tone === 'dark';
  /** Logo: dismiss every overlay, then return to the top of the application (`/`). */
  const goHome = () => {
    onCloseOverlays();
    if (onNavigateSection) {
      // Host router: leaves the sponsor workspace if needed and drives the Lenis scroll to 0.
      onNavigateSection('top');
      return;
    }
    window.scrollTo({ top: 0 });
  };

  const headerClass = dark
    ? 'fixed top-0 left-0 right-0 z-50 h-[74px] bg-[#0A0A0A]/92 backdrop-blur-md border-b border-white/10'
    : 'fixed top-0 left-0 right-0 z-50 h-[74px] bg-[#F7F7F6]/95 backdrop-blur-md border-b border-[#EAEAEA]';
  const focusRing = dark
    ? 'focus:outline-none focus-visible:ring-2 focus-visible:ring-volt focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]'
    : FOCUS_RING;
  const utility = `min-h-11 min-w-11 items-center justify-center border-0 bg-transparent text-inherit hover:underline active:opacity-75 ${focusRing}`;

  return (
    <header className={headerClass}>
      {/* Grid container: shares the 1600px plumb line of the showcase cards below. */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 w-full h-full flex items-center justify-between">
        <BrandLockup tone={dark ? 'dark' : 'light'} onClick={goHome} className="min-h-11 justify-center !px-1" />

        {/* Centre links */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {PRIMARY_LINKS.map(({ id, href, label }) => (
            <a
              key={id}
              href={href}
              aria-current={currentPath === href ? 'page' : undefined}
              onClick={(event) => {
                if (!onNavigateSection || !isPlainLinkActivation(event)) return;
                event.preventDefault();
                onNavigateSection(id);
              }}
              className={`inline-flex min-h-11 items-center px-2.5 text-xs font-semibold text-inherit no-underline underline-offset-4 hover:underline aria-[current=page]:underline ${focusRing}`}
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Right utility cluster */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenPortal}
            aria-haspopup="dialog"
            className={`hidden px-3 text-xs font-semibold sm:inline-flex ${utility}`}
          >
            Athlete access
          </button>

          <button
            type="button"
            onClick={onToggleSearch}
            aria-label="Search the roster"
            aria-haspopup="dialog"
            aria-expanded={isSearchOpen}
            className={`inline-flex hover:bg-current/5 ${utility}`}
          >
            <SearchIcon />
          </button>

          <button
            id={SITE_MENU_TRIGGER_ID}
            type="button"
            onClick={onToggleMenu}
            aria-label="Open menu"
            aria-haspopup="dialog"
            aria-expanded={isMenuOpen}
            aria-controls={SITE_MENU_ID}
            className={`inline-flex gap-2 px-2 text-xs font-semibold ${utility}`}
          >
            Menu
            <MenuIcon />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navigation;
