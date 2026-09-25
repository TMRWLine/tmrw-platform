import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  BadgeCheck,
  Bike,
  CircleDot,
  ExternalLink,
  Footprints,
  Gauge,
  Goal,
  Instagram,
  Medal,
  ShieldCheck,
  Swords,
  Target,
  TrendingUp,
  Users,
  Waves,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { Athlete } from '../types';
import { getSportComplianceBadges } from '../types';
import { formatCurrency } from '../api';
import { athleteDossier } from '../lib/athleteDossier';
import { originForPostcode } from '../lib/catchmentLandmarks';
import { athleteInitials } from '../lib/formatName';
import { CatchmentRadar } from './CatchmentRadar';

const REFERENCE_ACTIVATION = 2500;

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
  const certificates = complianceCertificates(athlete);
  const approximateOrigin = athlete.latitude == null || athlete.longitude == null;
  const origin =
    athlete.latitude != null && athlete.longitude != null
      ? { lat: athlete.latitude, lng: athlete.longitude }
      : originForPostcode(athlete.postcode);

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
            transition={{ type: 'spring', damping: 30, stiffness: 260, mass: 0.8 }}
            drag="x"
            dragConstraints={{ left: 0, right: 300 }}
            dragElastic={0.12}
            onDragEnd={(_event, info) => {
              if (info.offset.x > 110 || info.velocity.x > 650) onClose();
            }}
            className="relative w-full max-w-lg h-full bg-[#08080A]/95 backdrop-blur-2xl border-l border-white/10 p-8 pt-5 z-10 overflow-y-auto text-white"
            role="dialog"
            aria-label="Athlete profile"
          >
            <div
              className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4 cursor-grab active:cursor-grabbing"
              aria-hidden="true"
            />
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
                <CarbonBadge
                  initials={d.clubInitials}
                  club={d.club}
                  sport={d.sport}
                  verified={d.verified}
                  athleteInitials={athlete.initials || athleteInitials(d.name)}
                />
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
                  {d.sport} · {d.position ?? 'Registered squad member'}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="inline-flex items-center gap-1 border border-white/10 px-2 py-1 font-mono text-[9px] tracking-widest uppercase text-zinc-300">
                    {d.verified ? <BadgeCheck size={10} className="text-[#D2FF00]" /> : null}
                    {d.club} · {d.verified ? 'registration verified' : 'registration pending'}
                  </span>
                  <span className="inline-flex items-center border border-[#D2FF00]/40 px-2 py-1 font-mono text-[9px] tracking-widest text-[#D2FF00]">
                    {d.postcode}
                  </span>
                </div>
                <a
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#D2FF00]/30 bg-[#D2FF00]/5 px-2.5 py-1 font-mono text-[11px] text-[#D2FF00] no-underline hover:border-[#D2FF00] hover:bg-[#D2FF00]/10 transition-colors"
                  href={d.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${d.instagramHandle} on Instagram in a new tab`}
                >
                  <Instagram size={12} /> {d.instagramHandle} <ExternalLink size={10} />
                </a>
              </div>
              <ClubCrest initials={d.clubInitials} club={d.club} />
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              <TelemetryCard
                icon={Instagram}
                label="Instagram followers"
                value={d.following.toLocaleString('en-AU')}
                sub={d.instagramHandle}
              />
              <TelemetryCard
                icon={TrendingUp}
                label="Engagement velocity"
                value={`${d.engagementRate.toFixed(1)}%`}
                sub={`+${d.audienceVelocityPct}% reach / wk`}
              />
              <TelemetryCard
                icon={Gauge}
                label="Match-day index"
                value={`${d.matchDayIndex}`}
                sub="of 100"
                meterPct={d.matchDayIndex}
              />
              <TelemetryCard
                icon={Users}
                label="Community reach"
                value={d.communityReach.toLocaleString('en-AU')}
                sub={`${d.reachPct}% of local views`}
              />
            </div>

            <div className="flex flex-col gap-3 mb-8">
              <CatchmentRadar
                origin={origin}
                approximate={approximateOrigin}
                geofenceKm={d.geofenceKm}
                suburb={d.suburb}
                postcode={d.postcode}
                club={d.club}
                communityReach={d.communityReach}
              />

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <p className="font-mono text-[10px] tracking-widest uppercase text-[#D2FF00] m-0 mb-3 flex items-center gap-2">
                  <ShieldCheck size={12} /> Governing body compliance certificates
                </p>
                <ul className="m-0 p-0 list-none flex flex-col gap-2">
                  {certificates.map((cert) => (
                    <li
                      key={cert.label}
                      className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-[9px] tracking-widest uppercase text-zinc-500 m-0 mb-0.5">
                          {cert.authority}
                        </p>
                        <p className="font-mono text-xs text-zinc-200 m-0">{cert.label}</p>
                      </div>
                      {cert.cleared ? (
                        <span className="flex-shrink-0 inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 font-mono text-[9px] tracking-widest text-emerald-300">
                          <BadgeCheck size={10} /> CLEARED
                        </span>
                      ) : (
                        <span
                          className="flex-shrink-0 max-w-[45%] text-right rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 font-mono text-[9px] tracking-widest uppercase text-amber-300"
                          title="Statutory step outstanding before activation"
                        >
                          {cert.requirement}
                        </span>
                      )}
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

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
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
                <p className="font-mono text-xs text-zinc-300 m-0 mt-2">
                  Per {formatCurrency(REFERENCE_ACTIVATION, 'AUD')} activation:{' '}
                  <span className="text-[#D2FF00]">
                    {formatCurrency((REFERENCE_ACTIVATION * d.athletePct) / 100, 'AUD')} to athlete
                  </span>{' '}
                  · {formatCurrency((REFERENCE_ACTIVATION * d.partnerPct) / 100, 'AUD')} platform fee
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

interface Certificate {
  authority: string;
  label: string;
  cleared: boolean;
  /** Explicit statutory step shown while the certificate is not yet cleared. */
  requirement: string;
}

function complianceCertificates(athlete: Athlete): Certificate[] {
  const s = (athlete.sport ?? '').toLowerCase();
  const cleared = Boolean(
    athlete.nil_clearance ??
      (athlete.master_licence_signed || athlete.nrl_tpa_registered || athlete.shute_shield_compliant)
  );

  if (s.includes('basket')) {
    const authority = 'Basketball Australia / NBL1';
    return [
      { authority, label: 'Amateur status preservation ledger', cleared, requirement: 'Lodge amateur declaration' },
      { authority, label: 'Commercial NIL participation', cleared, requirement: 'Sign NBL1 NIL appearance ledger' },
      { authority, label: 'NBL1 commercial exclusivity', cleared, requirement: 'Register category with state association' },
    ];
  }
  if (s.includes('rugby') && s.includes('union')) {
    const authority = 'Rugby Australia · Shute Shield';
    const union = athlete.shute_shield_compliant || cleared;
    return [
      { authority, label: "Amateur protection · $500 cap, arm's-length", cleared: union, requirement: "Confirm arm's-length payment" },
      { authority, label: 'Commercial NIL participation', cleared: union, requirement: 'Submit RA commercial rights declaration' },
      { authority, label: 'Non-exclusive digital display clearance', cleared: union, requirement: 'Lodge RA digital display notice' },
    ];
  }
  if (s.includes('rugby') && s.includes('league')) {
    const authority = 'NSWRL / QRL';
    const league = athlete.nrl_tpa_registered || cleared;
    return [
      { authority, label: 'Amateur protection · no club-channel payment', cleared: league, requirement: 'Confirm direct athlete payment' },
      { authority, label: 'Commercial NIL · third-party agreement (TPA)', cleared: league, requirement: 'Register TPA with NSWRL / QRL' },
      { authority, label: 'Category exclusivity — zero team-sponsor breach', cleared: league, requirement: 'Run club sponsor exclusivity check' },
      { authority, label: 'Club emblem scrubbing in content', cleared: league, requirement: 'Remove club marks from footage' },
    ];
  }

  const rows: Certificate[] = [
    { authority: 'Statutory', label: 'Amateur status protection', cleared, requirement: 'Lodge amateur declaration' },
    { authority: 'Statutory', label: 'Commercial NIL participation', cleared, requirement: 'Sign master NIL licence' },
  ];
  for (const badge of getSportComplianceBadges(athlete.sport, athlete)) {
    rows.push({
      authority: badge.detail,
      label: badge.label,
      cleared: badge.active,
      requirement: `Obtain ${badge.label}`,
    });
  }
  return rows;
}

function TelemetryCard({
  icon: Icon,
  label,
  value,
  sub,
  meterPct,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  meterPct?: number;
}) {
  return (
    <div className="relative overflow-hidden flex-1 basis-[calc(50%-0.25rem)] min-w-0 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-3.5">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="flex items-center gap-1.5 font-mono text-[9px] tracking-widest uppercase text-zinc-500 mb-2">
        <Icon size={11} className="text-[#D2FF00]" /> {label}
      </div>
      <div className="text-xl font-black tracking-tight text-white leading-none">{value}</div>
      <div className="font-mono text-[10px] text-zinc-500 mt-1.5 truncate">{sub}</div>
      {meterPct != null && (
        <div className="mt-2 h-1 w-full rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-[#D2FF00]" style={{ width: `${Math.min(100, meterPct)}%` }} />
        </div>
      )}
    </div>
  );
}

function ClubCrest({ initials, club, large = false }: { initials: string; club: string; large?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0" title={club}>
      <svg viewBox="0 0 72 84" width={large ? 120 : 56} height={large ? 140 : 64} aria-hidden="true">
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

function sportIcon(sport: string): LucideIcon {
  const s = sport.toLowerCase();
  if (s.includes('basket') || s.includes('netball')) return CircleDot;
  if (s.includes('rugby') || s.includes('soccer') || s.includes('afl') || s.includes('football')) return Goal;
  if (s.includes('cricket') || s.includes('golf')) return Target;
  if (s.includes('surf') || s.includes('swim')) return Waves;
  if (s.includes('combat') || s.includes('box')) return Swords;
  if (s.includes('triathlon') || s.includes('cycl')) return Bike;
  if (s.includes('athletic') || s.includes('run')) return Footprints;
  if (s.includes('tennis')) return Activity;
  return Medal;
}

function CarbonBadge({
  initials,
  club,
  sport,
  verified,
  athleteInitials: fallbackInitials,
}: {
  initials: string;
  club: string;
  sport: string;
  verified: boolean;
  athleteInitials: string;
}) {
  const SportIcon = sportIcon(sport);
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_50%_35%,#1a1a1f_0%,#08080A_70%)]">
      <div className="relative">
        <ClubCrest initials={initials || fallbackInitials} club={club} large />
        {verified && (
          <span className="absolute -right-2 -top-1 flex items-center justify-center w-7 h-7 rounded-full bg-[#D2FF00] text-black">
            <BadgeCheck size={16} />
          </span>
        )}
      </div>
      <span className="inline-flex items-center gap-2 border border-white/10 px-3 py-1.5 font-mono text-[10px] tracking-widest uppercase text-zinc-300">
        <SportIcon size={14} className="text-[#D2FF00]" /> {sport}
      </span>
    </div>
  );
}

function StatusRow({ label, value, live }: { label: string; value: string; live?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="font-mono text-[10px] tracking-widest uppercase text-zinc-500 m-0 mb-1">{label}</p>
      <p className={`font-mono text-xs m-0 ${live ? 'text-[#D2FF00]' : 'text-white'}`}>{value}</p>
    </div>
  );
}
