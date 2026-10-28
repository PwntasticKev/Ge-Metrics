import { describe, expect, it } from 'vitest'
import { type ClosedTrade, type GateRule, type RegimeSignals, type ScheduledUpdate, decideRegime, evaluateRule, lastStreakAt, recentPnl, ruleKey } from '../src/analysis/regime/gates.js'
import { scheduleFrom } from '../src/analysis/regime/schedule.js'
import { VOL_LOOKBACK_HOURS, indexReturns, median, realizedVol, volReading } from '../src/analysis/regime/volatility.js'
import { HOUR_SEC, type Snapshot, createHistory } from '../src/backtest/history.js'
import type { Trade } from '../src/backtest/position.js'
import { GATE_CANDIDATES, OFF, combine } from '../src/backtest/regime/configs.js'
import { gateSizes, gatedStrategy } from '../src/backtest/regime/gated.js'
import { SIGNAL_LOOKBACK_HOURS, closedTrades, marketSignalsAt } from '../src/backtest/regime/signals.js'
import type { Pick, Strategy } from '../src/backtest/strategies/types.js'
import { ITEMS, T0, avg } from './fixtures/backtest.js'

const DAY = 24 * HOUR_SEC

const base: RegimeSignals = { t: T0, mood: 'mixed', index24h: 0, index7d: 0, vol24h: 0.01, volMedian: 0.01, volRatio: 1, updates: [] }

const update = (at: number, title: string, items = 3, keyword = true): ScheduledUpdate => ({ at, date: new Date(at * 1000).toISOString().slice(0, 10), title, items, keyword })

describe('gate rules', () => {
  it('breadth: risk-off and index drops fire only past their threshold', () => {
    expect(evaluateRule({ kind: 'risk-off', size: 0 }, base)).toBeNull()
    expect(evaluateRule({ kind: 'risk-off', size: 0.5 }, { ...base, mood: 'risk-off', index24h: -0.02 })?.size).toBe(0.5)
    const drop: GateRule = { kind: 'index-drop', window: '7d', below: 0.05, size: 0 }
    expect(evaluateRule(drop, { ...base, index7d: -0.049 })).toBeNull()
    expect(evaluateRule(drop, { ...base, index7d: -0.05 })?.reason).toMatch(/-5\.0% over 7d/)
    expect(evaluateRule(drop, { ...base, index7d: null })).toBeNull()
  })

  it('volatility: fires above the ratio, ignores a missing reading', () => {
    const rule: GateRule = { kind: 'volatility', above: 1.5, size: 0 }
    expect(evaluateRule(rule, { ...base, volRatio: 1.5 })).toBeNull()
    expect(evaluateRule(rule, { ...base, volRatio: 1.51 })).not.toBeNull()
    expect(evaluateRule(rule, { ...base, volRatio: null })).toBeNull()
  })

  it('update: window before and after a major release; minor posts only count by item count', () => {
    const big = update(T0 + 2 * DAY, 'Sailing is OUT TODAY!')
    const minor = update(T0 - DAY, 'Sailing: Week One Feedback & Fixes', 25, false)
    const s = { ...base, updates: [big, minor] }
    expect(evaluateRule({ kind: 'update', beforeDays: 1, afterDays: 3, minItems: null, size: 0 }, s)).toBeNull()
    expect(evaluateRule({ kind: 'update', beforeDays: 3, afterDays: 3, minItems: null, size: 0 }, s)?.reason).toMatch(/OUT TODAY.*in 2\.0d/)
    expect(evaluateRule({ kind: 'update', beforeDays: 0, afterDays: 3, minItems: 20, size: 0 }, s)?.reason).toMatch(/Week One.*1\.0d ago/)
    expect(evaluateRule({ kind: 'update', beforeDays: 0, afterDays: 1, minItems: 20, size: 0 }, s)).toBeNull()
  })

  it('equity: losing streak pauses, then lets trading resume', () => {
    const trades: ClosedTrade[] = [
      { knownAt: T0 - 10 * HOUR_SEC, profit: -5 },
      { knownAt: T0 - 9 * HOUR_SEC, profit: -5 },
      { knownAt: T0 - 8 * HOUR_SEC, profit: -5 },
      { knownAt: T0 + HOUR_SEC, profit: 100 }
    ]
    expect(lastStreakAt(trades, T0, 3)).toBe(T0 - 8 * HOUR_SEC)
    expect(lastStreakAt(trades, T0, 4)).toBeNull()
    const rule: GateRule = { kind: 'loss-streak', losses: 3, pauseHours: 12, size: 0 }
    expect(evaluateRule(rule, { ...base, trades })).not.toBeNull()
    expect(evaluateRule(rule, { ...base, t: T0 + 5 * HOUR_SEC, trades })).toBeNull()
    expect(recentPnl(trades, T0, 24)).toEqual({ pnl: -15, count: 3 })
    expect(evaluateRule({ kind: 'recent-pnl', hours: 24, size: 0 }, { ...base, trades })).not.toBeNull()
  })

  it('equity rules ignore trades whose result was not known yet', () => {
    const later: ClosedTrade[] = [1, 2, 3].map(i => ({ knownAt: T0 + i * HOUR_SEC, profit: -1 }))
    expect(evaluateRule({ kind: 'loss-streak', losses: 2, pauseHours: 24, size: 0 }, { ...base, trades: later })).toBeNull()
    expect(evaluateRule({ kind: 'recent-pnl', hours: 24, size: 0 }, { ...base, trades: later })).toBeNull()
  })

  it('decideRegime: smallest size wins, state and reasons follow', () => {
    const s = { ...base, mood: 'risk-off' as const, volRatio: 2 }
    expect(decideRegime([], s)).toMatchObject({ size: 1, state: 'trade', reasons: [] })
    expect(decideRegime([{ kind: 'risk-off', size: 0.5 }], s)).toMatchObject({ size: 0.5, state: 'caution' })
    const both = decideRegime([{ kind: 'risk-off', size: 0.5 }, { kind: 'volatility', above: 1.5, size: 0 }], s)
    expect(both.state).toBe('stand-aside')
    expect(both.reasons).toHaveLength(2)
  })

  it('rule keys are unique across the study candidates', () => {
    const keys = Object.values(GATE_CANDIDATES).flat().map(c => c.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect(combine([OFF, OFF])).toBe(OFF)
    expect(ruleKey({ kind: 'update', beforeDays: 1, afterDays: 3, minItems: 20, size: 0 })).toBe('update -1d/+3d kw|20+items')
  })
})

describe('update schedule', () => {
  const at = (date: string, title: string, category = 'game', items: number[] = []) => ({ date, title, url: null, wikiUrl: null, category, items })
  const schedule = scheduleFrom([
    at('2025-11-19', 'Sailing is OUT TODAY!'),
    at('2026-04-15', 'Leagues VI: Demonic Pacts - Launches Today!'),
    at('2026-05-20', 'The Red Reef is Out Today!'),
    at('2025-12-10', 'Christmas Event 2025'),
    at('2026-04-23', 'Leagues VI Changes'),
    at('2025-11-26', 'Sailing: Week One Feedback & Fixes'),
    at('2026-08-12', 'Summer Sweep Up - Agility & Chambers of Xeric Changes'),
    at('2026-10-01', 'Poll 90', 'devblog')
  ])

  it('keeps game posts only, dated 12:00 UTC on the post date, oldest first', () => {
    expect(schedule).toHaveLength(7)
    expect(schedule[0]?.at).toBe(Date.parse('2025-11-19T12:00:00Z') / 1000)
    expect(schedule.map(u => u.at)).toEqual([...schedule.map(u => u.at)].sort((a, b) => a - b))
  })

  it('flags launches and seasonal events as major, weekly fix posts not', () => {
    const major = new Map(schedule.map(u => [u.title, u.keyword]))
    expect(major.get('Sailing is OUT TODAY!')).toBe(true)
    expect(major.get('Leagues VI: Demonic Pacts - Launches Today!')).toBe(true)
    expect(major.get('The Red Reef is Out Today!')).toBe(true)
    expect(major.get('Christmas Event 2025')).toBe(true)
    expect(major.get('Leagues VI Changes')).toBe(false)
    expect(major.get('Sailing: Week One Feedback & Fixes')).toBe(false)
    expect(major.get('Summer Sweep Up - Agility & Chambers of Xeric Changes')).toBe(false)
  })
})

describe('index volatility', () => {
  it('weights returns by value and skips hours with too little coverage', () => {
    const snap = (a: number, b: number | null): Snapshot => new Map([[1, avg(a + 10, a - 10)], ...(b === null ? [] : [[2, avg(b + 10, b - 10)] as const])])
    const r = indexReturns([snap(100, 100), snap(110, 100), snap(110, null)], new Map([[1, 1], [2, 3]]))
    expect(r[0]).toBeCloseTo(Math.log(1.1) / 4)
    expect(r[1]).toBeNull() // only 25% of the weight priced
  })

  it('reads a vol spike as a high ratio to the trailing median', () => {
    const calm = Array.from({ length: VOL_LOOKBACK_HOURS - 1 }, (_, i) => (i % 2 ? 0.001 : -0.001))
    expect(volReading(calm).ratio).toBeCloseTo(1)
    const spiky = calm.map((x, i) => (i >= calm.length - 24 ? x * 4 : x))
    expect(volReading(spiky).ratio).toBeGreaterThan(3)
    expect(volReading(calm.slice(0, 30)).ratio).toBeNull()
    expect(realizedVol([null, null, 0.1])).toBeNull()
    expect(median([3, 1, 2, 10])).toBe(2.5)
  })
})

// Two liquid items; calm before T0, wild after (prices only diverge at/after T0).
const market = (wildAfter: number, wild: boolean) => {
  const hours = new Map<number, Snapshot>()
  for (let i = -SIGNAL_LOOKBACK_HOURS - 30; i < 100; i++) {
    const ts = T0 + i * HOUR_SEC
    const swing = wild && ts >= wildAfter ? 1 + 0.2 * Math.sin(i) : 1 + 0.002 * Math.sin(i)
    hours.set(ts, new Map([[1, avg(Math.round(1100 * swing), Math.round(1000 * swing), 400, 400)], [2, avg(Math.round(5500 * swing), Math.round(5000 * swing), 300, 300)]]))
  }
  return createHistory(hours)
}

describe('signals at a decision: no lookahead', () => {
  const updates = [update(T0 + DAY, 'Big thing is Out Today!')]

  it('only reads hours that closed before t', () => {
    const a = marketSignalsAt(market(T0, false), T0, ITEMS, updates)
    const b = marketSignalsAt(market(T0, true), T0, ITEMS, updates)
    expect(b).toEqual(a)
    expect(a.volRatio).not.toBeNull()
    expect(a.mood).toBe('mixed')
  })

  it('sees the volatility once those hours have closed', () => {
    const later = T0 + 30 * HOUR_SEC
    expect(marketSignalsAt(market(T0, true), later, ITEMS, updates).volRatio).toBeGreaterThan(5)
  })

  it('never asks the history for a window that had not closed by t', () => {
    const h = market(T0, true)
    const reads: number[] = []
    const spy = { hour: (ts: number) => { reads.push(ts); return h.hour(ts) }, fiveMin: h.fiveMin }
    marketSignalsAt(spy, T0, ITEMS, updates)
    expect(reads.length).toBeGreaterThan(0)
    expect(Math.max(...reads) + HOUR_SEC).toBeLessThanOrEqual(T0)
    expect(Math.min(...reads)).toBeGreaterThanOrEqual(T0 - SIGNAL_LOOKBACK_HOURS * HOUR_SEC)
  })
})

describe('gated strategy', () => {
  const pick: Pick = { id: 1, name: 'x', buyAt: 10, sellAt: 12, qty: 5, limit: 100, predicted: { profit: 0, buyHours: 1, sellHours: 1 } }
  const seen: number[] = []
  const inner: Strategy = { key: 'k', label: 'k', lookbackHours: 1, decide: ({ cash }) => { seen.push(cash); return [pick] } }
  const view = { t: T0 } as unknown as Parameters<Strategy['decide']>[0]['view']

  it('stands aside at size 0 and shrinks cash below 1', () => {
    const g = gatedStrategy(inner, 'g', new Map([[T0, 0], [T0 + HOUR_SEC, 0.5]]))
    expect(g.decide({ view, cash: 1000, slots: 1, exclude: new Set() })).toEqual([])
    g.decide({ view: { ...view, t: T0 + HOUR_SEC }, cash: 1000, slots: 1, exclude: new Set() })
    g.decide({ view: { ...view, t: T0 + 2 * HOUR_SEC }, cash: 1000, slots: 1, exclude: new Set() })
    expect(seen).toEqual([500, 1000])
    expect(g.key).toBe('k | gate g')
  })

  it('equity-gate sizes at t do not change when later trades change', () => {
    const t = (closedAt: number, profit: number) => ({ closedAt, profit, bought: 1 }) as unknown as Trade
    const signals = new Map([[T0, { ...base, t: T0 }]])
    const cfg = GATE_CANDIDATES.equity[0] ?? OFF
    const early = [t(T0 - 3 * HOUR_SEC, -1), t(T0 - 2.5 * HOUR_SEC, 5)]
    const a = gateSizes(cfg, signals, closedTrades(early))
    const b = gateSizes(cfg, signals, closedTrades([...early, t(T0 + 600, -9), t(T0 + 700, -9)]))
    const c = gateSizes(cfg, signals, closedTrades([...early, t(T0 - 2 * HOUR_SEC, -9), t(T0 - 1.5 * HOUR_SEC, -9)]))
    expect(a.get(T0)).toBe(1)
    expect(b.get(T0)).toBe(1) // closed in the hour T0..T0+1h: not known at T0
    expect(c.get(T0)).toBe(0)
  })

  it('closed trades are known at the end of their hour; unfilled ones are dropped', () => {
    const rows = closedTrades([{ closedAt: T0 + 1800, profit: 3, bought: 2 }, { closedAt: T0, profit: 0, bought: 0 }] as unknown as Trade[])
    expect(rows).toEqual([{ knownAt: T0 + HOUR_SEC, profit: 3 }])
  })
})
