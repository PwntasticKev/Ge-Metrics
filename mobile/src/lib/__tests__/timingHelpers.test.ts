/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { localClock, localHourOrder, localStartMinutes } from '../analytics/localTime.ts'
import { mixHex } from '../color.ts'
import { duration, edgePercent } from '../format.ts'
import { pickRates, sortByRate } from '../pickTiming.ts'
import type { WikiAverage } from '@ge/engine'
import { realisticOffer } from '../offer.ts'

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
  const tax = (sell: number) => (sell >= 50 ? Math.floor(sell * 0.02) : 0)
  const avg = (vol: number): WikiAverage => ({ avgLowPrice: 100, avgHighPrice: 110, lowPriceVolume: vol, highPriceVolume: vol })
  const offerPick = (id: number, limit: number, vol: number) => {
    const offer = realisticOffer({ item: { id, high: 110, low: 100, limit }, hour: undefined, day: avg(vol), horizon: 400, maxSellHours: 400, budget: null, tax })
    assert.ok(offer)
    return { id, offer }
  }
  it('ranks a fast small flip above a slow big one', () => {
    // 1: 1000 at 100/h a side; 2: 100 at 1000/h: same margin, far faster.
    const picks = [offerPick(1, 1000, 2400), offerPick(2, 100, 24_000)]
    const rates = pickRates(picks)
    assert.ok((rates.get(2)?.gpPerHour ?? 0) > (rates.get(1)?.gpPerHour ?? 0))
    assert.deepEqual(sortByRate(picks, rates).map(p => p.id), [2, 1])
  })
  it('keeps picks without a fill rate, last', () => {
    const noFlow = { id: 3, offer: { ...offerPick(3, 10, 2400).offer, rate: null } }
    const picks = [noFlow, offerPick(1, 10, 2400)]
    assert.deepEqual(sortByRate(picks, pickRates(picks)).map(p => p.id), [1, 3])
  })
})
