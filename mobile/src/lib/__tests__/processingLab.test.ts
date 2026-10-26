import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Market, ProcessRecipe, WikiAverage } from '@ge/engine'
import { batchWait, labMarket, recipeLimit, sizeProcessingBatch } from '../processingLab.ts'

const base = { cost: 110, profit: 35, tax: 5, actionsPerHour: 100, cash: 1100, minutes: 60, limitActions: 500 }
test('cash caps an upfront batch including processing fees', () => {
  const row = sizeProcessingBatch(base)
  assert.equal(row.actions, 10)
  assert.equal(row.earnings, 350)
  assert.equal(row.capital, 1100)
  assert.equal(row.tax, 50)
  assert.deepEqual(row.bottlenecks, ['cash'])
})
test('time and buy limits cap whole actions, including ties', () => {
  const row = sizeProcessingBatch({ ...base, cash: 100000, minutes: 30, limitActions: 50 })
  assert.equal(row.actions, 50)
  assert.deepEqual(row.bottlenecks, ['active time', 'buy limit'])
})
test('missing trusted rate never produces session earnings or GP/hour', () => {
  const row = sizeProcessingBatch({ ...base, actionsPerHour: null })
  assert.equal(row.actions, null)
  assert.equal(row.earnings, null)
  assert.equal(row.activeGpHour, null)
})
test('zero cash, zero time, losses and invalid values stay honest', () => {
  assert.equal(sizeProcessingBatch({ ...base, cash: 0 }).actions, 0)
  assert.equal(sizeProcessingBatch({ ...base, minutes: 0 }).actions, 0)
  assert.equal(sizeProcessingBatch({ ...base, profit: -3 }).earnings, -30)
  assert.equal(sizeProcessingBatch({ ...base, cash: NaN }).actions, 0)
})
test('unknown limit is explicit and not treated as unlimited certainty', () => {
  assert.equal(sizeProcessingBatch({ ...base, limitActions: null }).limitUnknown, true)
})

// Price-side and fill regressions use synthetic observations, never earnings claims.

const item = { id: 1, name: 'Input', icon: null, members: false, limit: 10, highalch: null, low: 100, high: 120, lowTime: 1, highTime: 1, dailyVolume: 10000 }
const market: Market = { nowSec: 1, get: id => id === 1 ? item : null, all: () => [item] }
const avg: WikiAverage = { avgLowPrice: 105, avgHighPrice: 115, lowPriceVolume: 2400, highPriceVolume: 4800 }
const recipe: ProcessRecipe = { id: 'test', method: 'test', inputs: [{ id: 1, qty: 2 }], outputs: [{ id: 1, qty: 1 }] }
test('instant crosses the spread; patient requires actual traded averages', () => {
  assert.equal(labMarket(market, 'instant', 'instant', undefined).get(1)?.low, 120)
  assert.equal(labMarket(market, 'instant', 'instant', undefined).get(1)?.high, 100)
  assert.equal(labMarket(market, 'patient', 'patient', { 1: avg }).get(1)?.low, 105)
  assert.equal(labMarket(market, 'patient', 'patient', { 1: avg }).get(1)?.high, 115)
  assert.equal(labMarket(market, 'patient', 'patient', undefined).get(1)?.low, null)
  assert.equal(labMarket(market, 'patient', 'patient', { 1: { ...avg, lowPriceVolume: 0 } }).get(1)?.low, null)
})
test('buy limits aggregate repeated input IDs and divide by quantity', () => {
  assert.equal(recipeLimit(recipe, market), 5)
  assert.equal(recipeLimit({ ...recipe, inputs: [...recipe.inputs, { id: 999, qty: 1 }] }, market), 5)
  assert.equal(recipeLimit({ ...recipe, inputs: [{ id: 1, qty: 2 }, { id: 1, qty: 3 }] }, market), 2)
})
test('patient wait uses per-side queue model; missing flow stays unknown', () => {
  const quoted = labMarket(market, 'patient', 'patient', { 1: avg })
  assert.equal(batchWait(recipe, quoted, 5, 'patient', 'patient', undefined, { 1: avg }), 0.5)
  assert.equal(batchWait(recipe, quoted, 5, 'patient', 'patient', undefined, undefined), null)
  assert.equal(batchWait(recipe, quoted, 5, 'instant', 'instant', undefined, undefined), 0)
  assert.equal(batchWait(recipe, quoted, 0, 'patient', 'patient', undefined, undefined), 0)
})
