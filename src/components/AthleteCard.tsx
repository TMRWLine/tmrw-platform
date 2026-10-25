import React from 'react';
import { AssetImage } from './AssetImage';
import { CourtLinesOverlay } from './CourtLinesOverlay';
import { FilmGrainOverlay } from './FilmGrainOverlay';

export type AthleteCardLayout = 'card' | 'list' | 'specimen' | 'hero' | 'cell';

export interface AthleteCardImage {
  /** File name inside `/public`. */
  file: string;
  /** Alternative `/public` files tried in order when `file` is missing. */
  fallbackFiles?: readonly string[];
  alt: string;
  objectPosition?: string;
}

export interface AthleteCardProps<TAthlete = unknown> {
  /** Display name, e.g. "H. Bligh". */
  name: string;
  /** Monogram shown in the square avatar, e.g. "HB". */
  initials: string;
  /** Sport discipline, e.g. "Basketball". */
  sportLeague: string;
  /** Monospace catchment pill, e.g. `@nbl1 // 2026`. */
  catchmentTag: string;
  /** Editorial photograph. When omitted a dark specimen plate keeps the geometry intact. */
  image?: AthleteCardImage;
  /** Capsule copy in the top-right corner. */
  badge?: string;
  /** Optional dynamic valuation (AUD) shown as a quiet telemetry line. */
  valuationAud?: number;
  /** Entry package price (AUD), rendered without grouping separators. */
  fromPriceAud?: number;
  /** Optional extra compliance chips (IP lock, NRL TPA). */
  tags?: readonly string[];
  /** Verified flight lockup, e.g. "PATHWAY FLIGHT // A$3500 AUD". */
  tierLockup?: string;
  /** Catchment, state league, exclusivity, or Olympic squad tag. */
  tierTag?: string;
  /** 70/15/15 settlement line, or the syndicate allocation line. */
  splitLine?: string;
  /** Live clearance pill on the hero specimen. */
  statusLabel?: string;
  /** Target horizon, e.g. "Milestone: Brisbane 2032 Pathway". */
  milestone?: string;
  /** Headline lockup shown on directory cells. */
  headline?: string;
  layout?: AthleteCardLayout;
  /** Whole-card activation. Used by the hairline roster directory. */
  onSelect?: () => void;
  /** Athlete record the dossier button hands to `onOpenDossier`. */
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
        className="bg-[#CCFF00] text-black text-[9px] font-mono font-bold px-2.5 py-0.5 uppercase tracking-wider"
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
  <p className={`m-0 font-mono text-[10px] uppercase tracking-widest text-[#666666] ${className}`}>
    Packages from <span className="font-bold text-[#080808] tabular-nums">{plainAud(amountAud)}</span>
  </p>
);

const SQUARE_BTN =
  'w-[42px] h-[42px] shrink-0 flex items-center justify-center bg-white border border-[#080808]/10 hover:border-[#080808] text-[#080808] transition-colors p-2.5 rounded-xl cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#080808] focus-visible:ring-offset-2';

const SPONSOR_BTN =
  'bg-[#080808] text-[#F7F7F6] font-bold text-xs uppercase tracking-widest py-3 px-5 rounded-full hover:bg-[#CCFF00] hover:text-[#080808] transition-colors duration-300 ease-out flex-grow text-center border-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#080808] focus-visible:ring-offset-2';

const GLASS_BTN =
  'rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm text-xs font-mono uppercase tracking-widest px-4 py-2 cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00]';

/** 1px drafting grid. Same hairline weight as the home hero court wireframe. */
const HairlineWireframe: React.FC = () => (
  <>
    <CourtLinesOverlay />
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 border border-white/15" />
    <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/3 z-10 border-l border-white/15" />
    <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-2/3 z-10 border-l border-white/15" />
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/3 z-10 border-t border-white/15" />
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-2/3 z-10 border-t border-white/15" />
  </>
);

const DossierIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const FilmReelIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
    <line x1="7" y1="2" x2="7" y2="22" />
    <line x1="17" y1="2" x2="17" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="2" y1="7" x2="7" y2="7" />
    <line x1="2" y1="17" x2="7" y2="17" />
    <line x1="17" y1="17" x2="22" y2="17" />
    <line x1="17" y1="7" x2="22" y2="7" />
  </svg>
);

const Monogram: React.FC<{ initials: string; className?: string }> = ({ initials, className = '' }) => (
  <div
    aria-hidden="true"
    className={`flex items-center justify-center rounded-xl bg-white font-display font-extrabold text-[#080808] tracking-tight ${className}`}
  >
    {initials}
  </div>
);

const DOSSIER_BTN =
  'w-[42px] h-[42px] rounded-xl border border-black/10 bg-white text-[#080808] hover:border-[#080808] hover:bg-[#F7F7F6] p-2.5 cursor-pointer flex items-center justify-center transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#080808] focus-visible:ring-offset-2';

function Actions<TAthlete>({
  name,
  athlete,
  onSponsor,
  onOpenDossier,
  onMediaStudio,
}: Pick<AthleteCardProps<TAthlete>, 'name' | 'athlete' | 'onSponsor' | 'onOpenDossier' | 'onMediaStudio'>) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onSponsor} className={SPONSOR_BTN}>
        View Commercial Deliverables
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenDossier?.(athlete);
        }}
        title="View Sovereign Profile"
        aria-label={`View ${name} dossier`}
        className={DOSSIER_BTN}
      >
        <DossierIcon />
      </button>
      <button type="button" onClick={onMediaStudio} className={SQUARE_BTN} aria-label={`Open ${name} highlight reels`}>
        <FilmReelIcon />
      </button>
    </div>
  );
}

export function AthleteCard<TAthlete>({
  name,
  initials,
  sportLeague,
  catchmentTag,
  image,
  tags,
  tierLockup,
  tierTag,
  splitLine,
  statusLabel,
  milestone,
  headline,
  layout = 'card',
  fromPriceAud,
  athlete,
  onSponsor,
  onOpenDossier,
  onMediaStudio,
  onSelect,
}: AthleteCardProps<TAthlete>) {
  if (layout === 'cell') {
    const open = () => {
      if (onSelect) {
        onSelect();
        return;
      }
      onOpenDossier?.(athlete);
    };
    return (
      <article
        className="group relative isolate flex h-full min-h-[520px] cursor-pointer flex-col overflow-hidden border border-black/10 bg-white text-[#080808]"
        onClick={open}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            open();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Open ${name} dossier`}
      >
        <div className="relative isolate min-h-[280px] flex-1 overflow-hidden bg-[#0A0A0A]">
          {image ? (
            <AssetImage
              file={image.file}
              fallbackFiles={image.fallbackFiles}
              alt={image.alt}
              objectPosition={image.objectPosition}
              className="roster-cell-image absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full min-h-[280px] items-end p-5 font-display text-3xl font-bold text-white">
              {initials}
            </div>
          )}
          <div aria-hidden="true" className="roster-cell-duotone pointer-events-none absolute inset-0" />
          <FilmGrainOverlay intensity="fine" />
          <VerificationBadges className="absolute right-4 top-4 z-20" />
        </div>
        <div className="flex flex-col gap-2 border-t border-black/10 bg-white p-5">
          <p className="m-0 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-[#080808]">
            {headline ?? `${name} // ${sportLeague} // ${catchmentTag}`}
          </p>
          <p className="m-0 font-mono text-[10px] uppercase tracking-[0.08em] text-black/45">
            {milestone ?? 'Milestone: National Selection Trials'}
          </p>
          {tierLockup ? (
            <p className="m-0 font-mono text-[10px] uppercase tracking-[0.08em] text-black/55">{tierLockup}</p>
          ) : null}
        </div>
      </article>
    );
  }

  if (layout === 'hero') {
    return (
      <article className="group relative isolate h-full min-h-[560px] w-full flex-1 overflow-hidden rounded-[32px] border border-white/15 bg-[#0F0F11] text-white">
        {image ? (
          <AssetImage
            file={image.file}
            fallbackFiles={image.fallbackFiles}
            alt={image.alt}
            objectPosition={image.objectPosition}
            loading="eager"
            className="absolute inset-0 h-full w-full object-cover brightness-[0.78] contrast-[1.2]"
          />
        ) : (
          <div aria-hidden="true" className="absolute inset-0 bg-[#0F0F11]" />
        )}
        <FilmGrainOverlay intensity="heavy" />
        <HairlineWireframe />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[15] bg-gradient-to-t from-black via-black/75 to-black/20" />
        <div className="relative z-20 flex h-full min-h-[560px] flex-col justify-between p-6 md:p-8">
          <div className="flex items-start justify-between gap-3">
            <span className="rounded-full bg-[#CCFF00] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[#0F0F11] shadow-[0_0_16px_rgba(204,255,0,0.45)]">
              {statusLabel || 'Pre-cleared'}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-white/70">{initials}</span>
          </div>
          <div>
            <p className="m-0 font-mono text-[11px] uppercase tracking-widest text-white/75">{catchmentTag}</p>
            <h3 className="m-0 mt-3 font-display text-4xl font-bold tracking-tight text-white md:text-5xl">{name}</h3>
            <p className="m-0 mt-2 font-mono text-xs uppercase tracking-widest text-white/80">{sportLeague}</p>
            {tierLockup ? (
              <p className="m-0 mt-4 font-mono text-[11px] font-bold uppercase tracking-widest text-white">{tierLockup}</p>
            ) : null}
            {tierTag ? (
              <p className="m-0 mt-1 font-mono text-[11px] uppercase tracking-widest text-[#CCFF00]">{tierTag}</p>
            ) : null}
            {splitLine ? (
              <p className="m-0 mt-3 font-mono text-[11px] uppercase tracking-wider text-white/75">{splitLine}</p>
            ) : null}
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onSponsor}
                className="rounded-full border-0 bg-[#CCFF00] px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-[#0F0F11] cursor-pointer transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00]"
              >
                View commercial deliverables
              </button>
              <button
                type="button"
                onClick={() => onOpenDossier?.(athlete)}
                className={GLASS_BTN}
                aria-label={`View ${name} dossier`}
              >
                Open dossier
              </button>
              <button type="button" onClick={onMediaStudio} className={GLASS_BTN} aria-label={`Open ${name} highlight reels`}>
                Reels
              </button>
            </div>
          </div>
        </div>
      </article>
    );
  }

  if (layout === 'specimen') {
    return (
      <article className="flex h-full min-h-[520px] w-full flex-1 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white text-[#0F0F11]">
        <div className="relative h-[280px] shrink-0 overflow-hidden bg-[#0F0F11]">
          {image ? (
            <AssetImage
              file={image.file}
              fallbackFiles={image.fallbackFiles}
              alt={image.alt}
              objectPosition={image.objectPosition}
              className="h-full w-full object-cover brightness-[0.9] contrast-[1.15]"
            />
          ) : (
            <div className="flex h-full items-end p-4 font-display text-3xl font-bold text-white">{initials}</div>
          )}
          <FilmGrainOverlay intensity="heavy" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 z-20 flex flex-wrap gap-2 p-4">
            <button
              type="button"
              onClick={() => onOpenDossier?.(athlete)}
              className={GLASS_BTN}
              aria-label={`View ${name} dossier`}
            >
              Open dossier
            </button>
            <button type="button" onClick={onMediaStudio} className={GLASS_BTN} aria-label={`Open ${name} highlight reels`}>
              Reels
            </button>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-2 border-t border-neutral-200 p-5">
          <h3 className="m-0 font-display text-2xl font-bold tracking-tight text-[#0F0F11]">{name}</h3>
          <p className="m-0 font-mono text-[11px] uppercase tracking-widest text-neutral-500">{sportLeague}</p>
          <p className="m-0 font-mono text-[11px] uppercase tracking-widest text-[#0F0F11]">{catchmentTag}</p>
          {tierLockup ? (
            <p className="m-0 mt-2 font-mono text-[11px] font-bold uppercase tracking-wider text-[#0F0F11]">{tierLockup}</p>
          ) : null}
          {tierTag ? <p className="m-0 font-mono text-[10px] uppercase tracking-widest text-neutral-500">{tierTag}</p> : null}
          {splitLine ? (
            <p className="m-0 font-mono text-[10px] uppercase tracking-wider text-neutral-600">{splitLine}</p>
          ) : (
            <AccessPrice amountAud={fromPriceAud} />
          )}
          <button type="button" onClick={onSponsor} className={`${SPONSOR_BTN} mt-auto w-full`}>
            View commercial deliverables
          </button>
        </div>
      </article>
    );
  }

  const tagPill = (
    <span className="inline-flex items-center rounded-full border border-[#080808]/15 bg-white/60 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[#080808]">
      {catchmentTag}
    </span>
  );

  const extraTags =
    tags && tags.length > 0 ? (
      <ul className="m-0 mt-2 p-0 list-none flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <li
            key={t}
            className="m-0 rounded-full bg-white px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#666666]"
          >
            {t}
          </li>
        ))}
      </ul>
    ) : null;

  if (layout === 'list') {
    return (
      <article className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-4 hover:border-black transition-all duration-300 relative overflow-hidden group">
        <Monogram initials={initials} className="w-14 h-14 text-lg shrink-0" />
        {image ? (
          <div className="overflow-hidden rounded-[14px] shrink-0 w-full md:w-36">
            <AssetImage
              file={image.file}
              fallbackFiles={image.fallbackFiles}
              alt={image.alt}
              objectPosition={image.objectPosition}
              className="w-full h-[120px] md:h-24 object-cover rounded-[14px] brightness-[0.92] contrast-[1.12]"
            />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <h3 className="m-0 font-display font-extrabold text-2xl tracking-tight text-[#080808] leading-tight">
            {name}
          </h3>
          <p className="m-0 mt-1 font-mono text-xs text-[#666666] tracking-wide">{sportLeague}</p>
          {extraTags}
        </div>
        <div className="md:w-56 flex flex-col items-start gap-2">
          {tagPill}
          <AccessPrice amountAud={fromPriceAud} />
        </div>
        <div className="md:w-[340px]">
          <Actions
            name={name}
            athlete={athlete}
            onSponsor={onSponsor}
            onOpenDossier={onOpenDossier}
            onMediaStudio={onMediaStudio}
          />
        </div>
        <VerificationBadges className="md:static absolute top-3 right-3" />
      </article>
    );
  }

  return (
    <article className="bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col justify-between gap-6 min-h-[560px] hover:border-black transition-colors duration-300 relative overflow-hidden group">
      <VerificationBadges className="absolute top-4 right-4" />

      <div>
        <Monogram initials={initials} className="w-12 h-12 text-base mb-4" />
        <h3 className="m-0 font-display font-extrabold text-2xl tracking-tight text-[#080808] leading-tight">{name}</h3>
        <p className="m-0 mt-1 font-mono text-xs text-[#666666] tracking-wide">{sportLeague}</p>
        <div className="mt-3">{tagPill}</div>
        {extraTags}
      </div>

      <div className="overflow-hidden rounded-[14px]">
        {image ? (
          <AssetImage
            file={image.file}
            fallbackFiles={image.fallbackFiles}
            alt={image.alt}
            objectPosition={image.objectPosition}
            className="w-full h-[260px] object-cover rounded-[14px] brightness-[0.92] contrast-[1.12] transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div
            role="img"
            aria-label={`${name} specimen plate`}
            className="relative w-full h-[260px] rounded-[14px] overflow-hidden bg-[#080808] transition-transform duration-500 group-hover:scale-[1.02]"
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(184,255,0,0.18),transparent_55%)]"
            />
          </div>
        )}
      </div>

      <div>
        <AccessPrice amountAud={fromPriceAud} className="mb-3" />
        <Actions
          name={name}
          athlete={athlete}
          onSponsor={onSponsor}
          onOpenDossier={onOpenDossier}
          onMediaStudio={onMediaStudio}
        />
      </div>
    </article>
  );
}

export default AthleteCard;
