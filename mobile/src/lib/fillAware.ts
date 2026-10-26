// Fill-aware prices: what a trader can actually buy and sell at, and whether
// the offers fill in time.
//
// A margin built on one odd trade is noise: a single instant-buy of 3 items at
// a spike price can set the live high and the last hour's average. So each
// side's price comes from recent hourly windows where that side traded a fair
// share of its normal volume, never from one print. Then the fill-time model
// (analytics/fillTime) says how long the buy and the sell take at those
// prices, and anything that can't sell inside the trader's patience is
// marked slow. Pure; no React Native or engine imports.
import { median } from './analytics/stats.ts'
import { slotRate, type MarketFlow, type SlotRate } from './analytics/fillTime.ts'
import type { SideAverages } from './scanMath.ts'

// Defaults below come from a 14-day no-lookahead backtest of the app's and
// the MCP server's pickers (PR #25, mcp/reports/backtest-2026-10-26.md).

/**
 * Default for "slowest sell to show". In the MCP backtest, sells predicted to
 * take 2-4h were dumped 39% of the time and 4h+ 56% (both lost money), while
 * sells under 2h were dumped 10-13%. Replaying the app's own lists, a 1h cap
 * beat 2h: quick +15.4M vs +9.8M, overnight +43.9M vs +33.6M, dips +3.1M vs
 * +3.5M (50M stack, 8 slots, 14 days).
 */
export const DEFAULT_MAX_SELL_HOURS = 1
export const MAX_SELL_HOUR_OPTIONS = [1, 2, 4, 8] as const
/**
 * Items trading fewer than this a day (both sides, /24h) are left out of
 * picks and the scanner: in the backtest, items under 10K a day lost money
 * in every bucket (-57M realized against +43M expected).
 */
export const MIN_DAY_TRADES = 10_000
/** A slow buy demotes once buy plus sell takes this many times the sell limit. */
export const MAX_CYCLE_MULTIPLE = 2
/** Recent hourly windows a price may come from (backtest: the median of 6 qualifying hours). */
export const PRICE_WINDOWS = 6
/** The normal hourly volume is averaged over this many hours. */
export const NORMAL_HOURS = 24
/** A window sets a side's price only with this share of the side's normal hourly volume, */
export const MIN_WINDOW_SHARE = 0.25
/** and never with fewer items than this. */
export const MIN_WINDOW_ITEMS = 5

export type Side = 'buy' | 'sell'

/** Buy and sell prices a trader can expect to trade at. */
export interface TradePrices {
  buyAt: number
  sellAt: number
}

interface LivePrices {
  high: number | null
  low: number | null
}

/** True when `volume` items in one window is enough to trust its average price. */
export function windowCounts (volume: number, normalPerHour: number): boolean {
  return volume >= Math.max(MIN_WINDOW_ITEMS, normalPerHour * MIN_WINDOW_SHARE)
}

const positive = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0

/** Worse of a live price and a traded price: lower to sell, higher to buy. */
export function careful (live: number | null, traded: number | null, side: Side): number | null {
  if (!positive(traded)) return positive(live) ? live : null
  if (!positive(live)) return traded
  return side === 'sell' ? Math.min(live, traded) : Math.max(live, traded)
}

/**
 * Prices from the wiki's /1h and /24h averages. A side uses the last hour's
 * average only if that side traded a fair share of a normal hour; otherwise
 * the day's average (volume-weighted, so one print barely moves it). Each is
 * then held to the worse of it and the live price.
 */
export function pricesFromAverages (live: LivePrices, hour: SideAverages | undefined, day: SideAverages | undefined): TradePrices | null {
  if (!day) return null
  const sell = careful(live.high, tradedPrice('sell', hour, day), 'sell')
  const buy = careful(live.low, tradedPrice('buy', hour, day), 'buy')
  return sell !== null && buy !== null ? { buyAt: Math.round(buy), sellAt: Math.round(sell) } : null
}

/**
 * One side's traded price from the /1h and /24h averages: the last hour's
 * average when that side traded a fair share of a normal hour (and at least
 * MIN_WINDOW_ITEMS), otherwise the day's. Shared by picks, the scanner and
 * GE slot advice so they all name the same price. Null when neither traded.
 */
export function tradedPrice (side: Side, hour: SideAverages | undefined, day: SideAverages | undefined): number | null {
  const price = (a: SideAverages | undefined) => (side === 'sell' ? a?.avgHighPrice : a?.avgLowPrice)
  const volume = (a: SideAverages | undefined) => (side === 'sell' ? a?.highPriceVolume : a?.lowPriceVolume) ?? 0
  const hourPrice = price(hour)
  if (positive(hourPrice) && windowCounts(volume(hour), volume(day) / 24)) return hourPrice
  const dayPrice = price(day)
  return positive(dayPrice) ? dayPrice : null
}

function sidePrice (series: readonly SideAverages[], side: Side): number | null {
  const price = (p: SideAverages) => (side === 'sell' ? p.avgHighPrice : p.avgLowPrice)
  const volume = (p: SideAverages) => (side === 'sell' ? p.highPriceVolume : p.lowPriceVolume)
  const normal = series.slice(-NORMAL_HOURS).reduce((sum, p) => sum + volume(p), 0) / Math.min(NORMAL_HOURS, series.length)
  const traded = series
    .slice(-PRICE_WINDOWS)
    .filter(p => positive(price(p)) && windowCounts(volume(p), normal))
    .map(p => price(p) as number)
  return median(traded)
}

/**
 * Prices from an item's hourly series: the median of the last few hours'
 * averages on each side, counting only hours where that side traded a fair
 * share of its normal volume, then the worse of that and the live price.
 * The ask is also capped at `recent` (the last hour's or live price from
 * pricesFromAverages): a median of past hours lags a falling market, and in
 * the backtest asks above the last hour's high were dumped 55% of the time.
 * Null when a side hasn't traded enough recently to name a price.
 */
export function pricesFromSeries (live: LivePrices, series: readonly SideAverages[], recent?: TradePrices): TradePrices | null {
  if (!series.length) return null
  const sell = sidePrice(series, 'sell')
  const buy = sidePrice(series, 'buy')
  if (sell === null || buy === null) return null
  const ask = careful(live.high, sell, 'sell') as number
  return { buyAt: Math.round(careful(live.low, buy, 'buy') as number), sellAt: Math.round(recent ? Math.min(ask, recent.sellAt) : ask) }
}

/** Items traded on both sides over the day. */
export const dayTrades = (day: SideAverages | undefined): number => (day ? day.highPriceVolume + day.lowPriceVolume : 0)

/** Why an offer is too slow: which side, how long, for how many at what price. */
export interface SlowReason {
  side: Side
  hours: number
  qty: number
  price: number
}

export interface FillCheck extends SlotRate {
  /** Null when both offers fill inside the limit. */
  slow: SlowReason | null
}

export interface FillInput extends TradePrices {
  profitEach: number
  qty: number
}

/**
 * Fill times for `qty` at these prices. Slow when the sell takes longer than
 * `maxHours`: that's where spikes hide, and an item you can't sell is stuck
 * in a slot. A slow buy only costs time (outbid a little), so it demotes only
 * when buying then selling takes over MAX_CYCLE_MULTIPLE times `maxHours`.
 */
export function checkFill (flow: MarketFlow, input: FillInput, maxHours: number): FillCheck {
  const rate = slotRate(flow, { buyAt: input.buyAt, sellAt: input.sellAt, profitEach: input.profitEach, qty: input.qty, limit: null })
  const slow: SlowReason | null = rate.sellHours > maxHours
    ? { side: 'sell', hours: rate.sellHours, qty: rate.units, price: input.sellAt }
    : rate.cycleHours > maxHours * MAX_CYCLE_MULTIPLE
      ? { side: 'buy', hours: rate.buyHours, qty: rate.units, price: input.buyAt }
      : null
  return { ...rate, slow }
}

/**
 * The most items that buy and then sell within `hours`, sell side within
 * `maxSellHours`, given the fill rates at `qty`. Fill time grows in step with
 * the amount, so the rates at one amount give the rest. 0 when not even one.
 */
export function fillableQty (rate: SlotRate, hours: number, maxSellHours: number): number {
  if (rate.units <= 0 || !Number.isFinite(rate.cycleHours)) return 0
  const perUnitCycle = rate.cycleHours / rate.units
  const perUnitSell = rate.sellHours / rate.units
  const byCycle = perUnitCycle > 0 ? hours / perUnitCycle : rate.units
  const bySell = perUnitSell > 0 ? maxSellHours / perUnitSell : rate.units
  return Math.max(0, Math.min(rate.units, Math.floor(Math.min(byCycle, bySell))))
}

export function isMaxSellHours (v: unknown): v is number {
  return typeof v === 'number' && (MAX_SELL_HOUR_OPTIONS as readonly number[]).includes(v)
}
