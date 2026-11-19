/** Canonical paths for the flagship editorial surfaces. */
export const HOW_IT_WORKS_PATH = '/how-it-works';
export const THE_ROSTER_PATH = '/the-roster';
export const COMMERCIAL_TIERS_PATH = '/commercial-tiers';
export const BRISBANE_RUNWAY_PATH = '/brisbane-2032-runway';

export const PRIMARY_SECTION_PATHS = {
  roster: THE_ROSTER_PATH,
  'how-it-works': HOW_IT_WORKS_PATH,
  'commercial-tiers': COMMERCIAL_TIERS_PATH,
  syndicate: BRISBANE_RUNWAY_PATH,
} as const;

type LinkClick = Pick<MouseEvent, 'button' | 'defaultPrevented' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'>;

export function isUnmodifiedLinkClick(event: LinkClick): boolean {
  return !event.defaultPrevented && event.button === 0 &&
    !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
}
