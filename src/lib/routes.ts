/** Canonical paths for the flagship editorial surfaces. */
export const HOW_IT_WORKS_PATH = '/how-it-works';
export const THE_ROSTER_PATH = '/the-roster';
export const COMMERCIAL_TIERS_PATH = '/commercial-tiers';
export const BRISBANE_RUNWAY_PATH = '/brisbane-2032-runway';

export const PRIMARY_LINKS = [
  { id: 'roster', href: THE_ROSTER_PATH, label: 'Athlete Roster', headingId: 'roster-heading' },
  { id: 'how-it-works', href: HOW_IT_WORKS_PATH, label: 'How It Works', headingId: 'how-it-works-heading' },
  { id: 'commercial-tiers', href: COMMERCIAL_TIERS_PATH, label: 'Sponsorship Options', headingId: 'commercial-tiers-heading' },
  { id: 'syndicate', href: BRISBANE_RUNWAY_PATH, label: 'Olympic Runway', headingId: 'syndicate-heading' },
] as const;

export function isPlainLinkActivation(event: Pick<MouseEvent, 'button' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}
