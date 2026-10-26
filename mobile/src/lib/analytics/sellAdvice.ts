// For something you hold: sell now at the instant-sell price, or list it at
// the day's typical high and wait? Shows both and how long the wait is.

import { sellFillHours, type MarketFlow } from './fillTime.ts'
import type { TaxOf } from './types.ts'

/** Past this wait, listing isn't a plan, it's a hope. */
export const MAX_LIST_WAIT_HOURS = 12

export interface SellAdvice {
  /** Instant-sell price: what buy offers pay right now. */
  nowPrice: number
  /**
   * Price to list at: the 24h typical high. A live high above it is usually
   * one lucky trade, so it isn't chased; it's only used when there's no day high.
   */
  listPrice: number
  /** Expected hours for the listing to fill. */
  waitHours: number
  /** Extra GP for the whole holding, after tax, from listing instead. */
  extraGp: number
  verdict: 'sell-now' | 'list'
}

export interface SellInput {
  qty: number
  /** Live instant-sell price (wiki "low"). */
  instantSell: number | null
  /** Live instant-buy price (wiki "high"). */
  instantBuy: number | null
  /** Typical high over the last 24h. */
  dayHigh: number | null
  flow: MarketFlow | null
  taxOf: TaxOf
}

export function sellAdvice (input: SellInput): SellAdvice | null {
  const { qty, instantSell, instantBuy, dayHigh, flow, taxOf } = input
  if (!instantSell || qty <= 0) return null
  const listPrice = dayHigh ?? instantBuy ?? 0
  if (!listPrice || !flow) return null
  const net = (price: number) => price - taxOf(price)
  const extraGp = (net(listPrice) - net(instantSell)) * qty
  const waitHours = sellFillHours(flow, listPrice, qty)
  const verdict = extraGp > 0 && waitHours <= MAX_LIST_WAIT_HOURS ? 'list' : 'sell-now'
  return { nowPrice: instantSell, listPrice, waitHours, extraGp, verdict }
}
