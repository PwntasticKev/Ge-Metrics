export interface OwnedInputOpportunityRecipe {
  inputs: readonly { id: number; qty: number }[]
  outputs: readonly { id: number; qty: number }[]
  coinCost?: number
  coinRevenue?: number
}
export interface OwnedInputOpportunityRequest {
  recipe: OwnedInputOpportunityRecipe
  goal: number
  budget: number
  owned: Readonly<Record<number, number>>
  /** Instant whole-GP quotes. Null/undefined means unknown; zero is a valid quote. */
  quotes: Readonly<Record<number, { buy?: number | null; sell?: number | null }>>
  tax: (price: number, itemId: number) => number
}
export interface OwnedInputOpportunityItem {
  id: number
  consumed: number
  consumedOwned: number
  purchases: number
  surplus: number
  produced: number
}
export interface OwnedInputOpportunityResult {
  items: OwnedInputOpportunityItem[]
  fees: number
  directCoins: number
  newCashNeeded: number | null
  sellNowConsumedOwned: number | null
  outputTax: number | null
  netReceipts: number | null
  incrementalValue: number | null
  cashAffordable: boolean | null
  cashShortfall: number | null
  missingQuotes: { id: number; side: 'buy' | 'sell' }[]
}
const whole = (n: number): number => {
  if (!Number.isSafeInteger(n) || n < 0) throw new RangeError('Expected a nonnegative safe integer')
  return n
}
const positive = (n: number): number => {
  if (whole(n) === 0) throw new RangeError('Expected a positive safe integer')
  return n
}
const add = (a: number, b: number) => whole(a + b)
const multiply = (a: number, b: number) => whole(a * b)
const sum = (values: readonly (number | null)[]): number | null => {
  // Validate known subtotals even when another term is unknown.
  const known = values.reduce<number>((total, n) => n === null ? total : add(total, n), 0)
  return values.includes(null) ? null : known
}

/**
 * Fixed prospective batch: process versus selling only the owned units consumed now.
 * Ordinary deterministic consumption/production only. Cross-side IDs retain gross
 * quantities: outputs never supply inputs; returned catalysts require another model.
 * All numbers are safe whole units/GP. No historical costs, reinvestment, optimiser,
 * slots, fills or allowance feasibility. Cash affordability only tests upfront cash.
 */
export function compareOwnedInputOpportunity (request: OwnedInputOpportunityRequest): OwnedInputOpportunityResult {
  const { recipe, goal, budget, owned, quotes, tax } = request
  whole(goal); whole(budget)
  if (!recipe.inputs.length || !recipe.outputs.length) throw new RangeError('Expected deterministic inputs and outputs')
  const group = (entries: readonly { id: number; qty: number }[]) => {
    const result = new Map<number, number>()
    for (const { id, qty } of entries) result.set(positive(id), add(result.get(id) ?? 0, positive(qty)))
    return result
  }
  const inputs = group(recipe.inputs)
  const outputs = group(recipe.outputs)
  for (const [key, quantity] of Object.entries(owned)) { positive(Number(key)); if (String(Number(key)) !== key) throw new RangeError('Expected canonical item ID'); whole(quantity) }
  for (const [key, quote] of Object.entries(quotes)) {
    positive(Number(key))
    for (const price of [quote.buy, quote.sell]) if (price != null) whole(price)
  }
  const fees = multiply(whole(recipe.coinCost ?? 0), goal)
  const directCoins = multiply(whole(recipe.coinRevenue ?? 0), goal)
  const ids = new Set([...inputs.keys(), ...Object.keys(owned).map(Number), ...outputs.keys()])
  const items = [...ids].map(id => {
    const consumed = multiply(inputs.get(id) ?? 0, goal)
    const produced = multiply(outputs.get(id) ?? 0, goal)
    const quantity = owned[id] ?? 0
    const consumedOwned = Math.min(quantity, consumed)
    return { id, consumed, consumedOwned, purchases: consumed - consumedOwned, surplus: quantity - consumedOwned, produced }
  })
  const missingQuotes: OwnedInputOpportunityResult['missingQuotes'] = []
  const price = (id: number, side: 'buy' | 'sell') => {
    const value = quotes[id]?.[side]
    if (value != null) return value
    if (!missingQuotes.some(q => q.id === id && q.side === side)) missingQuotes.push({ id, side })
    return null
  }
  const purchaseCosts: (number | null)[] = [fees]
  const baselines: (number | null)[] = []
  const receipts: (number | null)[] = [directCoins]
  const taxes: (number | null)[] = []
  const grossOutputs: (number | null)[] = [directCoins]
  const grossOwned: (number | null)[] = []
  const ownedTaxes: (number | null)[] = []
  for (const item of items) {
    if (item.purchases > 0) {
      const buy = price(item.id, 'buy')
      purchaseCosts.push(buy === null ? null : multiply(buy, item.purchases))
    }
    if (item.consumedOwned > 0 || item.produced > 0) {
      const sell = price(item.id, 'sell')
      const unitTax = sell === null ? null : whole(tax(sell, item.id))
      if (sell !== null && unitTax! > sell) throw new RangeError('Tax exceeds sale price')
      const net = sell === null ? null : sell - unitTax!
      if (item.consumedOwned > 0) {
        // Gross and tax products are checked separately, before cancellation.
        grossOwned.push(sell === null ? null : multiply(sell, item.consumedOwned))
        ownedTaxes.push(unitTax === null ? null : multiply(unitTax, item.consumedOwned))
        baselines.push(net === null ? null : multiply(net, item.consumedOwned))
      }
      if (item.produced > 0) {
        grossOutputs.push(sell === null ? null : multiply(sell, item.produced))
        receipts.push(net === null ? null : multiply(net, item.produced))
        taxes.push(unitTax === null ? null : multiply(unitTax, item.produced))
      }
    }
  }
  sum(grossOutputs); sum(grossOwned); sum(ownedTaxes)
  const newCashNeeded = sum(purchaseCosts)
  const sellNowConsumedOwned = sum(baselines)
  const netReceipts = sum(receipts)
  const outputTax = sum(taxes)
  // Keep known contributions visible even when either subtotal has missing quotes.
  const costs = sum([...purchaseCosts, ...baselines])
  return { items, fees, directCoins, newCashNeeded, sellNowConsumedOwned, outputTax, netReceipts,
    incrementalValue: netReceipts === null || costs === null ? null : netReceipts - costs,
    cashAffordable: newCashNeeded === null ? null : newCashNeeded <= budget,
    cashShortfall: newCashNeeded === null ? null : Math.max(0, newCashNeeded - budget), missingQuotes }
}
