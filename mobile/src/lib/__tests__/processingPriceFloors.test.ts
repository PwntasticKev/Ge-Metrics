import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Market, MarketItem, ProcessRecipe } from '@ge/engine'
import { computeProcessFlip } from '../../../../src/domain/flipping/processFlip.js'
import { processingPriceFloors } from '../processingPriceFloors.ts'

function market (low = 50, high: number | null = 60): Market {
  return { nowSec: 1, all: () => [], get: (id: number) => ({ id, low, high, name: String(id), icon: null, members: false, limit: null, highalch: null, lowTime: null, highTime: null, dailyVolume: null } satisfies MarketItem) }
}
const recipe: ProcessRecipe = { id: 'floor', method: 'test', inputs: [{ id: 1, qty: 1 }], outputs: [{ id: 3, qty: 1 }] }
function verify (r: ProcessRecipe, m: Market) {
  const result = processingPriceFloors(r, m)
  for (const row of result.outputs) {
    assert.equal(row.reason, null)
    const profit = (price: number) => computeProcessFlip(r, { ...m, get: (id: number) => { const item = m.get(id); return item && id === row.id ? { ...item, high: price } : item } })!.profit
    if (row.floor! > 0) assert.ok(profit(row.floor!) >= 0)
    if (row.floor! > 1) assert.ok(profit(row.floor! - 1) < 0)
  }
  return result.outputs
}
test('exact tax stairs, exemptions, cap and coin flows', () => {
  assert.equal(verify(recipe, market())[0].floor, 51)
  assert.equal(verify(recipe, market(49))[0].floor, 49)
  assert.equal(verify({ ...recipe, outputs: [{ id: 8007, qty: 1 }] }, market())[0].floor, 50)
  assert.equal(verify(recipe, market(1e9))[0].floor, 1005000000)
  const row = verify({ ...recipe, coinCost: 10, coinRevenue: 5 }, market())[0]
  assert.equal(row.floor, 56)
  assert.equal(row.headroom, 4)
  assert.equal(processingPriceFloors(recipe, market(100)).outputs[0].headroom, -42)
})
test('holds other output quotes fixed and varies repeated IDs together', () => {
  const r = { ...recipe, outputs: [{ id: 3, qty: 0.2 }, { id: 4, qty: 0.3 }, { id: 3, qty: 0.7 }], coinCost: 7, coinRevenue: 5 }
  const rows = verify(r, market(50.5, 60.5))
  assert.equal(rows.length, 2)
  assert.equal(rows[0].quantity, 0.8999999999999999)
  assert.equal(rows[0].currentQuote, 60.5)
})
test('preserves canonical fractional row and operation rounding', () => {
  verify({ ...recipe, inputs: [{ id: 1, qty: 0.14 }, { id: 2, qty: 0.3 }], outputs: [{ id: 3, qty: 0.7 }, { id: 3, qty: 0.1 }], coinCost: 0.1, coinRevenue: 0.2 }, market(100.2, 90.5))
  verify({ ...recipe, coinCost: 0.1, coinRevenue: 0.2 }, market(1000000000000000.2))
})
test('zero floor is valid mathematics despite engine rejecting zero quotes', () => {
  const r = { ...recipe, coinRevenue: 50 }
  const row = processingPriceFloors(r, market()).outputs[0]
  assert.equal(row.floor, 0)
  assert.equal(row.reason, null)
  assert.equal(processingPriceFloors(recipe, market(0.1)).outputs[0].floor, 1)
})
test('missing varied quote and any other selected quote stay unknown', () => {
  assert.equal(processingPriceFloors(recipe, market(50, null)).outputs[0].reason, 'missing-quote')
  const m = market()
  assert.equal(processingPriceFloors(recipe, { ...m, get: (id: number) => id === 1 ? null : m.get(id) }).outputs[0].reason, 'missing-quote')
})
test('invalid, overflow and circular rows are explicit', () => {
  for (const qty of [0, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(processingPriceFloors({ ...recipe, outputs: [{ id: 3, qty }] }, market()).outputs[0].reason, 'invalid-value')
  }
  for (const value of [0, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.equal(processingPriceFloors(recipe, market(50, value)).outputs[0].reason, 'invalid-value')
  assert.equal(processingPriceFloors({ ...recipe, coinCost: Infinity }, market()).outputs[0].reason, 'invalid-value')
  assert.equal(processingPriceFloors({ ...recipe, outputs: [{ id: 1, qty: 1 }] }, market()).outputs[0].reason, 'unsupported-circular-item')
  assert.equal(processingPriceFloors({ ...recipe, outputs: [{ id: 3, qty: 1e-20 }] }, market()).outputs[0].reason, 'no-feasible-safe-price')
  assert.equal(processingPriceFloors({ ...recipe, outputs: [{ id: 3, qty: 2 }] }, market(Number.MAX_SAFE_INTEGER, 1)).outputs[0].reason, 'no-feasible-safe-price')
})
test('tax plateaus and stairs match exhaustive canonical minimums', () => {
  for (const qty of [0.1, 0.3, 1, 2.5]) {
    for (const cost of [0.1, 4.9, 5, 49, 50, 98, 99, 100]) {
      const r = { ...recipe, outputs: [{ id: 3, qty }], coinCost: 0.1, coinRevenue: 0.05 }
      const m = market(cost, 100.5)
      const row = verify(r, m)[0]
      let expected = 1
      while (computeProcessFlip(r, { ...m, get: (id: number) => { const item = m.get(id)!; return id === 3 ? { ...item, high: expected } : item } })!.profit < 0) expected++
      assert.equal(row.floor, expected)
    }
  }
})
test('output arithmetic overflow and invalid coin revenue fail explicitly', () => {
  assert.equal(processingPriceFloors({ ...recipe, outputs: [{ id: 3, qty: Number.MAX_SAFE_INTEGER }] }, market()).outputs[0].reason, 'invalid-value')
  assert.equal(processingPriceFloors({ ...recipe, coinRevenue: NaN }, market()).outputs[0].reason, 'invalid-value')
  assert.equal(processingPriceFloors({ ...recipe, outputs: [{ id: 3, qty: Number.MAX_SAFE_INTEGER }, { id: 3, qty: 1 }] }, market()).outputs[0].reason, 'invalid-value')
})
