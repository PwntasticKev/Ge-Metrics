/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { TimeseriesPoint } from '../analytics/types.ts'
import { breakEvenSale, exitRehearsal } from '../exitRehearsal.ts'

const HOUR = 3600
const tax = (price: number, id: number) => id === 2 ? 0 : Math.min(5_000_000, Math.floor(price * 0.02))
const rows = (count = 32): TimeseriesPoint[] => Array.from({ length: count }, (_, h) => ({ timestamp: h * HOUR, avgHighPrice: 1100, avgLowPrice: 1000, highPriceVolume: 1000, lowPriceVolume: 1000 }))
const run = (series = rows(), over = {}) => exitRehearsal({ series, itemId: 1, buyAt: 1000, sellAt: 1100, horizon: 2, nowSec: 32 * HOUR, tax, ...over })

describe('exit rehearsal', () => {
  it('uses disjoint closed windows and distinguishes a quoted target from an instant exit', () => {
    const r = run()
    assert.deepEqual(r.examples.map(x => x.decision / HOUR), [24, 26, 28, 30])
    assert.equal(r.targetQuoted, 4)
    assert.equal(r.exitChecked, 4)
    assert.equal(r.positiveExits, 0)
    assert.equal(r.medianReturn, -0.02)
    assert.equal(r.worstReturn, -0.02)
    assert.equal(run(rows(), { horizon: 4 }).matched, 2)
    assert.equal(run(rows(), { horizon: 8 }).matched, 1)
  })
  it('never uses future prices or volume to construct an entry quote', () => {
    const series = rows()
    series[25] = { ...series[25], avgLowPrice: 800, avgHighPrice: 900, lowPriceVolume: 100_000 }
    const before = run().examples[0]
    const after = run(series).examples[0]
    assert.deepEqual([after.decision, after.buyAt, after.sellAt], [before.decision, before.buyAt, before.sellAt])
    assert.equal(after.exitReturn, -0.216)
    assert.equal(after.targetQuoted, false)
  })
  it('does not hide missing or thin outcomes as losses or successful exits', () => {
    const series = rows()
    series[25] = { ...series[25], avgLowPrice: null, lowPriceVolume: 0, highPriceVolume: 1 }
    const r = run(series)
    assert.equal(r.examples[0].exitReturn, null)
    assert.equal(r.examples[0].targetQuoted, null)
    assert.equal(r.matched, 4)
    assert.equal(r.exitChecked, 3)
    assert.equal(r.targetChecked, 3)
  })
  it('requires a complete trailing day and drops ambiguous duplicate periods', () => {
    const gap = rows().filter(x => x.timestamp !== 3 * HOUR)
    assert.deepEqual(run(gap).examples.map(x => x.decision / HOUR), [28, 30])
    assert.deepEqual(run([...rows(), rows()[3]]), run(gap))
  })
  it('sorts input and ignores partial hours and future observations', () => {
    assert.deepEqual(run(rows().reverse()), run())
    const r = run(rows(50), { nowSec: 31.5 * HOUR })
    assert.deepEqual(r.examples.map(x => x.decision / HOUR), [24, 26, 28])
  })
  it('matches entry spreads before looking at outcomes and requires a positive current spread', () => {
    assert.equal(run(rows(), { sellAt: 2000 }).matched, 0)
    assert.equal(run(rows(), { sellAt: 1000 }).matched, 0)
    assert.equal(run(rows(), { buyAt: 0 }).matched, 0)
  })
  it('uses item tax exemptions for historical exits too', () => {
    assert.equal(run(rows(), { itemId: 2 }).medianReturn, 0)
  })
  it('does not extrapolate a worst result when there are no usable exits', () => {
    const r = run(rows(20))
    assert.equal(r.medianReturn, null)
    assert.equal(r.worstReturn, null)
  })
})

describe('break-even sale', () => {
  it('finds the smallest whole GP sale after tax, including exemptions and caps', () => {
    for (const buy of [1, 50, 1000, 200_000_000, 400_000_000]) {
      for (const id of [1, 2]) {
        const sale = breakEvenSale(buy, id, tax)
        assert.ok(sale - tax(sale, id) >= buy)
        assert.ok(sale - 1 - tax(sale - 1, id) < buy)
      }
    }
  })
})
