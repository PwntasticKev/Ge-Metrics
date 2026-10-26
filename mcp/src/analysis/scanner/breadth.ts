// Market breadth and a value-weighted GE index, to read whether the market is
// risk-on or risk-off. Ported from mobile/src/lib/breadth.ts.

import type { Move } from './marketMoves.js'

/** Moves smaller than this count as flat. */
export const FLAT_BAND = 0.01
/** The index holds the most traded items by value. */
export const INDEX_SIZE = 100
/** An index move this big, with breadth agreeing, sets the mood. */
export const MOOD_INDEX_MOVE = 0.005
export const MOVERS_SHOWN = 5

export type Mood = 'risk-on' | 'risk-off' | 'mixed'

export interface Breadth {
  readonly counted: number
  readonly up: number
  readonly down: number
  readonly flat: number
  /** Value-weighted 24h and 7d change of the index items (weights: 24h value traded). */
  readonly index24h: number | null
  readonly index7d: number | null
  readonly indexSize: number
  readonly gainers: readonly Move[]
  readonly losers: readonly Move[]
  readonly mood: Mood
}

export function weightedChange (moves: readonly Move[], changeOf: (m: Move) => number | null): number | null {
  const weighted = moves.flatMap(m => {
    const c = changeOf(m)
    return c === null ? [] : [{ w: m.valueTraded, c }]
  })
  const weight = weighted.reduce((s, x) => s + x.w, 0)
  return weight > 0 ? weighted.reduce((s, x) => s + x.w * x.c, 0) / weight : null
}

export function moodOf (index24h: number | null, up: number, down: number): Mood {
  if (index24h === null) return 'mixed'
  if (index24h >= MOOD_INDEX_MOVE && up > down) return 'risk-on'
  if (index24h <= -MOOD_INDEX_MOVE && down > up) return 'risk-off'
  return 'mixed'
}

export function marketBreadth (moves: readonly Move[], moversShown = MOVERS_SHOWN): Breadth {
  const withDay = moves.filter(m => m.change24h !== null)
  const up = withDay.filter(m => (m.change24h ?? 0) > FLAT_BAND).length
  const down = withDay.filter(m => (m.change24h ?? 0) < -FLAT_BAND).length
  const basket = [...moves].sort((a, b) => b.valueTraded - a.valueTraded).slice(0, INDEX_SIZE)
  const index24h = weightedChange(basket, m => m.change24h)
  const ranked = basket.filter(m => m.change24h !== null).sort((a, b) => (b.change24h ?? 0) - (a.change24h ?? 0))
  return {
    counted: withDay.length,
    up,
    down,
    flat: withDay.length - up - down,
    index24h,
    index7d: weightedChange(basket, m => m.change7d),
    indexSize: basket.length,
    gainers: ranked.filter(m => (m.change24h ?? 0) > 0).slice(0, moversShown),
    losers: ranked.filter(m => (m.change24h ?? 0) < 0).reverse().slice(0, moversShown),
    mood: moodOf(index24h, up, down)
  }
}
