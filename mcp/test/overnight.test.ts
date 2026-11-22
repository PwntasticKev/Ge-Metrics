import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { type BuyPick, type WikiAverage, geTax } from '@ge/engine'
import { HOUR_SEC, type Snapshot } from '../src/backtest/history.js'
import type { NightResult } from '../src/backtest/overnight/night.js'
import { placeOrders, simulateNight } from '../src/backtest/overnight/night.js'
import { BASELINE, type VariantRun, decide, nightPlan, nightStats, nightsAhead, runGrid } from '../src/backtest/overnight/run.js'
import { overnightOfferPicks, overnightStrategy } from '../src/backtest/overnight/strategy.js'
import type { Pick } from '../src/backtest/strategies/types.js'
import { type PickContext, fillAwarePicks } from '../src/backtest/vendor/mobile-offer/pickFill.js'
import { viewAt } from '../src/backtest/view.js'
import { ITEMS, T0, avg, buildHistory, steady } from './fixtures/backtest.js'

const DAY = 24 * HOUR_SEC
const T = T0 + 22 * HOUR_SEC - (T0 % DAY)

const pick = (over: Partial<Pick> = {}): Pick => ({
  id: 1, name: 'Steady item', buyAt: 1000, sellAt: 1100, qty: 100, limit: 100, predicted: { profit: 7_800, buyHours: 2, sellHours: 2 }, ...over
})
const net = (price: number) => price - geTax(price, 1)

describe('vendored mobile offer code', () => {
  const vendor = fileURLToPath(new URL('../src/backtest/vendor/mobile-offer/', import.meta.url))
  const mobile = fileURLToPath(new URL('../../mobile/src/lib/', import.meta.url))
  const files = (dir: string): string[] => readdirSync(dir).flatMap(f => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]))

  it('matches mobile/src/lib apart from the header line (re-copy when it drifts)', () => {
    const vendored = files(vendor)
    expect(vendored.length).toBeGreaterThan(5)
    for (const file of vendored) {
      const rel = relative(vendor, file)
      const body = readFileSync(file, 'utf8').split('\n').slice(1).join('\n')
      expect(body, rel).toBe(readFileSync(join(mobile, rel), 'utf8'))
    }
  })
})

describe('nightPlan', () => {
  const now = T0 + 30 * DAY + 5 * HOUR_SEC + 17

  it('one decision per night at the evening hour, the last one whose night has closed', () => {
    const p = nightPlan({ days: 5, eveningHourUtc: 22, maxNightHours: 12, nowSec: now })
    expect(p.nights).toHaveLength(5)
    for (const t of p.nights) expect((t % DAY) / HOUR_SEC).toBe(22)
    for (let i = 1; i < p.nights.length; i++) expect((p.nights[i] ?? 0) - (p.nights[i - 1] ?? 0)).toBe(DAY)
    const last = p.nights[p.nights.length - 1] ?? 0
    // The last night's final hour is published (1h snapshots lag ~2h).
    expect(last + 12 * HOUR_SEC).toBeLessThanOrEqual(now - HOUR_SEC)
    expect(last + 12 * HOUR_SEC + DAY).toBeGreaterThan(now - 2 * HOUR_SEC)
  })

  it('loads the 24h before the first night through the end of the last, and 5m windows before each', () => {
    const p = nightPlan({ days: 3, eveningHourUtc: 2, maxNightHours: 10, nowSec: now })
    const first = p.nights[0] ?? 0
    const last = p.nights[p.nights.length - 1] ?? 0
    expect(p.hourWindows[0]).toBe(first - DAY)
    expect(p.hourWindows[p.hourWindows.length - 1]).toBe(last + 9 * HOUR_SEC)
    expect(p.fiveMinWindows).toHaveLength(3 * 4)
    expect(p.fiveMinWindows.every(ts => p.nights.some(t => ts < t && ts >= t - 20 * 60))).toBe(true)
  })

  it('rejects a bad evening hour', () => {
    expect(() => nightPlan({ days: 3, eveningHourUtc: 24, maxNightHours: 10, nowSec: now })).toThrow(/0-23/)
  })
})

describe('simulateNight (place once, no re-decisions)', () => {
  const history = buildHistory(steady)

  it('buys, then sells after the buy completes, at the strategy prices', () => {
    // Steady item: 200 a side per hour, a 25% share = 50/h each way.
    const r = simulateNight([pick()], history, { t: T, hours: 10, cash: 1e9 })
    expect(r.bought).toBe(100)
    expect(r.soldAtAsk).toBe(100)
    expect(r.leftover).toBe(0)
    expect(r.profit).toBe(100 * (net(1100) - 1000))
    expect(r.placed).toBe(100_000)
    expect(r.trades).toHaveLength(1)
    expect(r.trades[0]?.closedAt).toBeLessThanOrEqual(T + 4 * HOUR_SEC)
  })

  it('an order above one buy limit fills one limit per rolling 4h, and what is unsold at wake-up is marked at the morning low minus tax', () => {
    const r = simulateNight([pick({ qty: 300 })], history, { t: T, hours: 10, cash: 1e9 })
    // Limit 100: hours 0-1, 4-5 and 8-9 buy 50 each; the buy completes in the last hour, so nothing sells.
    expect(r.bought).toBe(300)
    expect(r.soldAtAsk).toBe(0)
    expect(r.leftover).toBe(300)
    expect(r.profit).toBe(300 * (net(1000) - 1000))
    expect(r.trades[0]?.outcome).toBe('dumped')
    // A shorter night cancels the rest of the buy (cash back) and marks what was bought.
    const short = simulateNight([pick({ qty: 300 })], history, { t: T, hours: 6, cash: 1e9 })
    expect(short.bought).toBe(200)
    expect(short.profit).toBe(200 * (net(1000) - 1000))
  })

  it('a bid the market never reaches is cancelled with nothing lost', () => {
    const r = simulateNight([pick({ buyAt: 900 })], history, { t: T, hours: 10, cash: 1e9 })
    expect(r.bought).toBe(0)
    expect(r.profit).toBe(0)
    expect(r.trades[0]?.outcome).toBe('unfilled')
  })

  it('an ask the market never reaches is marked in the morning', () => {
    const r = simulateNight([pick({ sellAt: 1300 })], history, { t: T, hours: 10, cash: 1e9 })
    expect(r.bought).toBe(100)
    expect(r.soldAtAsk).toBe(0)
    expect(r.profit).toBe(100 * (net(1000) - 1000))
  })

  it('a slot freed in the night stays empty: only the evening orders trade', () => {
    const r = simulateNight([pick({ qty: 20 })], history, { t: T, hours: 10, cash: 1e9 })
    expect(r.ordered).toBe(20)
    expect(r.trades).toHaveLength(1)
  })

  it('orders never spend more than the stack, one slot per item', () => {
    const orders = placeOrders([pick({ qty: 100 }), pick({ qty: 100 }), pick({ id: 2, buyAt: 1_000_000, qty: 5, limit: 10 })], 2_050_000)
    expect(orders.map(o => [o.id, o.qty])).toEqual([[1, 100], [2, 1]])
    expect(orders.reduce((s, o) => s + o.qty * o.buyAt, 0)).toBeLessThanOrEqual(2_050_000)
  })
})

describe('overnight strategy (the app\'s Overnight list)', () => {
  const buyPick = (id: number, buyAt: number, sellAt: number, maxQty: number): BuyPick => {
    const tax = Math.floor(sellAt * 0.02)
    const profit = sellAt - tax - buyAt
    return { id, name: `Item ${id}`, icon: null, members: true, buyAt, sellAt, tax, profit, roi: profit / buyAt, maxQty, potential: profit * maxQty, cost: buyAt * maxQty, dayVolume: 0 }
  }
  const a = (high: number, low: number, highVol: number, lowVol: number): WikiAverage => ({ avgHighPrice: high, avgLowPrice: low, highPriceVolume: highVol, lowPriceVolume: lowVol })
  const picks = [buyPick(1, 100, 110, 5_000), buyPick(3, 50, 60, 100_000), buyPick(4, 10_000, 10_400, 50)]
  const ctx: PickContext = {
    h1: { 1: a(110, 100, 600, 600), 3: a(60, 50, 9_000, 9_000), 4: a(10_400, 10_000, 3, 3) },
    h24: { 1: a(110, 100, 14_000, 14_000), 3: a(60, 50, 200_000, 200_000), 4: a(10_400, 10_000, 4_000, 4_000) },
    itemOf: id => ({ id, high: null, low: null, limit: id === 3 ? 25_000 : 2_000 }),
    tax: (sell: number) => Math.floor(sell * 0.02),
    budget: 50_000_000
  }

  it('the parameterized loop matches the app at its 8h horizon', () => {
    for (const maxSellHours of [0.5, 1, 4]) {
      const app = fillAwarePicks(picks, ctx, { mode: 'overnight', maxSellHours }).picks
      expect(overnightOfferPicks(picks, ctx, { sizingHours: 8, maxSellHours })).toEqual(app)
      expect(app.length).toBeGreaterThan(0)
    }
  })

  it('the sell cap and the sizing horizon are live knobs', () => {
    const qty = (sizingHours: number, maxSellHours: number) => overnightOfferPicks(picks, ctx, { sizingHours, maxSellHours }).find(p => p.id === 3)?.maxQty ?? 0
    expect(qty(8, 0.5)).toBeLessThan(qty(8, 4))
    expect(qty(12, 10)).toBeGreaterThan(qty(8, 10))
  })

  it('decides from what was visible at the evening hour and fits the stack and slots', () => {
    const liquid = (): Snapshot => new Map([[1, avg(1100, 1000, 400, 400)], [2, avg(1_080_000, 1_000_000, 300, 300)]])
    const h = buildHistory(liquid)
    const out = overnightStrategy(BASELINE).decide({ view: viewAt(h, T, ITEMS), cash: 5_000_000, slots: 8, exclude: new Set() })
    expect(out.length).toBeGreaterThan(0)
    expect(out.length).toBeLessThanOrEqual(8)
    expect(out.reduce((s, p) => s + p.qty * p.buyAt, 0)).toBeLessThanOrEqual(5_000_000)
    for (const p of out) expect(p.predicted.profit).toBeGreaterThan(0)
  })

  it('runGrid scores every variant on the same nights, one row per night', () => {
    const liquid = (): Snapshot => new Map([[1, avg(1100, 1000, 400, 400)], [2, avg(1_080_000, 1_000_000, 300, 300)]])
    const h = buildHistory(liquid, 200, 120)
    const nights = [T, T + DAY]
    const runs = runGrid({ history: h, mapping: ITEMS, nights, slots: 8, variants: [{ params: BASELINE, budget: 5_000_000, nightHours: 10 }, { params: { sizingHours: 12, maxSellHours: 2 }, budget: 5_000_000, nightHours: 10 }] })
    expect(runs).toHaveLength(2)
    for (const r of runs) expect(r.nights.map(n => n.t)).toEqual(nights)
  })
})

describe('decision rule', () => {
  const night = (profit: number): NightResult => ({ t: 0, cash: 0, placed: 0, expected: 0, profit, ordered: 1, bought: 1, soldAtAsk: 1, leftover: 0, trades: [] })
  const run = (sellCap: number, budget: number, profits: number[]): VariantRun => ({ variant: { params: { sizingHours: 8, maxSellHours: sellCap }, budget, nightHours: 10 }, nights: profits.map(night) })
  const budgets = [10, 50]
  const many = (base: number, n = 40) => Array.from({ length: n }, (_, i) => base + (i % 3))

  it('keeps today\'s model when history is too short', () => {
    const d = decide([run(0.5, 10, [1, 2]), run(0.5, 50, [1, 2]), run(1, 10, [5, 5]), run(1, 50, [5, 5])], 10, budgets)
    expect(d.change).toBe(false)
    expect(d.reason).toMatch(/too short/)
  })

  it('switches only to a variant ahead on total and worst night at every budget', () => {
    const better = decide([run(0.5, 10, many(10)), run(0.5, 50, many(10)), run(1, 10, many(20)), run(1, 50, many(20))], 10, budgets)
    expect(better).toMatchObject({ change: true, to: { sizingHours: 8, maxSellHours: 1 } })
    const riskier = [...many(20).slice(0, 39), -100]
    const mixed = decide([run(0.5, 10, many(10)), run(0.5, 50, many(10)), run(1, 10, many(20)), run(1, 50, riskier)], 10, budgets)
    expect(mixed.change).toBe(false)
  })

  it('night stats', () => {
    const s = nightStats([night(3), night(-1), night(10), night(0)])
    expect(s).toMatchObject({ nights: 4, total: 12, perNight: 3, median: 1.5, worst: -1, best: 10, positive: 2 })
    expect(nightsAhead([night(3), night(1)], [night(2), night(2)])).toBe(1)
  })
})
