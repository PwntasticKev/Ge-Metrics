// Buy now, fill-aware. The engine's picks already quote the careful price
// (worse of live and last-hour) and size amounts to 1/6 of a day's volume,
// but "trades 6× your amount a day" still lets an offer sit for days when the
// price is above most of the day's trades. Here each pick is sized to what
// the fill-time model says buys and then sells within its horizon, and picks
// that can't fill even one item in time move to "Slow to fill". Potential
// becomes expected profit over the horizon, so ranking and the cash plan
// weigh fill time, not raw margin. Pure.
import type { BuyPick, WikiAverage } from '@ge/engine'
import { flowFromAverages, slotRate, type SlotRate } from './analytics/fillTime.ts'
import { dayTrades, fillableQty, MIN_DAY_TRADES, type SlowReason } from './fillAware.ts'

/**
 * Hours each list's offers have to buy and sell. Next 4 hours and Plan size
 * for 2h: in a 60-day walk-forward (26 out-of-sample folds, PR #33,
 * mcp/reports/walk-forward-2026-10-26.md) 2h instead of 4h added +16.9M,
 * won 19/26 test windows and cut losing picks from 22% to 16%. Dips keep 4h
 * and Overnight 8h: re-tuning those didn't beat them out of sample.
 */
export const PICK_HORIZON_HOURS = { quick: 2, plan: 2, dips: 4, overnight: 8 } as const
export type HorizonMode = keyof typeof PICK_HORIZON_HOURS

export interface SlowPick {
  pick: BuyPick
  rate: SlotRate
  reason: SlowReason
}

export interface PickLists {
  /** Sized to fill in time; most expected profit first. */
  picks: BuyPick[]
  slow: SlowPick[]
}

const resize = (pick: BuyPick, qty: number): BuyPick =>
  Object.freeze({ ...pick, maxQty: qty, potential: pick.profit * qty, cost: pick.buyAt * qty })

/** The slower side is why it misses the window. */
function slowReason (rate: SlotRate, pick: BuyPick): SlowReason {
  return rate.sellHours >= rate.buyHours
    ? { side: 'sell', hours: rate.sellHours, qty: rate.units, price: pick.sellAt }
    : { side: 'buy', hours: rate.buyHours, qty: rate.units, price: pick.buyAt }
}

type Averages = Record<string, WikiAverage> | undefined
export interface FillOptions {
  /** Hours to buy and then sell. */
  horizon: number
  /** Hours the sell may take. */
  maxSellHours: number
}

/**
 * Size every pick to what fills inside `horizon` hours (sell side inside
 * `maxSellHours`). Items trading under MIN_DAY_TRADES a day, or without
 * flow data, are left out.
 */
export function fillAwarePicks (picks: readonly BuyPick[], h1: Averages, h24: Averages, { horizon, maxSellHours }: FillOptions): PickLists {
  const kept: BuyPick[] = []
  const slow: SlowPick[] = []
  for (const pick of picks) {
    if (dayTrades(h24?.[pick.id]) < MIN_DAY_TRADES) continue
    const flow = flowFromAverages(h1?.[pick.id], h24?.[pick.id])
    if (!flow) continue
    const rate = slotRate(flow, { buyAt: pick.buyAt, sellAt: pick.sellAt, profitEach: pick.profit, qty: pick.maxQty, limit: null })
    const qty = fillableQty(rate, horizon, Math.min(horizon, maxSellHours))
    if (qty < 1) slow.push({ pick, rate, reason: slowReason(rate, pick) })
    else kept.push(qty < pick.maxQty ? resize(pick, qty) : pick)
  }
  return {
    picks: kept.sort((a, b) => b.potential - a.potential),
    slow: slow.sort((a, b) => a.reason.hours - b.reason.hours)
  }
}
