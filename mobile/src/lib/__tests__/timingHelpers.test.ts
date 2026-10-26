/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { localClock, localHourOrder, localStartMinutes } from '../analytics/localTime.ts'
import { mixHex } from '../color.ts'
import { duration, edgePercent } from '../format.ts'
import { pickRates, sortByRate } from '../pickTiming.ts'
import type { BuyPick, WikiAverage } from '@ge/engine'

describe('local time', () => {
  it('maps UTC hours to the local clock', () => {
    assert.equal(localClock(14, -240), '10:00') // New York, summer
    assert.equal(localClock(2, -240), '22:00')
    assert.equal(localClock(19, 330), '00:30') // India
    assert.equal(localStartMinutes(0, 60), 60)
  })
  it('orders hours from local midnight', () => {
    assert.deepEqual(localHourOrder(0).slice(0, 2), [0, 1])
    assert.deepEqual(localHourOrder(-240).slice(0, 2), [4, 5])
    assert.deepEqual(localHourOrder(330).slice(0, 2), [19, 20])
    assert.equal(new Set(localHourOrder(600)).size, 24)
  })
})

describe('mixHex', () => {
  it('blends and clamps', () => {
    assert.equal(mixHex('#000000', '#FFFFFF', 0.5), '#808080')
    assert.equal(mixHex('#102030', '#FFFFFF', -1), '#102030')
    assert.equal(mixHex('#102030', '#3355ff', 2), '#3355ff')
  })
})

describe('format', () => {
  it('writes durations a player can read', () => {
    assert.equal(duration(0.01), '~5m')
    assert.equal(duration(0.66), '~40m')
    assert.equal(duration(1.5), '~1.5h')
    assert.equal(duration(2), '~2h')
    assert.equal(duration(30), '~30h')
    assert.equal(duration(72), '~3d')
    assert.equal(duration(Infinity), 'rarely fills')
  })
  it('writes small edges', () => {
    assert.equal(edgePercent(-0.0072), '0.7%')
    assert.equal(edgePercent(0.02), '2%')
  })
})

describe('pick rates', () => {
  const pick = (id: number, profit: number, maxQty: number): BuyPick => ({
    id, name: String(id), icon: null, members: false, buyAt: 100, sellAt: 110, tax: 2, profit, roi: profit / 100, maxQty, potential: profit * maxQty, cost: 100 * maxQty, dayVolume: 0
  })
  const avg = (vol: number): WikiAverage => ({ avgLowPrice: 100, avgHighPrice: 110, lowPriceVolume: vol, highPriceVolume: vol })
  it('ranks a fast small flip above a slow big one', () => {
    const picks = [pick(1, 8, 1000), pick(2, 8, 100)]
    const h24 = { 1: avg(2400), 2: avg(24_000) }
    const rates = pickRates(picks, undefined, h24)
    // 1: 1000 at 100/h -> 40h buy + 40h sell; 2: 100 at 1000/h -> 0.4h + 0.4h
    assert.ok((rates.get(2)?.gpPerHour ?? 0) > (rates.get(1)?.gpPerHour ?? 0))
    assert.deepEqual(sortByRate(picks, rates).map(p => p.id), [2, 1])
  })
  it('keeps picks without averages, last', () => {
    const picks = [pick(3, 8, 10), pick(1, 8, 10)]
    const rates = pickRates(picks, undefined, { 1: avg(2400) })
    assert.deepEqual(sortByRate(picks, rates).map(p => p.id), [1, 3])
  })
})
