// Synthetic price histories for the trader analytics. Deterministic, no network.

import type { AveragePrice, TimeseriesPoint } from '../../src/wiki/types.js'

const HOUR = 3600
// 2026-10-01T00:00:00Z, a day boundary.
export const SERIES_START = 1_790_812_800

// Small deterministic noise in [-1, 1].
export const noise = (i: number, seed = 1): number => Math.sin(i * 12.9898 * seed + seed * 78.233) % 1

export interface HourlyOptions {
  readonly days: number
  readonly base: number
  /** Multiplier on the low side by UTC hour (1 = no effect). */
  readonly lowEffect?: (hour: number) => number
  readonly highEffect?: (hour: number) => number
  /** Daily drift, e.g. 0.01 = +1%/day. */
  readonly drift?: number
  readonly noisePct?: number
  readonly volume?: (hour: number) => number
  readonly stepSec?: number
}

export function series ({ days, base, lowEffect = () => 1, highEffect = () => 1, drift = 0, noisePct = 0.002, volume = () => 50, stepSec = HOUR }: HourlyOptions): TimeseriesPoint[] {
  const steps = Math.round((days * 86_400) / stepSec)
  return Array.from({ length: steps }, (_, i) => {
    const timestamp = SERIES_START + i * stepSec
    const hour = Math.floor((timestamp % 86_400) / HOUR)
    const trend = base * (1 + drift) ** ((i * stepSec) / 86_400)
    const mid = trend * (1 + noisePct * noise(i))
    return {
      timestamp,
      avgLowPrice: mid * 0.99 * lowEffect(hour),
      avgHighPrice: mid * 1.01 * highEffect(hour),
      lowPriceVolume: volume(hour),
      highPriceVolume: volume(hour)
    }
  })
}

export const avgOf = (high: number | null, low: number | null, highVol = 100, lowVol = 100): AveragePrice =>
  ({ avgHighPrice: high, avgLowPrice: low, highPriceVolume: highVol, lowPriceVolume: lowVol })
