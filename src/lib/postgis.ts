/** Encode a WGS84 point as little-endian EWKB (SRID 4326) hex. */
export function ewkbPointHex(lng: number, lat: number): string {
  const buf = new ArrayBuffer(25);
  const view = new DataView(buf);
  view.setUint8(0, 1);
  view.setUint32(1, 0x20000001, true);
  view.setUint32(5, 4326, true);
  view.setFloat64(9, lng, true);
  view.setFloat64(17, lat, true);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

function isHexString(value: string): boolean {
  const s = value.trim();
  return s.length >= 16 && /^[0-9a-fA-F]+$/.test(s);
}

/**
 * Display string for athlete.location — PostGIS EWKB hex when the column is a
 * geography/geometry payload, otherwise the raw location text.
 */
export function formatLocationHex(
  location: unknown,
  lat?: number | null,
  lng?: number | null
): string | null {
  if (typeof location === 'string') {
    const trimmed = location.trim();
    if (!trimmed) return null;
    return isHexString(trimmed) ? trimmed.toUpperCase() : trimmed;
  }

  if (location && typeof location === 'object') {
    const coords = (location as { coordinates?: unknown }).coordinates;
    if (Array.isArray(coords) && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      return ewkbPointHex(coords[0], coords[1]);
    }
  }

  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    return ewkbPointHex(lng, lat);
  }

  return null;
}

/** Parse a PostGIS EWKB hex point (or GeoJSON) into WGS84 lng/lat. */
export function parseEwkbPoint(location: unknown): { lng: number; lat: number } | null {
  if (location && typeof location === 'object') {
    const coords = (location as { coordinates?: unknown }).coordinates;
    if (Array.isArray(coords) && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      return { lng: coords[0], lat: coords[1] };
    }
    return null;
  }
  if (typeof location !== 'string') return null;
  const hex = location.trim();
  if (hex.length < 50 || !/^[0-9a-fA-F]+$/.test(hex)) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  const view = new DataView(bytes.buffer);
  const le = view.getUint8(0) === 1;
  const lng = view.getFloat64(9, le);
  const lat = view.getFloat64(17, le);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lng, lat };
}
