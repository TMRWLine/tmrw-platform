import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { useReducedMotion } from '../lib/useReducedMotion';
import { BRISBANE_RUNWAY_PATH, THE_ROSTER_PATH } from '../lib/routes';
import type { LandingSectionId } from './Navigation';
import { CourtLinesOverlay } from './CourtLinesOverlay';
import { RollingPillButton } from './RollingPillButton';
import './CoverHero.css';

const LINKS = [
  { id: 'roster', href: THE_ROSTER_PATH, label: 'Explore the Roster', variant: 'primary' },
  { id: 'syndicate', href: BRISBANE_RUNWAY_PATH, label: 'Brisbane 2032 Runway', variant: 'glass' },
] as const;

const SIZES = '(max-width: 420px) 100vw, 612px';
const FINE_POINTER = '(hover: hover) and (pointer: fine)';

function moveLight(event: PointerEvent<HTMLElement>) {
  if (event.pointerType !== 'mouse' || !window.matchMedia(FINE_POINTER).matches) return;
  const target = event.currentTarget;
  const { left, top, width, height } = target.getBoundingClientRect();
  target.style.setProperty('--cover-light-x', `${((event.clientX - left) / width - 0.5) * 18}px`);
  target.style.setProperty('--cover-light-y', `${((event.clientY - top) / height - 0.5) * 12}px`);
}

export function CoverHero({ onNavigateSection, overlayOpen, scrollForKeyboardFocus }: {
  onNavigateSection: (id: LandingSectionId) => void;
  overlayOpen: boolean;
  scrollForKeyboardFocus: (top?: number) => void;
}) {
  const reducedMotion = useReducedMotion();
  const cover = useRef<HTMLElement>(null);
  const marker = useRef<HTMLSpanElement>(null);
  const quickLinks = useRef<HTMLElement>(null);
  const [pastCover, setPastCover] = useState(false);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    if (!cover.current || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      setPastCover(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0);
    });
    observer.observe(cover.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reducedMotion || CSS.supports('animation-timeline: scroll(root block)') || !marker.current || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      setWide(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(marker.current);
    return () => observer.disconnect();
  }, [reducedMotion]);

  useEffect(() => {
    const bar = quickLinks.current;
    if (!bar) return;
    const rootStyle = document.documentElement.style;
    const syncBarHeight = () => {
      rootStyle.setProperty('--cover-quick-links-height', `${bar.getBoundingClientRect().height}px`);
    };
    syncBarHeight();
    const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(syncBarHeight) : null;
    resizeObserver?.observe(bar, { box: 'border-box' });

    const focusGap = 8;
    let frame = 0;
    const keepFocusVisible = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.matches(':focus-visible') || !bar.offsetHeight) return;
      scrollForKeyboardFocus();
      if (bar.contains(target)) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          if (document.activeElement !== target) return;
          const barRect = bar.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();
          const overlap = targetRect.bottom + focusGap - barRect.top;
          if (barRect.height > 0 && overlap > 0 && targetRect.top < barRect.bottom) {
            scrollForKeyboardFocus(window.scrollY + Math.ceil(overlap));
          }
        });
      });
    };
    document.addEventListener('focusin', keepFocusVisible);
    return () => {
      document.removeEventListener('focusin', keepFocusVisible);
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      rootStyle.removeProperty('--cover-quick-links-height');
    };
  }, [pastCover, overlayOpen, scrollForKeyboardFocus]);

  const links = LINKS.map(({ id, href, label, variant }) => (
    <RollingPillButton key={id} href={href} variant={variant} className={variant === 'glass' ? 'bg-black/85' : ''}
      onClick={(event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        onNavigateSection(id);
      }}>
      {label}
    </RollingPillButton>
  ));

  return (
    <>
      <section
        ref={cover}
        aria-label="tmrw cover"
        className="cover-stage relative isolate grid bg-white"
        data-wide={wide}
        onPointerMove={reducedMotion ? undefined : moveLight}
        onPointerLeave={(event) => {
          event.currentTarget.style.removeProperty('--cover-light-x');
          event.currentTarget.style.removeProperty('--cover-light-y');
        }}
      >
        <span ref={marker} className="cover-marker" aria-hidden="true" />
        <div className="cover-edge" aria-hidden="true">
          <picture>
            <source type="image/avif" srcSet="/coverpage-420.avif 420w, /coverpage-612.avif 612w" sizes={SIZES} />
            <source type="image/webp" srcSet="/coverpage-420.webp 420w, /coverpage-612.webp 612w" sizes={SIZES} />
            <img className="cover-photo" src="/coverpage.jpg" alt="" width={612} height={407}
              draggable={false} {...{ fetchpriority: 'high' }} />
          </picture>
          <div className="cover-lamps">
            <span /><span /><span />
          </div>
          <div className="cover-scrim" />
          <CourtLinesOverlay className="cover-court" />
        </div>
        <div className="cover-title relative z-10 grid place-items-center text-center font-display font-extrabold tracking-tight text-[#F7F7F6]">
          <h1 id="cover-heading" className="cover-settled m-0" aria-label="Line up your future">
            Line up your <span className="whitespace-nowrap">future<span className="cover-dot" aria-hidden="true" /></span>
          </h1>
          <div className="cover-intro" aria-hidden="true">
            <div><span>Line</span>{' '}<span>up</span></div>
            <div><span>your</span>{' '}<span>future</span></div>
          </div>
        </div>
        <div className="cover-actions relative z-20">
          {links}
        </div>
      </section>
      {pastCover && !overlayOpen && (
        <nav ref={quickLinks} className="cover-quick-links" aria-label="Quick links">
          {links}
        </nav>
      )}
    </>
  );
}
