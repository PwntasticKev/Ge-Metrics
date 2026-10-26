// Backtest orchestration: which windows to load for a run, loading them
// (disk cache first, bounded new requests), and running each strategy
// through the simulator on the same decision times.

import type { MappingEntry } from '../wiki/types.js'
import type { SnapshotStore } from './diskCache.js'
import { FIVE_MIN_SEC, HOUR_SEC, type History, type Snapshot, type SnapshotWindow, alignDown, createHistory, windowStarts } from './history.js'
import { type Summary, summarize } from './metrics.js'
import type { Rules } from './position.js'
import { DEFAULT_RULES, type SimResult, simulateAll } from './simulate.js'
import type { Strategy } from './strategies/types.js'
import { DAY_HOURS, LATEST_5M_WINDOWS, LATEST_HOURS, viewAt } from './view.js'

/** The newest /1h snapshot is published about two hours after its start. */
export const PUBLISH_LAG_HOURS = 2
export const DEFAULT_DECISION_EVERY_HOURS = 4

export interface BacktestConfig {
  readonly days: number
  readonly cash: number
  readonly slots: number
  readonly decisionEveryHours?: number
  readonly rules?: Partial<Rules>
}

export interface Timeline {
  readonly decisions: readonly number[]
  /** First hour not simulated. */
  readonly endT: number
  readonly hourWindows: readonly number[]
  readonly fiveMinWindows: readonly number[]
}

export class BacktestBudgetError extends Error {
  constructor (readonly missing: number, readonly budget: number) {
    super(`Backtest needs ${missing} uncached wiki snapshots but this call may fetch at most ${budget}.`)
    this.name = 'BacktestBudgetError'
  }
}

export function timeline (config: BacktestConfig, strategies: readonly Strategy[], nowSec: number): Timeline {
  const every = (config.decisionEveryHours ?? DEFAULT_DECISION_EVERY_HOURS) * HOUR_SEC
  const maxHold = (config.rules?.maxHoldHours ?? DEFAULT_RULES.maxHoldHours) * HOUR_SEC
  const endT = alignDown(nowSec, HOUR_SEC) - (PUBLISH_LAG_HOURS - 1) * HOUR_SEC
  // Decisions stop early enough for the last pick to reach max hold.
  const lastDecision = alignDown(endT - maxHold, every)
  const firstDecision = lastDecision - Math.round(config.days * DAY_HOURS) * HOUR_SEC
  const decisions = windowStarts(firstDecision, lastDecision, every)
  const lookbackHours = Math.max(DAY_HOURS, LATEST_HOURS, ...strategies.map(s => s.lookbackHours))
  const first = decisions[0] ?? firstDecision
  return {
    decisions,
    endT,
    hourWindows: windowStarts(first - lookbackHours * HOUR_SEC, endT - HOUR_SEC, HOUR_SEC),
    fiveMinWindows: decisions.flatMap(t => Array.from({ length: LATEST_5M_WINDOWS }, (_, i) => t - (i + 1) * FIVE_MIN_SEC))
  }
}

export interface LoadOptions {
  /** Most uncached snapshots this load may fetch (throws BacktestBudgetError when exceeded). */
  readonly maxNewRequests?: number
  readonly onProgress?: (done: number, total: number) => void
}

async function countMissing (store: SnapshotStore, t: Timeline): Promise<number> {
  const checks = [
    ...t.hourWindows.map(ts => store.isCached('1h', ts)),
    ...t.fiveMinWindows.map(ts => store.isCached('5m', ts))
  ]
  return (await Promise.all(checks)).filter(cached => !cached).length
}

export async function loadHistory (store: SnapshotStore, t: Timeline, o: LoadOptions = {}): Promise<History> {
  if (o.maxNewRequests !== undefined) {
    const missing = await countMissing(store, t)
    if (missing > o.maxNewRequests) throw new BacktestBudgetError(missing, o.maxNewRequests)
  }
  const total = t.hourWindows.length + t.fiveMinWindows.length
  let done = 0
  const load = async (window: SnapshotWindow, ts: number): Promise<[number, Snapshot]> => {
    const snap = await store.load(window, ts)
    o.onProgress?.(++done, total)
    return [ts, snap]
  }
  const [hours, fives] = await Promise.all([
    Promise.all(t.hourWindows.map(ts => load('1h', ts))),
    Promise.all(t.fiveMinWindows.map(ts => load('5m', ts)))
  ])
  return createHistory(new Map(hours), new Map(fives))
}

export interface BacktestRun {
  readonly results: readonly SimResult[]
  readonly summaries: readonly Summary[]
}

export function runBacktest (history: History, mapping: readonly MappingEntry[], strategies: readonly Strategy[], t: Timeline, config: BacktestConfig): BacktestRun {
  const results = simulateAll(strategies, history, at => viewAt(history, at, mapping), { cash: config.cash, slots: config.slots, decisions: t.decisions, endT: t.endT, rules: config.rules })
  return { results, summaries: results.map(summarize) }
}
