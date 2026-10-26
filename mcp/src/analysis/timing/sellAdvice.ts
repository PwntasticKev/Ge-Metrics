// For something you hold: sell now at the instant-sell price, or list it at
// the day's typical high and wait? Ported from mobile/src/lib/analytics/sellAdvice.ts.

import { type MarketFlow, sellFillHours } from './fillTime.js'

/** Past this wait, listing isn't a plan, it's a hope. */
export const MAX_LIST_WAIT_HOURS = 12

export type TaxOf = (price: number) => number

export interface SellAdvice {
  /** Instant-sell price: what buy offers pay right now. */
  readonly nowPrice: number
  /** The 24h typical high (a live high above it is usually one lucky trade). */
  readonly listPrice: number
  readonly waitHours: number
  /** Extra gp for the whole holding, after tax, from listing instead. */
  readonly extraGp: number
  readonly verdict: 'sell-now' | 'list'
}

export interface SellInput {
  readonly qty: number
  readonly instantSell: number | null
  readonly instantBuy: number | null
  readonly dayHigh: number | null
  readonly flow: MarketFlow | null
  readonly taxOf: TaxOf
}

export function sellAdvice ({ qty, instantSell, instantBuy, dayHigh, flow, taxOf }: SellInput): SellAdvice | null {
  if (!instantSell || qty <= 0) return null
  const listPrice = dayHigh ?? instantBuy ?? 0
  if (!listPrice || !flow) return null
  const net = (price: number) => price - taxOf(price)
  const extraGp = (net(listPrice) - net(instantSell)) * qty
  const waitHours = sellFillHours(flow, listPrice, qty)
  const verdict = extraGp > 0 && waitHours <= MAX_LIST_WAIT_HOURS ? 'list' : 'sell-now'
  return { nowPrice: instantSell, listPrice, waitHours, extraGp, verdict }
}
