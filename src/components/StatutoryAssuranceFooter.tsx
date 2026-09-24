import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { FileText, ShieldCheck, X } from 'lucide-react';
import { COLLAB_SPLIT } from '../types';

const STANDARD_TERMS: { title: string; body: string }[] = [
  {
    title: 'Parties',
    body: 'Sponsor (brand), Athlete (licensor of name, image, and likeness), and tmrw/. (platform and settlement agent).',
  },
  {
    title: 'Licence scope',
    body: 'Non-exclusive licence of the athlete’s name, image, and likeness for digital display within the agreed 15 km catchment.',
  },
  {
    title: 'Settlement',
    body: `${COLLAB_SPLIT.athletePayoutPct}% paid direct to the athlete via Stripe Connect on activation; ${
      100 - COLLAB_SPLIT.athletePayoutPct
    }% covers platform infrastructure and automated eligibility protection. No Net-90 terms.`,
  },
  {
    title: 'Eligibility protection',
    body: 'Terms are checked against the athlete’s governing body bylaws and amateur rules before activation.',
  },
  {
    title: 'Brand safety',
    body: 'No club logos, emblems, or trademarked jerseys in licensed content. Category exclusivity is checked against existing team sponsors.',
  },
  {
    title: 'Term & termination',
    body: 'Fixed licence window of 30, 60, or 90 days. Either party may terminate for material breach on written notice.',
  },
];

export function StatutoryAssuranceFooter() {
  const [open, setOpen] = useState(false);

  return (
    <section
      className="relative z-[70] border-t border-white/10 pt-8 pb-10 font-mono text-xs text-neutral-400 px-[clamp(24px,6vw,80px)]"
      aria-label="Enterprise statutory assurance"
    >
      <div className="flex flex-col gap-3 max-w-4xl">
        <p className="m-0 leading-relaxed">
          <span className="text-white">GOVERNANCE:</span> Basketball Australia Amateur Bylaws, Rugby Australia Schedule 1
          NIL Clearances, NSWRL / QRL Standard Contracts.
        </p>
        <p className="m-0 leading-relaxed">
          <span className="text-white">FINANCIAL INFRASTRUCTURE:</span> Automated {COLLAB_SPLIT.athletePayoutPct}%
          direct-to-athlete Stripe Connect settlement rails. Zero Net-90 commercial exposure.
        </p>
        <div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-2 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-[10px] tracking-widest uppercase text-zinc-200 hover:border-[#D2FF00]/50 hover:text-[#D2FF00] cursor-pointer transition-colors"
          >
            <FileText size={12} /> Preview Standard Tripartite Licensing Agreement
          </button>
        </div>
      </div>
      <StandardAgreementModal open={open} onClose={() => setOpen(false)} />
    </section>
  );
}

function StandardAgreementModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Standard tripartite licensing agreement"
        >
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
            className="relative z-10 w-full max-w-xl max-h-[88vh] overflow-y-auto rounded-xl border border-white/10 bg-[#08080A]/95 backdrop-blur-2xl p-6 text-white"
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[#D2FF00] shadow-[0_0_16px_#D2FF00]" />
            <button
              type="button"
              className="absolute top-4 right-4 text-zinc-500 hover:text-white bg-transparent border-0 cursor-pointer"
              onClick={onClose}
              aria-label="Close agreement"
            >
              <X size={16} />
            </button>
            <p className="font-mono text-[10px] tracking-widest uppercase text-[#D2FF00] m-0 mb-2">
              // Standard tripartite licensing agreement
            </p>
            <h4 className="text-lg font-black uppercase tracking-tight m-0 mb-4">Standard NIL terms · summary</h4>

            <div className="flex items-start gap-2 rounded-lg border border-[#D2FF00]/30 bg-[#D2FF00]/5 p-3 mb-4">
              <ShieldCheck size={14} className="text-[#D2FF00] flex-shrink-0 mt-0.5" />
              <p className="font-mono text-xs text-zinc-200 m-0">
                Automated eligibility protection audited against sporting body bylaws and amateur rules.
              </p>
            </div>

            <dl className="m-0 flex flex-col gap-3">
              {STANDARD_TERMS.map((term) => (
                <div key={term.title} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5">
                  <dt className="font-mono text-[9px] tracking-widest uppercase text-zinc-500 mb-1">{term.title}</dt>
                  <dd className="m-0 font-mono text-xs text-zinc-200 leading-relaxed">{term.body}</dd>
                </div>
              ))}
            </dl>
            <p className="font-mono text-[10px] text-zinc-500 mt-4 mb-0">
              Summary only — not legal advice. Binding terms are generated per athlete at checkout.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
