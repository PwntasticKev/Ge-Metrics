/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { TimeseriesPoint } from '../analytics/types.ts'
import { DEFAULT_MAX_SELL_HOURS, isMaxSellHours, MAX_SELL_HOUR_OPTIONS, MIN_DAY_TRADES } from '../fillAware.ts'
import { PICK_HORIZON_HOURS } from '../pickFill.ts'
import { SHEET_HORIZON_HOURS, sheetFill, type SheetFillInput } from '../sheetFill.ts'

const tax = (sell: number) => (sell >= 50 ? Math.floor(sell * 0.02) : 0)
const NOW = 1_800_000_000
const HOUR = 3_600
const avg = (high: number, low: number, highVol: number, lowVol = highVol) => ({ avgHighPrice: high, avgLowPrice: low, highPriceVolume: highVol, lowPriceVolume: lowVol })

/** 48 hours trading 1000 / 1100 at `vol` items a side, newest last; `last` replaces the final hours. */
function series (vol: number, last: Partial<TimeseriesPoint>[] = []): TimeseriesPoint[] {
  const base = Array.from({ length: 48 }, (_, i) => ({ timestamp: NOW - (48 - i) * HOUR, ...avg(1100, 1000, vol) }))
  return base.map((p, i) => {
    const j = i - (base.length - last.length)
    return j >= 0 ? { ...p, ...last[j] } : p
  })
}

const input = (over: Partial<SheetFillInput> = {}): SheetFillInput => ({
  item: { id: 1, high: 1300, low: 1000, limit: 100 },
  hour: avg(1100, 1000, 200),
  day: avg(1100, 1000, 6_000),
  series: series(200),
  maxSellHours: 1,
  budget: null,
  tax,
  ...over
})

describe('sheetFill prices', () => {
  it('uses traded prices, not a one-print live high', () => {
    // Live high 1300 came from one 2-item print; the series says 1100.
    const fill = sheetFill(input({ series: series(200, [{ avgHighPrice: 1300, highPriceVolume: 2 }]) }))
    assert.ok(fill)
    assert.equal(fill.basis, 'series')
    assert.equal(fill.buyAt, 1000)
    assert.equal(fill.sellAt, 1100)
    assert.equal(fill.tax, 22)
    assert.equal(fill.margin, 78)
  })
  it('caps the ask at the live price when the market fell', () => {
    const fill = sheetFill(input({ item: { id: 1, high: 1050, low: 1000, limit: 100 } }))
    assert.equal(fill?.sellAt, 1050)
  })
  it('uses the averages until the series loads', () => {
    const fill = sheetFill(input({ series: undefined }))
    assert.equal(fill?.basis, 'averages')
    assert.deepEqual([fill?.buyAt, fill?.sellAt], [1000, 1100])
  })
  it('ignores a thin last hour and falls back to the day', () => {
    const fill = sheetFill(input({ series: undefined, hour: avg(1300, 1000, 3, 200) }))
    assert.equal(fill?.sellAt, 1100)
  })
  it('is null without day averages', () => {
    assert.equal(sheetFill(input({ series: undefined, day: undefined })), null)
  })
})

describe('sheetFill amount', () => {
  it('sizes to what sells inside the slowest-sell setting', () => {
    // 50 an hour reach each offer: 100 would take 2h to sell, over the 1h setting.
    const fill = sheetFill(input())
    assert.equal(fill?.qty, 50)
    assert.equal(fill?.profit, 50 * 78)
    assert.equal(fill?.rate?.sellHours, 1)
    assert.equal(fill?.rate?.cycleHours, 2)
    assert.equal(fill?.slow, null)
  })
  it('sizes to the 2h window of Next 4 hours by default', () => {
    // Without the sell cap, 100 takes 4h to buy and sell; 2h fits 50.
    assert.equal(SHEET_HORIZON_HOURS, 2)
    assert.equal(sheetFill(input({ maxSellHours: 4 }))?.qty, 50)
  })
  it('keeps a whole buy limit when it fills in the window', () => {
    assert.equal(sheetFill(input({ maxSellHours: 4, horizon: 4 }))?.qty, 100)
  })
  it('never starts with more than the cash buys', () => {
    assert.equal(sheetFill(input({ maxSellHours: 4, horizon: 4, budget: 30_500 }))?.qty, 30)
  })
  it('explains when not even one fills', () => {
    const fill = sheetFill(input({ series: undefined, hour: avg(1100, 1000, 0, 200) }))
    assert.equal(fill?.qty, 0)
    assert.equal(fill?.profit, 0)
    assert.match(fill?.slowText ?? '', /sell rarely fills/)
    assert.equal(fill?.slow?.side, 'sell')
  })
  it('flags items under the 10K a day floor', () => {
    assert.equal(sheetFill(input())?.thin, false)
    assert.equal(sheetFill(input({ day: avg(1100, 1000, 4_000) }))?.thin, true)
  })
})

describe('walk-forward defaults (PR #33)', () => {
  it('sizes Next 4 hours and Plan for 2h, keeps Dips 4h and Overnight 8h', () => {
    assert.deepEqual(PICK_HORIZON_HOURS, { quick: 2, plan: 2, dips: 4, overnight: 8 })
  })
  it('shows sells up to 30 minutes by default, still adjustable', () => {
    assert.equal(DEFAULT_MAX_SELL_HOURS, 0.5)
    assert.deepEqual([...MAX_SELL_HOUR_OPTIONS], [0.5, 1, 2, 4, 8])
    assert.equal(isMaxSellHours(0.5), true)
    assert.equal(isMaxSellHours(0.75), false)
  })
  it('keeps the 10K a day floor', () => {
    assert.equal(MIN_DAY_TRADES, 10_000)
  })
})
