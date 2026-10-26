/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { screenSpread, screenSpreads, spreadHistory, type LiveItem, type TaxFn } from '../spreadScan.ts'

const tax: TaxFn = sell => (sell >= 50 ? Math.floor(sell * 0.02) : 0)
const NOW = 1_800_000_000
const item = (over: Partial<LiveItem> = {}): LiveItem => ({ id: 1, name: 'Thing', icon: null, limit: 100, high: 1300, low: 1000, highTime: NOW - 60, lowTime: NOW - 60, ...over })
const avg = (high: number, low: number, vol = 200) => ({ avgHighPrice: high, avgLowPrice: low, highPriceVolume: vol, lowPriceVolume: vol })
// Day norm: 1100 - 1000 - 22 = 78. Live: 1300 - 1000 - 26 = 274 (3.5x).
const base = { h1: { 1: avg(1300, 1000, 20) }, h24: { 1: avg(1100, 1000) }, nowSec: NOW, tax, isPump: () => false }

describe('screenSpread', () => {
  it('finds a live margin well above the day norm', () => {
    const row = screenSpread(item(), base)
    assert.ok(row)
    assert.equal(row.live, 274)
    assert.equal(row.dayNorm, 78)
    assert.equal(row.hourMargin, 274)
    assert.equal(row.rawLive, 274)
    assert.equal(row.multiple.toFixed(2), '3.51')
    assert.equal(row.profitPerLimit, 27_400)
    assert.equal(row.dayTrades, 400)
  })
  it('uses the worse of live and last-hour prices so one odd trade cannot fake a gap', () => {
    // A lone instant-sell at 200 and a lone buy at 1300; the hour traded 1000 to 1250.
    const row = screenSpread(item({ low: 200 }), { ...base, h1: { 1: avg(1250, 1000, 20) } })
    assert.ok(row)
    assert.equal(row.rawLive, 1074)
    assert.equal(row.live, 225) // 1250 - 1000 - 25
    assert.equal(screenSpread(item(), { ...base, h1: {} }), null)
  })
  it('skips margins near the norm', () => {
    assert.equal(screenSpread(item({ high: 1140 }), base), null)
  })
  it('skips stale live prices, thin items, pumps and small profits', () => {
    assert.equal(screenSpread(item({ lowTime: NOW - 3600 }), base), null)
    assert.equal(screenSpread(item(), { ...base, h24: { 1: avg(1100, 1000, 100) } }), null)
    assert.equal(screenSpread(item(), { ...base, isPump: () => true }), null)
    assert.equal(screenSpread(item({ limit: 50 }), base), null)
  })
  it('floors a negative norm so the multiple stays meaningful', () => {
    const row = screenSpread(item(), { ...base, h24: { 1: avg(1010, 1000) } })
    assert.ok(row)
    assert.equal(row.dayNorm, -10)
    assert.equal(row.multiple, 137) // 274 / 2 (0.2% of 1000)
  })
  it('needs a few trades on each side this hour', () => {
    assert.equal(screenSpread(item(), { ...base, h1: { 1: { ...avg(1300, 1000), lowPriceVolume: 2 } } }), null)
  })
  it('sorts the most profit per buy limit first', () => {
    const items = [item(), item({ id: 2, high: 1500 })]
    const rows = screenSpreads({ items, ...base, h1: { 1: avg(1300, 1000), 2: avg(1500, 1000) }, h24: { 1: avg(1100, 1000), 2: avg(1100, 1000) } })
    assert.deepEqual(rows.map(r => r.item.id), [2, 1])
  })
})

describe('spreadHistory', () => {
  const week = Array.from({ length: 168 }, (_, i) => avg(1100 + (i % 3) * 5, 1000, 10))
  it('scores the live margin against the median hourly margin', () => {
    const h = spreadHistory(week, 274, 1, tax)
    assert.ok(h)
    assert.equal(h.norm, 83) // 1105 - 1000 - 22, the middle of 78 / 83 / 88
    assert.equal(h.hours, 168)
    assert.ok(h.z > 3 && h.unusual)
    assert.equal(h.multiple.toFixed(2), '3.30')
  })
  it('calls an ordinary margin ordinary', () => {
    assert.equal(spreadHistory(week, 85, 1, tax)?.unusual, false)
  })
  it('needs a day of two-sided hours', () => {
    const thin = week.map((p, i) => (i % 10 ? { ...p, avgLowPrice: null, lowPriceVolume: 0 } : p))
    assert.equal(spreadHistory(thin, 274, 1, tax), null)
  })
})
