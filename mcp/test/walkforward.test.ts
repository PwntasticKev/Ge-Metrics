import { describe, expect, it } from 'vitest'
import type { BuyPick, WikiAverage } from '@ge/engine'
import { HOUR_SEC, type History, type Snapshot } from '../src/backtest/history.js'
import { simulateAll } from '../src/backtest/simulate.js'
import { APP_DEFAULTS, appFillStrategy, fillAwarePicksWith } from '../src/backtest/strategies/appFill.js'
import type { Pick, Strategy } from '../src/backtest/strategies/types.js'
import { fillAwarePicks } from '../src/backtest/vendor/mobile-fill/pickFill.js'
import { viewAt } from '../src/backtest/view.js'
import { chooseForFold, equityAt, makeFolds, scoreWindow, stitch, tradesPlacedIn, windowProfit } from '../src/backtest/walkforward/folds.js'
import { families } from '../src/backtest/walkforward/grid.js'
import { SMOKE_GRID } from '../src/backtest/walkforward/main.js'
import { verdict } from '../src/backtest/walkforward/report.js'
import { foldsFor, walkForward, walkForwardTimeline } from '../src/backtest/walkforward/run.js'
import { ITEMS, T0, avg, buildHistory, steady } from './fixtures/backtest.js'

const DAY = 24 * HOUR_SEC

describe('fold geometry', () => {
  const spec = { start: T0, end: T0 + 20 * DAY, trainHours: 7 * 24, testHours: 2 * 24, stepHours: 2 * 24 }
  const folds = makeFolds(spec)

  it('trains on the days right before each test window, never on or after it', () => {
    expect(folds).toHaveLength(6)
    for (const f of folds) {
      expect(f.train.end).toBe(f.test.start)
      expect(f.train.end - f.train.start).toBe(7 * DAY)
      expect(f.test.end - f.test.start).toBe(2 * DAY)
      expect(f.train.start).toBeGreaterThanOrEqual(spec.start)
      expect(f.test.end).toBeLessThanOrEqual(spec.end)
    }
  })

  it('test windows roll forward without overlapping', () => {
    for (let i = 1; i < folds.length; i++) {
      const [prev, cur] = [folds[i - 1], folds[i]]
      expect(cur?.test.start).toBe((prev?.test.start ?? 0) + 2 * DAY)
      expect(cur?.test.start).toBeGreaterThanOrEqual(prev?.test.end ?? Infinity)
    }
  })

  it('rejects empty windows and returns none when history is too short', () => {
    expect(() => makeFolds({ ...spec, testHours: 0 })).toThrow(/positive/)
    expect(makeFolds({ ...spec, end: T0 + 8 * DAY })).toHaveLength(0)
  })
})

describe('window scoring', () => {
  const equity = [{ t: 0, value: 100 }, { t: 10, value: 110 }, { t: 20, value: 90 }, { t: 30, value: 130 }]

  it('equity at t is the last point at or before t', () => {
    expect(equityAt(equity, 0)).toBe(100)
    expect(equityAt(equity, 15)).toBe(110)
    expect(equityAt(equity, 30)).toBe(130)
    expect(windowProfit(equity, { start: 10, end: 30 })).toBe(20)
  })

  it('stitches test windows into one OOS curve', () => {
    const r = { equity } as unknown as Parameters<typeof stitch>[0][number]['result']
    const curve = stitch([{ result: r, window: { start: 0, end: 10 } }, { result: r, window: { start: 20, end: 30 } }], 1000)
    expect(curve.map(p => p.value)).toEqual([1000, 1010, 1050])
  })
})

// A market whose prices swing with the hour, so different bids earn differently.
const swinging = (i: number): Snapshot => {
  const low = 1000 + ((i * 37) % 60)
  return new Map([[1, avg(low + 120, low, 400, 400)]])
}

const fixed = (key: string, buyAt: number, sellAt: number): Strategy => ({
  key,
  label: key,
  lookbackHours: 24,
  decide: ({ exclude }): Pick[] => (exclude.has(1) ? [] : [{ id: 1, name: 'Steady item', buyAt, sellAt, qty: 100, limit: 100, predicted: { profit: 0, buyHours: 1, sellHours: 1 } }])
})

const toys = [fixed('tight', 1040, 1100), fixed('wide', 1010, 1160), fixed('greedy', 1000, 1200)]

function run (h: History, decisions: number[], endT: number) {
  return simulateAll(toys, h, t => viewAt(h, t, ITEMS), { cash: 1e6, slots: 1, decisions, endT })
}

describe('no leakage between train and test', () => {
  const decisions = Array.from({ length: 30 }, (_, i) => T0 + i * 4 * HOUR_SEC)
  const endT = T0 + 6 * DAY
  const folds = makeFolds({ start: T0, end: T0 + 5 * DAY, trainHours: 48, testHours: 24, stepHours: 24 })

  it('the choice for a fold ignores everything from its test start on', () => {
    const base = buildHistory((_, i) => swinging(i), 200, 200)
    const results = run(base, decisions, endT)
    for (const f of folds) {
      const split = (f.test.start - T0) / HOUR_SEC
      // Same past; from the split the market crashes to a tenth.
      const rewritten = buildHistory((_, i) => (i >= split ? new Map([[1, avg(110, 100, 400, 400)]]) : swinging(i)), 200, 200)
      const again = run(rewritten, decisions, endT)
      expect(scoreWindow(again, f.train)).toEqual(scoreWindow(results, f.train))
      expect(chooseForFold(again, f)).toEqual(chooseForFold(results, f))
      // ...while the test window itself does see the crash.
      expect(scoreWindow(again, f.test)).not.toEqual(scoreWindow(results, f.test))
    }
  })

  it('variants differ, so the choice is real', () => {
    const results = run(buildHistory((_, i) => swinging(i), 200, 200), decisions, endT)
    const profits = scoreWindow(results, folds[0]!.train).map(s => s.profit)
    expect(new Set(profits).size).toBeGreaterThan(1)
    expect(tradesPlacedIn(results[0]!.trades, folds[0]!.test).every(t => t.placedAt >= folds[0]!.test.start)).toBe(true)
  })

  it('the whole walk-forward picks the same variants when the future is rewritten', () => {
    const config = { days: 4, cash: 50_000_000, slots: 8, decisionEveryHours: 4, trainDays: 1, testDays: 1, stepDays: 1 }
    const fams = families(SMOKE_GRID).slice(0, 2)
    const strategies = fams.flatMap(f => f.variants.map(v => v.strategy))
    const now = T0 + 100 * HOUR_SEC
    const t = walkForwardTimeline(config, strategies, now)
    const folds = foldsFor(config, t)
    expect(folds.length).toBeGreaterThan(0)
    const past = (i: number) => (i % 7 === 0 ? new Map([[1, avg(1100, 950, 300, 900)], [2, avg(1_080_000, 1_000_000, 30, 30)]]) : steady(0, i))
    const base = buildHistory((_, i) => past(i), 400, 120)
    const split = ((folds[0]?.test.start ?? 0) - T0) / HOUR_SEC
    const moon = buildHistory((_, i) => (i >= split ? new Map([[1, avg(5000, 4000)], [2, avg(9e6, 8e6)]]) : past(i)), 400, 120)
    const wf = (h: History) => walkForward(fams, { history: h, mapping: ITEMS, timeline: t, config })
    const [a, b] = [wf(base), wf(moon)]
    for (const [i, r] of a.reports.entries()) {
      expect(b.reports[i]?.folds[0]?.chosenKey).toBe(r.folds[0]?.chosenKey)
      expect(b.reports[i]?.folds[0]?.trainProfit).toBe(r.folds[0]?.trainProfit)
    }
    expect(a.reports.map(r => verdict(r).why.length > 0)).toEqual(a.reports.map(() => true))
  })
})

describe('app fill-aware picks (vendored from mobile/src/lib)', () => {
  const pick = (id: number, buyAt: number, sellAt: number, maxQty: number): BuyPick => {
    const tax = Math.floor(sellAt * 0.02)
    const profit = sellAt - tax - buyAt
    return { id, name: `Item ${id}`, icon: null, members: true, buyAt, sellAt, tax, profit, roi: profit / buyAt, maxQty, potential: profit * maxQty, cost: buyAt * maxQty, dayVolume: 0 }
  }
  const a = (high: number, low: number, highVol: number, lowVol: number): WikiAverage => ({ avgHighPrice: high, avgLowPrice: low, highPriceVolume: highVol, lowPriceVolume: lowVol })
  const picks = [pick(1, 100, 110, 5_000), pick(2, 1_000, 1_200, 400), pick(3, 50, 60, 100_000), pick(4, 10_000, 10_400, 50)]
  const h1 = { 1: a(110, 100, 600, 600), 2: a(1_200, 1_000, 20, 30), 3: a(60, 50, 9_000, 9_000), 4: a(10_400, 10_000, 3, 3) }
  const h24 = { 1: a(110, 100, 14_000, 14_000), 2: a(1_200, 1_000, 3_000, 3_000), 3: a(60, 50, 200_000, 200_000), 4: a(10_400, 10_000, 4_000, 4_000) }

  it('the parameterized copy matches the app at its defaults', () => {
    for (const mode of ['quick', 'overnight', 'dips'] as const) {
      const d = APP_DEFAULTS[mode]
      const app = fillAwarePicks(picks, h1, h24, { horizon: d.horizonHours, maxSellHours: d.maxSellHours }).picks
      expect(fillAwarePicksWith(picks, h1, h24, d)).toEqual(app)
      expect(app.length).toBeGreaterThan(0)
    }
  })

  it('the floor and the sell limit are live knobs', () => {
    const d = APP_DEFAULTS.quick
    const ids = (p: readonly BuyPick[]) => p.map(x => x.id).sort()
    expect(ids(fillAwarePicksWith(picks, h1, h24, { ...d, minDayTrades: 2_000 }))).toContain(2)
    expect(ids(fillAwarePicksWith(picks, h1, h24, d))).not.toContain(2)
    const qty = (s: number) => fillAwarePicksWith(picks, h1, h24, { ...d, maxSellHours: s }).find(p => p.id === 1)?.maxQty ?? 0
    expect(qty(0.5)).toBeLessThan(qty(2))
  })

  it('keys every grid point uniquely and includes the shipped defaults', () => {
    for (const f of families()) {
      const keys = f.variants.map(v => v.strategy.key)
      expect(new Set(keys).size).toBe(keys.length)
      expect(keys).toContain(f.defaultKey)
    }
    expect(appFillStrategy(APP_DEFAULTS.overnight).key).toBe('app-overnight-fill-h8-s1-v10000')
  })
})
