import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ownedOpportunity } from './ownedOpportunity.ts'

const recipe = { inputs: [{ id: 1, qty: 2 }, { id: 2, qty: 1 }], outputs: [{ id: 3, qty: 2 }, { id: 4, qty: 1 }], coinCost: 3, coinRevenue: 2 }
const market = new Map([[1, { high: 10, low: 8 }], [2, { high: 20, low: 15 }], [3, { high: 100, low: 50 }], [4, { high: 40, low: 30 }], [99, { high: NaN, low: NaN }]])
const run = (owned = { 1: '5', 2: '1', 99: 'invalid' }, quotes = market, goal = 2) => ownedOpportunity(recipe, goal, 20, owned, id => quotes.get(id), () => 1)
test('adapts selected stock and instant sides, retaining surplus and independent cash shortfall', () => {
  const state = run()
  assert.equal(state.kind, 'ready')
  if (state.kind !== 'ready') return
  assert.deepEqual(state.result.items.map(i => i.id), [1, 2, 3, 4])
  assert.equal(state.result.items[0].surplus, 1)
  assert.equal(state.result.newCashNeeded, 26)
  assert.equal(state.result.cashShortfall, 6)
  assert.equal(state.result.sellNowConsumedOwned, 42)
  assert.equal(state.result.netReceipts, 258)
  assert.equal(state.result.incrementalValue, 190)
})
test('multi-output missing liquidation quote stays unknown while cash remains known', () => {
  const quotes = new Map(market)
  quotes.delete(4)
  const state = run(undefined, quotes)
  assert.equal(state.kind, 'ready')
  if (state.kind !== 'ready') return
  assert.equal(state.result.incrementalValue, null)
  assert.equal(state.result.newCashNeeded, 26)
  assert.deepEqual(state.result.missingQuotes, [{ id: 4, side: 'sell' }])
})
test('invalid selected stock and unsupported or overflowing core inputs become unavailable', () => {
  assert.equal(run({ 1: '1.5', 2: '0', 99: '' }).kind, 'unavailable')
  assert.equal(ownedOpportunity({ ...recipe, coinCost: 0.5 }, 2, 20, {}, id => market.get(id), () => 0).kind, 'unavailable')
  assert.equal(ownedOpportunity({ ...recipe, coinCost: Number.MAX_SAFE_INTEGER }, 2, 20, {}, id => market.get(id), () => 0).kind, 'unavailable')
  assert.equal(ownedOpportunity(recipe, null, 20, {}, () => undefined, () => 0).kind, 'unavailable')
})
test('zero goal needs no quotes and zero quotes are preserved', () => {
  const zero = run(undefined, new Map(), 0)
  assert.equal(zero.kind === 'ready' && zero.result.incrementalValue, 0)
  const free = ownedOpportunity(recipe, 1, 20, {}, () => ({ high: 0, low: 0 }), () => 0)
  assert.equal(free.kind === 'ready' && free.result.newCashNeeded, 3)
})
