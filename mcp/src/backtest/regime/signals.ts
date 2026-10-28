// Regime signals at a decision time, rebuilt from closed /1h windows only
// (every read goes through guardHistory, which throws on lookahead):
// market_breadth's mood and index changes, and the index's realized
// volatility vs its trailing median. The update schedule and the strategy's
// own closed trades are attached by the caller.

import { INDEX_SIZE, marketBreadth } from '../../analysis/scanner/breadth.js'
import { liquidMoves } from '../../analysis/scanner/marketMoves.js'
import type { ClosedTrade, RegimeSignals, ScheduledUpdate } from '../../analysis/regime/gates.js'
import { VOL_LOOKBACK_HOURS, indexReturns, volReading } from '../../analysis/regime/volatility.js'
import type { MappingEntry } from '../../wiki/types.js'
import { HOUR_SEC, type History } from '../history.js'
import type { Trade } from '../position.js'
import { DAY_HOURS, guardHistory, mergeSnapshots } from '../view.js'

const WEEK_HOURS = 168

/** Hours of 1h history before a decision the signals read. */
export const SIGNAL_LOOKBACK_HOURS = Math.max(WEEK_HOURS + 1, VOL_LOOKBACK_HOURS)

export function marketSignalsAt (history: History, t: number, mapping: readonly MappingEntry[], updates: readonly ScheduledUpdate[]): RegimeSignals {
  const h = guardHistory(history, t)
  const last = t - HOUR_SEC
  const day = mergeSnapshots(Array.from({ length: DAY_HOURS }, (_, i) => h.hour(t - (i + 1) * HOUR_SEC)))
  const moves = liquidMoves(mapping.map(m => m.id), {
    hour: h.hour(last),
    hourDayAgo: h.hour(last - DAY_HOURS * HOUR_SEC),
    hourWeekAgo: h.hour(last - WEEK_HOURS * HOUR_SEC),
    day
  })
  const breadth = marketBreadth(moves, 0)
  const basket = [...moves].sort((a, b) => b.valueTraded - a.valueTraded).slice(0, INDEX_SIZE)
  const weights = new Map(basket.map(m => [m.id, m.valueTraded]))
  const hours = Array.from({ length: VOL_LOOKBACK_HOURS }, (_, i) => h.hour(t - (VOL_LOOKBACK_HOURS - i) * HOUR_SEC))
  const vol = volReading(indexReturns(hours, weights))
  return {
    t,
    mood: breadth.counted > 0 ? breadth.mood : null,
    index24h: breadth.index24h,
    index7d: breadth.index7d,
    vol24h: vol.vol24h,
    volMedian: vol.volMedian,
    volRatio: vol.ratio,
    updates
  }
}

const alignUp = (ts: number) => Math.ceil(ts / HOUR_SEC) * HOUR_SEC

/**
 * A run's trades as the equity-curve rules see them: only trades that bought
 * something, dated by the end of the hour they closed in (when the result was
 * known). Rules filter knownAt <= t, so later trades are never read early.
 */
export const closedTrades = (trades: readonly Trade[]): ClosedTrade[] =>
  trades.filter(x => x.bought > 0).map(x => ({ knownAt: alignUp(x.closedAt), profit: x.profit }))
