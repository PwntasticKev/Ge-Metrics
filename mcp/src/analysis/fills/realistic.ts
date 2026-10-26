// Prices a flip can actually trade at. A lone print (one lucky instant-buy at
// a spike, one panic sell) says nothing about where your offer will fill, so a
// window's price only counts when enough items traded on that side. Recent
// beats old: the last hour is used when it qualifies, the day otherwise, and
// the live price can only make the plan more careful (higher buy, lower sell).

import type { AveragePrice, LatestPrice, TimeseriesPoint } from '../../wiki/types.js'
import { median } from '../stats.js'

/** An hour's average for one side counts only with this many trades on that side. */
export const MIN_HOUR_SIDE_TRADES = 5
/** The day's average for one side counts only with this many trades on that side. */
export const MIN_DAY_SIDE_TRADES = 24
/** Series pricing needs at least this many qualifying hours per side. */
export const MIN_QUALIFYING_HOURS = 3
/** Series pricing uses the median of this many most recent qualifying hours. */
export const RECENT_HOURS = 6
const SERIES_HOURS = 24
const HOUR_SEC = 3_600

export type PriceBasis = 'bulk averages (1h/24h)' | 'hourly series (24h)'

export interface RealisticPrices {
  readonly buyAt: number
  readonly sellAt: number
  readonly basis: PriceBasis
}

const positive = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0

interface SideWindow { readonly price: number | null; readonly volume: number; readonly min: number }

/** The first window with enough trades on this side (most recent first). */
function sidePrice (windows: readonly SideWindow[]): number | null {
  return windows.find(w => positive(w.price) && w.volume >= w.min)?.price ?? null
}

export interface AverageInput {
  readonly h1?: AveragePrice
  readonly h24?: AveragePrice
  readonly latest?: LatestPrice
}

/**
 * From the bulk /1h and /24h averages: per side, the last hour when it had
 * enough trades on that side, else the day. The live price only ever makes it
 * more careful. Null when neither window has enough trades on a side.
 */
export function realisticFromAverages ({ h1, h24, latest }: AverageInput): RealisticPrices | null {
  const low = sidePrice([
    { price: h1?.avgLowPrice ?? null, volume: h1?.lowPriceVolume ?? 0, min: MIN_HOUR_SIDE_TRADES },
    { price: h24?.avgLowPrice ?? null, volume: h24?.lowPriceVolume ?? 0, min: MIN_DAY_SIDE_TRADES }
  ])
  const high = sidePrice([
    { price: h1?.avgHighPrice ?? null, volume: h1?.highPriceVolume ?? 0, min: MIN_HOUR_SIDE_TRADES },
    { price: h24?.avgHighPrice ?? null, volume: h24?.highPriceVolume ?? 0, min: MIN_DAY_SIDE_TRADES }
  ])
  if (low === null || high === null) return null
  const buyAt = Math.max(low, positive(latest?.low) ? latest.low : 0)
  const sellAt = Math.min(high, positive(latest?.high) ? latest.high : Infinity)
  return { buyAt: Math.round(buyAt), sellAt: Math.round(sellAt), basis: 'bulk averages (1h/24h)' }
}

/**
 * From an item's 1h series: per side, the median of the most recent
 * qualifying hours (within the last 24h). One or two spiked hours can't move
 * that median. Null without enough qualifying hours.
 */
export function realisticFromSeries (series: readonly TimeseriesPoint[]): RealisticPrices | null {
  if (!series.length) return null
  const end = Math.max(...series.map(p => p.timestamp))
  const recent = [...series].filter(p => p.timestamp > end - SERIES_HOURS * HOUR_SEC).sort((a, b) => a.timestamp - b.timestamp)
  const lows = recent.filter(p => p.lowPriceVolume >= MIN_HOUR_SIDE_TRADES && positive(p.avgLowPrice)).map(p => p.avgLowPrice as number)
  const highs = recent.filter(p => p.highPriceVolume >= MIN_HOUR_SIDE_TRADES && positive(p.avgHighPrice)).map(p => p.avgHighPrice as number)
  if (lows.length < MIN_QUALIFYING_HOURS || highs.length < MIN_QUALIFYING_HOURS) return null
  const buyAt = median(lows.slice(-RECENT_HOURS)) as number
  const sellAt = median(highs.slice(-RECENT_HOURS)) as number
  return { buyAt: Math.round(buyAt), sellAt: Math.round(sellAt), basis: 'hourly series (24h)' }
}
