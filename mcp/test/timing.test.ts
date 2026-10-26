import { geTax } from '@ge/engine'
import { describe, expect, it } from 'vitest'
import { fitLine, median, robustSigma, signTestP } from '../src/analysis/stats.js'
import { buyFillHours, flowFromAverages, flowFromSeries, MIN_FILL_HOURS, sellFillHours, slotRate } from '../src/analysis/timing/fillTime.js'
import { bestTradeHoursReport, breakEvenPrice, fillEstimateReport, sellOrHoldReport } from '../src/analysis/timing/report.js'
import { sellAdvice } from '../src/analysis/timing/sellAdvice.js'
import { dayOfWeekProfile, hourOfDayProfile, utcHourOf, utcWeekdayOf } from '../src/analysis/timing/timeProfile.js'
import { MAPPING } from './fixtures/market.js'
import { SERIES_START, avgOf, series } from './fixtures/series.js'

const whip = MAPPING.find(m => m.id === 4151)!
const taxOf = (p: number) => geTax(p, 4151)

describe('stats', () => {
  it('median, sign test, robust sigma and line fit', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 2, 3])).toBe(2.5)
    expect(median([])).toBeNull()
    expect(signTestP(10, 10)).toBeCloseTo(1 / 1024, 8)
    expect(signTestP(0, 10)).toBe(1)
    expect(robustSigma([1, 1, 1, 1])).toBe(0)
    const fit = fitLine([0, 1, 2, 3], [1, 3, 5, 7])
    expect(fit).toMatchObject({ slope: 2, intercept: 1, r2: 1 })
    expect(fitLine([1, 1, 1], [1, 2, 3])).toBeNull()
  })
})

describe('time profile', () => {
  it('maps timestamps to UTC hours and weekdays', () => {
    expect(utcHourOf(SERIES_START + 5 * 3600 + 59)).toBe(5)
    expect(utcWeekdayOf(SERIES_START)).toBe(4) // 1 Oct 2026 is a Thursday
  })

  it('finds a consistent cheap hour and dear hour despite a trend', () => {
    const s = series({ days: 15, base: 10_000, drift: 0.01, lowEffect: h => (h === 4 ? 0.98 : 1), highEffect: h => (h === 19 ? 1.02 : 1) })
    const p = hourOfDayProfile(s)
    expect(p.buy).toMatchObject({ slot: 4, confidence: 'high' })
    expect(p.sell).toMatchObject({ slot: 19, confidence: 'high' })
    expect(p.buy!.edge).toBeGreaterThan(0.015)
    expect(p.buy!.beatRate).toBeGreaterThan(0.9)
    expect(p.periods).toBeGreaterThanOrEqual(14)
  })

  it('does not call a pattern on pure noise', () => {
    const p = hourOfDayProfile(series({ days: 15, base: 10_000, noisePct: 0.01 }))
    expect(p.buy?.confidence ?? 'low').toBe('low')
    expect(p.sell?.confidence ?? 'low').toBe('low')
  })

  it('ignores a cheap hour that barely trades', () => {
    const s = series({ days: 15, base: 10_000, lowEffect: h => (h === 4 ? 0.95 : 1), volume: h => (h === 4 ? 2 : 50) })
    expect(hourOfDayProfile(s).buy?.slot).not.toBe(4)
  })

  it('profiles weekdays from a 6h series', () => {
    const sixHourly = series({ days: 90, base: 1000, stepSec: 21_600 })
    const weekdayEffect = sixHourly.map(p => (utcWeekdayOf(p.timestamp) === 6 ? { ...p, avgHighPrice: (p.avgHighPrice as number) * 1.03 } : p))
    const p = dayOfWeekProfile(weekdayEffect)
    expect(p.sell).toMatchObject({ slot: 6 })
    expect(p.sell?.confidence).not.toBe('low')
  })

  it('reports compact tables and labels', () => {
    const s = series({ days: 15, base: 10_000, lowEffect: h => (h === 4 ? 0.98 : 1) })
    const report = bestTradeHoursReport(whip, s, [])
    expect(report.hourOfDay.buyAt).toMatchObject({ when: '04:00 UTC', confidence: 'high' })
    expect(report.hourOfDay.table.rows).toHaveLength(24)
    expect(report.dayOfWeek.buyOn).toBeNull()
  })
})

describe('fill time', () => {
  // 24h, 50 items/hour each side, low 990 / high 1010.
  const flow = flowFromSeries(series({ days: 2, base: 1000, noisePct: 0 }))!

  it('reads typical prices and per-side flow from the last 24h', () => {
    expect(flow.typicalLow).toBeCloseTo(990)
    expect(flow.typicalHigh).toBeCloseTo(1010)
    expect(flow.instantSellsPerHour).toBe(50)
    expect(flow.recentLows).toHaveLength(24)
  })

  it('fills faster when outbidding, never below a few minutes, never below the market', () => {
    // At the typical low: 25% of 50/h -> 100 items take 8h.
    expect(buyFillHours(flow, 990, 100)).toBeCloseTo(8)
    // At the typical high you get the whole flow: 2h.
    expect(buyFillHours(flow, 1010, 100)).toBeCloseTo(2)
    expect(buyFillHours(flow, 1010, 1)).toBe(MIN_FILL_HOURS)
    expect(buyFillHours(flow, 900, 10)).toBe(Infinity)
    expect(sellFillHours(flow, 1010, 100)).toBeCloseTo(8)
    expect(sellFillHours(flow, 1100, 1)).toBe(Infinity)
  })

  it('earns GP/hour per slot over one buy limit', () => {
    const rate = slotRate(flow, { buyAt: 990, sellAt: 1010, profitEach: 0, qty: 500, limit: 70 })
    expect(rate.units).toBe(70)
    expect(rate.cycleHours).toBeCloseTo(70 / 12.5 * 2)
    expect(slotRate(flow, { buyAt: 990, sellAt: 1010, profitEach: 10, qty: 25, limit: null }).gpPerHour).toBeCloseTo(250 / 4)
  })

  it('uses the slower of the hour and the day from bulk averages', () => {
    const f = flowFromAverages(avgOf(1010, 990, 1, 100), avgOf(1000, 980, 240, 480))!
    expect(f.instantBuysPerHour).toBe(1)
    expect(f.instantSellsPerHour).toBe(20)
    expect(flowFromAverages(undefined, undefined)).toBeNull()
  })

  it('builds the fill report with buy-limit windows', () => {
    const s = series({ days: 2, base: 1_000_000, noisePct: 0 })
    const r = fillEstimateReport({ entry: whip, series: s, latest: { high: 1_010_000, low: 990_000, highTime: 0, lowTime: 0 }, qty: 140, taxOf })
    expect(r).toMatchObject({ buyPrice: 990_000, sellPrice: 1_010_000, taxEach: 20_200, profitEach: -200, buyLimitWindows: 2, willFill: true })
    expect((r as { buyHours: number }).buyHours).toBeGreaterThanOrEqual(4)
    expect(fillEstimateReport({ entry: whip, series: [], latest: undefined, qty: 1, taxOf })).toHaveProperty('error')
  })
})

describe('sell or hold', () => {
  const flow = flowFromSeries(series({ days: 2, base: 1000, noisePct: 0 }))!
  const tax = (p: number) => Math.floor(p * 0.02)

  it('lists when the wait is short and pays more', () => {
    const advice = sellAdvice({ qty: 10, instantSell: 990, instantBuy: 1010, dayHigh: 1010, flow, taxOf: tax })
    expect(advice).toMatchObject({ verdict: 'list', listPrice: 1010 })
    expect(advice!.extraGp).toBe((1010 - 20 - (990 - 19)) * 10)
  })

  it('sells now when the listing would take too long', () => {
    expect(sellAdvice({ qty: 5000, instantSell: 990, instantBuy: 1010, dayHigh: 1010, flow, taxOf: tax })?.verdict).toBe('sell-now')
    expect(sellAdvice({ qty: 1, instantSell: null, instantBuy: 1010, dayHigh: 1010, flow, taxOf: tax })).toBeNull()
  })

  it('finds the break-even price after tax', () => {
    expect(breakEvenPrice(980, p => Math.floor(p * 0.02))).toBe(999) // 999 - 19 tax = 980
    expect(breakEvenPrice(40, () => 0)).toBe(40)
  })

  it('reports profit vs paid and overrides to sell-now in a pump', () => {
    const s = series({ days: 2, base: 1_000_000, noisePct: 0 })
    const base = { entry: whip, qty: 2, paid: 900_000, series: s, latest: { high: 1_010_000, low: 990_000, highTime: 0, lowTime: 0 }, taxOf }
    const calm = sellOrHoldReport({ ...base, averages: { '24h': avgOf(1_010_000, 990_000, 1200, 1200), '1h': avgOf(1_010_000, 990_000, 50, 50) } })
    expect(calm).toMatchObject({ verdict: 'list', sellNow: { price: 990_000, profitTotal: (990_000 - 19_800 - 900_000) * 2 }, spike: null })
    const pumped = sellOrHoldReport({ ...base, averages: { '24h': avgOf(1_000_000, 980_000, 1200, 1200), '1h': avgOf(1_150_000, 1_120_000, 5, 5) } })
    expect(pumped).toMatchObject({ verdict: 'sell-now', spike: { kind: 'pump', trigger: 'hour' } })
  })
})
