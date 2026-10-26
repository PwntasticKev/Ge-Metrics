// Price moves for every liquid item from four bulk snapshots: the last hour,
// the same hour yesterday, the same hour a week ago, and the last 24 hours.
// Shared by market breadth and the trend / reversion screens. Ported from
// mobile/src/lib/marketMoves.ts and scanMath.ts.

import type { AveragePrice, IdMap } from '../../wiki/types.js'
import { tradesOf } from './thinSpikes.js'

/** Items trading less than this a day (about ten an hour) are too thin to read. */
export const LIQUID_DAY_TRADES = 240
/** Each side must carry at least this share of a window's trades for its mid to count. */
export const MIN_SIDE_SHARE = 0.05

export interface Snapshots {
  readonly hour: IdMap<AveragePrice>
  readonly hourDayAgo: IdMap<AveragePrice> | undefined
  readonly hourWeekAgo: IdMap<AveragePrice> | undefined
  readonly day: IdMap<AveragePrice>
}

export interface Move {
  readonly id: number
  /** Mid of the last hour's average buy and sell prices. */
  readonly now: number
  readonly change24h: number | null
  readonly change7d: number | null
  readonly dayTrades: number
  /** Items traded in 24h x the day's mid price. */
  readonly valueTraded: number
}

export function midOf (a: AveragePrice | undefined | null): number | null {
  if (!a || !a.avgHighPrice || !a.avgLowPrice) return null
  return (a.avgHighPrice + a.avgLowPrice) / 2
}

/**
 * Mid price only when both sides traded in proportion: an hour of 2,000
 * instant-buys and 9 lowball sells has a meaningless average low.
 */
export function balancedMid (a: AveragePrice | undefined | null, minShare = MIN_SIDE_SHARE): number | null {
  if (!a) return null
  const floor = Math.max(1, tradesOf(a) * minShare)
  if (a.highPriceVolume < floor || a.lowPriceVolume < floor) return null
  return midOf(a)
}

export const changeRatio = (from: number | null, to: number | null): number | null => (from && to ? to / from - 1 : null)

/** The item's move, or null when it isn't liquid or didn't trade both sides this hour. */
export function moveFor (id: number, s: Snapshots): Move | null {
  const day = s.day.get(id)
  if (!day || tradesOf(day) < LIQUID_DAY_TRADES) return null
  const now = balancedMid(s.hour.get(id))
  const dayMid = midOf(day)
  if (now === null || dayMid === null) return null
  return {
    id,
    now,
    change24h: changeRatio(balancedMid(s.hourDayAgo?.get(id)), now),
    change7d: changeRatio(balancedMid(s.hourWeekAgo?.get(id)), now),
    dayTrades: tradesOf(day),
    valueTraded: tradesOf(day) * dayMid
  }
}

export function liquidMoves (ids: Iterable<number>, s: Snapshots): Move[] {
  return [...ids].map(id => moveFor(id, s)).filter((m): m is Move => m !== null)
}

/** Unix seconds of the hour /1h reports now (the last full hour), shifted back. */
export function hourStartAgo (nowSec: number, hoursAgo: number): number {
  const lastFullHour = Math.floor(nowSec / 3600) * 3600 - 3600
  return lastFullHour - hoursAgo * 3600
}
