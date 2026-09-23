export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Landmark extends GeoPoint {
  name: string;
}

export interface PlottedLandmark {
  name: string;
  /** East offset from origin in km. */
  xKm: number;
  /** North offset from origin in km. */
  yKm: number;
  distanceKm: number;
}

const LANDMARKS: Landmark[] = [
  { name: 'Sydney CBD', lat: -33.8688, lng: 151.2093 },
  { name: 'North Sydney', lat: -33.839, lng: 151.207 },
  { name: 'Bondi Beach', lat: -33.8908, lng: 151.2743 },
  { name: 'Manly', lat: -33.7969, lng: 151.284 },
  { name: 'Randwick', lat: -33.914, lng: 151.241 },
  { name: 'Marrickville', lat: -33.911, lng: 151.155 },
  { name: 'Chatswood', lat: -33.796, lng: 151.183 },
  { name: 'Olympic Park', lat: -33.8474, lng: 151.0694 },
  { name: 'Parramatta', lat: -33.815, lng: 151.0011 },
  { name: 'Mosman', lat: -33.829, lng: 151.244 },
  { name: 'Newcastle CBD', lat: -32.9283, lng: 151.7817 },
  { name: 'Merewether', lat: -32.948, lng: 151.753 },
  { name: 'Wollongong CBD', lat: -34.4278, lng: 150.8931 },
  { name: 'Canberra CBD', lat: -35.2809, lng: 149.13 },
  { name: 'Belconnen', lat: -35.238, lng: 149.066 },
  { name: 'Melbourne CBD', lat: -37.8136, lng: 144.9631 },
  { name: 'St Kilda', lat: -37.8676, lng: 144.9809 },
  { name: 'Richmond', lat: -37.823, lng: 144.998 },
  { name: 'Fitzroy', lat: -37.798, lng: 144.978 },
  { name: 'Footscray', lat: -37.8, lng: 144.9 },
  { name: 'Brunswick', lat: -37.767, lng: 144.962 },
  { name: 'Box Hill', lat: -37.819, lng: 145.122 },
  { name: 'Brisbane CBD', lat: -27.4698, lng: 153.0251 },
  { name: 'Fortitude Valley', lat: -27.457, lng: 153.034 },
  { name: 'Chermside', lat: -27.385, lng: 153.031 },
  { name: 'Indooroopilly', lat: -27.499, lng: 152.973 },
  { name: 'Carindale', lat: -27.504, lng: 153.101 },
  { name: 'Adelaide CBD', lat: -34.9285, lng: 138.6007 },
  { name: 'Glenelg', lat: -34.98, lng: 138.515 },
  { name: 'Perth CBD', lat: -31.9505, lng: 115.8605 },
  { name: 'Subiaco', lat: -31.949, lng: 115.826 },
  { name: 'Scarborough', lat: -31.894, lng: 115.757 },
];

const CITY_CENTRES: Record<string, GeoPoint> = {
  sydney: { lat: -33.8688, lng: 151.2093 },
  newcastle: { lat: -32.9283, lng: 151.7817 },
  wollongong: { lat: -34.4278, lng: 150.8931 },
  canberra: { lat: -35.2809, lng: 149.13 },
  melbourne: { lat: -37.8136, lng: 144.9631 },
  brisbane: { lat: -27.4698, lng: 153.0251 },
  adelaide: { lat: -34.9285, lng: 138.6007 },
  perth: { lat: -31.9505, lng: 115.8605 },
};

/** Coarse city-centre fallback when an athlete has no stored coordinates. */
export function originForPostcode(postcode: string | null | undefined): GeoPoint {
  const n = Number(postcode);
  if (!Number.isFinite(n)) return CITY_CENTRES.sydney;
  if (n >= 2600 && n <= 2620) return CITY_CENTRES.canberra;
  if (n >= 2280 && n <= 2330) return CITY_CENTRES.newcastle;
  if (n >= 2500 && n <= 2530) return CITY_CENTRES.wollongong;
  if (n >= 3000 && n < 4000) return CITY_CENTRES.melbourne;
  if (n >= 4000 && n < 5000) return CITY_CENTRES.brisbane;
  if (n >= 5000 && n < 6000) return CITY_CENTRES.adelaide;
  if (n >= 6000 && n < 7000) return CITY_CENTRES.perth;
  return CITY_CENTRES.sydney;
}

export function landmarksWithin(origin: GeoPoint, radiusKm: number, limit = 6): PlottedLandmark[] {
  const kmPerLng = 111.32 * Math.cos((origin.lat * Math.PI) / 180);
  return LANDMARKS.map((l) => {
    const xKm = (l.lng - origin.lng) * kmPerLng;
    const yKm = (l.lat - origin.lat) * 110.57;
    return { name: l.name, xKm, yKm, distanceKm: Math.hypot(xKm, yKm) };
  })
    .filter((l) => l.distanceKm >= 0.8 && l.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}
