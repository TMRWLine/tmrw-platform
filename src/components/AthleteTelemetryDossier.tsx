import type { Athlete } from '../types';
import { getSportComplianceBadges } from '../types';
import type { AthleteDossier } from '../lib/athleteDossier';

export function AthleteTelemetryDossier({
  athlete,
  dossier,
}: {
  athlete: Athlete;
  dossier: AthleteDossier;
}) {
  const governing = governingBodies(athlete);

  return (
    <div className="athlete-telemetry-dossier">
      <div className="grid grid-cols-3 gap-2 mb-6 font-mono text-[10px] tracking-widest uppercase text-zinc-500">
        <TelemetryCell label="Engagement" value={`${dossier.engagementRate.toFixed(1)}%`} />
        <TelemetryCell label="Total reach" value={dossier.communityReach.toLocaleString('en-AU')} />
        <TelemetryCell label="Following" value={dossier.following.toLocaleString('en-AU')} />
      </div>

      <div className="grid gap-3">
        <div className="border border-white/10 p-4">
          <p className="font-mono text-[10px] tracking-widest uppercase text-zinc-500 m-0 mb-3">
            15km suburban catchment · {dossier.suburb} {dossier.postcode}
          </p>
          <div className="relative h-24 grid place-items-center">
            <span className="absolute w-20 h-20 rounded-full border border-white/10" />
            <span className="absolute w-14 h-14 rounded-full border border-[#D2FF00]/40" />
            <span className="absolute w-6 h-6 rounded-full bg-[#D2FF00]" />
          </div>
          <p className="font-mono text-xs text-[#D2FF00] m-0 text-center">
            {dossier.geofenceKm} km licence boundary · {(dossier.communityReach / 1000).toFixed(1)}k match-day
            reach
          </p>
        </div>

        <div className="border border-white/10 p-4">
          <p className="font-mono text-[10px] tracking-widest uppercase text-zinc-500 m-0 mb-3">
            Statutory NIL compliance
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
            dossier.exclusivityClear
              ? 'CLEAR — no team-sponsor breach'
              : 'REVIEW — possible team-sponsor overlap'
          }
          live={dossier.exclusivityClear}
        />
        <StatusRow
          label="Active exclusivity terms"
          value={dossier.exclusivityTerms.toUpperCase()}
          live={dossier.exclusivityTerms.toLowerCase() === 'active'}
        />

        <div className="border border-white/10 p-4">
          <p className="font-mono text-[10px] tracking-widest uppercase text-zinc-500 m-0 mb-2">
            Stripe Connect disbursement
          </p>
          <div className="flex h-2 w-full mb-2">
            <div className="bg-[#D2FF00]" style={{ width: `${dossier.athletePct}%` }} />
            <div className="bg-white/20" style={{ width: `${dossier.partnerPct}%` }} />
          </div>
          <p className="font-mono text-xs text-white m-0">
            {dossier.athletePct}% direct to athlete via Stripe Connect · {dossier.partnerPct}% platform
            infrastructure fee
          </p>
          <p className="font-mono text-[10px] tracking-widest uppercase text-zinc-500 m-0 mt-2">
            Instant payout rail · {dossier.stripeConnectId}
          </p>
        </div>
      </div>
    </div>
  );
}

export function governingBodies(athlete: Athlete): { label: string; active: boolean }[] {
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

function StatusRow({ label, value, live }: { label: string; value: string; live?: boolean }) {
  return (
    <div className="border border-white/10 p-4">
      <p className="font-mono text-[10px] tracking-widest uppercase text-zinc-500 m-0 mb-1">{label}</p>
      <p className={`font-mono text-xs m-0 ${live ? 'text-[#D2FF00]' : 'text-white'}`}>{value}</p>
    </div>
  );
}
