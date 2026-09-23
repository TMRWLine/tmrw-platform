import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useSpring, useTransform } from 'motion/react';
import { FileText, Lock, ShieldCheck, X } from 'lucide-react';
import type { Athlete } from '../types';
import { COLLAB_SPLIT } from '../types';
import { formatCurrency } from '../api';
import { athleteDossier } from '../lib/athleteDossier';

const MIN_BUDGET = 1000;
const MAX_BUDGET = 50000;
const BUDGET_STEP = 1000;

/** Share of local catchment views assumed to convert into a physical store visit. */
const STORE_VISIT_RATE = 0.02;

type PathwayId = 'gear' | 'roster' | 'takeover';

interface Pathway {
  id: PathwayId;
  label: string;
  tag: string;
  /** Capital committed per athlete (cash or product value). */
  perAthlete: number;
  /** Catchment multiplier on local views; takeovers saturate neighbouring suburbs. */
  reachFactor: number;
  platformFeePct: number;
  settlementNote: string;
}

const PATHWAYS: Pathway[] = [
  {
    id: 'gear',
    label: 'The Gear Drop',
    tag: '$0 fee',
    perAthlete: 500,
    reachFactor: 0.6,
    platformFeePct: 0,
    settlementNote: 'Product seeding — gear shipped straight to athlete kitbags, zero platform fee.',
  },
  {
    id: 'roster',
    label: 'Postcode Roster',
    tag: '$1K–$5K',
    perAthlete: 2500,
    reachFactor: 1,
    platformFeePct: 100 - COLLAB_SPLIT.athletePayoutPct,
    settlementNote: 'Clear cash deposited directly before game day.',
  },
  {
    id: 'takeover',
    label: 'Town Takeover',
    tag: 'Enterprise',
    perAthlete: 5000,
    reachFactor: 1.8,
    platformFeePct: 100 - COLLAB_SPLIT.athletePayoutPct,
    settlementNote: 'Clear cash deposited directly before game day.',
  },
];

export function CapitalAllocationTerminal({ athletes }: { athletes: Athlete[] }) {
  const [budget, setBudget] = useState(5000);
  const [pathwayId, setPathwayId] = useState<PathwayId>('roster');
  const [agreementOpen, setAgreementOpen] = useState(false);
  const pathway = PATHWAYS.find((p) => p.id === pathwayId) ?? PATHWAYS[1];

  const viewsByReach = useMemo(
    () => athletes.map((a) => athleteDossier(a).suburbanViews).sort((a, b) => b - a),
    [athletes]
  );

  const funded = Math.min(Math.floor(budget / pathway.perAthlete), viewsByReach.length);
  const localViews = viewsByReach.slice(0, funded).reduce((sum, v) => sum + v, 0) * pathway.reachFactor;
  const storeVisits = Math.round(localViews * STORE_VISIT_RATE);
  const athleteShare = (budget * (100 - pathway.platformFeePct)) / 100;
  const platformShare = budget - athleteShare;

  return (
    <section
      className="bg-[#08080A]/90 backdrop-blur-xl border border-white/10 p-5 rounded-xl mb-4 flex flex-col gap-5"
      aria-label="Capital allocation terminal"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-mono text-xs tracking-[0.2em] uppercase text-white m-0">
          Own your suburbs before the whistle blows
        </h3>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D2FF00] px-3 py-1 font-mono text-[9px] font-bold tracking-widest uppercase text-black">
          <Lock size={10} /> Founding partner status: 2026 category exclusivity active
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <label htmlFor="terminal-budget" className="font-mono text-[10px] tracking-widest uppercase text-zinc-500">
            Deployment budget
          </label>
          <AnimatedValue value={budget} format={(v) => formatCurrency(v, 'AUD')} className="text-2xl font-black text-white" />
        </div>
        <input
          id="terminal-budget"
          type="range"
          min={MIN_BUDGET}
          max={MAX_BUDGET}
          step={BUDGET_STEP}
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          className="w-full accent-[#D2FF00] cursor-pointer"
        />
        <div className="flex justify-between font-mono text-[10px] text-zinc-500">
          <span>{formatCurrency(MIN_BUDGET, 'AUD')}</span>
          <span>{formatCurrency(MAX_BUDGET, 'AUD')}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Commercial pathway">
        {PATHWAYS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={pathwayId === p.id}
            onClick={() => setPathwayId(p.id)}
            className={`flex-1 min-w-[160px] rounded-lg border px-3 py-2.5 font-mono text-[10px] tracking-widest uppercase cursor-pointer transition-colors ${
              pathwayId === p.id
                ? 'border-[#D2FF00] bg-[#D2FF00]/10 text-[#D2FF00]'
                : 'border-white/10 bg-white/[0.02] text-zinc-300 hover:border-[#D2FF00]/50'
            }`}
          >
            [{p.label} // {p.tag}]
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <TelemetryTile label="Active roster" hint="Athletes funded in target store perimeter">
          <AnimatedValue value={funded} format={(v) => `${Math.round(v)} / ${viewsByReach.length}`} />
        </TelemetryTile>
        <TelemetryTile label="Est. high-street foot traffic" hint="Projected community store visits">
          <AnimatedValue value={storeVisits} format={(v) => Math.round(v).toLocaleString('en-AU')} />
        </TelemetryTile>
        <TelemetryTile
          label={pathway.platformFeePct === 0 ? '100/0 product settlement' : `${100 - pathway.platformFeePct}/${pathway.platformFeePct} instant settlement`}
          hint={pathway.settlementNote}
        >
          <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-white/10 mb-2">
            <div className="bg-[#D2FF00] transition-[width] duration-300" style={{ width: `${100 - pathway.platformFeePct}%` }} />
          </div>
          <div className="flex flex-col gap-0.5 text-xs">
            <span className="text-[#D2FF00]">
              <AnimatedValue value={athleteShare} format={(v) => formatCurrency(v, 'AUD')} /> direct to athletes
            </span>
            <span className="text-zinc-400">
              <AnimatedValue value={platformShare} format={(v) => formatCurrency(v, 'AUD')} /> platform infrastructure &amp; automated eligibility protection
            </span>
          </div>
        </TelemetryTile>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[10px] text-zinc-500 m-0 max-w-xl">
          Estimate: {formatCurrency(pathway.perAthlete, 'AUD')} per athlete, highest-reach athletes first,{' '}
          {Math.round(STORE_VISIT_RATE * 100)}% of local views converting to a store visit.
        </p>
        <button
          type="button"
          onClick={() => setAgreementOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-[10px] tracking-widest uppercase text-zinc-200 hover:border-[#D2FF00]/50 hover:text-[#D2FF00] cursor-pointer transition-colors"
        >
          <FileText size={12} /> Preview tripartite agreement
        </button>
      </div>

      <TripartiteAgreementModal
        open={agreementOpen}
        onClose={() => setAgreementOpen(false)}
        pathway={pathway}
      />
    </section>
  );
}

function AnimatedValue({
  value,
  format,
  className,
}: {
  value: number;
  format: (v: number) => string;
  className?: string;
}) {
  const spring = useSpring(value, { damping: 30, stiffness: 300 });
  const display = useTransform(spring, format);
  useEffect(() => {
    spring.set(value);
  }, [spring, value]);
  return <motion.span className={className}>{display}</motion.span>;
}

function TelemetryTile({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex-1 min-w-[200px] rounded-lg border border-white/10 bg-white/[0.03] p-3.5">
      <div className="font-mono text-[9px] tracking-widest uppercase text-zinc-500 mb-2">{label}</div>
      <div className="font-mono text-xl font-bold text-white mb-1.5">{children}</div>
      <div className="font-mono text-[10px] text-zinc-500">{hint}</div>
    </div>
  );
}

function TripartiteAgreementModal({
  open,
  onClose,
  pathway,
}: {
  open: boolean;
  onClose: () => void;
  pathway: Pathway;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const athletePct = 100 - pathway.platformFeePct;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-label="Tripartite agreement preview">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative z-10 w-full max-w-lg rounded-xl border border-white/10 bg-[#08080A]/95 backdrop-blur-2xl p-6 text-white"
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[#D2FF00] shadow-[0_0_16px_#D2FF00]" />
            <button
              type="button"
              className="absolute top-4 right-4 text-zinc-500 hover:text-white bg-transparent border-0 cursor-pointer"
              onClick={onClose}
              aria-label="Close agreement preview"
            >
              <X size={16} />
            </button>
            <p className="font-mono text-[10px] tracking-widest uppercase text-[#D2FF00] m-0 mb-2">// Tripartite agreement · preview</p>
            <h4 className="text-lg font-black uppercase tracking-tight m-0 mb-4">Sponsor · Athlete · tmrw/.</h4>

            <div className="flex items-start gap-2 rounded-lg border border-[#D2FF00]/30 bg-[#D2FF00]/5 p-3 mb-4">
              <ShieldCheck size={14} className="text-[#D2FF00] flex-shrink-0 mt-0.5" />
              <p className="font-mono text-xs text-zinc-200 m-0">
                Automated eligibility protection audited against sporting body bylaws and amateur rules.
              </p>
            </div>

            <ol className="m-0 pl-4 flex flex-col gap-2 font-mono text-xs text-zinc-300">
              <li>Pathway: {pathway.label} ({pathway.tag}).</li>
              <li>
                Settlement: {athletePct}% direct to the athlete via Stripe Connect
                {pathway.platformFeePct > 0 ? `, ${pathway.platformFeePct}% platform infrastructure and eligibility protection.` : '; no platform fee.'}
              </li>
              <li>Catchment: activation limited to a 15 km radius of the athlete's home club.</li>
              <li>Non-exclusive digital display; no club logos, emblems, or trademarked jerseys in content.</li>
              <li>Category exclusivity checked against existing team sponsors before activation.</li>
            </ol>
            <p className="font-mono text-[10px] text-zinc-500 mt-4 mb-0">
              Preview only. Final terms are generated per athlete at checkout.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
