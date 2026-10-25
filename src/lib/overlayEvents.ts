/**
 * Window-level events that let any component open a root-level overlay without prop drilling.
 * `App` owns the state and subscribes to all three.
 */
export const OPEN_SEARCH_OVERLAY_EVENT = 'open-search-overlay';
export const OPEN_MENU_OVERLAY_EVENT = 'open-menu-overlay';
export const OPEN_DEPLOY_DRAWER_EVENT = 'open-deploy-drawer';
export const FILTER_ROSTER_TIER_EVENT = 'filter-roster-tier';

export type OverlayEventName =
  | typeof OPEN_SEARCH_OVERLAY_EVENT
  | typeof OPEN_MENU_OVERLAY_EVENT
  | typeof OPEN_DEPLOY_DRAWER_EVENT;

export type DeployPackageId = 'storefront' | 'metro' | 'regional';

/** Commercial catalogue ids that pre-filter The Roster before an athlete is chosen. */
export type RosterCommercialTierId =
  | 'local_merchant'
  | 'pathway_flight'
  | 'national_challenger'
  | 'world_class';

export type RosterFilterId = 'all' | 'storefront' | 'metro' | 'national' | 'regional';

export interface DeployDrawerDetail {
  packageId?: DeployPackageId;
}

export interface RosterFilterDetail {
  tierId: RosterCommercialTierId;
  /** Package name used by the roster pre-clear banner. */
  label?: string;
}

export function emitOverlayEvent(name: OverlayEventName, detail?: DeployDrawerDetail): void {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function emitRosterFilter(tierId: RosterCommercialTierId, label?: string): void {
  window.dispatchEvent(
    new CustomEvent<RosterFilterDetail>(FILTER_ROSTER_TIER_EVENT, { detail: { tierId, label } }),
  );
}

const PENDING_ROSTER_FILTER_KEY = 'tmrw.pendingRosterTier';

let pendingRosterFilter: RosterFilterDetail | null = null;

/** Holds a flight filter until the roster mounts on the landing route. */
export function stashRosterFilter(tierId: RosterCommercialTierId, label?: string): void {
  pendingRosterFilter = { tierId, label };
  try {
    sessionStorage.setItem(PENDING_ROSTER_FILTER_KEY, JSON.stringify(pendingRosterFilter));
  } catch {
    // Private mode can block storage. The in-memory copy still covers this page load.
  }
}

export function peekRosterFilter(): RosterFilterDetail | null {
  if (pendingRosterFilter?.tierId) return pendingRosterFilter;
  try {
    const raw = sessionStorage.getItem(PENDING_ROSTER_FILTER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RosterFilterDetail;
    if (!parsed?.tierId) return null;
    pendingRosterFilter = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function clearRosterFilter(): void {
  pendingRosterFilter = null;
  try {
    sessionStorage.removeItem(PENDING_ROSTER_FILTER_KEY);
  } catch {
    // Ignore storage failures. The in-memory copy is already cleared.
  }
}
