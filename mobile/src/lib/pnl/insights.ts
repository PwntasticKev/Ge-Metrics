// Things a trader acts on: items that lose money on average, holding past
// the buy-limit window, tax paid, and what open lots are worth right now.

import type { Flip, ItemTaxOf, Lot } from './journal.ts'
import { holdHours } from './metrics.ts'
import { itemLeaderboard, type ItemRecord } from './summary.ts'

/** Flips of one item before its average is trusted as a pattern. */
export const MIN_FLIPS_FOR_EXPECTANCY = 2
/** GE buy limits reset 4 hours after the first buy. */
export const LIMIT_WINDOW_HOURS = 4

/** Items whose average flip loses money, worst total first. */
export function losingItems (flips: readonly Flip[], minFlips = MIN_FLIPS_FOR_EXPECTANCY): ItemRecord[] {
  return itemLeaderboard(flips)
    .filter(r => r.flips >= minFlips && r.avgProfit < 0)
    .sort((a, b) => a.profit - b.profit)
}

export interface HoldSummary {
  /** Average hold over flips with a known buy time. */
  avgHours: number | null
  medianHours: number | null
  /** Share of those flips held longer than one buy-limit window. */
  overWindowShare: number | null
  /** Profit per flip for holds inside vs past the window. */
  avgProfitInside: number | null
  avgProfitOver: number | null
  counted: number
}

const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null)

function median (xs: readonly number[]): number | null {
  if (!xs.length) return null
  const sorted = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** How long you hold compared with the 4h buy-limit window. */
export function holdVsLimit (flips: readonly Flip[], windowHours = LIMIT_WINDOW_HOURS): HoldSummary {
  const timed = flips.flatMap(f => {
    const hours = holdHours(f)
    return hours === null ? [] : [{ hours, profit: f.profit }]
  })
  const hours = timed.map(t => t.hours)
  const over = timed.filter(t => t.hours > windowHours)
  const inside = timed.filter(t => t.hours <= windowHours)
  return {
    avgHours: mean(hours),
    medianHours: median(hours),
    overWindowShare: timed.length ? over.length / timed.length : null,
    avgProfitInside: mean(inside.map(t => t.profit)),
    avgProfitOver: mean(over.map(t => t.profit)),
    counted: timed.length
  }
}

export interface Unrealized {
  /** Profit after tax if every priced lot were instant-sold now. */
  profit: number
  /** What the priced lots cost. */
  cost: number
  /** Value after tax at the instant-sell price. */
  value: number
  priced: number
  /** Lots with no live price; left out of the totals. */
  unpriced: number
}

/**
 * Open lots marked at the instant-sell price (what buy offers pay now),
 * after GE tax. `priceOf` returns null when there's no live price.
 */
export function unrealized (lots: readonly Lot[], priceOf: (itemId: number) => number | null, taxOf: ItemTaxOf): Unrealized {
  let cost = 0
  let value = 0
  let priced = 0
  for (const lot of lots) {
    const price = priceOf(lot.itemId)
    if (price === null || !Number.isFinite(price) || price <= 0) continue
    cost += lot.buyPrice * lot.qty
    value += (price - taxOf(price, lot.itemId)) * lot.qty
    priced++
  }
  return { profit: value - cost, cost, value, priced, unpriced: lots.length - priced }
}
