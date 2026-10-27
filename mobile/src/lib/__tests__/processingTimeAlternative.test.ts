import { test } from 'node:test'
import assert from 'node:assert/strict'
import { processingTimeAlternative } from '../processingTimeAlternative.ts'

test('compares only incremental value with the entered alternative', () => {
  for (const [minutes, surplus] of [[2, -50], [1, 0], [0, 50]]) {
    assert.deepEqual(processingTimeAlternative(50, 3000, minutes), { kind: 'positive', breakEvenMinutes: 1, surplus })
  }
  assert.equal(processingTimeAlternative(50, 3000, null).surplus, null)
})
test('unknown, loss, zero and zero-rate states remain explicit', () => {
  assert.deepEqual(processingTimeAlternative(null, 3000, 2), { kind: 'unknown', breakEvenMinutes: null, surplus: null })
  assert.deepEqual(processingTimeAlternative(-50, 3000, 2), { kind: 'loss', breakEvenMinutes: null, surplus: -150 })
  assert.deepEqual(processingTimeAlternative(0, 3000, 2), { kind: 'zero', breakEvenMinutes: 0, surplus: -100 })
  assert.deepEqual(processingTimeAlternative(50, 0, 2), { kind: 'zero-rate', breakEvenMinutes: null, surplus: 50 })
  assert.equal(processingTimeAlternative(0, 0, 0).breakEvenMinutes, 0)
})
test('rejects invalid values and unsafe intermediate arithmetic even with cancellation', () => {
  for (const bad of [0.1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => processingTimeAlternative(bad, 1, 1), RangeError)
    assert.throws(() => processingTimeAlternative(1, bad, 1), RangeError)
    assert.throws(() => processingTimeAlternative(1, 1, bad), RangeError)
  }
  assert.throws(() => processingTimeAlternative(1, -1, 1), RangeError)
  assert.throws(() => processingTimeAlternative(1, 1, -1), RangeError)
  assert.throws(() => processingTimeAlternative(Number.MAX_SAFE_INTEGER, 1, null), RangeError)
  assert.throws(() => processingTimeAlternative(1, Number.MAX_SAFE_INTEGER, 2), RangeError)
  assert.throws(() => processingTimeAlternative(-1, Number.MAX_SAFE_INTEGER, 1), RangeError)
  assert.throws(() => processingTimeAlternative(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 60), RangeError)
})
