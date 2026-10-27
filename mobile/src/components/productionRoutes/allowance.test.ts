import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateProductionRoutes, productionRoutes } from '../../lib/productionRoutes.ts'
import { mappingCap, remainingAllowance, unusedWindowAllowances } from './allowance.ts'

test('blank is unknown, zero is exhausted, and entries must be safe nonnegative integers within a known cap', () => {
  assert.deepEqual(remainingAllowance('', 100), { value: null, valid: true })
  assert.deepEqual(remainingAllowance(undefined, 100), { value: null, valid: true })
  assert.deepEqual(remainingAllowance('0', 100), { value: 0, valid: true })
  assert.deepEqual(remainingAllowance('1,000', 1000), { value: 1000, valid: true })
  for (const text of ['-1', '1.5', 'NaN', '9007199254740992', '101']) assert.equal(remainingAllowance(text, 100).valid, false)
  for (const cap of [null, undefined, 0, -1, Infinity, 1.5]) {
    assert.equal(mappingCap(cap), null)
    assert.deepEqual(remainingAllowance('101', cap), { value: 101, valid: true })
  }
})

test('refreshed caps revalidate manual text without refilling unknown or clamping entries', () => {
  const text = '90'
  assert.equal(remainingAllowance(text, 100).valid, true)
  assert.deepEqual(remainingAllowance(text, 80), { value: null, valid: false })
  assert.equal(remainingAllowance('', 200).value, null)
})

test('unused-window action includes current IDs only and leaves invalid or unknown caps blank', () => {
  const caps = new Map([[1, 100], [2, 0], [3, 1.5], [4, 200]])
  assert.deepEqual(unusedWindowAllowances([1, 2, 3, 5], id => caps.get(id)), { 1: '100', 2: '', 3: '', 5: '' })
})

test('unknown UI allowances reach the planner while owned inputs need no buying allowance', () => {
  const route = productionRoutes.find(r => r.id === 'steel')!
  const quotes = [440, 453, 2353, 2].map(id => ({ id, buy: null, sell: 10, remainingLimit: remainingAllowance('', 100).value }))
  const request = { route, batches: 1, budget: 1000, quotes, tax: () => 0 }
  assert.equal(evaluateProductionRoutes(request).plans[0].limitsFeasible, null)
  assert.equal(evaluateProductionRoutes({ ...request, owned: { 440: 1, 453: 2 } }).plans[0].limitsFeasible, true)
  const exhausted = quotes.map(q => ({ ...q, remainingLimit: remainingAllowance('0', 100).value }))
  assert.equal(evaluateProductionRoutes({ ...request, quotes: exhausted }).plans[0].limitsFeasible, false)
})
