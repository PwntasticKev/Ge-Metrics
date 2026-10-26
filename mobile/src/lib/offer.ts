// The one realistic offer. Every surface that names a price, an amount or a
// profit for flipping an item (Buy now and Plan, the scanner, the item sheet,
// the share card, the widget's picks) gets it from realisticOffer, so the
// same item shows the same numbers everywhere for the same inputs.
//
// Input contract:
// - bulk-only (no `series`): the fast first pass from the wiki's /1h and /24h
//   averages, good enough to rank thousands of items. Marked `refined: false`;
//   screens show it as an estimate.
// - refined (`series` given): the item's 1h history sets the prices (median
//   of recent hours that traded with volume, ask capped at the bulk price)
//   and the fill-time flow. `refined: true`.
// A strategy that targets other prices (Overnight: the day's typical low and
// high; Dips: the day's middle) passes them as `quote`; amount, fill time and
// profit still come from here.
//
// Amount: one buy limit per 4h of horizon, no more than the cash buys, no
// more than the thinner side trades in max(horizon, 4h) (the engine's "each
// side trades 6x your amount a day" for a 4h window), then cut to what buys
// and sells inside the horizon, sell side inside the trader's "slowest sell".
// Pure; tax is passed in.
import { BUY_LIMIT_HOURS, flowFromAverages, flowFromSeries, slotRate, type MarketFlow, type SlotRate } from './analytics/fillTime.ts'
import type { TimeseriesPoint } from './analytics/types.ts'
import { dayTrades, fillableQty, MIN_DAY_TRADES, pricesFromAverages, pricesFromSeries, type SlowReason, type TradePrices } from './fillAware.ts'
import { pickSlowText } from './fillText.ts'
import type { SideAverages } from './scanMath.ts'

/** Hours of series behind the fill-time flow. */
export const FLOW_HOURS = 24
/** The engine's buy limit for items whose limit is unknown (market.js ASSUMED_BUY_LIMIT). */
export const ASSUMED_BUY_LIMIT = 8
const DAY_HOURS = 24

export type TaxOfItem = (sellPrice: number, itemId: number) => number

export interface OfferItem {
  id: number
  /** Live instant-buy and instant-sell prices. */
  high: number | null
  low: number | null
  /** Buy limit per 4 hours; null when unknown (ASSUMED_BUY_LIMIT is used). */
  limit: number | null
}

export interface OfferInput {
  item: OfferItem
  hour: SideAverages | undefined
  day: SideAverages | undefined
  /** The item's 1h series once loaded; present means refined. */
  series?: readonly TimeseriesPoint[]
  /** Strategy prices to use instead of the realistic ones. */
  quote?: TradePrices
  /** Hours to buy and then sell. */
  horizon: number
  /** Settings: slowest sell to show. */
  maxSellHours: number
  /** Settings: cash per 4h; null = no limit. */
  budget: number | null
  tax: TaxOfItem
}

export interface RealisticOffer extends TradePrices {
  itemId: number
  tax: number
  /** Margin per item after tax at these prices. */
  margin: number
  roi: number
  /** Items that buy and then sell inside the horizon; 0 when not even one. */
  qty: number
  /** margin × qty. */
  profit: number
  /** buyAt × qty. */
  cost: number
  /** Hours to buy and then sell `qty`; null when unknown or qty is 0. */
  fillHours: number | null
  /** Fill times for `qty` (for the starting amount when qty is 0); null without flow. */
  rate: SlotRate | null
  /** Why not even one fills in time (the slower side); null when qty ≥ 1 or unknown. */
  slow: SlowReason | null
  /** The same in words; null when qty ≥ 1 or unknown. */
  slowText: string | null
  /** True once the item's hourly history set prices and flow; false = estimate. */
  refined: boolean
  /** Where the prices came from. */
  basis: 'series' | 'averages' | 'quote'
  /** Under MIN_DAY_TRADES a day: Buy now and the scanner leave it out. */
  thin: boolean
  dayTrades: number
  horizon: number
  /** The flow behind the fill times; null without one. */
  flow: MarketFlow | null
}

/** Bulk prices, refined by the series when it can name both sides; or the strategy's quote. */
function offerPrices (input: OfferInput): { prices: TradePrices; basis: RealisticOffer['basis'] } | null {
  if (input.quote) return { prices: input.quote, basis: 'quote' }
  const recent = pricesFromAverages(input.item, input.hour, input.day)
  const fromSeries = input.series?.length ? pricesFromSeries(input.item, input.series, recent ?? undefined) : null
  if (fromSeries) return { prices: fromSeries, basis: 'series' }
  return recent ? { prices: recent, basis: 'averages' } : null
}

function offerFlow (input: OfferInput): MarketFlow | null {
  const fromSeries = input.series?.length ? flowFromSeries(input.series, FLOW_HOURS) : null
  return fromSeries ?? flowFromAverages(input.hour, input.day)
}

/** Most items the horizon may start with: buy limits, cash and the thinner side's volume. */
export function startingQty (input: Pick<OfferInput, 'item' | 'day' | 'budget' | 'horizon'>, buyAt: number): number {
  const limit = Math.max(1, input.item.limit ?? ASSUMED_BUY_LIMIT)
  const byLimit = limit * Math.max(1, Math.ceil(input.horizon / BUY_LIMIT_HOURS))
  const byCash = input.budget && buyAt > 0 ? Math.floor(input.budget / buyAt) : Infinity
  const side = input.day ? Math.min(input.day.lowPriceVolume, input.day.highPriceVolume) : 0
  const byVolume = Math.floor(side * Math.max(input.horizon, BUY_LIMIT_HOURS) / DAY_HOURS)
  return Math.max(0, Math.min(byLimit, byCash, byVolume))
}

/** The slower side is why it misses the window. */
function slowReason (rate: SlotRate, prices: TradePrices): SlowReason {
  return rate.sellHours >= rate.buyHours
    ? { side: 'sell', hours: rate.sellHours, qty: rate.units, price: prices.sellAt }
    : { side: 'buy', hours: rate.buyHours, qty: rate.units, price: prices.buyAt }
}

/** Null when a side hasn't traded enough to name a realistic price. */
export function realisticOffer (input: OfferInput): RealisticOffer | null {
  const priced = offerPrices(input)
  if (!priced) return null
  const { buyAt, sellAt } = priced.prices
  const tax = input.tax(sellAt, input.item.id)
  const margin = sellAt - buyAt - tax
  const trades = dayTrades(input.day)
  const base = {
    itemId: input.item.id, buyAt, sellAt, tax, margin, roi: buyAt > 0 ? margin / buyAt : 0,
    refined: Boolean(input.series?.length), basis: priced.basis, thin: trades < MIN_DAY_TRADES, dayTrades: trades, horizon: input.horizon
  }
  const none = { qty: 0, profit: 0, cost: 0, fillHours: null, slow: null, slowText: null }

  const flow = offerFlow(input)
  const start = startingQty(input, buyAt)
  if (!flow || start < 1) return { ...base, ...none, rate: null, flow }
  const full = slotRate(flow, { buyAt, sellAt, profitEach: margin, qty: start, limit: null })
  const qty = fillableQty(full, input.horizon, Math.min(input.horizon, input.maxSellHours))
  if (qty < 1) return { ...base, ...none, rate: full, slow: slowReason(full, priced.prices), slowText: pickSlowText(full, input.horizon), flow }
  const rate = qty === full.units ? full : slotRate(flow, { buyAt, sellAt, profitEach: margin, qty, limit: null })
  return { ...base, qty, profit: margin * qty, cost: buyAt * qty, fillHours: rate.cycleHours, rate, slow: null, slowText: null, flow }
}

/**
 * The same offer for fewer items (the cash plan splits cash across slots):
 * prices and margin unchanged, amount, profit and fill times at `qty`.
 */
export function offerForQty (offer: RealisticOffer, qty: number): RealisticOffer {
  const units = Math.max(0, Math.floor(qty))
  if (units === offer.qty || units < 1) return offer
  const rate = offer.flow ? slotRate(offer.flow, { buyAt: offer.buyAt, sellAt: offer.sellAt, profitEach: offer.margin, qty: units, limit: null }) : null
  return { ...offer, qty: units, profit: offer.margin * units, cost: offer.buyAt * units, rate, fillHours: rate?.cycleHours ?? null }
}
