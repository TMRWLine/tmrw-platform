import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { flushSync } from 'react-dom';
import {
  COVER_CTA_SLIDE_MS, COVER_CTA_START_MS, COVER_LINE_DELAYS, COVER_LINE_DRAW_MS,
  COVER_SETTLE_MS, COVER_TITLE_MORPH_MS, COVER_WORD_DELAYS, coverWordTransform,
} from '../lib/coverMotion';
import { BRISBANE_RUNWAY_PATH, THE_ROSTER_PATH } from '../lib/routes';
import { useReducedMotion } from '../lib/useReducedMotion';
import type { LandingSectionId } from './Navigation';
import { CourtLinesOverlay } from './CourtLinesOverlay';
import { FilmGrainOverlay } from './FilmGrainOverlay';
import { RollingPillButton } from './RollingPillButton';
import './CoverHero.css';

const WORDS = ['Line', 'up', 'your', 'future'] as const;
const FINE_POINTER = '(hover: hover) and (pointer: fine)';
const EASE = 'cubic-bezier(.16, 1, .3, 1)';
const IMAGE_SIZES = '(max-width: 420px) 100vw, 612px';
const LINKS = [
  { id: 'roster', href: THE_ROSTER_PATH, label: 'Explore the Roster', variant: 'primary' },
  { id: 'syndicate', href: BRISBANE_RUNWAY_PATH, label: 'Brisbane 2032 Runway', variant: 'glass' },
] as const;

function CoverPhoto({ soft = false }: { soft?: boolean }) {
  return (
    <picture>
      <source type="image/avif" srcSet="/coverpage-420.avif 420w, /coverpage-612.avif 612w" sizes={IMAGE_SIZES} />
      <source type="image/webp" srcSet="/coverpage-420.webp 420w, /coverpage-612.webp 612w" sizes={IMAGE_SIZES} />
      <img className={`cover-photo${soft ? ' cover-photo-soft' : ''}`} src="/coverpage.jpg" alt=""
        width={612} height={407} draggable={false} {...{ fetchpriority: 'high' }} />
    </picture>
  );
}

export function CoverHero({ onNavigateSection, overlayOpen, scrollForKeyboardFocus }: {
  onNavigateSection: (id: LandingSectionId) => void;
  overlayOpen: boolean;
  scrollForKeyboardFocus: (top?: number) => void;
}) {
  const reduced = useReducedMotion();
  const [settled, setSettled] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);
  const [pulsePaused, setPulsePaused] = useState(false);
  const [pastCover, setPastCover] = useState(false);
  const [wide, setWide] = useState(false);
  const intro = !reduced && !introComplete;
  const openingTitle = !reduced && !settled;
  const cover = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const introLayout = useRef<HTMLSpanElement>(null);
  const finalLayout = useRef<HTMLSpanElement>(null);
  const skip = useRef<HTMLButtonElement>(null);
  const quickLinks = useRef<HTMLElement>(null);
  const marker = useRef<HTMLSpanElement>(null);
  const animations = useRef<Animation[]>([]);
  const pointer = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, frame: 0 });

  const settleTitle = useCallback((startTime: number) => {
    const title = heading.current;
    if (!title) return;
    const words = Array.from(title.querySelectorAll<HTMLElement>('.cover-word'));
    const before = words.map(node => node.style.transform);
    flushSync(() => setSettled(true));
    animations.current = words.flatMap((node, index) => {
      if (!before[index] || typeof node.animate !== 'function') return [];
      const animation = node.animate([
        { transform: before[index] },
        { transform: node.style.transform },
      ], { duration: COVER_TITLE_MORPH_MS, easing: EASE });
      animation.startTime = startTime;
      return [animation];
    });
  }, []);

  const finishIntro = useCallback(() => {
    const returnFocus = document.activeElement === skip.current;
    animations.current.forEach(animation => animation.cancel());
    setSettled(true);
    setIntroComplete(true);
    if (returnFocus) heading.current?.focus({ preventScroll: true });
  }, []);

  useLayoutEffect(() => {
    const title = heading.current;
    const introSample = introLayout.current;
    const finalSample = finalLayout.current;
    if (!title || !introSample || !finalSample) return;
    const words = Array.from(title.querySelectorAll<HTMLElement>('.cover-word'));
    const introBoxes = Array.from(introSample.querySelectorAll('.cover-word-sample'));
    const finalBoxes = Array.from(finalSample.querySelectorAll('.cover-word-sample'));
    const positionWords = () => {
      const origin = title.getBoundingClientRect();
      const targetBoxes = openingTitle ? introBoxes : finalBoxes;
      const transforms = targetBoxes.map((sample, index) => {
        const box = finalBoxes[index].getBoundingClientRect();
        return box.width && box.height
          ? coverWordTransform(sample.getBoundingClientRect(), { left: origin.left, top: origin.top, width: box.width, height: box.height })
          : '';
      });
      words.forEach((node, index) => { node.style.transform = transforms[index]; });
    };
    positionWords();
    const observer = new ResizeObserver(positionWords);
    [...introBoxes, ...finalBoxes, title].forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, [openingTitle]);

  useEffect(() => {
    if (!intro) return;
    const morphDelay = COVER_SETTLE_MS - COVER_TITLE_MORPH_MS;
    const morphStart = performance.now() + morphDelay;
    const morphTimer = window.setTimeout(() => settleTitle(morphStart), morphDelay);
    const finishTimer = window.setTimeout(finishIntro, COVER_SETTLE_MS);
    return () => {
      window.clearTimeout(morphTimer);
      window.clearTimeout(finishTimer);
    };
  }, [intro, settleTitle, finishIntro]);

  useEffect(() => {
    if (reduced) animations.current.forEach(animation => animation.cancel());
    return () => animations.current.forEach(animation => animation.cancel());
  }, [reduced]);

  useEffect(() => {
    const stage = cover.current;
    if (!stage || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      setPastCover(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0);
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const edgeMarker = marker.current;
    if (reduced || CSS.supports('animation-timeline: scroll(root block)') || !edgeMarker || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      setWide(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(edgeMarker);
    return () => observer.disconnect();
  }, [reduced]);

  useEffect(() => {
    const bar = quickLinks.current;
    if (!bar) return;
    const style = document.documentElement.style;
    const sync = () => style.setProperty('--cover-quick-links-height', `${bar.getBoundingClientRect().height}px`);
    sync();
    const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(sync) : null;
    resizeObserver?.observe(bar, { box: 'border-box' });
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
          const overlap = targetRect.bottom + 8 - barRect.top;
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
      style.removeProperty('--cover-quick-links-height');
    };
  }, [pastCover, overlayOpen, scrollForKeyboardFocus]);

  const glide = useCallback(() => {
    const state = pointer.current;
    if (state.frame) return;
    const tick = () => {
      const stage = cover.current;
      if (!stage) return;
      const dx = state.targetX - state.x;
      const dy = state.targetY - state.y;
      const atRest = Math.abs(dx) + Math.abs(dy) < .045;
      state.x = atRest ? state.targetX : state.x + dx * .13;
      state.y = atRest ? state.targetY : state.y + dy * .13;
      stage.style.setProperty('--cover-x', `${state.x}px`);
      stage.style.setProperty('--cover-y', `${state.y}px`);
      state.frame = atRest ? 0 : requestAnimationFrame(tick);
    };
    state.frame = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    const state = pointer.current;
    const stage = cover.current;
    return () => {
      cancelAnimationFrame(state.frame);
      Object.assign(state, { x: 0, y: 0, targetX: 0, targetY: 0, frame: 0 });
      stage?.style.removeProperty('--cover-x');
      stage?.style.removeProperty('--cover-y');
    };
  }, [reduced]);

  const movePointer = (event: PointerEvent<HTMLElement>) => {
    if (intro || reduced || event.pointerType !== 'mouse' || !window.matchMedia(FINE_POINTER).matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointer.current.targetX = ((event.clientX - bounds.left) / bounds.width - .5) * 32;
    pointer.current.targetY = ((event.clientY - bounds.top) / bounds.height - .5) * 32;
    glide();
  };

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

  const sceneTiming = Object.fromEntries([
    ...COVER_LINE_DELAYS.map((delay, index) => [`--cover-line-${index + 1}`, `${delay}ms`]),
    ['--cover-last-beat', `${COVER_WORD_DELAYS[3]}ms`],
    ['--cover-line-draw', `${COVER_LINE_DRAW_MS}ms`],
    ['--cover-cta-start', `${COVER_CTA_START_MS}ms`],
    ['--cover-cta-slide', `${COVER_CTA_SLIDE_MS}ms`],
    ['--cover-settle', `${COVER_SETTLE_MS}ms`],
  ]) as CSSProperties;

  return (
    <>
      <section ref={cover} aria-label="tmrw cover" className="cover-stage" data-intro={intro} data-wide={wide}
        style={sceneTiming}
        onPointerMove={movePointer}
        onPointerLeave={() => {
          if (!pointer.current.x && !pointer.current.y && !pointer.current.frame) return;
          pointer.current.targetX = pointer.current.targetY = 0;
          glide();
        }}>
        <span ref={marker} className="cover-marker" aria-hidden="true" />
        <div className="cover-edge" aria-hidden="true">
          <div className="cover-image-plane">
            <div className="cover-camera">
              <div className="cover-photo-stack">
                <CoverPhoto />
                {!reduced && <CoverPhoto soft />}
              </div>
              {!reduced && (
                <div className="cover-lamp-plane">
                  {COVER_WORD_DELAYS.map(delay => (
                    <span key={delay} style={{ '--word-delay': `${delay}ms` } as CSSProperties} />
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="cover-red-glow" />
          <div className="cover-scrim" />
          <div className="cover-parallax-glow" />
          <div className="cover-bloom" />
          <FilmGrainOverlay />
          <CourtLinesOverlay className="cover-court" />
        </div>
        <div className="cover-title">
          <div className="cover-type-measure font-display" aria-hidden="true">
            {[true, false].map(opening => (
              <span key={String(opening)} className={opening ? 'cover-measure-intro' : 'cover-measure-final'}
                ref={opening ? introLayout : finalLayout}>
                {WORDS.map((word, index) => (
                  <Fragment key={word}>
                    {index > 0 && ' '}
                    <span className="cover-word-sample">
                      {word}{index === 3 && <span className="cover-dot" />}
                    </span>
                    {index === 1 && opening && <br />}
                  </Fragment>
                ))}
              </span>
            ))}
          </div>
          <h1 ref={heading} id="cover-heading" className="font-display" tabIndex={-1} aria-label="Line up your future">
            {WORDS.map((word, index) => (
              <Fragment key={word}>
                {index > 0 && ' '}
                <span className="cover-word" style={{ '--word-delay': `${COVER_WORD_DELAYS[index]}ms` } as CSSProperties}>
                  <span className="cover-word-mask"><span className="cover-word-rise">
                    {word}
                    {index === 3 && (
                      <span className="cover-dot" data-paused={pulsePaused}>
                        <span className="cover-dot-drop" aria-hidden="true"><span className="cover-dot-core" /></span>
                        {!intro && !reduced && (
                          <button type="button" className="cover-dot-toggle"
                            aria-label={pulsePaused ? 'Resume dot animation' : 'Pause dot animation'}
                            title={pulsePaused ? 'Resume dot animation' : 'Pause dot animation'}
                            onClick={() => setPulsePaused(value => !value)} />
                        )}
                      </span>
                    )}
                  </span></span>
                </span>
              </Fragment>
            ))}
          </h1>
          {intro && <button ref={skip} type="button" className="cover-skip" onClick={finishIntro}><span className="sr-only">Skip cover animation</span></button>}
        </div>
        <div className="cover-actions">
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
