import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface ProtocolGate {
  step: string;
  title: string;
  body: string;
}

const GATES: readonly ProtocolGate[] = [
  {
    step: '01',
    title: 'Selection & Spatial Lock',
    body: 'Select an emerging talent by discipline or postcode. Secure an exclusive 15km retail perimeter or a national category lock to safeguard your brand footprint.',
  },
  {
    step: '02',
    title: 'Automated Compliance & Escrow',
    body: 'Funds are deposited directly into a segregated Stripe Connect escrow vault. Sport Integrity Australia amateur by-laws and national sporting body Third-Party Agreements are automatically cleared.',
  },
  {
    step: '03',
    title: 'Proof-of-Performance Settlement',
    body: 'Deliverables are verified through geo-tagged content and check-in logs. Escrow releases funds immediately: 70% to the athlete, 15% to their grassroots club, and 15% to the clearinghouse, with an instant ATO-compliant tax invoice generated.',
  },
];

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Page 3. The three-gate clearinghouse protocol on a stark architectural white canvas.
 * Left column stays pinned. The right column carries the interactive step cards.
 */
export const HowItWorks: React.FC = () => {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [pinned, setPinned] = useState<number | null>(null);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    const nodes = cardRefs.current.filter((node): node is HTMLElement => node != null);
    if (nodes.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = nodes.indexOf(visible.target as HTMLElement);
        if (index >= 0 && pinned === null) setActive(index);
      },
      { root: null, threshold: [0.35, 0.6, 0.85] },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [pinned]);

  const current = pinned ?? active;

  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="relative w-full bg-white text-black scroll-mt-[74px]"
    >
      <div className="mx-auto grid min-h-[calc(100vh-74px)] w-full max-w-[1640px] grid-cols-1 gap-10 px-4 py-24 md:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16 lg:py-28">
        <div className="lg:sticky lg:top-[106px] lg:self-start">
          <p className="m-0 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-black/45">
            The 3-step clearinghouse protocol
          </p>
          <h2
            id="how-it-works-heading"
            className="m-0 mt-5 max-w-lg font-display text-4xl font-bold leading-[0.95] tracking-[-0.03em] text-black"
          >
            Three gates. Zero friction.
          </h2>
          <p className="m-0 mt-6 max-w-md text-base leading-relaxed text-black/65">
            Capital moves from brand allocation to athlete settlement without agency retainers,
            invoice chasing, or eligibility risk. Each gate is automated, verified, and auditable.
          </p>
          <ol className="m-0 mt-10 hidden list-none gap-3 p-0 lg:grid">
            {GATES.map((gate, index) => {
              const on = current === index;
              return (
                <li key={gate.step}>
                  <button
                    type="button"
                    onClick={() => {
                      setPinned(index);
                      setActive(index);
                      cardRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className={`flex w-full items-center justify-between border-0 bg-transparent px-0 py-2 text-left cursor-pointer ${
                      on ? 'text-black' : 'text-black/35'
                    }`}
                  >
                    <span className="font-mono text-[10px] font-medium uppercase tracking-[0.08em]">
                      Gate {gate.step}
                    </span>
                    <span className="font-display text-sm font-bold tracking-[-0.02em]">{gate.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <ol className="m-0 flex list-none flex-col gap-4 p-0 md:gap-5">
          {GATES.map((gate, index) => {
            const on = current === index;
            return (
              <motion.li
                key={gate.step}
                ref={(node) => {
                  cardRefs.current[index] = node;
                }}
                initial={reduced ? false : { opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.7, delay: index * 0.08, ease: EASE }}
              >
                <article
                  className={`group relative cursor-pointer border border-black/10 bg-white p-6 transition-[background,border-color,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:p-8 ${
                    on ? 'bg-[#FBFBFB] border-black/20' : 'hover:bg-[#FBFBFB]'
                  }`}
                  onClick={() => setPinned((currentPinned) => (currentPinned === index ? null : index))}
                  onMouseEnter={() => {
                    if (pinned === null) setActive(index);
                  }}
                >
                  <div
                    aria-hidden="true"
                    className={`absolute inset-y-0 left-0 w-px transition-colors duration-500 ${
                      on ? 'bg-[#CCFF00]' : 'bg-transparent'
                    }`}
                  />
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-black/40">
                      Step {gate.step}
                    </span>
                    <span
                      className={`font-mono text-[9px] font-medium uppercase tracking-[0.08em] ${
                        on ? 'text-[#080808]' : 'text-black/30'
                      }`}
                    >
                      {on ? 'Gate open' : 'Stand by'}
                    </span>
                  </div>
                  <h3 className="m-0 mt-8 font-display text-2xl font-bold leading-[0.95] tracking-[-0.03em] text-black md:text-3xl">
                    {gate.title}
                  </h3>
                  <p
                    className={`m-0 mt-5 max-w-xl text-sm leading-relaxed text-black/70 transition-[max-height,opacity] duration-500 md:text-base ${
                      on ? 'opacity-100' : 'opacity-80'
                    }`}
                  >
                    {gate.body}
                  </p>
                </article>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
};

export default HowItWorks;
