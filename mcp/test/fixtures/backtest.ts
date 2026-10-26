// Synthetic hourly history for backtest tests. No network.

import { HOUR_SEC, type History, type Snapshot, createHistory } from '../../src/backtest/history.js'
import type { AveragePrice, MappingEntry } from '../../src/wiki/types.js'

export const T0 = 1_792_000_800 - (1_792_000_800 % (4 * HOUR_SEC))

export const ITEMS: readonly MappingEntry[] = [
  { id: 1, name: 'Steady item', examine: null, members: true, limit: 100, value: null, highalch: null, lowalch: null, icon: null },
  { id: 2, name: 'Pricey item', examine: null, members: true, limit: 10, value: null, highalch: null, lowalch: null, icon: null }
]

export const avg = (high: number | null, low: number | null, highVol = 200, lowVol = 200): AveragePrice =>
  ({ avgHighPrice: high, highPriceVolume: highVol, avgLowPrice: low, lowPriceVolume: lowVol })

export type HourFn = (ts: number, hourIndex: number) => Snapshot

/** A steady market: item 1 trades 1000/1100, item 2 trades 1M/1.08M. */
export const steady: HourFn = () => new Map([
  [1, avg(1100, 1000)],
  [2, avg(1_080_000, 1_000_000, 30, 30)]
])

/** Hourly history from `fromHours` before T0 to `toHours` after it. */
export function buildHistory (hourFn: HourFn, fromHours = 200, toHours = 120): History {
  const hours = new Map<number, Snapshot>()
  for (let i = -fromHours; i < toHours; i++) {
    const ts = T0 + i * HOUR_SEC
    hours.set(ts, hourFn(ts, i))
  }
  return createHistory(hours)
}
