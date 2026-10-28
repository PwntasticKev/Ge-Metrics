// Realized volatility of the market_breadth index (value-weighted top 100
// items) from hourly snapshots, and how it compares with its trailing median.
// Pure; callers pass hourly snapshots oldest first.

import { balancedMid } from '../scanner/marketMoves.js'
import type { AveragePrice, IdMap } from '../../wiki/types.js'

/** Hours in each realized-volatility window. */
export const VOL_WINDOW_HOURS = 24
/** The trailing median uses windows ending every VOL_STEP_HOURS over VOL_TRAILING_HOURS. */
export const VOL_STEP_HOURS = 4
export const VOL_TRAILING_HOURS = 168
/** Hours of hourly data the ratio needs. */
export const VOL_LOOKBACK_HOURS = VOL_WINDOW_HOURS + VOL_TRAILING_HOURS + 1
/** An hour's index return needs this share of the basket's weight priced in both hours. */
export const MIN_COVERAGE = 0.5

export interface VolReading {
  readonly vol24h: number | null
  readonly volMedian: number | null
  readonly ratio: number | null
}

/**
 * Hourly log returns of the weighted basket: entry i is the move from hour i
 * to hour i+1 (null when too little of the basket traded both sides in both).
 */
export function indexReturns (hours: readonly IdMap<AveragePrice>[], weights: ReadonlyMap<number, number>): (number | null)[] {
  const total = [...weights.values()].reduce((s, w) => s + w, 0)
  if (total <= 0) return hours.slice(1).map(() => null)
  return hours.slice(1).map((snap, i) => {
    const prev = hours[i] as IdMap<AveragePrice>
    let w = 0
    let sum = 0
    for (const [id, weight] of weights) {
      const a = balancedMid(prev.get(id))
      const b = balancedMid(snap.get(id))
      if (a === null || b === null) continue
      w += weight
      sum += weight * Math.log(b / a)
    }
    return w / total >= MIN_COVERAGE ? sum / w : null
  })
}

/** Sample standard deviation of the non-null values (null under 2/3 coverage). */
export function realizedVol (returns: readonly (number | null)[]): number | null {
  const xs = returns.filter((x): x is number => x !== null)
  if (xs.length < 2 || xs.length < returns.length * (2 / 3)) return null
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length
  return Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / (xs.length - 1))
}

export function median (xs: readonly number[]): number | null {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? (s[mid] as number) : ((s[mid - 1] as number) + (s[mid] as number)) / 2
}

/** Last-24h volatility vs the median of the 24h volatilities ending 4h, 8h, ... 168h earlier. */
export function volReading (returns: readonly (number | null)[]): VolReading {
  const n = returns.length
  const windowEnding = (end: number) => (end - VOL_WINDOW_HOURS >= 0 ? realizedVol(returns.slice(end - VOL_WINDOW_HOURS, end)) : null)
  const vol24h = windowEnding(n)
  const past: number[] = []
  for (let back = VOL_STEP_HOURS; back <= VOL_TRAILING_HOURS; back += VOL_STEP_HOURS) {
    const v = windowEnding(n - back)
    if (v !== null) past.push(v)
  }
  const volMedian = past.length >= VOL_TRAILING_HOURS / VOL_STEP_HOURS / 2 ? median(past) : null
  return { vol24h, volMedian, ratio: vol24h !== null && volMedian ? vol24h / volMedian : null }
}
