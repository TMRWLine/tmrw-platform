/** Safe name helpers — never throw if athlete/campaign strings are missing. */

export function nameParts(name?: string | null): string[] {
  return (name ?? '').split(' ').filter(Boolean);
}

export function athleteInitials(name?: string | null): string {
  const parts = nameParts(name);
  if (parts.length === 0) return '?';
  return parts
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function firstName(name?: string | null, fallback = 'Athlete'): string {
  return nameParts(name)[0] ?? fallback;
}

export function lastName(name?: string | null, fallback = 'Athlete'): string {
  const parts = nameParts(name);
  return parts[parts.length - 1] ?? fallback;
}

export function displayName(name?: string | null, fallback = 'Athlete'): string {
  const trimmed = name?.trim();
  return trimmed ? trimmed : fallback;
}

export function athleteDisplayName(
  athlete?: { name?: string | null; full_name?: string | null; initials?: string | null } | null,
  fallback = 'Athlete'
): string {
  return displayName(athlete?.name ?? athlete?.full_name ?? athlete?.initials, fallback);
}
