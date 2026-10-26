// Buy now, fill-aware. The engine's rankers pick the candidates; every
// number on a row (prices, amount, profit, fill time) then comes from the
// canonical offer (lib/offer), so a row matches the item sheet, the scanner
// and the share card. Next 4 hours and Plan use the realistic prices; Dips
// and Overnight keep their strategy prices as the offer's quote. Picks that
// can't fill even one item in time move to "Slow to fill". Pure.
import type { BuyPick } from '@ge/engine'
import type { SlotRate } from './analytics/fillTime.ts'
import type { TimeseriesPoint } from './analytics/types.ts'
import { dayTrades, MIN_DAY_TRADES, type SlowReason } from './fillAware.ts'
import { offerForQty, realisticOffer, type OfferItem, type RealisticOffer, type TaxOfItem } from './offer.ts'
import type { SideAverages } from './scanMath.ts'

/**
 * Hours each list's offers have to buy and sell. Next 4 hours and Plan size
 * for 2h: in a 60-day walk-forward (26 out-of-sample folds, PR #33,
 * mcp/reports/walk-forward-2026-10-26.md) 2h instead of 4h added +16.9M,
 * won 19/26 test windows and cut losing picks from 22% to 16%. Dips keep 4h
 * and Overnight 8h: re-tuning those didn't beat them out of sample.
 */
export const PICK_HORIZON_HOURS = { quick: 2, plan: 2, dips: 4, overnight: 8 } as const
export type HorizonMode = keyof typeof PICK_HORIZON_HOURS

/** Lists whose prices are the strategy's own (the offer's quote). */
const QUOTED: ReadonlySet<HorizonMode> = new Set(['dips', 'overnight'])

/** A Buy now pick with the canonical offer behind its numbers. */
export interface OfferPick extends BuyPick {
  readonly offer: RealisticOffer
}

export interface SlowPick {
  pick: OfferPick
  rate: SlotRate
  reason: SlowReason
}

export interface PickLists {
  /** Sized to fill in time; most expected profit first. */
  picks: OfferPick[]
  slow: SlowPick[]
}

type Averages = Readonly<Record<string, SideAverages | undefined>> | undefined

export interface PickContext {
  h1: Averages
  h24: Averages
  /** Live prices and buy limit; null drops the pick. */
  itemOf: (id: number) => OfferItem | null
  /** An item's 1h series once loaded (refined); undefined keeps the estimate. */
  seriesOf?: (id: number) => readonly TimeseriesPoint[] | undefined
  tax: TaxOfItem
  /** Settings: cash per 4h; null = no limit. */
  budget: number | null
}

export interface FillOptions {
  mode: HorizonMode
  /** Settings: hours the sell may take. */
  maxSellHours: number
}

/** The pick with the offer's numbers, for `qty` items. */
export function pickFromOffer (pick: BuyPick, offer: RealisticOffer, qty = offer.qty): OfferPick {
  const sized = offerForQty(offer, qty)
  return Object.freeze({
    ...pick,
    buyAt: offer.buyAt,
    sellAt: offer.sellAt,
    tax: offer.tax,
    profit: offer.margin,
    roi: offer.roi,
    maxQty: qty,
    potential: offer.margin * qty,
    cost: offer.buyAt * qty,
    offer: sized
  })
}

/** The canonical offer for one ranked pick. */
export function offerOfPick (pick: BuyPick, ctx: PickContext, { mode, maxSellHours }: FillOptions): RealisticOffer | null {
  const item = ctx.itemOf(pick.id)
  if (!item) return null
  return realisticOffer({
    item,
    hour: ctx.h1?.[pick.id],
    day: ctx.h24?.[pick.id],
    series: ctx.seriesOf?.(pick.id),
    quote: QUOTED.has(mode) ? { buyAt: pick.buyAt, sellAt: pick.sellAt } : undefined,
    horizon: PICK_HORIZON_HOURS[mode],
    maxSellHours,
    budget: ctx.budget,
    tax: ctx.tax
  })
}

/**
 * Every pick as its canonical offer. Items trading under MIN_DAY_TRADES a
 * day, without flow data, or with no margin at realistic prices are left out.
 */
export function fillAwarePicks (picks: readonly BuyPick[], ctx: PickContext, options: FillOptions): PickLists {
  const kept: OfferPick[] = []
  const slow: SlowPick[] = []
  for (const pick of picks) {
    if (dayTrades(ctx.h24?.[pick.id]) < MIN_DAY_TRADES) continue
    const offer = offerOfPick(pick, ctx, options)
    if (!offer || !offer.rate || offer.margin <= 0) continue
    if (offer.qty >= 1) kept.push(pickFromOffer(pick, offer))
    else if (offer.slow) slow.push({ pick: pickFromOffer(pick, offer, offer.rate.units), rate: offer.rate, reason: offer.slow })
  }
  return {
    picks: kept.sort((a, b) => b.potential - a.potential),
    slow: slow.sort((a, b) => a.reason.hours - b.reason.hours)
  }
}
