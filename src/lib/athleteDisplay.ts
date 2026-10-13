import { getSportComplianceBadges, type AgreementStatus } from '../types';

/**
 * Pure presentation helpers shared by the landing console and the marketplace roster.
 * Nothing here reads or writes data. Every input comes from rows the existing
 * queries already return.
 */

export type AllocationState = 'allocated' | 'pending' | 'open';

export interface AllocationDisplay {
  state: AllocationState;
  label: string;
}

/** An active agreement means the athlete is allocated. Anything else is still open to sponsors. */
export function getAllocationDisplay(status: AgreementStatus): AllocationDisplay {
  switch (status) {
    case 'active':
      return { state: 'allocated', label: 'ALLOCATED' };
    case 'pending':
      return { state: 'pending', label: 'PENDING' };
    default:
      return { state: 'open', label: 'OPEN' };
  }
}

/** League marker derived from the athlete's sport. */
export function getLeagueTag(sport: string | null): string | null {
  if (!sport) return null;
  const s = sport.toLowerCase();
  if (s.includes('basketball')) return '@nbl1';
  if (s.includes('soccer') || s.includes('football')) return '@nplnsw';
  if (s.includes('rugby') && s.includes('union')) return '@shuteshield';
  if (s.includes('rugby') && s.includes('league')) return '@nrl';
  if (s.includes('afl')) return '@vfl';
  if (s.includes('netball')) return '@ssn';
  if (s.includes('cricket')) return '@nswpremier';
  if (s.includes('combat')) return '@csa';
  return null;
}

export interface ClearanceInput {
  sport: string | null;
  master_licence_signed: boolean;
  nrl_tpa_registered: boolean;
  shute_shield_compliant: boolean;
}

export interface ClearanceDisplay {
  preCleared: boolean;
  licenceSigned: boolean;
  sportCompliant: boolean;
}

/** An athlete is pre-cleared when the master licence is signed and every sport compliance badge is active. */
export function getClearance(athlete: ClearanceInput): ClearanceDisplay {
  const sportCompliant = getSportComplianceBadges(athlete.sport, athlete).every((badge) => badge.active);
  return {
    preCleared: athlete.master_licence_signed && sportCompliant,
    licenceSigned: athlete.master_licence_signed,
    sportCompliant,
  };
}

const COMPASS_POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

/** Eight point compass label for a bearing in degrees (0 is north, clockwise). */
export function compassPoint(bearingDegrees: number): string {
  const normalised = ((bearingDegrees % 360) + 360) % 360;
  return COMPASS_POINTS[Math.round(normalised / 45) % 8];
}

/** Share of the catchment's combined reach held by one athlete, from 0 to 1. Null when there is no reach to share. */
export function getReachShare(followers: number | null, combinedReach: number): number | null {
  if (followers == null || combinedReach <= 0) return null;
  return Math.min(followers / combinedReach, 1);
}

export function formatShare(share: number): string {
  return `${(share * 100).toFixed(1)}%`;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** Splits a full name into a first name and the remainder, for stacked display type. */
export function splitName(name: string): [string, string] {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return [parts[0] ?? '', ''];
  return [parts[0], parts.slice(1).join(' ')];
}
