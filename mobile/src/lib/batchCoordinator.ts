import type { ProcessRecipe } from '@ge/engine'

type Recipe = Pick<ProcessRecipe, 'inputs' | 'outputs' | 'coinCost' | 'coinRevenue'>
export type BatchQuote = { buy: number | null; sell: number | null }
const count = (n: number) => Number.isFinite(n) ? Math.max(0, Math.min(1_000_000_000, Math.floor(n))) : 0
const safe = (n: number) => {
  if (!Number.isSafeInteger(n)) throw new RangeError('Values exceed supported whole-unit/GP limits')
  return n
}
const multiply = (a: number, b: number) => safe(a * b)
const quote = (n: number | null | undefined) => {
  if (n === undefined || n === null || !Number.isFinite(n) || n <= 0) return null
  return safe(n)
}
// Check the known subtotal even when another term is unknown.
const sum = (values: (number | null)[]) => {
  const known = values.reduce<number>((total, n) => safe(total + (n ?? 0)), 0)
  return values.some(n => n === null) ? null : known
}
const value = (qty: number, price: number | null) => qty === 0 ? 0 : price === null ? null : multiply(qty, price)

/** Whole-unit recipes and whole GP quotes/coins only; no reinvestment or fill/reset assumptions. */
export function coordinateBatch (recipe: Recipe, goal: number, budget: number, owned: Record<number, number>, prices: (id: number) => BatchQuote | null, tax: (price: number, id: number) => number) {
  if (!Number.isInteger(goal) || goal < 0 || goal > 1_000_000_000 || !recipe.inputs.length || !recipe.outputs.length || [...recipe.inputs, ...recipe.outputs].some(i => !Number.isInteger(i.qty) || i.qty <= 0) || [recipe.coinCost ?? 0, recipe.coinRevenue ?? 0].some(n => !Number.isFinite(n) || n < 0)) throw new Error('A whole batch goal and deterministic whole-unit recipe are required')
  ;[...recipe.inputs, ...recipe.outputs].forEach(i => safe(i.qty))
  ;[recipe.coinCost ?? 0, recipe.coinRevenue ?? 0].forEach(safe)
  const grouped = new Map<number, number>()
  recipe.inputs.forEach(i => grouped.set(i.id, safe((grouped.get(i.id) ?? 0) + i.qty)))
  const inputs = [...grouped].map(([id, qty]) => ({ id, qty, owned: count(owned[id] ?? 0), price: goal === 0 ? null : quote(prices(id)?.buy) }))
  const capacities = inputs.map(i => Math.floor(i.owned / i.qty))
  const complete = Math.min(goal, ...capacities)
  const ingredients = inputs.map(i => ({ ...i, required: multiply(i.qty, goal), shopping: Math.max(0, multiply(i.qty, goal) - i.owned), stranded: Math.max(0, i.owned - multiply(complete, i.qty)), surplus: Math.max(0, i.owned - multiply(goal, i.qty)) }))
  const cashFor = (n: number) => sum([multiply(n, recipe.coinCost ?? 0), ...inputs.map(i => value(Math.max(0, multiply(n, i.qty) - i.owned), i.price))])
  // Validate replacement products before affordability searches or owned-stock subtraction.
  const fees = multiply(goal, recipe.coinCost ?? 0)
  const replacementCost = sum([fees, ...inputs.map(i => value(multiply(i.qty, goal), i.price))])
  const cashNeeded = cashFor(goal)
  const available = count(budget)
  const affordableBound = (optimistic: boolean) => {
    let low = 0; let high = goal
    while (low < high) {
      const mid = Math.ceil((low + high) / 2)
      const missingQuote = inputs.some(i => i.price === null && multiply(mid, i.qty) > i.owned)
      const knownCash = sum([multiply(mid, recipe.coinCost ?? 0), ...inputs.map(i => value(Math.max(0, multiply(mid, i.qty) - i.owned), i.price ?? 0))])!
      // Unquoted purchases may cost arbitrarily little, but valid prices are positive.
      const fits = missingQuote ? optimistic && knownCash < available : knownCash <= available
      if (fits) low = mid
      else high = mid - 1
    }
    return low
  }
  const lowerAffordable = affordableBound(false)
  const upperAffordable = affordableBound(true)
  const affordable = lowerAffordable === upperAffordable ? lowerAffordable : null
  const ownedReplacementCost = sum(inputs.map(i => value(Math.min(i.owned, multiply(goal, i.qty)), i.price)))
  const outputs = recipe.outputs.map(i => {
    const quantity = multiply(goal, i.qty)
    const price = goal === 0 ? null : quote(prices(i.id)?.sell)
    const levy = price === null ? null : safe(tax(price, i.id))
    if (levy !== null && (levy < 0 || levy > price!)) throw new RangeError('Invalid output tax')
    return { quantity, price, levy }
  })
  // Gross receipts and total taxes must each fit before their difference is taken.
  sum([multiply(goal, recipe.coinRevenue ?? 0), ...outputs.map(i => value(i.quantity, i.price))])
  const outputTax = sum(outputs.map(i => value(i.quantity, i.levy)))
  const netProceeds = sum([multiply(goal, recipe.coinRevenue ?? 0), ...outputs.map(i => value(i.quantity, i.price === null ? null : i.price - i.levy!))])
  return { complete, ingredients, affordable, cashNeeded, fees, replacementCost, ownedReplacementCost, outputTax, netProceeds,
    projectedMargin: netProceeds === null || replacementCost === null ? null : safe(netProceeds - replacementCost),
    bottlenecks: complete === goal ? [] : inputs.filter((_, index) => capacities[index] === complete).map(i => i.id) }
}
