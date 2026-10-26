// Market regime at a decision time, with the market_breadth tool's own logic
// (analysis/scanner/breadth.ts): the last closed hour vs the same hour a day
// and a week earlier, 24h value-weighted index of the 100 most traded items,
// and up/down counts. Only closed windows are read (guardHistory).

import { type Mood, marketBreadth } from '../../analysis/scanner/breadth.js'
import { liquidMoves } from '../../analysis/scanner/marketMoves.js'
import type { MappingEntry } from '../../wiki/types.js'
import { HOUR_SEC, type History } from '../history.js'
import { DAY_HOURS, guardHistory, mergeSnapshots } from '../view.js'

const WEEK_HOURS = 168
/** Hours of 1h history before a decision the regime read needs. */
export const REGIME_LOOKBACK_HOURS = WEEK_HOURS + 1

export function moodAt (history: History, t: number, mapping: readonly MappingEntry[]): Mood {
  const h = guardHistory(history, t)
  const last = t - HOUR_SEC
  const day = mergeSnapshots(Array.from({ length: DAY_HOURS }, (_, i) => h.hour(t - (i + 1) * HOUR_SEC)))
  const moves = liquidMoves(mapping.map(m => m.id), {
    hour: h.hour(last),
    hourDayAgo: h.hour(last - DAY_HOURS * HOUR_SEC),
    hourWeekAgo: h.hour(last - WEEK_HOURS * HOUR_SEC),
    day
  })
  return marketBreadth(moves).mood
}

export const moodsAt = (history: History, times: readonly number[], mapping: readonly MappingEntry[]): ReadonlyMap<number, Mood> =>
  new Map(times.map(t => [t, moodAt(history, t, mapping)]))
