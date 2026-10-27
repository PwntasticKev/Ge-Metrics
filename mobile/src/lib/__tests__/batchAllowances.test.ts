import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculateBatchAllowances } from '../batchAllowances.ts'

test('repeated IDs share one allowance and owned stock offsets shopping without consuming it', () => {
  const result = calculateBatchAllowances([{ id: 1, qty: 2 }, { id: 1, qty: 1 }], 4, {
    1: { owned: 5, remaining: 7, knownFullLimit: 10 }
  })
  assert.deepEqual(result, {
    ingredients: [{ id: 1, qty: 3, owned: 5, remaining: 7, required: 12, shopping: 7, status: 'enough', knownShortfall: 0, maxActions: 4 }],
    status: 'feasible', maxActions: { kind: 'exact', value: 4 }
  })
})

test('zero remaining allows owned actions only, with whole-action flooring and exact shortfall', () => {
  const result = calculateBatchAllowances([{ id: 1, qty: 3 }], 3, { 1: { owned: 8, remaining: 0 } })
  assert.equal(result.status, 'blocked')
  assert.deepEqual(result.maxActions, { kind: 'exact', value: 2 })
  assert.equal(result.ingredients[0].shopping, 1)
  assert.equal(result.ingredients[0].status, 'exceeds')
  assert.equal(result.ingredients[0].knownShortfall, 1)
})

test('unknown allowance does not prevent an inventory-covered goal or pretend to give an exact maximum', () => {
  const result = calculateBatchAllowances([{ id: 1, qty: 2 }], 4, { 1: { owned: 9, remaining: null, knownFullLimit: 10 } })
  assert.equal(result.status, 'feasible')
  assert.equal(result.ingredients[0].status, 'enough')
  assert.equal(result.ingredients[0].knownShortfall, 0)
  assert.deepEqual(result.maxActions, { kind: 'unknown', value: null })
})

test('unknown allowance with shopping outstanding stays unknown, even with a verified full limit', () => {
  const result = calculateBatchAllowances([{ id: 1, qty: 2 }], 4, { 1: { owned: 1, remaining: null, knownFullLimit: 100 } })
  assert.equal(result.status, 'unknown')
  assert.equal(result.ingredients[0].shopping, 7)
  assert.equal(result.ingredients[0].knownShortfall, null)
  assert.equal(result.ingredients[0].status, 'unknown')
  assert.deepEqual(result.maxActions, { kind: 'unknown', value: null })
})

test('a known blocker takes precedence over unknown inputs and supplies only a partial upper bound', () => {
  const result = calculateBatchAllowances([{ id: 1, qty: 2 }, { id: 2, qty: 3 }], 5, {
    1: { owned: 1, remaining: 6 }, 2: { owned: 0, remaining: null }
  })
  assert.equal(result.status, 'blocked')
  assert.deepEqual(result.ingredients.map(i => [i.status, i.knownShortfall]), [['exceeds', 3], ['unknown', null]])
  assert.deepEqual(result.maxActions, { kind: 'known-upper-bound', value: 3 })
})

test('a partial upper bound above the goal does not establish goal feasibility', () => {
  const result = calculateBatchAllowances([{ id: 1, qty: 2 }, { id: 2, qty: 1 }], 2, {
    1: { owned: 0, remaining: 10 }
  })
  assert.equal(result.status, 'unknown')
  assert.deepEqual(result.maxActions, { kind: 'known-upper-bound', value: 5 })
  assert.equal(result.ingredients[1].owned, 0)
  assert.equal(result.ingredients[1].remaining, null)
})

test('distinct IDs have independent allowances even when all quantities and limits match', () => {
  const result = calculateBatchAllowances([{ id: 1, qty: 2 }, { id: 2, qty: 2 }], 3, {
    1: { owned: 0, remaining: 6, knownFullLimit: 6 },
    2: { owned: 0, remaining: 6, knownFullLimit: 6 }
  })
  assert.equal(result.status, 'feasible')
  assert.deepEqual(result.maxActions, { kind: 'exact', value: 3 })
})

test('zero goal is feasible with unknown allowances and known zero limits remain valid', () => {
  assert.equal(calculateBatchAllowances([{ id: 1, qty: 1 }], 0, {}).status, 'feasible')
  assert.equal(calculateBatchAllowances([{ id: 1, qty: 1 }], 1, {
    1: { owned: 1, remaining: 0, knownFullLimit: 0 }
  }).status, 'feasible')
})

test('rejects invalid goal, quantity, owned and remaining instead of silently clamping', () => {
  for (const invalid of [-1, 0.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => calculateBatchAllowances([{ id: 1, qty: 1 }], invalid, {}), RangeError)
    assert.throws(() => calculateBatchAllowances([{ id: 1, qty: invalid }], 1, {}), RangeError)
    assert.throws(() => calculateBatchAllowances([{ id: 1, qty: 1 }], 1, { 1: { owned: invalid, remaining: 0 } }), RangeError)
    assert.throws(() => calculateBatchAllowances([{ id: 1, qty: 1 }], 1, { 1: { owned: 0, remaining: invalid } }), RangeError)
  }
  assert.throws(() => calculateBatchAllowances([{ id: 1, qty: 0 }], 1, {}), RangeError)
  assert.throws(() => calculateBatchAllowances([], 1, {}), RangeError)
  assert.throws(() => calculateBatchAllowances([{ id: 0, qty: 1 }], 1, {}), RangeError)
})

test('checks full limits without substituting them for unknown remaining or inventing a missing mapping limit', () => {
  const inputs = [{ id: 1, qty: 1 }]
  assert.throws(() => calculateBatchAllowances(inputs, 1, { 1: { owned: 0, remaining: 11, knownFullLimit: 10 } }), RangeError)
  for (const knownFullLimit of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => calculateBatchAllowances(inputs, 1, { 1: { owned: 0, remaining: null, knownFullLimit } }), RangeError)
  }
  for (const knownFullLimit of [undefined, null]) {
    assert.equal(calculateBatchAllowances(inputs, 10, { 1: { owned: 0, remaining: 10, knownFullLimit } }).status, 'feasible')
  }
})

test('rejects overflow in aggregation, goal requirements and owned plus remaining', () => {
  const max = Number.MAX_SAFE_INTEGER
  assert.throws(() => calculateBatchAllowances([{ id: 1, qty: max }, { id: 1, qty: 1 }], 0, {}), RangeError)
  assert.throws(() => calculateBatchAllowances([{ id: 1, qty: max }], 2, {}), RangeError)
  assert.throws(() => calculateBatchAllowances([{ id: 1, qty: 1 }], 1, { 1: { owned: max, remaining: 1 } }), RangeError)
  assert.deepEqual(calculateBatchAllowances([{ id: 1, qty: 1 }], max, { 1: { owned: max, remaining: 0 } }).maxActions, { kind: 'exact', value: max })
})
