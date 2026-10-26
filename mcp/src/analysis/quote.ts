// The flipper's view of one item's live price: buy at the insta-sell price
// (low), sell at the insta-buy price (high), pay GE tax on the sale.

import { geTax } from '@ge/engine'
import type { LatestPrice } from '../wiki/types.js'
import { pct } from './format.js'

export interface Quote {
  readonly buyAt: number | null
  readonly sellAt: number | null
  readonly tax: number | null
  readonly margin: number | null
  readonly roiPct: number | null
}

export function quote (id: number, latest: LatestPrice | undefined): Quote {
  const buyAt = latest?.low ?? null
  const sellAt = latest?.high ?? null
  if (buyAt === null || sellAt === null) return { buyAt, sellAt, tax: null, margin: null, roiPct: null }
  const tax = geTax(sellAt, id)
  const margin = sellAt - buyAt - tax
  return { buyAt, sellAt, tax, margin, roiPct: buyAt > 0 ? pct(margin / buyAt) : null }
}
