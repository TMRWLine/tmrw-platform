import React, { useState, useEffect } from 'react';
import { AssetImage } from './AssetImage';
import { FilmGrainOverlay } from './FilmGrainOverlay';
import { portraitFile, specimenFor, type AthleteRecord } from '../data/roster';
import type { LiveAthleteOverride } from './AthleteDossierDrawer';

export type SpecimenBadgeVariant = 'green' | 'yellow' | 'black' | 'outline';

interface RosterSpecimenCardProps {
  athlete: AthleteRecord;
  badgeText?: string;
  badgeVariant?: SpecimenBadgeVariant;
  onOpenDossier: (athlete: AthleteRecord, initialMode?: 'audit' | 'buy') => void;
}

const CARD_FRAMES = [
  { label: '01 Studio', crop: 'scale-100 object-center' },
  { label: '02 In-Game', crop: 'scale-125 object-top' },
  { label: '03 Precinct', crop: 'scale-110 object-bottom' },
  { label: '04 Lookbook', crop: 'scale-115 object-center contrast-125' },
];

const DEFAULT_CLIPS = [
  { time: '01:14', label: 'Fast Break', crop: 'scale-115 object-top contrast-125' },
  { time: '04:38', label: 'Clutch 3PT', crop: 'scale-125 object-center contrast-135' },
  { time: '09:12', label: '5AM Block', crop: 'scale-110 object-bottom contrast-125' },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getSplitName(name: string): { firstInitial: string; surname: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return {
      firstInitial: `${parts[0][0]?.toUpperCase() ?? ''}.`,
      surname: parts.slice(1).join(' '),
    };
  }
  return { firstInitial: name, surname: '' };
}

export const RosterSpecimenCard: React.FC<RosterSpecimenCardProps> = ({
  athlete,
  badgeText = 'New',
  badgeVariant = 'green',
  onOpenDossier,
}) => {
  const [mediaMode, setMediaMode] = useState<'photo' | 'video'>('photo');
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [frameIdx, setFrameIdx] = useState(0);
  const [clipIdx, setClipIdx] = useState(0);
  const [liveOverride, setLiveOverride] = useState<LiveAthleteOverride | null>(null);

  useEffect(() => {
    const loadOverride = () => {
      try {
        const raw = localStorage.getItem(`tmrw_override_${athlete.id}`);
        setLiveOverride(raw ? (JSON.parse(raw) as LiveAthleteOverride) : null);
      } catch {
        setLiveOverride(null);
      }
    };
    loadOverride();
    window.addEventListener('tmrw:athlete-updated', loadOverride);
    return () => window.removeEventListener('tmrw:athlete-updated', loadOverride);
  }, [athlete.id]);

  const displayFullName = liveOverride?.full_name || athlete.full_name;
  const displaySport = liveOverride?.sport || athlete.sport;
  const displayLeague = liveOverride?.league || athlete.league;
  const displayPostcode = liveOverride?.postcode || athlete.postcode;

  const specimen = specimenFor(athlete.id);
  const imageFile = portraitFile(specimen?.image ?? athlete.image);
  const imageFallbacks = specimen?.imageFallbacks ?? [];
  const initials = getInitials(displayFullName);
  const splitName = getSplitName(displayFullName);

  const activeClips = liveOverride?.ai_clips?.length
    ? liveOverride.ai_clips.map((c, idx) => ({
        time: c.time,
        label: c.label,
        crop: DEFAULT_CLIPS[idx % DEFAULT_CLIPS.length].crop,
      }))
    : DEFAULT_CLIPS;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mediaMode === 'video') {
      setClipIdx((prev) => (prev - 1 + activeClips.length) % activeClips.length);
    } else {
      setFrameIdx((prev) => (prev - 1 + CARD_FRAMES.length) % CARD_FRAMES.length);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mediaMode === 'video') {
      setClipIdx((prev) => (prev + 1) % activeClips.length);
    } else {
      setFrameIdx((prev) => (prev + 1) % CARD_FRAMES.length);
    }
  };

  const toggleVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMediaMode((prev) => (prev === 'video' ? 'photo' : 'video'));
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted((prev) => !prev);
  };

  const totalItems = mediaMode === 'video' ? activeClips.length : CARD_FRAMES.length;
  const currentIdx = mediaMode === 'video' ? clipIdx : frameIdx;

  const hasProfileUpdate = Boolean(liveOverride);
  const effectiveBadgeText = hasProfileUpdate
    ? 'Updated'
    : badgeText === 'Early access' || badgeText === 'Update'
    ? 'Updated'
    : badgeText;

  const isUpdateYellow =
    hasProfileUpdate ||
    badgeVariant === 'yellow' ||
    effectiveBadgeText.toLowerCase().includes('update');

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Open ${displayFullName} athlete dossier`}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onOpenDossier(athlete, 'audit');
        }
      }}
      onClick={() => onOpenDossier(athlete, 'audit')}
      style={{
        borderRadius: '16px',
        aspectRatio: '1 / 1.24',
        minHeight: '490px',
      }}
      className="group relative isolate flex w-full flex-col justify-between p-7 xl:p-8 bg-[#F0F0EE] hover:bg-[#080808] text-[#080808] hover:text-white transition-colors duration-500 cursor-pointer overflow-visible select-none"
    >
      {/* Floating Top-Right Pill Badge · #CCFF00 Green for "New", #CCFF00 Yellow for "Updated" */}
      {effectiveBadgeText && (
        <span
          className={`absolute -top-2.5 right-5 z-30 inline-flex items-center rounded-full px-3.5 py-0.5 font-sans text-[11px] font-bold tracking-tight shadow-xs ${
            isUpdateYellow
              ? 'bg-[#CCFF00] text-[#080808]'
              : badgeVariant === 'black'
              ? 'bg-[#080808] text-white'
              : 'bg-[#CCFF00] text-[#080808]'
          }`}
        >
          {effectiveBadgeText}
        </span>
      )}

      {/* Full-Bleed Photo & Video Canvas:
          Subtle Greyed-Out Photo at Rest (grayscale opacity-[0.12]), Full-Bleed Colour on Hover */}
      <div
        style={{ borderRadius: '16px' }}
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      >
        <AssetImage
          file={imageFile}
          fallbackFiles={imageFallbacks}
          alt={displayFullName}
          className={`w-full h-full object-cover transition-all duration-700 ease-out ${
            mediaMode === 'video'
              ? `grayscale-0 opacity-95 ${activeClips[clipIdx]?.crop ?? 'scale-110'}`
              : `grayscale opacity-[0.12] group-hover:grayscale-0 group-hover:opacity-90 ${CARD_FRAMES[frameIdx].crop}`
          }`}
        />
        <div
          className={`absolute inset-0 bg-gradient-to-t from-[#080808]/90 via-[#080808]/15 to-[#080808]/60 transition-opacity duration-500 ${
            mediaMode === 'video' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        />
        <div
          className={`transition-opacity duration-500 ${
            mediaMode === 'video' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <FilmGrainOverlay intensity="fine" />
        </div>
      </div>

      {/* Top Header: Exact Pangram Typography Hierarchy + 25px Specimen Icon */}
      <div className="relative z-20 flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <h3
            className={`m-0 font-sans text-[17.5px] xl:text-[18.5px] font-bold tracking-[-0.02em] leading-[1.25] ${
              mediaMode === 'video' ? 'text-white' : ''
            }`}
          >
            <span
              className={`inline-block rounded-[4px] px-1.5 -ml-1.5 mr-0.5 transition-colors duration-200 ${
                mediaMode === 'video'
                  ? 'bg-[#CCFF00] text-[#080808]'
                  : 'bg-transparent group-hover:bg-[#CCFF00] group-hover:text-[#080808]'
              }`}
            >
              {splitName.firstInitial}
            </span>
            <span>{splitName.surname}</span>
          </h3>
          <p
            className={`m-0 pt-0.5 font-sans text-[12.5px] font-normal tracking-[-0.01em] leading-[1.38] transition-colors ${
              mediaMode === 'video'
                ? 'text-neutral-200'
                : 'text-[#666666] group-hover:text-neutral-200'
            }`}
          >
            {displaySport} + {displayLeague}
          </p>
          <p
            className={`m-0 font-sans text-[12.5px] font-normal tracking-[-0.01em] leading-[1.38] transition-colors ${
              mediaMode === 'video'
                ? 'text-neutral-300'
                : 'text-[#666666] group-hover:text-neutral-300'
            }`}
          >
            Postcode {displayPostcode} · From A$750
          </p>
        </div>

        {/* Top-Right Stacked Man/Specimen Icon */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDossier(athlete, 'audit');
          }}
          title="Open Athlete Dossier"
          aria-label="Open Athlete Dossier"
          className={`h-7 w-7 rounded-lg bg-transparent border-0 flex items-center justify-center transition-colors cursor-pointer p-0 shrink-0 ${
            mediaMode === 'video'
              ? 'text-white hover:text-[#CCFF00]'
              : 'text-[#080808] group-hover:text-white hover:text-[#CCFF00]'
          }`}
        >
          <svg
            width="25"
            height="25"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="15" height="17" rx="2" />
            <path d="M7 4V2.5A1.5 1.5 0 0 1 8.5 1h10A2.5 2.5 0 0 1 21 3.5v14a1.5 1.5 0 0 1-1.5 1.5H18" />
            <circle cx="10.5" cy="10" r="2.2" />
            <path d="M6.5 17.5c.8-2 2.2-3 4-3s3.2 1 4 3" />
          </svg>
        </button>
      </div>

      {/* Bottom Choreography:
          1. At Rest: Clean Proportioned Initials ("MT") with breathing room at the baseline.
          2. On Hover: Initials vanish & Full-Width White Bar controls Photos, Video & Audio Mute/Unmute. */}
      <div className="relative z-20 mt-auto pt-6 pb-1">
        <div
          className={`font-display text-[128px] sm:text-[138px] xl:text-[148px] font-black leading-[0.82] tracking-[-0.055em] -ml-1 transition-all duration-300 ${
            mediaMode === 'video'
              ? 'opacity-0 translate-y-2 pointer-events-none'
              : 'opacity-100 translate-y-0 group-hover:opacity-0 group-hover:translate-y-2 group-hover:pointer-events-none'
          }`}
        >
          {initials}
        </div>

        {/* Full-Width White Pill Bar on Hover */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute inset-x-0 bottom-0 h-10 rounded-full bg-[#F7F7F6] text-[#080808] shadow-[0_12px_32px_rgba(0,0,0,0.35)] px-1.5 flex items-center justify-between transition-all duration-300 ${
            mediaMode === 'video'
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto'
          }`}
        >
          {/* Left Side: Crisp Hover-State Arrows + Active Frame/Clip Label */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={handlePrev}
              title="Previous"
              aria-label="Previous"
              className="h-7 w-7 rounded-full bg-transparent hover:bg-[#080808] text-[#080808] hover:text-[#CCFF00] border-0 flex items-center justify-center cursor-pointer transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <span className="font-sans text-[11.5px] font-semibold tracking-tight text-[#080808] px-1 min-w-[92px] text-center truncate">
              {mediaMode === 'video'
                ? `${activeClips[clipIdx]?.label} · ${activeClips[clipIdx]?.time}`
                : `${CARD_FRAMES[frameIdx].label} (${currentIdx + 1}/${totalItems})`}
            </span>

            <button
              type="button"
              onClick={handleNext}
              title="Next"
              aria-label="Next"
              className="h-7 w-7 rounded-full bg-transparent hover:bg-[#080808] text-[#080808] hover:text-[#CCFF00] border-0 flex items-center justify-center cursor-pointer transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Right Side: Live Audio Mute/Unmute Toggle (in Reel Mode) + Watch Reel / Photos Pill */}
          <div className="flex items-center gap-1">
            {mediaMode === 'video' && (
              <button
                type="button"
                onClick={toggleMute}
                title={isMuted ? 'Unmute Reel Audio' : 'Mute Reel Audio'}
                aria-label={isMuted ? 'Unmute Reel Audio' : 'Mute Reel Audio'}
                className={`h-7 w-7 rounded-full flex items-center justify-center border-0 cursor-pointer transition-colors ${
                  !isMuted
                    ? 'bg-[#CCFF00] text-[#080808]'
                    : 'bg-black/10 hover:bg-[#080808] text-[#080808] hover:text-white'
                }`}
              >
                {isMuted ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </svg>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={toggleVideo}
              className={`h-7 rounded-full px-3 font-sans text-[11.5px] font-bold tracking-tight flex items-center gap-1.5 cursor-pointer border-0 transition-colors ${
                mediaMode === 'video'
                  ? 'bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808]'
                  : 'bg-[#080808] hover:bg-[#CCFF00] text-white hover:text-[#080808]'
              }`}
            >
              <span>{mediaMode === 'video' ? 'Photos' : 'Watch reel'}</span>
              <span className="text-[9px]">{mediaMode === 'video' ? '❚❚' : '▸'}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

export default RosterSpecimenCard;