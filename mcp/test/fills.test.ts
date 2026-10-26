import { describe, expect, it } from 'vitest'
import { geTax } from '@ge/engine'
import { type Candidate, bulkCandidate, refineCandidate } from '../src/analysis/fills/candidates.js'
import { bulkRows, rankRows } from '../src/analysis/fills/flipRows.js'
import { cycleUnits, demotedSummary, fillMetrics, qtyWithinHours } from '../src/analysis/fills/metrics.js'
import { planFlips, planJson } from '../src/analysis/fills/plan.js'
import { MIN_HOUR_SIDE_TRADES, realisticFromAverages, realisticFromSeries } from '../src/analysis/fills/realistic.js'
import { dipFill, quoteFill } from '../src/analysis/fills/scanFills.js'
import { flowFromSeries, slotGpPerHour, slotRate } from '../src/analysis/timing/fillTime.js'
import type { MappingEntry } from '../src/wiki/types.js'
import { flatSeries } from './fixtures/fills.js'
import { MAPPING, NOW, avg } from './fixtures/market.js'

const tax = (price: number, id: number) => geTax(price, id)
const item = (id: number, limit: number | null = 100, name = `Item ${id}`): MappingEntry =>
  ({ id, name, examine: null, members: true, limit, value: null, highalch: null, lowalch: null, icon: null })
const whip = MAPPING.find(m => m.id === 4151) as MappingEntry

describe('realistic prices', () => {
  it('a single high print in /latest or a thin hour cannot create a margin', () => {
    const prices = realisticFromAverages({
      // One instant-buy at 1.5M in the last hour: too thin to count.
      h1: avg(1_500_000, 900_000, 1, 40),
      h24: avg(1_000_000, 900_000, 600, 600),
      latest: { high: 2_000_000, low: 900_000, highTime: NOW, lowTime: NOW }
    })
    expect(prices).toMatchObject({ buyAt: 900_000, sellAt: 1_000_000 })
  })

  it('prefers the last hour when it qualifies, the day otherwise; live only makes it more careful', () => {
    expect(realisticFromAverages({ h1: avg(990, 960, 50, 50), h24: avg(1000, 900, 600, 600) })).toMatchObject({ buyAt: 960, sellAt: 990 })
    expect(realisticFromAverages({ h1: avg(990, 960, 2, 50), h24: avg(1000, 900, 600, 600) })).toMatchObject({ buyAt: 960, sellAt: 1000 })
    const live = { high: 980, low: 970, highTime: NOW, lowTime: NOW }
    expect(realisticFromAverages({ h1: avg(990, 960, 50, 50), latest: live })).toMatchObject({ buyAt: 970, sellAt: 980 })
  })

  it('needs enough trades on both sides', () => {
    expect(realisticFromAverages({ h1: avg(1000, 950, MIN_HOUR_SIDE_TRADES - 1, 50), h24: avg(1000, 950, 10, 600) })).toBeNull()
  })

  it('series pricing ignores spiked hours (median of qualifying hours)', () => {
    const s = flatSeries({ low: 900, high: 1000, spikeHours: [5, 23], spikeHigh: 2000, spikeVolume: 6 })
    expect(realisticFromSeries(s)).toMatchObject({ buyAt: 900, sellAt: 1000, basis: 'hourly series (24h)' })
  })

  it('series pricing follows a fall in the last hours', () => {
    const s = flatSeries({ low: 900, high: 1000 }).map((p, i) => (i >= 20 ? { ...p, avgHighPrice: 950 } : p))
    expect(realisticFromSeries(s)?.sellAt).toBe(950)
  })
})

describe('fill metrics', () => {
  const flow = flowFromSeries(flatSeries({ low: 900_000, high: 1_000_000, volume: 100 }))!

  it('estimates fill hours, GP/hour per slot and profit per limit', () => {
    const m = fillMetrics({ flow, buyAt: 900_000, sellAt: 1_000_000, profitEach: 80_000, units: 70, limit: 70, maxFillHours: 8 })
    // 100/h each side, at the typical price ~25% queue share -> 25/h: 70 units = 2.8h each way.
    expect(m.expectedFillHours).toEqual({ buy: 2.8, sell: 2.8 })
    expect(m).toMatchObject({ realisticProfitPerLimit: 5_600_000, gpPerHourPerSlot: 1_000_000, fillable: true, demotedReason: null, qtyWithinMaxHours: 100 })
  })

  it('demotes a sell that takes longer than max_fill_hours and says how much would fill', () => {
    const m = fillMetrics({ flow, buyAt: 900_000, sellAt: 1_000_000, profitEach: 80_000, units: 500, limit: 500, maxFillHours: 8 })
    expect(m.fillable).toBe(false)
    expect(m.demotedReason).toMatch(/^Sell at 1,000,000 needs ~20h for 500 .* only ~100 fill within 8h/)
  })

  it('a full buy limit counts as at least 4h per slot', () => {
    expect(slotGpPerHour(400, 1, 10, 10)).toBe(100)
    expect(slotGpPerHour(400, 1, 5, 10)).toBe(400)
    expect(slotRate(flow, { buyAt: 900_000, sellAt: 1_000_000, profitEach: 1, qty: 10, limit: 10 }).gpPerHour).toBeCloseTo(10 / 4)
  })

  it('sizes cycles by limit and cash', () => {
    expect(cycleUnits(70, 900_000)).toBe(70)
    expect(cycleUnits(70, 900_000, 9_000_000)).toBe(10)
    expect(cycleUnits(null, 100)).toBe(8)
    expect(qtyWithinHours(25, 25, 8)).toBe(100)
    expect(qtyWithinHours(0, 25, 8)).toBe(0)
  })

  it('summarises demoted rows', () => {
    const s = demotedSummary([{ id: 1, name: 'a', demotedReason: null }, { id: 2, name: 'b', demotedReason: 'slow' }])
    expect(s).toEqual({ count: 1, examples: [{ id: 2, name: 'b', reason: 'slow' }] })
  })
})

describe('spike case (margin_scan quote)', () => {
  // Grubby-key style: one hour printed a spiked high; the quoted "sell at" is that spike.
  const series = flatSeries({ low: 9_000, high: 10_000, volume: 60, spikeHours: [23], spikeHigh: 30_000, spikeVolume: 5 })
  const market = { item: item(23_490, 100, 'Grubby key'), series }

  it('demotes the spike margin and shows the fillable trade at typical prices', () => {
    const f = quoteFill(market, { buyAt: 9_000, sellAt: 30_000 }, tax, 8)
    expect(f.demotedReason).toMatch(/^Sell at 30,000 needs ~\d+(\.\d)?h for 100/)
    expect(f.quoted?.expectedFillHours.sell).toBeGreaterThan(100)
    expect(f.typical).toMatchObject({ buyAt: 9_000, sellAt: 10_000, marginAfterTax: 800, fillable: true })
  })

  it('a dip exit is capped at the fillable high', () => {
    const f = dipFill(market, { buyAt: 8_000, sellAt: 30_000 }, tax, 48)
    expect(f.quoted?.sellAt).toBe(10_000)
  })

  it('reports no flow when there is no volume at all', () => {
    expect(quoteFill({ item: item(1) }, { buyAt: 1, sellAt: 2 }, tax, 8).demotedReason).toMatch(/Not enough/)
  })
})

describe('top_flips rows', () => {
  const live = (id: number, name: string) => ({ id, name, buyAt: 900_000, sellAt: 2_000_000, marginAfterTax: 1_060_000, limit: 70, dailyVolume: 5000, priceAgeMin: 1 })
  const ctx = (pumps: number[] = []) => ({
    mappingById: new Map(MAPPING.map(m => [m.id, m])),
    bulk: {
      latest: new Map([[4151, { high: 2_000_000, low: 900_000, highTime: NOW, lowTime: NOW }]]),
      h1: new Map([[4151, avg(2_000_000, 900_000, 1, 300)]]),
      h24: new Map([[4151, avg(1_000_000, 900_000, 7200, 7200)]])
    },
    tax,
    pumps: new Set(pumps),
    maxFillHours: 8
  })

  it('prices on fillable data, not the live spike', () => {
    const [row] = bulkRows([live(4151, 'Abyssal whip')], ctx())
    expect(row?.metrics).toMatchObject({ buyAt: 900_000, sellAt: 1_000_000, marginAfterTax: 80_000 })
  })

  it('demotes pumps and unknown items below fillable rows', () => {
    const rows = rankRows(bulkRows([live(4587, 'Dragon scimitar'), live(4151, 'Abyssal whip')], ctx()), 'gp_per_hour')
    expect(rows.map(r => r.live.id)).toEqual([4151, 4587])
    expect(rows[1]?.demotedReason).toMatch(/Not enough recent trades/)
    expect(bulkRows([live(4151, 'Abyssal whip')], ctx([4151]))[0]?.demotedReason).toMatch(/pump/)
  })
})

describe('planFlips', () => {
  const candidate = (id: number, buyAt: number, sellAt: number, limit: number, volume = 100): Candidate => {
    const c = bulkCandidate(item(id, limit), {
      latest: new Map(),
      h1: new Map([[id, avg(sellAt, buyAt, volume, volume)]]),
      h24: new Map([[id, avg(sellAt, buyAt, volume * 24, volume * 24)]])
    }, tax)
    return refineCandidate(c as Candidate, flatSeries({ low: buyAt, high: sellAt, volume }), tax)
  }
  const pool = [candidate(1, 1_000_000, 1_100_000, 10), candidate(2, 10_000, 10_500, 1000), candidate(3, 100, 110, 20_000, 10_000)]

  it('fills slots with the most profit that fills in time, within cash', () => {
    const plan = planFlips(pool, { cash: 50_000_000, slots: 8, maxFillHours: 8 })
    expect(plan.map(p => p.candidate.entry.id).sort()).toEqual([1, 2, 3])
    expect(plan.reduce((s, p) => s + p.cost, 0)).toBeLessThanOrEqual(50_000_000)
    expect(plan.every(p => p.metrics.fillable && p.qty <= (p.candidate.entry.limit ?? 0))).toBe(true)
  })

  it('respects cash and slot count', () => {
    const plan = planFlips(pool, { cash: 2_000_000, slots: 1, maxFillHours: 8 })
    expect(plan).toHaveLength(1)
    expect(plan[0]!.cost).toBeLessThanOrEqual(2_000_000)
    const json = planJson(plan, { cash: 2_000_000, slots: 1, maxFillHours: 8 })
    expect(json.totals).toMatchObject({ slotsUsed: 1, cashLeft: 2_000_000 - plan[0]!.cost })
    expect(json.slotsPlan[0]).toMatchObject({ slot: 1, qty: plan[0]!.qty, expectedProfit: plan[0]!.qty * plan[0]!.candidate.profitEach })
  })

  it('caps quantity at what fills within max_fill_hours', () => {
    // 5/h each side at ~25% share -> ~1.25/h: in 8h only ~5 of the 1000 limit fill.
    const slow = candidate(9, 10_000, 12_000, 1000, 5)
    const [p] = planFlips([slow], { cash: 1e9, slots: 8, maxFillHours: 8 })
    expect(p!.qty).toBeLessThan(10)
    expect(p!.metrics.fillable).toBe(true)
  })

  it('in a falling market the series median cannot set the ask above the last hour or live high', () => {
    // 24h at 10k highs, but the last hour (and the live price) fell to 9.5k:
    // a 6h median ask of 10k would sit above the market and never fill (backtest finding).
    const c = bulkCandidate(item(8, 100), {
      latest: new Map([[8, { high: 9_600, low: 9_000, highTime: NOW, lowTime: NOW }]]),
      h1: new Map([[8, avg(9_500, 9_000, 100, 100)]]),
      h24: new Map([[8, avg(10_000, 9_000, 2400, 2400)]])
    }, tax) as Candidate
    const refined = refineCandidate(c, flatSeries({ low: 9_000, high: 10_000, volume: 100 }), tax)
    expect(refined.sellAt).toBe(9_500)
    expect(refined.profitEach).toBe(9_500 - 9_000 - tax(9_500, 8))
    // The uncapped variant (kept for backtest comparisons) quotes the stale median.
    expect(refineCandidate(c, flatSeries({ low: 9_000, high: 10_000, volume: 100 }), tax, { capSellAtRecent: false }).sellAt).toBe(10_000)
  })

  it('a spiked high never makes a candidate look better than its typical range', () => {
    const spiky = refineCandidate(candidate(7, 9_000, 10_000, 100), flatSeries({ low: 9_000, high: 10_000, spikeHours: [22, 23], spikeHigh: 30_000, spikeVolume: 6 }), tax)
    expect(spiky.sellAt).toBe(10_000)
  })
})
