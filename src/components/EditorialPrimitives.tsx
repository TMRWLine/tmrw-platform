import type { ReactNode } from 'react';
import clsx from 'clsx';

/**
 * Small presentational building blocks lifted from the pitch deck: the hairline
 * frame with Off Brand registration crosshairs, the bracketed mono kicker, the
 * volt terminal period, and the stadium photographic backdrop.
 */

/** Registration crosshair, set on a frame corner. */
function RegMark({ corner }: { corner: 'tl' | 'tr' | 'bl' | 'br' }) {
  const position = {
    tl: '-left-[7px] -top-[7px]',
    tr: '-right-[7px] -top-[7px]',
    bl: '-bottom-[7px] -left-[7px]',
    br: '-bottom-[7px] -right-[7px]',
  }[corner];
  return (
    <span aria-hidden="true" className={clsx('pointer-events-none absolute z-10 block h-[13px] w-[13px]', position)}>
      <span className="absolute left-0 top-[6px] block h-px w-[13px] bg-edge-strong" />
      <span className="absolute left-[6px] top-0 block h-[13px] w-px bg-edge-strong" />
    </span>
  );
}

/** Hairline frame with registration marks on all four corners. */
export function RegFrame({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={clsx('relative border border-solid border-edge', className)}>
      <RegMark corner="tl" />
      <RegMark corner="tr" />
      <RegMark corner="bl" />
      <RegMark corner="br" />
      {children}
    </div>
  );
}

/** Monospace bracketed kicker. Kickers stay unpunctuated by design. */
export function Kicker({
  children,
  tone = 'muted',
  pulse = false,
  className,
}: {
  children: ReactNode;
  tone?: 'muted' | 'volt' | 'ink';
  pulse?: boolean;
  className?: string;
}) {
  return (
    <p
      className={clsx(
        'm-0 flex items-center gap-2 font-mono text-kicker uppercase',
        tone === 'volt' && 'font-bold text-volt',
        tone === 'muted' && 'text-signal-white/50',
        tone === 'ink' && 'text-obsidian/60',
        className,
      )}
    >
      {tone !== 'muted' && (
        <span
          aria-hidden="true"
          className={clsx(
            'block h-1.5 w-1.5 shrink-0 rounded-full bg-volt',
            tone === 'ink' && 'ring-1 ring-obsidian',
            pulse && 'motion-safe:animate-volt-pulse',
          )}
        />
      )}
      <span>{children}</span>
    </p>
  );
}

/** Closes a display headline with the volt terminal period. */
export function VoltPeriod() {
  return (
    <span aria-hidden="true" className="volt-period">
      .
    </span>
  );
}

/** Stadium photograph under the deck's scrims, so type always lands on near black. */
export function StadiumBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden bg-canvas">
      <img
        src="/images/stadium-cover.jpg"
        alt=""
        loading="eager"
        className="block h-full w-full scale-[1.04] object-cover object-[50%_30%] opacity-90 contrast-[1.4] saturate-[1.15]"
      />
      <div className="absolute inset-x-0 top-0 h-[40%] bg-scrim-top" />
      <div className="absolute inset-0 bg-scrim-burner" />
      <div className="absolute inset-x-0 bottom-0 h-[70%] bg-scrim-floor" />
      <div className="absolute inset-0 bg-scrim-sides" />
    </div>
  );
}
