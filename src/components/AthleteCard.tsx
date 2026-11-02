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
  isHighlighted?: boolean;
  onActivate?: () => void;
  onSelect?: () => void;
  athlete: TAthlete;
  onSponsor?: () => void;
  onOpenDossier?: (athlete: TAthlete) => void;
  onMediaStudio?: () => void;
}

function plainAud(amount: number): string {
  return `A$${Math.round(Math.abs(amount))}`;
}

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\b([a-z])/g, (char) => char.toUpperCase())
    .replace(/\b(Nbl1|Nsw|Wsl|Vfl|Afl|Nrl|Ufc|Bjj)\b/gi, (m) => m.toUpperCase());
}

function cleanMetadata(raw: string): string {
  return raw
    .replace(/\/\//g, '·')
    .replace(/\s+/g, ' ')
    .trim();
}

export function AthleteCard<TAthlete>({
  name,
  initials,
  sportLeague,
  catchmentTag,
  image,
  fromPriceAud = 750,
  badge,
  badgeVariant = 'red',
  isHighlighted = false,
  onActivate,
  athlete,
  onOpenDossier,
  onMediaStudio,
  onSponsor,
  onSelect,
}: AthleteCardProps<TAthlete>) {
  const handleCardClick = () => {
    onActivate?.();
    if (onSponsor) {
      onSponsor();
      return;
    }
    if (onSelect) {
      onSelect();
      return;
    }
    onOpenDossier?.(athlete);
  };

  const nameParts = name.trim().split(' ');
  const firstName = nameParts[0] ?? name;
  const restName = nameParts.slice(1).join(' ');

  const cleanedCatchment = cleanMetadata(catchmentTag);
  const catchmentParts = cleanedCatchment.split('·').map((s) => s.trim()).filter(Boolean);
  const rawLeague = catchmentParts[0] ?? '';
  const rawPostcode = catchmentParts[1] ?? cleanedCatchment;

  const formattedLeague = rawLeague ? toTitleCase(rawLeague) : '';
  const formattedPostcode = toTitleCase(rawPostcode);

  const badgeColorClass =
    badgeVariant === 'yellow'
      ? 'bg-[#FFB800] text-black'
      : badgeVariant === 'green'
      ? 'bg-[#CCFF00] text-black'
      : 'bg-[#FF3300] text-white';

  return (
    <article
      onMouseEnter={() => onActivate?.()}
      onClick={handleCardClick}
      className="group relative isolate flex flex-col justify-between bg-[#EAEAE6] hover:bg-[#080808] text-[#080808] hover:text-white rounded-[18px] p-6 h-[clamp(400px,53vh,495px)] transition-colors duration-500 cursor-pointer overflow-visible select-none"
    >
      {/* Top-Right Straddling Pill Badge */}
      {badge ? (
        <span
          className={`absolute -top-2.5 right-5 z-30 rounded-full px-3.5 py-0.5 font-sans text-[11px] font-bold tracking-tight shadow-sm ${badgeColorClass}`}
        >
          {badge}
        </span>
      ) : null}

      {/* Always-Visible Athlete Portrait: B&W on Stone Grey default -> Full Colour on Black hover */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[18px]">
        {image ? (
          <div className="absolute inset-0 transition-all duration-700 ease-out">
            <AssetImage
              file={image.file}
              fallbackFiles={image.fallbackFiles}
              alt={image.alt}
              objectPosition={image.objectPosition ?? 'center top'}
              className="w-full h-full object-cover filter grayscale contrast-125 opacity-[0.22] mix-blend-multiply group-hover:mix-blend-normal group-hover:grayscale-0 group-hover:contrast-105 group-hover:opacity-65 scale-100 group-hover:scale-105 transition-all duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#EAEAE6]/80 via-transparent to-[#EAEAE6]/85 group-hover:opacity-0 transition-opacity duration-500" />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-t from-[#080808] via-[#080808]/25 to-[#080808]/80 transition-opacity duration-500" />
            <FilmGrainOverlay intensity="fine" />
          </div>
        ) : null}
      </div>

      {/* Top Section: Title + 2-Line Sentence-Case Metadata on Left, Sovereign Man Icon on Right */}
      <div className="relative z-20 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 font-sans text-[19px] font-bold tracking-[-0.025em] leading-snug text-[#080808] group-hover:text-white transition-colors">
            <span
              className={`inline-block rounded-[4px] px-1.5 -ml-1.5 transition-colors duration-200 ${
                isHighlighted
                  ? 'bg-[#CCFF00] text-[#080808]'
                  : 'bg-transparent group-hover:bg-[#CCFF00] group-hover:text-[#080808]'
              }`}
            >
              {firstName}
            </span>{' '}
            <span>{restName}</span>
          </h3>

          <p className="m-0 mt-1 font-sans text-[12.5px] font-normal leading-[1.4] text-[#555555] group-hover:text-neutral-200 transition-colors truncate">
            {sportLeague} {formattedLeague ? `+ ${formattedLeague}` : ''}
          </p>

          <p className="m-0 font-sans text-[12.5px] font-normal leading-[1.4] text-[#555555] group-hover:text-neutral-300 transition-colors truncate">
            {formattedPostcode} · From {plainAud(fromPriceAud)}
          </p>
        </div>

        {/* Top-Right Double-Card Sovereign Man Icon (Triggers 9-System Clearinghouse) */}
        <button
          type="button"
          title="Open Sovereign Clearinghouse Terminal (9-System Dossier)"
          aria-label={`Open Sovereign Clearinghouse Terminal for ${name}`}
          onClick={(e) => {
            e.stopPropagation();
            onActivate?.();
            onOpenDossier?.(athlete);
          }}
          className="relative z-30 shrink-0 w-8 h-8 bg-transparent border-0 p-0 text-[#080808] group-hover:text-white hover:text-[#CCFF00] group-hover:hover:text-[#CCFF00] transition-colors cursor-pointer flex items-center justify-center"
        >
          <svg
            className="w-6 h-6"
            viewBox="0 0 28 28"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 5V3.5C7 2.94772 7.44772 2.5 8 2.5H23C23.5523 2.5 24 2.94772 24 3.5V20.5C24 21.0523 23.5523 21.5 23 21.5H21" />
            <rect x="4" y="5.5" width="17" height="19" rx="1.5" />
            <circle cx="12.5" cy="12" r="2.75" />
            <path d="M7.5 20.5C7.5 17.8 9.7 16.2 12.5 16.2C15.3 16.2 17.5 17.8 17.5 20.5" />
          </svg>
        </button>
      </div>

      {/* Bottom Section: Giant Architectural Initials Specimen + Unwrapped Hover Action Bar */}
      <div className="relative z-20 mt-auto flex items-end justify-between gap-3 pt-4">
        <div className="font-display text-[104px] xl:text-[116px] font-black leading-[0.78] tracking-[-0.055em] text-[#080808] group-hover:text-white transition-colors duration-300">
          {initials}
        </div>

        {/* Hover Controls: Highlight Video Trigger + Single-Line Fund Flight Pill */}
        <div className="flex items-center gap-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pb-1 shrink-0">
          {onMediaStudio ? (
            <button
              type="button"
              title="Open Highlight & Media Studio"
              aria-label={`Open Highlight & Media Studio for ${name}`}
              onClick={(e) => {
                e.stopPropagation();
                onActivate?.();
                onMediaStudio();
              }}
              className="w-8 h-8 rounded-full bg-black/60 hover:bg-[#CCFF00] text-white hover:text-[#080808] border border-white/25 flex items-center justify-center transition-colors cursor-pointer shrink-0 backdrop-blur-sm"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
              </svg>
            </button>
          ) : null}

          <span className="whitespace-nowrap rounded-full bg-[#CCFF00] text-[#080808] font-mono text-[10px] font-bold uppercase tracking-widest px-3.5 py-2 shadow-lg">
            Fund Flight →
          </span>
        </div>
      </div>
    </article>
  );
}

export default AthleteCard;