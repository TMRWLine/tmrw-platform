import { ArrowRight, Clapperboard } from 'lucide-react';
import { Kicker, RegFrame, StadiumBackdrop, VoltPeriod } from './EditorialPrimitives';

interface HeroProps {
  onExplore: () => void;
  onMediaStudio: () => void;
}

const KPIS = [
  { index: '01', value: '$8.4M', label: 'Pipeline Value' },
  { index: '02', value: '11', label: 'Signed Master Licences' },
  { index: '03', value: '18 km', label: 'Average Proximity Match' },
];

export function Hero({ onExplore, onMediaStudio }: HeroProps) {
  return (
    <section className="relative mb-12 overflow-hidden bg-canvas text-signal-white">
      <StadiumBackdrop />
      <div className="relative px-4 py-6 md:px-6 md:py-8">
        <RegFrame className="flex min-h-[620px] flex-col justify-between px-6 py-8 md:px-10 md:py-9">
          <header className="flex items-center justify-between gap-4 border-b border-solid border-edge pb-4">
            <Kicker tone="muted" className="text-signal-white/70">
              [ Postcode Hero Marketplace // Protocol ]
            </Kicker>
            <span className="hidden font-mono text-kicker uppercase text-signal-white/70 sm:inline">
              Australia &amp; New Zealand // Est 2026
            </span>
          </header>

          <div className="flex flex-col gap-6 py-10">
            <Kicker tone="volt" pulse>
              Allocate by postcode // verified talent
            </Kicker>
            <h1 className="m-0 font-display text-display uppercase text-white">
              Programmatic Sports Infrastructure For Enterprise Brands
              <VoltPeriod />
            </h1>
            <p className="m-0 max-w-xl text-lede text-signal-white/80">
              Deploy targeted in-kind and monetary sponsorship across regional athlete rosters by postcode, with
              automated compliance and split-payout execution.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={onExplore}
                className="inline-flex cursor-pointer items-center gap-2.5 rounded-none border-0 bg-volt px-7 py-4 font-mono text-xs font-bold uppercase tracking-telemetry text-canvas transition-all duration-150 hover:bg-volt-bright hover:shadow-volt-halo focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-white"
              >
                Explore Athlete Roster
                <ArrowRight size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onMediaStudio}
                className="inline-flex cursor-pointer items-center gap-2.5 rounded-none border border-solid border-edge-strong bg-canvas/60 px-7 py-4 font-mono text-xs font-bold uppercase tracking-telemetry text-signal-white transition-colors duration-150 hover:border-volt hover:text-volt focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-white"
              >
                <Clapperboard size={14} aria-hidden="true" />
                AI Media Studio
              </button>
            </div>
          </div>

          <dl className="m-0 !grid grid-cols-1 border-t border-solid border-edge sm:grid-cols-3">
            {KPIS.map((kpi) => (
              <div
                key={kpi.index}
                className="flex flex-col gap-3 border-solid border-edge py-6 max-sm:[&:not(:first-child)]:border-t sm:px-6 sm:first:pl-0 sm:[&:not(:first-child)]:border-l"
              >
                <dd className="m-0 font-display text-headline font-black text-white">{kpi.value}</dd>
                <dt className="m-0 border-t border-solid border-signal-white pt-3 font-mono text-kicker font-bold uppercase text-signal-white">
                  {`[${kpi.index}] ${kpi.label}`}
                </dt>
              </div>
            ))}
          </dl>
        </RegFrame>
      </div>
    </section>
  );
}
