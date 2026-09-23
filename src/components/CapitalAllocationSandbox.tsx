import { useMemo, useState } from 'react';
import type { Athlete } from '../types';
import { COLLAB_SPLIT } from '../types';
import { formatCurrency } from '../api';
import { athleteDossier } from '../lib/athleteDossier';

const MIN_CAPITAL = 2500;
const MAX_CAPITAL = 50000;
const ACTIVATION_FEE = 2500;

/** Impression multiplier per catchment radius; wider rings reach more suburbs per athlete. */
const RADIUS_OPTIONS = [
  { km: 15, factor: 1 },
  { km: 25, factor: 1.6 },
  { km: 50, factor: 2.4 },
] as const;

type RadiusKm = (typeof RADIUS_OPTIONS)[number]['km'];

export function CapitalAllocationSandbox({ athletes }: { athletes: Athlete[] }) {
  const [capital, setCapital] = useState(10000);
  const [radius, setRadius] = useState<RadiusKm>(15);

  const viewsByReach = useMemo(
    () => athletes.map((a) => athleteDossier(a).suburbanViews).sort((a, b) => b - a),
    [athletes]
  );

  const factor = RADIUS_OPTIONS.find((r) => r.km === radius)?.factor ?? 1;
  const activated = Math.min(Math.floor(capital / ACTIVATION_FEE), viewsByReach.length);
  const impressions = Math.round(viewsByReach.slice(0, activated).reduce((sum, v) => sum + v, 0) * factor);
  const athletePct = COLLAB_SPLIT.athletePayoutPct;
  const athleteNet = (capital * athletePct) / 100;
  const platformFee = capital - athleteNet;
  const perAthlete = activated > 0 ? athleteNet / activated : 0;

  return (
    <section className="border border-white/10 bg-white/[0.02] p-5 mb-4 flex flex-col gap-4" aria-label="Capital allocation sandbox">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-[10px] tracking-widest uppercase text-[#D2FF00] m-0">// Capital allocation sandbox</p>
        <span className="text-2xl font-black text-white">{formatCurrency(capital, 'AUD')}</span>
      </div>

      <input
        type="range"
        min={MIN_CAPITAL}
        max={MAX_CAPITAL}
        step={500}
        value={capital}
        onChange={(e) => setCapital(Number(e.target.value))}
        className="w-full accent-[#D2FF00] cursor-pointer"
        aria-label="Capital to deploy (AUD)"
      />
      <div className="flex justify-between font-mono text-[10px] text-zinc-500 -mt-2">
        <span>{formatCurrency(MIN_CAPITAL, 'AUD')}</span>
        <span>{formatCurrency(MAX_CAPITAL, 'AUD')}</span>
      </div>

      <div className="flex gap-2" role="radiogroup" aria-label="Catchment radius">
        {RADIUS_OPTIONS.map((r) => (
          <button
            key={r.km}
            type="button"
            role="radio"
            aria-checked={radius === r.km}
            className={`league-pill${radius === r.km ? ' is-active' : ''}`}
            onClick={() => setRadius(r.km)}
          >
            {r.km} KM
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-[10px] tracking-widest uppercase text-zinc-500">
        <Metric label="Athletes activated" value={`${activated} / ${viewsByReach.length}`} />
        <Metric label="Est. foot-traffic impressions" value={impressions.toLocaleString('en-AU')} />
        <Metric label={`${athletePct}% to athletes`} value={`${formatCurrency(athleteNet, 'AUD')} · ${formatCurrency(perAthlete, 'AUD')} ea`} />
        <Metric label={`${100 - athletePct}% platform fee`} value={formatCurrency(platformFee, 'AUD')} />
      </div>
      <p className="font-mono text-[10px] text-zinc-500 m-0">
        Estimate: {formatCurrency(ACTIVATION_FEE, 'AUD')} per athlete activation, highest-reach athletes first, local views scaled by catchment radius.
      </p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 p-3">
      <div className="mb-1">{label}</div>
      <div className="text-white text-xs normal-case tracking-normal">{value}</div>
    </div>
  );
}
