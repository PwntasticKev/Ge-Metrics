// The item sheet's realistic flip: the same fill-aware rules as Buy now, the
// scanner and GE slots, for one item.
// - Prices: with the item's hourly series, the median of the last few hours
//   where each side traded a fair share of a normal hour, ask capped at the
//   last hour's (or live) price; without it, the last hour's or day's
//   averages (fillAware). Each side is held to the worse of that and live.
// - Amount: one buy limit (and no more than the cash setting buys), cut to
//   what buys and then sells inside the window, sell side inside the
//   trader's "slowest sell" setting (pickFill).
// The engine's instant prices (live low and high) stay alongside as the
// secondary numbers. Pure; tax is passed in.
import { flowFromAverages, flowFromSeries, slotRate, type MarketFlow, type SlotRate } from './analytics/fillTime.ts'
import type { TimeseriesPoint } from './analytics/types.ts'
import { dayTrades, fillableQty, MIN_DAY_TRADES, pricesFromAverages, pricesFromSeries, type TradePrices } from './fillAware.ts'
import { pickSlowText } from './fillText.ts'
import { PICK_HORIZON_HOURS } from './pickFill.ts'
import type { SideAverages } from './scanMath.ts'
import { FLOW_HOURS } from './spreadFill.ts'

/** Hours a sheet's offers have to buy and sell: the same as Next 4 hours (2h, see pickFill). */
export const SHEET_HORIZON_HOURS = PICK_HORIZON_HOURS.quick

export type TaxOfItem = (sellPrice: number, itemId: number) => number

export interface SheetItem {
  id: number
  /** Live instant-buy and instant-sell prices. */
  high: number | null
  low: number | null
  /** Buy limit per 4 hours (the engine's assumed limit when unknown). */
  limit: number
}

export interface SheetFillInput {
  item: SheetItem
  hour: SideAverages | undefined
  day: SideAverages | undefined
  /** The item's 1h series once loaded. */
  series?: readonly TimeseriesPoint[]
  /** Settings: slowest sell to show, and cash per 4h (null = no limit). */
  maxSellHours: number
  budget: number | null
  tax: TaxOfItem
  horizon?: number
}

export interface SheetFill extends TradePrices {
  tax: number
  /** Margin per item after tax at these prices. */
  margin: number
  roi: number
  /** 'series' once the hourly history set the prices. */
  basis: 'series' | 'averages'
  /** Items that buy and then sell inside the window; 0 when not even one. */
  qty: number
  /** margin × qty. */
  profit: number
  /** Fill times for `qty` (for one buy limit when qty is 0); null without flow. */
  rate: SlotRate | null
  /** Why not even one fills in time; null when qty ≥ 1. */
  slow: string | null
  /** Under MIN_DAY_TRADES a day: Buy now and the scanner leave it out. */
  thin: boolean
  dayTrades: number
}

function realisticPrices (input: SheetFillInput): { prices: TradePrices; basis: SheetFill['basis'] } | null {
  const recent = pricesFromAverages(input.item, input.hour, input.day)
  const fromSeries = input.series?.length ? pricesFromSeries(input.item, input.series, recent ?? undefined) : null
  if (fromSeries) return { prices: fromSeries, basis: 'series' }
  return recent ? { prices: recent, basis: 'averages' } : null
}

function flowOf (input: SheetFillInput): MarketFlow | null {
  const fromSeries = input.series?.length ? flowFromSeries(input.series, FLOW_HOURS) : null
  return fromSeries ?? flowFromAverages(input.hour, input.day)
}

/** Most items one window may start with: a buy limit, or what the cash buys. */
function startingQty (limit: number, buyAt: number, budget: number | null): number {
  const byCash = budget && buyAt > 0 ? Math.floor(budget / buyAt) : Infinity
  return Math.max(0, Math.min(Math.max(1, limit), byCash))
}

/** Null when a side hasn't traded enough to name a realistic price. */
export function sheetFill (input: SheetFillInput): SheetFill | null {
  const priced = realisticPrices(input)
  if (!priced) return null
  const { buyAt, sellAt } = priced.prices
  const tax = input.tax(sellAt, input.item.id)
  const margin = sellAt - buyAt - tax
  const horizon = input.horizon ?? SHEET_HORIZON_HOURS
  const trades = dayTrades(input.day)
  const base = { buyAt, sellAt, tax, margin, roi: buyAt > 0 ? margin / buyAt : 0, basis: priced.basis, thin: trades < MIN_DAY_TRADES, dayTrades: trades }

  const flow = flowOf(input)
  const start = startingQty(input.item.limit, buyAt, input.budget)
  if (!flow || start < 1) return { ...base, qty: 0, profit: 0, rate: null, slow: null }
  const full = slotRate(flow, { buyAt, sellAt, profitEach: margin, qty: start, limit: null })
  const qty = fillableQty(full, horizon, Math.min(horizon, input.maxSellHours))
  if (qty < 1) return { ...base, qty: 0, profit: 0, rate: full, slow: pickSlowText(full, horizon) }
  const rate = qty === full.units ? full : slotRate(flow, { buyAt, sellAt, profitEach: margin, qty, limit: null })
  return { ...base, qty, profit: margin * qty, rate, slow: null }
}
