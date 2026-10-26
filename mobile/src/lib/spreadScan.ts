// Market scanner, "Margins opened": items whose live margin after tax is well
// above their own normal margin. Two passes:
// - screenSpreads: cheap, from /latest plus the bulk /1h and /24h averages.
//   "Now" is the careful margin: the lower of live and last-hour sell price
//   against the higher of live and last-hour buy price, so one odd trade in
//   /latest can't fake a gap (same rule as Buy now). The norm is the margin
//   between the day's average buy and sell prices.
// - spreadHistory: from an item's 7-day hourly series. The norm becomes the
//   median hourly margin, and the live margin gets a robust z-score.
// Pure; tax and the thin-spike check are passed in.
import { median, robustSigma, tradesOf, type Averages, type SideAverages } from './scanMath.ts'

export interface LiveItem {
  id: number
  name: string
  icon: string | null
  limit: number | null
  /** Live instant-buy and instant-sell prices (wiki /latest). */
  high: number | null
  low: number | null
  /** Seconds since epoch of the last trade on each side. */
  highTime: number | null
  lowTime: number | null
}

export type TaxFn = (sellPrice: number, itemId: number) => number

/** Live margin at least this many times the day's norm. */
export const SPREAD_MULTIPLE = 2
/** Items trading less than this a day (about ten an hour) may not fill. */
export const SPREAD_MIN_DAY_TRADES = 240
/** And each side must have traded at least this often in the last hour. */
export const SPREAD_MIN_HOUR_TRADES = 3
/** Both live prices must be this fresh, so one old trade can't fake a gap. */
export const SPREAD_MAX_AGE_SEC = 20 * 60
/** Margins below this per buy limit aren't worth a slot. */
export const SPREAD_MIN_PROFIT_PER_LIMIT = 20_000
/** A norm can't be smaller than this share of the price (keeps ×-multiples sane). */
export const NORM_FLOOR_RATIO = 0.002
/** spreadHistory: the live margin is unusual for this item at this z or more. */
export const SPREAD_Z = 3
const WEEK_HOURS = 168
const MIN_HOURS = 24

export interface SpreadRow {
  item: LiveItem
  /** Careful margin after tax: worse of live and last-hour prices on each side. */
  live: number
  /** Margin between the two live prices, after tax. */
  rawLive: number
  /** Margin between the day's average prices, after tax. */
  dayNorm: number
  /** Margin between the last hour's average prices, after tax; null without trades. */
  hourMargin: number | null
  /** live / max(norm, floor). */
  multiple: number
  /** live × buy limit; null when the limit is unknown. */
  profitPerLimit: number | null
  dayTrades: number
}

export function marginAfterTax (sell: number, buy: number, id: number, tax: TaxFn): number {
  return sell - buy - tax(sell, id)
}

function averageMargin (a: SideAverages | undefined, id: number, tax: TaxFn): number | null {
  if (!a || !a.avgHighPrice || !a.avgLowPrice || !a.highPriceVolume || !a.lowPriceVolume) return null
  return marginAfterTax(a.avgHighPrice, a.avgLowPrice, id, tax)
}

export function normFloor (price: number): number {
  return Math.max(1, Math.round(price * NORM_FLOOR_RATIO))
}

export interface SpreadInputs {
  items: readonly LiveItem[]
  h1: Averages
  h24: Averages
  nowSec: number
  tax: TaxFn
  /** True for items flagged as a thin-volume pump. */
  isPump: (id: number) => boolean
}

/** One item through the cheap pass, or null when it doesn't qualify. */
export function screenSpread (item: LiveItem, { h1, h24, nowSec, tax, isPump }: Omit<SpreadInputs, 'items'>): SpreadRow | null {
  const { high, low, highTime, lowTime } = item
  if (!high || !low || !highTime || !lowTime) return null
  if (nowSec - highTime > SPREAD_MAX_AGE_SEC || nowSec - lowTime > SPREAD_MAX_AGE_SEC) return null
  const day = h24[String(item.id)]
  if (!day || tradesOf(day) < SPREAD_MIN_DAY_TRADES) return null
  const dayNorm = averageMargin(day, item.id, tax)
  if (dayNorm === null) return null
  const hour = h1[String(item.id)]
  if (!hour || !hour.avgHighPrice || !hour.avgLowPrice) return null
  if (hour.highPriceVolume < SPREAD_MIN_HOUR_TRADES || hour.lowPriceVolume < SPREAD_MIN_HOUR_TRADES) return null
  const sell = Math.min(high, hour.avgHighPrice)
  const buy = Math.max(low, hour.avgLowPrice)
  const live = marginAfterTax(sell, buy, item.id, tax)
  if (live <= 0) return null
  const multiple = live / Math.max(dayNorm, normFloor(low))
  if (multiple < SPREAD_MULTIPLE) return null
  const profitPerLimit = item.limit ? live * item.limit : null
  if (profitPerLimit !== null && profitPerLimit < SPREAD_MIN_PROFIT_PER_LIMIT) return null
  if (isPump(item.id)) return null
  return { item, live, rawLive: marginAfterTax(high, low, item.id, tax), dayNorm, hourMargin: averageMargin(hour, item.id, tax), multiple, profitPerLimit, dayTrades: tradesOf(day) }
}

/** Every item that passes, most profit per buy limit first (unknown limits last, by multiple). */
export function screenSpreads ({ items, ...rest }: SpreadInputs): SpreadRow[] {
  return items
    .map(item => screenSpread(item, rest))
    .filter((r): r is SpreadRow => r !== null)
    .sort((a, b) => (b.profitPerLimit ?? -1) - (a.profitPerLimit ?? -1) || b.multiple - a.multiple)
}

export interface SpreadHistory {
  /** Median hourly margin after tax over the last 7 days. */
  norm: number
  /** Robust spread of those margins (scaled MAD), floored at normFloor. */
  sigma: number
  /** (live - norm) / sigma. */
  z: number
  /** live / max(norm, floor). */
  multiple: number
  hours: number
  unusual: boolean
}

/** The live margin against the item's hourly margins over the last week; null without enough history. */
export function spreadHistory (series: readonly SideAverages[], live: number, id: number, tax: TaxFn): SpreadHistory | null {
  const recent = series.slice(-WEEK_HOURS)
  const margins = recent
    .map(p => averageMargin(p, id, tax))
    .filter((m): m is number => m !== null)
  if (margins.length < MIN_HOURS) return null
  const lows = recent.map(p => p.avgLowPrice).filter((v): v is number => v !== null)
  const floor = normFloor(median(lows))
  const norm = median(margins)
  const sigma = Math.max(robustSigma(margins), floor)
  const z = (live - norm) / sigma
  return { norm, sigma, z, multiple: live / Math.max(norm, floor), hours: margins.length, unusual: z >= SPREAD_Z }
}
