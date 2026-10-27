import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseTimeInput, timeAlternativePresentation, approximate } from './timeAlternative.ts'

test('blank differs from explicit zero; only safe nonnegative whole digits are accepted', () => {
  assert.equal(parseTimeInput(''), null)
  assert.equal(parseTimeInput('0'), 0)
  for (const raw of ['1.5', '-1', 'NaN', 'Infinity', '9007199254740992', '1,000']) assert.equal(parseTimeInput(raw), null)
})
test('presentation keeps empty goals, unknowns and entered zero distinct', () => {
  assert.equal(timeAlternativePresentation(0, 50, '3000', '2').message, 'No batches selected')
  assert.match(timeAlternativePresentation(1, 50, '', '').message, /Enter/)
  assert.match(timeAlternativePresentation(1, null, '3000', '2').message, /Unknown/)
  assert.match(timeAlternativePresentation(1, 50, '3000', '2').message, /-50 GP/)
  assert.match(timeAlternativePresentation(1, 50, '3000', '0').message, /50 GP/)
  assert.match(timeAlternativePresentation(1, -50, '3000', '').threshold, /No nonnegative/)
  assert.match(timeAlternativePresentation(1, 50, '0', '').threshold, /No finite/)
  assert.equal(timeAlternativePresentation(1, 50, '3000', '2').positive, false)
  assert.equal(timeAlternativePresentation(1, 50, '3000', '0').positive, true)
  assert.match(approximate(0.0000001), /< 0.01/)
  assert.match(approximate(-0.0000001), /-0.01/)
  assert.match(approximate(1 / 3), /≈/)
})

test('time comparison leaves a one-GP cash shortfall independent of a positive delta', async () => {
  const { ownedOpportunity } = await import('./ownedOpportunity.ts')
  const scenario = ownedOpportunity({ inputs: [{ id: 1, qty: 1 }], outputs: [{ id: 2, qty: 1 }], coinCost: 1 }, 1, 0, { 1: '1' }, id => id === 1 ? { high: 10, low: 10 } : { high: 61, low: 61 }, () => 0)
  assert.equal(scenario.kind, 'ready')
  if (scenario.kind !== 'ready') return
  assert.equal(scenario.result.incrementalValue, 50)
  assert.equal(scenario.result.cashShortfall, 1)
  assert.match(timeAlternativePresentation(1, scenario.result.incrementalValue, '3000', '2').threshold, /1 minutes/)
  assert.match(timeAlternativePresentation(1, scenario.result.incrementalValue, '3000', '2').message, /-50 GP/)
  assert.equal(scenario.result.cashShortfall, 1)
})
