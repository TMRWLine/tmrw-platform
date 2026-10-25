import React from 'react';
import { BrandLockup } from './BrandLockup';
import { OPEN_DEPLOY_DRAWER_EVENT, emitOverlayEvent } from '../lib/overlayEvents';
import { BRISBANE_RUNWAY_PATH, COMMERCIAL_TIERS_PATH, HOW_IT_WORKS_PATH, THE_ROSTER_PATH } from '../lib/routes';

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

const NAV_LINKS: ReadonlyArray<{ label: string; id: Exclude<LandingSectionId, 'top'> }> = [
  { label: 'The Roster', id: 'roster' },
  { label: 'How It Works', id: 'how-it-works' },
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
  onCloseOverlays,
  onNavigateSection,
  onOpenPortal,
  tone = 'light',
}) => {
  const dark = tone === 'dark';
  const scrollTo = (id: Exclude<LandingSectionId, 'top'>) => {
    if (onNavigateSection) {
      onNavigateSection(id);
      return;
    }
    document
      .getElementById(landingSectionElementId(id))
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  const headerClass = dark
    ? 'fixed top-0 left-0 right-0 z-50 h-[74px] bg-[#0A0A0A]/92 backdrop-blur-md border-b border-white/10'
    : 'fixed top-0 left-0 right-0 z-50 h-[74px] bg-[#F7F7F6]/95 backdrop-blur-md border-b border-[#EAEAEA]';
  const linkClass = dark
    ? 'group relative inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold tracking-tight text-white transition-colors duration-150 cursor-pointer select-none bg-transparent border-0'
    : LINK_CLASS;
  const focusRing = dark
    ? 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]'
    : FOCUS_RING;
  const iconButton = dark
    ? 'inline-flex items-center justify-center p-2 rounded-full bg-transparent border-0 text-white hover:bg-white/10 transition-all duration-150 cursor-pointer'
    : ICON_BUTTON;

  return (
    <header className={headerClass}>
      {/* Grid container: shares the 1600px plumb line of the showcase cards below. */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 w-full h-full flex items-center justify-between">
        <BrandLockup tone={dark ? 'dark' : 'light'} onClick={goHome} />

        {/* Centre links */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
          {NAV_LINKS.map((link) => {
            const href =
              link.id === 'commercial-tiers'
                ? COMMERCIAL_TIERS_PATH
                : link.id === 'syndicate'
                  ? BRISBANE_RUNWAY_PATH
                  : link.id === 'how-it-works'
                    ? HOW_IT_WORKS_PATH
                    : link.id === 'roster'
                      ? THE_ROSTER_PATH
                      : `/#${landingSectionElementId(link.id)}`;
            const isRoute =
              link.id === 'commercial-tiers' ||
              link.id === 'syndicate' ||
              link.id === 'how-it-works' ||
              link.id === 'roster';
            return (
              <a
                key={link.id}
                href={href}
                onClick={(event) => {
                  event.preventDefault();
                  if (isRoute) {
                    if (onNavigateSection) {
                      onNavigateSection(link.id);
                      return;
                    }
                    window.location.assign(href);
                    return;
                  }
                  if (window.location.pathname === '/' && window.location.hash !== `#${landingSectionElementId(link.id)}`) {
                    window.history.pushState(null, '', href);
                  }
                  scrollTo(link.id);
                }}
                className={`${linkClass} ${focusRing} no-underline`}
              >
                <span>{link.label}</span>
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-[#B8FF00] opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 ease-out shadow-[0_0_8px_rgba(184,255,0,0.8)]"
                />
              </a>
            );
          })}
        </nav>

        {/* Right utility cluster */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={onOpenPortal}
            aria-haspopup="dialog"
            className={`group relative inline-flex items-center gap-2 rounded-full px-4 py-1.5 border transition-all duration-200 mr-4 cursor-pointer select-none ${focusRing} ${
              dark
                ? 'border-white/20 bg-white/[0.04] hover:bg-[#CCFF00] hover:border-[#CCFF00]'
                : 'border-[#080808]/20 bg-[#080808]/[0.03] hover:bg-[#080808] hover:border-[#080808]'
            }`}
          >
            {/* Live status telemetry beacon */}
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B8FF00] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#B8FF00] shadow-[0_0_10px_#B8FF00]"></span>
            </span>

            {/* Rolling monospace label */}
            <span
              className={`whitespace-nowrap font-mono text-[10px] font-bold tracking-[0.12em] ${
                dark ? 'text-white group-hover:text-black' : 'text-[#080808] group-hover:text-[#F7F7F6]'
              }`}
            >
              Athlete Portal
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleSearch}
            aria-label="Search the roster"
            aria-haspopup="dialog"
            aria-expanded={isSearchOpen}
            className={`${iconButton} ${focusRing}`}
          >
            <SearchIcon />
          </button>

          <button
            type="button"
            onClick={() => emitOverlayEvent(OPEN_DEPLOY_DRAWER_EVENT)}
            aria-label="Open capital deployment drawer"
            className={`${iconButton} ml-1 ${focusRing}`}
          >
            <BagIcon />
          </button>

          <button
            type="button"
            onClick={onToggleMenu}
            aria-label="Open menu"
            aria-haspopup="dialog"
            aria-expanded={isMenuOpen}
            className={`${iconButton} ml-1 ${focusRing}`}
          >
            <MenuIcon />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navigation;
