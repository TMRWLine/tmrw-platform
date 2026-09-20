import { useEffect } from 'react';
import type { Athlete } from '../types';
import { COLLAB_SPLIT } from '../types';
import { athleteDisplayName, athleteInitials } from '../lib/formatName';

export function AthleteDrawer({
  athlete,
  onSponsor,
  onClose,
}: {
  athlete: Athlete;
  onSponsor: () => void;
  onClose: () => void;
}) {
  const name = athleteDisplayName(athlete);
  const club = athlete.current_club ?? athlete.club ?? 'Independent';
  const nilClear = athlete.master_licence_signed || athlete.nrl_tpa_registered || athlete.shute_shield_compliant;
  const exclusivity =
    (athlete.licence_status ?? athlete.agreement_status ?? 'no_agreement').replace(/_/g, ' ');

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} aria-hidden="true" />
      <aside
        className="w-full max-w-lg bg-[#08080A]/95 backdrop-blur-2xl border-l border-white/10 p-8 z-50 fixed inset-y-0 right-0 overflow-y-auto"
        role="dialog"
        aria-label="Athlete profile"
      >
        <button
          type="button"
          className="absolute top-6 right-6 text-zinc-500 hover:text-white font-mono text-xs uppercase cursor-pointer"
          onClick={onClose}
        >
          Close
        </button>

        <p className="font-mono text-[10px] tracking-widest uppercase text-[#D2FF00] mb-4">
          // UNMASKED SPECIMEN
        </p>

        <div className="flex items-start gap-4 mb-8">
          <div className="w-24 h-24 flex-shrink-0 bg-white text-black grid place-items-center font-black text-3xl">
            {athlete.initials || athleteInitials(name)}
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white mt-0 mb-2">{name}</h2>
            <div className="inline-flex items-center border border-white/15 px-2 py-1 font-mono text-[10px] tracking-widest uppercase text-zinc-300 mb-2">
              {club}
            </div>
            <p className="font-mono text-xs text-zinc-400 m-0">
              {athlete.sport ?? 'Athlete'} · Postcode {athlete.postcode ?? '————'}
            </p>
          </div>
        </div>

        <div className="grid gap-3 mb-8">
          <StatusRow
            label="NIL eligibility clearance"
            value={nilClear ? 'CLEARED' : 'PENDING REVIEW'}
            live={nilClear}
          />
          <StatusRow label="Active exclusivity window" value={exclusivity.toUpperCase()} live={exclusivity === 'active'} />
          <StatusRow
            label="Direct payout split"
            value={`${COLLAB_SPLIT.athletePayoutPct}% net disbursement to athlete`}
            live
          />
        </div>

        <button
          type="button"
          className="w-full bg-[#D2FF00] text-black font-mono text-xs uppercase tracking-widest py-3 border-0 cursor-pointer"
          onClick={onSponsor}
        >
          Sponsor Athlete
        </button>
      </aside>
    </>
  );
}

function StatusRow({ label, value, live }: { label: string; value: string; live?: boolean }) {
  return (
    <div className="border border-white/10 p-4">
      <p className="font-mono text-[10px] tracking-widest uppercase text-zinc-500 m-0 mb-1">{label}</p>
      <p className={`font-mono text-xs m-0 ${live ? 'text-[#D2FF00]' : 'text-white'}`}>{value}</p>
    </div>
  );
}
