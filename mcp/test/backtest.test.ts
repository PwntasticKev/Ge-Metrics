import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { geTax } from '@ge/engine'
import { createDiskSnapshotStore } from '../src/backtest/diskCache.js'
import { buyCapacity, sellCapacity } from '../src/backtest/fills.js'
import { FIVE_MIN_SEC, HOUR_SEC, createHistory } from '../src/backtest/history.js'
import { maxDrawdown, summarize } from '../src/backtest/metrics.js'
import { type Market, type Rules, openPosition, stepPosition } from '../src/backtest/position.js'
import { markdownReport } from '../src/backtest/report.js'
import { BacktestBudgetError, loadHistory, runBacktest, timeline } from '../src/backtest/run.js'
import { simulate } from '../src/backtest/simulate.js'
import { allStrategies } from '../src/backtest/strategies/index.js'
import type { Pick, Strategy } from '../src/backtest/strategies/types.js'
import { LookaheadError, guardHistory, mergeSnapshots, viewAt } from '../src/backtest/view.js'
import type { AveragePrice } from '../src/wiki/types.js'
import { ITEMS, T0, avg, buildHistory, steady } from './fixtures/backtest.js'

const RULES: Rules = { participation: 0.25, buyTimeoutHours: 8, maxHoldHours: 24 }

const pick = (over: Partial<Pick> = {}): Pick => ({
  id: 1, name: 'Steady item', buyAt: 1000, sellAt: 1100, qty: 100, limit: 100,
  predicted: { profit: 7800, buyHours: 2, sellHours: 2 }, ...over
})

const marketOf = (hours: Record<number, AveragePrice | undefined>, lastLow: number | null = 1000): Market =>
  ({ hour: ts => hours[(ts - T0) / HOUR_SEC], lastLow: () => lastLow })

describe('no lookahead', () => {
  it('the guard refuses any window that had not closed by t', () => {
    const h = guardHistory(buildHistory(steady), T0)
    expect(() => h.hour(T0 - HOUR_SEC)).not.toThrow()
    expect(() => h.hour(T0)).toThrow(LookaheadError)
    expect(() => h.fiveMin(T0 - FIVE_MIN_SEC)).not.toThrow()
    expect(() => h.fiveMin(T0)).toThrow(LookaheadError)
    // Lazy reads after the view is built are still guarded.
    const view = viewAt(buildHistory(steady), T0, ITEMS)
    expect(view.series(1, 24)).toHaveLength(24)
    expect(view.series(1, 24).every(p => p.timestamp + HOUR_SEC <= T0)).toBe(true)
  })

  it('every strategy decides the same at t whatever happens after t', () => {
    for (const offset of [0, 4, 9]) {
      const at = T0 + offset * HOUR_SEC
      // Same past (with a dip over the last 8 hours); from t on the market either crashes or moons.
      const past = (ts: number, i: number) => (i >= offset - 8 && i < offset ? new Map([[1, avg(1100, 900, 200, 400)], [2, avg(1_080_000, 1_000_000, 30, 30)]]) : steady(ts, i))
      const crash = buildHistory((ts, i) => (i >= offset ? new Map([[1, avg(500, 400)], [2, avg(10, 5)]]) : past(ts, i)))
      const moon = buildHistory((ts, i) => (i >= offset ? new Map([[1, avg(5000, 4000)], [2, avg(9e6, 8e6)]]) : past(ts, i)))
      const input = (h: typeof crash) => ({ view: viewAt(h, at, ITEMS), cash: 50_000_000, slots: 8, exclude: new Set<number>() })
      expect(allStrategies().find(s => s.key.startsWith('find_dips'))?.decide(input(crash))).not.toHaveLength(0)
      for (const s of allStrategies()) expect(s.decide(input(crash)), s.key).toEqual(s.decide(input(moon)))
    }
    // ...and the fixture is rich enough that strategies actually pick something.
    const picks = allStrategies().flatMap(s => s.decide({ view: viewAt(buildHistory(steady), T0, ITEMS), cash: 50_000_000, slots: 8, exclude: new Set() }))
    expect(picks.length).toBeGreaterThan(0)
  })

  it('a strategy that peeks at the future throws instead of profiting', () => {
    const h = buildHistory(steady)
    const peeking: Strategy = { key: 'cheat', label: 'cheat', lookbackHours: 24, decide: ({ view }) => { guardHistory(h, view.t).hour(view.t); return [] } }
    expect(() => simulate(peeking, h, t => viewAt(h, t, ITEMS), { cash: 1e6, slots: 1, decisions: [T0], endT: T0 + HOUR_SEC })).toThrow(LookaheadError)
  })
})

describe('market view', () => {
  it('h24 is the volume-weighted merge of the 24 closed hours', () => {
    const merged = mergeSnapshots([new Map([[1, avg(100, 90, 1, 3)]]), new Map([[1, avg(200, null, 3, 0)]])])
    expect(merged.get(1)).toEqual({ avgHighPrice: 175, highPriceVolume: 4, avgLowPrice: 90, lowPriceVolume: 3 })
  })

  it('latest comes from the newest closed 5m window, else the last hour', () => {
    const hours = new Map([[T0 - HOUR_SEC, new Map([[1, avg(1100, 1000)], [2, avg(9, 8)]])]])
    const fives = new Map([[T0 - 2 * FIVE_MIN_SEC, new Map([[1, avg(1120, null, 2, 0)]])]])
    const view = viewAt(createHistory(hours, fives), T0, ITEMS)
    expect(view.latest.get(1)).toEqual({ high: 1120, highTime: T0 - 2 * FIVE_MIN_SEC + 150, low: 1000, lowTime: T0 - HOUR_SEC / 2 })
    expect(view.latest.get(2)?.high).toBe(9)
    expect(view.volumes.get(1)).toBe(400)
  })
})

describe('fill model', () => {
  it('buys only in hours that traded at or under the bid, more when outbidding', () => {
    expect(buyCapacity(avg(1100, 1001), 1000, 0.25)).toBe(0)
    expect(buyCapacity(avg(1100, 1000, 0, 200), 1000, 0.25)).toBe(50)
    expect(buyCapacity(avg(1100, 1000, 0, 200), 1050, 0.25)).toBe(125)
    expect(sellCapacity(avg(1099, 1000), 1100, 0.25)).toBe(0)
    expect(sellCapacity(avg(1100, 1000, 200, 0), 1100, 0.25)).toBe(50)
  })

  it('fills partially over hours, then sells at the ask after tax', () => {
    const m = marketOf({ 0: avg(1100, 1000, 0, 200), 1: avg(1100, 1000, 0, 200), 2: avg(1100, 1000, 400, 0) })
    let p = openPosition(pick(), T0)
    const r0 = stepPosition(p, T0, m, RULES, 100)
    expect(r0.position).toMatchObject({ bought: 50, phase: 'buying' })
    p = r0.position!
    const r1 = stepPosition(p, T0 + HOUR_SEC, m, RULES, 50)
    expect(r1.position).toMatchObject({ bought: 100, phase: 'selling', fullyBought: true })
    const r2 = stepPosition(r1.position!, T0 + 2 * HOUR_SEC, m, RULES, 0)
    expect(r2.trade).toMatchObject({ outcome: 'sold', sold: 100, profit: 100 * (1100 - geTax(1100, 1) - 1000), buyHours: 1.5, holdHours: 2.5 })
    expect(r2.cash).toBe(100 * (1100 - geTax(1100, 1)))
  })

  it('respects the remaining buy limit', () => {
    const m = marketOf({ 0: avg(1100, 1000, 0, 10_000) })
    expect(stepPosition(openPosition(pick(), T0), T0, m, RULES, 30).position?.bought).toBe(30)
  })

  it('cancels an unfilled buy at the timeout and refunds the reserve', () => {
    const m = marketOf({})
    let p = openPosition(pick(), T0)
    for (let i = 0; i < RULES.buyTimeoutHours - 1; i++) p = stepPosition(p, T0 + i * HOUR_SEC, m, RULES, 100).position!
    const r = stepPosition(p, T0 + 7 * HOUR_SEC, m, RULES, 100)
    expect(r).toMatchObject({ position: null, cash: 100 * 1000, trade: { outcome: 'unfilled', bought: 0, profit: 0 } })
  })

  it('dumps at the instant-sell price at max hold', () => {
    const hours: Record<number, AveragePrice> = { 0: avg(1100, 1000, 0, 10_000) }
    for (let i = 1; i < 24; i++) hours[i] = avg(1050, 950)
    const m = marketOf(hours)
    let p = openPosition(pick(), T0)
    let trade = null
    for (let i = 0; i < 24 && !trade; i++) {
      const r = stepPosition(p, T0 + i * HOUR_SEC, m, RULES, 100)
      trade = r.trade
      if (r.position) p = r.position
    }
    expect(trade).toMatchObject({ outcome: 'dumped', dumped: 100, holdHours: 24, profit: 100 * (950 - geTax(950, 1) - 1000) })
  })
})

describe('simulator', () => {
  const always = (p: Pick): Strategy => ({ key: 'fixed', label: 'fixed', lookbackHours: 24, decide: ({ exclude }) => (exclude.has(p.id) ? [] : [p]) })

  it('caps by cash and slots, enforces the 4h buy limit and ends flat', () => {
    const h = buildHistory(steady)
    const r = simulate(always(pick({ qty: 100 })), h, t => viewAt(h, t, ITEMS), { cash: 60_000, slots: 1, decisions: [T0, T0 + 4 * HOUR_SEC, T0 + 8 * HOUR_SEC], endT: T0 + 40 * HOUR_SEC })
    expect(r.trades[0]).toMatchObject({ ordered: 60, bought: 60, outcome: 'sold' })
    expect(r.trades.every(t => t.ordered <= 100)).toBe(true)
    // Within any 4h, at most one buy limit is bought.
    const total = r.trades.reduce((s, t) => s + t.profit, 0)
    expect(r.equity.at(-1)?.value).toBeCloseTo(60_000 + total, 0)
    expect(r.equity.every(e => e.value > 0)).toBe(true)
  })

  it('second buy waits for the limit window', () => {
    const h = buildHistory(() => new Map([[1, avg(1100, 1000, 10_000, 10_000)]]))
    const r = simulate(always(pick()), h, t => viewAt(h, t, ITEMS), { cash: 1e6, slots: 1, decisions: [T0, T0 + 2 * HOUR_SEC], endT: T0 + 30 * HOUR_SEC })
    // First cycle buys 100 at T0; at T0+2h only 0 of the limit is left, so nothing is placed.
    expect(r.trades).toHaveLength(1)
  })

  it('summarizes predicted vs realized', () => {
    const h = buildHistory(steady)
    const r = simulate(always(pick()), h, t => viewAt(h, t, ITEMS), { cash: 1e6, slots: 1, decisions: [T0], endT: T0 + 30 * HOUR_SEC })
    const s = summarize(r)
    expect(s).toMatchObject({ picks: 1, buyFillRate: 1, sellAtAskRate: 1, lossPct: 0, onTimePct: 1 })
    expect(s.marginOverestimate).toBeCloseTo(0, 5)
    expect(maxDrawdown([{ t: 0, value: 100 }, { t: 1, value: 80 }, { t: 2, value: 120 }, { t: 3, value: 90 }])).toEqual({ gp: 30, pct: 0.25 })
  })
})

describe('runs and cache', () => {
  let dir = ''
  afterEach(async () => { if (dir) await rm(dir, { recursive: true, force: true }) })

  it('timeline: aligned decisions with room for max hold, lookback windows loaded', () => {
    const now = T0 + 100 * HOUR_SEC + 123
    const t = timeline({ days: 1, cash: 1e6, slots: 8 }, allStrategies(), now)
    expect(t.decisions).toHaveLength(7)
    expect(t.decisions.every(d => d % (4 * HOUR_SEC) === 0)).toBe(true)
    expect((t.decisions.at(-1) as number) + 24 * HOUR_SEC).toBeLessThanOrEqual(t.endT)
    expect(t.hourWindows[0]).toBe((t.decisions[0] as number) - 168 * HOUR_SEC)
    expect(t.endT).toBeLessThanOrEqual(now - HOUR_SEC)
  })

  it('caches snapshots on disk and never fetches an open window', async () => {
    dir = await mkdtemp(join(tmpdir(), 'bt-'))
    const urls: string[] = []
    const fetchImpl = async (url: string) => {
      urls.push(url)
      if (url.endsWith('/mapping')) return new Response(JSON.stringify([{ id: 1, name: 'Steady item', limit: 100 }]))
      return new Response(JSON.stringify({ data: { 1: avg(1100, 1000) }, timestamp: 0 }))
    }
    const store = createDiskSnapshotStore({ dir, limiter: job => job(), fetchImpl, nowSec: () => T0 })
    expect((await store.load('1h', T0 - HOUR_SEC)).get(1)?.avgLowPrice).toBe(1000)
    expect(await store.isCached('1h', T0 - HOUR_SEC)).toBe(true)
    await store.load('1h', T0 - HOUR_SEC)
    expect(urls).toEqual([`https://prices.runescape.wiki/api/v1/osrs/1h?timestamp=${T0 - HOUR_SEC}`])
    await expect(store.load('1h', T0)).rejects.toThrow(/not closed/)
    await expect(store.load('5m', T0 - 100)).rejects.toThrow(/aligned/)
    expect((await store.mapping())[0]?.name).toBe('Steady item')
    await store.mapping()
    expect(urls.filter(u => u.endsWith('/mapping'))).toHaveLength(1)
  })

  it('refuses a load that needs more new requests than allowed', async () => {
    dir = await mkdtemp(join(tmpdir(), 'bt-'))
    const store = createDiskSnapshotStore({ dir, limiter: job => job(), fetchImpl: async () => new Response('{}'), nowSec: () => T0 + 1e6 })
    const t = timeline({ days: 1, cash: 1e6, slots: 8 }, allStrategies(), T0 + 100 * HOUR_SEC)
    await expect(loadHistory(store, t, { maxNewRequests: 5 })).rejects.toBeInstanceOf(BacktestBudgetError)
  })

  it('runs every strategy on fixture history and reports', () => {
    const h = buildHistory(steady, 200, 200)
    const t = timeline({ days: 2, cash: 50_000_000, slots: 8 }, allStrategies(), T0 + 100 * HOUR_SEC)
    const run = runBacktest(h, ITEMS, allStrategies(), t, { days: 2, cash: 50_000_000, slots: 8 })
    expect(run.summaries).toHaveLength(allStrategies().length)
    const plan = run.summaries.find(s => s.key.startsWith('plan_flips-8h'))
    expect(plan?.realizedProfit).toBeGreaterThan(0)
    const md = markdownReport({ config: { days: 2, cash: 50_000_000, slots: 8 }, timeline: t, summaries: run.summaries, generatedAt: T0 })
    expect(md).toContain('| Strategy | Picks | Expected | Realized |')
    expect(md).toContain('No lookahead')
  })
})

describe('diagnostics', () => {
  it('buckets filled trades by decision-time features without reading the future', async () => {
    const { bucketize, FEATURES, diagnosticsSection } = await import('../src/backtest/diagnostics.js')
    const h = buildHistory(steady)
    const r = simulate({ key: 'fixed', label: 'fixed', lookbackHours: 24, decide: () => [pick()] }, h, t => viewAt(h, t, ITEMS), { cash: 1e6, slots: 1, decisions: [T0], endT: T0 + 30 * HOUR_SEC })
    const [liquidity, ask] = FEATURES.map(f => bucketize(r.trades, h, f))
    expect(liquidity).toEqual([{ label: '2k-10k', picks: 1, dumpedPct: 0, expected: 7800, realized: 7800 }])
    expect(ask?.[0]?.label).toBe('at or under')
    expect(diagnosticsSection([r], h, () => true, 'fixture')).toContain('| 2k-10k | 1 | 0% | 0.0M | 0.0M |')
  })
})
