import type { ProcessRecipe } from '@ge/engine'
import type { BatchQuote } from './batchCoordinator.ts'
import { calculateBatchAllowances, type BatchAllowance } from './batchAllowances.ts'

export type CombinedBatchSelection = {
  recipe: Pick<ProcessRecipe, 'inputs' | 'outputs' | 'coinCost' | 'coinRevenue'>
  goal: number
}
export type CombinedBatchOptions = {
  prices: (id: number) => BatchQuote | null
  /** Tax on one output unit, never on a line's total proceeds. */
  tax: (price: number, id: number) => number
  allowances?: Readonly<Partial<Record<number, BatchAllowance>>>
  budget: number
}

const whole = (n: number, label: string, minimum = 0): number => {
  if (!Number.isSafeInteger(n) || n < minimum) throw new RangeError(`${label} must be a safe whole number >= ${minimum}`)
  return n
}
const add = (a: number, b: number) => whole(a + b, 'sum')
const multiply = (a: number, b: number) => whole(a * b, 'product')
const sum = (values: readonly (number | null)[]): number | null => {
  // Validate known subtotals even when another line is unknown.
  const known = values.reduce<number>((total, n) => n === null ? total : add(total, n), 0)
  return values.includes(null) ? null : known
}
const value = (qty: number, price: number | null) => qty === 0 ? 0 : price === null ? null : multiply(qty, price)

/**
 * Ledger for zero to two independent, parallel, whole deterministic batches.
 * All inputs are required upfront: selected outputs never supply inputs or fund cash.
 * Owned stock and declared remaining are shared once per ID; sales are taxed per unit.
 * Null quotes mean unknown. Invalid quotes/counts, fractional recipes and unsafe
 * intermediate arithmetic throw RangeError. No routes, rankings or reinvestment.
 */
export function combineBatches (selections: readonly CombinedBatchSelection[], options: CombinedBatchOptions) {
  if (selections.length > 2) throw new RangeError('At most two batch selections are supported')
  const budget = whole(options.budget, 'budget')
  const quotes = new Map<number, BatchQuote | null>()
  const price = (id: number, side: 'buy' | 'sell') => {
    if (!quotes.has(id)) quotes.set(id, options.prices(id))
    const n = quotes.get(id)?.[side] ?? null
    return n === null ? null : whole(n, `${side} quote for ${id}`, 1)
  }
  const grouped = new Map<number, number>()
  const outputs: { selectionIndex: number; id: number; quantity: number; price: number | null; taxPerUnit: number | null; grossProceeds: number | null; outputTax: number | null; netProceeds: number | null }[] = []
  let fees = 0
  let coinRevenue = 0
  selections.forEach(({ recipe, goal }, selectionIndex) => {
    whole(goal, 'goal')
    if (!recipe.inputs.length || !recipe.outputs.length) throw new RangeError('Recipe inputs and outputs are required')
    for (const leg of [...recipe.inputs, ...recipe.outputs]) {
      whole(leg.id, 'item ID', 1)
      whole(leg.qty, 'recipe quantity', 1)
    }
    fees = add(fees, multiply(goal, whole(recipe.coinCost ?? 0, 'coin cost')))
    coinRevenue = add(coinRevenue, multiply(goal, whole(recipe.coinRevenue ?? 0, 'coin revenue')))
    for (const input of recipe.inputs) grouped.set(input.id, add(grouped.get(input.id) ?? 0, multiply(input.qty, goal)))
    for (const output of recipe.outputs) {
      const quantity = multiply(output.qty, goal)
      const sell = price(output.id, 'sell')
      const taxPerUnit = sell === null || quantity === 0 ? null : whole(options.tax(sell, output.id), 'unit tax')
      if (sell !== null && taxPerUnit !== null && taxPerUnit > sell) throw new RangeError('Unit tax exceeds sale price')
      const grossProceeds = value(quantity, sell)
      const outputTax = value(quantity, taxPerUnit)
      const netProceeds = value(quantity, sell === null || taxPerUnit === null ? null : sell - taxPerUnit)
      outputs.push({ selectionIndex, id: output.id, quantity, price: sell, taxPerUnit, grossProceeds, outputTax, netProceeds })
    }
  })
  const ingredients = [...grouped].map(([id, required]) => {
    // Treat the aggregate as one goal, using existing declaration validation.
    const allowance = calculateBatchAllowances([{ id, qty: 1 }], required, options.allowances ?? {}).ingredients[0]
    const buy = price(id, 'buy')
    const ownedConsumed = Math.min(required, allowance.owned)
    return { id, required, owned: allowance.owned, ownedConsumed, surplus: allowance.owned - ownedConsumed,
      shopping: allowance.shopping, remaining: allowance.remaining, status: allowance.status,
      knownShortfall: allowance.knownShortfall, price: buy,
      cashCost: value(allowance.shopping, buy), replacementCost: value(required, buy), ownedReplacementCost: value(ownedConsumed, buy) }
  })
  const cashNeeded = sum([fees, ...ingredients.map(i => i.cashCost)])
  const knownCash = sum([fees, ...ingredients.map(i => i.cashCost ?? 0)])!
  const budgetFit: 'fits' | 'exceeds' | 'unknown' = cashNeeded === null
    ? knownCash >= budget ? 'exceeds' : 'unknown'
    : cashNeeded <= budget ? 'fits' : 'exceeds'
  const replacementCost = sum([fees, ...ingredients.map(i => i.replacementCost)])
  const ownedReplacementCost = sum(ingredients.map(i => i.ownedReplacementCost))
  const outputTax = sum(outputs.map(i => i.outputTax))
  const grossProceeds = sum([coinRevenue, ...outputs.map(i => i.grossProceeds)])
  const netProceeds = sum([coinRevenue, ...outputs.map(i => i.netProceeds)])
  const allowanceStatus: 'feasible' | 'blocked' | 'unknown' = ingredients.some(i => i.status === 'exceeds') ? 'blocked'
    : ingredients.some(i => i.status === 'unknown') ? 'unknown' : 'feasible'
  return { ingredients, outputs, fees, coinRevenue, cashNeeded, budgetFit, allowanceStatus,
    replacementCost, ownedReplacementCost, grossProceeds, outputTax, netProceeds,
    projectedMargin: netProceeds === null || replacementCost === null ? null : netProceeds - replacementCost }
}
