import type { Market, ProcessRecipe } from '@ge/engine'
import { geTax } from '../../../src/domain/flipping/geTax.js'

export type PriceCeilingReason = 'missing-quote' | 'invalid-value' | 'no-nonnegative-price' | 'unsupported-circular-item'
export interface IngredientPriceCeiling {
  id: number
  quantity: number
  currentQuote: number | null
  ceiling: number | null
  /** Whole-GP ceiling minus the current selected (possibly fractional) quote. */
  headroom: number | null
  reason: PriceCeilingReason | null
}
export interface ProcessingPriceCeilings {
  assumption: 'other-input-quotes-and-output-quotes-held-fixed'
  ingredients: IngredientPriceCeiling[]
}

const safe = (n: number) => Number.isFinite(n) && n >= 0 && n <= Number.MAX_SAFE_INTEGER

/**
 * One action, all inputs purchased: selected market.low buys, market.high sells.
 * Pass labMarket's selected market, not raw observations. Quotes are not fills.
 * Tax is canonical per sold unit; coin revenue is untaxed. Repeated input IDs
 * vary together. Circular items are unsupported rather than silently assuming
 * their sale quote is independent of their purchase quote.
 * Missing quotes make every row unknown. Invalid values/unsafe arithmetic fail
 * explicitly, never via a clamped or optimistic ceiling. Quantities must be
 * positive finite safe numbers; quotes and coin amounts may be fractional.
 */
export function processingPriceCeilings (recipe: ProcessRecipe, market: Market): ProcessingPriceCeilings {
  const quantities = new Map<number, number>()
  for (const { id, qty } of recipe.inputs) quantities.set(id, (quantities.get(id) ?? 0) + qty)
  const inputs = [...quantities].map(([id, quantity]) => ({ id, quantity, currentQuote: market.get(id)?.low ?? null }))
  const outputs = recipe.outputs.map(row => ({ ...row, price: market.get(row.id)?.high ?? null }))
  const coinCost = recipe.coinCost ?? 0
  const coinRevenue = recipe.coinRevenue ?? 0
  let invalid = [...recipe.inputs, ...recipe.outputs].some(row => !safe(row.qty) || row.qty <= 0)
    || [...quantities.values()].some(qty => !safe(qty) || qty <= 0)
    || !safe(coinCost) || !safe(coinRevenue)
    || [...inputs.map(i => i.currentQuote), ...outputs.map(o => o.price)].some(price => price !== null && (!safe(price) || price <= 0))
  const missing = inputs.some(i => i.currentQuote === null) || outputs.some(o => o.price === null)
  // Match computeProcessFlip's row order and operation order exactly. Do not
  // aggregate repeated IDs for arithmetic: floating-point addition associates.
  const checkedSum = (values: number[]): number | null => {
    let total = 0
    for (const value of values) {
      total += value
      if (!safe(value) || !safe(total)) return null
    }
    return total
  }
  const sales = checkedSum(outputs.map(o => o.qty * (o.price ?? 0)))
  const tax = checkedSum(outputs.map(o => geTax(o.price ?? 0, o.id) * o.qty))
  const revenue = sales === null ? NaN : sales + coinRevenue
  if (!safe(revenue) || tax === null) invalid = true
  const costAt = (id: number | null, price: number): number | null => {
    const buys = checkedSum(recipe.inputs.map(row => row.qty * (row.id === id ? price : (market.get(row.id)?.low ?? 0))))
    const cost = buys === null ? NaN : buys + coinCost
    return safe(cost) ? cost : null
  }
  if (costAt(null, 0) === null) invalid = true
  const ingredients = inputs.map((input): IngredientPriceCeiling => {
    const fail = (reason: PriceCeilingReason): IngredientPriceCeiling => ({ ...input, ceiling: null, headroom: null, reason })
    if (invalid) return fail('invalid-value')
    if (missing) return fail('missing-quote')
    if (outputs.some(o => o.id === input.id)) return fail('unsupported-circular-item')
    // Zero is a mathematical free-input boundary, not a valid engine quote.
    // Evaluate the same arithmetic directly rather than interpreting null as 0.
    const profitAt = (price: number): number | null => {
      const cost = costAt(input.id, price)
      return cost === null ? null : revenue - cost - tax!
    }
    const zeroProfit = profitAt(0)
    if (zeroProfit === null) return fail('invalid-value')
    if (zeroProfit < 0) return fail('no-nonnegative-price')

    // Positive quantities make cost monotone even with floating-point rounding.
    // Unsafe costs serve only as search bounds, never as evidence of a loss.
    // This interval takes at most 53 iterations and keeps integer steps exact.
    let low = 0
    let high = Number.MAX_SAFE_INTEGER
    while (high - low > 1) {
      const mid = low + Math.floor((high - low) / 2)
      const profit = profitAt(mid)
      if (profit !== null && profit >= 0) low = mid
      else high = mid
    }
    const ceiling = low
    const profit = profitAt(ceiling)
    const aboveProfit = profitAt(ceiling + 1)
    if (profit === null || profit < 0 || aboveProfit === null || aboveProfit >= 0) return fail('invalid-value')
    return { ...input, ceiling, headroom: ceiling - input.currentQuote!, reason: null }
  })
  return { assumption: 'other-input-quotes-and-output-quotes-held-fixed', ingredients }
}
