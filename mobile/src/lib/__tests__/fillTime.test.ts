/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buyFillHours, flowFromAverages, flowFromSeries, MIN_FILL_HOURS, QUEUE_SHARE, sellFillHours, slotRate, type MarketFlow } from '../analytics/fillTime.ts'
import { MAX_LIST_WAIT_HOURS, sellAdvice } from '../analytics/sellAdvice.ts'
import type { TimeseriesPoint } from '../analytics/types.ts'

const flow: MarketFlow = {
  typicalLow: 100,
  typicalHigh: 110,
  instantSellsPerHour: 400,
  instantBuysPerHour: 200,
  recentLows: [],
  recentHighs: []
}
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`)

describe('fill time', () => {
  it('fills a bid at the typical low from a queue share of instant-sells', () => {
    close(buyFillHours(flow, 100, 100), 100 / (400 * QUEUE_SHARE))
  })
  it('fills faster the more you outbid, up to the whole flow', () => {
    assert.ok(buyFillHours(flow, 105, 100) < buyFillHours(flow, 100, 100))
    close(buyFillHours(flow, 110, 100), 100 / 400)
    close(buyFillHours(flow, 500, 100), 100 / 400)
  })
  it('never fills a bid under every recent low', () => {
    assert.equal(buyFillHours(flow, 90, 10), Infinity)
    assert.equal(buyFillHours({ ...flow, recentLows: [100, 101, 99] }, 98, 10), Infinity)
  })
  it('scales by how often recent hours reached the price', () => {
    const sampled = { ...flow, recentLows: [99, 100, 101, 102] }
    close(buyFillHours(sampled, 100, 100), 100 / (400 * 0.5 * QUEUE_SHARE))
  })
  it('mirrors the sell side on instant-buys', () => {
    close(sellFillHours(flow, 110, 50), 50 / (200 * QUEUE_SHARE))
    close(sellFillHours(flow, 100, 50), 50 / 200)
    assert.equal(sellFillHours(flow, 120, 1), Infinity)
  })
  it('never claims an instant fill', () => {
    assert.equal(buyFillHours(flow, 110, 1), MIN_FILL_HOURS)
    assert.equal(buyFillHours(flow, 110, 0), 0)
    assert.equal(buyFillHours({ ...flow, instantSellsPerHour: 0 }, 110, 1), Infinity)
  })
})

describe('flows', () => {
  it('averages the last 24 hours of a series', () => {
    const points: TimeseriesPoint[] = Array.from({ length: 48 }, (_, i) => ({
      timestamp: i * 3600,
      avgLowPrice: i < 24 ? 50 : 100,
      avgHighPrice: i < 24 ? 55 : 110,
      lowPriceVolume: i < 24 ? 0 : 240,
      highPriceVolume: i < 24 ? 0 : 120
    }))
    const f = flowFromSeries(points)
    assert.ok(f)
    assert.equal(f.typicalLow, 100)
    assert.equal(f.typicalHigh, 110)
    assert.equal(f.instantSellsPerHour, 240)
    assert.equal(f.instantBuysPerHour, 120)
    assert.equal(f.recentLows.length, 24)
  })
  it('returns null without prices', () => {
    assert.equal(flowFromSeries([]), null)
    assert.equal(flowFromSeries([{ timestamp: 0, avgLowPrice: null, avgHighPrice: 5, lowPriceVolume: 1, highPriceVolume: 1 }]), null)
  })
  it('takes the slower of the last hour and the day from averages', () => {
    const f = flowFromAverages(
      { avgLowPrice: 99, avgHighPrice: 108, lowPriceVolume: 10, highPriceVolume: 500 },
      { avgLowPrice: 100, avgHighPrice: 110, lowPriceVolume: 2400, highPriceVolume: 2400 }
    )
    assert.ok(f)
    assert.equal(f.instantSellsPerHour, 10)
    assert.equal(f.instantBuysPerHour, 100)
    assert.equal(f.typicalLow, 100)
    assert.equal(flowFromAverages(undefined, undefined), null)
  })
})

describe('slotRate', () => {
  it('earns profit on one buy limit over both fill times', () => {
    const r = slotRate(flow, { buyAt: 100, sellAt: 110, profitEach: 8, qty: 500, limit: 100 })
    assert.equal(r.units, 100)
    close(r.buyHours, 1)
    close(r.sellHours, 2)
    close(r.gpPerHour, 800 / 3)
  })
  it('is zero when an offer would never fill', () => {
    assert.equal(slotRate(flow, { buyAt: 50, sellAt: 110, profitEach: 8, qty: 10, limit: null }).gpPerHour, 0)
  })
})

describe('sellAdvice', () => {
  const taxOf = (p: number) => Math.floor(p * 0.02)
  it('weighs selling now against listing at the day high', () => {
    const a = sellAdvice({ qty: 100, instantSell: 100, instantBuy: 108, dayHigh: 110, flow, taxOf })
    assert.ok(a)
    assert.equal(a.nowPrice, 100)
    assert.equal(a.listPrice, 110)
    assert.equal(a.extraGp, (110 - 2 - (100 - 2)) * 100)
    close(a.waitHours, 2)
    assert.equal(a.verdict, 'list')
  })
  it('lists at the day high, not a live spike above it', () => {
    assert.equal(sellAdvice({ qty: 1, instantSell: 100, instantBuy: 115, dayHigh: 110, flow, taxOf })?.listPrice, 110)
    assert.equal(sellAdvice({ qty: 1, instantSell: 100, instantBuy: 115, dayHigh: null, flow, taxOf })?.listPrice, 115)
  })
  it('says sell now when the wait is too long or there is nothing to gain', () => {
    const slow = sellAdvice({ qty: 100_000, instantSell: 100, instantBuy: 108, dayHigh: 110, flow, taxOf })
    assert.ok(slow && slow.waitHours > MAX_LIST_WAIT_HOURS)
    assert.equal(slow?.verdict, 'sell-now')
    assert.equal(sellAdvice({ qty: 1, instantSell: 110, instantBuy: 110, dayHigh: 110, flow, taxOf })?.verdict, 'sell-now')
  })
  it('needs a price', () => {
    assert.equal(sellAdvice({ qty: 1, instantSell: null, instantBuy: 1, dayHigh: 1, flow, taxOf }), null)
    assert.equal(sellAdvice({ qty: 1, instantSell: 1, instantBuy: 1, dayHigh: 1, flow: null, taxOf }), null)
  })
})
