import React, { useMemo, useState } from 'react';
import type { Athlete as DbAthlete, SpatialTierCode } from '../types';
import { SPATIAL_TIERS } from '../types';
import { ROSTER_DATA, type AthleteRecord } from '../data/roster';
import { RosterSpecimenCard } from '../components/RosterSpecimenCard';
import { AthleteDossierDrawer } from '../components/AthleteDossierDrawer';
import { CapitalDeploymentDrawer } from '../components/CapitalDeploymentDrawer';

export type SponsorRadiusFilter = '25km' | '50km' | 'all';

interface SponsorDiscoveryPageProps {
  athletes: readonly DbAthlete[];
  loading: boolean;
  error: string | null;
  radiusFilter: SponsorRadiusFilter;
  catchmentTier: SpatialTierCode | null;
  tierCounts: Record<SpatialTierCode, number> | null;
  onRadiusChange: (radius: SponsorRadiusFilter) => void;
  onTierChange: (tier: SpatialTierCode | null) => void;
  onRetry: () => void;
}

const RADIUS_OPTIONS: readonly { id: SponsorRadiusFilter; label: string }[] = [
  { id: '25km', label: '25km' },
  { id: '50km', label: '50km' },
  { id: 'all', label: 'All Postcodes' },
];

const normalise = (s: string | null | undefined) =>
  (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

function pillClass(active: boolean): string {
  return active
    ? 'bg-[#CCFF00] text-[#080808] px-2 py-0.5 rounded-[4px] font-bold'
    : 'text-[#080808] hover:text-neutral-600';
}

export const SponsorDiscoveryPage: React.FC<SponsorDiscoveryPageProps> = ({
  athletes,
  loading,
  error,
  radiusFilter,
  catchmentTier,
  tierCounts,
  onRadiusChange,
  onTierChange,
  onRetry,
}) => {
  const [activeDossier, setActiveDossier] = useState<AthleteRecord | null>(null);
  const [dossierMode, setDossierMode] = useState<'audit' | 'buy'>('audit');
  const [deployAthlete, setDeployAthlete] = useState<AthleteRecord | null>(null);
  const [capitalPackageId, setCapitalPackageId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const ids = new Set(athletes.map((a) => a.id));
    const names = new Set(athletes.flatMap((a) => [normalise(a.full_name), normalise(a.name)]));
    return ROSTER_DATA.filter(
      (entry) => ids.has(entry.id) || names.has(normalise(entry.record.full_name)) || names.has(normalise(entry.name)),
    );
  }, [athletes]);

  return (
    <>
      <section
        id="sponsor-discovery"
        className="w-full bg-[#FFFFFF] text-[#080808] pt-2 pb-16 scroll-mt-[64px]"
      >
        <div className="mx-auto max-w-[1840px] px-4 sm:px-6 md:px-10 w-full bg-[#FFFFFF]">
          <div className="mb-4 border-b border-black/10 py-3.5 md:py-4">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-5 items-center">
              <div className="lg:col-span-2">
                <h1 className="m-0 font-display text-5xl sm:text-6xl xl:text-[74px] font-black tracking-[-0.04em] leading-[0.86] uppercase text-[#080808]">
                  SPONSOR DISCOVERY<span className="text-[#CCFF00]">.</span>
                </h1>
              </div>
              <div className="lg:border-l lg:border-black/10 lg:pl-5">
                <p className="m-0 font-sans text-[14.5px] sm:text-[15.5px] font-bold tracking-[-0.02em] leading-[1.28] text-[#080808]">
                  Own the talent inside your store&apos;s catchment.
                </p>
                <p className="m-0 mt-1 font-sans text-[12px] leading-[1.45] text-neutral-600">
                  <strong className="text-[#080808] font-semibold">tmrw/.</strong> filters the roster by distance from your
                  storefront so every package you lock is backed by verified local reach.
                </p>
              </div>
              <div className="lg:border-l lg:border-black/10 lg:pl-5">
                <p className="m-0 font-sans text-[12px] leading-[1.45] text-neutral-600">
                  Pick a radius or a spatial tier, open an athlete dossier, and lock postcode rights. Every deal settles on
                  the{' '}
                  <span className="bg-[#CCFF00] text-[#080808] font-bold px-1.5 py-0.5 rounded-[3px]">70/15/15 split</span>{' '}
                  between the athlete, their junior club, and clearinghouse operations.
                </p>
              </div>
            </div>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-4 items-center mb-4 gap-5">
            <div className="flex items-center gap-3">
              <span className="font-sans font-bold text-[14px] text-[#080808] tracking-tight">Your catchment</span>
            </div>
            <div>
              <span className="font-sans text-[12.5px] font-normal text-[#080808] tracking-tight">
                {loading ? 'Loading athletes…' : `Showing ${visible.length} of ${ROSTER_DATA.length} athletes`}
              </span>
            </div>
            <div
              className="flex items-center gap-7 font-sans text-[12.5px] font-medium tracking-tight"
              role="group"
              aria-label="Radius"
            >
              {RADIUS_OPTIONS.map((option) => {
                const active = catchmentTier === null && radiusFilter === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      onTierChange(null);
                      onRadiusChange(option.id);
                    }}
                    className="flex items-center gap-2 border-0 bg-transparent p-0 cursor-pointer"
                  >
                    <span className={pillClass(active)}>{option.label}</span>
                  </button>
                );
              })}
            </div>
            <div
              className="flex flex-wrap xl:flex-nowrap items-center justify-start md:justify-end gap-1.5 font-sans text-[12.5px]"
              role="group"
              aria-label="Spatial tier"
            >
              {SPATIAL_TIERS.map((tier) => {
                const active = catchmentTier === tier.code;
                const count = tierCounts?.[tier.code];
                return (
                  <button
                    key={tier.code}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onTierChange(active ? null : tier.code)}
                    className={`whitespace-nowrap rounded-full border px-3 py-1 font-sans text-[11px] font-medium transition-colors cursor-pointer ${
                      active
                        ? 'border-[#CCFF00] bg-[#CCFF00] text-[#080808] font-bold'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:border-black hover:text-black'
                    }`}
                  >
                    {tier.title}
                    {typeof count === 'number' ? ` · ${count}` : ''}
                  </button>
                );
              })}
            </div>
          </div>

          {error ? (
            <div className="flex flex-col items-start gap-3 rounded-xl border border-black/10 px-5 py-4">
              <p className="m-0 font-sans text-sm text-[#080808]">{error}</p>
              <button
                type="button"
                onClick={onRetry}
                className="rounded-full bg-[#080808] px-4 py-2 font-mono text-[10px] font-medium uppercase tracking-widest text-white hover:bg-[#CCFF00] hover:text-black cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <ul className="m-0 grid list-none grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-7 p-0 pt-3" aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="m-0 aspect-[4/5] animate-pulse rounded-[18px] bg-[#EDEDEB] p-0" />
              ))}
            </ul>
          ) : visible.length === 0 ? (
            <p className="m-0 border-t border-neutral-200 pt-6 font-mono text-xs uppercase tracking-widest text-[#666666]">
              No athletes inside this radius yet. Widen the catchment to see more of the roster.
            </p>
          ) : (
            <ul className="m-0 grid list-none grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-stretch gap-x-5 gap-y-7 p-0 pt-3">
              {visible.map((entry) => (
                <li key={entry.id} className="m-0 flex min-w-0 flex-col p-0">
                  <RosterSpecimenCard
                    athlete={entry.record}
                    badgeText={`${entry.radiusKm}km Lock`}
                    badgeVariant="green"
                    onOpenDossier={(record, mode) => {
                      setDossierMode(mode ?? 'audit');
                      setActiveDossier(record);
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <AthleteDossierDrawer
        athlete={activeDossier}
        initialMode={dossierMode}
        onClose={() => setActiveDossier(null)}
        onSelectAthlete={setActiveDossier}
        onDeployCapital={(athlete) => {
          setActiveDossier(null);
          setDeployAthlete(athlete);
          setCapitalPackageId(athlete.tier);
        }}
      />
      <CapitalDeploymentDrawer
        key={capitalPackageId ?? 'closed'}
        isOpen={capitalPackageId !== null}
        packageId={capitalPackageId}
        athlete={
          deployAthlete
            ? {
                id: deployAthlete.id,
                name: deployAthlete.full_name,
                display_name: deployAthlete.display_name,
                sport: deployAthlete.sport,
                valuation: deployAthlete.valuation,
              }
            : null
        }
        onClose={() => {
          setCapitalPackageId(null);
          setDeployAthlete(null);
        }}
      />
    </>
  );
};

export default SponsorDiscoveryPage;
