import React from 'react';
import { AssetImage } from './AssetImage';
import { FilmGrainOverlay } from './FilmGrainOverlay';

export type AthleteCardLayout = 'card' | 'list' | 'specimen' | 'hero' | 'cell';

export interface AthleteCardImage {
  file: string;
  fallbackFiles?: readonly string[];
  alt: string;
  objectPosition?: string;
}

export interface AthleteCardProps<TAthlete = unknown> {
  name: string;
  initials: string;
  sportLeague: string;
  catchmentTag: string;
  image?: AthleteCardImage;
  badge?: string;
  badgeVariant?: 'green' | 'yellow' | 'red';
  valuationAud?: number;
  fromPriceAud?: number;
  tags?: readonly string[];
  tierLockup?: string;
  tierTag?: string;
  splitLine?: string;
  statusLabel?: string;
  milestone?: string;
  headline?: string;
  layout?: AthleteCardLayout;
  onSelect?: () => void;
  athlete: TAthlete;
  onSponsor?: () => void;
  onOpenDossier?: (athlete: TAthlete) => void;
  onMediaStudio?: () => void;
}

const VERIFICATION_BADGES = ['INTEGRITY CLEARED', 'POSTCODE VERIFIED'] as const;

const VerificationBadges: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex flex-col items-end gap-1.5 ${className}`}>
    {VERIFICATION_BADGES.map((label) => (
      <span
        key={label}
        className="bg-[#CCFF00] text-black text-[9px] font-mono font-bold px-2.5 py-0.5 uppercase tracking-wider shadow-sm"
      >
        {label}
      </span>
    ))}
  </div>
);

function plainAud(amount: number): string {
  return `A$${Math.round(Math.abs(amount))}`;
}

const AccessPrice: React.FC<{ amountAud?: number; className?: string }> = ({ amountAud = 750, className = '' }) => (
  <p className={`m-0 font-mono text-[11px] uppercase tracking-widest text-[#666666] group-hover:text-neutral-400 ${className}`}>
    Packages from <span className="font-bold text-[#080808] group-hover:text-[#CCFF00] tabular-nums">{plainAud(amountAud)}</span>
  </p>
);

export function AthleteCard<TAthlete>({
  name,
  initials,
  sportLeague,
  catchmentTag,
  image,
  fromPriceAud = 750,
  badge,
  badgeVariant = 'green',
  athlete,
  onOpenDossier,
  onMediaStudio,
  onSelect,
}: AthleteCardProps<TAthlete>) {
  const openCard = () => {
    if (onSelect) {
      onSelect();
      return;
    }
    onOpenDossier?.(athlete);
  };

  const badgeColorClass =
    badgeVariant === 'yellow'
      ? 'bg-[#FFD600] text-black'
      : badgeVariant === 'red'
      ? 'bg-[#FF3B30] text-white'
      : 'bg-[#CCFF00] text-black';

  return (
    <article
      onClick={openCard}
      className="group relative isolate bg-[#F4F4F4] border border-black/5 rounded-[24px] p-8 flex flex-col justify-between gap-8 min-h-[600px] hover:bg-[#080808] hover:text-white transition-all duration-500 cursor-pointer overflow-hidden shadow-sm"
    >
      {/* Top Header: Name & Badge Placement matching Pangram top-right corner */}
      <div className="flex justify-between items-start z-20">
        <div>
          <h3 className="m-0 font-display font-extrabold text-3xl tracking-tight leading-tight text-[#080808] group-hover:text-white transition-colors">
            {name}
          </h3>
          <p className="m-0 mt-1.5 font-mono text-xs uppercase tracking-wider text-neutral-500 group-hover:text-neutral-400 transition-colors">
            {sportLeague} // {catchmentTag}
          </p>
        </div>

        {badge ? (
          <span className={`font-mono font-bold text-[10px] uppercase px-3 py-1 rounded-full tracking-widest ${badgeColorClass} shadow-sm z-30`}>
            {badge}
          </span>
        ) : (
          <VerificationBadges />
        )}
      </div>

      {/* Specimen Image Box */}
      <div className="my-auto overflow-hidden rounded-xl bg-neutral-900 relative h-[280px] shadow-inner">
        {image ? (
          <AssetImage
            file={image.file}
            fallbackFiles={image.fallbackFiles}
            alt={image.alt}
            objectPosition={image.objectPosition}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 filter grayscale group-hover:grayscale-0"
          />
        ) : (
          <div className="flex h-full items-end p-6 font-display text-5xl font-bold text-white">
            {initials}
          </div>
        )}
        <FilmGrainOverlay intensity="fine" />
      </div>

      {/* Footer Bar: Price on left, telemetry/action pill on right */}
      <div className="relative z-20 flex items-center justify-between pt-4 border-t border-black/10 group-hover:border-white/15 transition-colors">
        <AccessPrice amountAud={fromPriceAud} />

        <div className="flex items-center gap-2">
          {/* Man Icon for Sovereign Dossier */}
          <button
            type="button"
            title="Inspect Sovereign Dossier"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDossier?.(athlete);
            }}
            className="w-9 h-9 rounded-full bg-black/5 group-hover:bg-white/10 text-black group-hover:text-white flex items-center justify-center font-mono text-xs transition-colors cursor-pointer"
          >
            👤
          </button>

          {/* Film Icon for TwelveLabs Studio */}
          <button
            type="button"
            title="Launch TwelveLabs Video Intelligence"
            onClick={(e) => {
              e.stopPropagation();
              onMediaStudio?.();
            }}
            className="w-9 h-9 rounded-full bg-black/5 group-hover:bg-white/10 text-black group-hover:text-white flex items-center justify-center font-mono text-xs transition-colors cursor-pointer"
          >
            🎬
          </button>

          {/* Sliding Check it out button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openCard();
            }}
            className="bg-white text-black font-mono font-bold text-xs uppercase tracking-widest py-3 px-6 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 cursor-pointer shadow-lg hover:bg-[#CCFF00]"
          >
            Check it out
          </button>
        </div>
      </div>
    </article>
  );
}

export default AthleteCard;