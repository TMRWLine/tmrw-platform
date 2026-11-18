import { mockDeliverables, toCommercialAthlete, type CommercialAthlete } from '../../data/mockDeliverables';
import { OLYMPIC_CONTENDERS } from '../../data/olympicContenders';
import { OLYMPIC_HORIZONS } from '../../data/olympicHorizons';
import { ROSTER_DATA } from '../../data/roster';

export type ReceiptAthlete = Pick<CommercialAthlete, 'id' | 'full_name' | 'display_name' | 'sport' | 'grassroots_club'>;

export function resolveReceiptAthlete(athleteId: string | null, tierId: string | null): ReceiptAthlete {
  if (OLYMPIC_HORIZONS.some((horizon) => horizon.tierId === tierId)) {
    const contender = Object.values(OLYMPIC_CONTENDERS).find((entry) => entry.athleteId === athleteId);
    if (contender) {
      return {
        id: contender.athleteId,
        full_name: contender.fullName,
        display_name: `${contender.firstInitial} ${contender.surname}`,
        sport: contender.sport,
        grassroots_club: { name: contender.clubName, suburb: '', state: '' },
      };
    }
  }

  if (athleteId && athleteId === mockDeliverables.athlete.id) {
    return mockDeliverables.athlete;
  }
  const roster = athleteId ? ROSTER_DATA.find((entry) => entry.id === athleteId) : undefined;
  if (roster) return toCommercialAthlete(roster.record);
  return mockDeliverables.athlete;
}
