/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { BuyPick } from '@ge/engine'
import type { TimeseriesPoint } from '../analytics/types.ts'
import { checkFill, fillableQty, pricesFromAverages, pricesFromSeries, windowCounts } from '../fillAware.ts'
import { fillAwarePicks } from '../pickFill.ts'
import { estimateSpread, settleSpread, spreadLists } from '../spreadFill.ts'
import { screenSpread, type LiveItem, type TaxFn } from '../spreadScan.ts'

const tax: TaxFn = sell => (sell >= 50 ? Math.floor(sell * 0.02) : 0)
const NOW = 1_800_000_000
const HOUR = 3_600
const avg = (high: number, low: number, highVol: number, lowVol = highVol) => ({ avgHighPrice: high, avgLowPrice: low, highPriceVolume: highVol, lowPriceVolume: lowVol })
const item = (over: Partial<LiveItem> = {}): LiveItem => ({ id: 1, name: 'Thing', icon: null, limit: 100, high: 1300, low: 1000, highTime: NOW - 60, lowTime: NOW - 60, ...over })

/** 48 hours trading 1000 / 1100 at `vol` items a side, newest last; `last` replaces the final hours. */
function series (vol: number, last: Partial<TimeseriesPoint>[] = []): TimeseriesPoint[] {
  const base = Array.from({ length: 48 }, (_, i) => ({ timestamp: NOW - (48 - i) * HOUR, ...avg(1100, 1000, vol) }))
  return base.map((p, i) => {
    const j = i - (base.length - last.length)
    return j >= 0 ? { ...p, ...last[j] } : p
  })
}

describe('windowCounts', () => {
  it('needs a fair share of a normal hour and a few items', () => {
    assert.equal(windowCounts(4, 0), false)
    assert.equal(windowCounts(5, 0), true)
    assert.equal(windowCounts(20, 100), false)
    assert.equal(windowCounts(25, 100), true)
  })
})

describe('pricesFromAverages', () => {
  const day = avg(1100, 1000, 6_000)
  it('uses the last hour when it traded with volume, held to the worse of it and live', () => {
    assert.deepEqual(pricesFromAverages({ high: 1300, low: 1000 }, avg(1250, 1010, 100), day), { buyAt: 1010, sellAt: 1250 })
  })
  it('ignores a last hour that was one print and falls back to the day', () => {
    // A single 3-item instant-buy at 1300 set both the live high and the hour's average.
    assert.deepEqual(pricesFromAverages({ high: 1300, low: 1000 }, avg(1300, 1000, 3, 200), day), { buyAt: 1000, sellAt: 1100 })
  })
})

describe('spike fixture: a single high print never lists a margin', () => {
  const day = { 1: avg(1100, 1000, 6_000) }
  // Live high and the hour's average high both come from one 3-item print at 1300.
  const spiked = { h1: { 1: avg(1300, 1000, 3, 200) }, h24: day, nowSec: NOW, tax, isPump: () => false }
  it('is dropped by the first pass', () => {
    assert.equal(screenSpread(item(), spiked), null)
  })
  it('is dropped by the history check when the hour looked busy', () => {
    // The hour reported enough volume to pass, but the series shows one print.
    const row = screenSpread(item(), { ...spiked, h1: { 1: avg(1300, 1000, 200) } })
    assert.ok(row)
    const s = series(200, [{ avgHighPrice: 1300, highPriceVolume: 2 }])
    assert.deepEqual(pricesFromSeries(row.item, s), { buyAt: 1000, sellAt: 1100 })
    assert.deepEqual(settleSpread(row, s, tax, 8), { kind: 'drop', why: 'spike' })
  })
})

describe('pricesFromSeries', () => {
  it('takes the median of recent busy hours on each side', () => {
    const s = series(200, [1280, 1300, 1290, 1270, 1310, 1285].map(avgHighPrice => ({ avgHighPrice })))
    // Median of the last 6 hours' highs: 1287.5.
    assert.deepEqual(pricesFromSeries({ high: 1320, low: 990 }, s), { buyAt: 1000, sellAt: 1288 })
  })
  it('caps the ask at the recent price so a lagging median cannot sit above a falling market', () => {
    const s = series(200, [1280, 1300, 1290, 1270, 1310, 1285].map(avgHighPrice => ({ avgHighPrice })))
    assert.deepEqual(pricesFromSeries({ high: 1320, low: 990 }, s, { buyAt: 1000, sellAt: 1250 }), { buyAt: 1000, sellAt: 1250 })
  })
  it('is null when a side has not traded enough lately', () => {
    const quiet = series(200, Array.from({ length: 6 }, () => ({ highPriceVolume: 1 })))
    assert.equal(pricesFromSeries({ high: 1300, low: 1000 }, quiet), null)
  })
})

describe('checkFill and fillableQty', () => {
  const flow = { typicalLow: 1000, typicalHigh: 1100, instantSellsPerHour: 100, instantBuysPerHour: 10, recentLows: [], recentHighs: [] }
  it('marks a sell slower than the limit as slow, a slow buy is not', () => {
    // Sell at the typical high gets a quarter of 10 an hour: 100 items take 40h.
    const slow = checkFill(flow, { buyAt: 1000, sellAt: 1100, profitEach: 78, qty: 100 }, 8)
    assert.deepEqual(slow.slow, { side: 'sell', hours: 40, qty: 100, price: 1100 })
    assert.equal(checkFill(flow, { buyAt: 1000, sellAt: 1100, profitEach: 78, qty: 10 }, 8).slow, null)
    // Buy 10 at a quarter of 4 an hour: 10h, over 8 but under twice it.
    const slowBuy = checkFill({ ...flow, instantSellsPerHour: 4, instantBuysPerHour: 1000 }, { buyAt: 1000, sellAt: 1100, profitEach: 78, qty: 10 }, 8)
    assert.ok(slowBuy.buyHours > 8)
    assert.equal(slowBuy.slow, null)
    const verySlowBuy = checkFill({ ...flow, instantSellsPerHour: 1, instantBuysPerHour: 1000 }, { buyAt: 1000, sellAt: 1100, profitEach: 78, qty: 10 }, 8)
    assert.equal(verySlowBuy.slow?.side, 'buy')
    const neverBuys = checkFill({ ...flow, instantSellsPerHour: 0 }, { buyAt: 1000, sellAt: 1100, profitEach: 78, qty: 10 }, 8)
    assert.deepEqual(neverBuys.slow, { side: 'buy', hours: Infinity, qty: 10, price: 1000 })
  })
  it('sizes to what buys and sells within the hours', () => {
    const rate = checkFill(flow, { buyAt: 1000, sellAt: 1100, profitEach: 78, qty: 100 }, 8)
    // Per item: 0.04h to buy + 0.4h to sell = 0.44h, so 9 fit in 4h.
    assert.equal(fillableQty(rate, 4, 8), 9)
    assert.equal(fillableQty(rate, 400, 2), 5)
    assert.equal(fillableQty({ ...rate, cycleHours: Infinity }, 4, 8), 0)
  })
})

describe('spreadLists', () => {
  const h24 = { 1: avg(1100, 1000, 6_000), 2: avg(1100, 1000, 6_000) }
  const h1 = { 1: avg(1300, 1000, 250), 2: avg(1300, 1000, 250) }
  const opts = { h1, h24, nowSec: NOW, tax, isPump: () => false }
  it('lists what fills, demotes what cannot sell in time with the reason', () => {
    const liquid = screenSpread(item(), opts)
    // A limit of 100,000 sells at a quarter of 250 an hour: days.
    const huge = screenSpread(item({ id: 2, name: 'Huge', limit: 100_000 }), opts)
    assert.ok(liquid && huge)
    const est = [liquid, huge].map(r => estimateSpread(r, h1, h24, 8)).filter(c => c !== null)
    const lists = spreadLists(est, () => undefined, tax, 8)
    assert.deepEqual(lists.listed.map(c => c.row.item.id), [1])
    assert.deepEqual(lists.slow.map(c => c.row.item.id), [2])
    assert.equal(lists.slow[0].fill.rate.slow?.side, 'sell')
  })
  it('drops rows the series shows were a spike', () => {
    const row = screenSpread(item(), opts)
    assert.ok(row)
    const est = estimateSpread(row, h1, h24, 8)
    assert.ok(est)
    const lists = spreadLists([est], () => series(250, [{ avgHighPrice: 1300, highPriceVolume: 2 }]), tax, 8)
    assert.equal(lists.listed.length, 0)
    assert.equal(lists.dropped.spike, 1)
  })
})

describe('fillAwarePicks', () => {
  const pick = (over: Partial<BuyPick>): BuyPick => ({
    id: 1, name: 'A', icon: null, members: false, buyAt: 1000, sellAt: 1100, tax: 22, profit: 78, roi: 0.078,
    maxQty: 100, potential: 7_800, cost: 100_000, dayVolume: 2_400, ...over
  })
  const day = (vol: number) => avg(1100, 1000, vol)
  it('sizes picks to what fills in the horizon and ranks by expected profit', () => {
    // Item 1 trades 250 an hour a side and we get a quarter: 0.016h to buy
    // and to sell each, so 125 fit in 4h (and sell in 2h). Item 2 is liquid.
    const h24 = { 1: day(6_000), 2: day(240_000) }
    const out = fillAwarePicks([pick({ maxQty: 1_000 }), pick({ id: 2, profit: 20, potential: 2_000 })], undefined, h24, { horizon: 4, maxSellHours: 2 })
    assert.deepEqual(out.picks.map(p => [p.id, p.maxQty, p.potential]), [[1, 125, 9_750], [2, 100, 2_000]])
    assert.equal(out.picks[0].cost, 125_000)
    assert.equal(out.slow.length, 0)
  })
  it('moves picks that cannot fill even one item to slow, sell side first', () => {
    const out = fillAwarePicks([pick({ sellAt: 1_500 })], undefined, { 1: day(6_000) }, { horizon: 4, maxSellHours: 8 })
    assert.equal(out.picks.length, 0)
    assert.equal(out.slow[0].reason.side, 'sell')
    assert.equal(out.slow[0].reason.hours, Infinity)
  })
  it('leaves out items trading under 10K a day and picks without flow data', () => {
    assert.deepEqual(fillAwarePicks([pick({})], undefined, { 1: day(4_999) }, { horizon: 4, maxSellHours: 8 }), { picks: [], slow: [] })
    assert.deepEqual(fillAwarePicks([pick({})], undefined, undefined, { horizon: 4, maxSellHours: 8 }), { picks: [], slow: [] })
  })
})
