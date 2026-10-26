import type { ProcessRecipe } from '@ge/engine'

type Recipe = Pick<ProcessRecipe, 'inputs' | 'outputs' | 'coinCost' | 'coinRevenue'>
export type BatchQuote = { buy: number | null; sell: number | null }
const count = (n: number) => Number.isFinite(n) ? Math.max(0, Math.min(1_000_000_000, Math.floor(n))) : 0
const quote = (n: number | null | undefined) => n !== undefined && n !== null && Number.isFinite(n) && n > 0 ? n : null
const sum = (values: (number | null)[]) => values.some(n => n === null) ? null : values.reduce<number>((a, n) => a + (n ?? 0), 0)
const value = (qty: number, price: number | null) => qty === 0 ? 0 : price === null ? null : qty * price

/** Only whole, deterministic recipes; no reinvestment, fill assumptions or buy-limit reset assumptions. */
export function coordinateBatch (recipe: Recipe, goal: number, budget: number, owned: Record<number, number>, prices: (id: number) => BatchQuote | null, tax: (price: number, id: number) => number) {
  if (!Number.isInteger(goal) || goal < 0 || goal > 1_000_000_000 || !recipe.inputs.length || !recipe.outputs.length || [...recipe.inputs, ...recipe.outputs].some(i => !Number.isSafeInteger(i.qty) || i.qty <= 0) || [recipe.coinCost ?? 0, recipe.coinRevenue ?? 0].some(n => !Number.isFinite(n) || n < 0)) throw new Error('A whole batch goal and deterministic whole-unit recipe are required')
  const grouped = new Map<number, number>()
  recipe.inputs.forEach(i => grouped.set(i.id, (grouped.get(i.id) ?? 0) + i.qty))
  const inputs = [...grouped].map(([id, qty]) => ({ id, qty, owned: count(owned[id] ?? 0), price: quote(prices(id)?.buy) }))
  const capacities = inputs.map(i => Math.floor(i.owned / i.qty))
  const complete = Math.min(goal, ...capacities)
  const ingredients = inputs.map(i => ({ ...i, required: i.qty * goal, shopping: Math.max(0, i.qty * goal - i.owned), stranded: Math.max(0, i.owned - complete * i.qty), surplus: Math.max(0, i.owned - goal * i.qty) }))
  const cashFor = (n: number) => sum([n * (recipe.coinCost ?? 0), ...inputs.map(i => value(Math.max(0, n * i.qty - i.owned), i.price))])
  const cashNeeded = cashFor(goal)
  const available = count(budget)
  const affordableBound = (optimistic: boolean) => {
    let low = 0; let high = goal
    while (low < high) {
      const mid = Math.ceil((low + high) / 2)
      const missingQuote = inputs.some(i => i.price === null && mid * i.qty > i.owned)
      const knownCash = mid * (recipe.coinCost ?? 0) + inputs.reduce((total, i) => total + Math.max(0, mid * i.qty - i.owned) * (i.price ?? 0), 0)
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
  const fees = goal * (recipe.coinCost ?? 0)
  const replacementCost = sum([fees, ...inputs.map(i => value(i.qty * goal, i.price))])
  const ownedReplacementCost = sum(inputs.map(i => value(Math.min(i.owned, goal * i.qty), i.price)))
  const outputs = recipe.outputs.map(i => ({ ...i, price: quote(prices(i.id)?.sell) }))
  const outputTax = sum(outputs.map(i => i.price === null ? (goal === 0 ? 0 : null) : goal * i.qty * tax(i.price, i.id)))
  const netProceeds = sum([goal * (recipe.coinRevenue ?? 0), ...outputs.map(i => i.price === null ? (goal === 0 ? 0 : null) : goal * i.qty * (i.price - tax(i.price, i.id)))])
  return { complete, ingredients, affordable, cashNeeded, fees, replacementCost, ownedReplacementCost, outputTax, netProceeds,
    projectedMargin: netProceeds === null || replacementCost === null ? null : netProceeds - replacementCost,
    bottlenecks: complete === goal ? [] : inputs.filter((_, index) => capacities[index] === complete).map(i => i.id) }
}
