import type { SlotRate } from './analytics/fillTime.ts'
import type { RealisticOffer } from './offer.ts'

export type PickSort = 'profit' | 'rate'

/**
 * GP per hour per GE slot for each pick: the fill times of its canonical
 * offer (lib/offer), already sized to what fills, so the rate matches the
 * item sheet's.
 */
export function pickRates (picks: readonly { id: number; offer: RealisticOffer }[]): Map<number, SlotRate> {
  const rates = new Map<number, SlotRate>()
  for (const pick of picks) {
    if (pick.offer.rate) rates.set(pick.id, pick.offer.rate)
  }
  return rates
}

/** Fastest earners first; picks without a rate go last in their old order. */
export function sortByRate<T extends { id: number }> (picks: readonly T[], rates: ReadonlyMap<number, SlotRate>): T[] {
  return [...picks].sort((a, b) => (rates.get(b.id)?.gpPerHour ?? -1) - (rates.get(a.id)?.gpPerHour ?? -1))
}
