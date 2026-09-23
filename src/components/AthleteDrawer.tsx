import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BadgeCheck, Instagram, ShieldCheck, X, Zap } from 'lucide-react';
import type { Athlete } from '../types';
import { getSportComplianceBadges } from '../types';
import { athleteDossier } from '../lib/athleteDossier';
import { athleteInitials } from '../lib/formatName';

export function AthleteDrawer({
  athlete,
  isOpen,
  onClose,
  onSponsor,
}: {
  athlete: Athlete;
  isOpen: boolean;
  onClose: () => void;
  onSponsor?: () => void;
}) {
  const d = athleteDossier(athlete);
  const [portraitFailed, setPortraitFailed] = useState(false);
  const governing = governingBodies(athlete);

  useEffect(() => {
    setPortraitFailed(false);
  }, [athlete.id, d.portraitUrl]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70"
            aria-hidden="true"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative w-full max-w-lg h-full bg-[#08080A]/95 backdrop-blur-2xl border-l border-white/10 p-8 z-10 overflow-y-auto text-white"
            role="dialog"
            aria-label="Athlete profile"
          >
            <span className="pointer-events-none absolute inset-y-0 left-0 w-px bg-[#D2FF00] shadow-[0_0_18px_#D2FF00]" />
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-0 h-24 w-px bg-white"
              animate={{ y: ['0%', '280%'] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
            />

            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#D2FF00] m-0 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D2FF00] animate-pulse" />
                Sovereign Specimen Dossier
              </p>
              <button
                type="button"
                className="text-zinc-500 hover:text-white p-1 border-0 bg-transparent cursor-pointer"
                onClick={onClose}
                aria-label="Close dossier"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative w-full aspect-[4/5] my-5 overflow-hidden border border-white/10 bg-[#111]">
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

            <div className="flex items-start justify-between gap-3 mb-4">
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
                <a
                  className="athlete-ig mt-2 inline-flex"
                  href={d.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Instagram size={12} /> {d.instagramHandle}
                </a>
              </div>
              <ClubCrest initials={d.clubInitials} club={d.club} />
            </div>

            <div className="grid grid-cols-3 gap-2 mb-6 font-mono text-[10px] tracking-widest uppercase text-zinc-500">
              <TelemetryCell label="Engagement" value={`${d.engagementRate.toFixed(1)}%`} />
              <TelemetryCell label="Total reach" value={d.communityReach.toLocaleString('en-AU')} />
              <TelemetryCell label="Following" value={d.following.toLocaleString('en-AU')} />
            </div>

            <div className="grid gap-3 mb-8">
              <div className="border border-white/10 p-4">
                <p className="font-mono text-[10px] tracking-widest uppercase text-zinc-500 m-0 mb-3">
                  15km suburban catchment · {d.suburb} {d.postcode}
                </p>
                <div className="relative h-24 grid place-items-center">
                  <span className="absolute w-20 h-20 rounded-full border border-white/10" />
                  <span className="absolute w-14 h-14 rounded-full border border-[#D2FF00]/40" />
                  <span className="absolute w-6 h-6 rounded-full bg-[#D2FF00]" />
                </div>
                <p className="font-mono text-xs text-[#D2FF00] m-0 text-center">
                  {d.geofenceKm} km licence boundary · {(d.communityReach / 1000).toFixed(1)}k match-day reach
                </p>
              </div>

              <div className="border border-[#D2FF00]/20 bg-[#D2FF00]/[0.02] p-4">
                <p className="font-mono text-[10px] tracking-widest uppercase text-[#D2FF00] m-0 mb-3 flex items-center gap-2">
                  <ShieldCheck size={12} /> Statutory NIL compliance
                </p>
                <ul className="m-0 p-0 list-none grid gap-2">
                  {governing.map((row) => (
                    <li key={row.label} className="flex items-start justify-between gap-3 font-mono text-xs">
                      <span className="text-zinc-300">{row.label}</span>
                      <span className={row.active ? 'text-[#D2FF00]' : 'text-zinc-500'}>
                        {row.active ? 'CLEARED' : 'PENDING'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <StatusRow
                label="Exclusivity conflict checker"
                value={
                  d.exclusivityClear
                    ? 'CLEAR — no team-sponsor breach'
                    : 'REVIEW — possible team-sponsor overlap'
                }
                live={d.exclusivityClear}
              />
              <StatusRow
                label="Active exclusivity terms"
                value={d.exclusivityTerms.toUpperCase()}
                live={d.exclusivityTerms.toLowerCase() === 'active'}
              />

              <div className="border border-white/10 p-4">
                <p className="font-mono text-[10px] tracking-widest uppercase text-zinc-500 m-0 mb-2">
                  Stripe Connect disbursement
                </p>
                <div className="flex h-2 w-full mb-2">
                  <div className="bg-[#D2FF00]" style={{ width: `${d.athletePct}%` }} />
                  <div className="bg-white/20" style={{ width: `${d.partnerPct}%` }} />
                </div>
                <p className="font-mono text-xs text-white m-0">
                  {d.athletePct}% direct to athlete via Stripe Connect · {d.partnerPct}% platform infrastructure
                  fee
                </p>
                <p className="font-mono text-[10px] tracking-widest uppercase text-zinc-500 m-0 mt-2">
                  Instant payout rail · {d.stripeConnectId}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="w-full py-4 bg-[#D2FF00] hover:bg-white text-black font-mono font-bold text-xs uppercase tracking-[0.2em] border-0 cursor-pointer flex items-center justify-center gap-2"
              onClick={onSponsor}
            >
              <Zap className="w-4 h-4 fill-current" />
              Deploy Capital via Stripe
            </button>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

function governingBodies(athlete: Athlete): { label: string; active: boolean }[] {
  const s = (athlete.sport ?? '').toLowerCase();
  const cleared = Boolean(
    athlete.nil_clearance ??
      (athlete.master_licence_signed || athlete.nrl_tpa_registered || athlete.shute_shield_compliant)
  );
  const rows: { label: string; active: boolean }[] = [];
  if (s.includes('basket')) {
    rows.push({ label: 'Basketball Australia / NBL1 NIL clearance', active: cleared });
  } else if (s.includes('rugby') && s.includes('union')) {
    rows.push({ label: 'Rugby Australia NIL clearance', active: athlete.shute_shield_compliant || cleared });
  } else if (s.includes('rugby') && s.includes('league')) {
    rows.push({ label: 'NSWRL / QRL TPA clearance', active: athlete.nrl_tpa_registered || cleared });
  } else if (s.includes('netball')) {
    rows.push({ label: 'Netball NSW commercial exclusivity', active: cleared });
  }
  const extra = getSportComplianceBadges(athlete.sport, athlete).map((b) => ({
    label: b.label,
    active: b.active,
  }));
  const seen = new Set(rows.map((r) => r.label));
  for (const row of extra) {
    if (!seen.has(row.label)) rows.push(row);
  }
  if (rows.length === 0) {
    rows.push({ label: 'Statutory NIL clearance', active: cleared });
  }
  return rows;
}

function TelemetryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 p-3">
      <div className="mb-1">{label}</div>
      <div className="text-white text-xs">{value}</div>
    </div>
  );
}

function ClubCrest({ initials, club }: { initials: string; club: string }) {
  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0" title={club}>
      <svg viewBox="0 0 72 84" width="56" height="64" aria-hidden="true">
        <path
          d="M36 4 L66 16 L66 46 Q66 64 36 80 Q6 64 6 46 L6 16 Z"
          fill="#111"
          stroke="#D2FF00"
          strokeWidth="1.5"
        />
        <text
          x="36"
          y="48"
          textAnchor="middle"
          fill="#D2FF00"
          fontSize="16"
          fontWeight="800"
          fontFamily="ui-monospace, monospace"
        >
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
