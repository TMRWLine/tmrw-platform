import type { MatchedSponsor } from '../types';

// Bundled demo records mirror the Australasian sponsor seed migration.
export const DEMO_SPONSORS: readonly MatchedSponsor[] = [
  ['City Auto Group', 'Automotive', 50000, 15000, '2020', -33.9333, 151.1320, 'AUD'],
  ['Harbour Fitness', 'Health & Wellness', 25000, 10000, '2095', -33.8000, 151.2667, 'AUD'],
  ['North Shore Sports Gear', 'Sporting Goods', 40000, 20000, '2088', -33.8148, 151.1789, 'AUD'],
  ['Manly Brewhouse', 'Food & Beverage', 35000, 12000, '2095', -33.7974, 151.2894, 'AUD'],
  ['Kiwi Apparel Co', 'Apparel & Fashion', 60000, 25000, '1010', -36.8485, 174.7633, 'NZD'],
  ['Auckland Performance Coaching', 'Training & Coaching', 30000, 18000, '1023', -36.8520, 174.7380, 'NZD'],
].map((row, index) => ({
  id: `demo-sponsor-${index + 1}`,
  business_name: String(row[0]), merchant_category: String(row[1]),
  budget_allocation: Number(row[2]), target_radius_meters: Number(row[3]),
  postcode: String(row[4]), latitude: Number(row[5]), longitude: Number(row[6]),
  lat: Number(row[5]), lng: Number(row[6]), currency: String(row[7]),
  contact_email: null, location: null, created_at: '', updated_at: '',
  distance_meters: 0, distance_km: 0,
}));
