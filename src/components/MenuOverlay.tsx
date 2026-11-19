import { useLayoutEffect, useRef } from 'react';
import { OPEN_DEPLOY_DRAWER_EVENT, emitOverlayEvent } from '../lib/overlayEvents';
import { PRIMARY_LINKS, isPlainLinkActivation } from '../lib/routes';
import { BrandLockup } from './BrandLockup';
import { SITE_MENU_ID, SITE_MENU_TRIGGER_ID, type LandingSectionId } from './Navigation';
import './MenuOverlay.css';

interface MenuOverlayProps {
  isOpen: boolean;
  currentPath: string;
  onClose: () => void;
  onNavigateSection: (id: LandingSectionId, headingId: string) => void;
  onOpenSearch: () => void;
  onOpenPortal: () => void;
}

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt';
const UTILITY = `flex min-h-11 w-fit items-center border-0 bg-transparent text-left text-base text-[#F7F7F6] underline-offset-4 hover:underline active:opacity-75 ${FOCUS}`;

export function MenuOverlay({ isOpen, currentPath, onClose, onNavigateSection, onOpenSearch, onOpenPortal }: MenuOverlayProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      dialog.showModal();
      closeRef.current?.focus({ preventScroll: true });
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  function finish(next?: () => void) {
    dialogRef.current?.close();
    onClose();
    if (next) {
      next();
    } else {
      document.getElementById(SITE_MENU_TRIGGER_ID)?.focus({ preventScroll: true });
    }
  }

  return (
    <dialog
      id={SITE_MENU_ID}
      ref={dialogRef}
      aria-label="Site menu"
      aria-modal="true"
      data-lenis-prevent
      onCancel={(event) => {
        event.preventDefault();
        finish();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) finish();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const controls = event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
        const first = controls[0];
        const last = controls[controls.length - 1];
        if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
          event.preventDefault();
          (event.shiftKey ? last : first)?.focus();
        }
      }}
      className="site-menu fixed inset-x-0 top-0 m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto overscroll-contain border-0 border-b border-white/15 bg-[#080808] p-0 text-[#F7F7F6] backdrop:bg-black/60 md:bottom-auto md:h-fit md:max-h-[calc(100dvh-2rem)]"
    >
      <div className="mx-auto max-w-[1600px]">
        <div className="site-menu-header sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/20 bg-[#080808] px-5 pb-3 sm:px-10 lg:px-16">
          <BrandLockup tone="dark" className="min-h-11 justify-center !px-1" onClick={() => finish(() => onNavigateSection('top', 'cover-heading'))} />
          <button ref={closeRef} type="button" aria-label="Close menu" onClick={() => finish()} className={`min-w-11 gap-2 px-2 ${UTILITY}`}>
            Close
            <span aria-hidden="true" className="text-xl leading-none">×</span>
          </button>
        </div>
        <div className="site-menu-content grid gap-8 px-5 pt-7 sm:px-10 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:gap-16 lg:px-16">
          <nav aria-label="Primary">
            <ul className="m-0 list-none p-0">
              {PRIMARY_LINKS.map(({ id, href, label, headingId }, index) => (
                <li key={id} className="site-menu-link border-b border-white/20" style={{ animationDelay: `${index * 25}ms` }}>
                  <a
                    href={href}
                    aria-current={currentPath === href ? 'page' : undefined}
                    onClick={(event) => {
                      if (!isPlainLinkActivation(event)) return;
                      event.preventDefault();
                      finish(() => onNavigateSection(id, headingId));
                    }}
                    className={`flex min-h-11 items-center justify-between gap-3 py-2 font-display text-2xl font-extrabold leading-tight text-inherit no-underline underline-offset-4 hover:underline aria-[current=page]:underline md:text-3xl ${FOCUS}`}
                  >
                    {label}
                    <span aria-hidden="true" className="text-base text-neutral-300">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <section aria-labelledby="site-menu-tools">
            <h2 id="site-menu-tools" className="mb-2 mt-0 font-mono text-xs uppercase tracking-widest text-neutral-400">Tools</h2>
            <button type="button" aria-haspopup="dialog" className={UTILITY} onClick={() => finish(onOpenSearch)}>Search the roster</button>
            <button type="button" aria-haspopup="dialog" className={UTILITY} onClick={() => finish(onOpenPortal)}>Athlete access</button>
            <button
              type="button"
              className={UTILITY}
              onClick={() => finish(() => emitOverlayEvent(OPEN_DEPLOY_DRAWER_EVENT))}
            >
              Deploy Capital
            </button>
            <p className="mb-0 mt-4 max-w-[36ch] text-sm leading-relaxed text-neutral-300">
              Parents and guardians: use the private verification link sent to you.
            </p>
          </section>
        </div>
      </div>
    </dialog>
  );
}

export default MenuOverlay;
