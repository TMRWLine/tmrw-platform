import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { TW_VAR_DEFAULTS } from './twVarDefaults';

const SPECIMEN_SRC = '/shoe-specimen.png';
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

interface LedgerStep {
  index: string;
  title: string;
  body: string;
}

const LEDGER_STEPS: readonly LedgerStep[] = [
  {
    index: '01',
    title: 'PICK YOUR POSTCODE',
    body: 'A local business selects their store location and locks a 15km trade catchment.',
  },
  {
    index: '02',
    title: 'CHOOSE YOUR ATHLETE',
    body: 'Select from verified representative athletes living and playing in your immediate suburb.',
  },
  {
    index: '03',
    title: 'FUND INSTANTLY',
    body: "Money lands straight in the player's account via Stripe; they represent your brand in-store and on social.",
  },
];

const CORNER_POSITIONS = [
  'left-2 top-2',
  'right-2 top-2',
  'bottom-2 left-2',
  'bottom-2 right-2',
] as const;

export const EngineSection: React.FC = () => {
  const reduced = useReducedMotion();

  const reveal = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.2 },
          transition: { duration: 0.8, delay, ease: EASE_OUT },
        };

  return (
    <section
      id="the-breakdown"
      aria-labelledby="engine-heading"
      className={`relative w-full min-h-screen bg-[#060709] px-6 sm:px-10 lg:px-20 pt-28 pb-44 flex items-center select-none border-0 border-b border-solid border-white/10 overflow-hidden ${TW_VAR_DEFAULTS}`}
    >
      {/* Drifting vector arcs (z-0, never captures pointer events) */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <motion.svg
          className="absolute w-[1800px] h-[1800px] -right-[400px] -top-[400px] fill-none stroke-white/10"
          viewBox="0 0 1000 1000"
          animate={reduced ? undefined : { rotate: 360 }}
          transition={{ duration: 240, repeat: Infinity, ease: 'linear' }}
        >
          <ellipse cx="500" cy="500" rx="460" ry="240" strokeWidth={1} strokeDasharray="6 8" vectorEffect="non-scaling-stroke" />
          <ellipse cx="500" cy="500" rx="380" ry="480" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <ellipse cx="500" cy="500" rx="280" ry="280" strokeWidth={1} strokeDasharray="4 12" vectorEffect="non-scaling-stroke" />
          <path d="M 100 500 C 300 200, 700 800, 900 500" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <path d="M 200 800 C 400 300, 600 200, 800 700" strokeWidth={1} strokeDasharray="8 6" vectorEffect="non-scaling-stroke" />
        </motion.svg>
      </div>

      {/* 12-column asymmetric grid */}
      <div className="relative z-10 mx-auto grid w-full max-w-[1720px] grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-20">
        {/* Left plane: columns 1-5 */}
        <motion.div className="relative flex w-full justify-center lg:col-span-5 lg:justify-start" {...reveal(0)}>
          <figure className="relative m-0 w-full max-w-[460px] border border-solid border-white/20">
            {CORNER_POSITIONS.map((position) => (
              <span
                key={position}
                aria-hidden="true"
                className={`pointer-events-none absolute z-20 font-mono text-[12px] leading-none text-[#D2FF00] ${position}`}
              >
                +
              </span>
            ))}
            <img
              src={SPECIMEN_SRC}
              alt="Close-up of a running track spike mid-stride on a red synthetic track"
              draggable={false}
              className="block h-auto w-full max-h-[80vh] object-contain"
            />
          </figure>
        </motion.div>

        {/* Right plane: columns 6-12 */}
        <div className="lg:col-span-7">
          <motion.p
            className="m-0 mb-5 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.24em] text-[#D2FF00]"
            {...reveal(0.05)}
          >
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D2FF00] shadow-[0_0_10px_2px_rgba(210,255,0,0.7)]"
            />
            THE ENGINE // CONNECTING SUBURBAN ATHLETES
          </motion.p>

          <motion.h2
            id="engine-heading"
            className="m-0 font-sans text-[clamp(2.25rem,4.6vw,4.5rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.04em] text-white"
            {...reveal(0.12)}
          >
            CONNECTING LOCAL ATHLETES WITH LOCAL BUSINESS<span className="text-[#D2FF00]">.</span>
          </motion.h2>

          <motion.p
            className="mb-12 mt-6 max-w-xl font-sans text-[15px] leading-relaxed text-white/80"
            {...reveal(0.2)}
          >
            We cut out traditional sports agencies, legal fees, and red tape. Local businesses back local players in
            their immediate neighbourhood. Athletes get funded before game time; businesses get genuine community foot
            traffic.
          </motion.p>

          {/* Typographic ledger: hairline rules only */}
          <ol className="m-0 w-full list-none divide-y divide-solid divide-white/10 border-0 border-y border-solid border-white/10 p-0">
            {LEDGER_STEPS.map((step, i) => (
              <motion.li key={step.index} className="flex items-start gap-8 py-6" {...reveal(0.28 + i * 0.1)}>
                <span className="shrink-0 pt-0.5 font-mono text-[20px] font-bold leading-none text-[#D2FF00]">
                  {step.index}
                </span>
                <div>
                  <h3 className="m-0 mb-1 font-mono text-[13px] font-bold uppercase tracking-[0.16em] text-white">
                    {step.title}
                  </h3>
                  <p className="m-0 font-sans text-[13px] leading-relaxed text-white/70">{step.body}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};

export default EngineSection;
