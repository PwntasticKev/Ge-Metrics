// Hand-built price data for unit tests. No network.

import { type Market, createMarketFromWiki } from '@ge/engine'
import type { AveragePrice, LatestPrice, MappingEntry, TimeseriesPoint } from '../../src/wiki/types.js'

export const NOW = 1_793_000_000

const entry = (id: number, name: string, extra: Partial<MappingEntry> = {}): MappingEntry => ({
  id, name, examine: null, members: true, limit: 100, value: null, highalch: null, lowalch: null, icon: null, ...extra
})

export const MAPPING: readonly MappingEntry[] = [
  entry(4151, 'Abyssal whip', { limit: 70, highalch: 72_000, lowalch: 48_000 }),
  entry(4587, 'Dragon scimitar', { limit: 70, highalch: 72_000, lowalch: 48_000 }),
  entry(561, 'Nature rune', { limit: 18_000, members: false }),
  entry(8011, 'Ardougne teleport (tablet)', { limit: 10_000 }),
  entry(1511, 'Logs', { limit: 15_000, members: false }),
  entry(960, 'Plank', { limit: 13_000, members: false }),
  entry(13012, 'Adamant set (lg)', { limit: 8 }),
  entry(1161, 'Adamant full helm', { limit: 125 }),
  entry(1123, 'Adamant platebody', { limit: 125 }),
  entry(1073, 'Adamant platelegs', { limit: 125 }),
  entry(1199, 'Adamant kiteshield', { limit: 125 }),
  entry(536, 'Dragon bones', { limit: 7500 }),
  entry(11802, 'Armadyl godsword', { limit: 8 }),
  entry(11798, 'Godsword blade', { limit: 10_000 })
]

const lp = (high: number, low: number, age = 60): LatestPrice => ({ high, low, highTime: NOW - age, lowTime: NOW - age })

export const LATEST = new Map<number, LatestPrice>([
  [4151, lp(1_000_000, 900_000)],
  [4587, lp(60_000, 59_000)],
  [561, lp(150, 140)],
  [8011, lp(600, 500)],
  [1511, lp(60, 40)],
  [960, lp(170, 160)],
  [13012, lp(28_000, 27_500)],
  [1161, lp(4_000, 3_500)],
  [1123, lp(10_000, 9_000)],
  [1073, lp(8_000, 7_000)],
  [1199, lp(6_000, 5_000)],
  [536, lp(3_000, 2_900, 8 * 3600)], // stale: last trade 8h ago
  [11802, lp(9_500_000, 9_450_000)],
  [11798, lp(500_000, 480_000)]
])

export const VOLUMES = new Map<number, number>([
  [4151, 3000], [4587, 50_000], [561, 1_000_000], [8011, 20_000], [1511, 900_000], [960, 600_000],
  [13012, 600], [1161, 6000], [1123, 6000], [1073, 6000], [1199, 6000], [536, 400_000], [11802, 200], [11798, 50]
])

export const avg = (avgHighPrice: number | null, avgLowPrice: number | null, highPriceVolume = 100, lowPriceVolume = 100): AveragePrice =>
  ({ avgHighPrice, avgLowPrice, highPriceVolume, lowPriceVolume })

const toRecord = <T>(m: ReadonlyMap<number, T>) => Object.fromEntries([...m].map(([k, v]) => [String(k), v]))

export function market (): Market {
  return createMarketFromWiki({
    mapping: MAPPING.map(m => ({ ...m, icon: undefined, limit: m.limit ?? undefined, highalch: m.highalch ?? undefined })),
    latest: toRecord(LATEST),
    volumes: toRecord(VOLUMES)
  }, { nowSec: NOW })
}

// Hourly points: `prices[i]` is the mid price, spread 2%, constant volume.
export function hourly (startSec: number, prices: readonly number[], volume = 10): TimeseriesPoint[] {
  return prices.map((p, i) => ({
    timestamp: startSec + i * 3600,
    avgHighPrice: p * 1.01,
    avgLowPrice: p * 0.99,
    highPriceVolume: volume,
    lowPriceVolume: volume
  }))
}
