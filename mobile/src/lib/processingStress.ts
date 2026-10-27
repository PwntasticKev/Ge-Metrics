import type { Market, ProcessRecipe } from '@ge/engine'
import { geTax } from '../../../src/domain/flipping/geTax.js'

export interface ProcessingStressInput {
  inputCostIncreaseBps: number
  outputPriceCutBps: number
  /** Fixed whole actions from the existing batch; null for an untimed recipe. */
  actions: number | null
}
export interface ProcessingStressAmounts {
  cost: number
  revenue: number
  tax: number
  profit: number
}
export interface ProcessingStressBatch {
  actions: number
  baselineMargin: number
  stressMargin: number
  /** Stress margin minus baseline margin (the change in net cash). */
  cashDelta: number
  marginFall: number
  baselineCapital: number
  stressCapital: number
  capitalIncrease: number
}
export interface ProcessingStressResult {
  assumption: 'hypothetical-fractional-quotes-fixed-actions'
  reason: 'missing-quote' | 'invalid-value' | null
  baseline: ProcessingStressAmounts | null
  stress: ProcessingStressAmounts | null
  batch: ProcessingStressBatch | null
}
const safe = (n: number) => Number.isFinite(n) && Math.abs(n) <= Number.MAX_SAFE_INTEGER
const money = (n: number) => safe(n) && n >= 0

/**
 * Pure adverse-quote sensitivity using labMarket's selected low buys/high sells.
 * Preserve fractional notional quotes: rounding them would drift from canonical
 * profit at zero bps. These are hypothetical values, not executable GE prices,
 * confidence, fill probabilities, or historical predictions. Coin fees/revenue
 * stay fixed; canonical tax is floored/capped/exempted per output unit.
 * The same actions are compared without resizing or asserting cash feasibility.
 * A 100% output cut is legitimate zero liquidation, evaluated directly because
 * computeProcessFlip rejects zero quotes. Missing selected quotes stay unknown.
 */
export function processingStress (recipe: ProcessRecipe, market: Market, input: ProcessingStressInput): ProcessingStressResult {
  const result: ProcessingStressResult = { assumption: 'hypothetical-fractional-quotes-fixed-actions', reason: null, baseline: null, stress: null, batch: null }
  const fail = (reason: ProcessingStressResult['reason']): ProcessingStressResult => ({ ...result, reason })
  const bps = (n: number) => Number.isSafeInteger(n) && n >= 0 && n <= 10000
  if (!bps(input.inputCostIncreaseBps) || !bps(input.outputPriceCutBps)
    || (input.actions !== null && (!Number.isSafeInteger(input.actions) || input.actions < 0))) return fail('invalid-value')
  const buys = recipe.inputs.map(row => ({ ...row, price: market.get(row.id)?.low ?? null }))
  const sells = recipe.outputs.map(row => ({ ...row, price: market.get(row.id)?.high ?? null }))
  const coinCost = recipe.coinCost ?? 0
  const coinRevenue = recipe.coinRevenue ?? 0
  if (!buys.length || (!sells.length && !coinRevenue) || !money(coinCost) || !money(coinRevenue)
    || [...buys, ...sells].some(row => !money(row.qty) || row.qty <= 0 || (row.price !== null && (!money(row.price) || row.price <= 0)))) return fail('invalid-value')
  for (const rows of [buys, sells]) {
    const quantities = new Map<number, number>()
    for (const row of rows) {
      const total = (quantities.get(row.id) ?? 0) + row.qty
      if (!money(total) || (input.actions !== null && !money(total * input.actions))) return fail('invalid-value')
      quantities.set(row.id, total)
    }
  }
  if ([...buys, ...sells].some(row => row.price === null)) return fail('missing-quote')
  const checked = (n: number): number => { if (!safe(n)) throw new RangeError('Unsafe stress arithmetic'); return n }
  const sum = (values: number[]) => values.reduce((total, value) => checked(total + checked(value)), 0)
  try {
    const evaluate = (buyFactor: number, sellFactor: number): ProcessingStressAmounts => {
      // Keep original row and operation order, including repeated item IDs.
      const cost = checked(sum(buys.map(row => checked(row.price! * buyFactor) * row.qty)) + coinCost)
      const prices = sells.map(row => checked(row.price! * sellFactor))
      const revenue = checked(sum(sells.map((row, i) => prices[i] * row.qty)) + coinRevenue)
      const tax = sum(sells.map((row, i) => geTax(prices[i], row.id) * row.qty))
      const profit = checked(checked(revenue - cost) - tax)
      return { cost, revenue, tax, profit }
    }
    const baseline = evaluate(1, 1)
    const stress = evaluate(1 + input.inputCostIncreaseBps / 10000, 1 - input.outputPriceCutBps / 10000)
    let batch: ProcessingStressBatch | null = null
    if (input.actions !== null) {
      const actions = input.actions
      const baselineMargin = checked(baseline.profit * actions)
      const stressMargin = checked(stress.profit * actions)
      const baselineCapital = checked(baseline.cost * actions)
      const stressCapital = checked(stress.cost * actions)
      const cashDelta = checked(stressMargin - baselineMargin)
      batch = { actions, baselineMargin, stressMargin, cashDelta, marginFall: checked(-cashDelta), baselineCapital, stressCapital, capitalIncrease: checked(stressCapital - baselineCapital) }
    }
    return { ...result, baseline, stress, batch }
  } catch (error) {
    if (error instanceof RangeError) return fail('invalid-value')
    throw error
  }
}
