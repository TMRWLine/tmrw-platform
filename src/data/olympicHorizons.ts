export interface OlympicHorizonSpec {
  id: '1yr' | '2yr' | '4yr';
  tierId: string;
  numeral: '01' | '02' | '03';
  horizonTag: string;
  label: string;
  priceAud: number;
  priceFormatted: string;
  annualRate: string;
  athleteNet: number;
  clubNet: number;
  opsNet: number;
  exclusivitySummary: string;
  txId: string;
}

export const OLYMPIC_HORIZONS: readonly OlympicHorizonSpec[] = [
  {
    id: '1yr',
    tierId: 'olympic_1yr_50k',
    numeral: '01',
    horizonTag: '1-Year LA28 Qualifier',
    label: 'LA 2028 Qualifier Partnership',
    priceAud: 50000,
    priceFormatted: 'A$50,000',
    annualRate: '1 Athlete · 12-Month Category Lock',
    athleteNet: 35000,
    clubNet: 7500,
    opsNet: 7500,
    exclusivitySummary:
      '1-Year exclusive category rights (strictly one brand per industry sector) on a marquee contender + 60-day First Right of Refusal to extend into Brisbane 2032.',
    txId: 'TX-2026-OLYMPIC-1YR-050K',
  },
  {
    id: '2yr',
    tierId: 'olympic_2yr_110k',
    numeral: '02',
    label: 'LA 2028 Games Partnership',
    horizonTag: '2-Year LA28 Games Lock',
    priceAud: 110000,
    priceFormatted: 'A$110,000',
    annualRate: '1 Athlete · 24-Month Category Lock',
    athleteNet: 77000,
    clubNet: 16500,
    opsNet: 16500,
    exclusivitySummary:
      'Explore a partnership through the LA 2028 Games window. Discuss campaign permissions, paid social and renewal terms before committing.',
    txId: 'TX-2026-OLYMPIC-2YR-110K',
  },
  {
    id: '4yr',
    tierId: 'olympic_4yr_250k',
    numeral: '03',
    label: 'Brisbane 2032 Home Games Quadrennial',
    horizonTag: '4-Year Brisbane 32 Lock',
    priceAud: 250000,
    priceFormatted: 'A$250,000',
    annualRate: '1 Athlete · 48-Month Quadrennial Lock',
    athleteNet: 175000,
    clubNet: 37500,
    opsNet: 37500,
    exclusivitySummary:
      'Explore a longer partnership across Australia and New Zealand into the Brisbane 2032 Games. Any exclusivity, invoicing and tax treatment need separate review.',
    txId: 'TX-2026-OLYMPIC-4YR-250K',
  },
] as const;
