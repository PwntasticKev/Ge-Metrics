import { describe, expect, it } from 'vitest'
import { findDips } from '../src/analysis/dips.js'
import { processing, setArbitrage, topFlips } from '../src/analysis/flips.js'
import type { AveragePrice } from '../src/wiki/types.js'
import { LATEST, MAPPING, avg, market } from './fixtures/market.js'

const base = { minVolume: 0, sort: 'profit' as const, limit: 50, includeMembers: true, includeStale: false }

describe('topFlips', () => {
  it('ranks by profit after tax and skips stale prices', () => {
    const flips = topFlips(market(), base)
    expect(flips[0]).toMatchObject({ id: 4151, marginAfterTax: 80_000, tax: 20_000 })
    expect(flips.find(f => f.id === 536)).toBeUndefined()
    expect(topFlips(market(), { ...base, includeStale: true }).find(f => f.id === 536)).toBeDefined()
  })

  it('excludes implausible spreads (>25% ROI)', () => {
    // Logs: 40 -> 60 is a 50% ROI fluke.
    expect(topFlips(market(), base).find(f => f.id === 1511)).toBeUndefined()
  })

  it('applies volume, price and members filters', () => {
    expect(topFlips(market(), { ...base, minVolume: 10_000 }).every(f => (f.dailyVolume ?? 0) >= 10_000)).toBe(true)
    expect(topFlips(market(), { ...base, maxPrice: 1000 }).every(f => f.buyAt <= 1000)).toBe(true)
    expect(topFlips(market(), { ...base, includeMembers: false }).map(f => f.id).sort()).toEqual([561, 960])
  })

  it('profit_per_limit uses the buy limit capped by volume and budget', () => {
    const [first] = topFlips(market(), { ...base, sort: 'profit_per_limit' })
    // Whip: limit 70, fillable 3000/6 = 500 -> 70 x 80,000
    expect(first).toMatchObject({ id: 4151, qtyPer4h: 70, profitPer4h: 5_600_000 })
    const capped = topFlips(market(), { ...base, sort: 'profit_per_limit', budget: 2_000_000 }).find(f => f.id === 4151)
    expect(capped).toMatchObject({ qtyPer4h: 2, profitPer4h: 160_000 })
  })
})

describe('setArbitrage', () => {
  it('finds the profitable direction for a GE set', () => {
    const [adamant] = setArbitrage(market(), { sort: 'profit', limit: 5, includeStale: false })
    // Combine: parts 3,500 + 9,000 + 7,000 + 5,000 = 24,500; set sells 28,000, tax 560.
    expect(adamant).toMatchObject({ setId: 13012, direction: 'combine', cost: 24_500, revenue: 28_000, tax: 560, profit: 2940 })
    expect(adamant?.buy.map(l => l.id).sort()).toEqual([1073, 1123, 1161, 1199])
  })
})

describe('processing', () => {
  it('prices the sawmill with its coin fee and tax', () => {
    const sawmill = processing(market(), { method: 'sawmill', sort: 'profit', limit: 10, includeStale: false })
    const plank = sawmill.find(m => m.name === 'Plank')
    // Logs 40 + fee 100 -> plank 170, tax 3
    expect(plank).toMatchObject({ method: 'sawmill', costPerAction: 140, profitPerAction: 27, requirements: expect.any(String) })
    expect(plank?.profitPerHour).toBeGreaterThan(0)
  })
})

describe('findDips', () => {
  const run = (hour: AveragePrice, day: AveragePrice, options = {}) =>
    findDips({ mapping: MAPPING, hour: new Map([[4151, hour]]), day: new Map([[4151, day]]), latest: LATEST }, options)

  it('flags a low-side drop while highs hold', () => {
    const [dip] = run(avg(995_000, 850_000, 50, 50), avg(1_000_000, 920_000, 1000, 1000))
    expect(dip).toMatchObject({ id: 4151, hourAvgLow: 850_000, dayAvgLow: 920_000, lowDropPct: 7.61, highChangePct: -0.5 })
    expect(dip?.profitIfRecovers).toBe(1_000_000 - 850_000 - 20_000)
    // 50 dumped in the last hour, buy limit 70 -> 50 x 130,000
    expect(dip?.potentialProfit).toBe(6_500_000)
  })

  it('ignores drops where the highs fall too, spike, or are too small', () => {
    expect(run(avg(950_000, 850_000), avg(1_000_000, 920_000, 1000, 1000))).toEqual([])
    expect(run(avg(1_100_000, 850_000), avg(1_000_000, 920_000, 1000, 1000))).toEqual([])
    expect(run(avg(1_000_000, 900_000), avg(1_000_000, 920_000, 1000, 1000))).toEqual([])
  })

  it('ignores illiquid items and fluke-sized drops', () => {
    expect(run(avg(1_000_000, 850_000, 1, 1), avg(1_000_000, 920_000, 1000, 1000))).toEqual([])
    expect(run(avg(1_000_000, 850_000), avg(1_000_000, 920_000, 100, 100))).toEqual([])
    expect(run(avg(1_000_000, 300_000), avg(1_000_000, 920_000, 1000, 1000))).toEqual([])
  })
})
