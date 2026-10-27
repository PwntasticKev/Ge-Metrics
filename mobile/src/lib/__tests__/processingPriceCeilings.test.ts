import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Market, MarketItem, ProcessRecipe } from '@ge/engine'
import { computeProcessFlip } from '../../../../src/domain/flipping/processFlip.js'
import { processingPriceCeilings } from '../processingPriceCeilings.ts'

const recipe: ProcessRecipe = { id: 'test', method: 'test', inputs: [{ id: 1, qty: 2 }, { id: 2, qty: 1 }], outputs: [{ id: 3, qty: 3 }], coinCost: 7, coinRevenue: 5 }
function market (prices: Record<number, [number | null, number | null]> = { 1: [20, 999], 2: [10, 999], 3: [999, 99] }): Market {
  const items = Object.entries(prices).map(([id, [low, high]]) => ({ id: Number(id), low, high, name: id, icon: null, members: false, limit: null, highalch: null, lowTime: null, highTime: null, dailyVolume: null } satisfies MarketItem))
  return { nowSec: 1, get: id => items.find(i => i.id === id) ?? null, all: () => items }
}
test('ceilings hold all other quotes fixed and straddle canonical one-action profit', () => {
  const m = market()
  const result = processingPriceCeilings(recipe, m)
  assert.equal(result.assumption, 'other-input-quotes-and-output-quotes-held-fixed')
  assert.equal(result.ingredients[0].ceiling, 141)
  assert.equal(result.ingredients[0].currentQuote, 20)
  assert.equal(result.ingredients[0].headroom, 121)
  for (const row of result.ingredients) {
    assert.equal(row.reason, null)
    const profit = (price: number) => computeProcessFlip(recipe, { ...m, get: (id: number) => { const item = m.get(id); return item && id === row.id ? { ...item, low: price } : item } })!.profit
    assert.ok(profit(row.ceiling!) >= 0)
    assert.ok(profit(row.ceiling! + 1) < 0)
  }
})
test('aggregates repeated IDs and retains fractional notional quotes', () => {
  const r = { ...recipe, inputs: [{ id: 1, qty: 2 }, { id: 1, qty: 3 }] }
  const row = processingPriceCeilings(r, market({ 1: [20.5, 1], 3: [1, 99.5] })).ingredients[0]
  assert.equal(row.quantity, 5)
  assert.equal(row.ceiling, 58)
  assert.equal(row.headroom, 37.5)
})
test('uses item exemptions, per-unit flooring, cap, and untaxed coin-only revenue', () => {
  const r = { ...recipe, inputs: [{ id: 1, qty: 1 }], outputs: [{ id: 8007, qty: 2 }] }
  assert.equal(processingPriceCeilings(r, market({ 1: [1, 1], 8007: [1, 99] })).ingredients[0].ceiling, 196)
  assert.equal(processingPriceCeilings({ ...r, outputs: [{ id: 3, qty: 2 }] }, market({ 1: [1, 1], 3: [1, 99] })).ingredients[0].ceiling, 194)
  assert.equal(processingPriceCeilings({ ...r, outputs: [{ id: 3, qty: 1 }] }, market({ 1: [1, 1], 3: [1, 1e9] })).ingredients[0].ceiling, 994999998)
  assert.equal(processingPriceCeilings({ ...r, outputs: [], coinRevenue: 100 }, market()).ingredients[0].ceiling, 93)
})
test('missing any selected quote stays unknown, including the varied ingredient', () => {
  for (const prices of [{ 1: [null, 1], 2: [10, 1], 3: [1, 99] }, { 1: [20, 1], 3: [1, 99] }, { 1: [20, 1], 2: [10, 1], 3: [1, null] }] as Record<number, [number | null, number | null]>[]) {
    assert.ok(processingPriceCeilings(recipe, market(prices)).ingredients.every(r => r.ceiling === null && r.reason === 'missing-quote'))
  }
})
test('distinguishes zero ceiling from no feasible nonnegative quote and negative headroom', () => {
  const r = { ...recipe, inputs: [{ id: 1, qty: 1 }], outputs: [], coinRevenue: 7 }
  assert.equal(processingPriceCeilings(r, market()).ingredients[0].ceiling, 0)
  assert.equal(processingPriceCeilings(r, market()).ingredients[0].headroom, -20)
  const row = processingPriceCeilings({ ...r, coinRevenue: 6 }, market()).ingredients[0]
  assert.equal(row.ceiling, null)
  assert.equal(row.reason, 'no-nonnegative-price')
})
test('circular input/output IDs are explicit unsupported rows', () => {
  const rows = processingPriceCeilings({ ...recipe, outputs: [{ id: 1, qty: 1 }] }, market()).ingredients
  assert.equal(rows[0].reason, 'unsupported-circular-item')
  assert.equal(rows[0].ceiling, null)
  assert.equal(rows[1].reason, null)
})
test('rejects invalid quantities, money and unsafe arithmetic explicitly', () => {
  for (const qty of [0, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(processingPriceCeilings({ ...recipe, inputs: [{ id: 1, qty }] }, market()).ingredients[0].reason, 'invalid-value')
  }
  for (const coinCost of [-1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(processingPriceCeilings({ ...recipe, coinCost }, market()).ingredients[0].reason, 'invalid-value')
  }
  for (const price of [0, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
    assert.equal(processingPriceCeilings(recipe, market({ 1: [price, 1], 2: [10, 1], 3: [1, 99] })).ingredients[0].reason, 'invalid-value')
  }
  assert.equal(processingPriceCeilings({ ...recipe, inputs: [{ id: 1, qty: Number.MAX_SAFE_INTEGER }, { id: 1, qty: 1 }] }, market()).ingredients[0].reason, 'invalid-value')
})

function canonicalProfit (r: ProcessRecipe, m: Market, id: number, price: number) {
  return computeProcessFlip(r, { ...m, get: (key: number) => {
    const item = m.get(key)
    return item && key === id ? { ...item, low: price } : item
  } })!.profit
}
test('supports fractional quantities and repeated fractional inputs with maximal ceilings', () => {
  for (const inputs of [[{ id: 1, qty: 0.5 }], [{ id: 1, qty: 0.2 }, { id: 1, qty: 0.3 }]]) {
    const r = { ...recipe, inputs, outputs: [], coinCost: 0, coinRevenue: 100 }
    const m = market()
    const row = processingPriceCeilings(r, m).ingredients[0]
    assert.equal(row.ceiling, 200)
    assert.equal(row.reason, null)
    assert.ok(canonicalProfit(r, m, 1, row.ceiling!) >= 0)
    assert.ok(canonicalProfit(r, m, 1, row.ceiling! + 1) < 0)
  }
})
test('uses canonical operation order at precision boundaries', () => {
  const r = { ...recipe, inputs: [{ id: 1, qty: 1 }, { id: 2, qty: 1 }], outputs: [], coinRevenue: 1000000000000000.2, coinCost: 0.1 }
  const m = market({ 1: [1, 1], 2: [0.2, 1] })
  const row = processingPriceCeilings(r, m).ingredients[0]
  assert.equal(row.ceiling, 999999999999999)
  assert.ok(canonicalProfit(r, m, 1, row.ceiling!) >= 0)
  assert.ok(canonicalProfit(r, m, 1, row.ceiling! + 1) < 0)
})
test('fails explicitly when a maximal boundary cannot be verified safely', () => {
  for (const qty of [Number.MIN_VALUE, 1e-20]) {
    const r = { ...recipe, inputs: [{ id: 1, qty }], outputs: [], coinCost: 0, coinRevenue: 100 }
    assert.equal(processingPriceCeilings(r, market()).ingredients[0].reason, 'invalid-value')
  }
  const r = { ...recipe, inputs: [{ id: 1, qty: 1 }], outputs: [], coinCost: 0, coinRevenue: Number.MAX_SAFE_INTEGER }
  assert.equal(processingPriceCeilings(r, market()).ingredients[0].reason, 'invalid-value')
})
test('zero feasibility uses canonical cost before tax and does not treat a null engine result as profit', () => {
  const r = { ...recipe, inputs: [{ id: 1, qty: 0.5 }], outputs: [], coinCost: 7, coinRevenue: 7 }
  const m = market()
  assert.equal(computeProcessFlip(r, { ...m, get: (id: number) => { const item = m.get(id); return item ? { ...item, low: 0 } : item } }), null)
  assert.equal(processingPriceCeilings(r, m).ingredients[0].ceiling, 0)
  assert.equal(processingPriceCeilings({ ...r, coinRevenue: 6.9 }, m).ingredients[0].reason, 'no-nonnegative-price')
})

test('fractional output quantities retain canonical tax and revenue ordering', () => {
  const r = { ...recipe, inputs: [{ id: 1, qty: 0.14 }, { id: 2, qty: 0.3 }, { id: 1, qty: 0.21 }], outputs: [{ id: 3, qty: 0.7 }, { id: 3, qty: 0.1 }] }
  const m = market()
  for (const row of processingPriceCeilings(r, m).ingredients) {
    assert.equal(row.reason, null)
    assert.ok(canonicalProfit(r, m, row.id, row.ceiling!) >= 0)
    assert.ok(canonicalProfit(r, m, row.id, row.ceiling! + 1) < 0)
  }
  assert.equal(processingPriceCeilings({ ...r, outputs: [{ id: 3, qty: Number.MAX_SAFE_INTEGER }] }, m).ingredients[0].reason, 'invalid-value')
})
