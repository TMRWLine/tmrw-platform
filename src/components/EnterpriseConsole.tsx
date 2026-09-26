import { LayoutGroup, motion } from 'motion/react';
import { useEffect, type ReactNode } from 'react';
import { LEAGUE_FILTERS, type LeagueFilterId } from '../lib/rosterDiscovery';

export type CatchmentRadiusId = 5 | 10 | 15 | 'all';

const RADIUS_OPTIONS: { id: CatchmentRadiusId; label: string }[] = [
  { id: 5, label: '5KM' },
  { id: 10, label: '10KM' },
  { id: 15, label: '15KM' },
  { id: 'all', label: 'ALL' },
];

export function EnterpriseConsole({
  league,
  onLeagueChange,
  radius,
  onRadiusChange,
  specimenCount,
  allocatedPct,
  onDeploy,
  mapSlot,
}: {
  league: LeagueFilterId;
  onLeagueChange: (value: LeagueFilterId) => void;
  radius: CatchmentRadiusId;
  onRadiusChange: (value: CatchmentRadiusId) => void;
  specimenCount: number;
  allocatedPct: number;
  onDeploy: () => void;
  mapSlot: ReactNode;
}) {
  const specimens = specimenCount.toLocaleString('en-NZ');

  useEffect(() => {
    const pulse = window.setTimeout(() => window.dispatchEvent(new Event('resize')), 80);
    return () => window.clearTimeout(pulse);
  }, []);

  return (
    <section
      className="fixed inset-0 z-10 w-full h-[100dvh] overflow-hidden box-border pt-[5.75rem] bg-[#000000] text-white"
      aria-label="Enterprise workspace"
    >
      <div className="flex flex-row h-full min-h-0 w-full">
        <aside className="w-[380px] xl:w-[420px] flex-shrink-0 border-r border-white/10 bg-[#000000] p-8 flex flex-col justify-between gap-8 z-20 overflow-y-auto">
          <div>
            <p
              className="m-0 mb-4 uppercase text-[11px] tracking-[0.16em] text-[#D2FF00]"
              style={{ fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace' }}
            >
              MANIFESTO // GROUND TRUTH 01
            </p>
            <h1
              id="manifesto-heading"
              className="m-0 uppercase font-black tracking-tight text-white"
              style={{ fontSize: 'clamp(32px, 3.2vw, 42px)', lineHeight: 0.95 }}
            >
              SPORT IS A WEAPON WHEN OWNED BY THE SUBURBS.
            </h1>
            <p className="mt-5 mb-0 text-sm leading-relaxed text-white/65 max-w-sm">
              Sovereign capital routing. Deploy verified athlete fleets across 15km storefront catchments with automated
              statutory clearance and direct 70/30 Connect settlement.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <div className="bg-[#08080A] border border-white/10 p-4 rounded-lg">
              <p
                className="m-0 uppercase text-[10px] tracking-[0.14em] text-white/80"
                style={{ fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace' }}
              >
                {specimens} VERIFIED SPECIMENS // {allocatedPct}% ALLOCATED // BRISBANE 2032 RUNWAY CLEARED
              </p>
            </div>
            <button
              type="button"
              className="w-full border-0 cursor-pointer bg-[#D2FF00] text-black font-bold uppercase tracking-[0.14em] text-xs py-3"
              style={{ fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace' }}
              onClick={onDeploy}
            >
              DEPLOY FLEET ALLOCATION -&gt;
            </button>
          </div>
        </aside>

        <div className="relative flex-1 h-full min-h-0 bg-[#000000] overflow-hidden">
          <div
            className="absolute z-30 pointer-events-auto"
            style={{ top: 24, left: '50%', transform: 'translateX(-50%)', maxWidth: 'calc(100% - 24px)' }}
          >
            <div className="bg-[#08080A]/90 backdrop-blur-md border border-white/15 px-4 py-2 rounded-full flex items-center gap-3 flex-nowrap justify-center shadow-2xl">
              <HudPills
                groupId="hud-league"
                label="League filters"
                options={LEAGUE_FILTERS}
                value={league}
                onChange={onLeagueChange}
              />
              <span className="bg-white/20 w-px h-4 shrink-0" aria-hidden="true" />
              <HudPills
                groupId="hud-radius"
                label="Catchment radius"
                options={RADIUS_OPTIONS}
                value={radius}
                onChange={onRadiusChange}
              />
            </div>
          </div>
          {mapSlot}
        </div>
      </div>
    </section>
  );
}

function HudPills<T extends string | number>({
  groupId,
  label,
  options,
  value,
  onChange,
}: {
  groupId: string;
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <LayoutGroup id={groupId}>
      <div className="flex flex-nowrap items-center gap-1" role="tablist" aria-label={label}>
        {options.map((option) => {
          const active = option.id === value;
          return (
            <button
              key={String(option.id)}
              type="button"
              role="tab"
              aria-selected={active}
              className="relative overflow-hidden border-0 cursor-pointer rounded-full px-2.5 py-1 text-[10px] tracking-[0.12em] uppercase"
              style={{
                fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
                background: active ? '#D2FF00' : 'transparent',
                color: active ? '#000000' : 'rgba(255,255,255,0.70)',
              }}
              onClick={() => onChange(option.id)}
            >
              {active && (
                <motion.span
                  layoutId={`${groupId}-active`}
                  className="absolute inset-0 z-0 bg-[#D2FF00] rounded-full"
                  transition={{ type: 'spring', damping: 26, stiffness: 210 }}
                  aria-hidden="true"
                />
              )}
              <span className={`relative z-10 ${active ? '' : 'hover:text-white'}`}>{option.label}</span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
