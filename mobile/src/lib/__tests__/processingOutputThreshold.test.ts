import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Market, ProcessRecipe } from '@ge/engine'
import { geTax } from '../../../../src/domain/flipping/geTax.js'
import recipes from '../../../../src/domain/flipping/data/moneyMakingRecipes.js'
import { processingOutputThreshold, supportsOutputThreshold } from '../processingOutputThreshold.ts'
const recipe = recipes.find(r => r.id === 'mmg:Cooking raw karambwan')! as ProcessRecipe
const market = (buy: number | null = 100, sell: number | null = 120): Market => ({ nowSec: 1, all: () => [], get: id => ({ id, high: buy, low: sell } as NonNullable<ReturnType<Market['get']>>) })
const run = (attempts = '100', successfulOutputs = '', buy: number | null = 100, sell: number | null = 120) => processingOutputThreshold(recipe, market(buy, sell), 'instant', 'instant', attempts, successfulOutputs)
test('synthetic quotes: 100 inputs at 100, output 120, canonical tax 2', () => {
  const r = run('100', '85')
  assert.equal(r.minimumOutputs, 85); assert.equal(r.maxFailed, 15)
  assert.equal(r.netUnit, 118); assert.equal(r.fullMargin, 1800); assert.equal(r.scenarioMargin, 30)
  assert.equal(run('100', '84').scenarioMargin, -88)
})
test('exact divisibility, tax stairs and cap', () => {
  assert.equal(run('100', '', 98, 100).minimumOutputs, 100)
  assert.equal(run('1', '', 49, 49).netUnit, 49)
  assert.equal(run('1', '', 49, 50).netUnit, 49)
  assert.equal(run('1', '', 49, 99).netUnit, 98)
  assert.equal(run('1', '', 49, 100).netUnit, 98)
  // Canonical exemption is preserved; exempt outputs cannot enter this allowlist.
  assert.equal(geTax(100, 8007), 0)
  assert.equal(run('1', '', 1, 1_000_000_000).netUnit, 995_000_000)
})
test('empty, zero, loss and optional scenarios', () => {
  assert.equal(run('').reason, 'attempts-required')
  assert.equal(run('0').minimumOutputs, 0); assert.equal(run('0').requiredPercent, null)
  assert.equal(run().scenarioMargin, null)
  assert.equal(run('100', '0').scenarioMargin, -10000)
  assert.equal(run('0', '0').scenarioMargin, 0)
  assert.equal(run('100', '', 118, 120).maxFailed, 0)
  assert.equal(run('100', '', 120, 100).maxFailed, null)
  assert.equal(run('100', '', 120, 100).minimumOutputs, 123)
  for (const s of ['101', '-1', '1.5', 'NaN']) assert.equal(run('100', s).reason, 'invalid-value')
})
test('missing, patient and unsafe values remain unavailable', () => {
  assert.equal(run('100', '', null).reason, 'missing-quote')
  assert.equal(processingOutputThreshold(recipe, market(), 'patient', 'instant', '100', '').reason, 'patient-mode')
  for (const s of ['-1', '1.1', 'NaN', '9007199254740992']) assert.equal(run(s).reason, 'invalid-value')
  assert.equal(run('9007199254740991').reason, 'invalid-value')
  assert.equal(run('1', '', 100.1).reason, 'invalid-value')
})
test('exact allowlist identity rejects mutations; guide rate is irrelevant', () => {
  assert.ok(supportsOutputThreshold(recipe))
  assert.ok(supportsOutputThreshold({ ...recipe, actionsPerHour: undefined }))
  for (const patch of [{ id: 'other' }, { method: 'other' }, { coinCost: 1 }, { coinRevenue: 1 }, { coinCost: NaN }, { coinCost: undefined }, { coinRevenue: undefined }, { outputs: [...recipe.outputs, { id: 1, qty: 1 }] }, { inputs: [{ id: 3142, qty: 2 }] }, { outputs: [{ id: 8007, qty: 1 }] }, { outputs: [{ id: 3142, qty: 1 }] }, { inputs: [...recipe.inputs, { id: 1, qty: 1 }] }]) {
    assert.equal(supportsOutputThreshold({ ...recipe, ...patch }), false)
  }
})

test('exact ceiling agrees with exhaustive synthetic small-count margins', () => {
  for (const buy of [1, 49, 50, 98, 100, 120]) for (const sell of [1, 49, 50, 99, 100, 120]) {
    const r = run('10', '', buy, sell)
    const unit = sell - geTax(sell, 3144)
    const expected = Math.ceil(10 * buy / unit)
    assert.equal(r.minimumOutputs, expected)
    assert.equal(r.maxFailed, expected <= 10 ? 10 - expected : null)
    assert.ok(expected * unit - 10 * buy >= 0)
    assert.ok((expected - 1) * unit - 10 * buy < 0)
  }
})

test('gross revenue overflow is rejected before tax reduces the result', () => {
  assert.equal(run('2', '2', 1, 4503599627370496).reason, 'invalid-value')
})
