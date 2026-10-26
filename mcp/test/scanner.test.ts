import { describe, expect, it, vi } from 'vitest'
import { marketBreadth, moodOf, weightedChange } from '../src/analysis/scanner/breadth.js'
import { hourStartAgo, liquidMoves, type Move, moveFor } from '../src/analysis/scanner/marketMoves.js'
import { breadthReport, flagSpikes, keepMarginRow, marginRow, reversionRows, trendRows } from '../src/analysis/scanner/report.js'
import { screenSpread, screenSpreads, spreadHistory } from '../src/analysis/scanner/spreadScan.js'
import { assessThinSpike, bothSidesChange, hourlyCheck } from '../src/analysis/scanner/thinSpikes.js'
import { dipCandidates, reversionCheck, trendCandidates, trendFit } from '../src/analysis/scanner/trendScan.js'
import { createLimiter } from '../src/wiki/limiter.js'
import type { AveragePrice, LatestPrice } from '../src/wiki/types.js'
import { MAPPING } from './fixtures/market.js'
import { avgOf, series } from './fixtures/series.js'

const avg = (mid: number, vol = 200) => avgOf(mid + 1, mid - 1, vol, vol)
const move = (id: number, change24h: number | null, valueTraded: number, change7d: number | null = null): Move =>
  ({ id, now: 100, change24h, change7d, dayTrades: 500, valueTraded })

describe('thin spikes', () => {
  const day = avgOf(10_000, 9_800, 600, 600) // 50 trades/hour typical

  it('flags a both-sides hourly move on thin volume', () => {
    expect(assessThinSpike({ h24: day, h1: avgOf(11_000, 10_700, 10, 10) })).toMatchObject({ kind: 'pump', trigger: 'hour' })
    expect(assessThinSpike({ h24: day, h1: avgOf(9_000, 8_900, 5, 5) })?.kind).toBe('dump')
  })

  it('ignores busy moves, one-sided moves, cheap and thin items', () => {
    expect(assessThinSpike({ h24: day, h1: avgOf(11_000, 10_700, 60, 60) })).toBeNull()
    expect(bothSidesChange(day, avgOf(11_000, 9_000))).toBe(0)
    expect(assessThinSpike({ h24: avgOf(500, 480, 600, 600), h1: avgOf(600, 580, 5, 5) })).toBeNull()
    expect(assessThinSpike({ h24: avgOf(10_000, 9_800, 10, 10), h1: avgOf(12_000, 11_800, 1, 1) })).toBeNull()
  })

  it('flags a lone 5-minute print far from the hour and the day', () => {
    const hour = avgOf(10_000, 9_800, 25, 25)
    expect(assessThinSpike({ h24: day, h1: hour, m5: avgOf(12_000, null, 1, 0) })).toMatchObject({ kind: 'pump', trigger: 'print' })
    expect(assessThinSpike({ h24: day, h1: hour, m5: avgOf(12_000, null, 10, 0) })).toBeNull()
  })

  it('confirms the last hour with a z-score vs the week', () => {
    const calm = series({ days: 8, base: 1000, noisePct: 0.002 })
    const last = calm.at(-1)!
    const spiked = [...calm.slice(0, -1), { ...last, avgHighPrice: last.avgHighPrice! * 1.1, avgLowPrice: last.avgLowPrice! * 1.1, highPriceVolume: 5, lowPriceVolume: 5 }]
    expect(hourlyCheck(spiked)).toMatchObject({ confirmed: true })
    expect(hourlyCheck(calm)?.confirmed).toBe(false)
    expect(hourlyCheck(calm.slice(0, 10))).toBeNull()
  })

  it('screens the whole market', () => {
    const h24 = new Map([[4151, day], [4587, day]])
    const h1 = new Map([[4151, avgOf(11_000, 10_700, 10, 10)], [4587, avgOf(9_000, 8_800, 5, 5)]])
    const flagged = flagSpikes({ mapping: MAPPING, h1, h24, m5: new Map() })
    expect(flagged.map(f => [f.entry.id, f.flag.kind])).toEqual([[4587, 'dump'], [4151, 'pump']])
  })
})

describe('market moves and breadth', () => {
  const s = {
    hour: new Map([[1, avg(110)], [2, avg(50)]]),
    hourDayAgo: new Map([[1, avg(100)]]),
    hourWeekAgo: new Map([[1, avg(88)]]),
    day: new Map([[1, avg(105)], [2, avg(50, 50)]])
  }

  it('compares the last hour with the same hour 1 and 7 days ago', () => {
    const m = moveFor(1, s)!
    expect(m.now).toBe(110)
    expect(m.change24h).toBeCloseTo(0.1)
    expect(m.change7d).toBeCloseTo(0.25)
    expect(m.valueTraded).toBe(400 * 105)
  })

  it('ignores lopsided hours (per-side volume share guard), thin items and missing history', () => {
    const lopsided: AveragePrice = { avgHighPrice: 1600, avgLowPrice: 686, highPriceVolume: 2071, lowPriceVolume: 9 }
    expect(moveFor(1, { ...s, hour: new Map([[1, lopsided]]) })).toBeNull()
    expect(moveFor(1, { ...s, hourDayAgo: new Map([[1, lopsided]]) })?.change24h).toBeNull()
    expect(moveFor(1, { ...s, hourDayAgo: undefined })?.change24h).toBeNull()
    expect(liquidMoves([1, 2, 3], s).map(m => m.id)).toEqual([1])
  })

  it('points at whole hours behind the last full hour', () => {
    const now = Date.UTC(2026, 9, 26, 12, 30) / 1000
    expect(hourStartAgo(now, 0)).toBe(Date.UTC(2026, 9, 26, 11) / 1000)
    expect(hourStartAgo(now, 24)).toBe(Date.UTC(2026, 9, 25, 11) / 1000)
  })

  it('weights the index by value traded and reads the mood', () => {
    expect(weightedChange([move(1, 0.1, 3), move(2, -0.1, 1), move(3, null, 99)], m => m.change24h)).toBeCloseTo(0.05)
    const b = marketBreadth([move(1, 0.05, 50, 0.1), move(2, -0.03, 40, -0.1), move(3, 0.005, 30), move(4, 0.02, 20), move(5, -0.2, 10), move(6, null, 5)], 3)
    expect([b.counted, b.up, b.down, b.flat]).toEqual([5, 2, 2, 1])
    expect(b.gainers.map(m => m.id)).toEqual([1, 4, 3])
    expect(b.losers.map(m => m.id)).toEqual([5, 2])
    expect(moodOf(0.01, 10, 5)).toBe('risk-on')
    expect(moodOf(0.01, 5, 10)).toBe('mixed')
    expect(moodOf(-0.02, 3, 9)).toBe('risk-off')
    const report = breadthReport(b, id => `item ${id}`)
    expect(report).toMatchObject({ mood: b.mood, upPct: 40, gainers: [{ id: 1, name: 'item 1', change24hPct: 5 }, {}, {}] })
  })
})

describe('margin scan', () => {
  const NOW = 1_800_000_000
  const tax = (p: number) => Math.floor(p * 0.02)
  const item = { ...MAPPING[1]!, limit: 70 } // Dragon scimitar
  const latest = (high: number, low: number, age = 60): Map<number, LatestPrice> =>
    new Map([[item.id, { high, low, highTime: NOW - age, lowTime: NOW - age }]])
  // Day norm: 60,600 - 60,000 - 1,212 tax < 0 -> floor 120.
  const h24 = new Map([[item.id, avgOf(61_500, 60_000, 400, 400)]])
  const h1 = new Map([[item.id, avgOf(62_500, 59_000, 10, 10)]])
  const ctx = (l: Map<number, LatestPrice>, hour = h1) => ({ latest: l, h1: hour, h24, nowSec: NOW, tax, isPump: () => false })

  it('uses the careful margin: worse of live and last-hour on each side', () => {
    const row = screenSpread(item, ctx(latest(63_000, 58_500)))!
    expect(row).toMatchObject({ carefulSell: 62_500, carefulBuy: 59_000, live: 62_500 - 59_000 - 1250 })
    expect(row.multiple).toBeGreaterThanOrEqual(2)
    expect(row.profitPerLimit).toBe(row.live * 70)
  })

  it('rejects stale prints, one-sided hours, normal margins and pumps', () => {
    expect(screenSpread(item, ctx(latest(63_000, 58_500, 30 * 60)))).toBeNull()
    expect(screenSpread(item, ctx(latest(63_000, 58_500), new Map([[item.id, avgOf(62_500, 59_000, 10, 1)]])))).toBeNull()
    expect(screenSpread(item, ctx(latest(61_500, 60_000)))).toBeNull()
    expect(screenSpreads([item], { ...ctx(latest(63_000, 58_500)), isPump: () => true })).toEqual([])
  })

  it('scores the live margin against the week of hourly margins', () => {
    const week = series({ days: 7, base: 60_000, noisePct: 0.001 }) // ~1,200 gp spread, ~0 after tax
    const h = spreadHistory(week, 2_250, item.id, tax)!
    expect(h.hours).toBe(168)
    expect(h.unusual).toBe(true)
    const row = screenSpread(item, ctx(latest(63_000, 58_500)))!
    const json = marginRow(row, week, tax)
    expect(json.week).toMatchObject({ unusual: true })
    expect(keepMarginRow(json)).toBe(true)
    expect(marginRow(row, undefined, tax).week).toBeUndefined()
    expect(spreadHistory(week.slice(0, 5), 2_250, item.id, tax)).toBeNull()
  })
})

describe('trend and reversion scans', () => {
  const sixHourly = (opts: Parameters<typeof series>[0]) => series({ ...opts, stepSec: 21_600 })

  it('fits a steady 7-day trend and rejects noise', () => {
    const t = trendFit(sixHourly({ days: 10, base: 1000, drift: 0.02 }))!
    expect(t.daily).toBeCloseTo(0.02, 3)
    expect(t.r2).toBeGreaterThan(0.95)
    expect(t.steady).toBe(true)
    expect(trendFit(sixHourly({ days: 10, base: 1000, noisePct: 0.02 }))?.steady).toBe(false)
    expect(trendFit(sixHourly({ days: 2, base: 1000 }))).toBeNull()
  })

  it('finds a drop below a range-bound 30-day mean', () => {
    const month = sixHourly({ days: 32, base: 1000, noisePct: 0.01 })
    const r = reversionCheck(month, 880, month.slice(-4).reduce((s, p) => s + p.highPriceVolume + p.lowPriceVolume, 0))!
    expect(r.gap).toBeCloseTo(-0.12, 2)
    expect(r.candidate).toBe(true)
    expect(reversionCheck(month, 990, 400)?.candidate).toBe(false)
    expect(reversionCheck(sixHourly({ days: 32, base: 1000, drift: 0.01 }), 880, 400)?.candidate).toBe(false)
  })

  it('picks liquid candidates by direction and builds rows', () => {
    const moves = [move(1, 0.01, 2e7, 0.1), move(2, -0.02, 2e7, -0.08), move(3, 0, 1e6, 0.5), move(4, -0.1, 3e7, 0.01)]
    expect(trendCandidates(moves, 5).map(m => m.id)).toEqual([1, 2])
    expect(trendCandidates(moves, 5, 'up').map(m => m.id)).toEqual([1])
    expect(trendCandidates(moves, 5, 'down').map(m => m.id)).toEqual([2])
    expect(dipCandidates(moves, 5).map(m => m.id)).toEqual([4, 2])
    const rising = new Map([[1, sixHourly({ days: 10, base: 100, drift: 0.02 })]])
    const [row] = trendRows([moves[0]!], rising, () => 'Up item')
    expect(row).toMatchObject({ id: 1, name: 'Up item' })
    expect(row?.fit.dailyPct).toBeCloseTo(2, 0)
    expect(reversionRows([moves[0]!], new Map(), () => 'x')).toEqual([])
  })
})

describe('createLimiter', () => {
  it('caps concurrency and spaces starts', async () => {
    let clock = 0
    const sleeps: number[] = []
    const limiter = createLimiter({ concurrency: 2, gapMs: 300, now: () => clock, sleep: async ms => { sleeps.push(ms); clock += ms } })
    let active = 0
    let peak = 0
    const job = async () => {
      active++
      peak = Math.max(peak, active)
      await new Promise(r => setTimeout(r, 1))
      active--
      return clock
    }
    const starts = await Promise.all([1, 2, 3, 4].map(() => limiter(job)))
    expect(peak).toBeLessThanOrEqual(2)
    expect(sleeps.length).toBeGreaterThanOrEqual(3)
    expect(starts.at(-1)).toBeGreaterThanOrEqual(900)
    expect(() => createLimiter({ concurrency: 0, gapMs: 0 })).toThrow()
  })

  it('releases its slot when a job fails', async () => {
    const limiter = createLimiter({ concurrency: 1, gapMs: 0 })
    await expect(limiter(async () => { throw new Error('boom') })).rejects.toThrow('boom')
    await expect(limiter(async () => 'ok')).resolves.toBe('ok')
    expect(vi.isMockFunction(limiter)).toBe(false)
  })
})
