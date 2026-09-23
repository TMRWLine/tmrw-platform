export type ClipKind = 'raw_match' | 'vertical_training' | 'game_day_highlight';

export const CLIP_KINDS: { id: ClipKind; label: string }[] = [
  { id: 'raw_match', label: 'Raw match footage' },
  { id: 'vertical_training', label: 'Vertical training reel' },
  { id: 'game_day_highlight', label: 'Game-day highlight' },
];

export type LicenceWindowDays = 30 | 60 | 90;

export const LICENCE_WINDOWS: { days: LicenceWindowDays; terms: string }[] = [
  {
    days: 30,
    terms: 'Single-campaign local digital display within the 15km catchment. No broadcast, no paid media outside the licensed postcodes.',
  },
  {
    days: 60,
    terms: 'Two-phase local campaign: organic social plus in-store screens across licensed postcodes. Athlete approval required for edits.',
  },
  {
    days: 90,
    terms: 'Season window: organic, in-store and paid local social within licensed postcodes. Rights revert to the athlete on expiry.',
  },
];

export interface UploadedClip {
  id: string;
  /** Session-only object URL; clips are not persisted server-side. */
  src: string;
  fileName: string;
  sizeMb: number;
  kind: ClipKind;
  fixtureDate: string;
  opponent: string;
  venuePostcode: string;
  licenceDays: LicenceWindowDays;
  uploadedAt: string;
}

export const MAX_CLIP_MB = 500;

export function isValidPostcode(value: string): boolean {
  return /^\d{4}$/.test(value.trim());
}

export function clipKindLabel(kind: ClipKind): string {
  return CLIP_KINDS.find((k) => k.id === kind)?.label ?? kind;
}
