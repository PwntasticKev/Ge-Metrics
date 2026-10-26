// How long will an offer take to fill, and what does a GE slot earn per hour?
//
// The wiki splits each period's volume by side: lowPriceVolume counts items
// instant-sold (they fill buy offers), highPriceVolume counts items
// instant-bought (they fill sell offers). A buy offer fills from the first
// flow, a sell offer from the second.
//
// You don't get all of that flow. The GE fills the best price first, then the
// oldest offer, so:
// - reach: how often the market trades at your price at all. With recent
//   hourly prices, the share of hours whose average reached your offer.
// - queue share: at the typical price you sit among other offers and get
//   about a quarter of the flow; outbid towards the other side of the spread
//   and you get first pick, up to all of it.

import { clamp, median } from './stats.ts'
import type { AverageLike, TimeseriesPoint } from './types.ts'

export interface MarketFlow {
  /** Typical instant-sell (low) and instant-buy (high) prices. */
  typicalLow: number
  typicalHigh: number
  /** Items per hour instant-sold into buy offers. */
  instantSellsPerHour: number
  /** Items per hour instant-bought from sell offers. */
  instantBuysPerHour: number
  /** Recent hourly average lows and highs; empty when unknown. */
  recentLows: readonly number[]
  recentHighs: readonly number[]
}

/** Share of the flow an offer at the typical price can expect. */
export const QUEUE_SHARE = 0.25
/** Placing, checking and collecting an offer takes a few minutes at best. */
export const MIN_FILL_HOURS = 5 / 60
export const BUY_LIMIT_HOURS = 4
const HOUR_SEC = 3_600

const prices = (values: (number | null)[]) => values.filter((v): v is number => v !== null && v > 0)

/** Flow over the last `hours` of a 1h (or 5m) series. Null without prices on both sides. */
export function flowFromSeries (series: readonly TimeseriesPoint[], hours = 24): MarketFlow | null {
  if (!series.length || hours <= 0) return null
  const end = Math.max(...series.map(p => p.timestamp))
  const recent = series.filter(p => p.timestamp > end - hours * HOUR_SEC)
  const lows = prices(recent.map(p => p.avgLowPrice))
  const highs = prices(recent.map(p => p.avgHighPrice))
  const typicalLow = median(lows)
  const typicalHigh = median(highs)
  if (typicalLow === null || typicalHigh === null) return null
  const total = (pick: (p: TimeseriesPoint) => number) => recent.reduce((sum, p) => sum + pick(p), 0)
  return {
    typicalLow,
    typicalHigh,
    instantSellsPerHour: total(p => p.lowPriceVolume) / hours,
    instantBuysPerHour: total(p => p.highPriceVolume) / hours,
    recentLows: lows,
    recentHighs: highs
  }
}

/**
 * Flow from the wiki's /1h and /24h averages, for ranking many items without
 * a timeseries each. Takes the slower of the last hour and the day's average
 * pace, so a quiet hour or a one-off burst can't flatter an item.
 */
export function flowFromAverages (h1: AverageLike | undefined, h24: AverageLike | undefined): MarketFlow | null {
  const typicalLow = h24?.avgLowPrice ?? h1?.avgLowPrice ?? null
  const typicalHigh = h24?.avgHighPrice ?? h1?.avgHighPrice ?? null
  if (!typicalLow || !typicalHigh || !h24) return null
  const pace = (hour: number | undefined, day: number) => Math.min(hour ?? day / 24, day / 24)
  return {
    typicalLow,
    typicalHigh,
    instantSellsPerHour: pace(h1?.lowPriceVolume, h24.lowPriceVolume),
    instantBuysPerHour: pace(h1?.highPriceVolume, h24.highPriceVolume),
    recentLows: prices([h1?.avgLowPrice ?? null, h24.avgLowPrice]),
    recentHighs: prices([h1?.avgHighPrice ?? null, h24.avgHighPrice])
  }
}

function queueShare (outbid: number, spread: number): number {
  const position = spread > 0 ? clamp(outbid / spread, 0, 1) : outbid >= 0 ? 1 : 0
  return QUEUE_SHARE + (1 - QUEUE_SHARE) * position
}

function hoursFor (qty: number, perHour: number): number {
  if (qty <= 0) return 0
  return perHour > 0 ? Math.max(MIN_FILL_HOURS, qty / perHour) : Infinity
}

/** Share of recent hours the market traded at or through `price`. */
function reach (samples: readonly number[], hit: (v: number) => boolean, fallback: number): number {
  return samples.length ? samples.filter(hit).length / samples.length : fallback
}

/** Hours for a buy offer of `qty` at `price` to fill. Infinity if it won't. */
export function buyFillHours (flow: MarketFlow, price: number, qty: number): number {
  const spread = flow.typicalHigh - flow.typicalLow
  const reached = reach(flow.recentLows, v => v <= price, price >= flow.typicalLow ? 1 : 0)
  return hoursFor(qty, flow.instantSellsPerHour * reached * queueShare(price - flow.typicalLow, spread))
}

/** Hours for a sell offer of `qty` at `price` to fill. Infinity if it won't. */
export function sellFillHours (flow: MarketFlow, price: number, qty: number): number {
  const spread = flow.typicalHigh - flow.typicalLow
  const reached = reach(flow.recentHighs, v => v >= price, price <= flow.typicalHigh ? 1 : 0)
  return hoursFor(qty, flow.instantBuysPerHour * reached * queueShare(flow.typicalHigh - price, spread))
}

export interface SlotRate {
  /** Items flipped in one cycle: never more than one buy limit. */
  units: number
  buyHours: number
  sellHours: number
  cycleHours: number
  profit: number
  /** Profit per hour the slot is busy; 0 when it would never fill. */
  gpPerHour: number
}

export interface SlotInput {
  buyAt: number
  sellAt: number
  /** Margin per item after tax. */
  profitEach: number
  qty: number
  /** Buy limit per 4 hours; null when unknown. */
  limit: number | null
}

/**
 * GP per hour one GE slot earns flipping this item: one buy limit (or less)
 * bought, then sold, divided by the time both offers take to fill. The limit
 * caps a cycle; you can buy that many again only once its 4h window resets,
 * so a slot that finishes early moves on to another item.
 */
export function slotRate (flow: MarketFlow, input: SlotInput): SlotRate {
  const units = Math.max(0, Math.floor(input.limit ? Math.min(input.qty, input.limit) : input.qty))
  const buyHours = buyFillHours(flow, input.buyAt, units)
  const sellHours = sellFillHours(flow, input.sellAt, units)
  const cycleHours = buyHours + sellHours
  const profit = input.profitEach * units
  const gpPerHour = Number.isFinite(cycleHours) && cycleHours > 0 ? profit / cycleHours : 0
  return { units, buyHours, sellHours, cycleHours, profit, gpPerHour }
}
