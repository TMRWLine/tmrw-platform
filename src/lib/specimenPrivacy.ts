export const PROTECTED_CLUB = '[VERIFIED TIER 1/2 LEAGUE // PROTECTED]';

export function specimenTag(index: number, sport: string | null): string {
  const n = String(index + 1).padStart(3, '0');
  const label = (sport ?? 'MULTI-DISCIPLINE').trim().toUpperCase() || 'MULTI-DISCIPLINE';
  return `SPECIMEN ${n} // ${label}`;
}

export function redactedCatchment(postcode: string | null): string {
  const digits = (postcode ?? '').replace(/\D/g, '');
  const prefix = (digits.slice(0, 2) || '**').padEnd(2, '*');
  return `POSTCODE ${prefix}** // ${catchmentRegion(prefix)}`;
}

export function catchmentRegion(prefix: string): string {
  if (prefix.startsWith('20') || prefix.startsWith('21') || prefix.startsWith('22')) {
    return 'EASTERN SUBURBS';
  }
  if (prefix.startsWith('25') || prefix.startsWith('26') || prefix.startsWith('27')) {
    return 'GREATER WEST CATCHMENT';
  }
  if (prefix.startsWith('30') || prefix.startsWith('31') || prefix.startsWith('32')) {
    return 'INNER METRO MELBOURNE';
  }
  if (prefix.startsWith('40') || prefix.startsWith('41')) return 'BRISBANE NORTHSIDE';
  if (prefix.startsWith('50')) return 'ADELAIDE BASIN';
  if (prefix.startsWith('60')) return 'PERTH COASTAL';
  return 'PROTECTED CATCHMENT';
}

export function onboardingStorageKey(userId: string): string {
  return `tmrw-onboarding-${userId}`;
}

export function isAthleteOnboardingComplete(
  profile: { onboarding_complete?: boolean | null; postcode?: string | null; sport?: string | null; stripe_connect_id?: string | null } | null,
  userId: string
): boolean {
  if (typeof window !== 'undefined' && window.localStorage.getItem(onboardingStorageKey(userId)) === 'complete') {
    return true;
  }
  if (!profile) return false;
  if (profile.onboarding_complete === true) return true;
  return Boolean(profile.postcode && profile.sport && profile.stripe_connect_id);
}
