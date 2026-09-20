import { useEffect, useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import type { Athlete } from '../types';
import { athleteDossier } from '../lib/athleteDossier';
import { athleteInitials } from '../lib/formatName';

export function AthleteDrawer({
  athlete,
  onSponsor,
  onClose,
}: {
  athlete: Athlete;
  onSponsor: () => void;
  onClose: () => void;
}) {
  const d = athleteDossier(athlete);
  const [portraitFailed, setPortraitFailed] = useState(false);

  useEffect(() => {
    setPortraitFailed(false);
  }, [athlete.id, d.portraitUrl]);

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
          // ATHLETE DOSSIER
        </p>

        <div className="relative w-full aspect-[4/5] mb-5 overflow-hidden border border-white/10 bg-[#111]">
          {!portraitFailed ? (
            <img
              src={d.portraitUrl}
              alt={d.name}
              className="w-full h-full object-cover"
              onError={() => setPortraitFailed(true)}
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-white font-black text-6xl">
              {athlete.initials || athleteInitials(d.name)}
            </div>
          )}
        </div>

        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-2xl font-black uppercase tracking-tight text-white mt-0 mb-0">{d.name}</h2>
              {d.verified && (
                <span className="inline-flex items-center gap-1 bg-[#D2FF00] text-black font-mono text-[9px] tracking-widest uppercase px-2 py-1">
                  <BadgeCheck size={11} /> Verified
                </span>
              )}
            </div>
            <p className="font-mono text-xs text-zinc-400 m-0">
              {d.sport}
              {d.position ? ` · ${d.position}` : ''}
            </p>
          </div>
          <ClubCrest initials={d.clubInitials} club={d.club} />
        </div>

        <div className="grid gap-3 mb-8">
          <div className="border border-white/10 p-4">
            <p className="font-mono text-[10px] tracking-widest uppercase text-zinc-500 m-0 mb-3">
              Catchment · postcode {d.postcode}
            </p>
            <div className="relative h-24 grid place-items-center">
              <span className="absolute w-20 h-20 rounded-full border border-white/10" />
              <span className="absolute w-14 h-14 rounded-full border border-[#D2FF00]/40" />
              <span className="absolute w-6 h-6 rounded-full bg-[#D2FF00]" />
            </div>
            <p className="font-mono text-xs text-[#D2FF00] m-0 text-center">
              {d.geofenceKm} km geofence · {(d.communityReach / 1000).toFixed(1)}k match-day reach
            </p>
          </div>
          <StatusRow label="NIL legal clearance" value={d.nilClearance ? 'CLEARED' : 'PENDING REVIEW'} live={d.nilClearance} />
          <StatusRow
            label="Active contract tier"
            value={(athlete.licence_status ?? athlete.agreement_status ?? 'open market').replace(/_/g, ' ').toUpperCase()}
            live={(athlete.licence_status ?? athlete.agreement_status) === 'active'}
          />
          <StatusRow
            label="Active exclusivity terms"
            value={d.exclusivityTerms.toUpperCase()}
            live={d.exclusivityTerms.toLowerCase() === 'active'}
          />
          <div className="border border-white/10 p-4">
            <p className="font-mono text-[10px] tracking-widest uppercase text-zinc-500 m-0 mb-2">
              Direct payout split
            </p>
            <div className="flex h-2 w-full mb-2">
              <div className="bg-[#D2FF00]" style={{ width: `${d.athletePct}%` }} />
              <div className="bg-white/20" style={{ width: `${d.partnerPct}%` }} />
            </div>
            <p className="font-mono text-xs text-white m-0">
              {d.athletePct}% athlete · {d.partnerPct}% platform / community
            </p>
          </div>
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

function ClubCrest({ initials, club }: { initials: string; club: string }) {
  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0" title={club}>
      <svg viewBox="0 0 72 84" width="56" height="64" aria-hidden="true">
        <path d="M36 4 L66 16 L66 46 Q66 64 36 80 Q6 64 6 46 L6 16 Z" fill="#111" stroke="#D2FF00" strokeWidth="1.5" />
        <text x="36" y="48" textAnchor="middle" fill="#D2FF00" fontSize="16" fontWeight="800" fontFamily="ui-monospace, monospace">
          {initials.slice(0, 2)}
        </text>
      </svg>
      <span className="font-mono text-[8px] tracking-widest uppercase text-zinc-500 max-w-[72px] text-center leading-tight">
        {club}
      </span>
    </div>
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
