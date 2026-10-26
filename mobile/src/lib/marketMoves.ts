// Price moves for every liquid item from four bulk snapshots: the last hour,
// the same hour yesterday, the same hour a week ago, and the last 24 hours.
// Shared by market breadth and the trend / reversion screens. Pure.
import { balancedMid, changeRatio, midOf, tradesOf, type Averages } from './scanMath.ts'

/** Items trading less than this a day (about ten an hour) are too thin to read. */
export const LIQUID_DAY_TRADES = 240

export interface Snapshots {
  /** /1h now. */
  hour: Averages
  /** /1h for the same hour 24 hours earlier. */
  hourDayAgo: Averages | undefined
  /** /1h for the same hour 7 days earlier. */
  hourWeekAgo: Averages | undefined
  /** /24h now (volumes and value traded). */
  day: Averages
}

export interface Move {
  id: number
  /** Mid of the last hour's average buy and sell prices (both sides 5%+ of its trades). */
  now: number
  change24h: number | null
  change7d: number | null
  dayTrades: number
  /** Items traded in 24h × the day's mid price. */
  valueTraded: number
}

/** The item's move, or null when it isn't liquid or didn't trade both sides this hour. */
export function moveFor (id: number, s: Snapshots): Move | null {
  const key = String(id)
  const day = s.day[key]
  if (!day || tradesOf(day) < LIQUID_DAY_TRADES) return null
  const now = balancedMid(s.hour[key])
  const dayMid = midOf(day)
  if (now === null || dayMid === null) return null
  return {
    id,
    now,
    change24h: changeRatio(balancedMid(s.hourDayAgo?.[key]), now),
    change7d: changeRatio(balancedMid(s.hourWeekAgo?.[key]), now),
    dayTrades: tradesOf(day),
    valueTraded: tradesOf(day) * dayMid
  }
}

export function liquidMoves (ids: Iterable<number>, s: Snapshots): Move[] {
  const moves: Move[] = []
  for (const id of ids) {
    const m = moveFor(id, s)
    if (m) moves.push(m)
  }
  return moves
}

/** Unix seconds of the hour /1h reports now (the last full hour), shifted back. */
export function hourStartAgo (nowMs: number, hoursAgo: number): number {
  const lastFullHour = Math.floor(nowMs / 3_600_000) * 3600 - 3600
  return lastFullHour - hoursAgo * 3600
}
