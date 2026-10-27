import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Market, MarketItem, ProcessRecipe } from '@ge/engine'
import { computeProcessFlip } from '../../../../src/domain/flipping/processFlip.js'
import { processingStress } from '../processingStress.ts'

const recipe: ProcessRecipe = { id: 'stress', method: 'test', inputs: [{ id: 1, qty: 0.14 }, { id: 2, qty: 0.3 }, { id: 1, qty: 0.21 }], outputs: [{ id: 3, qty: 0.7 }, { id: 3, qty: 0.1 }], coinCost: 7, coinRevenue: 5 }
function market (low: number | null = 20.5, high: number | null = 99.5): Market {
  const items = [1, 2, 3, 8007].map(id => ({ id, low, high, name: String(id), icon: null, members: false, limit: null, highalch: null, lowTime: null, highTime: null, dailyVolume: null } satisfies MarketItem))
  return { nowSec: 1, get: id => items.find(i => i.id === id) ?? null, all: () => items }
}
test('zero bps exactly matches canonical fractional quotes, quantities and repeated rows', () => {
  const result = processingStress(recipe, market(), { inputCostIncreaseBps: 0, outputPriceCutBps: 0, actions: null })
  assert.equal(result.reason, null)
  const canonical = computeProcessFlip(recipe, market())!
  for (const key of ['cost', 'revenue', 'tax', 'profit'] as const) assert.equal(result.baseline![key], canonical[key])
  assert.deepEqual(result.stress, result.baseline)
  assert.equal(result.batch, null)
})

const options = { inputCostIncreaseBps: 0, outputPriceCutBps: 0, actions: 10 }
const simple: ProcessRecipe = { ...recipe, inputs: [{ id: 1, qty: 2 }], outputs: [{ id: 3, qty: 3 }] }
test('stress recomputes per-unit tax floors, exemptions and caps while holding coin flows fixed', () => {
  for (const [id, high, cut, tax] of [[3, 99, 0, 3], [3, 100, 100, 3], [8007, 100, 0, 0], [3, 1e9, 1000, 15000000], [3, 50, 1, 0]]) {
    const r = { ...simple, outputs: [{ id, qty: 3 }] }
    const result = processingStress(r, market(20, high), { ...options, outputPriceCutBps: cut, inputCostIncreaseBps: 5000 })
    assert.equal(result.stress!.tax, tax)
    assert.equal(result.stress!.cost, 67)
    assert.equal(result.stress!.revenue, high * (1 - cut / 10000) * 3 + 5)
  }
})
test('fixed quantity exposes increased capital and falling margin without resizing', () => {
  const result = processingStress(simple, market(20, 100), { ...options, inputCostIncreaseBps: 5000, outputPriceCutBps: 1000 })
  assert.deepEqual(result.baseline, { cost: 47, revenue: 305, tax: 6, profit: 252 })
  assert.deepEqual(result.stress, { cost: 67, revenue: 275, tax: 3, profit: 205 })
  assert.deepEqual(result.batch, { actions: 10, baselineMargin: 2520, stressMargin: 2050, cashDelta: -470, marginFall: 470, baselineCapital: 470, stressCapital: 670, capitalIncrease: 200 })
})
test('100% cut gives zero item liquidation and negative profit, retaining coin revenue', () => {
  const result = processingStress(simple, market(20, 100), { ...options, outputPriceCutBps: 10000 })
  assert.deepEqual(result.stress, { cost: 47, revenue: 5, tax: 0, profit: -42 })
  assert.equal(result.batch!.stressMargin, -420)
  const coinOnly = processingStress({ ...simple, outputs: [], coinRevenue: 100 }, market(), { ...options, outputPriceCutBps: 10000 })
  assert.equal(coinOnly.stress!.revenue, 100)
  assert.equal(coinOnly.stress!.tax, 0)
})
test('multi-input/output stress matches canonical engine at positive stressed quotes', () => {
  const r = { ...recipe, outputs: [...recipe.outputs, { id: 8007, qty: 0.3 }] }
  const m = market()
  const stressed: Market = { ...m, get: id => { const item = m.get(id); return item && { ...item, low: item.low! * 1.1234, high: item.high! * 0.8766 } } }
  const expected = computeProcessFlip(r, stressed)!
  const actual = processingStress(r, m, { ...options, inputCostIncreaseBps: 1234, outputPriceCutBps: 1234 }).stress!
  for (const key of ['cost', 'revenue', 'tax', 'profit'] as const) assert.equal(actual[key], expected[key])
})
test('missing selected quotes are explicit unknown and untimed batches remain null', () => {
  for (const m of [market(null), market(20, null), { ...market(), get: () => null }]) {
    const result = processingStress(simple, m, options)
    assert.equal(result.reason, 'missing-quote')
    assert.equal(result.baseline, null)
    assert.equal(result.stress, null)
    assert.equal(result.batch, null)
  }
  assert.equal(processingStress(simple, market(), { ...options, actions: null }).batch, null)
  assert.equal(processingStress(simple, market(), { ...options, actions: 0 }).batch!.stressCapital, 0)
})
test('rejects invalid basis points, quantities, money, actions and overflowing arithmetic', () => {
  const invalid = (r: ProcessRecipe, m: Market, o = options) => assert.equal(processingStress(r, m, o).reason, 'invalid-value')
  for (const value of [-1, 0.5, 10001, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    invalid(simple, market(), { ...options, inputCostIncreaseBps: value })
    invalid(simple, market(), { ...options, outputPriceCutBps: value })
  }
  for (const value of [-1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    invalid({ ...simple, coinCost: value }, market())
    invalid({ ...simple, coinRevenue: value }, market())
    invalid(simple, market(value))
    invalid(simple, market(20, value))
  }
  for (const qty of [0, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
    invalid({ ...simple, inputs: [{ id: 1, qty }] }, market())
    invalid({ ...simple, outputs: [{ id: 3, qty }] }, market())
  }
  for (const actions of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER]) invalid(simple, market(), { ...options, actions })
  invalid(simple, market(0))
  invalid(simple, market(20, 0))
  invalid(simple, market(Number.MAX_SAFE_INTEGER))
  invalid({ ...simple, inputs: [{ id: 1, qty: 1 }], coinCost: Number.MAX_SAFE_INTEGER }, market())
  invalid({ ...simple, inputs: [{ id: 1, qty: 1 }] }, market(Number.MAX_SAFE_INTEGER / 1.5), { ...options, inputCostIncreaseBps: 10000 })
})
test('rejects quantity overflow even when tiny quotes keep money small', () => {
  const r = { ...simple, inputs: [{ id: 1, qty: Number.MAX_SAFE_INTEGER }, { id: 1, qty: 1 }] }
  assert.equal(processingStress(r, market(1e-10), { ...options, actions: null }).reason, 'invalid-value')
  assert.equal(processingStress({ ...r, inputs: r.inputs.slice(0, 1) }, market(1e-10), { ...options, actions: 2 }).reason, 'invalid-value')
})
test('preserves canonical addition order at large fractional money boundaries', () => {
  const r = { ...simple, inputs: [{ id: 1, qty: 1 }, { id: 2, qty: 0.2 }], outputs: [], coinCost: 0.1, coinRevenue: 1000000000000000.2 }
  const expected = computeProcessFlip(r, market(1))!
  const actual = processingStress(r, market(1), { ...options, actions: null })
  assert.equal(actual.baseline!.profit, expected.profit)
  assert.deepEqual(actual.stress, actual.baseline)
})
