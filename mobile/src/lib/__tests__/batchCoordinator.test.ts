import { test } from 'node:test'
import assert from 'node:assert/strict'
import { coordinateBatch } from '../batchCoordinator.ts'

const recipe = { inputs: [{ id: 1, qty: 2 }, { id: 2, qty: 3 }], outputs: [{ id: 3, qty: 4 }], coinCost: 5 }
const prices = (id: number) => ({ buy: id === 1 ? 10 : 20, sell: 100 })
const tax = () => 2
const plan = (owned = { 1: 9, 2: 7 }, budget = 1000) => coordinateBatch(recipe, 5, budget, owned, prices, tax)
test('whole batches, shopping, stranded stock and multiple output tax', () => {
  const p = plan()
  assert.equal(p.complete, 2)
  assert.deepEqual(p.bottlenecks, [2])
  assert.deepEqual(p.ingredients.map(i => [i.shopping, i.stranded, i.surplus]), [[1, 5, 0], [8, 1, 0]])
  assert.equal(p.cashNeeded, 195)
  assert.equal(p.fees, 25)
  assert.equal(p.outputTax, 40)
  assert.equal(p.netProceeds, 1960)
  assert.equal(p.replacementCost, 425)
  assert.equal(p.ownedReplacementCost, 230)
  assert.equal(p.projectedMargin, 1535)
})
test('budget includes fees and only missing inputs, without reinvestment', () => {
  assert.equal(plan(undefined, 194).affordable, 4)
  assert.equal(plan(undefined, 195).affordable, 5)
  assert.equal(plan({ 1: 100, 2: 100 }, 9).affordable, 1)
  assert.equal(plan({ 1: 100, 2: 100 }, 9).ingredients[0].surplus, 90)
})
test('duplicate ingredients aggregate and ties are retained', () => {
  const p = coordinateBatch({ ...recipe, inputs: [{ id: 1, qty: 1 }, { id: 1, qty: 1 }, { id: 2, qty: 3 }] }, 5, 0, { 1: 4, 2: 6 }, prices, tax)
  assert.equal(p.complete, 2)
  assert.deepEqual(p.bottlenecks, [1, 2])
})
test('unknown quotes stay unknown, including no synthetic profit', () => {
  const p = coordinateBatch(recipe, 5, 1000, {}, () => null, tax)
  assert.equal(p.cashNeeded, null)
  assert.equal(p.projectedMargin, null)
  assert.equal(p.affordable, null)
})
test('missing full-goal quotes still allow exact affordability bounded by fees', () => {
  const missingBuy = (id: number) => ({ ...prices(id), buy: id === 2 ? null : prices(id).buy })
  const p = coordinateBatch(recipe, 5, 5, { 1: 9, 2: 7 }, missingBuy, tax)
  assert.equal(p.complete, 2)
  assert.equal(p.affordable, 1)
  assert.equal(p.cashNeeded, null)
  assert.equal(coordinateBatch(recipe, 5, 4, {}, missingBuy, tax).affordable, 0)
  assert.equal(coordinateBatch(recipe, 5, 20, { 1: 9, 2: 7 }, missingBuy, tax).affordable, null)
})
test('known purchases can bound affordability before unquoted purchases', () => {
  const p = coordinateBatch(recipe, 5, 25, { 1: 0, 2: 7 }, id => ({ ...prices(id), buy: id === 2 ? null : prices(id).buy }), tax)
  assert.equal(p.affordable, 1)
  assert.equal(p.cashNeeded, null)
})
test('unquoted purchases cannot fit when known costs exhaust the budget', () => {
  assert.equal(coordinateBatch(recipe, 5, 5, {}, () => null, tax).affordable, 0)
  assert.equal(coordinateBatch({ ...recipe, coinCost: 0 }, 5, 0, {}, () => null, tax).affordable, 0)
})
test('rejects fractional recipes and invalid goals instead of treating expected yields as deterministic', () => {
  assert.throws(() => coordinateBatch({ ...recipe, outputs: [{ id: 3, qty: 0.5 }] }, 5, 1, {}, prices, tax))
  assert.throws(() => coordinateBatch(recipe, NaN, 1, {}, prices, tax))
})
test('zero goal needs no cash; negative budget and owned counts clamp to zero', () => {
  assert.equal(coordinateBatch(recipe, 0, 0, {}, () => null, tax).cashNeeded, 0)
  assert.equal(plan({ 1: -1, 2: NaN }, -10).affordable, 0)
})
