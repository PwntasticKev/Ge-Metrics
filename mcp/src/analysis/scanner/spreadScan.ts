// "Margins opened": items whose live margin after tax is well above their own
// normal margin. Ported from mobile/src/lib/spreadScan.ts. Two passes:
// - screenSpreads: cheap, from /latest plus the bulk /1h and /24h averages.
//   "Now" is the careful margin: the lower of live and last-hour sell price
//   against the higher of live and last-hour buy price, so one stray print in
//   /latest can't fake a gap. Both sides must have traded in the last hour
//   (per-side volume guard). The norm is the margin between the day's averages.
// - spreadHistory: from an item's 7-day hourly series. The norm becomes the
//   median hourly margin and the live margin gets a robust z-score.

import type { AveragePrice, IdMap, LatestPrice, MappingEntry } from '../../wiki/types.js'
import { median, robustSigma } from '../stats.js'
import { tradesOf } from './thinSpikes.js'

export type TaxFn = (sellPrice: number, itemId: number) => number

/** Live margin at least this many times the day's norm. */
export const SPREAD_MULTIPLE = 2
/** Items trading less than this a day may not fill. */
export const SPREAD_MIN_DAY_TRADES = 240
/** Each side must have traded at least this often in the last hour. */
export const SPREAD_MIN_HOUR_TRADES = 3
/** Both live prices must be this fresh, so one old trade can't fake a gap. */
export const SPREAD_MAX_AGE_SEC = 20 * 60
/** Margins below this per buy limit aren't worth a slot. */
export const SPREAD_MIN_PROFIT_PER_LIMIT = 20_000
/** A norm can't be smaller than this share of the price (keeps multiples sane). */
export const NORM_FLOOR_RATIO = 0.002
/** spreadHistory: the live margin is unusual for this item at this z or more. */
export const SPREAD_Z = 3
const WEEK_HOURS = 168
const MIN_HOURS = 24

export interface SpreadRow {
  readonly item: MappingEntry
  readonly high: number
  readonly low: number
  /** Careful margin after tax: worse of live and last-hour prices on each side. */
  readonly live: number
  readonly carefulBuy: number
  readonly carefulSell: number
  /** Margin between the two live prices, after tax. */
  readonly rawLive: number
  /** Margin between the day's average prices, after tax. */
  readonly dayNorm: number
  readonly hourMargin: number | null
  /** live / max(norm, floor). */
  readonly multiple: number
  readonly profitPerLimit: number | null
  readonly dayTrades: number
}

export const marginAfterTax = (sell: number, buy: number, id: number, tax: TaxFn): number => sell - buy - tax(sell, id)

function averageMargin (a: AveragePrice | undefined, id: number, tax: TaxFn): number | null {
  if (!a || !a.avgHighPrice || !a.avgLowPrice || !a.highPriceVolume || !a.lowPriceVolume) return null
  return marginAfterTax(a.avgHighPrice, a.avgLowPrice, id, tax)
}

export const normFloor = (price: number): number => Math.max(1, Math.round(price * NORM_FLOOR_RATIO))

export interface SpreadContext {
  readonly latest: IdMap<LatestPrice>
  readonly h1: IdMap<AveragePrice>
  readonly h24: IdMap<AveragePrice>
  readonly nowSec: number
  readonly tax: TaxFn
  /** True for items flagged as a thin-volume pump. */
  readonly isPump: (id: number) => boolean
}

const isFresh = (t: number | null, nowSec: number) => t !== null && nowSec - t <= SPREAD_MAX_AGE_SEC

/** One item through the cheap pass, or null when it doesn't qualify. */
export function screenSpread (item: MappingEntry, ctx: SpreadContext): SpreadRow | null {
  const l = ctx.latest.get(item.id)
  if (!l?.high || !l.low || !isFresh(l.highTime, ctx.nowSec) || !isFresh(l.lowTime, ctx.nowSec)) return null
  const day = ctx.h24.get(item.id)
  if (!day || tradesOf(day) < SPREAD_MIN_DAY_TRADES) return null
  const dayNorm = averageMargin(day, item.id, ctx.tax)
  const hour = ctx.h1.get(item.id)
  if (dayNorm === null || !hour?.avgHighPrice || !hour.avgLowPrice) return null
  if (hour.highPriceVolume < SPREAD_MIN_HOUR_TRADES || hour.lowPriceVolume < SPREAD_MIN_HOUR_TRADES) return null
  const carefulSell = Math.min(l.high, hour.avgHighPrice)
  const carefulBuy = Math.max(l.low, hour.avgLowPrice)
  const live = marginAfterTax(carefulSell, carefulBuy, item.id, ctx.tax)
  if (live <= 0) return null
  const multiple = live / Math.max(dayNorm, normFloor(l.low))
  if (multiple < SPREAD_MULTIPLE) return null
  const profitPerLimit = item.limit ? live * item.limit : null
  if (profitPerLimit !== null && profitPerLimit < SPREAD_MIN_PROFIT_PER_LIMIT) return null
  if (ctx.isPump(item.id)) return null
  return {
    item, high: l.high, low: l.low, live, carefulBuy: Math.round(carefulBuy), carefulSell: Math.round(carefulSell),
    rawLive: marginAfterTax(l.high, l.low, item.id, ctx.tax), dayNorm, hourMargin: averageMargin(hour, item.id, ctx.tax),
    multiple, profitPerLimit, dayTrades: tradesOf(day)
  }
}

/** Every item that passes, most profit per buy limit first (unknown limits last, by multiple). */
export function screenSpreads (items: readonly MappingEntry[], ctx: SpreadContext): SpreadRow[] {
  return items
    .map(item => screenSpread(item, ctx))
    .filter((r): r is SpreadRow => r !== null)
    .sort((a, b) => (b.profitPerLimit ?? -1) - (a.profitPerLimit ?? -1) || b.multiple - a.multiple)
}

export interface SpreadHistory {
  /** Median hourly margin after tax over the last 7 days. */
  readonly norm: number
  /** Robust spread of those margins (scaled MAD), floored at normFloor. */
  readonly sigma: number
  readonly z: number
  readonly multiple: number
  readonly hours: number
  readonly unusual: boolean
}

/** The live margin against the item's hourly margins over the last week; null without enough history. */
export function spreadHistory (series: readonly AveragePrice[], live: number, id: number, tax: TaxFn): SpreadHistory | null {
  const recent = series.slice(-WEEK_HOURS)
  const margins = recent.map(p => averageMargin(p, id, tax)).filter((m): m is number => m !== null)
  if (margins.length < MIN_HOURS) return null
  const lows = recent.map(p => p.avgLowPrice).filter((v): v is number => v !== null)
  const floor = normFloor(median(lows) ?? 0)
  const norm = median(margins) as number
  const sigma = Math.max(robustSigma(margins), floor)
  const z = (live - norm) / sigma
  return { norm, sigma, z, multiple: live / Math.max(norm, floor), hours: margins.length, unusual: z >= SPREAD_Z }
}
