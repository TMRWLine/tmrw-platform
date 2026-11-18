import { getCommercialPackage, mockDeliverables, type CommercialPackage } from '../../data/mockDeliverables';
import { OLYMPIC_HORIZONS } from '../../data/olympicHorizons';

export type ReceiptPackage = Pick<CommercialPackage, 'tier_id' | 'name' | 'price_aud' | 'price_display' | 'split_breakdown'>;

export function resolveReceiptPackage(tierId: string | null): ReceiptPackage {
  const olympic = OLYMPIC_HORIZONS.find((horizon) => horizon.tierId === tierId);
  if (!olympic) return getCommercialPackage(tierId) ?? mockDeliverables.packages[0];

  return {
    tier_id: olympic.tierId,
    name: olympic.label,
    price_aud: olympic.priceAud,
    price_display: olympic.priceFormatted,
    split_breakdown: {
      athlete_amount: olympic.athleteNet,
      athlete_percent: 70,
      club_amount: olympic.clubNet,
      club_percent: 15,
      platform_amount: olympic.opsNet,
      platform_percent: 15,
    },
  };
}
