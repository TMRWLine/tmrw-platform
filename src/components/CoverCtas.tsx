import { BRISBANE_RUNWAY_PATH, THE_ROSTER_PATH } from '../lib/routes';
import type { LandingSectionId } from './Navigation';
import { RollingPillButton } from './RollingPillButton';

const links = [
  { id: 'roster', href: THE_ROSTER_PATH, label: 'Explore the Roster', variant: 'primary' },
  { id: 'syndicate', href: BRISBANE_RUNWAY_PATH, label: 'Brisbane 2032 Runway', variant: 'glass' },
] as const;

export function CoverCtas({ onNavigate }: { onNavigate?: (id: LandingSectionId) => void }) {
  return links.map(({ id, href, label, variant }) => (
    <RollingPillButton key={id} href={href} variant={variant} className={variant === 'glass' ? 'bg-black/85' : ''}
      onClick={onNavigate && ((event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        onNavigate(id);
      })}>
      {label}
    </RollingPillButton>
  ));
}
