export function haversineMeters(
  lat1: number | null, lng1: number | null,
  lat2: number | null, lng2: number | null,
): number {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null ||
      ![lat1, lng1, lat2, lng2].every(Number.isFinite) ||
      Math.abs(lat1) > 90 || Math.abs(lat2) > 90 || Math.abs(lng1) > 180 || Math.abs(lng2) > 180) return Infinity;
  const radians = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * radians / 2) ** 2 +
    Math.cos(lat1 * radians) * Math.cos(lat2 * radians) *
    Math.sin((lng2 - lng1) * radians / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}

export async function withTimeout<T>(request: PromiseLike<T>, ms = 8000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(request),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Request timed out')), ms); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
