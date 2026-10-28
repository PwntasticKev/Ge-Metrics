// Walk-forward orchestration: load the history once, run every grid variant
// continuously over it, then fold, choose and score per family. Sensitivity
// re-runs only the shipped defaults and the consensus variants.

import type { Mood } from '../../analysis/scanner/breadth.js'
import type { MappingEntry } from '../../wiki/types.js'
import { HOUR_SEC, type History, windowStarts } from '../history.js'
import type { Rules } from '../position.js'
import { type BacktestConfig, type Timeline, timeline } from '../run.js'
import { DEFAULT_RULES, type SimResult, simulateAll } from '../simulate.js'
import type { Strategy } from '../strategies/types.js'
import { viewAt } from '../view.js'
import { type FamilyReport, type OosStats, evaluateFamily } from './evaluate.js'
import { type Fold, makeFolds, tradesPlacedIn, windowProfit } from './folds.js'
import type { Family } from './grid.js'
import { GATE_LOOKBACK_HOURS, REGIME_LOOKBACK_HOURS, moodsAt } from './regime.js'

export interface WalkForwardConfig extends BacktestConfig {
  readonly trainDays: number
  readonly testDays: number
  readonly stepDays: number
}

export const WF_DEFAULTS = Object.freeze({ days: 60, trainDays: 7, testDays: 2, stepDays: 2 })
export const PARTICIPATION_LEVELS = [0.1, 0.25, 0.5] as const
export const DUMP_AFTER_HOURS = [12, 24, 48] as const

/** Timeline whose last decision leaves room for the longest max hold tried, plus the regime lookback. */
export function walkForwardTimeline (config: WalkForwardConfig, strategies: readonly Strategy[], nowSec: number): Timeline {
  const longest = Math.max(...DUMP_AFTER_HOURS, config.rules?.maxHoldHours ?? DEFAULT_RULES.maxHoldHours)
  const t = timeline({ ...config, rules: { ...config.rules, maxHoldHours: longest } }, strategies, nowSec)
  const first = t.decisions[0] ?? t.endT
  const earliest = Math.min(t.hourWindows[0] ?? first, first - Math.max(REGIME_LOOKBACK_HOURS, GATE_LOOKBACK_HOURS) * HOUR_SEC)
  return { ...t, hourWindows: windowStarts(earliest, t.endT - HOUR_SEC, HOUR_SEC) }
}

export function foldsFor (config: WalkForwardConfig, t: Timeline): Fold[] {
  const every = (config.decisionEveryHours ?? 4) * HOUR_SEC
  const first = t.decisions[0] ?? t.endT
  const last = t.decisions[t.decisions.length - 1] ?? t.endT
  return makeFolds({ start: first, end: last + every, trainHours: config.trainDays * 24, testHours: config.testDays * 24, stepHours: config.stepDays * 24 })
}

export interface RunInput {
  readonly history: History
  readonly mapping: readonly MappingEntry[]
  readonly timeline: Timeline
  readonly config: WalkForwardConfig
  readonly log?: (msg: string) => void
}

export function runVariants (strategies: readonly Strategy[], i: RunInput, rules?: Partial<Rules>): SimResult[] {
  return simulateAll(strategies, i.history, at => viewAt(i.history, at, i.mapping), {
    cash: i.config.cash, slots: i.config.slots, decisions: i.timeline.decisions, endT: i.timeline.endT, rules: { ...i.config.rules, ...rules }
  })
}

export interface SensitivityRow {
  readonly family: string
  readonly which: 'default' | 'consensus'
  readonly key: string
  readonly label: string
  readonly setting: string
  readonly oos: Pick<OosStats, 'profit' | 'lossPct' | 'foldsPositive' | 'folds'>
}

function foldsOos (r: SimResult, folds: readonly Fold[]): SensitivityRow['oos'] {
  const traded = folds.flatMap(f => tradesPlacedIn(r.trades, f.test)).filter(t => t.bought > 0)
  return {
    profit: Math.round(folds.reduce((s, f) => s + windowProfit(r.equity, f.test), 0)),
    lossPct: traded.length ? traded.filter(t => t.profit < 0).length / traded.length : null,
    foldsPositive: folds.filter(f => windowProfit(r.equity, f.test) > 0).length,
    folds: folds.length
  }
}

/** The whole walk-forward (grid re-tuned) under another simulator queue share. */
export interface ShareRerun {
  readonly participation: number
  readonly reports: readonly FamilyReport[]
}

export interface WalkForwardResult {
  readonly folds: readonly Fold[]
  readonly reports: readonly FamilyReport[]
  readonly shareReruns: readonly ShareRerun[]
  readonly moods: ReadonlyMap<number, Mood>
  readonly sensitivity: readonly SensitivityRow[]
  readonly variantsRun: number
}

function sensitivity (reports: readonly FamilyReport[], folds: readonly Fold[], i: RunInput): SensitivityRow[] {
  const picks = reports.flatMap(r => {
    const strat = (k: string) => r.family.variants.find(v => v.strategy.key === k)?.strategy
    const def = strat(r.family.defaultKey)
    const con = r.consensusKey !== r.family.defaultKey ? strat(r.consensusKey) : undefined
    return [
      ...(def ? [{ family: r.family.name, which: 'default' as const, s: def }] : []),
      ...(con ? [{ family: r.family.name, which: 'consensus' as const, s: con }] : [])
    ]
  })
  const settings: { setting: string; rules: Partial<Rules> }[] = [
    ...PARTICIPATION_LEVELS.map(p => ({ setting: `queue share ${Math.round(p * 100)}%`, rules: { participation: p } })),
    ...DUMP_AFTER_HOURS.filter(h => h !== DEFAULT_RULES.maxHoldHours).map(h => ({ setting: `dump after ${h}h`, rules: { maxHoldHours: h } }))
  ]
  return settings.flatMap(({ setting, rules }) => {
    i.log?.(`sensitivity: ${setting}`)
    const results = runVariants(picks.map(p => p.s), i, rules)
    return results.map((r, k) => {
      const p = picks[k] as (typeof picks)[number]
      return { family: p.family, which: p.which, key: r.key, label: r.label, setting, oos: foldsOos(r, folds) }
    })
  })
}

function evaluateAll (families: readonly Family[], folds: readonly Fold[], moods: ReadonlyMap<number, Mood>, i: RunInput, rules?: Partial<Rules>): FamilyReport[] {
  return families.map(f => {
    const started = Date.now()
    const results = runVariants(f.variants.map(v => v.strategy), i, rules)
    i.log?.(`${f.name}${rules?.participation ? ` @ ${rules.participation}` : ''}: ${f.variants.length} variants in ${Math.round((Date.now() - started) / 1000)}s`)
    return evaluateFamily(f, results, folds, i.config.cash, moods)
  })
}

export interface WalkForwardOptions {
  /** Also re-run the whole walk-forward at these simulator queue shares. */
  readonly rerunShares?: readonly number[]
}

export function walkForward (families: readonly Family[], i: RunInput, o: WalkForwardOptions = {}): WalkForwardResult {
  const folds = foldsFor(i.config, i.timeline)
  if (!folds.length) throw new Error('history too short for one train + test fold')
  const moods = moodsAt(i.history, i.timeline.decisions, i.mapping)
  const reports = evaluateAll(families, folds, moods, i)
  const shareReruns = (o.rerunShares ?? []).map(p => ({ participation: p, reports: evaluateAll(families, folds, moods, i, { participation: p }) }))
  return { folds, reports, shareReruns, moods, sensitivity: sensitivity(reports, folds, i), variantsRun: families.reduce((s, f) => s + f.variants.length, 0) }
}
