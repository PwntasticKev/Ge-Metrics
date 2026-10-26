/** Exact MVP chains from derivedRecipes.js and processingMethods.js. Rates are supplied, never inferred. */
export interface RouteStage {
  recipeId: string
  inputs: readonly { id: number; qty: number }[]
  output: { id: number; qty: number }
  coinCost: number
}
export interface ProductionRoute { id: string; stages: readonly [RouteStage, RouteStage] }
export const productionRoutes: readonly ProductionRoute[] = [
  ...[{ id: 'ranarr', raw: 207, clean: 257, final: 99 }, { id: 'snapdragon', raw: 3051, clean: 3000, final: 3004 }].map(h => ({
    id: h.id,
    stages: [
      { recipeId: `clean:${h.raw}`, inputs: [{ id: h.raw, qty: 1 }], output: { id: h.clean, qty: 1 }, coinCost: 0 },
      { recipeId: `unf:${h.final}`, inputs: [{ id: h.clean, qty: 1 }, { id: 227, qty: 1 }], output: { id: h.final, qty: 1 }, coinCost: 0 }
    ] as const
  })),
  { id: 'steel', stages: [
    { recipeId: 'proc:smelting:steel-bar', inputs: [{ id: 440, qty: 1 }, { id: 453, qty: 2 }], output: { id: 2353, qty: 1 }, coinCost: 0 },
    { recipeId: 'proc:cannonballs:steel-cannonball', inputs: [{ id: 2353, qty: 1 }], output: { id: 2, qty: 4 }, coinCost: 0 }
  ] }
]
export interface RouteQuote { id: number; buy: number | null; sell: number | null; remainingLimit?: number | null }
export interface RouteRequest {
  route: ProductionRoute
  /** Number of first-stage actions (also second-stage actions for these exact chains). */
  batches: number
  quotes: readonly RouteQuote[]
  owned?: Readonly<Record<number, number>>
  budget: number
  actionsPerHour?: Readonly<Record<string, number | null>>
  tax: (price: number, itemId: number) => number
}
export interface RouteLedger { id: number; required: number; ownedUsed: number; bought: number; produced: number; consumed: number; sold: number; ownedLeft: number }
export interface RoutePlan {
  kind: 'full-chain' | 'finish' | 'intermediate-exit' | 'sell-owned-intermediate'
  recipeIds: string[]
  ledger: RouteLedger[]
  missingQuotes: { id: number; side: 'buy' | 'sell' }[]
  purchases: { id: number; quantity: number; cost: number | null; remainingLimit: number | null; feasible: boolean | null }[]
  fees: number
  cashOutlay: number | null
  grossRevenue: number | null
  outputTax: number | null
  netRevenue: number | null
  ownedOpportunityCost: number | null
  /** Change in wealth versus liquidating consumed owned stock now; unused stock is retained. */
  economicGain: number | null
  budgetFeasible: boolean | null
  limitsFeasible: boolean | null
  activeHours: number | null
}
const priceValid = (n: number | null | undefined): n is number => n != null && Number.isFinite(n) && n > 0
const whole = (n: number) => Number.isSafeInteger(n) && n >= 0

/** One fixed whole batch, no reinvestment, internal sale, or internal transfer tax. Quotes are hypothetical trade sides. */
export function evaluateProductionRoutes (request: RouteRequest) {
  const { route, batches, quotes, owned = {}, budget, tax } = request
  if (!whole(batches) || !Number.isFinite(budget) || budget < 0 || Object.values(owned).some(n => !whole(n))) throw new RangeError('Expected whole nonnegative quantities and a finite nonnegative budget')
  const vetted = productionRoutes.find(candidate => candidate.id === route.id)
  if (!vetted || JSON.stringify(route.stages) !== JSON.stringify(vetted.stages)) throw new RangeError('Only vetted production route definitions are supported')
  const [first, second] = route.stages
  if (first.output.qty !== 1 || second.inputs.find(i => i.id === first.output.id)?.qty !== 1 || route.stages.some(s => !Number.isFinite(s.coinCost) || s.coinCost < 0 || !whole(s.output.qty) || s.output.qty === 0 || s.inputs.some(i => !whole(i.qty) || i.qty === 0))) throw new RangeError('Only exact integer one-intermediate chains are supported')
  const quote = (id: number) => quotes.find(q => q.id === id)
  function plan (kind: RoutePlan['kind'], stages: readonly RouteStage[], saleId: number, saleQty: number): RoutePlan {
    const rows = new Map<number, RouteLedger>()
    const row = (id: number) => {
      if (!rows.has(id)) rows.set(id, { id, required: 0, ownedUsed: 0, bought: 0, produced: 0, consumed: 0, sold: 0, ownedLeft: owned[id] ?? 0 })
      return rows.get(id)!
    }
    Object.keys(owned).forEach(id => row(Number(id)))
    for (const stage of stages) {
      for (const input of stage.inputs) row(input.id).consumed += input.qty * batches
      row(stage.output.id).produced += stage.output.qty * batches
    }
    row(saleId).sold = saleQty
    for (const r of rows.values()) {
      r.required = Math.max(0, r.consumed + r.sold - r.produced)
      r.ownedUsed = Math.min(r.ownedLeft, r.required)
      r.ownedLeft -= r.ownedUsed
      r.bought = r.required - r.ownedUsed
      if (![r.required, r.produced, r.consumed, r.sold].every(whole)) throw new RangeError('Batch exceeds safe integer quantities')
    }
    const missingQuotes: RoutePlan['missingQuotes'] = []
    const getPrice = (id: number, side: 'buy' | 'sell') => {
      const p = quote(id)?.[side]
      if (priceValid(p)) return p
      if (!missingQuotes.some(q => q.id === id && q.side === side)) missingQuotes.push({ id, side })
      return null
    }
    const purchases = [...rows.values()].filter(r => r.bought > 0).map(r => {
      const p = getPrice(r.id, 'buy')
      const limit = quote(r.id)?.remainingLimit
      const remainingLimit = limit != null && whole(limit) ? limit : null
      return { id: r.id, quantity: r.bought, cost: p === null ? null : p * r.bought, remainingLimit, feasible: remainingLimit === null ? null : r.bought <= remainingLimit }
    })
    const fees = stages.reduce((sum, s) => sum + s.coinCost * batches, 0)
    const cashOutlay = purchases.some(p => p.cost === null) ? null : fees + purchases.reduce((sum, p) => sum + p.cost!, 0)
    const sell = saleQty > 0 ? getPrice(saleId, 'sell') : 0
    const grossRevenue = sell === null ? null : sell * saleQty
    const outputTax = sell === null ? null : tax(sell, saleId) * saleQty
    const netRevenue = grossRevenue === null || outputTax === null ? null : grossRevenue - outputTax
    let ownedOpportunityCost: number | null = 0
    for (const r of rows.values()) if (r.ownedUsed > 0) {
      const p = getPrice(r.id, 'sell')
      if (p === null) ownedOpportunityCost = null
      else if (ownedOpportunityCost !== null) ownedOpportunityCost += (p - tax(p, r.id)) * r.ownedUsed
    }
    const times = stages.map(s => {
      const rate = request.actionsPerHour?.[s.recipeId]
      return batches === 0 ? 0 : priceValid(rate) ? batches / rate : null
    })
    return { kind, recipeIds: stages.map(s => s.recipeId), ledger: [...rows.values()], missingQuotes, purchases, fees, cashOutlay, grossRevenue, outputTax, netRevenue, ownedOpportunityCost,
      economicGain: netRevenue === null || cashOutlay === null || ownedOpportunityCost === null ? null : netRevenue - cashOutlay - ownedOpportunityCost,
      budgetFeasible: cashOutlay === null ? null : cashOutlay <= budget,
      limitsFeasible: purchases.some(p => p.feasible === false) ? false : purchases.some(p => p.feasible === null) ? null : true,
      activeHours: times.some(t => t === null) ? null : times.reduce<number>((sum, t) => sum + t!, 0) }
  }
  const finalQuantity = second.output.qty * batches
  const finalBuy = finalQuantity > 0 ? quote(second.output.id)?.buy : 0
  return {
    plans: [plan('full-chain', [first, second], second.output.id, finalQuantity), plan('finish', [second], second.output.id, finalQuantity), plan('intermediate-exit', [first], first.output.id, batches), plan('sell-owned-intermediate', [], first.output.id, Math.min(batches, owned[first.output.id] ?? 0))],
    /** Acquisition comparison only: no resale or production gain is attributed to buying a finished item. */
    acquisitionBaseline: { id: second.output.id, quantity: finalQuantity, cashOutlay: finalQuantity === 0 ? 0 : priceValid(finalBuy) ? finalBuy * finalQuantity : null, missingQuotes: finalQuantity > 0 && !priceValid(finalBuy) ? [{ id: second.output.id, side: 'buy' as const }] : [] }
  }
}
