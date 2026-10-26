// Per-flip numbers a trader reads: ROI, hold time, GP per hour held.

import type { Flip } from './journal.ts'

const HOUR_MS = 3_600_000
/** Holds shorter than this count as this long, so GP/h can't explode on a 10-second flip. */
export const MIN_HOLD_HOURS = 5 / 60

/** What the flip cost to buy, or null when the buy price isn't known. */
export function flipCost (flip: Flip): number | null {
  return flip.buyPrice === null ? null : flip.buyPrice * flip.qty
}

/** Profit as a share of what you paid, e.g. 0.05 for 5%. */
export function flipRoi (flip: Flip): number | null {
  const cost = flipCost(flip)
  return cost ? flip.profit / cost : null
}

/** Hours from buy to sell, or null when the buy time isn't known. */
export function holdHours (flip: Flip): number | null {
  if (flip.boughtAt === null) return null
  return Math.max(0, flip.soldAt - flip.boughtAt) / HOUR_MS
}

/** Realized GP per hour the money was tied up. */
export function gpPerHour (flip: Flip): number | null {
  const hours = holdHours(flip)
  return hours === null ? null : flip.profit / Math.max(hours, MIN_HOLD_HOURS)
}
