import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Market, MarketItem } from '@ge/engine'
import { computeProcessFlip } from '../../../../src/domain/flipping/processFlip.js'
import { BLUE_SCALE_RECIPES, blueScaleQuoteAgeSec } from '../blueScale.ts'
import { labMarket, sizeProcessingBatch } from '../processingLab.ts'
import { processingPriceCeilings } from '../processingPriceCeilings.ts'
import { processingPriceFloors } from '../processingPriceFloors.ts'
import { processingStress } from '../processingStress.ts'

test('quote age advances with the wall clock independently of the cached market timestamp', () => {
  const cached = { nowSec: 1000, quoteTime: 990 }
  assert.equal(blueScaleQuoteAgeSec(4600, cached.quoteTime), 3610)
  assert.equal(blueScaleQuoteAgeSec(1000, 1000), 0)
})

test('future quotes and invalid quote timestamps or current clocks have unknown age', () => {
  assert.equal(blueScaleQuoteAgeSec(1000, 1100), null)
  for (const invalid of [0, -1, NaN, Infinity, -Infinity, 990.5, null]) {
    assert.equal(blueScaleQuoteAgeSec(1000, invalid), null)
    assert.equal(blueScaleQuoteAgeSec(invalid, 990), null)
  }
})

function market (buy: number | null = 12, sell: number | null = 67): Market {
  const items: MarketItem[] = [243, 241].map(id => ({ id, name: String(id), icon: null, members: true, limit: 13000, highalch: null, low: id === 241 ? sell : 11, high: id === 243 ? buy : 69, lowTime: 10, highTime: 20, dailyVolume: null }))
  return { nowSec: 100, get: id => items.find(i => i.id === id) ?? null, all: () => items }
}
test('stable manual and Wesley recipes are members-only one-to-one, untimed, with exact fees', () => {
  assert.deepEqual(BLUE_SCALE_RECIPES.map(r => r.id), ['blue-scale:manual', 'blue-scale:wesley'])
  for (const [i, recipe] of BLUE_SCALE_RECIPES.entries()) {
    assert.deepEqual(recipe.inputs, [{ id: 243, qty: 1 }])
    assert.deepEqual(recipe.outputs, [{ id: 241, qty: 1 }])
    assert.equal(recipe.coinCost, i * 50)
    assert.equal(recipe.members, true)
    assert.equal(recipe.actionsPerHour, null)
    const flip = computeProcessFlip(recipe, labMarket(market(), 'instant', 'instant', undefined))!
    assert.equal(flip.tax, 1)
    assert.equal(flip.profit, [54, 4][i])
    assert.equal(flip.perHour, null)
    const batch = sizeProcessingBatch({ ...flip, cash: 100000, minutes: 60, actionsPerHour: recipe.actionsPerHour ?? null, limitActions: null })
    assert.equal(batch.actions, null)
    assert.equal(batch.earnings, null)
    assert.equal(batch.activeGpHour, null)
  }
})
test('losses remain negative and zero or missing selected quotes remain unknown', () => {
  for (const recipe of BLUE_SCALE_RECIPES) {
    assert.ok(computeProcessFlip(recipe, labMarket(market(100), 'instant', 'instant', undefined))!.profit < 0)
    for (const absent of [0, null]) {
      assert.equal(computeProcessFlip(recipe, labMarket(market(absent), 'instant', 'instant', undefined)), null)
      assert.equal(computeProcessFlip(recipe, labMarket(market(12, absent), 'instant', 'instant', undefined)), null)
    }
    assert.equal(computeProcessFlip(recipe, labMarket(market(), 'patient', 'patient', undefined)), null)
  }
})
test('existing ceilings, floors and stress include service fees without creating a batch', () => {
  const quoted = labMarket(market(), 'instant', 'instant', undefined)
  for (const [i, recipe] of BLUE_SCALE_RECIPES.entries()) {
    assert.equal(processingPriceCeilings(recipe, quoted).ingredients[0].ceiling, [66, 16][i])
    assert.equal(processingPriceFloors(recipe, quoted).outputs[0].floor, [12, 63][i])
    const stress = processingStress(recipe, quoted, { inputCostIncreaseBps: 0, outputPriceCutBps: 0, actions: null })
    assert.equal(stress.baseline?.profit, [54, 4][i])
    assert.equal(stress.stress?.profit, [54, 4][i])
    assert.equal(stress.batch, null)
  }
})
