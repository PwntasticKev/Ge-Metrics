import type { Market, ProcessRecipe } from '@ge/engine'
import { geTax } from '../../../src/domain/flipping/geTax.js'

export type PriceFloorReason = 'missing-quote' | 'invalid-value' | 'no-feasible-safe-price' | 'unsupported-circular-item'
export interface OutputPriceFloor {
  id: number
  quantity: number
  currentQuote: number | null
  floor: number | null
  /** Current selected (possibly fractional) quote minus the whole-GP floor. Negative means a raise is needed. */
  headroom: number | null
  reason: PriceFloorReason | null
}
export interface ProcessingPriceFloors {
  assumption: 'input-quotes-and-other-output-quotes-held-fixed'
  outputs: OutputPriceFloor[]
}
const safe = (n: number) => Number.isFinite(n) && n >= 0 && n <= Number.MAX_SAFE_INTEGER
const sum = (values: number[]): number | null => {
  let total = 0
  for (const value of values) {
    total += value
    if (!safe(value) || !safe(total)) return null
  }
  return total
}

/**
 * One action, all inputs purchased, using labMarket's selected low/high quotes.
 * Repeated output IDs vary together, but arithmetic retains canonical row order.
 * Zero is a mathematical floor, evaluated directly because the engine rejects
 * zero quotes. Missing current quotes remain unknown, including the varied leg.
 * A result certifies the first whole-GP price in the safe arithmetic domain.
 */
export function processingPriceFloors (recipe: ProcessRecipe, market: Market): ProcessingPriceFloors {
  const quantities = new Map<number, number>()
  for (const row of recipe.outputs) quantities.set(row.id, (quantities.get(row.id) ?? 0) + row.qty)
  const outputs = recipe.outputs.map(row => ({ ...row, price: market.get(row.id)?.high ?? null }))
  const inputs = recipe.inputs.map(row => ({ ...row, price: market.get(row.id)?.low ?? null }))
  const coinCost = recipe.coinCost ?? 0
  const coinRevenue = recipe.coinRevenue ?? 0
  const buys = sum(inputs.map(row => row.qty * (row.price ?? 0)))
  const cost = buys === null ? NaN : buys + coinCost
  const invalid = [...inputs, ...outputs].some(row => !safe(row.qty) || row.qty <= 0 || (row.price !== null && (!safe(row.price) || row.price <= 0)))
    || [...quantities.values()].some(qty => !safe(qty) || qty <= 0)
    || !safe(coinCost) || !safe(coinRevenue) || !safe(cost)
  const missing = [...inputs, ...outputs].some(row => row.price === null)
  const rows = [...quantities].map(([id, quantity]): OutputPriceFloor => {
    const currentQuote = market.get(id)?.high ?? null
    const base = { id, quantity, currentQuote }
    const fail = (reason: PriceFloorReason): OutputPriceFloor => ({ ...base, floor: null, headroom: null, reason })
    if (invalid) return fail('invalid-value')
    if (missing) return fail('missing-quote')
    if (inputs.some(row => row.id === id)) return fail('unsupported-circular-item')
    const amountsAt = (price: number) => {
      const sales = sum(outputs.map(row => row.qty * (row.id === id ? price : row.price!)))
      const tax = sum(outputs.map(row => geTax(row.id === id ? price : row.price!, row.id) * row.qty))
      const revenue = sales === null ? NaN : sales + coinRevenue
      return safe(revenue) && tax !== null ? { revenue, tax } : null
    }
    const profitAt = (price: number): number | null => {
      const amounts = amountsAt(price)
      return amounts === null ? null : amounts.revenue - cost - amounts.tax
    }
    if (amountsAt(currentQuote!) === null) return fail('invalid-value')
    if (amountsAt(0) === null) return fail('invalid-value')
    // Find the largest safe quote first. Unsafe arithmetic is never evidence
    // that a candidate is profitable (nor evidence of a negative profit).
    let last = Number.MAX_SAFE_INTEGER
    if (amountsAt(last) === null) {
      let low = 0
      let high = last
      while (high - low > 1) {
        const mid = low + Math.floor((high - low) / 2)
        if (amountsAt(mid) === null) high = mid
        else low = mid
      }
      last = low
    }
    // Within a tax plateau, canonical revenue/profit are monotone. Across tax
    // stairs, floating-point rounding can produce tiny dips. Search intervals
    // left-first with a conservative upper bound instead of assuming globally
    // monotone rounded profit. Revenue(b) - cost - tax(a) bounds every quote
    // in [a,b], since each ordered positive sum and subtraction is monotone.
    const first = (a: number, b: number): number | null => {
      const left = amountsAt(a)!
      if (left.revenue - cost - left.tax >= 0) return a
      const right = amountsAt(b)!
      if (right.revenue - cost - left.tax < 0) return null
      if (a === b) return a
      const mid = a + Math.floor((b - a) / 2)
      return first(a, mid) ?? first(mid + 1, b)
    }
    const floor = first(0, last)
    if (floor === null) return fail('no-feasible-safe-price')
    const profit = profitAt(floor)
    const below = floor === 0 ? null : profitAt(floor - 1)
    if (profit === null || profit < 0 || (floor > 0 && (below === null || below >= 0))) return fail('no-feasible-safe-price')
    return { ...base, floor, headroom: currentQuote! - floor, reason: null }
  })
  return { assumption: 'input-quotes-and-other-output-quotes-held-fixed', outputs: rows }
}
