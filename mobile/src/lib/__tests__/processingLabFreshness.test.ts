import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Market, ProcessRecipe } from '@ge/engine'
import { computeProcessFlip } from '../../../../src/domain/flipping/processFlip.js'
import { labMarket, labSourceFreshness, labSourceDisclosure, showLabSource } from '../processingLab.ts'

const nowSec = 100000
const item = { id: 1, name: 'Test', icon: null, members: false, limit: 100, highalch: null, low: 100, high: 120, lowTime: nowSec, highTime: nowSec, dailyVolume: 10000 }
const recipe: ProcessRecipe = { id: 'test', method: 'test', inputs: [{ id: 1, qty: 1 }], outputs: [{ id: 2, qty: 1 }] }
const market = (highTime: number | null = nowSec, lowTime: number | null = nowSec): Market => ({ nowSec, get: id => ({ ...item, id, highTime: id === 1 ? highTime : 1, lowTime: id === 2 ? lowTime : 1 }), all: () => [] })

test('only selected instant sides determine freshness, including strict six-hour boundary', () => {
  assert.equal(labSourceFreshness(recipe, market(), 'instant', 'instant'), 'fresh')
  assert.equal(labSourceFreshness(recipe, market(nowSec - 21600), 'instant', 'instant'), 'fresh')
  assert.equal(labSourceFreshness(recipe, market(nowSec - 21601), 'instant', 'instant'), 'stale')
  assert.equal(labSourceFreshness(recipe, market(nowSec, nowSec - 21601), 'instant', 'instant'), 'stale')
})
test('missing, invalid and future selected instant timestamps are unknown', () => {
  for (const time of [null, 0, -1, NaN, Infinity, nowSec + 1]) {
    assert.equal(labSourceFreshness(recipe, market(time), 'instant', 'instant'), 'unknown')
    assert.equal(labSourceFreshness(recipe, market(nowSec, time), 'instant', 'instant'), 'unknown')
  }
})
test('patient source age stays unknown after latest quote refresh, including same-item mixed legs', () => {
  const same = { ...recipe, outputs: recipe.inputs }
  for (const source of [market(), market(nowSec - 50000)]) {
    assert.equal(labSourceFreshness(recipe, source, 'patient', 'patient'), 'unknown')
    assert.equal(labSourceFreshness(same, source, 'patient', 'instant'), 'stale')
    assert.equal(labSourceFreshness(same, source, 'instant', 'patient'), source.get(1)!.highTime === nowSec ? 'unknown' : 'stale')
  }
})
test('projection crosses instant timestamps and clears patient timestamps; cached calculations survive filter off', () => {
  const source = market()
  const day = { 1: { avgLowPrice: 105, avgHighPrice: 115, lowPriceVolume: 10, highPriceVolume: 10 }, 2: { avgLowPrice: 205, avgHighPrice: 215, lowPriceVolume: 10, highPriceVolume: 10 } }
  const instant = labMarket(source, 'instant', 'instant', day).get(1)!
  assert.equal(instant.lowTime, source.get(1)!.highTime)
  assert.equal(instant.highTime, source.get(1)!.lowTime)
  const quoted = labMarket(source, 'patient', 'patient', day)
  assert.equal(quoted.get(1)!.lowTime, null)
  assert.equal(quoted.get(1)!.highTime, null)
  const freshness = labSourceFreshness(recipe, source, 'patient', 'patient')
  const flip = computeProcessFlip(recipe, quoted)!
  assert.equal(flip.cost, 105)
  assert.equal(flip.revenue, 215)
  assert.equal(flip.profit, flip.revenue - flip.tax - flip.cost)
  assert.equal(showLabSource(freshness, false), true)
  assert.equal(showLabSource(freshness, true), false)
  assert.equal(showLabSource('stale', true), false)
  assert.equal(showLabSource('fresh', true), true)
})

test('advancing market clock expires selected observations without a download', () => {
  const source = market(nowSec - 21600)
  assert.equal(labSourceFreshness(recipe, source, 'instant', 'instant'), 'fresh')
  assert.equal(labSourceFreshness(recipe, { ...source, nowSec: nowSec + 1 }, 'instant', 'instant'), 'stale')
})
test('same item uses both selected sides independently and alternate-mode disclosures stay honest', () => {
  const same = { ...recipe, outputs: recipe.inputs }
  const source: Market = { nowSec, get: () => ({ ...item, highTime: nowSec, lowTime: nowSec - 21601 }), all: () => [] }
  assert.equal(labSourceFreshness(same, source, 'instant', 'instant'), 'stale')
  assert.equal(labSourceFreshness(same, source, 'instant', 'patient'), 'unknown')
  assert.equal(labSourceFreshness(same, source, 'patient', 'instant'), 'stale')
  assert.match(labSourceDisclosure('unknown'), /Some selected prices have unknown ages/)
  assert.match(labSourceDisclosure('stale'), /older than 6h/)
})
