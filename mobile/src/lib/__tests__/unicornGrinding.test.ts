import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Market, MarketItem } from '@ge/engine'
import moneyMakingRecipes from '../../../../src/domain/flipping/data/moneyMakingRecipes.js'
import { computeProcessFlip } from '../../../../src/domain/flipping/processFlip.js'
import { UNICORN_GRINDING_RECIPES, isUnicornGrinding } from '../unicornGrinding.ts'
import { labMarket, sizeProcessingBatch } from '../processingLab.ts'
import { processingPriceCeilings } from '../processingPriceCeilings.ts'
import { processingPriceFloors } from '../processingPriceFloors.ts'
import { processingStress } from '../processingStress.ts'

function market (buy: number | null = 979, sell: number | null = 1113): Market {
  const items: MarketItem[] = [237, 235].map(id => ({ id, name: String(id), icon: null, members: true, limit: 13000, highalch: null, low: id === 235 ? sell : 949, high: id === 237 ? buy : 1114, lowTime: 90, highTime: 90, dailyVolume: null }))
  return { nowSec: 100, get: id => items.find(item => item.id === id) ?? null, all: () => items }
}

test('lab copies preserve the canonical MMG recipe and isolate nested entries', () => {
  const original = moneyMakingRecipes.find(recipe => recipe.id === 'mmg:Grinding unicorn horns')!
  assert.equal(original.actionsPerHour, 9000)
  assert.equal(original.coinCost, 0)
  assert.deepEqual(UNICORN_GRINDING_RECIPES.map(recipe => recipe.id), ['unicorn-grinding:manual', 'unicorn-grinding:wesley'])
  for (const [index, recipe] of UNICORN_GRINDING_RECIPES.entries()) {
    assert.ok(isUnicornGrinding(recipe))
    assert.notEqual(recipe.id, original.id)
    assert.notEqual(recipe.inputs, original.inputs)
    assert.notEqual(recipe.inputs[0], original.inputs[0])
    assert.notEqual(recipe.outputs, original.outputs)
    assert.notEqual(recipe.outputs[0], original.outputs[0])
    assert.deepEqual(recipe.inputs, [{ id: 237, qty: 1 }])
    assert.deepEqual(recipe.outputs, [{ id: 235, qty: 1 }])
    assert.equal(recipe.coinCost, index * 50)
    assert.equal(recipe.coinRevenue, 0)
    assert.equal(recipe.members, true)
    assert.equal(recipe.actionsPerHour, null)
  }
  assert.notEqual(UNICORN_GRINDING_RECIPES[0].inputs[0], UNICORN_GRINDING_RECIPES[1].inputs[0])
  assert.equal(UNICORN_GRINDING_RECIPES[1].location, 'Nardah')
  assert.equal(UNICORN_GRINDING_RECIPES[1].source, 'https://oldschool.runescape.wiki/w/Wesley')
  assert.equal(isUnicornGrinding(original), false)
})

test('canonical research quotes give 112 manual and 62 paid, without timed sizing', () => {
  for (const [index, recipe] of UNICORN_GRINDING_RECIPES.entries()) {
    const flip = computeProcessFlip(recipe, labMarket(market(), 'instant', 'instant', undefined))!
    assert.equal(flip.cost, 979 + index * 50)
    assert.equal(flip.revenue, 1113)
    assert.equal(flip.tax, 22)
    assert.equal(flip.profit, 112 - index * 50)
    assert.equal(flip.perHour, null)
    const batch = sizeProcessingBatch({ ...flip, cash: 100000, minutes: 60, actionsPerHour: recipe.actionsPerHour ?? null, limitActions: null })
    assert.equal(batch.actions, null)
    assert.equal(batch.earnings, null)
    assert.equal(batch.activeGpHour, null)
  }
})

test('missing selected quotes stay unknown, losing quotes stay negative, patient needs traded averages', () => {
  for (const recipe of UNICORN_GRINDING_RECIPES) {
    assert.ok(computeProcessFlip(recipe, labMarket(market(2000), 'instant', 'instant', undefined))!.profit < 0)
    for (const absent of [0, null]) {
      assert.equal(computeProcessFlip(recipe, labMarket(market(absent), 'instant', 'instant', undefined)), null)
      assert.equal(computeProcessFlip(recipe, labMarket(market(979, absent), 'instant', 'instant', undefined)), null)
    }
    assert.equal(computeProcessFlip(recipe, labMarket(market(), 'patient', 'patient', undefined)), null)
  }
})

test('canonical thresholds and adverse stress retain the exact service fee', () => {
  const quoted = labMarket(market(), 'instant', 'instant', undefined)
  for (const [index, recipe] of UNICORN_GRINDING_RECIPES.entries()) {
    assert.equal(processingPriceCeilings(recipe, quoted).ingredients[0].ceiling, 1091 - index * 50)
    assert.equal(processingPriceFloors(recipe, quoted).outputs[0].floor, [998, 1049][index])
    const stress = processingStress(recipe, quoted, { inputCostIncreaseBps: 100, outputPriceCutBps: 500, actions: null })
    assert.equal(stress.baseline?.profit, 112 - index * 50)
    assert.ok(Math.abs(stress.stress!.cost - (979 * 1.01 + index * 50)) < 1e-9)
    assert.equal(stress.batch, null)
  }
})

test('all four selected-price scenarios use canonical pricing and keep the fee difference', () => {
  const averages = Object.fromEntries([237, 235].map(id => [id, { avgLowPrice: id === 237 ? 960 : 1088, avgHighPrice: id === 235 ? 1115 : 979, lowPriceVolume: 1, highPriceVolume: 1 }]))
  for (const buy of ['instant', 'patient'] as const) {
    for (const sell of ['instant', 'patient'] as const) {
      const quoted = labMarket(market(), buy, sell, averages)
      const [manual, paid] = UNICORN_GRINDING_RECIPES.map(recipe => computeProcessFlip(recipe, quoted)!)
      assert.equal(manual.cost, buy === 'instant' ? 979 : 960)
      assert.equal(manual.revenue, sell === 'instant' ? 1113 : 1115)
      assert.equal(manual.profit - paid.profit, 50)
      assert.equal(paid.perHour, null)
      const stresses = UNICORN_GRINDING_RECIPES.map(recipe => processingStress(recipe, quoted, { inputCostIncreaseBps: 500, outputPriceCutBps: 1000, actions: null }))
      assert.ok(Math.abs(stresses[0].stress!.profit - stresses[1].stress!.profit - 50) < 1e-9)
    }
  }
  const noTrades = { ...averages, 237: { ...averages[237], lowPriceVolume: 0 } }
  for (const recipe of UNICORN_GRINDING_RECIPES) {
    assert.equal(computeProcessFlip(recipe, labMarket(market(), 'patient', 'instant', noTrades)), null)
  }
})
