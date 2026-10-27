import { test } from 'node:test'
import assert from 'node:assert/strict'
import { combineBatches, type CombinedBatchSelection } from '../combinedBatches.ts'

const first = { inputs: [{ id: 1, qty: 2 }], outputs: [{ id: 3, qty: 1 }], coinCost: 5 }
const second = { inputs: [{ id: 1, qty: 3 }], outputs: [{ id: 3, qty: 2 }], coinCost: 7 }
const prices = () => ({ buy: 10, sell: 99 })
const tax = (price: number) => Math.floor(price * 0.02)

test('shared inputs of different ratios consume owned stock and remaining once', () => {
  const result = combineBatches([{ recipe: first, goal: 2 }, { recipe: second, goal: 3 }], {
    prices, tax, budget: 122, allowances: { 1: { owned: 4, remaining: 9 } }
  })
  assert.deepEqual(result.ingredients.map(i => [i.required, i.ownedConsumed, i.shopping, i.surplus]), [[13, 4, 9, 0]])
  assert.equal(result.fees, 31)
  assert.equal(result.cashNeeded, 121)
  assert.equal(result.budgetFit, 'fits')
  assert.equal(result.allowanceStatus, 'feasible')
  assert.equal(result.replacementCost, 161)
  assert.equal(result.ownedReplacementCost, 40)
  assert.equal(result.outputTax, 8)
  assert.equal(result.netProceeds, 784)
  assert.equal(result.projectedMargin, 623)
  assert.deepEqual(result.outputs.map(i => [i.selectionIndex, i.quantity, i.taxPerUnit, i.outputTax]), [[0, 2, 1, 2], [1, 6, 1, 6]])
})

test('empty selections and zero goals need no quotes, cash, tax or allowances', () => {
  const options = { prices: () => null, tax: () => { throw new Error('No units sold') }, budget: 0 }
  assert.equal(combineBatches([], options).cashNeeded, 0)
  const result = combineBatches([{ recipe: first, goal: 0 }, { recipe: second, goal: 0 }], options)
  assert.equal(result.cashNeeded, 0)
  assert.equal(result.replacementCost, 0)
  assert.equal(result.netProceeds, 0)
  assert.equal(result.outputTax, 0)
  assert.equal(result.projectedMargin, 0)
  assert.equal(result.budgetFit, 'fits')
  assert.equal(result.allowanceStatus, 'feasible')
})

test('owned stock covers cash with unknown replacement value and retains unused stock', () => {
  const result = combineBatches([{ recipe: first, goal: 2 }], {
    prices: id => ({ buy: null, sell: id === 3 ? 99 : null }), tax, budget: 10,
    allowances: { 1: { owned: 9, remaining: null } }
  })
  assert.equal(result.cashNeeded, 10)
  assert.equal(result.budgetFit, 'fits')
  assert.equal(result.allowanceStatus, 'feasible')
  assert.equal(result.ingredients[0].surplus, 5)
  assert.equal(result.ingredients[0].ownedConsumed, 4)
  assert.equal(result.replacementCost, null)
  assert.equal(result.ownedReplacementCost, null)
  assert.equal(result.projectedMargin, null)
})

test('fees reserve cash and unknown purchases cannot fit an exhausted budget', () => {
  const selections = [{ recipe: first, goal: 1 }, { recipe: second, goal: 1 }]
  for (const budget of [0, 11, 12, 13]) {
    const result = combineBatches(selections, { prices: () => null, tax, budget })
    assert.equal(result.fees, 12)
    assert.equal(result.cashNeeded, null)
    assert.equal(result.budgetFit, budget <= 12 ? 'exceeds' : 'unknown')
    assert.equal(result.netProceeds, null)
    assert.equal(result.projectedMargin, null)
  }
  assert.equal(combineBatches(selections, { prices, tax, budget: 61 }).budgetFit, 'exceeds')
  assert.equal(combineBatches(selections, { prices, tax, budget: 62 }).budgetFit, 'fits')
})

test('output/input overlap stays independent even with coin revenue and owned stock', () => {
  const result = combineBatches([
    { recipe: { inputs: [{ id: 1, qty: 2 }], outputs: [{ id: 2, qty: 10 }], coinRevenue: 1000 }, goal: 1 },
    { recipe: { inputs: [{ id: 2, qty: 3 }], outputs: [{ id: 1, qty: 1 }] }, goal: 2 }
  ], { prices, tax, budget: 0, allowances: { 1: { owned: 1, remaining: 1 }, 2: { owned: 1, remaining: 5 } } })
  assert.deepEqual(result.ingredients.map(i => [i.id, i.required, i.shopping, i.ownedConsumed]), [[1, 2, 1, 1], [2, 6, 5, 1]])
  assert.equal(result.cashNeeded, 60)
  assert.equal(result.budgetFit, 'exceeds')
  assert.equal(result.replacementCost, 80)
  assert.equal(result.ownedReplacementCost, 20)
  assert.equal(result.netProceeds, 2176)
  assert.equal(result.projectedMargin, 2096)
})

test('tax rounds per unit across duplicate outputs and recipes and respects item IDs', () => {
  const result = combineBatches([
    { recipe: { ...first, outputs: [{ id: 3, qty: 2 }, { id: 3, qty: 1 }, { id: 4, qty: 1 }] }, goal: 2 },
    { recipe: second, goal: 1 }
  ], { prices, tax: (price, id) => id === 4 ? 0 : tax(price), budget: 1000 })
  assert.equal(result.outputs.length, 4)
  assert.deepEqual(result.outputs.map(o => o.outputTax), [4, 2, 0, 2])
  assert.equal(result.outputTax, 8)
  assert.equal(result.netProceeds, 982)
})

test('a known allowance blocker wins over unknowns; full caps never stand in for remaining', () => {
  const selections = [{ recipe: first, goal: 1 }, { recipe: { ...second, inputs: [{ id: 2, qty: 3 }] }, goal: 1 }]
  const result = combineBatches(selections, { prices, tax, budget: 100, allowances: {
    1: { owned: 0, remaining: 0, knownFullLimit: 10 }, 2: { owned: 0, remaining: null, knownFullLimit: 100 }
  } })
  assert.equal(result.allowanceStatus, 'blocked')
  assert.deepEqual(result.ingredients.map(i => [i.status, i.knownShortfall]), [['exceeds', 2], ['unknown', null]])
  assert.equal(combineBatches([{ recipe: first, goal: 1 }], {
    prices, tax, budget: 100, allowances: { 1: { owned: 0, remaining: null, knownFullLimit: 10 } }
  }).allowanceStatus, 'unknown')
})

test('invalid goals, legs, money, declarations, tax and overflowing arithmetic fail explicitly', () => {
  const run = (recipe: CombinedBatchSelection['recipe'] = first, goal = 1, options = {}) => combineBatches([{ recipe, goal }], { prices, tax, budget: 100, ...options })
  for (const invalid of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => run(first, invalid), RangeError)
    assert.throws(() => run({ ...first, inputs: [{ id: 1, qty: invalid }] }), RangeError)
    assert.throws(() => run({ ...first, outputs: [{ id: 3, qty: invalid }] }), RangeError)
    assert.throws(() => run({ ...first, coinCost: invalid }), RangeError)
    assert.throws(() => run({ ...first, coinRevenue: invalid }), RangeError)
    assert.throws(() => run(first, 1, { budget: invalid }), RangeError)
    assert.throws(() => run(first, 1, { prices: () => ({ buy: invalid, sell: 99 }) }), RangeError)
    assert.throws(() => run(first, 1, { tax: () => invalid }), RangeError)
    assert.throws(() => run(first, 1, { allowances: { 1: { owned: invalid, remaining: 0 } } }), RangeError)
    assert.throws(() => run(first, 1, { allowances: { 1: { owned: 0, remaining: invalid } } }), RangeError)
  }
  assert.throws(() => run({ ...first, inputs: [] }), RangeError)
  assert.throws(() => run({ ...first, outputs: [] }), RangeError)
  assert.throws(() => run({ ...first, inputs: [{ id: 0, qty: 1 }] }), RangeError)
  assert.throws(() => run({ ...first, inputs: [{ id: 1, qty: 0 }] }), RangeError)
  assert.throws(() => run(first, 1, { tax: () => 100 }), RangeError)
  assert.throws(() => run(first, 1, { allowances: { 1: { owned: 0, remaining: 11, knownFullLimit: 10 } } }), RangeError)
  const max = Number.MAX_SAFE_INTEGER
  assert.throws(() => run(first, max), RangeError)
  assert.throws(() => run(first, 1, { prices: () => ({ buy: max, sell: 99 }) }), RangeError)
  assert.throws(() => run(first, 1, { allowances: { 1: { owned: max, remaining: 1 } } }), RangeError)
  assert.throws(() => combineBatches([{ recipe: { ...first, inputs: [{ id: 1, qty: max }], coinCost: 0 }, goal: 1 }, { recipe: second, goal: 1 }], { prices, tax, budget: 0 }), RangeError)
  assert.throws(() => combineBatches(Array.from({ length: 3 }, () => ({ recipe: first, goal: 1 })), { prices, tax, budget: 0 }), RangeError)
})

test('gross sale overflow is rejected even if tax and net proceeds individually fit', () => {
  const sell = Math.floor(Number.MAX_SAFE_INTEGER / 2)
  assert.throws(() => combineBatches([{ recipe: { ...first, outputs: [{ id: 3, qty: 3 }] }, goal: 1 }], {
    prices: () => ({ buy: 1, sell }), tax: () => Math.floor(sell / 2), budget: 10
  }), RangeError)
})
