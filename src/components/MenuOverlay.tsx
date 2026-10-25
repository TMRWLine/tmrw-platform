import React, { useEffect, useRef, useState } from 'react';
import { BrandLockup } from './BrandLockup';
import type { LandingSectionId } from './Navigation';
import { GUARDIAN_VERIFY_PATH } from './GuardianVerifyPage';
import { OPEN_DEPLOY_DRAWER_EVENT, emitOverlayEvent } from '../lib/overlayEvents';

interface MenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  /** Logo click: close the menu and reset the app to the home view. */
  onHome: () => void;
  onNavigateSection: (id: LandingSectionId) => void;
  onOpenSearch: () => void;
  onOpenPortal: () => void;
  onOpenSponsorWorkspace: () => void;
}

/** What a menu entry does. `none` renders the entry but has no destination yet. */
type MenuAction =
  | { kind: 'section'; id: LandingSectionId }
  | { kind: 'search' }
  | { kind: 'portal' }
  | { kind: 'sponsor-workspace' }
  | { kind: 'deploy' }
  | { kind: 'path'; path: string }
  | { kind: 'external'; href: string }
  | { kind: 'none' };

interface MenuItem {
  label: string;
  action: MenuAction;
}

const NAVIGATION: readonly MenuItem[] = [
  { label: 'The Roster', action: { kind: 'section', id: 'roster' } },
  { label: 'How It Works', action: { kind: 'section', id: 'how-it-works' } },
  { label: 'Commercial Tiers', action: { kind: 'section', id: 'commercial-tiers' } },
  { label: 'Brisbane 2032 Runway', action: { kind: 'section', id: 'syndicate' } },
];

const PROTOCOL: readonly MenuItem[] = [
  { label: 'Postcode Catchment Search', action: { kind: 'search' } },
  {
    label: 'Eligibility Verification',
    action: { kind: 'section', id: 'roster' },
  },
  {
    label: 'Guardian Consent Framework',
    action: { kind: 'path', path: GUARDIAN_VERIFY_PATH },
  },
  {
    label: 'Commercial Clearing EULA',
    action: { kind: 'section', id: 'ledger' },
  },
  { label: 'Support & Enquiries', action: { kind: 'none' } },
];

const PORTALS: readonly MenuItem[] = [
  { label: 'Deploy Capital', action: { kind: 'deploy' } },
  { label: 'Brand Sponsor Sign In', action: { kind: 'sponsor-workspace' } },
  { label: 'Athlete Portal', action: { kind: 'portal' } },
  {
    label: 'Guardian Verification',
    action: { kind: 'path', path: GUARDIAN_VERIFY_PATH },
  },
  {
    label: 'Enterprise Clearinghouse',
    action: { kind: 'section', id: 'ledger' },
  },
];

// Platform roots only: swap in the official tmrw/. handles once they are registered.
const FOLLOW: readonly MenuItem[] = [
  {
    label: 'Instagram',
    action: { kind: 'external', href: 'https://www.instagram.com/' },
  },
  {
    label: 'X (Twitter)',
    action: { kind: 'external', href: 'https://x.com/' },
  },
  {
    label: 'YouTube',
    action: { kind: 'external', href: 'https://www.youtube.com/' },
  },
  {
    label: 'LinkedIn',
    action: { kind: 'external', href: 'https://www.linkedin.com/' },
  },
];

/** Slide/fade duration. Keep in sync with the `duration-300` utilities below. */
const TRANSITION_MS = 300;

const HEADER_CLASS =
  'm-0 mb-3 font-mono text-xs uppercase text-[#666666] tracking-widest font-normal';
const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8FF00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#080808]';

const PRIMARY_LINK = `block text-left p-0 bg-transparent border-0 font-display font-bold text-lg md:text-xl text-[#F7F7F6] hover:text-[#B8FF00] transition-colors duration-150 cursor-pointer mb-1.5 ${FOCUS_RING}`;
const SECONDARY_LINK = `block text-left p-0 bg-transparent border-0 text-xs md:text-sm text-[#CCCCCC] hover:text-white transition-colors cursor-pointer mb-1.5 ${FOCUS_RING}`;
const SOCIAL_LINK = `block text-left p-0 bg-transparent border-0 text-xs md:text-sm text-[#CCCCCC] hover:text-[#B8FF00] transition-colors cursor-pointer mb-1.5 no-underline ${FOCUS_RING}`;

/* ---- Monochrome payment-partner badges (outline + glyphs, inherit currentColor) ---- */

const BADGE_SVG = {
  viewBox: '0 0 56 32',
  className: 'h-6 w-auto',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1,
  role: 'img',
} as const;

const BadgeFrame: React.FC = () => <rect x="0.5" y="0.5" width="55" height="31" rx="5" />;

const ApplePayBadge: React.FC = () => (
  <svg {...BADGE_SVG} aria-label="Apple Pay">
    <BadgeFrame />
    <text
      x="28"
      y="19.5"
      textAnchor="middle"
      fill="currentColor"
      stroke="none"
      fontFamily="Inter, Helvetica, Arial, sans-serif"
      fontSize="9.5"
      fontWeight="700"
    >
      Apple Pay
    </text>
  </svg>
);

const PayPalBadge: React.FC = () => (
  <svg {...BADGE_SVG} aria-label="PayPal">
    <BadgeFrame />
    <text
      x="28"
      y="20"
      textAnchor="middle"
      fill="currentColor"
      stroke="none"
      fontFamily="Inter, Helvetica, Arial, sans-serif"
      fontSize="10"
      fontWeight="800"
      fontStyle="italic"
    >
      PayPal
    </text>
  </svg>
);

const MastercardBadge: React.FC = () => (
  <svg {...BADGE_SVG} aria-label="Mastercard">
    <BadgeFrame />
    <circle cx="22.5" cy="16" r="7.5" />
    <circle cx="33.5" cy="16" r="7.5" />
  </svg>
);

const VisaBadge: React.FC = () => (
  <svg {...BADGE_SVG} aria-label="VISA">
    <BadgeFrame />
    <text
      x="28"
      y="21"
      textAnchor="middle"
      fill="currentColor"
      stroke="none"
      fontFamily="Inter, Helvetica, Arial, sans-serif"
      fontSize="13"
      fontWeight="800"
      fontStyle="italic"
      letterSpacing="0.5"
    >
      VISA
    </text>
  </svg>
);

/** Official Stripe wordmark vector, pure white at 70% opacity. */
const StripeWordmark: React.FC = () => (
  <svg
    viewBox="0 0 60 25"
    className="h-5 w-auto text-white opacity-70"
    fill="currentColor"
    role="img"
    aria-label="Stripe"
  >
    <path
      fillRule="evenodd"
      d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.93 0 1.85 6.29.97 6.29 5.88z"
    />
  </svg>
);

const CloseIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const MenuOverlay: React.FC<MenuOverlayProps> = ({
  isOpen,
  onClose,
  onHome,
  onNavigateSection,
  onOpenSearch,
  onOpenPortal,
  onOpenSponsorWorkspace,
}) => {
  const closeRef = useRef<HTMLButtonElement>(null);

  // `mounted` keeps the tree alive through the slide-out; `shown` drives the transform/opacity.
  const [mounted, setMounted] = useState(isOpen);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      // Two frames: commit the off-screen state first so the transition actually runs.
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    setShown(false);
    const timer = window.setTimeout(() => setMounted(false), TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (shown) closeRef.current?.focus();
  }, [shown]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!mounted) return null;

  const run = (action: MenuAction) => {
    switch (action.kind) {
      case 'none':
        return;
      case 'external':
        return; // rendered as a real anchor
      case 'path':
        window.location.assign(action.path);
        return;
      case 'section':
        onClose();
        onNavigateSection(action.id);
        return;
      case 'search':
        onClose();
        onOpenSearch();
        return;
      case 'portal':
        onClose();
        onOpenPortal();
        return;
      case 'sponsor-workspace':
        onClose();
        onOpenSponsorWorkspace();
        return;
      case 'deploy':
        onClose();
        emitOverlayEvent(OPEN_DEPLOY_DRAWER_EVENT);
        return;
    }
  };

  const renderItems = (items: readonly MenuItem[], linkClass: string) => (
    <ul className="m-0 p-0 list-none">
      {items.map((item) =>
        item.action.kind === 'external' ? (
          <li key={item.label} className="m-0 p-0">
            <a
              href={item.action.href}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              {item.label}
            </a>
          </li>
        ) : (
          <li key={item.label} className="m-0 p-0">
            <button
              type="button"
              onClick={() => run(item.action)}
              aria-disabled={item.action.kind === 'none' || undefined}
              className={linkClass}
            >
              {item.label}
            </button>
          </li>
        ),
      )}
    </ul>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
      data-lenis-prevent
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop scrim: everything below the curtain dismisses the menu */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close menu"
        onClick={onClose}
        className={`absolute inset-0 w-full h-full p-0 border-0 cursor-default bg-black/60 backdrop-blur-md transition-opacity duration-300 ${
          shown ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Top curtain drawer */}
      <div
        className={`absolute top-0 left-0 w-full h-[55vh] min-h-[440px] max-h-[580px] bg-[#080808] text-white border-b border-white/10 z-10 flex flex-col justify-between p-8 md:p-12 shadow-2xl overflow-y-auto select-none transition-transform duration-300 ease-out ${
          shown ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        {/* Top header */}
        <div className="flex items-start justify-between">
          <BrandLockup tone="dark" onClick={onHome} />
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className={`inline-flex items-center justify-center p-0 bg-transparent border-0 text-white hover:text-[#B8FF00] transition-colors duration-150 cursor-pointer ${FOCUS_RING}`}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Four-column grid */}
        <nav
          aria-label="Menu sections"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-8 py-8"
        >
          <section aria-labelledby="menu-navigation">
            <h2 id="menu-navigation" className={HEADER_CLASS}>
              Navigation
            </h2>
            {renderItems(NAVIGATION, PRIMARY_LINK)}
          </section>

          <section aria-labelledby="menu-protocol">
            <h2 id="menu-protocol" className={HEADER_CLASS}>
              Protocol
            </h2>
            {renderItems(PROTOCOL, SECONDARY_LINK)}
          </section>

          <section aria-labelledby="menu-portals">
            <h2 id="menu-portals" className={HEADER_CLASS}>
              Portals
            </h2>
            {renderItems(PORTALS, SECONDARY_LINK)}
          </section>

          <section aria-labelledby="menu-follow">
            <h2 id="menu-follow" className={HEADER_CLASS}>
              Follow us
            </h2>
            {renderItems(FOLLOW, SOCIAL_LINK)}
          </section>
        </nav>

        {/* Institutional footer bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pt-6 border-t border-white/10">
          <ul
            aria-label="Payment and clearing partners"
            className="m-0 p-0 list-none flex flex-wrap items-center gap-3 text-[#999999]"
          >
            <li className="m-0 p-0">
              <ApplePayBadge />
            </li>
            <li className="m-0 p-0">
              <PayPalBadge />
            </li>
            <li className="m-0 p-0">
              <MastercardBadge />
            </li>
            <li className="m-0 p-0">
              <VisaBadge />
            </li>
            <li className="m-0 p-0 ml-1">
              <StripeWordmark />
            </li>
          </ul>
          <p className="m-0 text-[10px] font-mono text-[#666666]">
            Copyright © 2026 tmrw/. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MenuOverlay;
