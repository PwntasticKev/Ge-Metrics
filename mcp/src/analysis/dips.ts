// Dips: liquid items whose last-hour average insta-sell price sits well under
// the 24h average low while the insta-buy side holds. That pattern usually
// means panic/dump selling into buy offers rather than a real repricing, so
// buying the dip and selling back near the 24h high is the trade.

import { geTax } from '@ge/engine'

// Same fallback the engine uses for items the wiki has no buy limit for.
const ASSUMED_BUY_LIMIT = 8
import type { AveragePrice, IdMap, LatestPrice, MappingEntry } from '../wiki/types.js'
import { pct } from './format.js'

export interface DipOptions {
  // How far under the 24h average low the 1h average low must be (0.05 = 5%).
  readonly minDrop: number
  // Bigger drops are almost always a single fluke trade, not a tradeable dip.
  readonly maxDrop: number
  // How far the 1h average high may fall below the 24h average high (0.02 = 2%).
  readonly maxHighDrop: number
  // A spiking high means the whole market is moving, not a dip on the low side.
  readonly maxHighRise: number
  readonly minDailyVolume: number
  // Trades on the low side in the last hour, so the 1h average is meaningful.
  readonly minHourVolume: number
  readonly minPrice: number
  readonly limit: number
  // drop = biggest % drop first; potential = most gp if it recovers first.
  readonly sort: 'drop' | 'potential'
}

export interface DipInput {
  readonly mapping: readonly MappingEntry[]
  readonly hour: IdMap<AveragePrice>
  readonly day: IdMap<AveragePrice>
  readonly latest: IdMap<LatestPrice>
}

export const DEFAULT_DIP_OPTIONS: DipOptions = Object.freeze({
  minDrop: 0.05,
  maxDrop: 0.4,
  maxHighDrop: 0.02,
  maxHighRise: 0.05,
  minDailyVolume: 500,
  minHourVolume: 5,
  minPrice: 100,
  limit: 20,
  sort: 'potential'
})

export function findDips ({ mapping, hour, day, latest }: DipInput, options: Partial<DipOptions> = {}) {
  const o = { ...DEFAULT_DIP_OPTIONS, ...options }
  return mapping.flatMap(entry => {
    const h = hour.get(entry.id)
    const d = day.get(entry.id)
    if (!h || !d) return []
    const { avgLowPrice: hourLow, avgHighPrice: hourHigh } = h
    const { avgLowPrice: dayLow, avgHighPrice: dayHigh } = d
    if (hourLow === null || hourHigh === null || dayLow === null || dayHigh === null) return []

    const dailyVolume = d.highPriceVolume + d.lowPriceVolume
    if (dailyVolume < o.minDailyVolume || h.lowPriceVolume < o.minHourVolume || dayLow < o.minPrice) return []

    const lowDrop = 1 - hourLow / dayLow
    const highDrop = 1 - hourHigh / dayHigh
    if (lowDrop < o.minDrop || lowDrop > o.maxDrop || highDrop > o.maxHighDrop || -highDrop > o.maxHighRise) return []

    // Exit plan: buy near the dipped low, sell back at the 24h average high.
    const buyAt = Math.round(hourLow)
    const sellAt = Math.round(dayHigh)
    const profit = sellAt - buyAt - geTax(sellAt, entry.id)
    const now = latest.get(entry.id)
    return [{
      id: entry.id,
      name: entry.name,
      hourAvgLow: buyAt,
      dayAvgLow: Math.round(dayLow),
      lowDropPct: pct(lowDrop),
      hourAvgHigh: Math.round(hourHigh),
      dayAvgHigh: sellAt,
      highChangePct: pct(-highDrop),
      latestLow: now?.low ?? null,
      latestHigh: now?.high ?? null,
      hourLowVolume: h.lowPriceVolume,
      dailyVolume,
      limit: entry.limit,
      profitIfRecovers: profit,
      roiIfRecoversPct: pct(profit / buyAt),
      // What the last hour's dump volume would have earned, within one buy limit.
      potentialProfit: profit * Math.min(entry.limit ?? ASSUMED_BUY_LIMIT, h.lowPriceVolume)
    }]
  })
    .sort(o.sort === 'drop'
      ? (a, b) => (b.lowDropPct ?? 0) - (a.lowDropPct ?? 0)
      : (a, b) => b.potentialProfit - a.potentialProfit)
    .slice(0, o.limit)
}
