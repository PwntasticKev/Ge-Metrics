// Live advice for one GE offer: is it filling, behind the market, stale, or
// no longer worth it? Pure; callers pass prices, volumes, the time and tax.
//
// Grounded in the 14-day backtest (mcp/reports/backtest-2026-10-26.md):
// realized profit was about half of predicted because offers sat at prices
// the market had left, then got dumped. 4h of patience beat 8h and 12h, and
// asks have to follow a falling market. So:
// - a bid under every recent instant-sell price won't fill: raise it, if the
//   margin survives, else cancel;
// - an ask over the realistic sell price won't fill: lower it or hold;
// - anything up for more than 4h without filling gets relisted.
// "Recent" is the live price and the side's traded price, using the same
// rule as fill-aware picks (fillAware.tradedPrice): the last hour only when
// that side traded a fair share of a normal hour, else the day. The realistic
// price per side is the canonical offer's bulk price (fillAware.bulkSidePrice,
// what lib/offer quotes before history loads), so a slot is never told to
// ask more than Buy now, the scanner or the item sheet would.

import { buyFillHours, flowFromAverages, sellFillHours, type MarketFlow } from '../analytics/fillTime.ts'
import { bulkSidePrice, tradedPrice } from '../fillAware.ts'
import type { AverageLike, TaxOf } from '../analytics/types.ts'
import { gpFull, gpShort, signed, duration } from '../format.ts'
import { remaining, type Slot } from './slots.ts'

/** Past this an offer is stale: relist it (and the buy limit has reset). */
export const STALE_HOURS = 4
const HOUR_MS = 3_600_000

export type AdviceKind = 'filling' | 'raise' | 'lower' | 'relist' | 'cancel' | 'done' | 'unknown'
export const ACTION_KINDS: ReadonlySet<AdviceKind> = new Set(['raise', 'lower', 'relist', 'cancel'])

export interface SidePrices {
  /** Live price, null when missing or too old to trust. */
  live: number | null
  /** Last hour's average if this side traded enough in it, else the day's (fillAware.tradedPrice). */
  traded: number | null
  /** The canonical offer's bulk price for this side: the worse of live and traded. */
  realistic: number | null
}

export interface SlotMarket {
  /** Instant-sell side (wiki "low"): what fills buy offers. */
  low: SidePrices
  /** Instant-buy side (wiki "high"): what fills sell offers. */
  high: SidePrices
  /** Day's per-side flow for fill times (see analytics/fillTime). */
  flow: MarketFlow | null
}

export interface SlotAdvice {
  kind: AdviceKind
  /** Needs the player to do something at the GE. */
  action: boolean
  /** "Behind market", "Filling", ... */
  headline: string
  /** One line: what to do, at what price, and what it's worth. */
  detail: string
  /** Suggested new price each, when there is one. */
  price: number | null
  /** Suggested price minus the current one, per item. */
  delta: number | null
  /** Profit after tax on what's left, at the suggested (or current) price. */
  profit: number | null
  /** Expected hours to fill what's left at the suggested (or current) price. */
  etaHours: number | null
}

export interface AdviceInput {
  slot: Pick<Slot, 'side' | 'price' | 'qty' | 'filled' | 'updatedAt' | 'costBasis' | 'target'>
  market: SlotMarket
  now: number
  taxOf: TaxOf
}

const isPrice = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0
const pricesOf = (side: SidePrices): number[] => [side.live, side.traded].filter(isPrice)
const net = (price: number, taxOf: TaxOf) => price - taxOf(price)

function advice (kind: AdviceKind, headline: string, detail: string, extra: Partial<SlotAdvice> = {}): SlotAdvice {
  return { kind, action: ACTION_KINDS.has(kind), headline, detail, price: null, delta: null, profit: null, etaHours: null, ...extra }
}

/** The fill model, with "recent" meaning the live price and the last hour. */
function recentFlow (flow: MarketFlow | null, lows: number[], highs: number[]): MarketFlow | null {
  return flow ? { ...flow, recentLows: lows, recentHighs: highs } : null
}

const etaText = (hours: number | null) => (hours === null ? '' : Number.isFinite(hours) ? `, ${duration(hours)} left` : ', slow at this price')
const profitText = (profit: number | null, verb = 'still') => (profit === null ? '' : profit >= 0 ? `, ${verb} ${signed(profit)} profit` : `, ${gpShort(-profit)} under cost`)

/**
 * The cheapest (buy) or dearest (sell) of the candidate prices that fills
 * within the stale window; the most competitive one when none do.
 */
function pickPrice (candidates: number[], etaOf: (p: number) => number | null): { price: number; eta: number | null } {
  for (const price of candidates) {
    const eta = etaOf(price)
    if (eta !== null && eta <= STALE_HOURS) return { price, eta }
  }
  const price = candidates[candidates.length - 1]
  return { price, eta: etaOf(price) }
}

function buyAdvice ({ slot, market, now, taxOf }: AdviceInput, left: number): SlotAdvice {
  const lows = pricesOf(market.low)
  const highs = pricesOf(market.high)
  if (!lows.length) return advice('unknown', 'No recent trades', 'Nothing sold into buy offers lately to compare with.')
  // What you can sell for: the realistic ask (worse of live and traded), then the pick's plan.
  const sellAt = market.high.realistic ?? slot.target
  const profitEach = (bid: number) => (sellAt ? net(sellAt, taxOf) - bid : null)
  const flow = recentFlow(market.flow, lows, highs)
  const etaOf = (bid: number) => (flow ? buyFillHours(flow, bid, left) : null)
  const totalAt = (bid: number) => { const each = profitEach(bid); return each === null ? null : each * left }
  const sellText = sellAt ? `Sells for ${gpFull(sellAt)} now` : 'No sell price'

  const current = profitEach(slot.price)
  if (current !== null && current <= 0) {
    return advice('cancel', 'Margin gone', `Cancel. ${sellText}, ${signed(current)} each after tax at your bid.`, { profit: current * left })
  }

  const floor = Math.min(...lows)
  const candidates = [...new Set([floor, Math.max(...lows)])].sort((a, b) => a - b)
  const behind = slot.price < floor
  const stale = now - slot.updatedAt > STALE_HOURS * HOUR_MS
  if (behind || stale) {
    const pick = pickPrice(candidates.filter(p => p > slot.price || !behind), etaOf)
    const price = Math.max(pick.price, slot.price)
    const each = profitEach(price)
    if (each !== null && each <= 0) {
      return advice('cancel', 'Margin gone', `Cancel. Buyers pay ${gpFull(price)}; ${sellText.toLowerCase()}, nothing left after tax.`, { price, profit: each * left })
    }
    const profit = totalAt(price)
    const eta = price === pick.price ? pick.eta : etaOf(price)
    if (behind) {
      const delta = price - slot.price
      return advice('raise', 'Behind market', `Raise to ${gpFull(price)} (+${gpFull(delta)} each)${profitText(profit)}.`, { price, delta, profit, etaHours: eta })
    }
    const hours = Math.floor((now - slot.updatedAt) / HOUR_MS)
    const at = price === slot.price ? `at ${gpFull(price)}` : `at ${gpFull(price)} (+${gpFull(price - slot.price)} each)`
    return advice('relist', `Stale ${hours}h`, `Relist ${at}${profitText(profit)}. Your buy limit has reset too.`, { price, delta: price - slot.price, profit, etaHours: eta })
  }

  const eta = etaOf(slot.price)
  return advice('filling', 'Filling', `Bid is in the market${etaText(eta)}${profitText(totalAt(slot.price), 'about')}.`, { profit: totalAt(slot.price), etaHours: eta })
}

function sellAdvice ({ slot, market, now, taxOf }: AdviceInput, left: number): SlotAdvice {
  const highs = pricesOf(market.high)
  const lows = pricesOf(market.low)
  if (!highs.length) return advice('unknown', 'No recent trades', 'Nobody bought from sell offers lately to compare with.')
  const profitAt = (ask: number) => (slot.costBasis ? (net(ask, taxOf) - slot.costBasis) * left : null)
  const flow = recentFlow(market.flow, lows, highs)
  const etaOf = (ask: number) => (flow ? sellFillHours(flow, ask, left) : null)

  // The realistic ask: the worse of live and traded, same as picks quote.
  const ask = market.high.realistic as number
  const above = slot.price > ask
  const stale = now - slot.updatedAt > STALE_HOURS * HOUR_MS
  if (above || stale) {
    const price = Math.min(ask, slot.price)
    const profit = profitAt(price)
    const eta = etaOf(price)
    const delta = price - slot.price
    const change = delta ? ` (${gpFull(delta)} each)` : ''
    if (above) {
      // Live high under the traded price: the market is sliding.
      const fell = market.high.live !== null && market.high.traded !== null && market.high.live < market.high.traded
      return advice('lower', fell ? 'Market fell' : 'Above market', `Lower ask to ${gpFull(price)}${change}${profitText(profit)}, or hold.`, { price, delta, profit, etaHours: eta })
    }
    const hours = Math.floor((now - slot.updatedAt) / HOUR_MS)
    return advice('relist', `Stale ${hours}h`, `Relist at ${gpFull(price)}${change}${profitText(profit)}.`, { price, delta, profit, etaHours: eta })
  }

  const eta = etaOf(slot.price)
  const profit = profitAt(slot.price)
  return advice('filling', 'Filling', `Ask is in the market${etaText(eta)}${profitText(profit, 'about')}.`, { profit, etaHours: eta })
}

export function slotAdvice (input: AdviceInput): SlotAdvice {
  const left = remaining(input.slot)
  if (left <= 0) return advice('done', 'Filled', input.slot.side === 'buy' ? 'Collect from the GE. It\'s on your Bought list.' : 'Collect your coins and close the slot.')
  return input.slot.side === 'buy' ? buyAdvice(input, left) : sellAdvice(input, left)
}

/** A live price older than this isn't "the market now" (same cut-off as alerts). */
export const LIVE_STALE_MS = 6 * HOUR_MS

export interface LiveLike {
  high: number | null
  low: number | null
  /** Seconds since epoch, as the wiki sends them. */
  highTime: number | null
  lowTime: number | null
}


const fresh = (price: number | null, timeSec: number | null, now: number): number | null =>
  isPrice(price) && (timeSec === null || now - timeSec * 1000 <= LIVE_STALE_MS) ? price : null

/** Builds the per-side view advice needs from the live price, the /1h and /24h averages and a flow. */
export function slotMarket (live: LiveLike | null, hour: AverageLike | undefined, day: AverageLike | undefined, flow: MarketFlow | null, now: number): SlotMarket {
  const side = (which: 'buy' | 'sell', price: number | null): SidePrices => ({
    live: price,
    traded: tradedPrice(which, hour, day),
    realistic: bulkSidePrice(which, price, hour, day)
  })
  return {
    low: side('buy', live ? fresh(live.low, live.lowTime, now) : null),
    high: side('sell', live ? fresh(live.high, live.highTime, now) : null),
    flow
  }
}

export interface LivePrices {
  live: (itemId: number) => LiveLike | null
  h1: Readonly<Record<string, AverageLike | undefined>> | undefined
  h24: Readonly<Record<string, AverageLike | undefined>> | undefined
}

/** Advice for a slot from the live prices and the /1h and /24h averages. */
export function adviceFromPrices (slot: Slot, prices: LivePrices, now: number, taxOf: (price: number, itemId: number) => number): SlotAdvice {
  const key = String(slot.itemId)
  const hour = prices.h1?.[key]
  const day = prices.h24?.[key]
  const market = slotMarket(prices.live(slot.itemId), hour, day, flowFromAverages(hour, day), now)
  return slotAdvice({ slot, market, now, taxOf: price => taxOf(price, slot.itemId) })
}
