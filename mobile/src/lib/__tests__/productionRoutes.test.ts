import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateProductionRoutes, productionRoutes, type RouteRequest } from '../productionRoutes.ts'
const enginePath = '../../../../src/domain/flipping/geTax.js'
const { geTax } = await import(enginePath) as { geTax: RouteRequest['tax'] }
const steel = productionRoutes.find(r => r.id === 'steel')!
const base: RouteRequest = { route: steel, batches: 3, budget: 1000, tax: geTax, quotes: [
  { id: 440, buy: 10, sell: 9, remainingLimit: 3 }, { id: 453, buy: 5, sell: 4, remainingLimit: 6 },
  { id: 2353, buy: 40, sell: 35, remainingLimit: 3 }, { id: 2, buy: 60, sell: 59 }
] }
const full = (r: RouteRequest) => evaluateProductionRoutes(r).plans[0]
test('exact steel conservation and per-unit output tax, without internal sales', () => {
  const p = full(base)
  assert.equal(p.cashOutlay, 60)
  assert.equal(p.grossRevenue, 708)
  assert.equal(p.outputTax, 12) // floor(59 * .02) * 12, not floor(708 * .02)
  assert.equal(p.economicGain, 636)
  assert.deepEqual(p.purchases.map(p => [p.id, p.quantity]), [[440, 3], [453, 6]])
  const bar = p.ledger.find(r => r.id === 2353)!
  assert.deepEqual([bar.produced, bar.consumed, bar.bought, bar.sold], [3, 3, 0, 0])
  for (const r of p.ledger) assert.equal(r.ownedUsed + r.bought + r.produced, r.consumed + r.sold)
  assert.equal(evaluateProductionRoutes(base).acquisitionBaseline.cashOutlay, 720)
})
test('owned intermediate continue versus sell uses liquidation opportunity cost and retains leftovers', () => {
  const r = evaluateProductionRoutes({ ...base, owned: { 2353: 5, 440: 7 }, budget: 0 })
  const finish = r.plans[1]; const sell = r.plans[3]
  assert.equal(finish.cashOutlay, 0)
  assert.equal(finish.ownedOpportunityCost, 105)
  assert.equal(finish.economicGain, 591)
  assert.equal(sell.netRevenue, 105)
  assert.equal(sell.economicGain, 0)
  assert.equal(finish.netRevenue! - sell.netRevenue!, finish.economicGain)
  assert.equal(finish.ledger.find(r => r.id === 2353)!.ownedLeft, 2)
  assert.equal(finish.ledger.find(r => r.id === 440)!.ownedLeft, 7)
  assert.equal(finish.budgetFeasible, true)
})
test('owned raw inputs reduce cash but carry net liquidation opportunity cost', () => {
  const p = full({ ...base, owned: { 440: 8, 453: 2 }, budget: 19 })
  assert.equal(p.cashOutlay, 20)
  assert.equal(p.ownedOpportunityCost, 35)
  assert.equal(p.economicGain, 641)
  assert.equal(p.budgetFeasible, false)
  assert.equal(p.ledger.find(r => r.id === 440)!.ownedLeft, 5)
  assert.deepEqual(p.purchases.map(p => [p.id, p.quantity]), [[453, 4]])
})
test('limits are per external purchase, distinguish unknown, exhausted and exceeded', () => {
  assert.equal(full(base).limitsFeasible, true)
  const changed = (id: number, remainingLimit: number | null) => ({ ...base, quotes: base.quotes.map(q => q.id === id ? { ...q, remainingLimit } : q) })
  assert.equal(full(changed(453, null)).limitsFeasible, null)
  assert.equal(full(changed(453, 0)).limitsFeasible, false)
  assert.equal(full(changed(453, 5)).limitsFeasible, false)
  assert.equal(full({ ...changed(453, 0), owned: { 453: 6 } }).limitsFeasible, true)
})
test('requires only actual quote sides, exposing missing opportunity value independently from cash', () => {
  const noBar = { ...base, quotes: base.quotes.filter(q => q.id !== 2353) }
  assert.deepEqual(full(noBar).missingQuotes, [])
  const finish = evaluateProductionRoutes({ ...noBar, owned: { 2353: 3 } }).plans[1]
  assert.equal(finish.cashOutlay, 0)
  assert.equal(finish.economicGain, null)
  assert.deepEqual(finish.missingQuotes, [{ id: 2353, side: 'sell' }])
  const absent = full({ ...base, quotes: [] })
  assert.equal(absent.cashOutlay, null)
  assert.equal(absent.budgetFeasible, null)
  assert.equal(absent.economicGain, null)
  assert.deepEqual(absent.missingQuotes, [{ id: 440, side: 'buy' }, { id: 453, side: 'buy' }, { id: 2, side: 'sell' }])
  for (const bad of [0, -1, NaN, Infinity]) assert.equal(full({ ...base, quotes: base.quotes.map(q => q.id === 2 ? { ...q, sell: bad } : q) }).netRevenue, null)
})
test('time sums sequential actions, never assumes missing rates or reinvests', () => {
  assert.equal(full(base).activeHours, null)
  const rates = { [steel.stages[0].recipeId]: 3, [steel.stages[1].recipeId]: 6 }
  assert.equal(full({ ...base, actionsPerHour: rates, budget: 59 }).activeHours, 1.5)
  assert.equal(full({ ...base, budget: 59 }).budgetFeasible, false)
  assert.equal(full({ ...base, budget: 60 }).budgetFeasible, true)
  assert.equal(evaluateProductionRoutes({ ...base, actionsPerHour: rates }).plans[1].activeHours, .5)
})
test('herb definitions use vetted ids, conserve water and clean herbs and support zero batches', () => {
  for (const [id, raw, clean, final] of [['ranarr', 207, 257, 99], ['snapdragon', 3051, 3000, 3004]] as const) {
    const route = productionRoutes.find(r => r.id === id)!
    assert.deepEqual(route.stages.map(s => s.recipeId), [`clean:${raw}`, `unf:${final}`])
    const p = full({ ...base, route, batches: 2, quotes: [raw, clean, final, 227].map(id => ({ id, buy: 100, sell: 110 })) })
    assert.deepEqual(p.purchases.map(p => [p.id, p.quantity]), [[raw, 2], [227, 2]])
    assert.equal(p.outputTax, 4)
    assert.equal(p.activeHours, null)
  }
  const zero = full({ ...base, batches: 0, quotes: [] })
  assert.equal(zero.economicGain, 0)
  assert.equal(zero.activeHours, 0)
  assert.throws(() => full({ ...base, batches: 1.5 }), RangeError)
  assert.throws(() => full({ ...base, owned: { 440: -1 } }), RangeError)
})
test('rejects unvetted chains and modified vetted recipes', () => {
  const modified = { ...steel, stages: [{ ...steel.stages[0], coinCost: 2 }, steel.stages[1]] as const }
  assert.throws(() => evaluateProductionRoutes({ ...base, route: modified }), RangeError)
  assert.throws(() => evaluateProductionRoutes({ ...base, route: { ...steel, id: 'unsupported' } }), RangeError)
  const unsupported = { id: 'other', stages: [
    { recipeId: 'a', inputs: [{ id: 10, qty: 1 }], output: { id: 11, qty: 1 }, coinCost: 0 },
    { recipeId: 'b', inputs: [{ id: 11, qty: 1 }], output: { id: 12, qty: 1 }, coinCost: 0 }
  ] as const }
  assert.throws(() => evaluateProductionRoutes({ ...base, route: unsupported }), RangeError)
})
test('invalid finished buy quote never becomes free acquisition', () => {
  for (const buy of [0, -1, NaN, Infinity, null]) {
    const r = evaluateProductionRoutes({ ...base, quotes: base.quotes.map(q => q.id === 2 ? { ...q, buy } : q) })
    assert.equal(r.acquisitionBaseline.cashOutlay, null)
    assert.deepEqual(r.acquisitionBaseline.missingQuotes, [{ id: 2, side: 'buy' }])
  }
  assert.equal(evaluateProductionRoutes({ ...base, batches: 0, quotes: [] }).acquisitionBaseline.cashOutlay, 0)
})
