import type { Recipe } from '@ge/engine'

export type Direction = 'combine' | 'split'
export interface LabQuote { id: number; name: string; qty: number; buy: number | null; sell: number | null; limit: number | null }
type Tax = (price: number, id: number) => number
export interface LabPlan { buy: (LabQuote & { buy: number })[]; sell: (LabQuote & { sell: number })[]; cost: number; revenue: number; tax: number; profit: number }

/** Quotes are observed trade sides, not executed offers. Tax is injected from the shared engine. */
export function evaluateSet (recipe: Recipe, quotes: readonly LabQuote[], direction: Direction, tax: Tax): LabPlan | null {
  if (direction === 'split' && !recipe.reversible) return null
  const ids = [{ id: recipe.setId, qty: 1 }, ...recipe.parts]
  const lines = ids.map(part => {
    const quote = quotes.find(q => q.id === part.id)
    return quote && { ...quote, qty: part.qty }
  })
  if (lines.some(q => !q)) return null
  const [set, ...parts] = lines as LabQuote[]
  const buyLegs = direction === 'combine' ? parts : [set]
  const sellLegs = direction === 'combine' ? [set] : parts
  if (buyLegs.some(q => q.buy == null || !Number.isFinite(q.buy) || q.buy <= 0) || sellLegs.some(q => q.sell == null || !Number.isFinite(q.sell) || q.sell <= 0)) return null
  const buy = buyLegs as LabPlan['buy']
  const sell = sellLegs as LabPlan['sell']
  const cost = buy.reduce((sum, q) => sum + q.buy * q.qty, recipe.conversionCost)
  const revenue = sell.reduce((sum, q) => sum + q.sell * q.qty, 0)
  const paid = sell.reduce((sum, q) => sum + tax(q.sell, q.id) * q.qty, 0)
  return { buy, sell, cost, revenue, tax: paid, profit: revenue - paid - cost }
}

/** Replace one leg at a time; separable per-item tax makes impacts sum exactly. */
export function compareSet (recipe: Recipe, current: readonly LabQuote[], previous: readonly LabQuote[], direction: Direction, tax: Tax) {
  const base = evaluateSet(recipe, previous, direction, tax)
  if (!base || !evaluateSet(recipe, current, direction, tax)) return null
  return current.map(q => ({ id: q.id, name: q.name, impact: evaluateSet(recipe, previous.map(p => p.id === q.id ? q : p), direction, tax)!.profit - base.profit })).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
}

export type Wait = (id: number, side: 'buy' | 'sell', price: number, quantity: number) => number
/** Buys run in parallel, then exits in parallel. Does not include clerk travel or existing offers. */
export function batchConstraint (plan: LabPlan, quotes: readonly LabQuote[], cash: number, hours: number, wait: Wait): { quantity: number | null; hours: number | null } {
  if (!Number.isFinite(cash) || cash < 0 || !Number.isFinite(hours) || hours <= 0 || plan.cost <= 0) return { quantity: 0, hours: 0 }
  if (plan.buy.some(q => !quotes.find(p => p.id === q.id)?.limit)) return { quantity: null, hours: null }
  const cap = Math.max(0, Math.min(Math.floor(cash / plan.cost), ...plan.buy.map(q => Math.floor(quotes.find(p => p.id === q.id)!.limit! / q.qty))))
  const time = (n: number) => Math.max(...plan.buy.map(q => wait(q.id, 'buy', q.buy, n * q.qty))) + Math.max(...plan.sell.map(q => wait(q.id, 'sell', q.sell, n * q.qty)))
  let low = 0; let high = cap
  while (low < high) {
    const mid = Math.ceil((low + high) / 2)
    if (time(mid) <= hours) low = mid
    else high = mid - 1
  }
  return { quantity: low, hours: low ? time(low) : 0 }
}
