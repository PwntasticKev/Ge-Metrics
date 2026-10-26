import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateSet, compareSet, batchConstraint } from '../setProfitLab.ts'
import { geTax } from '../../../../src/domain/flipping/geTax.js'

const recipe = { id: 'ge:1', kind: 'ge-set' as const, setId: 1, parts: [{ id: 2, qty: 2 }], reversible: true, conversionCost: 0 }
const quotes = [{ id: 1, name: 'Set', qty: 1, buy: 100, sell: 140, limit: 8 }, { id: 2, name: 'Part', qty: 2, buy: 50, sell: 70, limit: 10 }]
test('both directions tax each sold unit, including tax rounding', () => {
  const result = evaluateSet(recipe, quotes, 'split', geTax)!
  assert.equal(result.cost, 100)
  assert.equal(result.tax, 2)
  assert.equal(result.profit, 38)
  assert.equal(evaluateSet(recipe, quotes, 'combine', geTax)?.profit, 38)
})
test('component attribution reconciles to whole profit change including tax', () => {
  const prior = quotes.map(q => ({ ...q, buy: q.buy - 10, sell: q.sell - 10 }))
  const change = compareSet(recipe, quotes, prior, 'combine', geTax)!
  assert.equal(change.reduce((sum, row) => sum + row.impact, 0), -10)
  assert.equal(change.find(r => r.id === 2)?.impact, -20)
})
test('missing prices never become zero-cost components', () => {
  assert.equal(evaluateSet(recipe, quotes.slice(0, 1), 'combine', geTax), null)
})
test('batch respects component multiplicity, cash, sequential phases and unknown limits', () => {
  const plan = evaluateSet(recipe, quotes, 'combine', geTax)!
  const wait = (_id: number, _side: 'buy' | 'sell', _price: number, qty: number) => qty / 2
  assert.equal(batchConstraint(plan, quotes, 10000, 4, wait).quantity, 2)
  assert.equal(batchConstraint(plan, quotes, 99, 4, wait).quantity, 0)
  assert.equal(batchConstraint(plan, quotes.map(q => ({ ...q, limit: null })), 10000, 4, wait).quantity, null)
  assert.equal(batchConstraint(plan, quotes, 10000, 4, () => Infinity).quantity, 0)
})
test('sale sensitivity crosses tax thresholds per item, not per basket', () => {
  const changed = quotes.map(q => q.id === 2 ? { ...q, sell: 100 } : q)
  assert.equal(evaluateSet(recipe, changed, 'split', geTax)!.profit - evaluateSet(recipe, changed.map(q => q.id === 2 ? { ...q, sell: 99 } : q), 'split', geTax)!.profit, 0)
})
test('invalid cash and zero windows cannot produce a supported batch', () => {
  const plan = evaluateSet(recipe, quotes, 'combine', geTax)!
  assert.equal(batchConstraint(plan, quotes, Infinity, 4, () => 0).quantity, 0)
  assert.equal(batchConstraint(plan, quotes, 10000, 0, () => 0).quantity, 0)
})
test('combine accepts absent set buy and part sell prices', () => {
  const partial = quotes.map(q => q.id === 1 ? { ...q, buy: null } : { ...q, sell: null })
  assert.equal(evaluateSet(recipe, partial, 'combine', geTax)?.profit, 38)
  assert.equal(evaluateSet(recipe, partial, 'split', geTax), null)
})
test('split accepts absent set sell and part buy prices', () => {
  const partial = quotes.map(q => q.id === 1 ? { ...q, sell: null } : { ...q, buy: null })
  assert.equal(evaluateSet(recipe, partial, 'split', geTax)?.profit, 38)
  assert.equal(evaluateSet(recipe, partial, 'combine', geTax), null)
})
test('missing or invalid required sides make a direction unavailable', () => {
  for (const value of [null, NaN, Infinity, 0, -1]) {
    for (const direction of ['combine', 'split'] as const) {
      for (const id of [1, 2]) {
        const side = (direction === 'combine') === (id === 2) ? 'buy' : 'sell'
        assert.equal(evaluateSet(recipe, quotes.map(q => q.id === id ? { ...q, [side]: value } : q), direction, geTax), null)
      }
    }
  }
})
test('comparison reconciles directional partial current and baseline prices', () => {
  for (const direction of ['combine', 'split'] as const) {
    const partial = quotes.map(q => (direction === 'combine') === (q.id === 1) ? { ...q, buy: null } : { ...q, sell: null })
    const prior = partial.map(q => ({ ...q, buy: q.buy == null ? null : q.buy - 10, sell: q.sell == null ? null : q.sell - 10 }))
    const changes = compareSet(recipe, partial, prior, direction, geTax)!
    assert.equal(changes.length, 2)
    assert.equal(changes.reduce((sum, row) => sum + row.impact, 0), evaluateSet(recipe, partial, direction, geTax)!.profit - evaluateSet(recipe, prior, direction, geTax)!.profit)
    assert.equal(compareSet(recipe, partial, prior.map(q => ({ ...q, buy: null, sell: null })), direction, geTax), null)
  }
})
