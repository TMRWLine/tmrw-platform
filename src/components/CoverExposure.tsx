import { useEffect, useId, useState, type CSSProperties, type RefObject } from 'react';
import { COVER_EXPOSURE_MS } from '../lib/coverMotion';

type Device = Navigator & {
  connection?: EventTarget & { saveData?: boolean };
  deviceMemory?: number;
};

export function CoverExposure({ poster, settled }: {
  poster: RefObject<HTMLImageElement | null>;
  settled: boolean;
}) {
  const mask = useId();
  const [src, setSrc] = useState('');

  useEffect(() => {
    const image = poster.current;
    const { connection, deviceMemory } = navigator as Device;
    if (!image || !settled || (deviceMemory !== undefined && deviceMemory < 4)) return;
    let frame = 0;
    let active = true;
    const show = () => {
      if (active && !connection?.saveData) setSrc(image.currentSrc);
    };
    const onConnection = () => {
      if (connection?.saveData) setSrc('');
    };
    connection?.addEventListener('change', onConnection);
    let observer: PerformanceObserver | undefined;
    if (typeof PerformanceObserver === 'function' && PerformanceObserver.supportedEntryTypes.includes('largest-contentful-paint')) {
      observer = new PerformanceObserver(list => {
        if (list.getEntries().some(entry => (entry as PerformanceEntry & { element?: Element }).element === image)) {
          observer?.disconnect();
          frame = requestAnimationFrame(show);
        }
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    } else {
      void image.decode().then(() => {
        if (!active) return;
        frame = requestAnimationFrame(() => { frame = requestAnimationFrame(show); });
      }).catch(() => {});
    }
    return () => {
      active = false;
      observer?.disconnect();
      cancelAnimationFrame(frame);
      connection?.removeEventListener('change', onConnection);
    };
  }, [poster, settled]);

  if (!src) return null;
  return (
    <svg className="cover-exposure" viewBox="0 0 612 407" preserveAspectRatio="xMidYMid slice"
      aria-hidden="true" focusable="false" style={{ '--cover-exposure-duration': `${COVER_EXPOSURE_MS}ms` } as CSSProperties}
      onAnimationEnd={() => setSrc('')}>
      <defs>
        <clipPath id={mask}>
          <path d="M306 131 C319 131 329 143 329 154 L328 164 Q337 162 332 174 L326 178
            Q324 195 333 204 C342 211 361 216 371 232 C384 252 386 274 387 299
            H225 C228 273 231 250 243 232 C254 219 276 212 283 204 Q291 195 287 179
            Q278 175 281 164 L285 164 L284 153 C285 142 294 131 306 131Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${mask})`}>
        <image className="cover-exposure-plate" href={src} x="-102" y="91" width="612" height="407" />
      </g>
    </svg>
  );
}
