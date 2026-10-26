// Market breadth and a GE index, to read whether the market is risk-on or
// risk-off (say, the day after an update). Pure.
import type { Move } from './marketMoves.ts'

/** Moves smaller than this count as flat. */
export const FLAT_BAND = 0.01
/** The index holds the most traded items by value. */
export const INDEX_SIZE = 100
/** An index move this big, with breadth agreeing, sets the mood. */
export const MOOD_INDEX_MOVE = 0.005
export const MOVERS_SHOWN = 3

export type Mood = 'risk-on' | 'risk-off' | 'mixed'

export interface Breadth {
  /** Liquid items with a 24h change. */
  counted: number
  up: number
  down: number
  flat: number
  /** Value-weighted 24h and 7d change of the index items (weights: 24h value traded). */
  index24h: number | null
  index7d: number | null
  indexSize: number
  /** Index items that moved most over 24h. */
  gainers: Move[]
  losers: Move[]
  mood: Mood
}

/** Weighted average change; null when no item has one. */
export function weightedChange (moves: readonly Move[], changeOf: (m: Move) => number | null): number | null {
  let weight = 0
  let sum = 0
  for (const m of moves) {
    const c = changeOf(m)
    if (c === null) continue
    weight += m.valueTraded
    sum += m.valueTraded * c
  }
  return weight > 0 ? sum / weight : null
}

export function moodOf (index24h: number | null, up: number, down: number): Mood {
  if (index24h === null) return 'mixed'
  if (index24h >= MOOD_INDEX_MOVE && up > down) return 'risk-on'
  if (index24h <= -MOOD_INDEX_MOVE && down > up) return 'risk-off'
  return 'mixed'
}

export function marketBreadth (moves: readonly Move[]): Breadth {
  const withDay = moves.filter(m => m.change24h !== null)
  const up = withDay.filter(m => (m.change24h ?? 0) > FLAT_BAND).length
  const down = withDay.filter(m => (m.change24h ?? 0) < -FLAT_BAND).length
  const basket = [...moves].sort((a, b) => b.valueTraded - a.valueTraded).slice(0, INDEX_SIZE)
  const index24h = weightedChange(basket, m => m.change24h)
  const ranked = basket
    .filter(m => m.change24h !== null)
    .sort((a, b) => (b.change24h ?? 0) - (a.change24h ?? 0))
  return {
    counted: withDay.length,
    up,
    down,
    flat: withDay.length - up - down,
    index24h,
    index7d: weightedChange(basket, m => m.change7d),
    indexSize: basket.length,
    gainers: ranked.filter(m => (m.change24h ?? 0) > 0).slice(0, MOVERS_SHOWN),
    losers: ranked.filter(m => (m.change24h ?? 0) < 0).reverse().slice(0, MOVERS_SHOWN),
    mood: moodOf(index24h, up, down)
  }
}
