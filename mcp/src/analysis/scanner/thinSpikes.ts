// Pump and dump detector: a sharp move on thin volume is more likely a few
// traders pushing the price than real news, and tends to snap back.
// Ported from the GE Metrics app (mobile/src/lib/thinSpikes.ts).
//
// - assessThinSpike: cheap, from the bulk /1h, /24h and /5m averages.
// - hourlyCheck: from an item's hourly series; the last hour's move in
//   standard deviations of that item's usual hourly moves.

import type { AveragePrice } from '../../wiki/types.js'
import { median } from '../stats.js'

export interface SpikeInput {
  readonly h1?: AveragePrice
  readonly h24?: AveragePrice
  readonly m5?: AveragePrice
}

export type SpikeKind = 'pump' | 'dump'

export interface SpikeFlag {
  readonly kind: SpikeKind
  /** hour: last hour vs the day. print: last 5 minutes vs the last hour. */
  readonly trigger: 'hour' | 'print'
  readonly change: number
  /** Trades in the window against a typical window of the same length. */
  readonly volumeRatio: number
}

/** Last hour at least this far from the day's average... */
export const HOUR_MOVE = 0.08
/** ...on less than this share of a typical hour's trades. */
export const THIN_VOLUME = 0.6
/** A 5-minute average at least this far from the last hour's. */
export const PRINT_MOVE = 0.12
/** A "print" is a handful of trades at most. */
export const PRINT_MAX_TRADES = 3
/** Lone prints only mean something on items that usually trade ~10 times an hour. */
export const PRINT_MIN_DAY_TRADES = 240
export const PRINT_MIN_HOUR_TRADES = 3
/** Items trading less than this a day are too noisy to judge. */
export const MIN_DAY_TRADES = 48
/** Cheap items swing by whole percents on one coin; not worth flagging. */
export const MIN_PRICE = 1_000
/** hourlyCheck: moves of at least this many standard deviations. */
export const Z_THRESHOLD = 3
const MIN_RETURNS = 24
const WEEK_HOURS = 168
const MIN_SIGMA = 1e-4

export const tradesOf = (a: AveragePrice): number => a.highPriceVolume + a.lowPriceVolume

/**
 * The smaller of the high and low moves when both moved the same way, else 0.
 * A real pump lifts both sides; one odd trade on a single side is a print.
 */
export function bothSidesChange (from: AveragePrice, to: AveragePrice): number {
  if (!from.avgHighPrice || !from.avgLowPrice || !to.avgHighPrice || !to.avgLowPrice) return 0
  const high = to.avgHighPrice / from.avgHighPrice - 1
  const low = to.avgLowPrice / from.avgLowPrice - 1
  if (Math.sign(high) !== Math.sign(low)) return 0
  return Math.abs(high) < Math.abs(low) ? high : low
}

function printChange (ref: AveragePrice, m5: AveragePrice): number | null {
  const changes: number[] = []
  if (m5.highPriceVolume && ref.highPriceVolume >= PRINT_MIN_HOUR_TRADES && m5.avgHighPrice && ref.avgHighPrice) changes.push(m5.avgHighPrice / ref.avgHighPrice - 1)
  if (m5.lowPriceVolume && ref.lowPriceVolume >= PRINT_MIN_HOUR_TRADES && m5.avgLowPrice && ref.avgLowPrice) changes.push(m5.avgLowPrice / ref.avgLowPrice - 1)
  if (!changes.length) return null
  return changes.reduce((best, c) => (Math.abs(c) > Math.abs(best) ? c : best))
}

const refPrice = (a: AveragePrice) => Math.max(a.avgHighPrice ?? 0, a.avgLowPrice ?? 0)
const flag = (change: number, trigger: SpikeFlag['trigger'], volumeRatio: number): SpikeFlag =>
  ({ kind: change > 0 ? 'pump' : 'dump', trigger, change, volumeRatio })

function printFlag (h1: AveragePrice, h24: AveragePrice, m5: AveragePrice, typicalHour: number): SpikeFlag | null {
  const change = printChange(h1, m5)
  // Far from the day as well, so a choppy hour doesn't count.
  const fromDay = printChange(h24, m5)
  if (change === null || fromDay === null) return null
  if (Math.abs(change) < PRINT_MOVE || Math.abs(fromDay) < PRINT_MOVE || Math.sign(change) !== Math.sign(fromDay)) return null
  return flag(change, 'print', tradesOf(m5) / Math.max(typicalHour / 12, MIN_SIGMA))
}

export function assessThinSpike ({ h1, h24, m5 }: SpikeInput): SpikeFlag | null {
  if (!h1 || !h24) return null
  const dayTrades = tradesOf(h24)
  if (dayTrades < MIN_DAY_TRADES || refPrice(h24) < MIN_PRICE) return null
  const typicalHour = dayTrades / 24
  const hourChange = bothSidesChange(h24, h1)
  const hourRatio = tradesOf(h1) / typicalHour
  if (Math.abs(hourChange) >= HOUR_MOVE && hourRatio < THIN_VOLUME) return flag(hourChange, 'hour', hourRatio)
  const isPrint = m5 && dayTrades >= PRINT_MIN_DAY_TRADES && tradesOf(m5) > 0 && tradesOf(m5) <= PRINT_MAX_TRADES
  return isPrint ? printFlag(h1, h24, m5, typicalHour) : null
}

export interface HourlyCheck {
  /** Last hour's move in standard deviations of the week's hourly moves. */
  readonly z: number
  readonly change: number
  readonly sigma: number
  /** Last hour's trades against the week's median hour. */
  readonly volumeRatio: number | null
  readonly confirmed: boolean
}

const midOf = (p: AveragePrice) => (p.avgHighPrice && p.avgLowPrice ? (p.avgHighPrice + p.avgLowPrice) / 2 : null)

/** The latest hour of a 1h series against the 7 days before it; null without enough history. */
export function hourlyCheck (series: readonly AveragePrice[], k = Z_THRESHOLD): HourlyCheck | null {
  const points = series.slice(-(WEEK_HOURS + 1))
  const returns: number[] = []
  let prev: number | null = null
  let lastIndex = -1
  points.forEach((p, i) => {
    const m = midOf(p)
    if (m === null) return
    if (prev !== null) returns.push(Math.log(m / prev))
    prev = m
    lastIndex = i
  })
  if (returns.length < MIN_RETURNS + 1) return null
  const last = returns[returns.length - 1] as number
  const history = returns.slice(0, -1)
  const mean = history.reduce((s, r) => s + r, 0) / history.length
  const sigma = Math.max(MIN_SIGMA, Math.sqrt(history.reduce((s, r) => s + (r - mean) ** 2, 0) / history.length))
  const z = (last - mean) / sigma
  const typical = median(points.slice(0, lastIndex).map(tradesOf)) ?? 0
  const lastPoint = points[lastIndex] as AveragePrice
  const volumeRatio = typical > 0 ? tradesOf(lastPoint) / typical : null
  return { z, change: Math.exp(last) - 1, sigma, volumeRatio, confirmed: Math.abs(z) >= k && (volumeRatio === null || volumeRatio < 1) }
}
