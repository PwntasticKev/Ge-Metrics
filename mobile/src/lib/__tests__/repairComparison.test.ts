import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Market, MarketItem } from '@ge/engine'
import { repairDefinition, repairRecipe, compareRepair } from '../repairComparison.ts'

function market (buy: number | null = 754965, sell: number | null = 836275): Market {
  const items: MarketItem[] = [4902, 4722].map((id, i) => ({ id, name: 'legs', icon: null, members: true, limit: 15, highalch: null,
    high: i === 0 ? buy : 9999999, low: i === 1 ? sell : 1,
    highTime: i === 0 ? 1793074371 : 1, lowTime: i === 1 ? 1793076630 : 1, dailyVolume: 3 }))
  return { nowSec: 1793077379, get: id => items.find(i => i.id === id) ?? null, all: () => items }
}
test('only the vetted fully broken pair and stable one-to-one recipes', () => {
  assert.equal(repairDefinition.inputId, 4902)
  assert.equal(repairDefinition.outputId, 4722)
  for (const method of ['npc', 'stand'] as const) {
    const recipe = repairRecipe(method, 99)
    assert.deepEqual(recipe.inputs, [{ id: 4902, qty: 1 }])
    assert.deepEqual(recipe.outputs, [{ id: 4722, qty: 1 }])
    assert.equal(recipe.members, true)
    assert.equal(recipe.actionsPerHour, null)
    assert.ok(recipe.source?.includes('oldschool.runescape.wiki'))
    assert.equal(recipe.id, repairRecipe(method, 1).id)
  }
})
test('exact NPC and whole-level stand fees', () => {
  assert.equal(repairRecipe('npc', 1).coinCost, 80000)
  for (const [level, fee] of [[1, 79600], [60, 56000], [99, 40400]]) assert.equal(repairRecipe('stand', level).coinCost, fee)
})
test('historical snapshot retains loss, cash outlay, sale tax and 38/39 boundary', () => {
  const result = compareRepair(market(), 99, 2)
  assert.deepEqual(result.npc.perItem, { purchase: 754965, fee: 80000, upfrontCash: 834965, grossSale: 836275, tax: 16725, netSale: 819550, profit: -15415 })
  assert.equal(result.stand.perItem?.profit, 24185)
  assert.equal(result.stand.batch?.profit, 48370)
  assert.equal(result.stand.batch?.fee, 80800)
  assert.equal(compareRepair(market(), 38, 1).stand.perItem?.profit, -215)
  assert.equal(compareRepair(market(), 39, 1).stand.perItem?.profit, 185)
})
test('tax rounds per sold unit only, never purchases or fees', () => {
  const result = compareRepair(market(100, 101), 99, 3)
  assert.equal(result.stand.batch?.tax, 6)
  const calls: number[][] = []
  compareRepair(market(), 99, 2, { tax: (price, id) => { calls.push([price, id]); return 7 } })
  assert.deepEqual(calls, [[836275, 4722]])
})
test('zero batch is zero flow even with missing observations', () => {
  const result = compareRepair(market(null, null), 99, 0)
  assert.equal(result.stand.perItem, null)
  assert.deepEqual(result.stand.batch, { purchase: 0, fee: 0, upfrontCash: 0, grossSale: 0, tax: 0, netSale: 0, profit: 0 })
})
test('missing sides stay unknown; selected-side ages and full limits are metadata only', () => {
  for (const quotes of [market(null), market(754965, null)]) {
    const result = compareRepair(quotes, 99, 20)
    assert.equal(result.stand.perItem, null)
    assert.equal(result.stand.batch, null)
    assert.ok(result.missingSides.length)
  }
  const result = compareRepair(market(), 99, 20)
  assert.equal(result.quotes.input.time, 1793074371)
  assert.equal(result.quotes.output.time, 1793076630)
  assert.equal(result.quotes.input.stale, true)
  assert.equal(result.quotes.output.stale, true)
  assert.equal(result.quotes.input.mappingLimit, 15)
  assert.equal(result.stand.batch?.fee, 808000)
  assert.equal('maxActions' in result, false)
  assert.equal('perHour' in result.stand, false)
})
test('invalid levels, counts, prices and unsafe arithmetic fail explicitly', () => {
  for (const level of [0, 100, 1.5, NaN, Infinity]) assert.throws(() => compareRepair(market(), level, 1), RangeError)
  for (const qty of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, Number.MAX_SAFE_INTEGER]) assert.throws(() => compareRepair(market(), 99, qty), RangeError)
  for (const price of [0, -1, 1.5, Infinity, Number.MAX_SAFE_INTEGER]) assert.throws(() => compareRepair(market(price), 99, 1), RangeError)
})

test('future and invalid quote times never establish freshness', () => {
  const source = market()
  for (const time of [source.nowSec + 1, 0, -1, NaN, Infinity, 1.5]) {
    const altered: Market = { ...source, get: id => { const item = source.get(id); return item ? { ...item, highTime: time, lowTime: time } : null } }
    const result = compareRepair(altered, 60, 1)
    for (const quote of [result.quotes.input, result.quotes.output]) {
      assert.equal(quote.ageSec, null)
      assert.equal(quote.stale, null)
    }
    assert.equal(result.stand.perItem?.profit, 8585)
  }
})
