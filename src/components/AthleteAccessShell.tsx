import type { ReactNode } from 'react';
import { BrandLockup } from './BrandLockup';

export type AthleteAccessMode = 'authenticate' | 'claim';
export const ATHLETE_MONO = "font-['JetBrains_Mono',monospace]";
export const ATHLETE_FIELD_LABEL = `${ATHLETE_MONO} text-[9.5px] tracking-[0.18em] text-neutral-500 uppercase block mb-1.5 font-bold`;
export const ATHLETE_FIELD_SHELL = `bg-[#EAEAE6] border border-black/10 rounded-xl px-4 py-3 text-sm ${ATHLETE_MONO} text-carbon outline-none focus-within:border-carbon w-full flex items-center box-border`;
export const ATHLETE_FIELD_INPUT = `bg-transparent text-base sm:text-sm ${ATHLETE_MONO} font-bold text-carbon placeholder-neutral-400 outline-none w-full min-w-0 select-text border-0 p-0`;
export const ATHLETE_PRIMARY = `w-full rounded-full bg-carbon text-[var(--canvas)] ${ATHLETE_MONO} font-bold text-[10px] uppercase tracking-widest px-5 py-4 border-0 cursor-pointer disabled:opacity-50 hover:opacity-80 transition-opacity duration-200 box-border text-center no-underline inline-flex items-center justify-center gap-2`;
export const ATHLETE_VOLT_CTA = `w-full rounded-full bg-volt text-carbon ${ATHLETE_MONO} text-[10px] font-bold uppercase tracking-widest px-5 py-3 border-0 cursor-pointer disabled:opacity-50 hover:opacity-80 transition-opacity duration-200 box-border text-center no-underline inline-flex items-center justify-center gap-2`;

export function AthleteAccessHeader({ onClose }: { onClose: () => void }) {
  return <div className="flex items-center justify-between border-b border-black/10 pb-5">
    <BrandLockup onClick={onClose} className="[&_svg]:transition-opacity" />
    <button type="button" onClick={onClose} title="Close" aria-label="Close portal"
      className="inline-flex items-center gap-1.5 rounded-full bg-carbon text-[var(--canvas)] border border-transparent px-5 py-1.5 font-sans text-xs font-bold tracking-tight shadow-sm transition-opacity duration-200 hover:opacity-80 cursor-pointer">
      <span>Close</span><span className="text-[11px] text-volt" aria-hidden="true">✕</span>
    </button>
  </div>;
}

export function AthleteAccessTabs({ mode, onChange, panelId }: {
  mode: AthleteAccessMode;
  onChange: (mode: AthleteAccessMode) => void;
  panelId: string;
}) {
  return <div role="tablist" aria-label="Portal access mode"
    className="grid grid-cols-2 p-1 bg-[#EAEAE6] rounded-full my-6 border border-black/10">
    {([{ mode: 'authenticate', label: 'SIGN IN' }, { mode: 'claim', label: 'CLAIM PROFILE' }] as const).map(tab =>
      <button key={tab.mode} type="button" role="tab" aria-selected={tab.mode === mode} aria-controls={panelId}
        onClick={() => onChange(tab.mode)}
        className={`py-2.5 text-[10px] ${ATHLETE_MONO} font-bold tracking-[0.18em] uppercase rounded-full transition-opacity duration-200 hover:opacity-80 cursor-pointer border-0 ${tab.mode === mode ? 'bg-carbon text-volt shadow-sm' : 'bg-transparent text-neutral-600'}`}>
        {tab.label}
      </button>)}
  </div>;
}

export function AthleteAccessHero({ lines, children, headingLevel = 'h1' }: {
  lines: string[];
  children: ReactNode;
  headingLevel?: 'h1' | 'h2';
}) {
  const Heading = headingLevel;
  return <section className="mb-6 rounded-[24px] bg-carbon text-[var(--canvas)] p-6 sm:p-7 space-y-4 shadow-xl">
    <Heading className="m-0 font-sans font-black text-3xl sm:text-4xl uppercase tracking-[-0.03em] text-[var(--canvas)] leading-[1.02]">
      {lines.map((line, i) => <span className="block" key={i}>{line}<span className="text-volt">.</span></span>)}
    </Heading>
    {children}
  </section>;
}
